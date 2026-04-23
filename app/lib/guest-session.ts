import { addDays, differenceInCalendarDays, isValid, parseISO } from "date-fns";
import { z } from "zod";

import {
  availabilityRuleDbSchema,
  dailyPlanDbSchema,
  examDbSchema,
  examResultDbSchema,
  examSubjectDbSchema,
  progressLogDbSchema,
  studyPlanDbSchema,
} from "@/lib/schemas";
import {
  GUEST_SESSION_STORAGE_KEY,
  GUEST_SESSION_STORAGE_VERSION,
} from "@/lib/repositories";
import { generateUuid } from "@/lib/utils";

const guestSessionLifetimeDays = 30;

const guestSessionStorageSchema = z.object({
  storageVersion: z.literal(GUEST_SESSION_STORAGE_VERSION),
  sessionId: z.string().uuid(),
  startedAt: z.string().datetime({ offset: true }),
  expiresAt: z.string().datetime({ offset: true }),
  activeExamId: z.string().uuid().nullable().optional(),
  exams: z.array(examDbSchema),
  examSubjects: z.array(examSubjectDbSchema),
  studyPlans: z.array(studyPlanDbSchema),
  dailyPlans: z.array(dailyPlanDbSchema),
  progressLogs: z.array(progressLogDbSchema),
  examResults: z.array(examResultDbSchema),
  availabilityRules: z.array(availabilityRuleDbSchema),
});

export type GuestSessionStorage = z.infer<typeof guestSessionStorageSchema>;

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function getLocalStorage() {
  if (!isBrowser()) {
    return null;
  }

  return window.localStorage;
}

function clearGuestSession(storage: Storage) {
  storage.removeItem(GUEST_SESSION_STORAGE_KEY);
}

function createGuestSessionStorage(startedAt = new Date()): GuestSessionStorage {
  return {
    storageVersion: GUEST_SESSION_STORAGE_VERSION,
    sessionId: generateUuid(),
    startedAt: startedAt.toISOString(),
    expiresAt: addDays(startedAt, guestSessionLifetimeDays).toISOString(),
    activeExamId: null,
    exams: [],
    examSubjects: [],
    studyPlans: [],
    dailyPlans: [],
    progressLogs: [],
    examResults: [],
    availabilityRules: [],
  };
}

function isGuestSessionWithinLifetime(storage: GuestSessionStorage, now = new Date()) {
  const startedAt = parseISO(storage.startedAt);
  const expiresAt = parseISO(storage.expiresAt);

  if (!isValid(startedAt) || !isValid(expiresAt)) {
    return false;
  }

  if (startedAt.getTime() > now.getTime()) {
    return false;
  }

  if (expiresAt.getTime() <= now.getTime()) {
    return false;
  }

  return differenceInCalendarDays(expiresAt, startedAt) === guestSessionLifetimeDays;
}

function readGuestSessionStorage(storage: Storage): GuestSessionStorage | null {
  const raw = storage.getItem(GUEST_SESSION_STORAGE_KEY);
  if (raw == null || raw.length === 0) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    clearGuestSession(storage);
    return null;
  }

  const result = guestSessionStorageSchema.safeParse(parsed);
  if (!result.success) {
    clearGuestSession(storage);
    return null;
  }

  if (!isGuestSessionWithinLifetime(result.data)) {
    clearGuestSession(storage);
    return null;
  }

  return result.data;
}

export function getValidGuestSessionStorage() {
  const storage = getLocalStorage();
  if (storage == null) {
    return null;
  }

  return readGuestSessionStorage(storage);
}

export function hasValidGuestSession() {
  return getValidGuestSessionStorage() != null;
}

export function startGuestSession() {
  const storage = getLocalStorage();
  if (storage == null) {
    return null;
  }

  const current = readGuestSessionStorage(storage);
  if (current != null) {
    return current;
  }

  const next = createGuestSessionStorage();
  storage.setItem(GUEST_SESSION_STORAGE_KEY, JSON.stringify(next));
  return next;
}
