import { useMemo, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { deleteStudent, importStudents, saveStudent } from "../../lib/api";
import { MacButton, MacField, MacInput, MacTextarea } from "../components/MacControls";
import { MacListRow, MacPanel } from "../components/MacSurface";
import type { ClassRecord, StudentRecord } from "../../../shared/models";

type Props = {
  currentClass?: ClassRecord;
  students: StudentRecord[];
  onRefresh: () => Promise<void>;
};

export function MacStudentsPage({ currentClass, students, onRefresh }: Props) {
  const [form, setForm] = useState({ name: "", studentNo: "", notes: "" });
  const [query, setQuery] = useState("");
  const filteredStudents = useMemo(
    () => [...students]
      .filter((student) => {
        const keyword = query.trim();
        if (!keyword) return true;
        return student.name.includes(keyword) || (student.studentNo ?? "").includes(keyword);
      })
      .sort((a, b) => a.name.localeCompare(b.name, "zh-CN")),
    [query, students]
  );

  const submit = async () => {
    if (!form.name.trim() || !currentClass) return;
    await saveStudent({ ...form, classIds: [currentClass.id] });
    setForm({ name: "", studentNo: "", notes: "" });
    await onRefresh();
  };

  const doImport = async () => {
    if (!currentClass) return;
    const path = await open({ filters: [{ name: "名单文件", extensions: ["csv", "xlsx"] }] });
    if (typeof path === "string") {
      await importStudents(currentClass.id, path);
      await onRefresh();
    }
  };

  return (
    <section className="mac-page mac-page-students">
      <div className="mac-detail-grid">
        <MacPanel
          className="mac-students-panel"
          title={currentClass?.name ?? "先选择班级"}
          meta={currentClass ? `${students.length} 名学生` : "未绑定班级"}
          actions={<MacButton variant="ghost" onClick={doImport} disabled={!currentClass}>导入名单</MacButton>}
        >
          <div className="mac-students-pane">
            <div className="mac-callout">
              <div>
                <strong>{currentClass?.name ?? "未选择班级"}</strong>
                <small>{currentClass ? "导入和手动补录都会写入当前班级。" : "先在顶部工具栏切换到一个班级。"}</small>
              </div>
            </div>
            <div className="mac-chip-wrap">
              <span className="mac-chip">{students.length} 人</span>
              <span className="mac-chip">{currentClass?.assignmentCount ?? 0} 份作业</span>
            </div>
            <div className="mac-form-stack">
              <MacField label="姓名">
                <MacInput value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="学生姓名" />
              </MacField>
              <MacField label="学号">
                <MacInput value={form.studentNo} onChange={(event) => setForm({ ...form, studentNo: event.target.value })} placeholder="可选" />
              </MacField>
              <MacField label="备注">
                <MacTextarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="如分层、座位、跟进情况" />
              </MacField>
              <MacButton onClick={submit} disabled={!currentClass}>保存到当前班级</MacButton>
            </div>
          </div>
        </MacPanel>

        <MacPanel className="mac-students-panel" title="学生名单" meta={`${filteredStudents.length} 人`}>
          <div className="mac-students-pane">
            <div className="mac-filter-row">
              <MacField label="搜索">
                <MacInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索姓名或学号" />
              </MacField>
            </div>
            <div className="mac-table-head">
              <span>姓名</span>
              <span>学号</span>
              <span>操作</span>
            </div>
            <div className="mac-table">
              {filteredStudents.length > 0 ? filteredStudents.map((student) => (
                <MacListRow
                  key={student.id}
                  body={<div className="mac-table-row"><strong>{student.name}</strong><small>{student.studentNo || "未填写学号"}</small></div>}
                  trailing={<MacButton variant="ghost" size="sm" onClick={async () => { await deleteStudent(student.id); await onRefresh(); }}>删除</MacButton>}
                />
              )) : <div className="mac-empty">当前筛选条件下没有学生。</div>}
            </div>
          </div>
        </MacPanel>
      </div>
    </section>
  );
}
