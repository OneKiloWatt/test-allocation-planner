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

import {
  CorruptedStorageError,
  RecordConflictError,
  RecordNotFoundError,
  RepositoryUnavailableError,
  StorageVersionMismatchError,
  type IExamRepository,
} from "./exam-repository";

export const GUEST_SESSION_STORAGE_KEY = "guestSession";
export const GUEST_SESSION_STORAGE_VERSION = 1;

const entityArraySchemas = {
  exams: z.array(examDbSchema),
  examSubjects: z.array(examSubjectDbSchema),
  studyPlans: z.array(studyPlanDbSchema),
  dailyPlans: z.array(dailyPlanDbSchema),
  progressLogs: z.array(progressLogDbSchema),
  examResults: z.array(examResultDbSchema),
  availabilityRules: z.array(availabilityRuleDbSchema),
} as const;

const guestSessionStorageSchema = z.object({
  storageVersion: z.number().int().min(1),
  sessionId: z.string().uuid().optional(),
  startedAt: z.string().datetime({ offset: true }).optional(),
  expiresAt: z.string().datetime({ offset: true }).optional(),
  activeExamId: z.string().uuid().nullable().optional(),
  exams: entityArraySchemas.exams,
  examSubjects: entityArraySchemas.examSubjects,
  studyPlans: entityArraySchemas.studyPlans,
  dailyPlans: entityArraySchemas.dailyPlans,
  progressLogs: entityArraySchemas.progressLogs,
  examResults: entityArraySchemas.examResults,
  availabilityRules: entityArraySchemas.availabilityRules,
});

type GuestSessionStorage = z.infer<typeof guestSessionStorageSchema>;

const emptyStorage = (): GuestSessionStorage => ({
  storageVersion: GUEST_SESSION_STORAGE_VERSION,
  sessionId: undefined,
  startedAt: undefined,
  expiresAt: undefined,
  activeExamId: null,
  exams: [],
  examSubjects: [],
  studyPlans: [],
  dailyPlans: [],
  progressLogs: [],
  examResults: [],
  availabilityRules: [],
});

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function getLocalStorage(): Storage {
  if (!isBrowser()) {
    throw new RepositoryUnavailableError();
  }

  return window.localStorage;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function clearNamespace(storage: Storage) {
  storage.removeItem(GUEST_SESSION_STORAGE_KEY);
}

function validateStorageVersion(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 ? value : null;
}

function ensureSameExamId<T extends { exam_id: string }>(
  currentExamId: string,
  next: T,
  entityName: string,
) {
  if (next.exam_id !== currentExamId) {
    throw new RecordConflictError(`${entityName} cannot be moved to another exam`);
  }
}

function ensureSameExamSubjectId<T extends { exam_subject_id: string }>(
  currentExamSubjectId: string,
  next: T,
  entityName: string,
) {
  if (next.exam_subject_id !== currentExamSubjectId) {
    throw new RecordConflictError(`${entityName} cannot be moved to another exam subject`);
  }
}

function sortByDateThenOrder<T extends { date?: string; display_order?: number; created_at?: string }>(
  records: T[],
) {
  return [...records].sort((left, right) => {
    const leftDate = left.date ?? left.created_at ?? "";
    const rightDate = right.date ?? right.created_at ?? "";

    if (leftDate !== rightDate) {
      return leftDate.localeCompare(rightDate);
    }

    const leftOrder = left.display_order ?? 0;
    const rightOrder = right.display_order ?? 0;
    return leftOrder - rightOrder;
  });
}

function assertUniqueIds<T extends { id: string }>(items: T[], entityName: string) {
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.id)) {
      throw new CorruptedStorageError(`Duplicate ${entityName} id detected: ${item.id}`);
    }
    seen.add(item.id);
  }
}

