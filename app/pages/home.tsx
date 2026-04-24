import type { ReactElement } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { CalendarDays, CheckCircle2, ClipboardList, Flag, PencilLine } from "lucide-react";

import {
  AppHeader,
  BottomNav,
  Layout,
  LayoutStack,
  createDefaultBottomNavItems,
  routePaths,
} from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLoadingState } from "@/components/ui/page-loading-state";
import { hasValidGuestSession } from "@/lib/guest-session";
import { buildHomeViewState } from "@/lib/logic/home-view";
import { formatDate, formatMinutes, getSubjectColor } from "@/lib/logic/daily-plan-view";
import type { DailyPlan, Exam, ExamSubject, ProgressLog, StudyPlan } from "@/lib/schemas";
import { cn, formatDateToString, getDaysUntilExamStart } from "@/lib/utils";
import { useExamStore, useRepository } from "@/stores";

const homeOnlyBottomNavItems = [
  {
    label: "ホーム",
    href: routePaths.home(),
    section: "home" as const,
    description: "ホームに戻ります",
  },
];

const HINTS = [
  { text: "読み返しより問題を解く方が記憶に残ります", cite: "Roediger & Karpicke 2006" },
  { text: "25〜45分勉強したら5〜10分休憩すると集中力が続きます", cite: "Ariga & Lleras 2011" },
  { text: "複数科目を交互に取り組むと定着しやすいです", cite: "Rohrer & Taylor 2007" },
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

function StepItem({
  label,
  sub,
  done,
  current,
}: {
  label: string;
  sub: string;
  done?: boolean;
  current?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border px-4 py-3",
        current
          ? "border-primary/40 bg-card"
          : done
            ? "border-border bg-muted/40 opacity-75"
            : "border-border bg-card",
      )}
    >
      <div
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
          done
            ? "bg-emerald-500 text-white"
            : current
              ? "bg-primary text-white"
              : "border border-border bg-muted text-muted-foreground",
        )}
      >
        {done ? "✓" : ""}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-foreground">{label}</div>
        <div className="text-xs text-muted-foreground">{sub}</div>
      </div>
      {current ? <span className="text-sm text-primary">›</span> : null}
    </div>
  );
}

function ProgressRow({
  subject,
  plannedMinutes,
  doneMinutes,
}: {
  subject: ExamSubject;
  plannedMinutes: number;
  doneMinutes: number;
}) {
  const widthPercent =
    plannedMinutes > 0 ? Math.min(100, (doneMinutes / plannedMinutes) * 100) : 0;
  const remainingMinutes = Math.max(0, plannedMinutes - doneMinutes);

  return (
    <div className="flex items-center gap-3">
      <SubjectDot subject={subject} />
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="truncate text-sm font-semibold text-foreground">{subject.subject_name}</div>
          <div className="shrink-0 text-xs text-muted-foreground">
            残り <span className="font-semibold text-foreground">{formatMinutes(remainingMinutes)}</span>
          </div>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full transition-[width]"
            style={{ width: `${widthPercent}%`, backgroundColor: getSubjectColor(subject) }}
          />
        </div>
      </div>
      <div className="w-12 shrink-0 text-right text-xs font-medium text-muted-foreground">
        {Math.round(widthPercent)}%
      </div>
    </div>
  );
}

function HomeEmpty({ onCreate }: { onCreate: () => void }) {
  return (
    <LayoutStack className="pt-card-gap">
      <Card className="overflow-hidden border-primary/15 bg-gradient-to-br from-primary/10 via-card to-card shadow-[var(--shadow)]">
        <CardHeader className="gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <ClipboardList className="h-4 w-4" aria-hidden="true" />
            <span>ホーム</span>
          </div>
          <div className="space-y-2">
            <CardTitle className="text-2xl leading-tight text-foreground">
              まずはテストを作りましょう
            </CardTitle>
            <CardDescription className="text-sm leading-6">
              日程と科目を入れるだけで、学習プランの準備が始まります。
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <ol className="space-y-3">
            {[
              "テストを作る",
              "目標点数を入れる",
              "学習プランを作る",
            ].map((label, index) => (
              <li key={label} className="flex items-center gap-3 rounded-xl border bg-card/80 px-4 py-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {index + 1}
                </span>
                <span className="text-sm font-medium text-foreground">{label}</span>
              </li>
            ))}
          </ol>
          <Button onClick={onCreate} size="lg" className="w-full">
            テストを作成する
          </Button>
        </CardContent>
      </Card>
    </LayoutStack>
  );
}

