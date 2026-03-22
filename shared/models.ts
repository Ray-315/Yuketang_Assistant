import type { ScorePolicy } from "./scoring";

export type GradeStatus = "ungraded" | "correct" | "incorrect" | "skipped";
export type GradeActionKind = "correct" | "incorrect" | "undo" | "skip";
export type ExportFormat = "csv" | "xlsx";
export type MatchState = "matched" | "ambiguous" | "missing";

export type ClassRecord = {
  id: string;
  name: string;
  subject?: string | null;
  notes?: string | null;
  studentCount: number;
  assignmentCount: number;
  createdAt: string;
};

export type StudentRecord = {
  id: string;
  name: string;
  studentNo?: string | null;
  notes?: string | null;
  classIds: string[];
  createdAt: string;
};

export type StudentImportRow = {
  name: string;
  studentNo?: string | null;
  notes?: string | null;
};

export type QuestionRecord = {
  id: string;
  label: string;
  position: number;
};

export type AssignmentRecord = {
  id: string;
  classId: string;
  className: string;
  title: string;
  chapter?: string | null;
  questionCount: number;
  rosterCount: number;
  completedStudents: number;
  averageScore: number;
  createdAt: string;
};

export type StudentResultRow = {
  studentId: string;
  studentName: string;
  wrongCount: number;
  gradedCount: number;
  score?: number | null;
  completionState: "ungraded" | "in_progress" | "completed";
  results: Array<{ questionId: string; questionLabel: string; status: GradeStatus }>;
};

export type QuestionStatRow = {
  questionId: string;
  questionLabel: string;
  gradedCount: number;
  correctCount: number;
  incorrectCount: number;
  correctRate: number;
  incorrectRate: number;
};

export type AssignmentOverview = {
  assignment: AssignmentRecord;
  questions: QuestionRecord[];
  students: StudentResultRow[];
  questionsStats: QuestionStatRow[];
  averages: {
    averageWrong: number;
    averageScore: number;
    fullScoreCount: number;
    completedStudents: number;
    totalStudents: number;
  };
};

export type AdapterProfile = {
  id: string;
  name: string;
  hostPattern: string;
  primarySelector: string;
  fallbackSelectors: string[];
  anchorTexts: string[];
  enabled: boolean;
  createdAt: string;
};

export type BackupRecord = {
  id: string;
  filePath: string;
  createdAt: string;
  sizeBytes: number;
  note: string;
};

export type UiMode = "zen" | "flat";

export type AppSettings = {
  bridgePort: number;
  autoBackupEnabled: boolean;
  backupDirectory: string;
  defaultScorePolicy: ScorePolicy;
  uiMode: UiMode;
};

export type SessionSnapshot = {
  sessionId?: string | null;
  assignmentId?: string | null;
  assignmentTitle?: string | null;
  className?: string | null;
  currentStudentId?: string | null;
  currentStudentName?: string | null;
  currentQuestionId?: string | null;
  currentQuestionLabel?: string | null;
  questionIndex: number;
  questionCount: number;
  gradedCount: number;
  wrongCount: number;
  predictedScore: number;
  currentStudentCompleted: boolean;
  lastAction?: string | null;
  connectionState: "idle" | "connected" | "disconnected";
  matchState: MatchState;
  matchCandidates: StudentRecord[];
};

export type AppBootstrap = {
  classes: ClassRecord[];
  students: StudentRecord[];
  assignments: AssignmentRecord[];
  settings: AppSettings;
  adapters: AdapterProfile[];
  backups: BackupRecord[];
  session: SessionSnapshot;
};

export type SaveClassInput = {
  id?: string;
  name: string;
  subject?: string;
  notes?: string;
};

export type SaveStudentInput = {
  id?: string;
  name: string;
  studentNo?: string;
  notes?: string;
  classIds: string[];
};

export type SaveAssignmentInput = {
  id?: string;
  classId: string;
  title: string;
  chapter?: string;
  questionLabels: string[];
  scoringPolicy: ScorePolicy;
};

export type GradeActionInput = {
  action: GradeActionKind;
  studentId?: string;
  questionId?: string;
  rawStudentName?: string;
  clientEventId?: string;
};
