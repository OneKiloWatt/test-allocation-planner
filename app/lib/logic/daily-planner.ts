import type { DailyPlan } from "../schemas";
import { generateUuid } from "../utils";

type SubjectPlan = {
  examSubjectId: string;
  plannedMinutes: number;
  weight: number;
};

type StudyDay = {
  date: string;
  availableMinutes: number;
};

function floorToTenWithMinimum(value: number) {
  if (value <= 0) {
    return 0;
  }

  const floored = Math.floor(value / 10) * 10;
  return Math.max(floored, 10);
}

function distributeEvenly(total: number, count: number) {
  if (count <= 0 || total <= 0) {
    return [];
  }

  const base = Math.floor(total / count);
  const remainder = total % count;

  return Array.from({ length: count }, (_, index) => base + (index < remainder ? 1 : 0));
}

export function assignToDays(subjects: SubjectPlan[], studyDays: StudyDay[], examId: string): DailyPlan[] {
  if (studyDays.length === 0 || subjects.length === 0) {
    return [];
  }

  const sortedSubjects = [...subjects].sort((left, right) => right.weight - left.weight);
  const firstHalfCount = Math.max(1, Math.ceil(studyDays.length * 0.4));
  const firstHalfDays = studyDays.slice(0, firstHalfCount);
  const secondHalfDays = studyDays.slice(firstHalfCount);
  const heavyCount = Math.ceil(sortedSubjects.length / 2);
  const heavyIds = new Set(sortedSubjects.slice(0, heavyCount).map((subject) => subject.examSubjectId));
  const remainingMinutes = new Map(
    sortedSubjects.map((subject) => [subject.examSubjectId, subject.plannedMinutes]),
  );
  const perDayTarget = new Map<string, number[]>();

  for (const subject of sortedSubjects) {
    if (heavyIds.has(subject.examSubjectId)) {
      const earlyMinutes = Math.round(subject.plannedMinutes * 0.65);
      const lateMinutes = Math.max(subject.plannedMinutes - earlyMinutes, 0);
      perDayTarget.set(subject.examSubjectId, [
        ...distributeEvenly(earlyMinutes, firstHalfDays.length),
        ...distributeEvenly(lateMinutes, secondHalfDays.length),
      ]);
      continue;
    }

    perDayTarget.set(subject.examSubjectId, distributeEvenly(subject.plannedMinutes, studyDays.length));
  }

  const plans: DailyPlan[] = [];
  const now = new Date().toISOString();

  for (let dayIndex = 0; dayIndex < studyDays.length; dayIndex += 1) {
    const studyDay = studyDays[dayIndex];
    let availableMinutes = studyDay.availableMinutes;
    let displayOrder = 1;

    for (const subject of sortedSubjects) {
      if (availableMinutes < 10) {
        break;
      }

      const remaining = remainingMinutes.get(subject.examSubjectId) ?? 0;
      if (remaining < 10) {
        continue;
      }

      const targets = perDayTarget.get(subject.examSubjectId) ?? [];
      const dayTarget = targets[dayIndex] ?? 0;
      const requested = dayTarget > 0 ? Math.min(remaining, dayTarget) : remaining;
      let assignedMinutes = Math.min(requested, availableMinutes, 90);
      assignedMinutes = floorToTenWithMinimum(assignedMinutes);

      if (assignedMinutes > remaining) {
        assignedMinutes = floorToTenWithMinimum(remaining);
      }

      if (assignedMinutes > availableMinutes) {
        assignedMinutes = floorToTenWithMinimum(availableMinutes);
      }

      if (assignedMinutes < 10) {
        continue;
      }

      remainingMinutes.set(subject.examSubjectId, remaining - assignedMinutes);
      availableMinutes -= assignedMinutes;
      plans.push({
        id: generateUuid(),
        exam_id: examId,
        exam_subject_id: subject.examSubjectId,
        date: studyDay.date,
        planned_minutes: assignedMinutes,
        source: "auto",
        display_order: displayOrder,
        created_at: now,
        updated_at: now,
      });
      displayOrder += 1;
    }
  }

  return plans;
}
