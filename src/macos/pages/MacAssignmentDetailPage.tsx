import { useMemo, useState } from "react";
import { decimal, percent } from "../../lib/format";
import { MacField, MacInput, MacSelect } from "../components/MacControls";
import { MacListRow, MacPanel, MacStatCard } from "../components/MacSurface";
import type { AssignmentOverview } from "../../../shared/models";

type Props = {
  detail?: AssignmentOverview;
};

export function MacAssignmentDetailPage({ detail }: Props) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"completed" | "full" | "wrong" | "in_progress">("completed");
  const students = detail?.students ?? [];
  const pendingStudents = useMemo(
    () => students.filter((student) => student.completionState === "ungraded"),
    [students]
  );
  const filteredStudents = useMemo(
    () => students.filter((student) => {
      const matchesQuery = !query.trim() || student.studentName.includes(query.trim());
      const matchesMode =
        (mode === "completed" && student.completionState === "completed") ||
        (mode === "full" && student.completionState === "completed" && student.score === 100) ||
        (mode === "wrong" && student.completionState === "completed" && student.wrongCount >= 3) ||
        (mode === "in_progress" && student.completionState === "in_progress");
      return matchesQuery && matchesMode;
    }),
    [students, mode, query]
  );

  if (!detail) {
    return <section className="mac-page"><MacPanel title="作业详情"><div className="mac-empty">先从工具栏选择一个作业。</div></MacPanel></section>;
  }

  return (
    <section className="mac-page">
      <div className="mac-assignment-strip">
        <div>
          <span className="mac-kicker">Assignment Overview</span>
          <h2>{detail.assignment.title}</h2>
          <p>{detail.assignment.className} · {detail.questions.length} 题 · {detail.assignment.completedStudents}/{detail.assignment.rosterCount} 已完成</p>
        </div>
        <div className="mac-chip-wrap">
          <span className="mac-chip">平均分 {decimal(detail.averages.averageScore)}</span>
          <span className="mac-chip">满分 {detail.averages.fullScoreCount}</span>
        </div>
      </div>
      <div className="mac-stat-grid">
        <MacStatCard label="平均错题数" value={decimal(detail.averages.averageWrong)} />
        <MacStatCard label="平均分" value={decimal(detail.averages.averageScore)} tone="accent" />
        <MacStatCard label="满分人数" value={detail.averages.fullScoreCount} />
        <MacStatCard label="完成进度" value={`${detail.averages.completedStudents}/${detail.averages.totalStudents}`} />
      </div>
      <div className="mac-detail-grid">
        <MacPanel title={detail.assignment.title} meta={detail.assignment.className}>
          <div className="mac-filter-row">
            <MacField label="搜索"><MacInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索学生姓名" /></MacField>
            <MacField label="筛选">
              <MacSelect
                value={mode}
                onChange={(value) => setMode(value as "completed" | "full" | "wrong" | "in_progress")}
                options={[
                  { label: "已完成学生", value: "completed" },
                  { label: "满分学生", value: "full" },
                  { label: "高错题学生", value: "wrong" },
                  { label: "批改中学生", value: "in_progress" }
                ]}
              />
            </MacField>
          </div>
          <div className="mac-list">
            {filteredStudents.length > 0 ? filteredStudents.map((student) => (
              <MacListRow
                key={student.studentId}
                body={
                  <div className="mac-summary-strip">
                    <strong className="mac-summary-title">{student.studentName}</strong>
                    <span className="mac-summary-chip">{`错题：${student.wrongCount}`}</span>
                    <span className="mac-summary-chip">{`已批改：${student.gradedCount}题`}</span>
                    <span className="mac-summary-chip is-accent">
                      {student.score == null ? "未出分" : `${student.score}分`}
                    </span>
                  </div>
                }
              />
            )) : <div className="mac-empty">当前筛选条件下没有学生。</div>}
          </div>
          <div className="mac-subpanel">
            <div className="mac-subpanel-head">
              <strong>未评分学生</strong>
              <span>{pendingStudents.length}</span>
            </div>
            <div className="mac-chip-wrap">
              {pendingStudents.length > 0 ? pendingStudents.map((student) => (
                <span key={student.studentId} className="mac-chip is-muted">{student.studentName}</span>
              )) : <div className="mac-empty">暂无未评分学生</div>}
            </div>
          </div>
        </MacPanel>

        <MacPanel title="题目分析" meta="按错误率降序">
          <div className="mac-list">
            {detail.questionsStats.map((row) => (
              <MacListRow
                key={row.questionId}
                danger={row.incorrectRate >= 0.3}
                body={
                  <div className="mac-summary-strip">
                    <strong className="mac-summary-title">{row.questionLabel}</strong>
                    <span className={row.incorrectRate >= 0.3 ? "mac-summary-chip is-danger" : "mac-summary-chip"}>
                      {`错误率：${percent(row.incorrectRate)}`}
                    </span>
                    <span className="mac-summary-chip">{`已批改：${row.gradedCount}份`}</span>
                  </div>
                }
              />
            ))}
          </div>
        </MacPanel>
      </div>
    </section>
  );
}
