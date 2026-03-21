import { useState } from "react";
import { deleteClass, saveClass } from "../../lib/api";
import { dateTime, decimal } from "../../lib/format";
import { MacButton, MacField, MacInput, MacTextarea } from "../components/MacControls";
import { MacListRow, MacPanel, MacStatCard } from "../components/MacSurface";
import type { AssignmentRecord, BackupRecord, ClassRecord, SessionSnapshot } from "../../../shared/models";

type Props = {
  classes: ClassRecord[];
  assignments: AssignmentRecord[];
  backups: BackupRecord[];
  session: SessionSnapshot;
  onRefresh: () => Promise<void>;
};

export function MacDashboardPage({ classes, assignments, backups, session, onRefresh }: Props) {
  const [form, setForm] = useState({ name: "", subject: "", notes: "" });
  const [createOpen, setCreateOpen] = useState(false);
  const totalStudents = classes.reduce((sum, item) => sum + item.studentCount, 0);
  const avgScore = assignments.length
    ? decimal(assignments.reduce((sum, item) => sum + item.averageScore, 0) / assignments.length)
    : "0";
  const connectionLabel = session.connectionState === "connected" ? "扩展在线" : "等待扩展";

  return (
    <section className="mac-page mac-page-dashboard">
      <div className="mac-spotlight">
        <div className="mac-spotlight-main">
          <span className="mac-kicker">Overview</span>
          <h2>把今天的批改节奏收进一块干净、稳定的工作台。</h2>
          <p>减少花哨背景和噪音，只保留最常用的班级、作业、会话和回看入口。</p>
          <div className="mac-chip-wrap">
            <span className="mac-chip">{classes.length} 个班级</span>
            <span className="mac-chip">{assignments.length} 份作业</span>
            <span className="mac-chip">{totalStudents} 名学生</span>
          </div>
        </div>
        <div className="mac-spotlight-side">
          <div className="mac-status-card">
            <div className="mac-callout">
              <span className={`mac-session-dot is-${session.connectionState}`}></span>
              <div>
                <strong>{connectionLabel}</strong>
                <small>{session.currentStudentName ?? "尚未识别学生"}</small>
              </div>
            </div>
            <div className="mac-mini-grid">
              <div className="mac-mini-stat">
                <span>当前题号</span>
                <strong>{session.currentQuestionLabel ?? "待机"}</strong>
              </div>
              <div className="mac-mini-stat">
                <span>预估得分</span>
                <strong>{session.predictedScore}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mac-stat-grid">
        <MacStatCard label="班级总数" value={classes.length} note="冻结花名册" />
        <MacStatCard label="学生总数" value={totalStudents} note="跨班级成员" />
        <MacStatCard label="作业总数" value={assignments.length} note="支持章节题号" />
        <MacStatCard label="平均作业分" value={avgScore} note="仅统计已完成学生" tone="accent" />
      </div>

      <div className="mac-dashboard-grid">
        <MacPanel
          className="mac-dashboard-panel"
          title="班级管理"
          meta={`${classes.length} 个班级`}
          actions={<MacButton onClick={() => setCreateOpen(true)}>新增班级</MacButton>}
        >
          <div className="mac-dashboard-pane">
            <div className="mac-callout mac-dashboard-callout">
              <div>
                <strong>把班级创建收进弹窗，首页只保留摘要和列表。</strong>
                <small>减少常驻表单占高，新增时再填班级名称、学科和备注。</small>
              </div>
            </div>
            <div className="mac-list">
              {classes.length > 0 ? classes.slice(0, 6).map((item) => (
                <MacListRow
                  key={item.id}
                  body={<><strong>{item.name}</strong><small>{item.studentCount} 名学生 · {item.assignmentCount} 份作业</small></>}
                  trailing={<MacButton variant="ghost" size="sm" onClick={async () => { await deleteClass(item.id); await onRefresh(); }}>删除</MacButton>}
                />
              )) : <div className="mac-empty">还没有班级，点右上角“新增班级”先建一个。</div>}
            </div>
          </div>
        </MacPanel>

        <MacPanel className="mac-dashboard-panel" title="最近作业" meta={`${assignments.length} 份`}>
          <div className="mac-dashboard-pane">
            <div className="mac-list">
              {assignments.length > 0 ? assignments.slice(0, 8).map((item) => (
                <MacListRow
                  key={item.id}
                  body={<><strong>{item.title}</strong><small>{item.className} · {item.questionCount} 题</small></>}
                  trailing={<span className="mac-inline-meta">{item.completedStudents}/{item.rosterCount}</span>}
                />
              )) : <div className="mac-empty">当前还没有作业。</div>}
            </div>
          </div>
        </MacPanel>

        <MacPanel className="mac-dashboard-panel" title="会话与备份" meta={`${backups.length} 条备份`}>
          <div className="mac-dashboard-pane">
            <div className="mac-callout">
              <span className={`mac-session-dot is-${session.connectionState}`}></span>
              <div>
                <strong>{session.currentStudentName ?? "当前没有锁定学生"}</strong>
                <small>{session.currentQuestionLabel ?? "等待开始批改"}</small>
              </div>
            </div>
            <div className="mac-list">
              {backups.length > 0 ? backups.slice(0, 6).map((item) => (
                <MacListRow
                  key={item.id}
                  body={<><strong>{dateTime(item.createdAt)}</strong><small>{item.note || item.filePath}</small></>}
                  trailing={<span className="mac-inline-meta">{Math.round(item.sizeBytes / 1024)} KB</span>}
                />
              )) : <div className="mac-empty">当前还没有备份记录。</div>}
            </div>
          </div>
        </MacPanel>
      </div>

      {createOpen ? (
        <div className="mac-modal-backdrop" onClick={() => setCreateOpen(false)}>
          <section className="mac-modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="mac-modal-head">
              <div className="mac-panel-copy">
                <h3>新增班级</h3>
                <span className="mac-panel-meta">把班级信息写进弹窗，首页保持紧凑。</span>
              </div>
            </div>
            <div className="mac-modal-body">
              <div className="mac-form-stack">
                <MacField label="班级名称">
                  <MacInput value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="例如 高数1下" />
                </MacField>
                <MacField label="学科">
                  <MacInput value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} placeholder="例如 高等数学" />
                </MacField>
                <MacField label="备注">
                  <MacTextarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="记录班级说明或教学备注" />
                </MacField>
              </div>
            </div>
            <div className="mac-modal-footer">
              <MacButton variant="ghost" onClick={() => setCreateOpen(false)}>取消</MacButton>
              <MacButton onClick={async () => {
                if (!form.name.trim()) return;
                await saveClass(form);
                setForm({ name: "", subject: "", notes: "" });
                setCreateOpen(false);
                await onRefresh();
              }}>创建班级</MacButton>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
