import type { ChangeEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { addDays, format, parseISO } from "date-fns";
import { useRouter } from "next/router";

import {
  AppHeader,
  BottomNav,
  Layout,
  createDefaultBottomNavItems,
  routePaths,
} from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { hasValidGuestSession } from "@/lib/guest-session";
import { getStudyDays } from "@/lib/logic/available-time";
import {
  formatDate,
  formatMinutes,
  getSubjectColor,
  groupDailyPlansByDate,
} from "@/lib/logic/daily-plan-view";
import { supabase } from "@/lib/supabase";
import type { AvailabilityRule, DailyPlan, Exam, ExamSubject, StudyPlan } from "@/lib/schemas";
import { cn, formatDateToString, generateUuid } from "@/lib/utils";
import { useExamStore, useRepository } from "@/stores";

type ManualDraftRow = {
  id: string;
  examSubjectId: string;
  plannedMinutes: string;
};

type SaveWarning = {
  code: string;
  message: string;
};

function SubjectDot({ subject }: { subject: ExamSubject }) {
  return (
    <span
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
      style={{ backgroundColor: getSubjectColor(subject) }}
      aria-hidden="true"
    >
      {subject.subject_name.slice(0, 1)}
    </span>
  );
}

function buildManualDraftRows(plans: DailyPlan[]) {
  return plans
    .filter((plan) => plan.source === "manual")
    .sort((left, right) => left.display_order - right.display_order)
    .map<ManualDraftRow>((plan) => ({
      id: plan.id,
      examSubjectId: plan.exam_subject_id,
      plannedMinutes: String(plan.planned_minutes),
    }));
}

function serializeDraftRows(rows: ManualDraftRow[]) {
  return JSON.stringify(
    rows.map((row) => ({
      examSubjectId: row.examSubjectId,
      plannedMinutes: row.plannedMinutes,
    })),
  );
}

function getFallbackDateList(exam: Exam) {
  const today = formatDateToString(new Date());
  const startDate = today;
  const endDate = format(addDays(parseISO(exam.start_date), -1), "yyyy-MM-dd");

  if (startDate > endDate) {
    return [];
  }

  const dates: string[] = [];
  let cursor = parseISO(startDate);
  const last = parseISO(endDate);

  while (cursor <= last) {
    dates.push(format(cursor, "yyyy-MM-dd"));
    cursor = addDays(cursor, 1);
  }

  return dates;
}

function toPlannedMinutes(value: string) {
  if (value.trim() === "") {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 10) {
    return null;
  }

  return parsed;
}

export default function DailyPlanPage() {
  const router = useRouter();
  const repository = useRepository();
  const authUser = useExamStore((state) => state.authUser);
  const isAuthLoading = useExamStore((state) => state.isAuthLoading);
  const [isReady, setIsReady] = useState(false);
  const [examId, setExamId] = useState<string | null>(null);
  const [exam, setExam] = useState<Exam | null>(null);
  const [subjects, setSubjects] = useState<ExamSubject[]>([]);
  const [studyPlans, setStudyPlans] = useState<StudyPlan[]>([]);
  const [dailyPlans, setDailyPlans] = useState<DailyPlan[]>([]);
  const [availabilityRule, setAvailabilityRule] = useState<AvailabilityRule | null>(null);
  const [draftsByDate, setDraftsByDate] = useState<Record<string, ManualDraftRow[]>>({});
  const [baselineByDate, setBaselineByDate] = useState<Record<string, string>>({});
  const [errorsByDate, setErrorsByDate] = useState<Record<string, string | null>>({});
  const [saveStateByDate, setSaveStateByDate] = useState<Record<string, boolean>>({});
  const [isEditingByDate, setIsEditingByDate] = useState<Record<string, boolean>>({});
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveWarnings, setSaveWarnings] = useState<SaveWarning[]>([]);
  const [isRecalculating, setIsRecalculating] = useState(false);

  useEffect(() => {
    if (!router.isReady || isAuthLoading) {
      return;
    }

    if (authUser == null && !hasValidGuestSession()) {
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

      const allSubjects = await repository.listExamSubjects();
      const matchedSubjects = allSubjects
        .filter((subject) => subject.exam_id === rawExamId)
        .sort((left, right) => left.display_order - right.display_order);
      const subjectIds = new Set(matchedSubjects.map((subject) => subject.id));

      const [allStudyPlans, allDailyPlans, allRules] = await Promise.all([
        repository.listStudyPlans(),
        repository.listDailyPlans(),
        repository.listAvailabilityRules(),
      ]);

      const matchedStudyPlans = allStudyPlans.filter((studyPlan) =>
        subjectIds.has(studyPlan.exam_subject_id),
      );
      const matchedDailyPlans = allDailyPlans.filter((dailyPlan) => dailyPlan.exam_id === rawExamId);
      const matchedRule = allRules.find((rule) => rule.exam_id === rawExamId) ?? null;

      const manualDrafts = groupDailyPlansByDate(matchedDailyPlans)
        .reduce<Record<string, ManualDraftRow[]>>((accumulator, [date, plans]) => {
          accumulator[date] = buildManualDraftRows(plans);
          return accumulator;
        }, {});

      const nextBaselines = Object.entries(manualDrafts).reduce<Record<string, string>>(
        (accumulator, [date, rows]) => {
          accumulator[date] = serializeDraftRows(rows);
          return accumulator;
        },
        {},
      );

      if (!isMounted) {
        return;
      }

      setExamId(rawExamId);
      setExam(loadedExam);
      setSubjects(matchedSubjects);
      setStudyPlans(matchedStudyPlans);
      setDailyPlans(matchedDailyPlans);
      setAvailabilityRule(matchedRule);
      setDraftsByDate(manualDrafts);
      setBaselineByDate(nextBaselines);
      setErrorsByDate({});
      setIsEditingByDate({});
      setIsReady(true);
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [authUser, isAuthLoading, repository, router, router.isReady, router.query.examId]);

  const subjectMap = useMemo(
    () => new Map(subjects.map((subject) => [subject.id, subject])),
    [subjects],
  );

  const groupedDailyPlans = useMemo(
    () => groupDailyPlansByDate(dailyPlans),
    [dailyPlans],
  );

  const dailyPlanMap = useMemo(
    () => new Map(groupedDailyPlans),
    [groupedDailyPlans],
  );

  const displayDates = useMemo(() => {
    if (exam == null) {
      return [];
    }

    const planDates = groupedDailyPlans.map(([date]) => date);
    const scheduleDays = (exam.schedule_days ?? []).map((day) => day.date);

    const candidateDates =
      availabilityRule == null
        ? getFallbackDateList(exam)
        : getStudyDays(
            availabilityRule.study_start_date,
            format(addDays(parseISO(exam.start_date), -1), "yyyy-MM-dd"),
            availabilityRule,
            scheduleDays,
          ).map((day) => day.date);

    return Array.from(new Set([...candidateDates, ...planDates])).sort((left, right) =>
      left.localeCompare(right),
    );
  }, [availabilityRule, exam, groupedDailyPlans]);

  const hasAnyPlans = dailyPlans.length > 0;

  const setDraftRows = (date: string, updater: (current: ManualDraftRow[]) => ManualDraftRow[]) => {
    setDraftsByDate((current) => ({
      ...current,
      [date]: updater(current[date] ?? []),
    }));
    setErrorsByDate((current) => ({ ...current, [date]: null }));
    setSaveMessage(null);
  };

  const handleAddManualRow = (date: string) => {
    const firstSubject = subjects[0];
    if (firstSubject == null) {
      return;
    }

    setDraftRows(date, (current) => [
      ...current,
      { id: generateUuid(), examSubjectId: firstSubject.id, plannedMinutes: "30" },
    ]);
  };

  const handleStartEditing = (date: string) => {
    const plans = dailyPlanMap.get(date) ?? [];
    const rows = buildManualDraftRows(plans);

    setDraftsByDate((current) => ({ ...current, [date]: rows }));
    setErrorsByDate((current) => ({ ...current, [date]: null }));
    setIsEditingByDate((current) => ({ ...current, [date]: true }));
    setSaveMessage(null);
  };

  const handleDraftChange = (
    date: string,
    rowId: string,
    key: keyof Pick<ManualDraftRow, "examSubjectId" | "plannedMinutes">,
    value: string,
  ) => {
    setDraftRows(date, (current) =>
      current.map((row) => (row.id === rowId ? { ...row, [key]: value } : row)),
    );
  };

  const handleRemoveDraftRow = (date: string, rowId: string) => {
    setDraftRows(date, (current) => current.filter((row) => row.id !== rowId));
  };

  const handleResetDraft = (date: string) => {
    const plans = dailyPlanMap.get(date) ?? [];
    const rows = buildManualDraftRows(plans);
    setDraftsByDate((current) => ({ ...current, [date]: rows }));
    setErrorsByDate((current) => ({ ...current, [date]: null }));
    setSaveMessage(null);
  };

  const handleCancelEditing = (date: string) => {
    handleResetDraft(date);
    setIsEditingByDate((current) => ({ ...current, [date]: false }));
  };

  const validateDraftRows = (date: string) => {
    const rows = draftsByDate[date] ?? [];
    const parsedRows = rows.map((row) => ({
      examSubjectId: row.examSubjectId,
      plannedMinutes: toPlannedMinutes(row.plannedMinutes),
    }));

    if (parsedRows.some((row) => row.plannedMinutes == null)) {
      setErrorsByDate((current) => ({
        ...current,
        [date]: "手動の時間は10分以上の整数で入力してください",
      }));
      return null;
    }

    return parsedRows.map((row) => ({
      examSubjectId: row.examSubjectId,
      plannedMinutes: row.plannedMinutes as number,
    }));
  };

  const refreshPage = async () => {
    if (examId == null) {
      return;
    }

    const loadedExam = await repository.getExam(examId);
    if (loadedExam == null) {
      void router.replace(routePaths.home());
      return;
    }

    const [allStudyPlans, allDailyPlans, allRules] = await Promise.all([
      repository.listStudyPlans(),
      repository.listDailyPlans(),
      repository.listAvailabilityRules(),
    ]);
    const matchedDailyPlans = allDailyPlans.filter((plan) => plan.exam_id === examId);
    const subjectIds = new Set(subjects.map((subject) => subject.id));
    const matchedStudyPlans = allStudyPlans.filter((studyPlan) =>
      subjectIds.has(studyPlan.exam_subject_id),
    );
    const matchedRule = allRules.find((rule) => rule.exam_id === examId) ?? null;
    const manualDrafts = groupDailyPlansByDate(matchedDailyPlans)
      .reduce<Record<string, ManualDraftRow[]>>((accumulator, [date, plans]) => {
        accumulator[date] = buildManualDraftRows(plans);
        return accumulator;
      }, {});
    const nextBaselines = Object.entries(manualDrafts).reduce<Record<string, string>>(
      (accumulator, [date, rows]) => {
        accumulator[date] = serializeDraftRows(rows);
        return accumulator;
      },
      {},
    );

    setExam(loadedExam);
    setStudyPlans(matchedStudyPlans);
    setDailyPlans(matchedDailyPlans);
    setAvailabilityRule(matchedRule);
    setDraftsByDate(manualDrafts);
    setBaselineByDate(nextBaselines);
    setIsEditingByDate({});
  };

  const handleSaveManualDay = async (date: string) => {
    if (examId == null || exam == null) {
      return;
    }

    const manualRows = validateDraftRows(date);
    if (manualRows == null) {
      return;
    }

    setSaveStateByDate((current) => ({ ...current, [date]: true }));
    setSaveWarnings([]);
    setSaveMessage(null);

    try {
      if (authUser != null && supabase != null) {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token;

        if (accessToken == null) {
          setErrorsByDate((current) => ({
            ...current,
            [date]: "ログイン状態を確認できませんでした。再読み込みしてください",
          }));
          return;
        }

        const response = await fetch("/api/allocations/save-manual-day", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            examId,
            date,
            expectedVersion: exam.version,
            manualRows,
          }),
        });

        const body = await response.json() as {
          ok?: boolean;
          warnings?: SaveWarning[];
          error?: { message?: string };
        };

        if (!response.ok) {
          setErrorsByDate((current) => ({
            ...current,
            [date]: body.error?.message ?? "保存できませんでした",
          }));
          return;
        }

        setSaveWarnings(body.warnings ?? []);
        setSaveMessage(`${formatDate(date)}を保存しました`);
        setIsEditingByDate((current) => ({ ...current, [date]: false }));
        await refreshPage();
        return;
      }

      const now = new Date().toISOString();
      const existingDailyPlans = await repository.listDailyPlans();
      const dayPlans = existingDailyPlans.filter((plan) => plan.exam_id === examId);
      const keptPlans = dayPlans.filter((plan) => {
        if (plan.date !== date) {
          return true;
        }
        if (plan.source === "manual") {
          return false;
        }
        return !manualRows.some((row) => row.examSubjectId === plan.exam_subject_id);
      });

      const newManualPlans: DailyPlan[] = manualRows.map((row, index) => ({
        id: generateUuid(),
        exam_id: examId,
        exam_subject_id: row.examSubjectId,
        date,
        planned_minutes: row.plannedMinutes,
        source: "manual",
        display_order: index + 1,
        created_at: now,
        updated_at: now,
      }));

      for (const plan of dayPlans.filter((plan) => {
        if (plan.date !== date) {
          return false;
        }
        if (plan.source === "manual") {
          return true;
        }
        return manualRows.some((row) => row.examSubjectId === plan.exam_subject_id);
      })) {
        await repository.deleteDailyPlan(plan.id);
      }

      for (const plan of newManualPlans) {
        await repository.createDailyPlan(plan);
      }

      const nextHasPlans = keptPlans.length + newManualPlans.length > 0;
      const nextStatus =
        exam.status === "planning" && nextHasPlans && exam.end_date >= formatDateToString(new Date())
          ? "active"
          : exam.status;

      await repository.updateExam({
        ...exam,
        status: nextStatus,
        version: exam.version + 1,
        updated_at: now,
      });

      setSaveMessage(`${formatDate(date)}を保存しました`);
      setIsEditingByDate((current) => ({ ...current, [date]: false }));
      await refreshPage();
    } catch (error) {
      console.error(error);
      setErrorsByDate((current) => ({
        ...current,
        [date]: "保存できませんでした。少し時間をおいてもう一度試してください",
      }));
    } finally {
      setSaveStateByDate((current) => ({ ...current, [date]: false }));
    }
  };

  const handleRecalculate = async () => {
    if (authUser == null || supabase == null || examId == null || exam == null) {
      return;
    }

    setIsRecalculating(true);
    setSaveMessage(null);
    setSaveWarnings([]);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (accessToken == null) {
        setSaveMessage("ログイン状態を確認できませんでした。再読み込みしてください");
        return;
      }

      const response = await fetch("/api/allocations/recalculate", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          examId,
          expectedVersion: exam.version,
        }),
      });

      const body = await response.json() as {
        ok?: boolean;
        warnings?: SaveWarning[];
        error?: { message?: string };
      };

      if (!response.ok) {
        setSaveMessage(body.error?.message ?? "再計算できませんでした");
        return;
      }

      setSaveWarnings(body.warnings ?? []);
      setSaveMessage("自動行を再計算しました");
      await refreshPage();
    } catch (error) {
      console.error(error);
      setSaveMessage("再計算できませんでした。少し時間をおいてもう一度試してください");
    } finally {
      setIsRecalculating(false);
    }
  };

  if (!isReady || exam == null || examId == null) {
    return null;
  }

  return (
    <Layout
      variant="app"
      header={<AppHeader title="学習プラン" subtitle={exam.name} />}
      bottomNav={<BottomNav items={createDefaultBottomNavItems(examId)} pathname={router.pathname} />}
    >
      <div className="space-y-6 pt-section-gap">
        <section className="rounded-xl border border-primary/20 bg-primary/10 px-4 py-4">
          <p className="text-sm font-semibold text-primary">おすすめ配分サマリー</p>
          {studyPlans.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">まだ教科ごとのおすすめ配分がありません</p>
          ) : (
            <div className="mt-3 space-y-3">
              {studyPlans.map((studyPlan) => {
                const subject = subjectMap.get(studyPlan.exam_subject_id);
                if (subject == null) {
                  return null;
                }

                return (
                  <div key={studyPlan.id} className="flex items-center gap-3 rounded-xl bg-background/80 px-3 py-3">
                    <SubjectDot subject={subject} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-foreground">
                        {subject.subject_name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatMinutes(studyPlan.planned_minutes)}
                      </div>
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">
                      {Math.round(studyPlan.planned_ratio * 100)}%
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">調整のしかた</CardTitle>
            <CardDescription className="leading-6">
              手動で調整した行は維持されます。自動行は読み取り専用で、再計算すると自動行だけが更新されます。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {authUser != null ? (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={isRecalculating}
                onClick={() => {
                  void handleRecalculate();
                }}
              >
                {isRecalculating ? "再計算中..." : "自動行を再計算する"}
              </Button>
            ) : null}
            {saveMessage ? <p className="text-sm text-foreground">{saveMessage}</p> : null}
            {saveWarnings.map((warning) => (
              <p key={`${warning.code}-${warning.message}`} className="text-sm text-caution">
                {warning.message}
              </p>
            ))}
          </CardContent>
        </Card>

        {!hasAnyPlans ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">まだ学習プランがありません</CardTitle>
              <CardDescription className="leading-6">
                日付を押して、やる科目と目安時間を置いていきましょう。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                type="button"
                className="w-full"
                onClick={() => {
                  const firstDate = displayDates[0];
                  if (firstDate == null) {
                    return;
                  }

                  document.getElementById(`day-card-${firstDate}`)?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  });
                }}
              >
                最初の1日を追加する
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <div className="space-y-4">
          {displayDates.map((date) => {
            const plans = dailyPlanMap.get(date) ?? [];
            const autoPlans = plans.filter((plan) => plan.source === "auto");
            const manualPlans = plans.filter((plan) => plan.source === "manual");
            const draftRows = draftsByDate[date] ?? buildManualDraftRows(manualPlans);
            const isDirty = serializeDraftRows(draftRows) !== (baselineByDate[date] ?? "[]");
            const totalMinutes = plans.reduce((sum, plan) => sum + plan.planned_minutes, 0);
            const error = errorsByDate[date];
            const isSaving = saveStateByDate[date] ?? false;
            const isEditing = isEditingByDate[date] ?? false;

            return (
              <Card key={date} id={`day-card-${date}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-xl">{formatDate(date)}</CardTitle>
                      <CardDescription>
                        合計 {totalMinutes === 0 ? "0分" : formatMinutes(totalMinutes)}
                      </CardDescription>
                    </div>
                    {isEditing ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleAddManualRow(date)}
                      >
                        行を追加
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleStartEditing(date)}
                      >
                        {manualPlans.length > 0 ? "手動行を編集" : "手動行を追加"}
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {autoPlans.length > 0 ? (
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-foreground">自動行</p>
                      {autoPlans.map((plan) => {
                        const subject = subjectMap.get(plan.exam_subject_id);
                        if (subject == null) {
                          return null;
                        }

                        return (
                          <div
                            key={plan.id}
                            className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <SubjectDot subject={subject} />
                              <div className="min-w-0">
                                <div className="truncate text-sm font-semibold text-foreground">
                                  {subject.subject_name}
                                </div>
                                <div className="text-xs text-muted-foreground">読み取り専用</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium text-foreground">
                                {formatMinutes(plan.planned_minutes)}
                              </div>
                              <span className="rounded-full bg-muted px-2 py-1 text-[11px] font-semibold text-muted-foreground">
                                自動
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}

                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-foreground">手動行</p>
                    {draftRows.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border px-4 py-4 text-sm text-muted-foreground">
                        {isEditing
                          ? "この日の手動行はまだありません"
                          : "この日の手動行はまだありません。編集から追加できます"}
                      </div>
                    ) : (
                      draftRows.map((row) => {
                        const subject = subjectMap.get(row.examSubjectId);

                        if (!isEditing) {
                          return (
                            <div
                              key={row.id}
                              className="flex items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3"
                            >
                              <div className="flex min-w-0 items-center gap-3">
                                {subject != null ? <SubjectDot subject={subject} /> : null}
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-semibold text-foreground">
                                    {subject?.subject_name ?? "未設定の科目"}
                                  </div>
                                  <div className="text-xs text-muted-foreground">手動で固定</div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-medium text-foreground">
                                  {formatMinutes(toPlannedMinutes(row.plannedMinutes) ?? 0)}
                                </div>
                                <span className="rounded-full bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary">
                                  手動
                                </span>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={row.id}
                            className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-4"
                          >
                            <div className="mb-3 flex items-center justify-between gap-3">
                              <span className="rounded-full bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary">
                                手動
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                className="h-auto px-2 py-1 text-destructive hover:text-destructive"
                                onClick={() => handleRemoveDraftRow(date, row.id)}
                              >
                                削除
                              </Button>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_120px]">
                              <label className="space-y-2 text-sm font-medium text-foreground">
                                科目
                                <select
                                  className={cn(
                                    "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
                                    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                                  )}
                                  value={row.examSubjectId}
                                  onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                                    handleDraftChange(date, row.id, "examSubjectId", event.target.value);
                                  }}
                                >
                                  {subjects.map((subjectOption) => (
                                    <option key={subjectOption.id} value={subjectOption.id}>
                                      {subjectOption.subject_name}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label className="space-y-2 text-sm font-medium text-foreground">
                                時間
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="number"
                                    min={10}
                                    step={10}
                                    value={row.plannedMinutes}
                                    onChange={(event) => {
                                      handleDraftChange(date, row.id, "plannedMinutes", event.target.value);
                                    }}
                                  />
                                  <span className="text-sm text-muted-foreground">分</span>
                                </div>
                              </label>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {error ? <p className="text-sm text-destructive">{error}</p> : null}

                  {isEditing ? (
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <Button
                        type="button"
                        className="w-full"
                        disabled={isSaving || !isDirty}
                        onClick={() => {
                          void handleSaveManualDay(date);
                        }}
                      >
                        {isSaving ? "保存中..." : "この日を保存する"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        disabled={isSaving}
                        onClick={() => handleCancelEditing(date)}
                      >
                        編集をやめる
                      </Button>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
