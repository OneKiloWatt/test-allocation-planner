import type { ExamResult, ExamSubject, ProgressLog, StudyPlan } from "@/lib/schemas";

export type ResultReviewRow = {
  subject: ExamSubject;
  result: ExamResult;
  plannedMinutes: number | null;
  actualStudyMinutes: number | null;
  targetScore: number;
  actualScore: number;
  scoreDiff: number;
  timeDiff: number | null;
  achieved: boolean;
};

export function sumProgressMinutesBySubject(progressLogs: ProgressLog[]) {
  const totals = new Map<string, number>();

  for (const log of progressLogs) {
    totals.set(
      log.exam_subject_id,
      (totals.get(log.exam_subject_id) ?? 0) + log.logged_minutes,
    );
  }

  return totals;
}

export function buildResultReviewRows(
  subjects: ExamSubject[],
  studyPlans: StudyPlan[],
  results: ExamResult[],
): ResultReviewRow[] {
  const planBySubjectId = new Map(
    studyPlans.map((studyPlan) => [studyPlan.exam_subject_id, studyPlan]),
  );
  const resultBySubjectId = new Map(
    results.map((result) => [result.exam_subject_id, result]),
  );

  return subjects.flatMap((subject) => {
    const result = resultBySubjectId.get(subject.id);
    if (result == null) {
      return [];
    }

    const plannedMinutes = planBySubjectId.get(subject.id)?.planned_minutes ?? null;
    const actualStudyMinutes = result.actual_study_minutes ?? null;
    const scoreDiff = result.actual_score - subject.target_score;

    return [
      {
        subject,
        result,
        plannedMinutes,
        actualStudyMinutes,
        targetScore: subject.target_score,
        actualScore: result.actual_score,
        scoreDiff,
        timeDiff:
          plannedMinutes == null || actualStudyMinutes == null
            ? null
            : actualStudyMinutes - plannedMinutes,
        achieved: scoreDiff >= 0,
      },
    ];
  });
}

export function buildResultSummary(rows: ResultReviewRow[]) {
  if (rows.length === 0) {
    return "結果を入れると、次回に使える振り返りを表示できます。";
  }

  const achieved = rows.filter((row) => row.achieved);
  const underTarget = rows.filter((row) => !row.achieved);
  const shortTime = rows.filter(
    (row) => row.timeDiff != null && row.timeDiff < 0 && !row.achieved,
  );

  if (underTarget.length === 0) {
    const names = achieved.slice(0, 2).map((row) => row.subject.subject_name).join("、");
    return `${names}など、入力済みの科目は目標に届いています。次回も同じ配分を出発点にできます。`;
  }

  const achievedText =
    achieved.length > 0
      ? `${achieved.slice(0, 2).map((row) => row.subject.subject_name).join("、")}は達成`
      : "達成科目はまだ少なめ";
  const underText = `${underTarget
    .slice(0, 2)
    .map((row) => row.subject.subject_name)
    .join("、")}は目標まであと少し`;
  const timeText =
    shortTime.length > 0
      ? `。${shortTime[0]?.subject.subject_name}は時間不足傾向もあります`
      : "";

  return `${achievedText}、${underText}${timeText}。`;
}
