import type { DailyPlan, Exam, ExamResult, ExamSubject, ProgressLog, StudyPlan } from "@/lib/schemas";

export type HomeViewState = {
  finishedPendingExam: Exam | null;
  activeExam: Exam | null;
  planningExam: Exam | null;
  displayExamId: string | null;
  exams: Exam[];
  subjects: ExamSubject[];
  studyPlans: StudyPlan[];
  dailyPlans: DailyPlan[];
  progressLogs: ProgressLog[];
  examResults: ExamResult[];
};

type BuildHomeViewStateParams = {
  exams: Exam[];
  subjects: ExamSubject[];
  studyPlans: StudyPlan[];
  dailyPlans: DailyPlan[];
  progressLogs: ProgressLog[];
  examResults: ExamResult[];
  today: string;
  now: string;
};

export function buildHomeViewState({
  exams,
  subjects,
  studyPlans,
  dailyPlans,
  progressLogs,
  examResults,
  today,
  now,
}: BuildHomeViewStateParams): {
  examsToPersist: Exam[];
  viewState: HomeViewState;
} {
  const updatedExams = exams.map((exam) => {
    if (exam.status !== "finished" && exam.end_date < today) {
      return {
        ...exam,
        status: "finished" as const,
        version: exam.version + 1,
        updated_at: now,
      };
    }

    if (
      exam.status === "planning" &&
      dailyPlans.some((dailyPlan) => dailyPlan.exam_id === exam.id) &&
      exam.end_date >= today
    ) {
      return {
        ...exam,
        status: "active" as const,
        version: exam.version + 1,
        updated_at: now,
      };
    }

    return exam;
  });

  const examsToPersist = updatedExams.filter((exam, index) => exam !== exams[index]);

  const sortedExams = [...updatedExams].sort((left, right) =>
    right.created_at.localeCompare(left.created_at),
  );

  const finishedPendingExam =
    sortedExams.find((exam) => {
      if (exam.status !== "finished") {
        return false;
      }

      const subjectIds = new Set(
        subjects.filter((subject) => subject.exam_id === exam.id).map((subject) => subject.id),
      );

      return !examResults.some((result) => subjectIds.has(result.exam_subject_id));
    }) ?? null;

  const activeExam = sortedExams.find((exam) => exam.status === "active") ?? null;
  const planningExam = sortedExams.find((exam) => exam.status === "planning") ?? null;
  const displayExamId = activeExam?.id ?? planningExam?.id ?? finishedPendingExam?.id ?? null;

  return {
    examsToPersist,
    viewState: {
      finishedPendingExam,
      activeExam,
      planningExam,
      displayExamId,
      exams: updatedExams,
      subjects,
      studyPlans,
      dailyPlans,
      progressLogs,
      examResults,
    },
  };
}
