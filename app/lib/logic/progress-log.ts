import type { ProgressLog } from "@/lib/schemas";

export function hasDuplicateProgressLogForDate(
  progressLogs: ProgressLog[],
  examSubjectId: string,
  loggedDate: string,
): boolean {
  return progressLogs.some(
    (log) => log.exam_subject_id === examSubjectId && log.logged_date === loggedDate,
  );
}

export function calculateProgressSummary(
  progressLogs: ProgressLog[],
  examSubjectId: string,
  targetMinutes: number | null,
) {
  const actualMinutes = progressLogs
    .filter((log) => log.exam_subject_id === examSubjectId)
    .reduce((sum, log) => sum + log.logged_minutes, 0);

  const remainingMinutes =
    targetMinutes == null ? null : Math.max(0, targetMinutes - actualMinutes);
  const progressPercent =
    targetMinutes != null && targetMinutes > 0
      ? Math.min(100, Math.round((actualMinutes / targetMinutes) * 100))
      : null;

  return {
    actualMinutes,
    remainingMinutes,
    progressPercent,
  };
}
