import { z } from "zod";

import {
  clubDaysSchema,
  isoDateSchema,
  isoDateTimeSchema,
  nonNegativeIntSchema,
  uuidSchema,
} from "./common";

export const availabilityRuleDbSchema = z.object({
  id: uuidSchema,
  exam_id: uuidSchema,
  weekday_club_minutes: nonNegativeIntSchema,
  weekday_no_club_minutes: nonNegativeIntSchema,
  weekend_minutes: nonNegativeIntSchema,
  club_days: clubDaysSchema,
  study_start_date: isoDateSchema,
  pre_exam_rest_mode: z.boolean(),
  created_at: isoDateTimeSchema,
  updated_at: isoDateTimeSchema,
});

export const availabilityRuleFormSchema = z.object({
  exam_id: uuidSchema,
  weekday_club_minutes: nonNegativeIntSchema,
  weekday_no_club_minutes: nonNegativeIntSchema,
  weekend_minutes: nonNegativeIntSchema,
  club_days: clubDaysSchema,
  study_start_date: isoDateSchema,
  pre_exam_rest_mode: z.boolean().default(false),
});

export type AvailabilityRule = z.infer<typeof availabilityRuleDbSchema>;
export type AvailabilityRuleFormInput = z.infer<typeof availabilityRuleFormSchema>;
