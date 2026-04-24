import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";

import { BackHeader, Layout, routePaths } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageLoadingState } from "@/components/ui/page-loading-state";
import { hasValidGuestSession } from "@/lib/guest-session";
import { formatMinutes, getSubjectColor } from "@/lib/logic/daily-plan-view";
import {
  calculateProgressSummary,
  hasDuplicateProgressLogForDate,
} from "@/lib/logic/progress-log";
import { RecordConflictError } from "@/lib/repositories";
import type { Exam, ExamSubject, ProgressLog, StudyPlan } from "@/lib/schemas";
import { cn, formatDateToString, generateUuid } from "@/lib/utils";
import { useExamStore, useRepository } from "@/stores";

const SAVED_HINTS = [
  { text: "25〜45分ごとに短い休憩を取ると集中力が続きます", cite: "Ariga & Lleras 2011" },
  { text: "読み返しより問題を解く方が記憶に残ります", cite: "Roediger & Karpicke 2006" },
] as const;

function SubjectDot({ subject, size = 28 }: { subject: ExamSubject; size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-[7px] text-sm font-semibold text-white"
      style={{ width: size, height: size, backgroundColor: getSubjectColor(subject) }}
      aria-hidden="true"
    >
      {subject.subject_name.slice(0, 1)}
    </span>
  );
}

type ViewMode = "form" | "saved";

