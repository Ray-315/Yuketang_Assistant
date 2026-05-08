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

const pickSelectedClassId = (payload: AppBootstrap, currentClassId?: string) =>
  payload.classes.some((item) => item.id === currentClassId) ? currentClassId : payload.classes[0]?.id;

const pickSelectedAssignmentId = (
  payload: AppBootstrap,
  selectedClassId?: string,
  currentAssignmentId?: string
) => {
  const visibleAssignments = selectedClassId
    ? payload.assignments.filter((item) => item.classId === selectedClassId)
    : payload.assignments;
  return visibleAssignments.some((item) => item.id === currentAssignmentId)
    ? currentAssignmentId
    : visibleAssignments[0]?.id;
};

const emptyBootstrap: AppBootstrap = {
  classes: [],
  students: [],
  assignments: [],
  settings: { bridgePort: 48123, autoBackupEnabled: true, backupDirectory: "", defaultScorePolicy: { thresholdRatio: 0.3, thresholdRounding: "ceil", bands: [] }, uiMode: "zen" },
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
      const selectedClassId = pickSelectedClassId(payload);
      const selectedAssignmentId = pickSelectedAssignmentId(payload, selectedClassId);
      set({
        ...payload,
        selectedClassId,
        selectedAssignmentId,
        loading: false
      });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },
  refreshAll: async () => {
    const payload = await api.bootstrapApp();
    const current = get();
    const selectedClassId = pickSelectedClassId(payload, current.selectedClassId);
    const selectedAssignmentId = pickSelectedAssignmentId(payload, selectedClassId, current.selectedAssignmentId);
    set({
      ...payload,
      selectedClassId,
      selectedAssignmentId,
      assignmentDetail:
        current.assignmentDetail && current.assignmentDetail.assignment.id === selectedAssignmentId
          ? current.assignmentDetail
          : undefined,
    });
  },
  selectAssignment: async (selectedAssignmentId) => {
    set({
      selectedAssignmentId,
      activeView: selectedAssignmentId ? "assignment-detail" : "dashboard",
      error: undefined,
    });
    if (!selectedAssignmentId) {
      set({ assignmentDetail: undefined });
      return;
    }
    try {
      const assignmentDetail = await api.getAssignmentDetail(selectedAssignmentId);
      if (get().selectedAssignmentId !== selectedAssignmentId) return;
      set({ assignmentDetail, activeView: "assignment-detail" });
    } catch (error) {
      if (get().selectedAssignmentId !== selectedAssignmentId) return;
      set({
        assignmentDetail: undefined,
        error: `加载作业详情失败：${String(error)}`
      });
    }
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
