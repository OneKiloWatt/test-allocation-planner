import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { addDays, format, parseISO } from "date-fns";
import { useRouter } from "next/router";
import { z } from "zod";

import { BackHeader, Layout, routePaths } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { hasValidGuestSession } from "@/lib/guest-session";
import { allocate } from "@/lib/logic/allocation";
import type { AvailabilityRule, Exam, StudyPlan } from "@/lib/schemas";
import { cn, generateUuid } from "@/lib/utils";
import { useRepository } from "@/stores";

const clubDayOptions = [
  { value: "mon", label: "月" },
  { value: "tue", label: "火" },
  { value: "wed", label: "水" },
  { value: "thu", label: "木" },
  { value: "fri", label: "金" },
] as const;

const autoFormSchema = z.object({
  weekday_club_minutes: z.coerce.number().int().min(0),
  weekday_no_club_minutes: z.coerce.number().int().min(0),
  weekend_minutes: z.coerce.number().int().min(0),
  club_days: z.array(z.enum(["mon", "tue", "wed", "thu", "fri"])),
  pre_exam_rest_mode: z.boolean(),
  study_start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

type AutoFormValues = z.infer<typeof autoFormSchema>;
type AutoFormInput = z.input<typeof autoFormSchema>;

function buildDefaultValues(today: string): AutoFormInput {
  return {
    weekday_club_minutes: 60,
    weekday_no_club_minutes: 120,
    weekend_minutes: 120,
    club_days: [],
    pre_exam_rest_mode: true,
    study_start_date: today,
  };
}

export default function PlanModePage() {
  const router = useRouter();
  const repository = useRepository();
  const [isReady, setIsReady] = useState(false);
  const [examId, setExamId] = useState<string | null>(null);
  const [exam, setExam] = useState<Exam | null>(null);
  const [selectedMode, setSelectedMode] = useState<"auto" | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [existingRule, setExistingRule] = useState<AvailabilityRule | null>(null);

  const today = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);

  const form = useForm<AutoFormInput, undefined, AutoFormValues>({
    resolver: zodResolver(autoFormSchema),
    defaultValues: buildDefaultValues(today),
  });
  const { control, register, handleSubmit, reset, watch } = form;

  useEffect(() => {
    if (!router.isReady) {
      return;
    }

    if (!hasValidGuestSession()) {
      void router.replace(routePaths.top());
      return;
    }

    const rawExamId = router.query.examId;
    if (typeof rawExamId !== "string") {
      void router.replace(routePaths.top());
      return;
    }

    let isMounted = true;

    const load = async () => {
      const loadedExam = await repository.getExam(rawExamId);
      if (loadedExam == null) {
        void router.replace(routePaths.home());
        return;
      }

      const rules = await repository.listAvailabilityRules();
      const matchedRule = rules.find((rule) => rule.exam_id === rawExamId) ?? null;

      if (!isMounted) {
        return;
      }

      setExamId(rawExamId);
      setExam(loadedExam);
      setExistingRule(matchedRule);
      setSelectedMode(matchedRule == null ? null : "auto");
      reset(
        matchedRule == null
          ? buildDefaultValues(today)
          : {
              weekday_club_minutes: matchedRule.weekday_club_minutes,
              weekday_no_club_minutes: matchedRule.weekday_no_club_minutes,
              weekend_minutes: matchedRule.weekend_minutes,
              club_days: matchedRule.club_days.filter((day) =>
                clubDayOptions.some((option) => option.value === day),
              ) as AutoFormValues["club_days"],
              pre_exam_rest_mode: matchedRule.pre_exam_rest_mode,
              study_start_date: matchedRule.study_start_date,
            },
      );
      setIsReady(true);
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [repository, reset, router, router.isReady, router.query.examId, today]);

  const maxStudyStartDate =
    exam == null ? today : format(addDays(parseISO(exam.start_date), -1), "yyyy-MM-dd");
  const selectedClubDays = watch("club_days");

  const handleAutoSelect = () => {
    setSelectedMode("auto");
  };

  const handleManualSelect = () => {
    if (examId == null) {
      return;
    }

    void router.push(routePaths.dailyPlan(examId));
  };

  const onSubmit = handleSubmit(async (values) => {
    if (examId == null || exam == null) {
      return;
    }

    if (values.study_start_date < today || values.study_start_date > maxStudyStartDate) {
      console.error("study_start_date is out of range");
      return;
    }

    const now = new Date().toISOString();

    try {
      const rule: AvailabilityRule = {
        id: existingRule?.id ?? generateUuid(),
        exam_id: examId,
        weekday_club_minutes: values.weekday_club_minutes,
        weekday_no_club_minutes: values.weekday_no_club_minutes,
        weekend_minutes: values.weekend_minutes,
        club_days: values.club_days,
        pre_exam_rest_mode: values.pre_exam_rest_mode,
        study_start_date: values.study_start_date,
        created_at: existingRule?.created_at ?? now,
        updated_at: now,
      };

      if (existingRule == null) {
        await repository.createAvailabilityRule(rule);
      } else {
        await repository.updateAvailabilityRule(rule);
      }

      const allSubjects = await repository.listExamSubjects();
      const subjects = allSubjects.filter((subject) => subject.exam_id === examId);
      const dailyPlans = allocate(subjects, rule, exam);
      const totalMinutes = dailyPlans.reduce((sum, dp) => sum + dp.planned_minutes, 0);
      const subjectMinutesMap = new Map<string, number>();

      for (const dp of dailyPlans) {
        subjectMinutesMap.set(
          dp.exam_subject_id,
          (subjectMinutesMap.get(dp.exam_subject_id) ?? 0) + dp.planned_minutes,
        );
      }

      const studyPlans = subjects
        .filter((subject) => (subjectMinutesMap.get(subject.id) ?? 0) >= 10)
        .map((subject) => {
          const plannedMinutes = subjectMinutesMap.get(subject.id)!;
          const ratio =
            totalMinutes > 0 ? Math.round((plannedMinutes / totalMinutes) * 10000) / 10000 : 0;

          return {
            id: generateUuid(),
            exam_subject_id: subject.id,
            planned_minutes: plannedMinutes,
            planned_ratio: ratio,
            reason: null,
            created_at: now,
            updated_at: now,
          } satisfies StudyPlan;
        });

      const allStudyPlans = await repository.listStudyPlans();
      const subjectIds = new Set(subjects.map((subject) => subject.id));
      for (const studyPlan of allStudyPlans.filter((item) => subjectIds.has(item.exam_subject_id))) {
        await repository.deleteStudyPlan(studyPlan.id);
      }

      const allDailyPlans = await repository.listDailyPlans();
      for (const dailyPlan of allDailyPlans.filter((item) => item.exam_id === examId)) {
        await repository.deleteDailyPlan(dailyPlan.id);
      }

      for (const studyPlan of studyPlans) {
        await repository.createStudyPlan(studyPlan);
      }

      for (const dailyPlan of dailyPlans) {
        await repository.createDailyPlan(dailyPlan);
      }

      void router.push(routePaths.dailyPlan(examId));
    } catch (error) {
      console.error(error);
    }
  });

  if (!isReady || exam == null) {
    return null;
  }

  return (
    <Layout variant="form" header={<BackHeader title="日程・予定の設定" />}>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">プランの作り方を選ぶ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                type="button"
                variant={selectedMode === "auto" ? "default" : "outline"}
                className="h-auto min-h-20 flex-col items-start gap-1 px-4 py-4 text-left"
                onClick={handleAutoSelect}
              >
                <span className="text-base font-semibold">自動で組む</span>
                <span className="text-sm opacity-80">生活パターンからまとめて配分します</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-auto min-h-20 flex-col items-start gap-1 px-4 py-4 text-left"
                onClick={handleManualSelect}
              >
                <span className="text-base font-semibold">手動で組む</span>
                <span className="text-sm text-muted-foreground">日ごとの学習プランへ直接進みます</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {selectedMode === "auto" ? (
          <form onSubmit={onSubmit} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">自動で組む設定</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    部活がある平日の勉強時間
                  </label>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      min={0}
                      step={10}
                      {...register("weekday_club_minutes", { valueAsNumber: true })}
                    />
                    <span className="shrink-0 text-sm text-muted-foreground">分</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    部活がない平日の勉強時間
                  </label>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      min={0}
                      step={10}
                      {...register("weekday_no_club_minutes", { valueAsNumber: true })}
                    />
                    <span className="shrink-0 text-sm text-muted-foreground">分</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">土日の勉強時間</label>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      min={0}
                      step={10}
                      {...register("weekend_minutes", { valueAsNumber: true })}
                    />
                    <span className="shrink-0 text-sm text-muted-foreground">分</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-medium text-foreground">部活がある曜日</p>
                  <Controller
                    control={control}
                    name="club_days"
                    render={({ field }) => (
                      <div className="grid grid-cols-5 gap-2">
                        {clubDayOptions.map((option) => {
                          const checked = field.value.includes(option.value);

                          return (
                            <label
                              key={option.value}
                              className={cn(
                                "flex cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 py-3 text-sm font-medium transition-colors",
                                checked
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-border bg-background text-foreground hover:bg-muted/60",
                              )}
                            >
                              <input
                                type="checkbox"
                                className="sr-only"
                                checked={checked}
                                onChange={() => {
                                  const nextValue = checked
                                    ? field.value.filter((value) => value !== option.value)
                                    : [...field.value, option.value];
                                  field.onChange(nextValue);
                                }}
                              />
                              <span>{option.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  />
                </div>

                <p className="text-sm text-muted-foreground">通常は今日から計画します</p>

                <div className="rounded-xl border border-dashed border-border/80 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">詳細設定</p>
                      <p className="text-sm text-muted-foreground">
                        開始日: {watch("study_start_date")} / 部活曜日:{" "}
                        {selectedClubDays.length > 0
                          ? selectedClubDays
                              .map(
                                (day) =>
                                  clubDayOptions.find((option) => option.value === day)?.label ?? day,
                              )
                              .join("・")
                          : "なし"}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDetailOpen((current) => !current)}
                    >
                      こだわって設定する
                    </Button>
                  </div>

                  {isDetailOpen ? (
                    <div className="mt-4 space-y-4 border-t pt-4">
                      <label className="flex items-center gap-3 text-sm text-foreground">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-border"
                          {...register("pre_exam_rest_mode")}
                        />
                        <span>テスト1週間前は部活なし扱い</span>
                      </label>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">勉強開始日</label>
                        <Input
                          type="date"
                          min={today}
                          max={maxStudyStartDate}
                          {...register("study_start_date")}
                        />
                      </div>

                      <p className="text-sm text-muted-foreground">
                        日ごとの例外設定は今は未対応です
                      </p>
                    </div>
                  ) : null}
                </div>

                <Button type="submit" className="w-full">
                  日ごとの学習プランを作る
                </Button>
              </CardContent>
            </Card>
          </form>
        ) : null}
      </div>
    </Layout>
  );
}
