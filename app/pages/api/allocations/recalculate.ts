import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { addDays, format, parseISO } from "date-fns";
import { z } from "zod";

import {
  availabilityRuleDbSchema,
  dailyPlanDbSchema,
  examDbSchema,
  examSubjectDbSchema,
  progressLogDbSchema,
  studyPlanDbSchema,
  type DailyPlan,
  type StudyPlan,
} from "@/lib/schemas";
import { assignToDays } from "@/lib/logic/daily-planner";
import { getDailyAvailableMinutes, getStudyDays } from "@/lib/logic/available-time";
import { calculateShares, minutesFromShares } from "@/lib/logic/share";
import { calculateWeight } from "@/lib/logic/weight";
import { formatDateToString, generateUuid } from "@/lib/utils";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const requestBodySchema = z.object({
  examId: z.string().uuid(),
  expectedVersion: z.number().int().min(1),
});

type Warning = { code: string; message: string };

type RecalculateResponse = {
  ok: true;
  exam: { id: string; status: string; version: number };
  studyPlans: StudyPlan[];
  dailyPlans: DailyPlan[];
  warnings: Warning[];
};

type ErrorResponse = { error: { code: string; message: string } };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RecalculateResponse | ErrorResponse>,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: { code: "method_not_allowed", message: "POST のみ許可されています" } });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: { code: "unauthorized", message: "Bearer token が必要です" } });
  }
  const token = authHeader.slice(7);

  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(500).json({ error: { code: "server_error", message: "Supabase が設定されていません" } });
  }

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });

  const { data: { user }, error: authError } = await client.auth.getUser(token);
  if (authError != null || user == null) {
    return res.status(401).json({ error: { code: "unauthorized", message: "トークンが無効です" } });
  }

  const bodyParse = requestBodySchema.safeParse(req.body);
  if (!bodyParse.success) {
    return res.status(400).json({ error: { code: "invalid_request", message: "リクエストの形式が不正です" } });
  }

  const { examId, expectedVersion } = bodyParse.data;

  const { data: examData, error: examError } = await client
    .from("exams")
    .select("*")
    .eq("id", examId)
    .maybeSingle();

  if (examError != null) {
    return res.status(500).json({ error: { code: "fetch_error", message: examError.message } });
  }

  if (examData == null) {
    return res.status(404).json({ error: { code: "not_found", message: "テストが見つかりません" } });
  }

  const examParse = examDbSchema.safeParse(examData);
  if (!examParse.success) {
    return res.status(500).json({ error: { code: "parse_error", message: "テストデータの形式が不正です" } });
  }

  const exam = examParse.data;

  if (exam.user_id !== user.id) {
    return res.status(403).json({ error: { code: "forbidden", message: "このテストを操作する権限がありません" } });
  }

  if (exam.version !== expectedVersion) {
    return res.status(409).json({
      error: { code: "version_conflict", message: "他の操作が先に保存されました。最新の内容を読み直してください。" },
    });
  }

  const { data: ruleData, error: ruleError } = await client
    .from("availability_rules")
    .select("*")
    .eq("exam_id", examId)
    .maybeSingle();

  if (ruleError != null) {
    return res.status(500).json({ error: { code: "fetch_error", message: ruleError.message } });
  }

  if (ruleData == null) {
    return res.status(409).json({
      error: { code: "missing_rule", message: "再計算に必要な予定設定がまだ保存されていません" },
    });
  }

  const ruleParse = availabilityRuleDbSchema.safeParse(ruleData);
  if (!ruleParse.success) {
    return res.status(500).json({ error: { code: "parse_error", message: "予定設定データの形式が不正です" } });
  }

  const rule = ruleParse.data;

  const [{ data: subjectsData, error: subjectsError }, { data: progressLogsData, error: progressLogsError }, { data: manualPlansData, error: manualPlansError }] = await Promise.all([
    client.from("exam_subjects").select("*").eq("exam_id", examId).order("display_order", { ascending: true }),
    client.from("progress_logs").select("*").eq("exam_id", examId),
    client.from("daily_plans").select("*").eq("exam_id", examId).eq("source", "manual").order("date", { ascending: true }).order("display_order", { ascending: true }),
  ]);

  if (subjectsError != null || progressLogsError != null || manualPlansError != null) {
    return res.status(500).json({
      error: {
        code: "fetch_error",
        message: subjectsError?.message ?? progressLogsError?.message ?? manualPlansError?.message ?? "再計算に必要なデータを取得できませんでした",
      },
    });
  }

  const subjectsParse = z.array(examSubjectDbSchema).safeParse(subjectsData ?? []);
  const progressLogsParse = z.array(progressLogDbSchema).safeParse(progressLogsData ?? []);
  const manualPlansParse = z.array(dailyPlanDbSchema).safeParse(manualPlansData ?? []);

  if (!subjectsParse.success || !progressLogsParse.success || !manualPlansParse.success) {
    return res.status(500).json({ error: { code: "parse_error", message: "再計算に必要なデータの形式が不正です" } });
  }

  const subjects = subjectsParse.data;
  const progressLogs = progressLogsParse.data;
  const manualPlans = manualPlansParse.data;

  const now = new Date().toISOString();
  const today = formatDateToString(new Date());
  const studyStartDate = rule.study_start_date > today ? rule.study_start_date : today;
  const endDate = format(addDays(parseISO(exam.start_date), -1), "yyyy-MM-dd");
  const examScheduleDays = (exam.schedule_days ?? []).map((day) => day.date);

  const loggedMinutesBySubject = new Map<string, number>();
  for (const progressLog of progressLogs) {
    loggedMinutesBySubject.set(
      progressLog.exam_subject_id,
      (loggedMinutesBySubject.get(progressLog.exam_subject_id) ?? 0) + progressLog.logged_minutes,
    );
  }

  const manualFuturePlans = manualPlans.filter((plan) => plan.date >= studyStartDate);
  const manualFutureMinutesBySubject = new Map<string, number>();
  const manualFutureMinutesByDate = new Map<string, number>();

  for (const plan of manualFuturePlans) {
    manualFutureMinutesBySubject.set(
      plan.exam_subject_id,
      (manualFutureMinutesBySubject.get(plan.exam_subject_id) ?? 0) + plan.planned_minutes,
    );
    manualFutureMinutesByDate.set(
      plan.date,
      (manualFutureMinutesByDate.get(plan.date) ?? 0) + plan.planned_minutes,
    );
  }

  const futureStudyDays = getStudyDays(studyStartDate, endDate, rule, examScheduleDays);
  const autoStudyDays = futureStudyDays
    .map((day) => ({
      date: day.date,
      availableMinutes: Math.max(0, day.availableMinutes - (manualFutureMinutesByDate.get(day.date) ?? 0)),
    }))
    .filter((day) => day.availableMinutes >= 10);

  const warnings: Warning[] = [];

  if (manualFuturePlans.length > 0) {
    const hasDailyCapacityExceeded = manualFuturePlans.some((plan) => {
      const totalForDay = manualFutureMinutesByDate.get(plan.date) ?? 0;
      const capacity = getDailyAvailableMinutes(plan.date, rule, examScheduleDays);
      return totalForDay > capacity;
    });

    if (hasDailyCapacityExceeded) {
      warnings.push({
        code: "daily_capacity_exceeded",
        message: "手動入力により、1日の勉強時間が設定上限を超えている日があります",
      });
    }
  }

  const weightInputs = subjects.map((subject) =>
    calculateWeight(
      subject.target_score,
      subject.previous_score,
      (subject.previous_study_minutes ?? 0)
        + (loggedMinutesBySubject.get(subject.id) ?? 0)
        + (manualFutureMinutesBySubject.get(subject.id) ?? 0),
    ),
  );

  const totalAutoMinutes = autoStudyDays.reduce((sum, day) => sum + day.availableMinutes, 0);
  const autoMinutesBySubject = new Map<string, number>();
  let autoDailyPlans: DailyPlan[] = [];

  if (subjects.length > 0 && autoStudyDays.length > 0 && totalAutoMinutes > 0) {
    const shares = calculateShares(weightInputs);
    const plannedMinutesArr = minutesFromShares(totalAutoMinutes, shares);
    const subjectPlans = subjects.map((subject, index) => ({
      examSubjectId: subject.id,
      plannedMinutes: Math.max(0, plannedMinutesArr[index] ?? 0),
      weight: weightInputs[index] ?? 0,
    })).filter((subject) => subject.plannedMinutes >= 10);

    autoDailyPlans = assignToDays(subjectPlans, autoStudyDays, examId).map((plan) => ({
      ...plan,
      created_at: now,
      updated_at: now,
    }));

    for (const plan of autoDailyPlans) {
      autoMinutesBySubject.set(
        plan.exam_subject_id,
        (autoMinutesBySubject.get(plan.exam_subject_id) ?? 0) + plan.planned_minutes,
      );
    }
  }

  const futureCapacity = futureStudyDays.reduce((sum, day) => sum + day.availableMinutes, 0);
  if (manualFuturePlans.length > 0 && subjects.length > 0 && futureCapacity > 0) {
    const baselineShares = calculateShares(
      subjects.map((subject) =>
        calculateWeight(
          subject.target_score,
          subject.previous_score,
          (subject.previous_study_minutes ?? 0) + (loggedMinutesBySubject.get(subject.id) ?? 0),
        ),
      ),
    );
    const baselineMinutesArr = minutesFromShares(futureCapacity, baselineShares);
    const hasManualOverAllocation = subjects.some((subject, index) => {
      const manualMinutes = manualFutureMinutesBySubject.get(subject.id) ?? 0;
      const baselineMinutes = baselineMinutesArr[index] ?? 0;
      return manualMinutes > baselineMinutes && baselineMinutes > 0;
    });

    if (hasManualOverAllocation) {
      warnings.push({
        code: "subject_over_allocated",
        message: "手動入力が一部科目のおすすめ配分を上回っています",
      });
    }
  }

  const studyPlanTotals = subjects
    .map((subject) => {
      const total = (loggedMinutesBySubject.get(subject.id) ?? 0)
        + (manualFutureMinutesBySubject.get(subject.id) ?? 0)
        + (autoMinutesBySubject.get(subject.id) ?? 0);
      return {
        subjectId: subject.id,
        plannedMinutes: total > 0 && total < 10 ? 10 : total,
      };
    })
    .filter((row) => row.plannedMinutes >= 10);

  const plannedTotalMinutes = studyPlanTotals.reduce((sum, row) => sum + row.plannedMinutes, 0);
  const studyPlans: StudyPlan[] = studyPlanTotals.map((row) => ({
    id: generateUuid(),
    exam_subject_id: row.subjectId,
    planned_minutes: row.plannedMinutes,
    planned_ratio: plannedTotalMinutes === 0 ? 0 : Math.round((row.plannedMinutes / plannedTotalMinutes) * 10000) / 10000,
    reason: null,
    created_at: now,
    updated_at: now,
  }));

  const subjectIds = subjects.map((subject) => subject.id);

  if (subjectIds.length > 0) {
    const { error: deleteStudyPlansError } = await client
      .from("study_plans")
      .delete()
      .in("exam_subject_id", subjectIds);

    if (deleteStudyPlansError != null) {
      return res.status(500).json({ error: { code: "save_error", message: deleteStudyPlansError.message } });
    }
  }

  if (studyPlans.length > 0) {
    const { error: insertStudyPlansError } = await client.from("study_plans").insert(studyPlans);
    if (insertStudyPlansError != null) {
      return res.status(500).json({ error: { code: "save_error", message: insertStudyPlansError.message } });
    }
  }

  const { error: deleteAutoPlansError } = await client
    .from("daily_plans")
    .delete()
    .eq("exam_id", examId)
    .eq("source", "auto");

  if (deleteAutoPlansError != null) {
    return res.status(500).json({ error: { code: "save_error", message: deleteAutoPlansError.message } });
  }

  if (autoDailyPlans.length > 0) {
    const { error: insertAutoPlansError } = await client.from("daily_plans").insert(autoDailyPlans);
    if (insertAutoPlansError != null) {
      return res.status(500).json({ error: { code: "save_error", message: insertAutoPlansError.message } });
    }
  }

  let newStatus = exam.status;
  if (exam.status === "planning" && exam.end_date >= today && manualPlans.length + autoDailyPlans.length > 0) {
    newStatus = "active";
  }

  const newVersion = exam.version + 1;
  const { data: updatedExamRows, error: updateExamError } = await client
    .from("exams")
    .update({ status: newStatus, version: newVersion, updated_at: now })
    .eq("id", examId)
    .eq("version", exam.version)
    .select("id");

  if (updateExamError != null) {
    return res.status(500).json({ error: { code: "save_error", message: updateExamError.message } });
  }

  if ((updatedExamRows ?? []).length === 0) {
    return res.status(409).json({
      error: { code: "version_conflict", message: "他の操作が先に保存されました。最新の内容を読み直してください。" },
    });
  }

  return res.status(200).json({
    ok: true,
    exam: { id: examId, status: newStatus, version: newVersion },
    studyPlans: z.array(studyPlanDbSchema).parse(studyPlans),
    dailyPlans: z.array(dailyPlanDbSchema).parse(
      [...manualPlans, ...autoDailyPlans].sort((left, right) => {
        if (left.date !== right.date) {
          return left.date.localeCompare(right.date);
        }
        return left.display_order - right.display_order;
      }),
    ),
    warnings,
  });
}
