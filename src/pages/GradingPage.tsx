import { useMemo } from "react";
import { SelectField } from "../components/SelectField";
import { startGradingSession, manualSelectQuestion, manualSelectStudent, undoLastGrade } from "../lib/api";
import type { AssignmentOverview, AssignmentRecord, SessionSnapshot, StudentRecord } from "../../shared/models";

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

export function GradingPage({ assignments, students, session, selectedAssignmentId, assignmentDetail, onRefresh, onSession, onGrade }: Props) {
  const studentOptions = useMemo(
    () => [{ label: "选择学生", value: "" }, ...students.map((student) => ({ label: student.name, value: student.id }))],
    [students]
  );
  const questionOptions = useMemo(
    () => [{ label: "选择题号", value: "" }, ...(assignmentDetail?.questions ?? []).map((question) => ({ label: question.label, value: question.id }))],
    [assignmentDetail]
  );

  return (
    <section className="page-shell">
      <div className="page-header">
        <div>
          <p className="eyebrow">Grading Console</p>
          <h2>{session.assignmentTitle ?? "先选择作业并开始批改"}</h2>
          <p className="muted">围绕当前学生持续推进题号，扩展识别失败时允许桌面端立刻接管。</p>
        </div>
        <div className="actions">
          <button onClick={async () => { if (selectedAssignmentId) onSession(await startGradingSession(selectedAssignmentId)); await onRefresh(); }}>开始批改</button>
          <button className="ghost-button" onClick={async () => onSession(await undoLastGrade())}>撤销上一题</button>
        </div>
      </div>
      <div className="stats-grid">
        <article className="stat-card accent"><p>当前学生</p><strong>{session.currentStudentName ?? "未锁定"}</strong></article>
        <article className="stat-card"><p>当前题号</p><strong>{session.currentQuestionLabel ?? "待机"}</strong></article>
        <article className="stat-card"><p>进度</p><strong>{session.questionIndex} / {session.questionCount}</strong></article>
        <article className="stat-card alert"><p>预估得分</p><strong>{session.predictedScore}</strong></article>
      </div>
      <div className="split-grid grading-layout">
        <section className="panel">
          <div className="panel-head">
            <h3>快速录入</h3>
            <span>{session.lastAction ?? "暂无操作"}</span>
          </div>
          <div className="grading-actions">
            <button className="primary-action" onClick={() => onGrade("correct")}>A / 对</button>
            <button className="danger-action" onClick={() => onGrade("incorrect")}>S / 错</button>
          </div>
        </section>
        <section className="panel">
          <div className="panel-head">
            <h3>手动兜底</h3>
            <span>自动识别失败时使用</span>
          </div>
          <SelectField
            value={session.currentStudentId ?? ""}
            options={studentOptions}
            onChange={async (value) => {
              if (!value) return;
              onSession(await manualSelectStudent(value));
            }}
            placeholder="选择学生"
          />
          <SelectField
            value={session.currentQuestionId ?? ""}
            options={questionOptions}
            onChange={async (value) => {
              if (!value) return;
              onSession(await manualSelectQuestion(value));
            }}
            placeholder="选择题号"
          />
        </section>
      </div>
      <section className="panel">
        <div className="panel-head">
          <h3>会话状态</h3>
          <span>{assignments.length} 份作业可用</span>
        </div>
        <div className="row-card">
          <div>
            <strong>连接状态</strong>
            <p>{session.connectionState}</p>
          </div>
          <small>{session.matchState}</small>
        </div>
      </section>
    </section>
  );
}
