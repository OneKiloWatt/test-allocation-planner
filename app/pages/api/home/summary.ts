import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import { buildHomeViewState } from "@/lib/logic/home-view";
import {
  availabilityRuleDbSchema,
  dailyPlanDbSchema,
  examDbSchema,
  examResultDbSchema,
  examSubjectDbSchema,
  progressLogDbSchema,
  studyPlanDbSchema,
} from "@/lib/schemas";
import { formatDateToString, getDaysUntilExamStart } from "@/lib/utils";
import { routePaths } from "@/components/layout";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

type TodayPlan = {
  examSubjectId: string;
  subjectName: string;
  plannedMinutes: number;
  source: "auto" | "manual";
};

type ProgressSummaryItem = {
  examSubjectId: string;
  subjectName: string;
  plannedMinutes: number;
  loggedMinutes: number;
  remainingMinutes: number;
  progressRatio: number;
};

type HomeSummaryResponse =
  | { state: "empty"; headline: string; cta: { label: string; href: string } }
  | {
      state: "planning";
      examId: string;
      headline: string;
      nextAction: { label: string; href: string };
    }
  | {
      state: "active";
      examId: string;
      headline: string;
      daysUntilExam: number;
      todayPlans: TodayPlan[];
      progressSummary: ProgressSummaryItem[];
    }
  | {
      state: "finished_pending_result";
      examId: string;
      headline: string;
      resultEntryCta: { label: string; href: string };
    };

type ErrorResponse = { error: { code: string; message: string } };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HomeSummaryResponse | ErrorResponse>,
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: { code: "method_not_allowed", message: "GET のみ許可されています" } });
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

  const [
    examsResult,
    subjectsResult,
    studyPlansResult,
    dailyPlansResult,
    progressLogsResult,
    examResultsResult,
  ] = await Promise.all([
    client.from("exams").select("*").order("end_date", { ascending: true }),
    client.from("exam_subjects").select("*").order("display_order", { ascending: true }),
    client.from("study_plans").select("*"),
    client.from("daily_plans").select("*").order("date", { ascending: true }).order("display_order", { ascending: true }),
    client.from("progress_logs").select("*").order("logged_date", { ascending: true }),
    client.from("exam_results").select("*"),
  ]);

  const fetchError =
    examsResult.error ??
    subjectsResult.error ??
    studyPlansResult.error ??
    dailyPlansResult.error ??
    progressLogsResult.error ??
    examResultsResult.error;

  if (fetchError != null) {
    return res.status(500).json({ error: { code: "fetch_error", message: fetchError.message } });
  }

  const parseResult = z.object({
    exams: z.array(examDbSchema),
    subjects: z.array(examSubjectDbSchema),
    studyPlans: z.array(studyPlanDbSchema),
    dailyPlans: z.array(dailyPlanDbSchema),
    progressLogs: z.array(progressLogDbSchema),
    examResults: z.array(examResultDbSchema),
    availabilityRules: z.array(availabilityRuleDbSchema),
  }).safeParse({
    exams: examsResult.data ?? [],
    subjects: subjectsResult.data ?? [],
    studyPlans: studyPlansResult.data ?? [],
    dailyPlans: dailyPlansResult.data ?? [],
    progressLogs: progressLogsResult.data ?? [],
    examResults: examResultsResult.data ?? [],
    availabilityRules: [],
  });

  if (!parseResult.success) {
    return res.status(500).json({ error: { code: "parse_error", message: "データの形式が不正です" } });
  }

  const { exams, subjects, studyPlans, dailyPlans, progressLogs, examResults } = parseResult.data;

  const today = formatDateToString(new Date());
  const now = new Date().toISOString();

  const { examsToPersist, viewState } = buildHomeViewState({
    exams,
    subjects,
    studyPlans,
    dailyPlans,
    progressLogs,
    examResults,
    today,
    now,
  });

  await Promise.all(
    examsToPersist.map((exam) =>
      client
        .from("exams")
        .update(exam)
        .eq("id", exam.id)
        .eq("version", exam.version - 1),
    ),
  );

  const { finishedPendingExam, activeExam, planningExam } = viewState;

  if (finishedPendingExam != null) {
    return res.status(200).json({
      state: "finished_pending_result",
      examId: finishedPendingExam.id,
      headline: `${finishedPendingExam.name}が終了しました`,
      resultEntryCta: {
        label: "結果を入力する",
        href: routePaths.resultEntry(finishedPendingExam.id),
      },
    });
  }

  if (activeExam != null) {
    const activeSubjects = subjects.filter((s) => s.exam_id === activeExam.id);
    const subjectMap = new Map(activeSubjects.map((s) => [s.id, s]));

    const todayPlans: TodayPlan[] = dailyPlans
      .filter((dp) => dp.exam_id === activeExam.id && dp.date === today)
      .sort((a, b) => a.display_order - b.display_order)
      .map((dp) => ({
        examSubjectId: dp.exam_subject_id,
        subjectName: subjectMap.get(dp.exam_subject_id)?.subject_name ?? "",
        plannedMinutes: dp.planned_minutes,
        source: dp.source,
      }));

    const progressSummary: ProgressSummaryItem[] = studyPlans
      .filter((sp) => subjectMap.has(sp.exam_subject_id))
      .map((sp) => {
        const subject = subjectMap.get(sp.exam_subject_id);
        const loggedMinutes = progressLogs
          .filter((log) => log.exam_subject_id === sp.exam_subject_id)
          .reduce((sum, log) => sum + log.logged_minutes, 0);
        const remainingMinutes = Math.max(0, sp.planned_minutes - loggedMinutes);
        const progressRatio = sp.planned_minutes > 0 ? loggedMinutes / sp.planned_minutes : 0;

        return {
          examSubjectId: sp.exam_subject_id,
          subjectName: subject?.subject_name ?? "",
          plannedMinutes: sp.planned_minutes,
          loggedMinutes,
          remainingMinutes,
          progressRatio,
        };
      });

    return res.status(200).json({
      state: "active",
      examId: activeExam.id,
      headline: `${activeExam.name}まであと${getDaysUntilExamStart(activeExam.start_date)}日`,
      daysUntilExam: getDaysUntilExamStart(activeExam.start_date),
      todayPlans,
      progressSummary,
    });
  }

  if (planningExam != null) {
    const planningSubjects = subjects.filter((s) => s.exam_id === planningExam.id);
    const hasTargets = planningSubjects.some((s) => s.target_score > 0);
    const hasDailyPlan = dailyPlans.some((dp) => dp.exam_id === planningExam.id);

    const nextActionLabel = !hasTargets
      ? "目標点数を設定する"
      : hasDailyPlan
        ? "学習プランを確認する"
        : "日程・予定を設定する";

    const nextActionHref = !hasTargets
      ? routePaths.targetScore(planningExam.id)
      : hasDailyPlan
        ? routePaths.dailyPlan(planningExam.id)
        : routePaths.planMode(planningExam.id);

    return res.status(200).json({
      state: "planning",
      examId: planningExam.id,
      headline: "目標点数と日程を入れて配分案を作りましょう",
      nextAction: { label: nextActionLabel, href: nextActionHref },
    });
  }

  return res.status(200).json({
    state: "empty",
    headline: "まずは次のテストを作成しましょう",
    cta: { label: "テストを作成する", href: routePaths.testCreate() },
  });
}
