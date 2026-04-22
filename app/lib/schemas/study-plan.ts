import { z } from "zod";

import {
  isoDateTimeSchema,
  plannedMinutesSchema,
  ratioSchema,
  uuidSchema,
} from "./common";

export const studyPlanDbSchema = z.object({
  id: uuidSchema,
  exam_subject_id: uuidSchema,
  planned_minutes: plannedMinutesSchema,
  planned_ratio: ratioSchema,
  reason: z.string().trim().min(1).nullish(),
  created_at: isoDateTimeSchema,
  updated_at: isoDateTimeSchema,
});

export const studyPlanFormSchema = z.object({
  exam_subject_id: uuidSchema,
  planned_minutes: plannedMinutesSchema,
  planned_ratio: ratioSchema,
  reason: z.string().trim().max(500).optional(),
});

export type StudyPlan = z.infer<typeof studyPlanDbSchema>;
export type StudyPlanFormInput = z.infer<typeof studyPlanFormSchema>;
