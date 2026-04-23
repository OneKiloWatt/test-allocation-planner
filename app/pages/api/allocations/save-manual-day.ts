import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import {
  availabilityRuleDbSchema,
  dailyPlanDbSchema,
  examDbSchema,
  examSubjectDbSchema,
  studyPlanDbSchema,
  type DailyPlan,
} from "@/lib/schemas";
import { formatDateToString, generateUuid } from "@/lib/utils";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const requestBodySchema = z.object({
  examId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  expectedVersion: z.number().int().min(1),
  manualRows: z.array(
    z.object({
      examSubjectId: z.string().uuid(),
      plannedMinutes: z.number().int().min(0),
    }),
  ),
});

type DayPlanItem = {
  date: string;
  examSubjectId: string;
  subjectName: string;
  plannedMinutes: number;
  source: "auto" | "manual";
  displayOrder: number;
};

type Warning = { code: string; message: string };

type SaveManualDayResponse = {
  ok: true;
  exam: { id: string; status: string; version: number };
  dayPlans: DayPlanItem[];
  warnings: Warning[];
};

type ErrorResponse = { error: { code: string; message: string } };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SaveManualDayResponse | ErrorResponse>,
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

  const { examId, date, expectedVersion, manualRows } = bodyParse.data;

  // Verify ownership and version
  const { data: examData, error: examError } = await client
    .from("exams")
    .select("*")
    .eq("id", examId)
    .maybeSingle();

  if (examError != null) {
    return res.status(500).json({ error: { code: "fetch_error", message: examError.message } });
  }
  if (examData == null) {
    return res.status(403).json({ error: { code: "forbidden", message: "テストが見つかりません" } });
  }

  const examParse = examDbSchema.safeParse(examData);
  if (!examParse.success) {
    return res.status(500).json({ error: { code: "parse_error", message: "テストデータの形式が不正です" } });
  }
  const exam = examParse.data;

  if (exam.version !== expectedVersion) {
    return res.status(409).json({
      error: { code: "version_conflict", message: "他の操作が先に保存されました。最新の内容を読み直してください。" },
    });
  }

  // Verify all examSubjectIds belong to this exam
  if (manualRows.length > 0) {
    const { data: subjectsData } = await client
      .from("exam_subjects")
      .select("id")
      .eq("exam_id", examId)
      .in("id", manualRows.map((r) => r.examSubjectId));

    const subjectsParse = z.array(examSubjectDbSchema.pick({ id: true })).safeParse(subjectsData ?? []);
    if (!subjectsParse.success || subjectsParse.data.length !== new Set(manualRows.map((r) => r.examSubjectId)).size) {
      return res.status(409).json({
        error: { code: "subject_mismatch", message: "科目がこのテストに属していません" },
      });
    }
  }

  // Delete existing manual rows for this date
  const { error: delManualError } = await client
    .from("daily_plans")
    .delete()
    .eq("exam_id", examId)
    .eq("date", date)
    .eq("source", "manual");

  if (delManualError != null) {
    return res.status(500).json({ error: { code: "save_error", message: delManualError.message } });
  }

  // Delete conflicting auto rows for same (exam_id, exam_subject_id, date)
  if (manualRows.length > 0) {
    const { error: delAutoError } = await client
      .from("daily_plans")
      .delete()
      .eq("exam_id", examId)
      .eq("date", date)
      .eq("source", "auto")
      .in("exam_subject_id", manualRows.map((r) => r.examSubjectId));

    if (delAutoError != null) {
      return res.status(500).json({ error: { code: "save_error", message: delAutoError.message } });
    }
  }

  // Insert new manual rows
  const now = new Date().toISOString();
  const insertedPlans: DailyPlan[] = [];

  if (manualRows.length > 0) {
    const newRows = manualRows.map((row, index) => ({
      id: generateUuid(),
      exam_id: examId,
      exam_subject_id: row.examSubjectId,
      date,
      planned_minutes: row.plannedMinutes,
      source: "manual" as const,
      display_order: index + 1,
      created_at: now,
      updated_at: now,
    }));

    const { data: insertedData, error: insError } = await client
      .from("daily_plans")
      .insert(newRows)
      .select();

    if (insError != null) {
      return res.status(500).json({ error: { code: "save_error", message: insError.message } });
    }

    const parsedInserted = z.array(dailyPlanDbSchema).safeParse(insertedData ?? []);
    if (parsedInserted.success) {
      insertedPlans.push(...parsedInserted.data);
    }
  }

  // Check planning -> active
  const today = formatDateToString(new Date());
  const { data: dailyPlanCountData } = await client
    .from("daily_plans")
    .select("id", { count: "exact", head: true })
    .eq("exam_id", examId);

  const hasDailyPlans = (dailyPlanCountData as unknown as { count?: number } | null)?.count != null
    ? true
    : manualRows.length > 0;

  let newStatus = exam.status;
  if (exam.status === "planning" && hasDailyPlans && exam.end_date >= today) {
    newStatus = "active";
  }

  const newVersion = exam.version + 1;

  const { error: updateError } = await client
    .from("exams")
    .update({ status: newStatus, version: newVersion, updated_at: now })
    .eq("id", examId)
    .eq("version", exam.version);

  if (updateError != null) {
    return res.status(500).json({ error: { code: "save_error", message: updateError.message } });
  }

  // Build warnings
  const warnings: Warning[] = [];

  // subject_over_allocated: check if any subject's total planned > study_plan
  if (manualRows.length > 0) {
    const { data: spData } = await client
      .from("study_plans")
      .select("*")
      .in("exam_subject_id", manualRows.map((r) => r.examSubjectId));

    const spParse = z.array(studyPlanDbSchema).safeParse(spData ?? []);

    if (spParse.success) {
      const { data: allDpData } = await client
        .from("daily_plans")
        .select("exam_subject_id, planned_minutes")
        .eq("exam_id", examId);

      const loggedBySubject = new Map<string, number>();
      for (const dp of (allDpData ?? []) as Array<{ exam_subject_id: string; planned_minutes: number }>) {
        loggedBySubject.set(
          dp.exam_subject_id,
          (loggedBySubject.get(dp.exam_subject_id) ?? 0) + dp.planned_minutes,
        );
      }

      for (const sp of spParse.data) {
        const total = loggedBySubject.get(sp.exam_subject_id) ?? 0;
        if (total > sp.planned_minutes) {
          warnings.push({
            code: "subject_over_allocated",
            message: "手動入力が必要総時間を超えている科目があります",
          });
          break;
        }
      }
    }

    // daily_capacity_exceeded: check against availability_rule
    const { data: ruleData } = await client
      .from("availability_rules")
      .select("*")
      .eq("exam_id", examId)
      .maybeSingle();

    if (ruleData != null) {
      const ruleParse = availabilityRuleDbSchema.safeParse(ruleData);
      if (ruleParse.success) {
        const dateObj = new Date(date);
        const weekday = dateObj.getDay();
        const isWeekend = weekday === 0 || weekday === 6;
        const isClubDay = !isWeekend && ruleParse.data.club_days.some(
          (d) => ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][weekday] === d,
        );

        const capacity = isWeekend
          ? ruleParse.data.weekend_minutes
          : isClubDay
            ? ruleParse.data.weekday_club_minutes
            : ruleParse.data.weekday_no_club_minutes;

        const totalForDay = manualRows.reduce((sum, r) => sum + r.plannedMinutes, 0);
        if (totalForDay > capacity) {
          warnings.push({
            code: "daily_capacity_exceeded",
            message: "この日の勉強時間が設定した上限を超えています",
          });
        }
      }
    }
  }

  // Fetch subject names for response
  const subjectNameMap = new Map<string, string>();
  if (insertedPlans.length > 0) {
    const { data: subjectData } = await client
      .from("exam_subjects")
      .select("id, subject_name")
      .in("id", insertedPlans.map((p) => p.exam_subject_id));

    for (const s of (subjectData ?? []) as Array<{ id: string; subject_name: string }>) {
      subjectNameMap.set(s.id, s.subject_name);
    }
  }

  const dayPlans: DayPlanItem[] = insertedPlans.map((p) => ({
    date: p.date,
    examSubjectId: p.exam_subject_id,
    subjectName: subjectNameMap.get(p.exam_subject_id) ?? "",
    plannedMinutes: p.planned_minutes,
    source: p.source,
    displayOrder: p.display_order,
  }));

  return res.status(200).json({
    ok: true,
    exam: { id: examId, status: newStatus, version: newVersion },
    dayPlans,
    warnings,
  });
}