function validateStorageIntegrity(storageState: GuestSessionStorage) {
  assertUniqueIds(storageState.exams, "Exam");
  assertUniqueIds(storageState.examSubjects, "ExamSubject");
  assertUniqueIds(storageState.studyPlans, "StudyPlan");
  assertUniqueIds(storageState.dailyPlans, "DailyPlan");
  assertUniqueIds(storageState.progressLogs, "ProgressLog");
  assertUniqueIds(storageState.examResults, "ExamResult");
  assertUniqueIds(storageState.availabilityRules, "AvailabilityRule");

  const examIds = new Set(storageState.exams.map((item) => item.id));
  const examSubjectById = new Map(storageState.examSubjects.map((item) => [item.id, item] as const));

  for (const examSubject of storageState.examSubjects) {
    if (!examIds.has(examSubject.exam_id)) {
      throw new CorruptedStorageError(
        `ExamSubject references missing exam: ${examSubject.exam_id}`,
      );
    }
  }

  const duplicateExamSubjectKeys = new Set<string>();
  for (const examSubject of storageState.examSubjects) {
    const key = `${examSubject.exam_id}:${examSubject.subject_id}`;
    if (duplicateExamSubjectKeys.has(key)) {
      throw new CorruptedStorageError(`Duplicate ExamSubject key detected: ${key}`);
    }
    duplicateExamSubjectKeys.add(key);
  }

  for (const studyPlan of storageState.studyPlans) {
    const examSubject = examSubjectById.get(studyPlan.exam_subject_id);
    if (examSubject == null) {
      throw new CorruptedStorageError(
        `StudyPlan references missing exam subject: ${studyPlan.exam_subject_id}`,
      );
    }
    if (!examIds.has(examSubject.exam_id)) {
      throw new CorruptedStorageError(
        `StudyPlan references exam subject whose exam is missing: ${examSubject.exam_id}`,
      );
    }
  }

  const studyPlanSeen = new Set<string>();
  for (const studyPlan of storageState.studyPlans) {
    if (studyPlanSeen.has(studyPlan.exam_subject_id)) {
      throw new CorruptedStorageError(
        `Duplicate StudyPlan detected for exam subject: ${studyPlan.exam_subject_id}`,
      );
    }
    studyPlanSeen.add(studyPlan.exam_subject_id);
  }

  const dailyPlanSeen = new Set<string>();
  for (const dailyPlan of storageState.dailyPlans) {
    const examSubject = examSubjectById.get(dailyPlan.exam_subject_id);
    if (examSubject == null) {
      throw new CorruptedStorageError(
        `DailyPlan references missing exam subject: ${dailyPlan.exam_subject_id}`,
      );
    }
    if (dailyPlan.exam_id !== examSubject.exam_id) {
      throw new CorruptedStorageError(
        "DailyPlan exam_id does not match the referenced exam subject",
      );
    }

    const key = `${dailyPlan.exam_id}:${dailyPlan.exam_subject_id}:${dailyPlan.date}`;
    if (dailyPlanSeen.has(key)) {
      throw new CorruptedStorageError(`Duplicate DailyPlan detected: ${key}`);
    }
    dailyPlanSeen.add(key);
  }

  const progressLogSeen = new Set<string>();
  for (const progressLog of storageState.progressLogs) {
    const examSubject = examSubjectById.get(progressLog.exam_subject_id);
    if (examSubject == null) {
      throw new CorruptedStorageError(
        `ProgressLog references missing exam subject: ${progressLog.exam_subject_id}`,
      );
    }
    if (progressLog.exam_id !== examSubject.exam_id) {
      throw new CorruptedStorageError(
        "ProgressLog exam_id does not match the referenced exam subject",
      );
    }

    const key = `${progressLog.exam_id}:${progressLog.exam_subject_id}:${progressLog.logged_date}`;
    if (progressLogSeen.has(key)) {
      throw new CorruptedStorageError(`Duplicate ProgressLog detected: ${key}`);
    }
    progressLogSeen.add(key);
  }

  const examResultSeen = new Set<string>();
  for (const examResult of storageState.examResults) {
    if (examSubjectById.get(examResult.exam_subject_id) == null) {
      throw new CorruptedStorageError(
        `ExamResult references missing exam subject: ${examResult.exam_subject_id}`,
      );
    }

    if (examResultSeen.has(examResult.exam_subject_id)) {
      throw new CorruptedStorageError(
        `Duplicate ExamResult detected for exam subject: ${examResult.exam_subject_id}`,
      );
    }
    examResultSeen.add(examResult.exam_subject_id);
  }

  const availabilityRuleSeen = new Set<string>();
  for (const availabilityRule of storageState.availabilityRules) {
    if (!examIds.has(availabilityRule.exam_id)) {
      throw new CorruptedStorageError(
        `AvailabilityRule references missing exam: ${availabilityRule.exam_id}`,
      );
    }

    if (availabilityRuleSeen.has(availabilityRule.exam_id)) {
      throw new CorruptedStorageError(
        `Duplicate AvailabilityRule detected for exam: ${availabilityRule.exam_id}`,
      );
    }
    availabilityRuleSeen.add(availabilityRule.exam_id);
  }

  if (storageState.activeExamId != null && !examIds.has(storageState.activeExamId)) {
    throw new CorruptedStorageError(`activeExamId references missing exam: ${storageState.activeExamId}`);
  }
}

