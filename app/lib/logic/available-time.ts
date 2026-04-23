import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";

import type { AvailabilityRule } from "../schemas";
import { getWeekday } from "../utils";

export function getDailyAvailableMinutes(
  date: string,
  rule: AvailabilityRule,
  examScheduleDays: string[],
) {
  if (examScheduleDays.includes(date)) {
    return 0;
  }

  const weekday = getWeekday(date);

  if (weekday === "sat" || weekday === "sun") {
    return rule.weekend_minutes;
  }

  const examStartDate =
    examScheduleDays.length > 0
      ? [...examScheduleDays].sort((left, right) => left.localeCompare(right))[0]
      : null;
  const isClubDay = rule.club_days.includes(weekday);

  if (rule.pre_exam_rest_mode && examStartDate && isClubDay) {
    const daysUntilExamStart = differenceInCalendarDays(parseISO(examStartDate), parseISO(date));

    if (daysUntilExamStart >= 0 && daysUntilExamStart <= 7) {
      return rule.weekday_no_club_minutes;
    }
  }

  if (isClubDay) {
    return rule.weekday_club_minutes;
  }

  return rule.weekday_no_club_minutes;
}

export function getStudyDays(
  startDate: string,
  endDate: string,
  rule: AvailabilityRule,
  examScheduleDays: string[],
) {
  if (startDate > endDate) {
    return [];
  }

  const days: Array<{ date: string; availableMinutes: number }> = [];
  let current = parseISO(startDate);
  const last = parseISO(endDate);

  while (current <= last) {
    const date = format(current, "yyyy-MM-dd");
    const availableMinutes = getDailyAvailableMinutes(date, rule, examScheduleDays);

    if (availableMinutes > 0) {
      days.push({ date, availableMinutes });
    }

    current = addDays(current, 1);
  }

  return days;
}
