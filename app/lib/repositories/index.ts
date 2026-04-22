export {
  CorruptedStorageError,
  RecordConflictError,
  RecordNotFoundError,
  RepositoryUnavailableError,
  StorageVersionMismatchError,
  type IExamRepository,
} from "./exam-repository";
export {
  GUEST_SESSION_STORAGE_KEY,
  GUEST_SESSION_STORAGE_VERSION,
  LocalStorageRepository,
  createLocalStorageRepository,
} from "./local-storage-repository";
