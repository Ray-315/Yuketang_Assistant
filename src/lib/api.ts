import { invoke } from "@tauri-apps/api/core";
import type {
  AdapterProfile,
  AppBootstrap,
  AssignmentOverview,
  ExportFormat,
  GradeActionInput,
  SaveAssignmentInput,
  SaveClassInput,
  SaveStudentInput,
  SessionSnapshot
} from "../../shared/models";
import type { AppSettings } from "../../shared/models";

export const bootstrapApp = () => invoke<AppBootstrap>("bootstrap_app");
export const saveClass = (input: SaveClassInput) => invoke("save_class", { input });
export const deleteClass = (id: string) => invoke("delete_class", { id });
export const saveStudent = (input: SaveStudentInput) => invoke("save_student", { input });
export const deleteStudent = (id: string) => invoke("delete_student", { id });
export const importStudents = (classId: string, path: string) =>
  invoke("import_students", { classId, path });
export const saveAssignment = (input: SaveAssignmentInput) => invoke("save_assignment", { input });
export const getAssignmentDetail = (id: string) =>
  invoke<AssignmentOverview>("get_assignment_detail", { id });
export const startGradingSession = (assignmentId: string) =>
  invoke<SessionSnapshot>("start_grading_session", { assignmentId });
export const sendManualGrade = (input: GradeActionInput) =>
  invoke<SessionSnapshot>("grade_from_desktop", { input });
export const manualSelectStudent = (studentId: string) =>
  invoke<SessionSnapshot>("manual_select_student", { studentId });
export const manualSelectQuestion = (questionId: string) =>
  invoke<SessionSnapshot>("manual_select_question", { questionId });
export const undoLastGrade = () => invoke<SessionSnapshot>("undo_last_grade");
export const saveSettings = (input: AppSettings) => invoke("save_settings", { input });
export const saveAdapterProfile = (input: AdapterProfile) =>
  invoke("save_adapter_profile", { input });
export const createBackup = () => invoke("create_backup");
export const restoreBackup = (id: string) => invoke("restore_backup", { id });
export const exportAssignment = (assignmentId: string, format: ExportFormat, path: string) =>
  invoke("export_assignment", { assignmentId, format, path });
export const generateStudentTemplate = (format: ExportFormat, path: string) =>
  invoke("generate_student_template", { format, path });