export class LocalStorageRepository implements IExamRepository {
  private loadStorage(): GuestSessionStorage {
    const storage = getLocalStorage();
    const raw = storage.getItem(GUEST_SESSION_STORAGE_KEY);

    if (raw == null || raw.length === 0) {
      return emptyStorage();
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw) as unknown;
    } catch {
      clearNamespace(storage);
      throw new CorruptedStorageError("guestSession contains invalid JSON");
    }

    if (!isRecord(parsed)) {
      clearNamespace(storage);
      throw new CorruptedStorageError("guestSession must be a plain object");
    }

    const version = validateStorageVersion(parsed.storageVersion);
    if (version !== null && version !== GUEST_SESSION_STORAGE_VERSION) {
      throw new StorageVersionMismatchError(version, GUEST_SESSION_STORAGE_VERSION);
    }

    const result = guestSessionStorageSchema.safeParse(parsed);
    if (!result.success) {
      clearNamespace(storage);
      throw new CorruptedStorageError("guestSession storage failed schema validation");
    }

    validateStorageIntegrity(result.data);

    return result.data;
  }

  private saveStorage(storageState: GuestSessionStorage): GuestSessionStorage {
    const result = guestSessionStorageSchema.safeParse(storageState);
    if (!result.success) {
      throw new CorruptedStorageError("Refusing to save invalid guestSession data");
    }

    validateStorageIntegrity(result.data);

    const storage = getLocalStorage();
    storage.setItem(GUEST_SESSION_STORAGE_KEY, JSON.stringify(result.data));
    return result.data;
  }

  private mutateStorage(
    updater: (storageState: GuestSessionStorage) => GuestSessionStorage,
  ): GuestSessionStorage {
    const current = this.loadStorage();
    const next = updater(current);
    return this.saveStorage(next);
  }

  private findById<T extends { id: string }>(items: T[], id: string): T | null {
    return items.find((item) => item.id === id) ?? null;
  }

  private assertExamExists(storageState: GuestSessionStorage, examId: string) {
    if (this.findById(storageState.exams, examId) == null) {
      throw new RecordNotFoundError(`Exam not found: ${examId}`);
    }
  }

  private assertExamSubjectExists(storageState: GuestSessionStorage, examSubjectId: string) {
    if (this.findById(storageState.examSubjects, examSubjectId) == null) {
      throw new RecordNotFoundError(`ExamSubject not found: ${examSubjectId}`);
    }
  }

  private assertExamSubjectBelongsToExam(
    storageState: GuestSessionStorage,
    examId: string,
    examSubjectId: string,
  ) {
    const examSubject = this.findById(storageState.examSubjects, examSubjectId);
    if (examSubject == null) {
      throw new RecordNotFoundError(`ExamSubject not found: ${examSubjectId}`);
    }

    if (examSubject.exam_id !== examId) {
      throw new RecordConflictError("ExamSubject does not belong to the specified exam");
    }
  }

  private assertNoDuplicateExamSubject(
    storageState: GuestSessionStorage,
    examId: string,
    subjectId: string,
  ) {
    if (storageState.examSubjects.some((item) => item.exam_id === examId && item.subject_id === subjectId)) {
      throw new RecordConflictError(`ExamSubject already exists for exam ${examId} and subject ${subjectId}`);
    }
  }

  private assertNoDuplicateStudyPlan(storageState: GuestSessionStorage, examSubjectId: string) {
    if (storageState.studyPlans.some((item) => item.exam_subject_id === examSubjectId)) {
      throw new RecordConflictError(`StudyPlan already exists for exam subject ${examSubjectId}`);
    }
  }

  private assertNoDuplicateDailyPlan(
    storageState: GuestSessionStorage,
    examId: string,
    examSubjectId: string,
    date: string,
  ) {
    if (
      storageState.dailyPlans.some(
        (item) =>
          item.exam_id === examId &&
          item.exam_subject_id === examSubjectId &&
          item.date === date,
      )
    ) {
      throw new RecordConflictError(
        `DailyPlan already exists for exam ${examId}, examSubject ${examSubjectId}, and date ${date}`,
      );
    }
  }

  private assertNoDuplicateProgressLog(
    storageState: GuestSessionStorage,
    examId: string,
    examSubjectId: string,
    loggedDate: string,
  ) {
    if (
      storageState.progressLogs.some(
        (item) =>
          item.exam_id === examId &&
          item.exam_subject_id === examSubjectId &&
          item.logged_date === loggedDate,
      )
    ) {
      throw new RecordConflictError(
        `ProgressLog already exists for exam ${examId}, examSubject ${examSubjectId}, and date ${loggedDate}`,
      );
    }
  }

  private assertNoDuplicateExamResult(storageState: GuestSessionStorage, examSubjectId: string) {
    if (storageState.examResults.some((item) => item.exam_subject_id === examSubjectId)) {
      throw new RecordConflictError(`ExamResult already exists for exam subject ${examSubjectId}`);
    }
  }

  private assertNoDuplicateAvailabilityRule(storageState: GuestSessionStorage, examId: string) {
    if (storageState.availabilityRules.some((item) => item.exam_id === examId)) {
      throw new RecordConflictError(`AvailabilityRule already exists for exam ${examId}`);
    }
  }

  private updateById<T extends { id: string }>(items: T[], next: T, entityName: string): T[] {
    const index = items.findIndex((item) => item.id === next.id);
    if (index < 0) {
      throw new RecordNotFoundError(`${entityName} not found: ${next.id}`);
    }

    const clone = [...items];
    clone[index] = next;
    return clone;
  }

  private deleteById<T extends { id: string }>(items: T[], id: string): T[] {
    return items.filter((item) => item.id !== id);
  }

  private updateExamVersion(current: Exam, next: Exam) {
    if (next.version !== current.version + 1) {
      throw new RecordConflictError(
        `Exam version must advance by one: current=${current.version}, next=${next.version}`,
      );
    }
  }

  async listExams() {
    return sortByDateThenOrder(this.loadStorage().exams);
  }

  async getExam(id: string) {
    return this.findById(this.loadStorage().exams, id);
  }

  async createExam(exam: Exam) {
    examDbSchema.parse(exam);
    return this.mutateStorage((storageState) => {
      if (this.findById(storageState.exams, exam.id) != null) {
        throw new RecordConflictError(`Exam already exists: ${exam.id}`);
      }

      return {
        ...storageState,
        exams: [...storageState.exams, exam],
      };
    }).exams.at(-1) ?? exam;
  }

  async updateExam(exam: Exam) {
    examDbSchema.parse(exam);
    return this.mutateStorage((storageState) => {
      const current = this.findById(storageState.exams, exam.id);
      if (current == null) {
        throw new RecordNotFoundError(`Exam not found: ${exam.id}`);
      }

      this.updateExamVersion(current, exam);
      return {
        ...storageState,
        exams: this.updateById(storageState.exams, exam, "Exam"),
      };
    }).exams.find((item) => item.id === exam.id) ?? exam;
  }

  async deleteExam(id: string) {
    this.mutateStorage((storageState) => {
      const examSubjectIds = storageState.examSubjects
        .filter((item) => item.exam_id === id)
        .map((item) => item.id);

      const nextStorage: GuestSessionStorage = {
        ...storageState,
        exams: this.deleteById(storageState.exams, id),
        examSubjects: storageState.examSubjects.filter((item) => item.exam_id !== id),
        studyPlans: storageState.studyPlans.filter(
          (item) => !examSubjectIds.includes(item.exam_subject_id),
        ),
        dailyPlans: storageState.dailyPlans.filter(
          (item) => item.exam_id !== id && !examSubjectIds.includes(item.exam_subject_id),
        ),
        progressLogs: storageState.progressLogs.filter(
          (item) => item.exam_id !== id && !examSubjectIds.includes(item.exam_subject_id),
        ),
        examResults: storageState.examResults.filter(
          (item) => !examSubjectIds.includes(item.exam_subject_id),
        ),
        availabilityRules: storageState.availabilityRules.filter((item) => item.exam_id !== id),
      };

      if (storageState.activeExamId === id) {
        nextStorage.activeExamId = null;
      }

      return nextStorage;
    });
  }

  async listExamSubjects() {
    return sortByDateThenOrder(this.loadStorage().examSubjects);
  }

  async getExamSubject(id: string) {
    return this.findById(this.loadStorage().examSubjects, id);
  }

  async createExamSubject(examSubject: ExamSubject) {
    examSubjectDbSchema.parse(examSubject);
    return this.mutateStorage((storageState) => {
      this.assertExamExists(storageState, examSubject.exam_id);
      this.assertNoDuplicateExamSubject(storageState, examSubject.exam_id, examSubject.subject_id);

      return {
        ...storageState,
        examSubjects: [...storageState.examSubjects, examSubject],
      };
    }).examSubjects.at(-1) ?? examSubject;
  }

  async updateExamSubject(examSubject: ExamSubject) {
    examSubjectDbSchema.parse(examSubject);
    return this.mutateStorage((storageState) => {
      const current = this.findById(storageState.examSubjects, examSubject.id);
      if (current == null) {
        throw new RecordNotFoundError(`ExamSubject not found: ${examSubject.id}`);
      }

      this.assertExamExists(storageState, examSubject.exam_id);
      ensureSameExamId(current.exam_id, examSubject, "ExamSubject");
      if (
        storageState.examSubjects.some(
          (item) =>
            item.id !== examSubject.id &&
            item.exam_id === examSubject.exam_id &&
            item.subject_id === examSubject.subject_id,
        )
      ) {
        throw new RecordConflictError(
          `ExamSubject already exists for exam ${examSubject.exam_id} and subject ${examSubject.subject_id}`,
        );
      }

      return {
        ...storageState,
        examSubjects: this.updateById(storageState.examSubjects, examSubject, "ExamSubject"),
      };
    }).examSubjects.find((item) => item.id === examSubject.id) ?? examSubject;
  }

  async deleteExamSubject(id: string) {
    this.mutateStorage((storageState) => {
      const nextStorage: GuestSessionStorage = {
        ...storageState,
        examSubjects: this.deleteById(storageState.examSubjects, id),
        studyPlans: storageState.studyPlans.filter((item) => item.exam_subject_id !== id),
        dailyPlans: storageState.dailyPlans.filter((item) => item.exam_subject_id !== id),
        progressLogs: storageState.progressLogs.filter((item) => item.exam_subject_id !== id),
        examResults: storageState.examResults.filter((item) => item.exam_subject_id !== id),
      };
      return nextStorage;
    });
  }

  async listStudyPlans() {
    return sortByDateThenOrder(this.loadStorage().studyPlans);
  }

  async getStudyPlan(id: string) {
    return this.findById(this.loadStorage().studyPlans, id);
  }

  async createStudyPlan(studyPlan: StudyPlan) {
    studyPlanDbSchema.parse(studyPlan);
    return this.mutateStorage((storageState) => {
      this.assertExamSubjectExists(storageState, studyPlan.exam_subject_id);
      this.assertNoDuplicateStudyPlan(storageState, studyPlan.exam_subject_id);

      return {
        ...storageState,
        studyPlans: [...storageState.studyPlans, studyPlan],
      };
    }).studyPlans.at(-1) ?? studyPlan;
  }

  async updateStudyPlan(studyPlan: StudyPlan) {
    studyPlanDbSchema.parse(studyPlan);
    return this.mutateStorage((storageState) => {
      const current = this.findById(storageState.studyPlans, studyPlan.id);
      if (current == null) {
        throw new RecordNotFoundError(`StudyPlan not found: ${studyPlan.id}`);
      }

      ensureSameExamSubjectId(current.exam_subject_id, studyPlan, "StudyPlan");
      return {
        ...storageState,
        studyPlans: this.updateById(storageState.studyPlans, studyPlan, "StudyPlan"),
      };
    }).studyPlans.find((item) => item.id === studyPlan.id) ?? studyPlan;
  }

  async deleteStudyPlan(id: string) {
    this.mutateStorage((storageState) => ({
      ...storageState,
      studyPlans: this.deleteById(storageState.studyPlans, id),
    }));
  }

  async listDailyPlans() {
    return sortByDateThenOrder(this.loadStorage().dailyPlans);
  }

  async getDailyPlan(id: string) {
    return this.findById(this.loadStorage().dailyPlans, id);
  }

  async createDailyPlan(dailyPlan: DailyPlan) {
    dailyPlanDbSchema.parse(dailyPlan);
    return this.mutateStorage((storageState) => {
      this.assertExamExists(storageState, dailyPlan.exam_id);
      this.assertExamSubjectBelongsToExam(storageState, dailyPlan.exam_id, dailyPlan.exam_subject_id);
      this.assertNoDuplicateDailyPlan(
        storageState,
        dailyPlan.exam_id,
        dailyPlan.exam_subject_id,
        dailyPlan.date,
      );

      return {
        ...storageState,
        dailyPlans: [...storageState.dailyPlans, dailyPlan],
      };
    }).dailyPlans.at(-1) ?? dailyPlan;
  }

  async updateDailyPlan(dailyPlan: DailyPlan) {
    dailyPlanDbSchema.parse(dailyPlan);
    return this.mutateStorage((storageState) => {
      const current = this.findById(storageState.dailyPlans, dailyPlan.id);
      if (current == null) {
        throw new RecordNotFoundError(`DailyPlan not found: ${dailyPlan.id}`);
      }

      ensureSameExamId(current.exam_id, dailyPlan, "DailyPlan");
      ensureSameExamSubjectId(current.exam_subject_id, dailyPlan, "DailyPlan");
      if (
        storageState.dailyPlans.some(
          (item) =>
            item.id !== dailyPlan.id &&
            item.exam_id === dailyPlan.exam_id &&
            item.exam_subject_id === dailyPlan.exam_subject_id &&
            item.date === dailyPlan.date,
        )
      ) {
        throw new RecordConflictError(
          `DailyPlan already exists for exam ${dailyPlan.exam_id}, examSubject ${dailyPlan.exam_subject_id}, and date ${dailyPlan.date}`,
        );
      }

      return {
        ...storageState,
        dailyPlans: this.updateById(storageState.dailyPlans, dailyPlan, "DailyPlan"),
      };
    }).dailyPlans.find((item) => item.id === dailyPlan.id) ?? dailyPlan;
  }

  async deleteDailyPlan(id: string) {
    this.mutateStorage((storageState) => ({
      ...storageState,
      dailyPlans: this.deleteById(storageState.dailyPlans, id),
    }));
  }

  async listProgressLogs() {
    return sortByDateThenOrder(this.loadStorage().progressLogs);
  }

  async getProgressLog(id: string) {
    return this.findById(this.loadStorage().progressLogs, id);
  }

  async createProgressLog(progressLog: ProgressLog) {
    progressLogDbSchema.parse(progressLog);
    return this.mutateStorage((storageState) => {
      this.assertExamExists(storageState, progressLog.exam_id);
      this.assertExamSubjectBelongsToExam(
        storageState,
        progressLog.exam_id,
        progressLog.exam_subject_id,
      );
      this.assertNoDuplicateProgressLog(
        storageState,
        progressLog.exam_id,
        progressLog.exam_subject_id,
        progressLog.logged_date,
      );

      return {
        ...storageState,
        progressLogs: [...storageState.progressLogs, progressLog],
      };
    }).progressLogs.at(-1) ?? progressLog;
  }

  async updateProgressLog(progressLog: ProgressLog) {
    progressLogDbSchema.parse(progressLog);
    return this.mutateStorage((storageState) => {
      const current = this.findById(storageState.progressLogs, progressLog.id);
      if (current == null) {
        throw new RecordNotFoundError(`ProgressLog not found: ${progressLog.id}`);
      }

      ensureSameExamId(current.exam_id, progressLog, "ProgressLog");
      ensureSameExamSubjectId(current.exam_subject_id, progressLog, "ProgressLog");
      if (
        storageState.progressLogs.some(
          (item) =>
            item.id !== progressLog.id &&
            item.exam_id === progressLog.exam_id &&
            item.exam_subject_id === progressLog.exam_subject_id &&
            item.logged_date === progressLog.logged_date,
        )
      ) {
        throw new RecordConflictError(
          `ProgressLog already exists for exam ${progressLog.exam_id}, examSubject ${progressLog.exam_subject_id}, and date ${progressLog.logged_date}`,
        );
      }

      return {
        ...storageState,
        progressLogs: this.updateById(storageState.progressLogs, progressLog, "ProgressLog"),
      };
    }).progressLogs.find((item) => item.id === progressLog.id) ?? progressLog;
  }

  async deleteProgressLog(id: string) {
    this.mutateStorage((storageState) => ({
      ...storageState,
      progressLogs: this.deleteById(storageState.progressLogs, id),
    }));
  }

  async listExamResults() {
    return sortByDateThenOrder(this.loadStorage().examResults);
  }

  async getExamResult(id: string) {
    return this.findById(this.loadStorage().examResults, id);
  }

  async createExamResult(examResult: ExamResult) {
    examResultDbSchema.parse(examResult);
    return this.mutateStorage((storageState) => {
      this.assertExamSubjectExists(storageState, examResult.exam_subject_id);
      this.assertNoDuplicateExamResult(storageState, examResult.exam_subject_id);

      return {
        ...storageState,
        examResults: [...storageState.examResults, examResult],
      };
    }).examResults.at(-1) ?? examResult;
  }

  async updateExamResult(examResult: ExamResult) {
    examResultDbSchema.parse(examResult);
    return this.mutateStorage((storageState) => {
      const current = this.findById(storageState.examResults, examResult.id);
      if (current == null) {
        throw new RecordNotFoundError(`ExamResult not found: ${examResult.id}`);
      }

      ensureSameExamSubjectId(current.exam_subject_id, examResult, "ExamResult");
      return {
        ...storageState,
        examResults: this.updateById(storageState.examResults, examResult, "ExamResult"),
      };
    }).examResults.find((item) => item.id === examResult.id) ?? examResult;
  }

  async deleteExamResult(id: string) {
    this.mutateStorage((storageState) => ({
      ...storageState,
      examResults: this.deleteById(storageState.examResults, id),
    }));
  }

  async listAvailabilityRules() {
    return sortByDateThenOrder(this.loadStorage().availabilityRules);
  }

  async getAvailabilityRule(id: string) {
    return this.findById(this.loadStorage().availabilityRules, id);
  }

  async createAvailabilityRule(availabilityRule: AvailabilityRule) {
    availabilityRuleDbSchema.parse(availabilityRule);
    return this.mutateStorage((storageState) => {
      this.assertExamExists(storageState, availabilityRule.exam_id);
      this.assertNoDuplicateAvailabilityRule(storageState, availabilityRule.exam_id);

      return {
        ...storageState,
        availabilityRules: [...storageState.availabilityRules, availabilityRule],
      };
    }).availabilityRules.at(-1) ?? availabilityRule;
  }

  async updateAvailabilityRule(availabilityRule: AvailabilityRule) {
    availabilityRuleDbSchema.parse(availabilityRule);
    return this.mutateStorage((storageState) => {
      const current = this.findById(storageState.availabilityRules, availabilityRule.id);
      if (current == null) {
        throw new RecordNotFoundError(`AvailabilityRule not found: ${availabilityRule.id}`);
      }

      ensureSameExamId(current.exam_id, availabilityRule, "AvailabilityRule");
      return {
        ...storageState,
        availabilityRules: this.updateById(
          storageState.availabilityRules,
          availabilityRule,
          "AvailabilityRule",
        ),
      };
    }).availabilityRules.find((item) => item.id === availabilityRule.id) ?? availabilityRule;
  }

  async deleteAvailabilityRule(id: string) {
    this.mutateStorage((storageState) => ({
      ...storageState,
      availabilityRules: this.deleteById(storageState.availabilityRules, id),
    }));
  }

  async clear() {
    const storage = getLocalStorage();
    clearNamespace(storage);
  }
}

export function createLocalStorageRepository(): IExamRepository {
  return new LocalStorageRepository();
}
