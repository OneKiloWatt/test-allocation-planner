import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";

import { BackHeader, Layout, routePaths } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { hasValidGuestSession } from "@/lib/guest-session";
import type { ExamSubject } from "@/lib/schemas";
import { cn, normalizeSubjectName } from "@/lib/utils";
import { useExamStore, useRepository } from "@/stores";

type SubjectState = {
  targetScore: string;
  showPrevious: boolean;
  selectedPreviousId: string | "none" | null;
};

type LoadedSubject = {
  current: ExamSubject;
  matchedPrevious: ExamSubject | null;
};

function getComparableNormalizedName(subject: ExamSubject) {
  return normalizeSubjectName(subject.subject_name || subject.normalized_name);
}

function getInitialTargetScore(subject: ExamSubject) {
  return subject.target_score > 0 ? String(subject.target_score) : "";
}

export default function TargetScorePage() {
  const router = useRouter();
  const repository = useRepository();
  const authUser = useExamStore((state) => state.authUser);
  const isAuthLoading = useExamStore((state) => state.isAuthLoading);
  const [isReady, setIsReady] = useState(false);
  const [examId, setExamId] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<LoadedSubject[]>([]);
  const [previousSubjects, setPreviousSubjects] = useState<ExamSubject[]>([]);
  const [hasPreviousExam, setHasPreviousExam] = useState(false);
  const [confirmMode, setConfirmMode] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [showZeroWarning, setShowZeroWarning] = useState(false);
  const [subjectStates, setSubjectStates] = useState<Record<string, SubjectState>>({});

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
      const exam = await repository.getExam(rawExamId);
      if (exam == null) {
        void router.replace(routePaths.home());
        return;
      }

      const allSubjects = await repository.listExamSubjects();
      const currentSubjects = allSubjects
        .filter((subject) => subject.exam_id === rawExamId)
        .sort((left, right) => left.display_order - right.display_order);

      const previousExam = (await repository.listExams())
        .filter((item) => item.status === "finished")
        .sort((left, right) => right.created_at.localeCompare(left.created_at))[0];

      const previousExamSubjects =
        previousExam == null
          ? []
          : allSubjects.filter((subject) => subject.exam_id === previousExam.id);

      const previousByNormalizedName = new Map(
        previousExamSubjects.map((subject) => [getComparableNormalizedName(subject), subject]),
      );

      const nextSubjects = currentSubjects.map((current) => ({
        current,
        matchedPrevious: previousByNormalizedName.get(getComparableNormalizedName(current)) ?? null,
      }));

      if (!isMounted) {
        return;
      }

      setExamId(rawExamId);
      setPreviousSubjects(previousExamSubjects);
      setHasPreviousExam(previousExam != null);
      setSubjects(nextSubjects);
      setSubjectStates(
        Object.fromEntries(
          nextSubjects.map(({ current, matchedPrevious }) => [
            current.id,
            {
              targetScore: getInitialTargetScore(current),
              showPrevious: false,
              selectedPreviousId: matchedPrevious?.id ?? null,
            },
          ]),
        ),
      );
      setIsReady(true);
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [authUser, isAuthLoading, repository, router, router.isReady, router.query.examId]);

  const mismatch = useMemo(
    () => hasPreviousExam && subjects.some((subject) => subject.matchedPrevious == null),
    [hasPreviousExam, subjects],
  );

  const hasScoreOverLimit = subjects.some(({ current }) => {
    const value = Number(subjectStates[current.id]?.targetScore ?? "");
    return Number.isFinite(value) && value > 100;
  });

  const handleTargetScoreChange = (subjectId: string, value: string) => {
    setSubjectStates((current) => ({
      ...current,
      [subjectId]: {
        ...current[subjectId],
        targetScore: value,
      },
    }));

    if (value !== "" && Number(value) > 0) {
      setConfirmSubmit(false);
      setShowZeroWarning(false);
    }
  };

  const handleTogglePrevious = (subjectId: string) => {
    setSubjectStates((current) => ({
      ...current,
      [subjectId]: {
        ...current[subjectId],
        showPrevious: !current[subjectId]?.showPrevious,
      },
    }));
  };

  const handleSelectPrevious = (subjectId: string, previousId: string | "none") => {
    setSubjectStates((current) => ({
      ...current,
      [subjectId]: {
        ...current[subjectId],
        selectedPreviousId: previousId,
        showPrevious: previousId === "none" ? false : true,
      },
    }));
  };

  const handleSubmit = async () => {
    if (examId == null) {
      return;
    }

    const hasNonZeroTarget = subjects.some(({ current }) => {
      const rawValue = subjectStates[current.id]?.targetScore ?? "";
      return rawValue !== "" && Number(rawValue) > 0;
    });

    if (!hasNonZeroTarget && !confirmSubmit) {
      setConfirmSubmit(true);
      setShowZeroWarning(true);
      return;
    }

    if (hasScoreOverLimit) {
      return;
    }

    setShowZeroWarning(false);

    const timestamp = new Date().toISOString();
    for (const { current, matchedPrevious } of subjects) {
      const subjectState = subjectStates[current.id];
      const selectedPrevious =
        subjectState?.selectedPreviousId == null || subjectState.selectedPreviousId === "none"
          ? null
          : previousSubjects.find((subject) => subject.id === subjectState.selectedPreviousId) ?? null;
      const resolvedPrevious =
        subjectState?.selectedPreviousId === "none"
          ? null
          : matchedPrevious ?? selectedPrevious;

      await repository.updateExamSubject({
        ...current,
        target_score: Number(subjectState?.targetScore) || 0,
        previous_score: resolvedPrevious?.target_score ?? null,
        previous_study_minutes: resolvedPrevious?.previous_study_minutes ?? null,
        updated_at: timestamp,
      });
    }

    void router.push(routePaths.planMode(examId));
  };

  if (!isReady) {
    return null;
  }

  return (
    <Layout variant="form" header={<BackHeader title="目標点数" />}>
      <div className="space-y-6">
        {mismatch ? (
          <Card className="border-amber-300 bg-amber-50">
            <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-amber-900">
                  前回と科目名が変わったものがあります
                </p>
                <p className="text-sm text-amber-800">
                  必要なら前回データの引き継ぎ先を確認してください
                </p>
              </div>
              <Button variant="outline" onClick={() => setConfirmMode(true)}>
                確認する
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {subjects.map(({ current, matchedPrevious }) => {
          const subjectState = subjectStates[current.id];
          const selectedPrevious =
            subjectState?.selectedPreviousId == null || subjectState.selectedPreviousId === "none"
              ? null
              : previousSubjects.find((subject) => subject.id === subjectState.selectedPreviousId) ?? null;
          const resolvedPrevious =
            subjectState?.selectedPreviousId === "none"
              ? null
              : matchedPrevious ?? selectedPrevious;
          const targetValue = subjectState?.targetScore ?? "";
          const hasInlineError = targetValue !== "" && Number(targetValue) > 100;
          const canShowPreviousToggle = resolvedPrevious != null;

          return (
            <Card key={current.id}>
              <CardHeader className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-lg">{current.subject_name}</CardTitle>
                  {canShowPreviousToggle ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="px-2"
                      onClick={() => handleTogglePrevious(current.id)}
                    >
                      前回を見る
                    </Button>
                  ) : null}
                </div>

                {confirmMode && matchedPrevious == null ? (
                  <div className="flex flex-wrap gap-2">
                    {previousSubjects.map((previousSubject) => {
                      const isSelected = subjectState?.selectedPreviousId === previousSubject.id;

                      return (
                        <button
                          key={previousSubject.id}
                          type="button"
                          className={cn(
                            "rounded-full border px-3 py-2 text-sm transition-colors",
                            isSelected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-background text-text hover:bg-muted",
                          )}
                          onClick={() => handleSelectPrevious(current.id, previousSubject.id)}
                        >
                          前回の{previousSubject.subject_name}と同じ？
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      className={cn(
                        "rounded-full border px-3 py-2 text-sm transition-colors",
                        subjectState?.selectedPreviousId === "none"
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-text hover:bg-muted",
                      )}
                      onClick={() => handleSelectPrevious(current.id, "none")}
                    >
                      前回データなしで始める
                    </button>
                  </div>
                ) : null}
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label
                    htmlFor={`target-score-${current.id}`}
                    className="text-sm font-medium leading-none"
                  >
                    目標点
                  </label>
                  <Input
                    id={`target-score-${current.id}`}
                    type="number"
                    min={0}
                    max={100}
                    inputMode="numeric"
                    placeholder="0"
                    value={targetValue}
                    onChange={(event) => handleTargetScoreChange(current.id, event.target.value)}
                  />
                  {hasInlineError ? (
                    <p className="text-sm font-medium text-destructive" role="alert">
                      100点までの数字を入れてみましょう
                    </p>
                  ) : null}
                </div>

                {canShowPreviousToggle && subjectState?.showPrevious ? (
                  <div className="rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-text">
                    <p className="font-medium text-text">
                      前回の目標点: {resolvedPrevious?.target_score ?? "-"}点
                    </p>
                    <p>
                      前回の学習時間:{" "}
                      {resolvedPrevious?.previous_study_minutes != null
                        ? `${resolvedPrevious.previous_study_minutes}分`
                        : "-"}
                    </p>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          );
        })}

        <div className="space-y-3">
          {showZeroWarning ? (
            <p className="text-sm font-medium text-destructive" role="alert">
              1科目だけでも目標を入れると、配分の計算ができます
            </p>
          ) : null}
          <Button type="button" className="w-full" onClick={handleSubmit}>
            日程・予定を設定する
          </Button>
        </div>
      </div>
    </Layout>
  );
}
