import { z } from "zod";

import {
  examStatusValues,
  isoDateSchema,
  isoDateTimeSchema,
  planningModeValues,
  scheduleDaysSchema,
  termTypeValues,
  uuidSchema,
} from "./common";

export const examDbSchema = z
  .object({
    id: uuidSchema,
    user_id: uuidSchema,
    version: z.int().min(1),
    name: z.string().trim().min(1),
    term_type: z.enum(termTypeValues),
    start_date: isoDateSchema,
    end_date: isoDateSchema,
    status: z.enum(examStatusValues),
    planning_mode: z.enum(planningModeValues),
    schedule_days: scheduleDaysSchema.nullish(),
    created_at: isoDateTimeSchema,
    updated_at: isoDateTimeSchema,
  })
  .refine((value) => value.end_date >= value.start_date, {
    message: "end_date must be on or after start_date",
    path: ["end_date"],
  });

export const examFormSchema = z
  .object({
    name: z.string().trim().min(1, "テスト名を入力してください"),
    term_type: z.enum(termTypeValues),
    start_date: isoDateSchema,
    end_date: isoDateSchema,
    planning_mode: z.enum(planningModeValues),
    schedule_days: scheduleDaysSchema.default([]),
  })
  .refine((value) => value.end_date >= value.start_date, {
    message: "終了日は開始日以降にしてください",
    path: ["end_date"],
  });

export type Exam = z.infer<typeof examDbSchema>;
export type ExamFormInput = z.infer<typeof examFormSchema>;
