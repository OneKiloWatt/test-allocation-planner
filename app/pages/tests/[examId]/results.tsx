import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";

import { BackHeader, Layout, routePaths } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { hasValidGuestSession } from "@/lib/guest-session";
import { formatDate, formatMinutes, getSubjectColor } from "@/lib/logic/daily-plan-view";
import { sumProgressMinutesBySubject } from "@/lib/logic/result-review";
import { RecordConflictError } from "@/lib/repositories";
import type { Exam, ExamResult, ExamSubject } from "@/lib/schemas";
import { cn, generateUuid } from "@/lib/utils";
import { useExamStore, useRepository } from "@/stores";

const SCORE_OVER_MAX_MESSAGE = "100点までの数字を入れてみましょう";
const MISSING_MINUTES_MESSAGE =
  "勉強時間がまだの科目があります。0分でも入れておくと振り返りに使えます";
const UNSAVED_MESSAGE = "まだ保存していない変更があります。ページを離れますか？";

type ResultFormRow = {
  examSubjectId: string;
  actualScore: string;
  actualStudyMinutes: string;
  note: string;
  resultId: string | null;
  createdAt: string | null;
};

type FieldErrors = Record<string, { score?: string; minutes?: string }>;

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

function serializeRows(rows: ResultFormRow[]) {
  return JSON.stringify(
    rows.map((row) => ({
      examSubjectId: row.examSubjectId,
      actualScore: row.actualScore,
      actualStudyMinutes: row.actualStudyMinutes,
      note: row.note,
      resultId: row.resultId,
    })),
  );
}

