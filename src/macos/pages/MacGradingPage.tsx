import { useMemo } from "react";
import { manualSelectQuestion, manualSelectStudent, startGradingSession, undoLastGrade } from "../../lib/api";
import { MacButton, MacField, MacSelect } from "../components/MacControls";
import { MacPanel, MacStatCard } from "../components/MacSurface";
import type { AssignmentOverview, AssignmentRecord, SessionSnapshot, StudentRecord } from "../../../shared/models";

type Props = {
  assignments: AssignmentRecord[];
  students: StudentRecord[];
  session: SessionSnapshot;
  selectedAssignmentId?: string;
  assignmentDetail?: AssignmentOverview;
  onRefresh: () => Promise<void>;
  onSession: (snapshot: SessionSnapshot) => void;
  onGrade: (action: "correct" | "incorrect") => Promise<void>;
};

export function MacGradingPage({ assignments, students, session, selectedAssignmentId, assignmentDetail, onRefresh, onSession, onGrade }: Props) {
  const questionOptions = useMemo(
    () => [{ label: "选择题号", value: "" }, ...(assignmentDetail?.questions ?? []).map((question) => ({ label: question.label, value: question.id }))],
    [assignmentDetail]
  );
  const studentOptions = useMemo(
    () => [{ label: "选择学生", value: "" }, ...students.map((student) => ({ label: student.name, value: student.id }))],
    [students]
  );

  return (
    <section className="mac-page">
      <div className="mac-grading-hero">
        <div className="mac-grading-focus">
          <span className="mac-kicker">Live Grading</span>
          <h2>{session.currentStudentName ?? "等待识别学生"}</h2>
          <p>
            {session.currentStudentCompleted
              ? `当前学生已完成，分数 ${session.predictedScore} 分`
              : session.currentQuestionLabel ?? "先开始批改或从扩展识别学生。"}
          </p>
          <div className="mac-chip-wrap">
            <span className="mac-chip">连接 {session.connectionState}</span>
            <span className="mac-chip">匹配 {session.matchState}</span>
            <span className="mac-chip">{session.questionIndex}/{session.questionCount || 0}</span>
          </div>
        </div>
      </div>
      <div className="mac-stat-grid">
        <MacStatCard label="当前学生" value={session.currentStudentName ?? "未锁定"} note={session.assignmentTitle ?? "未开始"} />
        <MacStatCard label="当前题号" value={session.currentQuestionLabel ?? "待机"} />
        <MacStatCard label="进度" value={`${session.questionIndex} / ${session.questionCount}`} />
        <MacStatCard label="预估得分" value={session.predictedScore} tone="accent" />
      </div>

      <div className="mac-main-grid">
        <MacPanel title="快捷录入" meta={session.lastAction ?? "暂无操作"}>
          <div className="mac-action-grid">
            <MacButton className="mac-action-button" variant="primary" onClick={() => onGrade("correct")}>A / 对</MacButton>
            <MacButton className="mac-action-button" variant="danger" onClick={() => onGrade("incorrect")}>S / 错</MacButton>
            <MacButton className="mac-action-button" variant="secondary" onClick={async () => { if (selectedAssignmentId) onSession(await startGradingSession(selectedAssignmentId)); await onRefresh(); }}>开始批改</MacButton>
            <MacButton className="mac-action-button" variant="ghost" onClick={async () => onSession(await undoLastGrade())}>撤销上一题</MacButton>
          </div>
        </MacPanel>

        <MacPanel title="手动兜底" meta="自动识别失败时使用">
          <div className="mac-form-stack">
            <MacField label="学生">
              <MacSelect
                value={session.currentStudentId ?? ""}
                options={studentOptions}
                onChange={async (value) => {
                  if (!value) return;
                  onSession(await manualSelectStudent(value));
                }}
              />
            </MacField>
            <MacField label="题号">
              <MacSelect
                value={session.currentQuestionId ?? ""}
                options={questionOptions}
                onChange={async (value) => {
                  if (!value) return;
                  onSession(await manualSelectQuestion(value));
                }}
              />
            </MacField>
            <div className="mac-callout">
              <div>
                <strong>{assignments.length} 份作业可用</strong>
                <small>连接状态：{session.connectionState} · 匹配状态：{session.matchState}</small>
              </div>
            </div>
          </div>
        </MacPanel>
      </div>
    </section>
  );
}
