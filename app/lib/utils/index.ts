import { clsx, type ClassValue } from "clsx";
import { differenceInCalendarDays, format, isValid, parseISO, startOfDay } from "date-fns";
import { twMerge } from "tailwind-merge";

import type { Weekday } from "@/lib/schemas";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateUuid() {
  return crypto.randomUUID();
}

export function normalizeSubjectName(value: string) {
  return value.normalize("NFKC").trim().toLowerCase().replace(/\s+/g, "");
}

function ensureValidDate(value: Date, label: string) {
  if (!isValid(value)) {
    throw new RangeError(`Invalid ${label}`);
  }

  return value;
}

export function parseDateString(value: string) {
  return ensureValidDate(parseISO(value), "date string");
}

export function formatDateToString(value: Date) {
  return format(ensureValidDate(value, "date"), "yyyy-MM-dd");
}

export function getDaysUntilExamStart(examStartDate: string | Date, baseDate: string | Date = new Date()) {
  const targetDate =
    typeof examStartDate === "string"
      ? parseDateString(examStartDate)
      : ensureValidDate(examStartDate, "exam start date");
  const today =
    typeof baseDate === "string"
      ? parseDateString(baseDate)
      : ensureValidDate(baseDate, "base date");

  return differenceInCalendarDays(startOfDay(targetDate), startOfDay(today));
}

export function getWeekday(value: string | Date): Weekday {
  const date =
    typeof value === "string" ? parseDateString(value) : ensureValidDate(value, "date");
  const weekday = date.getDay();

  switch (weekday) {
    case 0:
      return "sun";
    case 1:
      return "mon";
    case 2:
      return "tue";
    case 3:
      return "wed";
    case 4:
      return "thu";
    case 5:
      return "fri";
    default:
      return "sat";
  }
}
