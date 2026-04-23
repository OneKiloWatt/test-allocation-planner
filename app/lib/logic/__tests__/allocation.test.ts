import { describe, expect, it } from "vitest";

import type { AvailabilityRule, Exam, ExamSubject } from "../../schemas";
import { allocate } from "../allocation";

const rule: AvailabilityRule = {
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

const baseExam: Exam = {
  id: "22222222-2222-4222-8222-222222222222",
  user_id: "33333333-3333-4333-8333-333333333333",
  version: 1,
  name: "Midterm",
  term_type: "midterm",
  start_date: "2024-09-04",
  end_date: "2024-09-05",
  status: "planning",
  planning_mode: "auto",
  schedule_days: [{ date: "2024-09-04", subjects: ["math"] }],
  created_at: "2024-09-01T00:00:00+09:00",
  updated_at: "2024-09-01T00:00:00+09:00",
};

const subject = (id: string, targetScore: number, previousScore = 50): ExamSubject => ({
  id,
  exam_id: baseExam.id,
  subject_id: id,
  subject_name: id,
  normalized_name: id,
  previous_score: previousScore,
  previous_study_minutes: 60,
  target_score: targetScore,
  display_order: 1,
  created_at: "2024-09-01T00:00:00+09:00",
  updated_at: "2024-09-01T00:00:00+09:00",
});

describe("allocate", () => {
  it("returns an empty array when subjects are empty", () => {
    expect(allocate([], rule, baseExam)).toEqual([]);
  });

  it("returns an empty array when there are no study days", () => {
    const noStudyRule: AvailabilityRule = {
      ...rule,
      study_start_date: "2024-09-05",
    };

    expect(allocate([subject("math", 80)], noStudyRule, baseExam)).toEqual([]);
  });

  it("creates one daily plan for one subject and one day", () => {
    const oneDayExam: Exam = {
      ...baseExam,
      start_date: "2024-09-02",
      end_date: "2024-09-02",
      schedule_days: [{ date: "2024-09-02", subjects: ["math"] }],
    };

    const result = allocate([subject("math", 80)], rule, oneDayExam);

    expect(result).toHaveLength(1);
    expect(result[0]?.exam_id).toBe(oneDayExam.id);
  });

  it("creates multiple plans for two subjects across three days", () => {
    const multiDayExam: Exam = {
      ...baseExam,
      start_date: "2024-09-04",
      end_date: "2024-09-04",
      schedule_days: [{ date: "2024-09-04", subjects: ["math", "english"] }],
    };

    const result = allocate(
      [subject("math", 90, 40), subject("english", 80, 60)],
      rule,
      multiDayExam,
    );

    expect(result.length).toBeGreaterThan(1);
    expect(new Set(result.map((plan) => plan.date)).size).toBeGreaterThanOrEqual(1);
  });
});
