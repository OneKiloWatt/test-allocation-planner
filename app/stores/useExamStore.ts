import { create } from "zustand";
import type { User } from "@supabase/supabase-js";

type ExamStoreState = {
  activeExamId: string | null;
  authUser: User | null;
  isAuthLoading: boolean;
  isScreenSharing: boolean;
  setActiveExamId: (examId: string | null) => void;
  setAuthUser: (authUser: User | null) => void;
  setAuthLoading: (isAuthLoading: boolean) => void;
  setScreenSharing: (isScreenSharing: boolean) => void;
  clearActiveExam: () => void;
  reset: () => void;
};

const initialState = {
  activeExamId: null,
  authUser: null,
  isAuthLoading: true,
  isScreenSharing: false,
};

export const useExamStore = create<ExamStoreState>()((set) => ({
  ...initialState,
  setActiveExamId: (activeExamId) => set({ activeExamId }),
  setAuthUser: (authUser) => set({ authUser }),
  setAuthLoading: (isAuthLoading) => set({ isAuthLoading }),
  setScreenSharing: (isScreenSharing) => set({ isScreenSharing }),
  clearActiveExam: () => set({ activeExamId: null }),
  reset: () => set(initialState),
}));

export type { ExamStoreState };
