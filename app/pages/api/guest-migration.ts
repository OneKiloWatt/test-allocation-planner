import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import {
  availabilityRuleDbSchema,
  dailyPlanDbSchema,
  examDbSchema,
  examResultDbSchema,
  examSubjectDbSchema,
  progressLogDbSchema,
  studyPlanDbSchema,
} from "@/lib/schemas";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const payloadSchema = z.object({
  exams: z.array(examDbSchema),
  examSubjects: z.array(examSubjectDbSchema),
  studyPlans: z.array(studyPlanDbSchema),
  dailyPlans: z.array(dailyPlanDbSchema),
  progressLogs: z.array(progressLogDbSchema),
  examResults: z.array(examResultDbSchema),
  availabilityRules: z.array(availabilityRuleDbSchema),
});

const requestBodySchema = z.object({
  migrationVersion: z.literal(1),
  payload: payloadSchema,
});

type MigrationResponse = {
  ok: true;
  imported: {
    exams: number;
    examSubjects: number;
    studyPlans: number;
    dailyPlans: number;
    progressLogs: number;
    examResults: number;
    availabilityRules: number;
  };
};

type ErrorResponse = { error: { code: string; message: string } };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<MigrationResponse | ErrorResponse>,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: { code: "method_not_allowed", message: "POST のみ許可されています" } });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: { code: "unauthorized", message: "Bearer token が必要です" } });
  }
  const token = authHeader.slice(7);

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    return res.status(500).json({ error: { code: "server_error", message: "Supabase が設定されていません" } });
  }

  // Verify token and get user
  const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });

  const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
  if (authError != null || user == null) {
    return res.status(401).json({ error: { code: "unauthorized", message: "トークンが無効です" } });
  }

  const uid = user.id;

  const bodyParse = requestBodySchema.safeParse(req.body);
  if (!bodyParse.success) {
    return res.status(400).json({ error: { code: "invalid_request", message: "リクエストの形式が不正です" } });
  }

  const { payload } = bodyParse.data;

  // Validate internal referential integrity of the payload
  const examIds = new Set(payload.exams.map((e) => e.id));
  const examSubjectIds = new Set(payload.examSubjects.map((s) => s.id));

  for (const s of payload.examSubjects) {
    if (!examIds.has(s.exam_id)) {
      return res.status(409).json({ error: { code: "integrity_error", message: "科目が存在しないテストを参照しています" } });
    }
  }

  for (const sp of payload.studyPlans) {
    if (!examSubjectIds.has(sp.exam_subject_id)) {
      return res.status(409).json({ error: { code: "integrity_error", message: "学習プランが存在しない科目を参照しています" } });
    }
  }

  for (const dp of payload.dailyPlans) {
    if (!examIds.has(dp.exam_id) || !examSubjectIds.has(dp.exam_subject_id)) {
      return res.status(409).json({ error: { code: "integrity_error", message: "日程プランの参照が不正です" } });
    }
  }

  for (const log of payload.progressLogs) {
    if (!examIds.has(log.exam_id) || !examSubjectIds.has(log.exam_subject_id)) {
      return res.status(409).json({ error: { code: "integrity_error", message: "進捗ログの参照が不正です" } });
    }
  }

  for (const result of payload.examResults) {
    if (!examSubjectIds.has(result.exam_subject_id)) {
      return res.status(409).json({ error: { code: "integrity_error", message: "試験結果の参照が不正です" } });
    }
  }

  for (const rule of payload.availabilityRules) {
    if (!examIds.has(rule.exam_id)) {
      return res.status(409).json({ error: { code: "integrity_error", message: "予定ルールの参照が不正です" } });
    }
  }

  // Use service_role client to bypass RLS for bulk write
  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });

  // Check for ID conflicts with existing data owned by this user
  if (payload.exams.length > 0) {
    const { data: existingExams } = await adminClient
      .from("exams")
      .select("id")
      .in("id", payload.exams.map((e) => e.id))
      .neq("user_id", uid);

    if ((existingExams ?? []).length > 0) {
      return res.status(409).json({ error: { code: "id_conflict", message: "他のユーザーのデータとID競合があります" } });
    }
  }

  // Assign uid to all exams (server overrides client user_id)
  const examsWithUid = payload.exams.map((e) => ({ ...e, user_id: uid }));

  // Insert with ON CONFLICT DO NOTHING for idempotency
  const counts = {
    exams: 0,
    examSubjects: 0,
    studyPlans: 0,
    dailyPlans: 0,
    progressLogs: 0,
    examResults: 0,
    availabilityRules: 0,
  };

  if (examsWithUid.length > 0) {
    const { data } = await adminClient.from("exams").upsert(examsWithUid, { onConflict: "id", ignoreDuplicates: true }).select("id");
    counts.exams = (data ?? []).length;
  }

  if (payload.examSubjects.length > 0) {
    const { data } = await adminClient.from("exam_subjects").upsert(payload.examSubjects, { onConflict: "id", ignoreDuplicates: true }).select("id");
    counts.examSubjects = (data ?? []).length;
  }

  if (payload.studyPlans.length > 0) {
    const { data } = await adminClient.from("study_plans").upsert(payload.studyPlans, { onConflict: "id", ignoreDuplicates: true }).select("id");
    counts.studyPlans = (data ?? []).length;
  }

  if (payload.dailyPlans.length > 0) {
    const { data } = await adminClient.from("daily_plans").upsert(payload.dailyPlans, { onConflict: "id", ignoreDuplicates: true }).select("id");
    counts.dailyPlans = (data ?? []).length;
  }

  if (payload.progressLogs.length > 0) {
    const { data } = await adminClient.from("progress_logs").upsert(payload.progressLogs, { onConflict: "id", ignoreDuplicates: true }).select("id");
    counts.progressLogs = (data ?? []).length;
  }

  if (payload.examResults.length > 0) {
    const { data } = await adminClient.from("exam_results").upsert(payload.examResults, { onConflict: "id", ignoreDuplicates: true }).select("id");
    counts.examResults = (data ?? []).length;
  }

  if (payload.availabilityRules.length > 0) {
    const { data } = await adminClient.from("availability_rules").upsert(payload.availabilityRules, { onConflict: "id", ignoreDuplicates: true }).select("id");
    counts.availabilityRules = (data ?? []).length;
  }

  return res.status(200).json({ ok: true, imported: counts });
}