function HomePlanning({
  exam,
  subjects,
  hasTargets,
  hasDailyPlan,
  onCta,
}: {
  exam: Exam;
  subjects: ExamSubject[];
  hasTargets: boolean;
  hasDailyPlan: boolean;
  onCta: () => void;
}) {
  const ctaLabel = !hasTargets
    ? "目標点数を設定する"
    : hasDailyPlan
      ? "学習プランを確認する"
      : "日程・予定を設定する";

  return (
    <LayoutStack className="pt-card-gap">
      <Card className="border-primary/20 bg-primary/10 shadow-[var(--shadow-sm)]">
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            <span>準備中</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">{exam.name}</span>
          </div>
          <CardTitle className="text-2xl leading-tight text-foreground">
            目標点数と日程・予定を入れて
            <br />
            学習プランを作りましょう
          </CardTitle>
        </CardHeader>
      </Card>

      <div className="space-y-3">
        <StepItem done label="テストを作成" sub={`${exam.name} · ${formatDate(exam.start_date)}開始`} />
        <StepItem
          label="目標点数を入れる"
          sub={`${subjects.length}科目`}
          done={hasTargets}
          current={!hasTargets}
        />
        <StepItem
          label="日程・予定を入れる"
          sub="自動 or 手動"
          done={hasDailyPlan}
          current={hasTargets && !hasDailyPlan}
        />
        <StepItem label="学習プランを確認" sub="科目ごとの目安時間" />
      </div>

      <Button onClick={onCta} size="lg" className="w-full">
        {ctaLabel}
      </Button>
    </LayoutStack>
  );
}

