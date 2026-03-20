import { create } from "zustand";
import type {
  AdapterProfile,
  AppBootstrap,
  AppSettings,
  AssignmentOverview,
  AssignmentRecord,
  BackupRecord,
  ClassRecord,
  GradeActionInput,
  StudentRecord
} from "../../shared/models";
import * as api from "../lib/api";

export type AppView = "dashboard" | "students" | "assignment-form" | "assignment-detail" | "grading" | "settings";

type AppState = AppBootstrap & {
  activeView: AppView;
  selectedClassId?: string;
  selectedAssignmentId?: string;
  assignmentDetail?: AssignmentOverview;
  loading: boolean;
  error?: string;
  initialize: () => Promise<void>;
  setView: (view: AppView) => void;
  selectClass: (id?: string) => void;
  selectAssignment: (id?: string) => Promise<void>;
  refreshAll: () => Promise<void>;
  runGrade: (input: GradeActionInput) => Promise<void>;
  applyBootstrap: (payload: AppBootstrap) => void;
};

const emptyBootstrap: AppBootstrap = {
  classes: [],
  students: [],
  assignments: [],
  settings: { bridgePort: 48123, autoBackupEnabled: true, backupDirectory: "", defaultScorePolicy: { thresholdRatio: 0.3, thresholdRounding: "ceil", bands: [] } },
  adapters: [],
  backups: [],
  session: { questionIndex: 0, questionCount: 0, gradedCount: 0, wrongCount: 0, predictedScore: 0, currentStudentCompleted: false, connectionState: "idle", matchState: "missing", matchCandidates: [] }
};

export const useAppStore = create<AppState>((set, get) => ({
  ...emptyBootstrap,
  activeView: "dashboard",
  loading: false,
  applyBootstrap: (payload) => set({ ...payload }),
  setView: (activeView) => set({ activeView }),
  selectClass: (selectedClassId) => set({ selectedClassId }),
  initialize: async () => {
    set({ loading: true, error: undefined });
    try {
      const payload = await api.bootstrapApp();
      set({
        ...payload,
        selectedClassId: payload.classes[0]?.id,
        selectedAssignmentId: payload.assignments[0]?.id,
        loading: false
      });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },
  refreshAll: async () => {
    const payload = await api.bootstrapApp();
    set({ ...payload });
  },
  selectAssignment: async (selectedAssignmentId) => {
    set({ selectedAssignmentId, assignmentDetail: undefined });
    if (!selectedAssignmentId) return;
    const assignmentDetail = await api.getAssignmentDetail(selectedAssignmentId);
    set({ assignmentDetail, activeView: "assignment-detail" });
  },
  runGrade: async (input) => {
    const session = await api.sendManualGrade(input);
    set({ session });
    const selectedAssignmentId = get().selectedAssignmentId;
    if (selectedAssignmentId) {
      const assignmentDetail = await api.getAssignmentDetail(selectedAssignmentId);
      set({ assignmentDetail });
    }
  }
}));

export const useScopedData = () => {
  const state = useAppStore();
  const currentClass = state.classes.find((item) => item.id === state.selectedClassId);
  const assignments = state.selectedClassId
    ? state.assignments.filter((item) => item.classId === state.selectedClassId)
    : state.assignments;
  const students = state.selectedClassId
    ? state.students.filter((item) => item.classIds.includes(state.selectedClassId!))
    : state.students;

  return {
    ...state,
    currentClass,
    assignments,
    students
  };
};