export default function ProgressLogPage() {
  const router = useRouter();
  const repository = useRepository();
  const authUser = useExamStore((state) => state.authUser);
  const isAuthLoading = useExamStore((state) => state.isAuthLoading);
  const [isReady, setIsReady] = useState(false);
  const [examId, setExamId] = useState<string | null>(null);
  const [exam, setExam] = useState<Exam | null>(null);
  const [subjects, setSubjects] = useState<ExamSubject[]>([]);
  const [studyPlans, setStudyPlans] = useState<StudyPlan[]>([]);
  const [examLogs, setExamLogs] = useState<ProgressLog[]>([]);
  const [todayLogs, setTodayLogs] = useState<ProgressLog[]>([]);
  const [view, setView] = useState<ViewMode>("form");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [minutesValue, setMinutesValue] = useState("0");
  const [memo, setMemo] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [savedLog, setSavedLog] = useState<ProgressLog | null>(null);

  const today = useMemo(() => formatDateToString(new Date()), []);
  const dayOfYear = useMemo(() => {
    return Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000,
    );
  }, []);
  const hint = SAVED_HINTS[dayOfYear % SAVED_HINTS.length];

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

      const allStudyPlans = await repository.listStudyPlans();
      const matchedStudyPlans = allStudyPlans.filter((studyPlan) =>
        matchedSubjects.some((subject) => subject.id === studyPlan.exam_subject_id),
      );

      const allLogs = await repository.listProgressLogs();
      const matchedExamLogs = allLogs.filter((log) => log.exam_id === rawExamId);
      const matchedTodayLogs = matchedExamLogs.filter((log) => log.logged_date === today);

      if (!isMounted) {
        return;
      }

      setExamId(rawExamId);
      setExam(loadedExam);
      setSubjects(matchedSubjects);
      setStudyPlans(matchedStudyPlans);
      setExamLogs(matchedExamLogs);
      setTodayLogs(matchedTodayLogs);
      setIsReady(true);
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [authUser, isAuthLoading, repository, router, router.isReady, router.query.examId, today]);

  const subjectMap = useMemo(
    () => new Map(subjects.map((subject) => [subject.id, subject])),
    [subjects],
  );

  const planMap = useMemo(
    () => new Map(studyPlans.map((studyPlan) => [studyPlan.exam_subject_id, studyPlan])),
    [studyPlans],
  );

  const refreshLogs = async (rawExamId: string) => {
    const allLogs = await repository.listProgressLogs();
    const nextExamLogs = allLogs.filter((log) => log.exam_id === rawExamId);
    setExamLogs(nextExamLogs);
    setTodayLogs(nextExamLogs.filter((log) => log.logged_date === today));
    return nextExamLogs;
  };

  const resetForm = () => {
    setSelectedSubjectId(null);
    setMinutesValue("0");
    setMemo("");
    setFormError(null);
    setSavedLog(null);
  };

  const handleDelete = async (logId: string) => {
    if (examId == null) {
      return;
    }

    await repository.deleteProgressLog(logId);
    await refreshLogs(examId);
    setFormError(null);
  };

  const handleSubmit = async () => {
    if (examId == null || selectedSubjectId == null) {
      return;
    }

    const hasDuplicateToday = hasDuplicateProgressLogForDate(
      todayLogs,
      selectedSubjectId,
      today,
    );
    if (hasDuplicateToday) {
      setFormError(
        "今日この科目はすでに記録されています。下の記録を削除してから再登録してください",
      );
      return;
    }

    const now = new Date().toISOString();
    const progressLog: ProgressLog = {
      id: generateUuid(),
      exam_id: examId,
      exam_subject_id: selectedSubjectId,
      logged_minutes: Number(minutesValue),
      memo: memo.trim() || null,
      logged_date: today,
      logged_at: now,
      created_at: now,
    };

    try {
      const createdLog = await repository.createProgressLog(progressLog);
      const nextExamLogs = [...examLogs, createdLog];

      setExamLogs(nextExamLogs);
      setTodayLogs(nextExamLogs.filter((log) => log.logged_date === today));
      setSavedLog(createdLog);
      setFormError(null);
      setView("saved");
    } catch (error) {
      if (error instanceof RecordConflictError) {
        setFormError(
          "今日この科目はすでに記録されています。下の記録を削除してから再登録してください",
        );
        return;
      }

      console.error(error);
    }
  };

  if (!isReady || exam == null || examId == null) {
    return (
      <Layout variant="form" header={<BackHeader title="進捗を記録する" />}>
        <PageLoadingState message="進捗記録の画面を読み込んでいます。" />
      </Layout>
    );
  }

  const selectedSubject = savedLog == null ? null : subjectMap.get(savedLog.exam_subject_id) ?? null;
  const selectedPlan = savedLog == null ? null : planMap.get(savedLog.exam_subject_id) ?? null;
  const targetMinutes = selectedPlan?.planned_minutes ?? null;
  const { actualMinutes, remainingMinutes, progressPercent } =
    savedLog == null
      ? {
          actualMinutes: 0,
          remainingMinutes: targetMinutes == null ? null : targetMinutes,
          progressPercent: null,
        }
      : calculateProgressSummary(examLogs, savedLog.exam_subject_id, targetMinutes);

  return (
    <Layout variant="form" header={<BackHeader title="進捗を記録する" />}>
      <div className="space-y-6">
        {view === "form" ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">今日やった分を記録する</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-3">
                  <fieldset className="space-y-3">
                    <legend className="text-sm font-medium text-foreground">科目</legend>
                    <div className="grid grid-cols-2 gap-3">
                    {subjects.map((subject) => {
                      const isSelected = subject.id === selectedSubjectId;
                      const isLoggedToday = todayLogs.some(
                        (log) => log.exam_subject_id === subject.id,
                      );
                      const inputId = `subject-${subject.id}`;

                      return (
                        <label
                          key={subject.id}
                          htmlFor={inputId}
                          className={cn(
                            "flex min-h-20 cursor-pointer flex-col items-start gap-2 rounded-xl border px-4 py-3 text-left transition-colors",
                            "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/40 has-[:focus-visible]:ring-offset-2",
                            isSelected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-background text-foreground",
                          )}
                        >
                          <input
                            id={inputId}
                            type="radio"
                            name="progress-subject"
                            value={subject.id}
                            checked={isSelected}
                            className="sr-only"
                            onChange={() => {
                              setSelectedSubjectId(subject.id);
                              setFormError(null);
                            }}
                          />
                          <div className="flex w-full items-center gap-2">
                            <SubjectDot subject={subject} size={24} />
                            <span className="min-w-0 truncate text-sm font-semibold">
                              {subject.subject_name}
                            </span>
                          </div>
                          {isLoggedToday ? (
                            <span
                              className={cn(
                                "rounded-full px-2 py-1 text-xs font-medium",
                                isSelected
                                  ? "bg-primary-foreground/15 text-primary-foreground"
                                  : "bg-muted text-muted-foreground",
                              )}
                            >
                              記録済み
                            </span>
                          ) : (
                            <span className="text-xs opacity-80">選択して記録</span>
                          )}
                        </label>
                      );
                    })}
                    </div>
                  </fieldset>
                </div>

                <div className="space-y-2">
                  <label htmlFor="logged_minutes" className="text-sm font-medium text-foreground">
                    時間
                  </label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="logged_minutes"
                      type="number"
                      min={0}
                      step={10}
                      value={minutesValue}
                      onChange={(event) => {
                        setMinutesValue(event.target.value);
                        setFormError(null);
                      }}
                    />
                    <span className="shrink-0 text-sm font-medium text-muted-foreground">分</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="memo" className="text-sm font-medium text-foreground">
                    メモ
                  </label>
                  <textarea
                    id="memo"
                    rows={3}
                    maxLength={500}
                    placeholder="任意メモ"
                    className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    value={memo}
                    onChange={(event) => {
                      setMemo(event.target.value);
                      setFormError(null);
                    }}
                  />
                </div>

                {formError != null ? (
                  <p className="text-sm leading-6 text-destructive">{formError}</p>
                ) : null}

                <Button
                  type="button"
                  size="lg"
                  className="w-full"
                  disabled={selectedSubjectId == null}
                  onClick={() => {
                    void handleSubmit();
                  }}
                >
                  記録する
                </Button>
              </CardContent>
            </Card>

            {todayLogs.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">今日の記録</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {todayLogs.map((log) => {
                    const subject = subjectMap.get(log.exam_subject_id);
                    if (subject == null) {
                      return null;
                    }

                    return (
                      <div
                        key={log.id}
                        className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <SubjectDot subject={subject} size={24} />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">
                              {subject.subject_name}
                            </p>
                            <p className="text-xs text-muted-foreground">{log.logged_minutes} 分</p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          className="shrink-0"
                          onClick={() => {
                            void handleDelete(log.id);
                          }}
                        >
                          削除
                        </Button>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ) : null}
          </>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">保存しました</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedSubject != null ? (
                  <>
                    <div className="flex items-center gap-3">
                      <SubjectDot subject={selectedSubject} size={28} />
                      <span className="text-base font-semibold text-foreground">
                        {selectedSubject.subject_name}
                      </span>
                    </div>

                    <div className="space-y-3 rounded-xl border px-4 py-4">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-muted-foreground">目標</span>
                        <span className="font-medium text-foreground">
                          {targetMinutes == null ? "-" : formatMinutes(targetMinutes)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-muted-foreground">実績</span>
                        <span className="font-medium text-foreground">
                          {formatMinutes(actualMinutes)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-muted-foreground">残り</span>
                        <span className="font-medium text-foreground">
                          {remainingMinutes == null ? "-" : formatMinutes(remainingMinutes)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-muted-foreground">進捗</span>
                        <span className="font-medium text-foreground">
                          {progressPercent == null ? "-" : `${progressPercent}%`}
                        </span>
                      </div>
                    </div>
                  </>
                ) : null}
              </CardContent>
            </Card>

            <Card className="bg-muted/40">
              <CardContent className="space-y-2 pt-6">
                <p className="text-sm leading-6 text-foreground">{hint.text}</p>
                <p className="text-xs text-muted-foreground">{hint.cite}</p>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  resetForm();
                  setView("form");
                }}
              >
                もう1科目記録する
              </Button>
              <Button
                type="button"
                className="w-full"
                onClick={() => {
                  void router.push(routePaths.home());
                }}
              >
                ホームに戻る
              </Button>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
