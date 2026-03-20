import { useState } from "react";
import { deleteClass, saveClass } from "../lib/api";
import { decimal, dateTime } from "../lib/format";
import { StatCard } from "../components/StatCard";
import type { AssignmentRecord, BackupRecord, ClassRecord, SessionSnapshot } from "../../shared/models";

type Props = {
  classes: ClassRecord[];
  assignments: AssignmentRecord[];
  backups: BackupRecord[];
  session: SessionSnapshot;
  onRefresh: () => Promise<void>;
};

export function DashboardPage({ classes, assignments, backups, session, onRefresh }: Props) {
  const [form, setForm] = useState({ name: "", subject: "", notes: "" });
  const totalStudents = classes.reduce((sum, item) => sum + item.studentCount, 0);
  const avgScore = assignments.length
    ? decimal(assignments.reduce((sum, item) => sum + item.averageScore, 0) / assignments.length)
    : "0";

  return (
    <section className="page-shell">
      <div className="hero-panel dashboard-hero">
        <div>
          <p className="eyebrow">Today&apos;s Control Surface</p>
          <h2>把批改链路和统计链路放在同一块桌面里。</h2>
          <p className="muted">保持同一窗口里完成建班、建作业、批改和复盘，减少工具切换造成的打断。</p>
        </div>
        <div className="hero-status">
          <span className={`dot ${session.connectionState}`}></span>
          <strong>{session.connectionState === "connected" ? "扩展在线" : "等待扩展"}</strong>
          <small>{session.currentStudentName ?? "尚未识别学生"}</small>
        </div>
      </div>
      <div className="stats-grid">
        <StatCard label="班级总数" value={classes.length} note="按班级冻结花名册" />
        <StatCard label="学生总数" value={totalStudents} note="跨班级成员关系管理" />
        <StatCard label="作业总数" value={assignments.length} note="支持章节与自定义题标" />
        <StatCard label="平均作业分" value={avgScore} tone="accent" note="仅统计已创建作业" />
      </div>
      <div className="split-grid dashboard-grid">
        <section className="panel form-panel">
          <div className="panel-head">
            <h3>班级管理</h3>
            <span>{classes.length}</span>
          </div>
          <input placeholder="班级名称" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          <input placeholder="学科" value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} />
          <textarea placeholder="备注" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
          <button onClick={async () => {
            if (!form.name.trim()) return;
            await saveClass(form);
            setForm({ name: "", subject: "", notes: "" });
            await onRefresh();
          }}>新增班级</button>
          {classes.slice(0, 4).map((item) => (
            <div key={item.id} className="row-card">
              <div>
                <strong>{item.name}</strong>
                <p>{item.studentCount} 名学生 · {item.assignmentCount} 份作业</p>
              </div>
              <button className="text-button" onClick={async () => { await deleteClass(item.id); await onRefresh(); }}>删除</button>
            </div>
          ))}
        </section>
        <section className="panel">
          <div className="panel-head">
            <h3>最近作业</h3>
            <span>{assignments.length}</span>
          </div>
          {assignments.slice(0, 6).map((item) => (
            <div key={item.id} className="row-card">
              <div>
                <strong>{item.title}</strong>
                <p>{item.className} · {item.questionCount} 题</p>
              </div>
              <small>{item.completedStudents}/{item.rosterCount}</small>
            </div>
          ))}
        </section>
        <section className="panel">
          <div className="panel-head">
            <h3>备份状态</h3>
            <span>{backups.length}</span>
          </div>
          {backups.slice(0, 5).map((item) => (
            <div key={item.id} className="row-card">
              <div>
                <strong>{dateTime(item.createdAt)}</strong>
                <p>{item.note}</p>
              </div>
              <small>{Math.round(item.sizeBytes / 1024)} KB</small>
            </div>
          ))}
        </section>
      </div>
    </section>
  );
}
