import { parseISO } from "date-fns";

import type { DailyPlan, ExamSubject } from "@/lib/schemas";

const SUBJECT_COLORS = [
  "hsl(22, 65%, 52%)",
  "hsl(200, 40%, 50%)",
  "hsl(150, 30%, 45%)",
  "hsl(340, 30%, 55%)",
  "hsl(45, 40%, 50%)",
] as const;

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"] as const;

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}分`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}時間${m}分` : `${h}時間`;
}

export function formatDate(dateStr: string): string {
  const d = parseISO(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}(${WEEKDAY_LABELS[d.getDay()]})`;
}

export function getSubjectColor(subject: ExamSubject) {
  return SUBJECT_COLORS[(subject.display_order - 1) % SUBJECT_COLORS.length];
}

export function groupDailyPlansByDate(dailyPlans: DailyPlan[]) {
  const grouped = new Map<string, DailyPlan[]>();

  for (const dailyPlan of dailyPlans) {
    const items = grouped.get(dailyPlan.date) ?? [];
    items.push(dailyPlan);
    grouped.set(dailyPlan.date, items);
  }

  return Array.from(grouped.entries()).sort(([left], [right]) => left.localeCompare(right));
}
