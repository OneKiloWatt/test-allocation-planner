import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";

import {
  AppHeader,
  BottomNav,
  Layout,
  createDefaultBottomNavItems,
  routePaths,
} from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { hasValidGuestSession } from "@/lib/guest-session";
import {
  formatDate,
  formatMinutes,
  getSubjectColor,
  groupDailyPlansByDate,
} from "@/lib/logic/daily-plan-view";
import type { DailyPlan, Exam, ExamSubject, StudyPlan } from "@/lib/schemas";
import { useRepository } from "@/stores";

function SubjectDot({ subject }: { subject: ExamSubject }) {
  return (
    <span
      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
      style={{ backgroundColor: getSubjectColor(subject) }}
      aria-hidden="true"
    >
      {subject.subject_name.slice(0, 1)}
    </span>
  );
}

export default function DailyPlanPage() {
  const router = useRouter();
  const repository = useRepository();
  const [isReady, setIsReady] = useState(false);
  const [examId, setExamId] = useState<string | null>(null);
  const [exam, setExam] = useState<Exam | null>(null);
  const [subjects, setSubjects] = useState<ExamSubject[]>([]);
  const [studyPlans, setStudyPlans] = useState<StudyPlan[]>([]);
  const [dailyPlans, setDailyPlans] = useState<DailyPlan[]>([]);

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

      const allSubjects = await repository.listExamSubjects();
      const matchedSubjects = allSubjects
        .filter((subject) => subject.exam_id === rawExamId)
        .sort((left, right) => left.display_order - right.display_order);

      const subjectIds = new Set(matchedSubjects.map((subject) => subject.id));

      const allStudyPlans = await repository.listStudyPlans();
      const matchedStudyPlans = allStudyPlans.filter((studyPlan) =>
        subjectIds.has(studyPlan.exam_subject_id),
      );

      const allDailyPlans = await repository.listDailyPlans();
      const matchedDailyPlans = allDailyPlans
        .filter((dailyPlan) => dailyPlan.exam_id === rawExamId)
        .sort((left, right) => {
          if (left.date !== right.date) {
            return left.date.localeCompare(right.date);
          }

          return left.display_order - right.display_order;
        });

      if (!isMounted) {
        return;
      }

      setExamId(rawExamId);
      setExam(loadedExam);
      setSubjects(matchedSubjects);
      setStudyPlans(matchedStudyPlans);
      setDailyPlans(matchedDailyPlans);
      setIsReady(true);
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [repository, router, router.isReady, router.query.examId]);

  const subjectMap = useMemo(
    () => new Map(subjects.map((subject) => [subject.id, subject])),
    [subjects],
  );

  const groupedDailyPlans = useMemo(() => {
    return groupDailyPlansByDate(dailyPlans);
  }, [dailyPlans]);

  if (!isReady || exam == null || examId == null) {
    return null;
  }

  return (
    <Layout
      variant="app"
      header={<AppHeader title="学習プラン" subtitle={exam.name} />}
      bottomNav={
        <BottomNav
          items={createDefaultBottomNavItems(examId)}
          pathname={router.pathname}
        />
      }
    >
      <div className="space-y-6 pt-section-gap">
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">教科ごとの配分</h2>
          <Card>
            <CardContent className="pt-6">
              {studyPlans.length === 0 ? (
                <p className="text-sm text-muted-foreground">まだ配分データがありません</p>
              ) : (
                <div className="space-y-4">
                  {studyPlans.map((studyPlan) => {
                    const subject = subjectMap.get(studyPlan.exam_subject_id);
                    if (subject == null) {
                      return null;
                    }

                    const widthPercent = Math.max(
                      0,
                      Math.min(100, Math.round(studyPlan.planned_ratio * 10000) / 100),
                    );

                    return (
                      <div key={studyPlan.id} className="flex items-center gap-3">
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <SubjectDot subject={subject} />
                          <span className="truncate text-sm font-medium text-foreground">
                            {subject.subject_name}
                          </span>
                        </div>
                        <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${widthPercent}%`,
                              backgroundColor: getSubjectColor(subject),
                            }}
                          />
                        </div>
                        <span className="min-w-fit text-sm font-medium text-foreground">
                          {formatMinutes(studyPlan.planned_minutes)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">日ごとの学習プラン</h2>
          {dailyPlans.length === 0 ? (
            <Card>
              <CardContent className="space-y-2 pt-6">
                <p className="text-sm font-medium text-foreground">まだ学習プランがありません</p>
                <p className="text-sm leading-6 text-muted-foreground">
                  PLAN MODE で自動配分するか、手動で日ごとのプランを組みましょう
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {groupedDailyPlans.map(([date, plans]) => {
                const totalMinutes = plans.reduce((sum, plan) => sum + plan.planned_minutes, 0);

                return (
                  <Card key={date}>
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between gap-3">
                        <CardTitle className="text-lg">{formatDate(date)}</CardTitle>
                        <span className="text-sm font-medium text-muted-foreground">
                          {formatMinutes(totalMinutes)}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        {plans.map((plan) => {
                          const subject = subjectMap.get(plan.exam_subject_id);
                          if (subject == null) {
                            return null;
                          }

                          return (
                            <div key={plan.id} className="flex items-center justify-between gap-3">
                              <div className="flex min-w-0 items-center gap-3">
                                <SubjectDot subject={subject} />
                                <span className="truncate text-sm font-medium text-foreground">
                                  {subject.subject_name}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-foreground">
                                  {formatMinutes(plan.planned_minutes)}
                                </span>
                                {plan.source === "manual" ? (
                                  <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                                    手動
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {totalMinutes > 120 ? (
                        <p className="text-xs leading-5 text-muted-foreground">
                          少し詰め込みすぎかも。休憩も計画に入れてみよう
                        </p>
                      ) : null}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        <Card className="bg-muted/40">
          <CardContent className="space-y-2 pt-6">
            <p className="text-sm text-muted-foreground">
              複数科目を交互に取り組むと、記憶に残りやすいです
            </p>
            <p className="text-xs text-muted-foreground">（Rohrer &amp; Taylor 2007）</p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
