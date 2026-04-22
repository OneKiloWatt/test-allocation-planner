import { z } from "zod";

import {
  isoDateSchema,
  isoDateTimeSchema,
  nonNegativeIntSchema,
  uuidSchema,
} from "./common";

export const progressLogDbSchema = z.object({
  id: uuidSchema,
  exam_id: uuidSchema,
  exam_subject_id: uuidSchema,
  logged_minutes: nonNegativeIntSchema,
  memo: z.string().max(500).nullish(),
  logged_date: isoDateSchema,
  logged_at: isoDateTimeSchema,
  created_at: isoDateTimeSchema,
});

export const progressLogFormSchema = z.object({
  exam_id: uuidSchema,
  exam_subject_id: uuidSchema,
  logged_minutes: nonNegativeIntSchema,
  memo: z.string().trim().max(500).optional(),
  logged_date: isoDateSchema,
});

export type ProgressLog = z.infer<typeof progressLogDbSchema>;
export type ProgressLogFormInput = z.infer<typeof progressLogFormSchema>;
