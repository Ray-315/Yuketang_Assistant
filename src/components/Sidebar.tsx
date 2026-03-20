import type { AssignmentRecord, ClassRecord } from "../../shared/models";

type Props = {
  classes: ClassRecord[];
  assignments: AssignmentRecord[];
  selectedClassId?: string;
  selectedAssignmentId?: string;
  activeView: string;
  onSelectClass: (id?: string) => void;
  onSelectAssignment: (id: string) => void;
  onChangeView: (view: "dashboard" | "students" | "assignment-form" | "settings") => void;
};

export function Sidebar(props: Props) {
  return (
    <aside className="sidebar">
      <div className="brand-block">
        <p className="eyebrow">Personal Teaching Workbench</p>
        <h1>批改工作台</h1>
        <p className="muted">为高频批改压缩路径和点击次数。</p>
      </div>
      <nav className="nav-block">
        <button className={props.activeView === "dashboard" ? "nav-item active" : "nav-item"} onClick={() => props.onChangeView("dashboard")}><span>总览</span><small>Overview</small></button>
        <button className={props.activeView === "students" ? "nav-item active" : "nav-item"} onClick={() => props.onChangeView("students")}><span>学生档案</span><small>Roster</small></button>
        <button className={props.activeView === "assignment-form" ? "nav-item active" : "nav-item"} onClick={() => props.onChangeView("assignment-form")}><span>新建作业</span><small>Compose</small></button>
        <button className={props.activeView === "settings" ? "nav-item active" : "nav-item"} onClick={() => props.onChangeView("settings")}><span>设置</span><small>Settings</small></button>
      </nav>
      <section className="sidebar-section">
        <div className="section-head">
          <span>班级</span>
          <span>{props.classes.length}</span>
        </div>
        {props.classes.map((item) => (
          <button
            key={item.id}
            className={props.selectedClassId === item.id ? "list-pill active" : "list-pill"}
            onClick={() => props.onSelectClass(item.id)}
          >
            <strong>{item.name}</strong>
            <small>{item.studentCount} 人</small>
          </button>
        ))}
      </section>
      <section className="sidebar-section">
        <div className="section-head">
          <span>作业</span>
          <span>{props.assignments.length}</span>
        </div>
        {props.assignments.map((item) => (
          <button
            key={item.id}
            className={props.selectedAssignmentId === item.id ? "assignment-chip active" : "assignment-chip"}
            onClick={() => props.onSelectAssignment(item.id)}
          >
            <strong>{item.title}</strong>
            <small>{item.questionCount} 题 · {item.completedStudents} 完成</small>
          </button>
        ))}
      </section>
    </aside>
  );
}