function toNonNegativeInteger(value: string) {
  if (value.trim() === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function buildRows(
  subjects: ExamSubject[],
  results: ExamResult[],
  progressMinutesBySubject: Map<string, number>,
) {
  const resultBySubject = new Map(results.map((result) => [result.exam_subject_id, result]));

  return subjects.map<ResultFormRow>((subject) => {
    const result = resultBySubject.get(subject.id);

    return {
      examSubjectId: subject.id,
      actualScore: result == null ? "" : String(result.actual_score),
      actualStudyMinutes:
        result == null
          ? String(progressMinutesBySubject.get(subject.id) ?? 0)
          : result.actual_study_minutes == null
            ? ""
            : String(result.actual_study_minutes),
      note: result?.note ?? "",
      resultId: result?.id ?? null,
      createdAt: result?.created_at ?? null,
    };
  });
}

export default function ResultEntryPage() {
  const router = useRouter();
  const repository = useRepository();
  const authUser = useExamStore((state) => state.authUser);
  const isAuthLoading = useExamStore((state) => state.isAuthLoading);
  const [isReady, setIsReady] = useState(false);
  const [examId, setExamId] = useState<string | null>(null);
  const [exam, setExam] = useState<Exam | null>(null);
  const [subjects, setSubjects] = useState<ExamSubject[]>([]);
  const [rows, setRows] = useState<ResultFormRow[]>([]);
  const [baseline, setBaseline] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showSavedPrompt, setShowSavedPrompt] = useState(false);

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

      const allProgressLogs = await repository.listProgressLogs();
      const progressMinutesBySubject = sumProgressMinutesBySubject(
        allProgressLogs.filter((log) => log.exam_id === rawExamId),
      );

      const allResults = await repository.listExamResults();
      const matchedResults = allResults.filter((result) =>
        subjectIds.has(result.exam_subject_id),
      );
      const nextRows = buildRows(matchedSubjects, matchedResults, progressMinutesBySubject);
      const nextBaseline = serializeRows(nextRows);

      if (!isMounted) {
        return;
      }

      setExamId(rawExamId);
      setExam(loadedExam);
      setSubjects(matchedSubjects);
      setRows(nextRows);
      setBaseline(nextBaseline);
      setIsReady(true);
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [authUser, isAuthLoading, repository, router, router.isReady, router.query.examId]);

  const dirty = useMemo(() => {
    return isReady && serializeRows(rows) !== baseline && !showSavedPrompt;
  }, [baseline, isReady, rows, showSavedPrompt]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) {
        return;
      }

      event.preventDefault();
      event.returnValue = UNSAVED_MESSAGE;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [dirty]);

  const subjectMap = useMemo(
    () => new Map(subjects.map((subject) => [subject.id, subject])),
    [subjects],
  );

  const guardNavigation = (navigate: () => void) => {
    if (!dirty || window.confirm(UNSAVED_MESSAGE)) {
      navigate();
    }
  };

  const updateRow = (
    examSubjectId: string,
    key: keyof Pick<ResultFormRow, "actualScore" | "actualStudyMinutes" | "note">,
    value: string,
  ) => {
    setRows((current) =>
      current.map((row) =>
        row.examSubjectId === examSubjectId ? { ...row, [key]: value } : row,
      ),
    );
    if (key !== "note") {
      setErrors((current) => ({
        ...current,
        [examSubjectId]: {
          ...current[examSubjectId],
          [key === "actualScore" ? "score" : "minutes"]: undefined,
        },
      }));
    }
    setSaveError(null);
    setShowSavedPrompt(false);
  };

  const validate = () => {
    const nextErrors: FieldErrors = {};

    for (const row of rows) {
      const score = toNonNegativeInteger(row.actualScore);
      const minutes = toNonNegativeInteger(row.actualStudyMinutes);
      const rowErrors: { score?: string; minutes?: string } = {};

      if (row.actualScore.trim() === "" || score == null) {
        rowErrors.score = "点数を入れてください";
      } else if (score > 100) {
        rowErrors.score = SCORE_OVER_MAX_MESSAGE;
      }

      if (row.actualStudyMinutes.trim() === "" || minutes == null) {
        rowErrors.minutes = MISSING_MINUTES_MESSAGE;
      }

      if (rowErrors.score != null || rowErrors.minutes != null) {
        nextErrors[row.examSubjectId] = rowErrors;
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSave = async () => {
    if (examId == null || !validate()) {
      return;
    }

    const now = new Date().toISOString();
    const savedRows: ResultFormRow[] = [];

    try {
      for (const row of rows) {
        const actualScore = toNonNegativeInteger(row.actualScore);
        const actualStudyMinutes = toNonNegativeInteger(row.actualStudyMinutes);

        if (actualScore == null || actualStudyMinutes == null) {
          return;
        }

        const examResult: ExamResult = {
          id: row.resultId ?? generateUuid(),
          exam_subject_id: row.examSubjectId,
          actual_score: actualScore,
          actual_study_minutes: actualStudyMinutes,
          note: row.note.trim() || null,
          created_at: row.createdAt ?? now,
          updated_at: now,
        };

        const saved =
          row.resultId == null
            ? await repository.createExamResult(examResult)
            : await repository.updateExamResult(examResult);

        savedRows.push({
          ...row,
          resultId: saved.id,
          actualScore: String(saved.actual_score),
          actualStudyMinutes:
            saved.actual_study_minutes == null ? "" : String(saved.actual_study_minutes),
          note: saved.note ?? "",
          createdAt: saved.created_at,
        });
      }
    } catch (error) {
      if (error instanceof RecordConflictError) {
        setSaveError("同じ科目の結果がすでにあります。ページを読み直してから修正してください");
        return;
      }

      console.error(error);
      setSaveError("保存できませんでした。少し時間をおいてもう一度試してください");
      return;
    }

    const nextBaseline = serializeRows(savedRows);
    setRows(savedRows);
    setBaseline(nextBaseline);
    setErrors({});
    setSaveError(null);
    setShowSavedPrompt(true);
  };

  if (!isReady || exam == null || examId == null) {
    return null;
  }

  return (
    <Layout
      variant="form"
      header={
        <BackHeader
          title="結果入力"
          subtitle={exam.name}
          onBack={() => {
            guardNavigation(() => {
              void router.push(routePaths.home());
            });
          }}
        />
      }
    >
      <div className="space-y-6">
        <section className="rounded-xl border border-primary/20 bg-primary/10 px-4 py-3">
          <p className="text-sm font-semibold text-primary">{exam.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatDate(exam.start_date)}〜{formatDate(exam.end_date)}
          </p>
        </section>

        {showSavedPrompt ? (
          <Card className="border-primary/20 bg-primary/10">
            <CardHeader>
              <CardTitle className="text-xl">保存しました</CardTitle>
              <CardDescription className="leading-6">
                今回の結果はこの端末に保存されています。振り返りで次回に使うヒントを確認できます。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                type="button"
                size="lg"
                className="w-full"
                onClick={() => {
                  void router.push(routePaths.review(examId));
                }}
              >
                振り返りへ進む
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  setShowSavedPrompt(false);
                }}
              >
                入力を見直す
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">科目ごとの結果</CardTitle>
            <CardDescription>進捗記録の合計時間を初期表示しています。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {rows.map((row) => {
              const subject = subjectMap.get(row.examSubjectId);
              if (subject == null) {
                return null;
              }

              const rowErrors = errors[row.examSubjectId] ?? {};

              return (
                <div key={row.examSubjectId} className="space-y-4 rounded-xl border px-4 py-4">
                  <div className="flex items-center gap-3">
                    <SubjectDot subject={subject} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {subject.subject_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        目標 {subject.target_score}点
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label
                        htmlFor={`score-${row.examSubjectId}`}
                        className="text-sm font-medium text-foreground"
                      >
                        実際の点数
                      </label>
                      <div className="flex items-center gap-3">
                        <Input
                          id={`score-${row.examSubjectId}`}
                          type="number"
                          min={0}
                          max={100}
                          value={row.actualScore}
                          onChange={(event) => {
                            updateRow(row.examSubjectId, "actualScore", event.target.value);
                          }}
                          className={cn(rowErrors.score ? "border-destructive" : "")}
                        />
                        <span className="shrink-0 text-sm font-medium text-muted-foreground">
                          点
                        </span>
                      </div>
                      {rowErrors.score ? (
                        <p className="text-sm leading-6 text-destructive">{rowErrors.score}</p>
                      ) : null}
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor={`minutes-${row.examSubjectId}`}
                        className="text-sm font-medium text-foreground"
                      >
                        実際の勉強時間
                      </label>
                      <div className="flex items-center gap-3">
                        <Input
                          id={`minutes-${row.examSubjectId}`}
                          type="number"
                          min={0}
                          step={10}
                          value={row.actualStudyMinutes}
                          onChange={(event) => {
                            updateRow(
                              row.examSubjectId,
                              "actualStudyMinutes",
                              event.target.value,
                            );
                          }}
                          className={cn(rowErrors.minutes ? "border-destructive" : "")}
                        />
                        <span className="shrink-0 text-sm font-medium text-muted-foreground">
                          分
                        </span>
                      </div>
                      {row.actualStudyMinutes.trim() !== "" &&
                      toNonNegativeInteger(row.actualStudyMinutes) != null ? (
                        <p className="text-xs text-muted-foreground">
                          {formatMinutes(Number(row.actualStudyMinutes))}
                        </p>
                      ) : null}
                      {rowErrors.minutes ? (
                        <p className="text-sm leading-6 text-caution">{rowErrors.minutes}</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor={`note-${row.examSubjectId}`}
                      className="text-sm font-medium text-foreground"
                    >
                      メモ
                    </label>
                    <textarea
                      id={`note-${row.examSubjectId}`}
                      rows={2}
                      maxLength={500}
                      placeholder="任意メモ"
                      className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                      value={row.note}
                      onChange={(event) => {
                        updateRow(row.examSubjectId, "note", event.target.value);
                      }}
                    />
                  </div>
                </div>
              );
            })}

            {saveError ? <p className="text-sm leading-6 text-destructive">{saveError}</p> : null}

            <Button
              type="button"
              size="lg"
              className="w-full"
              onClick={() => {
                void handleSave();
              }}
            >
              保存する
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => {
              guardNavigation(() => {
                void router.push(routePaths.home());
              });
            }}
          >
            ホームに戻る
          </Button>
        </div>
      </div>
    </Layout>
  );
}
