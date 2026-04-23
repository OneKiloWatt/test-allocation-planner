import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import {
  availabilityRuleDbSchema,
  dailyPlanDbSchema,
  examDbSchema,
  examResultDbSchema,
  examSubjectDbSchema,
  progressLogDbSchema,
  studyPlanDbSchema,
  type AvailabilityRule,
  type DailyPlan,
  type Exam,
  type ExamResult,
  type ExamSubject,
  type ProgressLog,
  type StudyPlan,
} from "@/lib/schemas";

import { RecordConflictError, RecordNotFoundError, type IExamRepository } from "./exam-repository";

const PG_UNIQUE_VIOLATION = "23505";
const PGRST_NOT_FOUND = "PGRST116";

function throwIfError(error: { code?: string; message: string } | null, id?: string): void {
  if (error == null) return;
  if (error.code === PG_UNIQUE_VIOLATION) {
    throw new RecordConflictError(error.message);
  }
  if (error.code === PGRST_NOT_FOUND) {
    throw new RecordNotFoundError(id ? `Record not found: ${id}` : error.message);
  }
  throw new Error(error.message);
}

export class SupabaseRepository implements IExamRepository {
  constructor(private readonly client: SupabaseClient) {}

  // --- Exam ---

  async listExams(): Promise<Exam[]> {
    const { data, error } = await this.client
      .from("exams")
      .select("*")
      .order("end_date", { ascending: true })
      .order("created_at", { ascending: true });
    throwIfError(error);
    return z.array(examDbSchema).parse(data ?? []);
  }

  async getExam(id: string): Promise<Exam | null> {
    const { data, error } = await this.client.from("exams").select("*").eq("id", id).maybeSingle();
    throwIfError(error);
    if (data == null) return null;
    return examDbSchema.parse(data);
  }

  async createExam(exam: Exam): Promise<Exam> {
    const { data, error } = await this.client.from("exams").insert(exam).select().single();
    throwIfError(error, exam.id);
    return examDbSchema.parse(data);
  }

  async updateExam(exam: Exam): Promise<Exam> {
    const { data, error } = await this.client
      .from("exams")
      .update(exam)
      .eq("id", exam.id)
      .eq("version", exam.version - 1)
      .select()
      .maybeSingle();
    throwIfError(error, exam.id);
    if (data == null) {
      throw new RecordConflictError(`Exam version conflict or not found: ${exam.id}`);
    }
    return examDbSchema.parse(data);
  }

  async deleteExam(id: string): Promise<void> {
    const { error } = await this.client.from("exams").delete().eq("id", id);
    throwIfError(error, id);
  }

  // --- ExamSubject ---

