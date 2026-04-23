import { addDays, format, parseISO } from "date-fns";

import type { AvailabilityRule, Exam, ExamSubject } from "../schemas";
import { getStudyDays } from "./available-time";
import { assignToDays } from "./daily-planner";
import { minutesFromShares, calculateShares } from "./share";
import { calculateWeight } from "./weight";

type AllocationSubject = Pick<
  ExamSubject,
  "id" | "target_score" | "previous_score" | "previous_study_minutes"
>;

export function allocate(subjects: AllocationSubject[], rule: AvailabilityRule, exam: Exam) {
  if (subjects.length === 0) {
    return [];
  }

  const endDate = format(addDays(parseISO(exam.start_date), -1), "yyyy-MM-dd");
  const examScheduleDays = (exam.schedule_days ?? []).map((day) => day.date);
  const studyDays = getStudyDays(rule.study_start_date, endDate, rule, examScheduleDays);

  if (studyDays.length === 0) {
    return [];
  }

  const totalMinutes = studyDays.reduce((sum, day) => sum + day.availableMinutes, 0);

  if (totalMinutes === 0) {
    return [];
  }

  const weights = subjects.map((subject) =>
    calculateWeight(
      subject.target_score,
      subject.previous_score,
      subject.previous_study_minutes,
    ),
  );
  const shares = calculateShares(weights);
  const plannedMinutesArr = minutesFromShares(totalMinutes, shares);
  const subjectList = subjects.map((subject, index) => ({
    examSubjectId: subject.id,
    plannedMinutes: plannedMinutesArr[index] ?? 0,
    weight: weights[index] ?? 0,
  }));

  return assignToDays(subjectList, studyDays, exam.id);
}
