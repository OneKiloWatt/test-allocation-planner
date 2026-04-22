import { z } from "zod";

import {
  isoDateTimeSchema,
  nonNegativeIntSchema,
  scoreSchema,
  uuidSchema,
} from "./common";

export const examResultDbSchema = z.object({
  id: uuidSchema,
  exam_subject_id: uuidSchema,
  actual_score: scoreSchema,
  actual_study_minutes: nonNegativeIntSchema.nullish(),
  note: z.string().max(500).nullish(),
  created_at: isoDateTimeSchema,
  updated_at: isoDateTimeSchema,
});

export const examResultFormSchema = z.object({
  exam_subject_id: uuidSchema,
  actual_score: scoreSchema,
  actual_study_minutes: nonNegativeIntSchema.optional(),
  note: z.string().trim().max(500).optional(),
});

export type ExamResult = z.infer<typeof examResultDbSchema>;
export type ExamResultFormInput = z.infer<typeof examResultFormSchema>;
