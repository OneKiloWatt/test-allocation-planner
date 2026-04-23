import { useMemo } from "react";

import { createLocalStorageRepository, type IExamRepository } from "@/lib/repositories";

export function useRepository(): IExamRepository {
  return useMemo(() => createLocalStorageRepository(), []);
}
