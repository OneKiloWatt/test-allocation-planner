import { describe, expect, it } from "vitest";

import type { ProgressLog } from "@/lib/schemas";

import {
  calculateProgressSummary,
  hasDuplicateProgressLogForDate,
} from "../progress-log";

const now = "2026-04-23T12:00:00+09:00";

function progressLog(overrides: Partial<ProgressLog> = {}): ProgressLog {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    exam_id: "22222222-2222-4222-8222-222222222222",
    exam_subject_id: "33333333-3333-4333-8333-333333333333",
    logged_minutes: 30,
    memo: null,
    logged_date: "2026-04-23",
    logged_at: now,
    created_at: now,
    ...overrides,
  };
}

describe("hasDuplicateProgressLogForDate", () => {
  it("returns true when the same subject is already recorded on the same date", () => {
    const logs = [progressLog()];

    expect(
      hasDuplicateProgressLogForDate(
        logs,
        "33333333-3333-4333-8333-333333333333",
        "2026-04-23",
      ),
    ).toBe(true);
  });

  it("returns false when the record exists on a different date or subject", () => {
    const logs = [
      progressLog(),
      progressLog({
        id: "44444444-4444-4444-8444-444444444444",
        exam_subject_id: "55555555-5555-4555-8555-555555555555",
        logged_date: "2026-04-24",
      }),
    ];

    expect(
      hasDuplicateProgressLogForDate(
        logs,
        "33333333-3333-4333-8333-333333333333",
        "2026-04-24",
      ),
    ).toBe(false);
    expect(
      hasDuplicateProgressLogForDate(
        logs,
        "55555555-5555-4555-8555-555555555555",
        "2026-04-23",
      ),
    ).toBe(false);
  });
});

describe("calculateProgressSummary", () => {
  it("sums minutes for the selected subject only", () => {
    const summary = calculateProgressSummary(
      [
        progressLog({ logged_minutes: 40 }),
        progressLog({
          id: "44444444-4444-4444-8444-444444444444",
          logged_minutes: 25,
        }),
        progressLog({
          id: "55555555-5555-4555-8555-555555555555",
          exam_subject_id: "66666666-6666-4666-8666-666666666666",
          logged_minutes: 90,
        }),
      ],
      "33333333-3333-4333-8333-333333333333",
      100,
    );

    expect(summary).toEqual({
      actualMinutes: 65,
      remainingMinutes: 35,
      progressPercent: 65,
    });
  });

  it("caps remaining minutes at zero and progress at one hundred percent", () => {
    const summary = calculateProgressSummary(
      [progressLog({ logged_minutes: 150 })],
      "33333333-3333-4333-8333-333333333333",
      100,
    );

    expect(summary).toEqual({
      actualMinutes: 150,
      remainingMinutes: 0,
      progressPercent: 100,
    });
  });

  it("returns null summary fields when the target is unavailable", () => {
    const summary = calculateProgressSummary(
      [progressLog({ logged_minutes: 45 })],
      "33333333-3333-4333-8333-333333333333",
      null,
    );

    expect(summary).toEqual({
      actualMinutes: 45,
      remainingMinutes: null,
      progressPercent: null,
    });
  });
});
