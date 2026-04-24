import { useEffect, useMemo, useState } from "react";
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
import { PageLoadingState } from "@/components/ui/page-loading-state";
import { hasValidGuestSession } from "@/lib/guest-session";
import { formatDate, formatMinutes, getSubjectColor } from "@/lib/logic/daily-plan-view";
import { buildResultReviewRows, buildResultSummary } from "@/lib/logic/result-review";
import type { Exam, ExamResult, ExamSubject, StudyPlan } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { useExamStore, useRepository } from "@/stores";

function SubjectDot({ subject }: { subject: ExamSubject }) {
  return (
    <span
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[7px] text-sm font-semibold text-white"
      style={{ backgroundColor: getSubjectColor(subject) }}
      aria-hidden="true"
    >
      {subject.subject_name.slice(0, 1)}
    </span>
  );
}

function formatDiff(value: number, suffix: string) {
  if (value === 0) {
    return `±0${suffix}`;
  }

  return value > 0 ? `+${value}${suffix}` : `${value}${suffix}`;
}

export default function ReviewPage() {
  const router = useRouter();
  const repository = useRepository();
  const authUser = useExamStore((state) => state.authUser);
  const isAuthLoading = useExamStore((state) => state.isAuthLoading);
  const [isReady, setIsReady] = useState(false);
  const [examId, setExamId] = useState<string | null>(null);
  const [exam, setExam] = useState<Exam | null>(null);
  const [subjects, setSubjects] = useState<ExamSubject[]>([]);
  const [studyPlans, setStudyPlans] = useState<StudyPlan[]>([]);
  const [results, setResults] = useState<ExamResult[]>([]);

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

      const allStudyPlans = await repository.listStudyPlans();
      const matchedStudyPlans = allStudyPlans.filter((studyPlan) =>
        subjectIds.has(studyPlan.exam_subject_id),
      );

      const allResults = await repository.listExamResults();
      const matchedResults = allResults.filter((result) =>
        subjectIds.has(result.exam_subject_id),
      );

      if (!isMounted) {
        return;
      }

      setExamId(rawExamId);
      setExam(loadedExam);
      setSubjects(matchedSubjects);
      setStudyPlans(matchedStudyPlans);
      setResults(matchedResults);
      setIsReady(true);
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [authUser, isAuthLoading, repository, router, router.isReady, router.query.examId]);

  const rows = useMemo(
    () => buildResultReviewRows(subjects, studyPlans, results),
    [results, studyPlans, subjects],
  );

  const summary = useMemo(() => buildResultSummary(rows), [rows]);
  const hasCompleteResults = subjects.length > 0 && rows.length === subjects.length;

  if (!isReady || exam == null || examId == null) {
    return (
      <Layout variant="app" header={<AppHeader title="振り返り" />}>
        <PageLoadingState message="振り返り画面を読み込んでいます。" />
      </Layout>
    );
  }

  return (
    <Layout
      variant="app"
      header={<AppHeader title="振り返り" subtitle={exam.name} />}
      bottomNav={
        <BottomNav
          items={createDefaultBottomNavItems(examId)}
          pathname={router.pathname}
        />
      }
    >
      <div className="space-y-6 pt-section-gap">
        <section className="rounded-xl border border-primary/20 bg-primary/10 px-4 py-3">
          <p className="text-sm font-semibold text-primary">{exam.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatDate(exam.start_date)}〜{formatDate(exam.end_date)}
          </p>
        </section>

        {!hasCompleteResults ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">結果を入力しましょう</CardTitle>
              <CardDescription className="leading-6">
                科目ごとの点数と勉強時間を入れると、次回に引き継げる振り返りを作れます。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                type="button"
                size="lg"
                className="w-full"
                onClick={() => {
                  void router.push(routePaths.resultEntry(examId));
                }}
              >
                結果を入力する
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">{exam.name}</CardTitle>
                <CardDescription>
                  目標点と実点、計画時間と実勉強時間を科目ごとに見ます。
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {rows.map((row) => (
                  <div key={row.result.id} className="space-y-3 rounded-xl border px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <SubjectDot subject={row.subject} />
                        <span className="truncate text-sm font-semibold text-foreground">
                          {row.subject.subject_name}
                        </span>
                      </div>
                      <span
                        className={cn(
                          "rounded-full px-3 py-1 text-xs font-semibold",
                          row.achieved
                            ? "bg-success/10 text-success"
                            : "bg-caution/15 text-foreground",
                        )}
                      >
                        {row.achieved ? "達成" : "未達"}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-3 text-sm">
                      <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2">
                        <span className="text-muted-foreground">目標点 / 実点</span>
                        <span className="font-medium text-foreground">
                          {row.targetScore}点 / {row.actualScore}点
                          <span className="ml-2 text-muted-foreground">
                            {formatDiff(row.scoreDiff, "点")}
                          </span>
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2">
                        <span className="text-muted-foreground">計画時間 / 実勉強時間</span>
                        <span className="font-medium text-foreground">
                          {row.plannedMinutes == null ? "-" : formatMinutes(row.plannedMinutes)} /{" "}
                          {row.actualStudyMinutes == null
                            ? "-"
                            : formatMinutes(row.actualStudyMinutes)}
                          {row.timeDiff == null ? null : (
                            <span className="ml-2 text-muted-foreground">
                              {formatDiff(row.timeDiff, "分")}
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="rounded-xl border border-primary/20 bg-primary/10 px-4 py-4">
                  <p className="text-sm font-semibold text-primary">まとめ</p>
                  <p className="mt-2 text-sm leading-6 text-foreground">{summary}</p>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <Button
                type="button"
                size="lg"
                className="w-full"
                onClick={() => {
                  void router.push(routePaths.testCreate());
                }}
              >
                この結果を次回に引き継ぐ
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  void router.push(routePaths.resultEntry(examId));
                }}
              >
                今回の結果を修正する
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  void router.push(routePaths.testCreate());
                }}
              >
                次のテストを作成する
              </Button>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
