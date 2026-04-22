import type {
  AvailabilityRule,
  DailyPlan,
  Exam,
  ExamResult,
  ExamSubject,
  ProgressLog,
  StudyPlan,
} from "@/lib/schemas";

export class RepositoryUnavailableError extends Error {
  constructor(message = "Repository is not available in this environment") {
    super(message);
    this.name = "RepositoryUnavailableError";
  }
}

export class StorageVersionMismatchError extends Error {
  readonly currentVersion: number;
  readonly expectedVersion: number;

  constructor(currentVersion: number, expectedVersion: number) {
    super(
      `guestSession storageVersion mismatch: found ${currentVersion}, expected ${expectedVersion}`,
    );
    this.name = "StorageVersionMismatchError";
    this.currentVersion = currentVersion;
    this.expectedVersion = expectedVersion;
  }
}

export class CorruptedStorageError extends Error {
  constructor(message = "guestSession storage data is invalid or corrupted") {
    super(message);
    this.name = "CorruptedStorageError";
  }
}

export class RecordConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RecordConflictError";
  }
}

export class RecordNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RecordNotFoundError";
  }
}

export interface IExamRepository {
  listExams(): Promise<Exam[]>;
  getExam(id: string): Promise<Exam | null>;
  createExam(exam: Exam): Promise<Exam>;
  updateExam(exam: Exam): Promise<Exam>;
  deleteExam(id: string): Promise<void>;

  listExamSubjects(): Promise<ExamSubject[]>;
  getExamSubject(id: string): Promise<ExamSubject | null>;
  createExamSubject(examSubject: ExamSubject): Promise<ExamSubject>;
  updateExamSubject(examSubject: ExamSubject): Promise<ExamSubject>;
  deleteExamSubject(id: string): Promise<void>;

  listStudyPlans(): Promise<StudyPlan[]>;
  getStudyPlan(id: string): Promise<StudyPlan | null>;
  createStudyPlan(studyPlan: StudyPlan): Promise<StudyPlan>;
  updateStudyPlan(studyPlan: StudyPlan): Promise<StudyPlan>;
  deleteStudyPlan(id: string): Promise<void>;

  listDailyPlans(): Promise<DailyPlan[]>;
  getDailyPlan(id: string): Promise<DailyPlan | null>;
  createDailyPlan(dailyPlan: DailyPlan): Promise<DailyPlan>;
  updateDailyPlan(dailyPlan: DailyPlan): Promise<DailyPlan>;
  deleteDailyPlan(id: string): Promise<void>;

  listProgressLogs(): Promise<ProgressLog[]>;
  getProgressLog(id: string): Promise<ProgressLog | null>;
  createProgressLog(progressLog: ProgressLog): Promise<ProgressLog>;
  updateProgressLog(progressLog: ProgressLog): Promise<ProgressLog>;
  deleteProgressLog(id: string): Promise<void>;

  listExamResults(): Promise<ExamResult[]>;
  getExamResult(id: string): Promise<ExamResult | null>;
  createExamResult(examResult: ExamResult): Promise<ExamResult>;
  updateExamResult(examResult: ExamResult): Promise<ExamResult>;
  deleteExamResult(id: string): Promise<void>;

  listAvailabilityRules(): Promise<AvailabilityRule[]>;
  getAvailabilityRule(id: string): Promise<AvailabilityRule | null>;
  createAvailabilityRule(availabilityRule: AvailabilityRule): Promise<AvailabilityRule>;
  updateAvailabilityRule(availabilityRule: AvailabilityRule): Promise<AvailabilityRule>;
  deleteAvailabilityRule(id: string): Promise<void>;

  clear(): Promise<void>;
}
