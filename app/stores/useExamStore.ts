import { create } from "zustand";

type ExamStoreState = {
  activeExamId: string | null;
  isScreenSharing: boolean;
  setActiveExamId: (examId: string | null) => void;
  setScreenSharing: (isScreenSharing: boolean) => void;
  clearActiveExam: () => void;
  reset: () => void;
};

const initialState = {
  activeExamId: null,
  isScreenSharing: false,
};

export const useExamStore = create<ExamStoreState>()((set) => ({
  ...initialState,
  setActiveExamId: (activeExamId) => set({ activeExamId }),
  setScreenSharing: (isScreenSharing) => set({ isScreenSharing }),
  clearActiveExam: () => set({ activeExamId: null }),
  reset: () => set(initialState),
}));

export type { ExamStoreState };