  async listExamSubjects(): Promise<ExamSubject[]> {
    const { data, error } = await this.client
      .from("exam_subjects")
      .select("*")
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true });
    throwIfError(error);
    return z.array(examSubjectDbSchema).parse(data ?? []);
  }

  async getExamSubject(id: string): Promise<ExamSubject | null> {
    const { data, error } = await this.client
      .from("exam_subjects")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    throwIfError(error);
    if (data == null) return null;
    return examSubjectDbSchema.parse(data);
  }

  async createExamSubject(examSubject: ExamSubject): Promise<ExamSubject> {
    const { data, error } = await this.client
      .from("exam_subjects")
      .insert(examSubject)
      .select()
      .single();
    throwIfError(error, examSubject.id);
    return examSubjectDbSchema.parse(data);
  }

  async updateExamSubject(examSubject: ExamSubject): Promise<ExamSubject> {
    const { data, error } = await this.client
      .from("exam_subjects")
      .update(examSubject)
      .eq("id", examSubject.id)
      .select()
      .maybeSingle();
    throwIfError(error, examSubject.id);
    if (data == null) throw new RecordNotFoundError(`ExamSubject not found: ${examSubject.id}`);
    return examSubjectDbSchema.parse(data);
  }

  async deleteExamSubject(id: string): Promise<void> {
    const { error } = await this.client.from("exam_subjects").delete().eq("id", id);
    throwIfError(error, id);
  }

  // --- StudyPlan ---

  async listStudyPlans(): Promise<StudyPlan[]> {
    const { data, error } = await this.client
      .from("study_plans")
      .select("*")
      .order("created_at", { ascending: true });
    throwIfError(error);
    return z.array(studyPlanDbSchema).parse(data ?? []);
  }

  async getStudyPlan(id: string): Promise<StudyPlan | null> {
    const { data, error } = await this.client
      .from("study_plans")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    throwIfError(error);
    if (data == null) return null;
    return studyPlanDbSchema.parse(data);
  }

  async createStudyPlan(studyPlan: StudyPlan): Promise<StudyPlan> {
    const { data, error } = await this.client
      .from("study_plans")
      .insert(studyPlan)
      .select()
      .single();
    throwIfError(error, studyPlan.id);
    return studyPlanDbSchema.parse(data);
  }

  async updateStudyPlan(studyPlan: StudyPlan): Promise<StudyPlan> {
    const { data, error } = await this.client
      .from("study_plans")
      .update(studyPlan)
      .eq("id", studyPlan.id)
      .select()
      .maybeSingle();
    throwIfError(error, studyPlan.id);
    if (data == null) throw new RecordNotFoundError(`StudyPlan not found: ${studyPlan.id}`);
    return studyPlanDbSchema.parse(data);
  }

  async deleteStudyPlan(id: string): Promise<void> {
    const { error } = await this.client.from("study_plans").delete().eq("id", id);
    throwIfError(error, id);
  }

  // --- DailyPlan ---

  async listDailyPlans(): Promise<DailyPlan[]> {
    const { data, error } = await this.client
      .from("daily_plans")
      .select("*")
      .order("date", { ascending: true })
      .order("display_order", { ascending: true });
    throwIfError(error);
    return z.array(dailyPlanDbSchema).parse(data ?? []);
  }

  async getDailyPlan(id: string): Promise<DailyPlan | null> {
    const { data, error } = await this.client
      .from("daily_plans")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    throwIfError(error);
    if (data == null) return null;
    return dailyPlanDbSchema.parse(data);
  }

  async createDailyPlan(dailyPlan: DailyPlan): Promise<DailyPlan> {
    const { data, error } = await this.client
      .from("daily_plans")
      .insert(dailyPlan)
      .select()
      .single();
    throwIfError(error, dailyPlan.id);
    return dailyPlanDbSchema.parse(data);
  }

  async updateDailyPlan(dailyPlan: DailyPlan): Promise<DailyPlan> {
    const { data, error } = await this.client
      .from("daily_plans")
      .update(dailyPlan)
      .eq("id", dailyPlan.id)
      .select()
      .maybeSingle();
    throwIfError(error, dailyPlan.id);
    if (data == null) throw new RecordNotFoundError(`DailyPlan not found: ${dailyPlan.id}`);
    return dailyPlanDbSchema.parse(data);
  }

  async deleteDailyPlan(id: string): Promise<void> {
    const { error } = await this.client.from("daily_plans").delete().eq("id", id);
    throwIfError(error, id);
  }

  // --- ProgressLog ---

  async listProgressLogs(): Promise<ProgressLog[]> {
    const { data, error } = await this.client
      .from("progress_logs")
      .select("*")
      .order("logged_date", { ascending: true })
      .order("created_at", { ascending: true });
    throwIfError(error);
    return z.array(progressLogDbSchema).parse(data ?? []);
  }

  async getProgressLog(id: string): Promise<ProgressLog | null> {
    const { data, error } = await this.client
      .from("progress_logs")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    throwIfError(error);
    if (data == null) return null;
    return progressLogDbSchema.parse(data);
  }

  async createProgressLog(progressLog: ProgressLog): Promise<ProgressLog> {
    const { data, error } = await this.client
      .from("progress_logs")
      .insert(progressLog)
      .select()
      .single();
    throwIfError(error, progressLog.id);
    return progressLogDbSchema.parse(data);
  }

  async updateProgressLog(progressLog: ProgressLog): Promise<ProgressLog> {
    const { data, error } = await this.client
      .from("progress_logs")
      .update(progressLog)
      .eq("id", progressLog.id)
      .select()
      .maybeSingle();
    throwIfError(error, progressLog.id);
    if (data == null) throw new RecordNotFoundError(`ProgressLog not found: ${progressLog.id}`);
    return progressLogDbSchema.parse(data);
  }

  async deleteProgressLog(id: string): Promise<void> {
    const { error } = await this.client.from("progress_logs").delete().eq("id", id);
    throwIfError(error, id);
  }

  // --- ExamResult ---

  async listExamResults(): Promise<ExamResult[]> {
    const { data, error } = await this.client
      .from("exam_results")
      .select("*")
      .order("created_at", { ascending: true });
    throwIfError(error);
    return z.array(examResultDbSchema).parse(data ?? []);
  }

  async getExamResult(id: string): Promise<ExamResult | null> {
    const { data, error } = await this.client
      .from("exam_results")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    throwIfError(error);
    if (data == null) return null;
    return examResultDbSchema.parse(data);
  }

  async createExamResult(examResult: ExamResult): Promise<ExamResult> {
    const { data, error } = await this.client
      .from("exam_results")
      .insert(examResult)
      .select()
      .single();
    throwIfError(error, examResult.id);
    return examResultDbSchema.parse(data);
  }

  async updateExamResult(examResult: ExamResult): Promise<ExamResult> {
    const { data, error } = await this.client
      .from("exam_results")
      .update(examResult)
      .eq("id", examResult.id)
      .select()
      .maybeSingle();
    throwIfError(error, examResult.id);
    if (data == null) throw new RecordNotFoundError(`ExamResult not found: ${examResult.id}`);
    return examResultDbSchema.parse(data);
  }

  async deleteExamResult(id: string): Promise<void> {
    const { error } = await this.client.from("exam_results").delete().eq("id", id);
    throwIfError(error, id);
  }

  // --- AvailabilityRule ---

  async listAvailabilityRules(): Promise<AvailabilityRule[]> {
    const { data, error } = await this.client
      .from("availability_rules")
      .select("*")
      .order("created_at", { ascending: true });
    throwIfError(error);
    return z.array(availabilityRuleDbSchema).parse(data ?? []);
  }

  async getAvailabilityRule(id: string): Promise<AvailabilityRule | null> {
    const { data, error } = await this.client
      .from("availability_rules")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    throwIfError(error);
    if (data == null) return null;
    return availabilityRuleDbSchema.parse(data);
  }

  async createAvailabilityRule(availabilityRule: AvailabilityRule): Promise<AvailabilityRule> {
    const { data, error } = await this.client
      .from("availability_rules")
      .insert(availabilityRule)
      .select()
      .single();
    throwIfError(error, availabilityRule.id);
    return availabilityRuleDbSchema.parse(data);
  }

  async updateAvailabilityRule(availabilityRule: AvailabilityRule): Promise<AvailabilityRule> {
    const { data, error } = await this.client
      .from("availability_rules")
      .update(availabilityRule)
      .eq("id", availabilityRule.id)
      .select()
      .maybeSingle();
    throwIfError(error, availabilityRule.id);
    if (data == null) {
      throw new RecordNotFoundError(`AvailabilityRule not found: ${availabilityRule.id}`);
    }
    return availabilityRuleDbSchema.parse(data);
  }

  async deleteAvailabilityRule(id: string): Promise<void> {
    const { error } = await this.client.from("availability_rules").delete().eq("id", id);
    throwIfError(error, id);
  }

  // --- clear ---

  async clear(): Promise<void> {
    const { error } = await this.client.from("exams").delete().gte("version", 1);
    throwIfError(error);
  }
}
