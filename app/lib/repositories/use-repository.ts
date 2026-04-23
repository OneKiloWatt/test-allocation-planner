import { useMemo } from "react";

import { supabase } from "@/lib/supabase";
import { useExamStore } from "@/stores";
import { createLocalStorageRepository, type IExamRepository } from "@/lib/repositories";
import { SupabaseRepository } from "./supabase-repository";

export function useRepository(): IExamRepository {
  const authUser = useExamStore((state) => state.authUser);

  return useMemo(() => {
    if (authUser != null && supabase != null) {
      return new SupabaseRepository(supabase);
    }
    return createLocalStorageRepository();
  }, [authUser]);
}
