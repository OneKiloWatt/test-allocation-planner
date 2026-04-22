import { z } from "zod";

import {
  dailyPlanSourceValues,
  isoDateSchema,
  isoDateTimeSchema,
  plannedMinutesSchema,
  positiveDisplayOrderSchema,
  uuidSchema,
} from "./common";

export const dailyPlanDbSchema = z.object({
  id: uuidSchema,
  exam_id: uuidSchema,
  exam_subject_id: uuidSchema,
  date: isoDateSchema,
  planned_minutes: plannedMinutesSchema,
  source: z.enum(dailyPlanSourceValues),
  display_order: positiveDisplayOrderSchema,
  created_at: isoDateTimeSchema,
  updated_at: isoDateTimeSchema,
});

export const dailyPlanFormSchema = z.object({
  exam_id: uuidSchema,
  exam_subject_id: uuidSchema,
  date: isoDateSchema,
  planned_minutes: plannedMinutesSchema,
  source: z.enum(dailyPlanSourceValues).default("manual"),
  display_order: positiveDisplayOrderSchema,
});

export type DailyPlan = z.infer<typeof dailyPlanDbSchema>;
export type DailyPlanFormInput = z.infer<typeof dailyPlanFormSchema>;
