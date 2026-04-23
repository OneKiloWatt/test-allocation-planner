import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import {
  availabilityRuleDbSchema,
  dailyPlanDbSchema,
  examDbSchema,
  examSubjectDbSchema,
  studyPlanDbSchema,
} from "@/lib/schemas";
import { formatDateToString } from "@/lib/utils";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const requestBodySchema = z.object({
  examId: z.string().uuid(),
  expectedVersion: z.number().int().min(1),
  availabilityRule: availabilityRuleDbSchema,
  studyPlans: z.array(studyPlanDbSchema),
  dailyPlans: z.array(dailyPlanDbSchema),
});

type SaveAutoResponse = {
  ok: true;
  exam: { id: string; status: string; version: number };
};

type ErrorResponse = { error: { code: string; message: string } };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SaveAutoResponse | ErrorResponse>,
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

  const { examId, expectedVersion, availabilityRule, studyPlans, dailyPlans } = bodyParse.data;

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

  // Upsert availability rule
  const { data: existingRule } = await client
    .from("availability_rules")
    .select("id")
    .eq("exam_id", examId)
    .maybeSingle();

  if (existingRule != null) {
    const { error } = await client
      .from("availability_rules")
      .update(availabilityRule)
      .eq("exam_id", examId);
    if (error != null) {
      return res.status(500).json({ error: { code: "save_error", message: error.message } });
    }
  } else {
    const { error } = await client.from("availability_rules").insert(availabilityRule);
    if (error != null) {
      return res.status(500).json({ error: { code: "save_error", message: error.message } });
    }
  }

  // Replace study_plans for this exam's subjects
  const { data: subjectsData } = await client
    .from("exam_subjects")
    .select("id")
    .eq("exam_id", examId);

  const examSubjectParse = z.array(examSubjectDbSchema.pick({ id: true })).safeParse(subjectsData ?? []);
  if (!examSubjectParse.success) {
    return res.status(500).json({ error: { code: "parse_error", message: "科目データの形式が不正です" } });
  }
  const subjectIds = examSubjectParse.data.map((s) => s.id);

  if (subjectIds.length > 0) {
    const { error: delSpError } = await client
      .from("study_plans")
      .delete()
      .in("exam_subject_id", subjectIds);
    if (delSpError != null) {
      return res.status(500).json({ error: { code: "save_error", message: delSpError.message } });
    }
  }

  if (studyPlans.length > 0) {
    const { error: insSpError } = await client.from("study_plans").insert(studyPlans);
    if (insSpError != null) {
      return res.status(500).json({ error: { code: "save_error", message: insSpError.message } });
    }
  }

  // Replace auto daily_plans, keep manual ones
  const { error: delDpError } = await client
    .from("daily_plans")
    .delete()
    .eq("exam_id", examId)
    .eq("source", "auto");
  if (delDpError != null) {
    return res.status(500).json({ error: { code: "save_error", message: delDpError.message } });
  }

  if (dailyPlans.length > 0) {
    const { error: insDpError } = await client.from("daily_plans").insert(dailyPlans);
    if (insDpError != null) {
      return res.status(500).json({ error: { code: "save_error", message: insDpError.message } });
    }
  }

  // Determine new status: planning -> active if daily_plans exist
  const today = formatDateToString(new Date());
  const now = new Date().toISOString();

  let newStatus = exam.status;
  if (exam.status === "planning" && dailyPlans.length > 0 && exam.end_date >= today) {
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

  return res.status(200).json({
    ok: true,
    exam: { id: examId, status: newStatus, version: newVersion },
  });
}
