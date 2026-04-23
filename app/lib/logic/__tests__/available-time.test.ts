import { describe, expect, it } from "vitest";

import type { AvailabilityRule } from "../../schemas";
import { getDailyAvailableMinutes } from "../available-time";

const baseRule: AvailabilityRule = {
  id: "11111111-1111-4111-8111-111111111111",
  exam_id: "22222222-2222-4222-8222-222222222222",
  weekday_club_minutes: 60,
  weekday_no_club_minutes: 120,
  weekend_minutes: 180,
  club_days: ["mon", "wed"],
  pre_exam_rest_mode: false,
  study_start_date: "2024-09-01",
  created_at: "2024-09-01T00:00:00+09:00",
  updated_at: "2024-09-01T00:00:00+09:00",
};

describe("getDailyAvailableMinutes", () => {
  it("returns weekend minutes on saturday", () => {
    expect(getDailyAvailableMinutes("2024-09-07", baseRule, [])).toBe(180);
  });

  it("returns club minutes on a weekday club day", () => {
    expect(getDailyAvailableMinutes("2024-09-02", baseRule, [])).toBe(60);
  });

  it("returns no-club minutes on a non-club weekday", () => {
    expect(getDailyAvailableMinutes("2024-09-03", baseRule, [])).toBe(120);
  });

  it("returns zero on an exam day", () => {
    expect(getDailyAvailableMinutes("2024-09-03", baseRule, ["2024-09-03"])).toBe(0);
  });

  it("uses no-club minutes for club days within seven days when rest mode is on", () => {
    const rule: AvailabilityRule = { ...baseRule, pre_exam_rest_mode: true };

    expect(getDailyAvailableMinutes("2024-09-09", rule, ["2024-09-10"])).toBe(120);
  });
});