function HomeActive({
  exam,
  subjects,
  studyPlans,
  todayPlans,
  progressLogs,
  onRecord,
}: {
  exam: Exam;
  subjects: ExamSubject[];
  studyPlans: StudyPlan[];
  todayPlans: DailyPlan[];
  progressLogs: ProgressLog[];
  onRecord: () => void;
}) {
  const daysLeft = getDaysUntilExamStart(exam.start_date);
  const progressRows = studyPlans.map((studyPlan) => {
    const subject = subjects.find((item) => item.id === studyPlan.exam_subject_id);
    if (subject == null) {
      return null;
    }

    const doneMinutes = progressLogs
      .filter((log) => log.exam_subject_id === subject.id)
      .reduce((sum, log) => sum + log.logged_minutes, 0);

    return {
      subject,
      plannedMinutes: studyPlan.planned_minutes,
      doneMinutes,
    };
  });

  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000,
  );
  const hint = HINTS[dayOfYear % HINTS.length];

  return (
    <LayoutStack className="pt-card-gap">
      <section className="rounded-xl border border-primary/20 bg-primary/10 px-4 py-3">
        <div className="flex items-center gap-3">
          <CalendarDays className="h-4 w-4 text-primary" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-primary">
              {exam.name}まであと{daysLeft}日
            </div>
            <div className="text-xs text-muted-foreground">{formatDate(exam.start_date)}開始</div>
          </div>
        </div>
      </section>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-baseline justify-between gap-3">
            <CardTitle className="text-lg">今日やること</CardTitle>
            <span className="text-xs text-muted-foreground">{formatDateToString(new Date())}</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {todayPlans.length === 0 ? (
            <p className="text-sm text-muted-foreground">今日の予定はありません</p>
          ) : (
            <div className="space-y-3">
              {todayPlans.map((plan) => {
                const subject = subjects.find((item) => item.id === plan.exam_subject_id);
                if (subject == null) {
                  return null;
                }

                return (
                  <div key={plan.id} className="flex items-center gap-3">
                    <SubjectDot subject={subject} size={32} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-foreground">{subject.subject_name}</div>
                      <div className="text-xs text-muted-foreground">{formatMinutes(plan.planned_minutes)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <Button onClick={onRecord} className="w-full">
            <PencilLine className="h-4 w-4" aria-hidden="true" />
            記録する
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">進捗サマリー</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {progressRows.every((row) => row == null) ? (
            <p className="text-sm text-muted-foreground">進捗データはまだありません</p>
          ) : (
            progressRows.map((row) =>
              row == null ? null : (
                <ProgressRow
                  key={row.subject.id}
                  subject={row.subject}
                  plannedMinutes={row.plannedMinutes}
                  doneMinutes={row.doneMinutes}
                />
              ),
            )
          )}
        </CardContent>
      </Card>

      <Card className="bg-muted/40">
        <CardContent className="space-y-2 pt-6">
          <p className="text-sm text-muted-foreground">{hint.text}</p>
          <p className="text-xs text-muted-foreground">({hint.cite})</p>
        </CardContent>
      </Card>
    </LayoutStack>
  );
}

function HomeFinishedPending({
  exam,
  subjects,
  onResultEntry,
  onLater,
}: {
  exam: Exam;
  subjects: ExamSubject[];
  onResultEntry: () => void;
  onLater: () => void;
}) {
  return (
    <LayoutStack className="pt-card-gap">
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <Flag className="h-4 w-4" aria-hidden="true" />
            <span>おつかれさまでした</span>
          </div>
          <CardTitle className="text-2xl leading-tight text-foreground">
            {exam.name}が終了しました
          </CardTitle>
          <CardDescription className="leading-6">
            今回の点数と実際の勉強時間を記録しましょう。次回のテスト作成時に引き継げます。
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">記録するもの</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {subjects.map((subject) => (
            <div key={subject.id} className="flex items-center gap-3 rounded-xl border px-4 py-3">
              <SubjectDot subject={subject} />
              <div className="min-w-0 flex-1 text-sm font-medium text-foreground">{subject.subject_name}</div>
              <div className="text-xs text-muted-foreground">目標 {subject.target_score}点</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="space-y-3">
        <Button onClick={onResultEntry} size="lg" className="w-full">
          結果を入力する
        </Button>
        <Button onClick={onLater} variant="ghost" className="w-full">
          あとで入力する
        </Button>
      </div>
    </LayoutStack>
  );
}

export default function HomePage() {
  const router = useRouter();
  const repository = useRepository();
  const activeExamId = useExamStore((state) => state.activeExamId);
  const setActiveExamId = useExamStore((state) => state.setActiveExamId);
  const authUser = useExamStore((state) => state.authUser);
  const isAuthLoading = useExamStore((state) => state.isAuthLoading);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [viewState, setViewState] = useState<ReturnType<typeof buildHomeViewState>["viewState"] | null>(null);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (authUser == null && !hasValidGuestSession()) {
      void router.replace(routePaths.top());
      return;
    }

    let isMounted = true;

    const load = async () => {
      const exams = await repository.listExams();
      const allSubjects = await repository.listExamSubjects();
      const allStudyPlans = await repository.listStudyPlans();
      const allDailyPlans = await repository.listDailyPlans();
      const allProgressLogs = await repository.listProgressLogs();
      const allExamResults = await repository.listExamResults();

      const today = formatDateToString(new Date());
      const now = new Date().toISOString();
      const { examsToPersist, viewState: nextViewState } = buildHomeViewState({
        exams,
        subjects: allSubjects,
        studyPlans: allStudyPlans,
        dailyPlans: allDailyPlans,
        progressLogs: allProgressLogs,
        examResults: allExamResults,
        today,
        now,
      });

      for (const exam of examsToPersist) {
        await repository.updateExam(exam);
      }

      if (!isMounted) {
        return;
      }

      setActiveExamId(nextViewState.displayExamId);
      setIsAuthorized(true);
      setViewState(nextViewState);
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [authUser, isAuthLoading, repository, router, setActiveExamId]);

  const bottomNavItems = useMemo(
    () =>
      activeExamId != null ? createDefaultBottomNavItems(activeExamId) : homeOnlyBottomNavItems,
    [activeExamId],
  );

  if (!isAuthorized || viewState == null) {
    return (
      <Layout
        variant="app"
        header={<AppHeader title="ホーム" subtitle={authUser == null ? "ゲスト利用中" : undefined} />}
        bottomNav={<BottomNav items={homeOnlyBottomNavItems} pathname={routePaths.home()} />}
      >
        <LayoutStack className="pt-card-gap">
          <PageLoadingState message="ホームの内容を読み込んでいます。" />
        </LayoutStack>
      </Layout>
    );
  }

  const { finishedPendingExam, activeExam, planningExam, subjects, studyPlans, dailyPlans, progressLogs } =
    viewState;
  const today = formatDateToString(new Date());

  let content: ReactElement;

  if (finishedPendingExam != null) {
    const finishedSubjects = subjects
      .filter((subject) => subject.exam_id === finishedPendingExam.id)
      .sort((left, right) => left.display_order - right.display_order);

    content = (
      <HomeFinishedPending
        exam={finishedPendingExam}
        subjects={finishedSubjects}
        onResultEntry={() => {
          void router.push(routePaths.resultEntry(finishedPendingExam.id));
        }}
        onLater={() => {
          void router.push(routePaths.home());
        }}
      />
    );
  } else if (activeExam != null) {
    const activeSubjects = subjects
      .filter((subject) => subject.exam_id === activeExam.id)
      .sort((left, right) => left.display_order - right.display_order);
    const subjectIds = new Set(activeSubjects.map((subject) => subject.id));
    const activeStudyPlans = studyPlans.filter((studyPlan) => subjectIds.has(studyPlan.exam_subject_id));
    const todayPlans = dailyPlans
      .filter((dailyPlan) => dailyPlan.exam_id === activeExam.id && dailyPlan.date === today)
      .sort((left, right) => left.display_order - right.display_order);
    const activeProgressLogs = progressLogs.filter((log) => subjectIds.has(log.exam_subject_id));

    content = (
      <HomeActive
        exam={activeExam}
        subjects={activeSubjects}
        studyPlans={activeStudyPlans}
        todayPlans={todayPlans}
        progressLogs={activeProgressLogs}
        onRecord={() => {
          void router.push(routePaths.progressLog(activeExam.id));
        }}
      />
    );
  } else if (planningExam != null) {
    const planningSubjects = subjects
      .filter((subject) => subject.exam_id === planningExam.id)
      .sort((left, right) => left.display_order - right.display_order);
    const hasTargets = planningSubjects.some((subject) => subject.target_score > 0);
    const hasDailyPlan = dailyPlans.some((dailyPlan) => dailyPlan.exam_id === planningExam.id);

    content = (
      <HomePlanning
        exam={planningExam}
        subjects={planningSubjects}
        hasTargets={hasTargets}
        hasDailyPlan={hasDailyPlan}
        onCta={() => {
          if (!hasTargets) {
            void router.push(routePaths.targetScore(planningExam.id));
            return;
          }

          if (!hasDailyPlan) {
            void router.push(routePaths.planMode(planningExam.id));
            return;
          }

          void router.push(routePaths.dailyPlan(planningExam.id));
        }}
      />
    );
  } else {
    content = (
      <HomeEmpty
        onCreate={() => {
          void router.push(routePaths.testCreate());
        }}
      />
    );
  }

  return (
    <Layout
      variant="app"
      header={<AppHeader title="ホーム" subtitle={authUser == null ? "ゲスト利用中" : undefined} />}
      bottomNav={<BottomNav items={bottomNavItems} pathname={routePaths.home()} />}
    >
      {content}
    </Layout>
  );
}
