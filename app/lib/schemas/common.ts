import { format, isValid, parseISO } from "date-fns";
import { z } from "zod";

export const WEEKDAY_VALUES = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
] as const;

export const examStatusValues = ["planning", "active", "finished"] as const;
export const planningModeValues = ["auto", "manual"] as const;
export const dailyPlanSourceValues = ["auto", "manual"] as const;
export const termTypeValues = ["midterm", "final", "other"] as const;

export const uuidSchema = z.uuid();

export const isoDateSchema = z.string().refine((value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = parseISO(value);
  return isValid(parsed) && format(parsed, "yyyy-MM-dd") === value;
}, "Invalid ISO date string");

export const isoDateTimeSchema = z.iso.datetime({ offset: true });

export const nonNegativeIntSchema = z.int().min(0);
export const positiveDisplayOrderSchema = z.int().min(1);
export const scoreSchema = z.int().min(0).max(100);
export const plannedMinutesSchema = z.int().min(10);
export const ratioSchema = z
  .number()
  .min(0)
  .max(1)
  .refine((value) => Math.abs(value - Number(value.toFixed(4))) <= Number.EPSILON, {
    message: "Ratio must have at most 4 decimal places",
  });

export const weekdaySchema = z.enum(WEEKDAY_VALUES);

export const scheduleDaySchema = z.object({
  date: isoDateSchema,
  subjects: z.array(z.string().trim().min(1)).min(1),
});

export const scheduleDaysSchema = z.array(scheduleDaySchema);
export const clubDaysSchema = z.array(weekdaySchema).superRefine((days, ctx) => {
  const seen = new Set<string>();

  for (const day of days) {
    if (seen.has(day)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate weekday: ${day}`,
      });
    }
    seen.add(day);
  }
});

export type Weekday = z.infer<typeof weekdaySchema>;
export type ScheduleDay = z.infer<typeof scheduleDaySchema>;
