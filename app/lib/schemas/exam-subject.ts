import { z } from "zod";

import {
  isoDateTimeSchema,
  nonNegativeIntSchema,
  positiveDisplayOrderSchema,
  scoreSchema,
  uuidSchema,
} from "./common";

export const examSubjectDbSchema = z.object({
  id: uuidSchema,
  exam_id: uuidSchema,
  subject_id: z.string().trim().min(1),
  subject_name: z.string().trim().min(1),
  normalized_name: z.string().trim().min(1),
  previous_score: scoreSchema.nullish(),
  previous_study_minutes: nonNegativeIntSchema.nullish(),
  target_score: scoreSchema,
  display_order: positiveDisplayOrderSchema,
  created_at: isoDateTimeSchema,
  updated_at: isoDateTimeSchema,
});

export const examSubjectFormSchema = z.object({
  subject_id: z.string().trim().min(1, "科目IDは必須です"),
  subject_name: z.string().trim().min(1, "科目名を入力してください"),
  previous_score: z
    .union([scoreSchema, z.nan()])
    .optional()
    .transform((value) => (typeof value === "number" && Number.isNaN(value) ? undefined : value)),
  previous_study_minutes: z
    .union([nonNegativeIntSchema, z.nan()])
    .optional()
    .transform((value) => (typeof value === "number" && Number.isNaN(value) ? undefined : value)),
  target_score: scoreSchema,
  display_order: positiveDisplayOrderSchema,
});

export type ExamSubject = z.infer<typeof examSubjectDbSchema>;
export type ExamSubjectFormInput = z.infer<typeof examSubjectFormSchema>;
