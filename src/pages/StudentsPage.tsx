import { useMemo, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { deleteStudent, importStudents, saveStudent } from "../lib/api";
import type { ClassRecord, StudentRecord } from "../../shared/models";

type Props = {
  classes: ClassRecord[];
  currentClass?: ClassRecord;
  students: StudentRecord[];
  onRefresh: () => Promise<void>;
};

export function StudentsPage({ classes, currentClass, students, onRefresh }: Props) {
  const [form, setForm] = useState({ name: "", studentNo: "", notes: "" });
  const sortedStudents = useMemo(() => [...students].sort((a, b) => a.name.localeCompare(b.name, "zh-CN")), [students]);

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
    <section className="page-shell">
      <div className="page-header">
        <div>
          <p className="eyebrow">Roster</p>
          <h2>{currentClass?.name ?? "先从左侧选择班级"}</h2>
          <p className="muted">把学生维护、批量导入和单人补录放在同一个档案界面。</p>
        </div>
        <div className="actions">
          <button className="ghost-button" onClick={doImport}>导入 CSV / Excel</button>
        </div>
      </div>
      <div className="split-grid">
        <section className="panel form-panel">
          <div className="panel-head">
            <h3>新增学生</h3>
            <span>{students.length} 人</span>
          </div>
          <input placeholder="姓名" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          <input placeholder="学号" value={form.studentNo} onChange={(event) => setForm({ ...form, studentNo: event.target.value })} />
          <textarea placeholder="备注" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
          <button onClick={submit}>保存到当前班级</button>
          <p className="muted">学生支持多班级归属，但当前页面默认保存到选中班级。</p>
        </section>
        <section className="panel roster-panel">
          <div className="panel-head">
            <h3>学生列表</h3>
            <span>{classes.length} 个班级</span>
          </div>
          <div className="roster-summary">
            <div>
              <strong>{currentClass?.name ?? "未选择班级"}</strong>
              <p>{currentClass ? `当前班级 ${students.length} 人` : "先从左侧选择班级后查看名单"}</p>
            </div>
          </div>
          <div className="dropdown-sheet">
            {sortedStudents.length > 0 ? sortedStudents.map((student) => (
              <div key={student.id} className="row-card">
                <div>
                  <strong>{student.name}</strong>
                  <p>{student.studentNo || "未填写学号"}</p>
                </div>
                <button className="text-button" onClick={async () => { await deleteStudent(student.id); await onRefresh(); }}>删除</button>
              </div>
            )) : <p className="muted">当前班级还没有学生。</p>}
          </div>
        </section>
      </div>
    </section>
  );
}
