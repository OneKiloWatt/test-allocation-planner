import { describe, expect, it } from "vitest";

import type { DailyPlan, Exam, ExamResult, ExamSubject, ProgressLog, StudyPlan } from "@/lib/schemas";

import { buildHomeViewState } from "../home-view";

const now = "2026-04-23T12:00:00+09:00";
const today = "2026-04-23";

function exam(overrides: Partial<Exam> = {}): Exam {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    user_id: "99999999-9999-4999-8999-999999999999",
    version: 1,
    name: "中間テスト",
    term_type: "midterm",
    start_date: "2026-04-25",
    end_date: "2026-04-26",
    status: "planning",
    planning_mode: "manual",
    schedule_days: null,
    created_at: "2026-04-01T09:00:00+09:00",
    updated_at: "2026-04-01T09:00:00+09:00",
    ...overrides,
  };
}

function subject(overrides: Partial<ExamSubject> = {}): ExamSubject {
  return {
    id: "22222222-2222-4222-8222-222222222222",
    exam_id: "11111111-1111-4111-8111-111111111111",
    subject_id: "math",
    subject_name: "数学",
    normalized_name: "数学",
    previous_score: 60,
    previous_study_minutes: 120,
    target_score: 80,
    display_order: 1,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

function dailyPlan(overrides: Partial<DailyPlan> = {}): DailyPlan {
  return {
    id: "33333333-3333-4333-8333-333333333333",
    exam_id: "11111111-1111-4111-8111-111111111111",
    exam_subject_id: "22222222-2222-4222-8222-222222222222",
    date: today,
    planned_minutes: 30,
    source: "manual",
    display_order: 1,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

function result(overrides: Partial<ExamResult> = {}): ExamResult {
  return {
    id: "44444444-4444-4444-8444-444444444444",
    exam_subject_id: "22222222-2222-4222-8222-222222222222",
    actual_score: 78,
    actual_study_minutes: 100,
    note: null,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

function build(params: {
  exams: Exam[];
  subjects?: ExamSubject[];
  studyPlans?: StudyPlan[];
  dailyPlans?: DailyPlan[];
  progressLogs?: ProgressLog[];
  examResults?: ExamResult[];
}) {
  return buildHomeViewState({
    exams: params.exams,
    subjects: params.subjects ?? [],
    studyPlans: params.studyPlans ?? [],
    dailyPlans: params.dailyPlans ?? [],
    progressLogs: params.progressLogs ?? [],
    examResults: params.examResults ?? [],
    today,
    now,
  });
}

describe("buildHomeViewState", () => {
  it("promotes a planning exam with daily plans to active before display selection", () => {
    const planningExam = exam();

    const resolved = build({
      exams: [planningExam],
      subjects: [subject()],
      dailyPlans: [dailyPlan()],
    });

    expect(resolved.examsToPersist).toHaveLength(1);
    expect(resolved.examsToPersist[0]).toMatchObject({
      id: planningExam.id,
      status: "active",
      version: planningExam.version + 1,
      updated_at: now,
    });
    expect(resolved.viewState.activeExam?.id).toBe(planningExam.id);
    expect(resolved.viewState.planningExam).toBeNull();
    expect(resolved.viewState.displayExamId).toBe(planningExam.id);
  });

  it("marks a past exam as finished even if its stored status is not finished", () => {
    const pastExam = exam({
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      end_date: "2026-04-20",
      status: "active",
    });

    const resolved = build({
      exams: [pastExam],
      subjects: [subject({ exam_id: pastExam.id })],
    });

    expect(resolved.examsToPersist).toHaveLength(1);
    expect(resolved.examsToPersist[0]).toMatchObject({
      id: pastExam.id,
      status: "finished",
      version: pastExam.version + 1,
      updated_at: now,
    });
    expect(resolved.viewState.finishedPendingExam?.id).toBe(pastExam.id);
    expect(resolved.viewState.activeExam).toBeNull();
  });

  it("keeps finished-pending content available while preferring active exam id for navigation state", () => {
    const finishedExam = exam({
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      status: "finished",
      end_date: "2026-04-20",
      created_at: "2026-04-22T09:00:00+09:00",
    });
    const activeExam = exam({
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      status: "active",
      created_at: "2026-04-21T09:00:00+09:00",
    });

    const resolved = build({
      exams: [finishedExam, activeExam],
      subjects: [
        subject({ id: "11111111-2222-4333-8444-555555555555", exam_id: finishedExam.id }),
        subject({ id: "66666666-7777-4888-8999-000000000000", exam_id: activeExam.id }),
      ],
    });

    expect(resolved.viewState.finishedPendingExam?.id).toBe(finishedExam.id);
    expect(resolved.viewState.activeExam?.id).toBe(activeExam.id);
    expect(resolved.viewState.displayExamId).toBe(activeExam.id);
  });

  it("prefers planning exam id over finished-pending when no active exam exists", () => {
    const finishedExam = exam({
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      status: "finished",
      end_date: "2026-04-20",
      created_at: "2026-04-22T09:00:00+09:00",
    });
    const planningExam = exam({
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      created_at: "2026-04-21T09:00:00+09:00",
    });

    const resolved = build({
      exams: [finishedExam, planningExam],
      subjects: [
        subject({ id: "11111111-2222-4333-8444-555555555555", exam_id: finishedExam.id }),
        subject({ id: "66666666-7777-4888-8999-000000000000", exam_id: planningExam.id }),
      ],
    });

    expect(resolved.viewState.finishedPendingExam?.id).toBe(finishedExam.id);
    expect(resolved.viewState.planningExam?.id).toBe(planningExam.id);
    expect(resolved.viewState.displayExamId).toBe(planningExam.id);
  });

  it("treats a finished exam with recorded results as no longer pending", () => {
    const finishedExam = exam({
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      status: "finished",
      end_date: "2026-04-20",
    });
    const finishedSubject = subject({
      id: "11111111-2222-4333-8444-555555555555",
      exam_id: finishedExam.id,
    });

    const resolved = build({
      exams: [finishedExam],
      subjects: [finishedSubject],
      examResults: [result({ exam_subject_id: finishedSubject.id })],
    });

    expect(resolved.viewState.finishedPendingExam).toBeNull();
    expect(resolved.viewState.displayExamId).toBeNull();
  });
});
