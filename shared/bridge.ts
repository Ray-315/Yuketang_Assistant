import type { AdapterProfile, GradeActionInput, SessionSnapshot, StudentRecord } from "./models";

export type StudentIdentifyRequest = {
  rawName: string;
  sourceUrl: string;
};

export type StudentIdentifyResult = {
  snapshot: SessionSnapshot;
  matchedStudent?: StudentRecord | null;
  candidates: StudentRecord[];
};

export type GradeActionRequest = GradeActionInput & {
  sourceUrl?: string;
};

export type UndoRequest = {
  rawStudentName?: string;
};

export type SessionStateResponse = {
  snapshot: SessionSnapshot;
  adapters: AdapterProfile[];
};
