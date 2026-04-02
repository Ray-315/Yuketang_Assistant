import { useMemo, useState } from "react";
import { SelectField } from "../components/SelectField";
import { decimal, percent } from "../lib/format";
import { StatCard } from "../components/StatCard";
import type { AssignmentOverview } from "../../shared/models";

type Props = {
  detail?: AssignmentOverview;
};

export function AssignmentDetailPage({ detail }: Props) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"completed" | "full" | "wrong" | "in_progress">("completed");
  if (!detail) {
    return <section className="page-shell"><section className="panel"><h2>从左侧选择一个作业查看详情。</h2></section></section>;
  }
  const pendingStudents = useMemo(
    () => detail.students.filter((student) => student.completionState === "ungraded"),
    [detail.students]
  );
  const filteredStudents = useMemo(() => detail.students.filter((student) => {
    const matchesQuery = !query.trim() || student.studentName.includes(query.trim());
    const matchesMode =
      (mode === "completed" && student.completionState === "completed") ||
      (mode === "full" && student.completionState === "completed" && student.score === 100) ||
      (mode === "wrong" && student.completionState === "completed" && student.wrongCount >= 3) ||
      (mode === "in_progress" && student.completionState === "in_progress");
    return matchesQuery && matchesMode;
  }), [detail.students, mode, query]);
  const modeOptions = useMemo(
    () => [
      { label: "已完成学生", value: "completed" },
      { label: "满分学生", value: "full" },
      { label: "高错题学生", value: "wrong" },
      { label: "批改中学生", value: "in_progress" }
    ],
    []
  );

  return (
    <section className="page-shell">
      <div className="page-header">
        <div>
          <p className="eyebrow">{detail.assignment.className}</p>
          <h2>{detail.assignment.title}</h2>
        </div>
      </div>
      <div className="stats-grid">
        <StatCard label="平均错题数" value={decimal(detail.averages.averageWrong)} />
        <StatCard label="平均分" value={decimal(detail.averages.averageScore)} />
        <StatCard label="满分人数" value={detail.averages.fullScoreCount} tone="accent" />
        <StatCard label="完成进度" value={`${detail.averages.completedStudents}/${detail.averages.totalStudents}`} />
      </div>
      <div className="split-grid detail-layout">
        <section className="panel detail-student-panel">
          <div className="panel-head">
            <h3>学生视图</h3>
            <span>{filteredStudents.length}</span>
          </div>
          <div className="actions">
            <input placeholder="搜索学生姓名" value={query} onChange={(event) => setQuery(event.target.value)} />
            <SelectField
              value={mode}
              options={modeOptions}
              onChange={(value) => setMode(value as "completed" | "full" | "wrong" | "in_progress")}
            />
          </div>
          <div className="list-column">
            {filteredStudents.map((student) => (
              <div key={student.studentId} className="table-row student-row">
                <div className="summary-strip">
                  <strong className="summary-strip-title">{student.studentName}</strong>
                  <span className="summary-strip-chip">{`错题：${student.wrongCount}`}</span>
                  <span className="summary-strip-chip">{`已批改：${student.gradedCount}题`}</span>
                  <span className="summary-strip-chip is-accent">
                    {student.score == null ? "未出分" : `${student.score}分`}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="pending-strip">
            <div className="panel-head">
              <h3>未评分学生</h3>
              <span>{pendingStudents.length}</span>
            </div>
            <div className="tag-flow">
              {pendingStudents.length > 0 ? pendingStudents.map((student) => (
                <span key={student.studentId} className="tag-chip muted-tag">{student.studentName}</span>
              )) : <span className="muted">暂无未评分学生</span>}
            </div>
          </div>
        </section>
        <section className="panel detail-question-panel">
          <div className="panel-head">
            <h3>题目分析</h3>
            <span>按错误率降序</span>
          </div>
          <div className="list-column">
            {detail.questionsStats.map((row) => (
              <div key={row.questionId} className={row.incorrectRate >= 0.3 ? "table-row danger" : "table-row"}>
                <div className="summary-strip">
                  <strong className="summary-strip-title">{row.questionLabel}</strong>
                  <span className={row.incorrectRate >= 0.3 ? "summary-strip-chip is-danger" : "summary-strip-chip"}>
                    {`错误率：${percent(row.incorrectRate)}`}
                  </span>
                  <span className="summary-strip-chip">{`已批改：${row.gradedCount}份`}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
