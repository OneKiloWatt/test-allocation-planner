import { describe, expect, it } from "vitest";

import type { DailyPlan, ExamSubject } from "@/lib/schemas";

import {
  formatDate,
  formatMinutes,
  getSubjectColor,
  groupDailyPlansByDate,
} from "../daily-plan-view";

const baseSubject: ExamSubject = {
  id: "11111111-1111-4111-8111-111111111111",
  exam_id: "22222222-2222-4222-8222-222222222222",
  subject_id: "math",
  subject_name: "数学",
  normalized_name: "数学",
  previous_score: 60,
  previous_study_minutes: 90,
  target_score: 80,
  display_order: 1,
  created_at: "2024-09-01T00:00:00+09:00",
  updated_at: "2024-09-01T00:00:00+09:00",
};

const plan = (overrides: Partial<DailyPlan>): DailyPlan => ({
  id: "33333333-3333-4333-8333-333333333333",
  exam_id: "22222222-2222-4222-8222-222222222222",
  exam_subject_id: "11111111-1111-4111-8111-111111111111",
  date: "2024-09-02",
  planned_minutes: 30,
  source: "auto",
  display_order: 1,
  created_at: "2024-09-01T00:00:00+09:00",
  updated_at: "2024-09-01T00:00:00+09:00",
  ...overrides,
});

describe("daily-plan view helpers", () => {
  it("formats minutes below one hour", () => {
    expect(formatMinutes(45)).toBe("45分");
  });

  it("formats whole hours and mixed hours", () => {
    expect(formatMinutes(120)).toBe("2時間");
    expect(formatMinutes(135)).toBe("2時間15分");
  });

  it("formats iso dates with japanese weekday labels", () => {
    expect(formatDate("2024-09-02")).toBe("9/2(月)");
  });

  it("cycles subject colors by display order", () => {
    expect(getSubjectColor(baseSubject)).toBe("hsl(22, 65%, 52%)");
    expect(getSubjectColor({ ...baseSubject, display_order: 6 })).toBe("hsl(22, 65%, 52%)");
  });

  it("groups daily plans by date and keeps groups sorted by date", () => {
    const grouped = groupDailyPlansByDate([
      plan({
        id: "44444444-4444-4444-8444-444444444444",
        date: "2024-09-03",
      }),
      plan({
        id: "55555555-5555-4555-8555-555555555555",
        date: "2024-09-02",
        planned_minutes: 20,
      }),
      plan({
        id: "66666666-6666-4666-8666-666666666666",
        date: "2024-09-03",
        planned_minutes: 40,
      }),
    ]);

    expect(grouped.map(([date]) => date)).toEqual(["2024-09-02", "2024-09-03"]);
    expect(grouped[1]?.[1].map((entry) => entry.planned_minutes)).toEqual([30, 40]);
  });
});
