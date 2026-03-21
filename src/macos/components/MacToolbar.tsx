import { MacButton, MacSelect } from "./MacControls";
import { viewTitles } from "../../viewMeta";
import type { AppView } from "../../store/appStore";
import type { AssignmentRecord, ClassRecord, SessionSnapshot } from "../../../shared/models";

type Props = {
  activeView: AppView;
  classes: ClassRecord[];
  assignments: AssignmentRecord[];
  selectedClassId?: string;
  selectedAssignmentId?: string;
  currentClassName?: string;
  session: SessionSnapshot;
  onSelectClass: (id?: string) => void;
  onSelectAssignment: (id?: string) => void;
  onOpenGrading: () => void;
};

export function MacToolbar({
  activeView,
  classes,
  assignments,
  selectedClassId,
  selectedAssignmentId,
  currentClassName,
  session,
  onSelectClass,
  onSelectAssignment,
  onOpenGrading
}: Props) {
  const classOptions = [{ label: "全部班级", value: "" }, ...classes.map((item) => ({ label: item.name, value: item.id }))];
  const assignmentOptions = [{ label: "选择作业", value: "" }, ...assignments.map((item) => ({ label: item.title, value: item.id }))];
  const currentView = viewTitles[activeView];
  const hasCurrentAssignment = Boolean(selectedAssignmentId && assignments.some((item) => item.id === selectedAssignmentId));

  return (
    <header className="mac-toolbar">
      <div className="mac-toolbar-copy">
        <span className="mac-toolbar-eyebrow">{currentClassName ?? "Teaching Workbench"}</span>
        <h1>{currentView.title}</h1>
        <p>{currentView.note}</p>
      </div>
      <div className="mac-toolbar-cluster">
        <div className="mac-toolbar-select">
          <MacSelect
            value={selectedClassId ?? ""}
            options={classOptions}
            placeholder="切换班级"
            onChange={(value) => onSelectClass(value || undefined)}
          />
        </div>
        <div className="mac-toolbar-select is-assignment">
          <MacSelect
            value={selectedAssignmentId ?? ""}
            options={assignmentOptions}
            placeholder="切换作业"
            onChange={(value) => {
              onSelectAssignment(value || undefined);
            }}
            disabled={assignments.length === 0}
          />
        </div>
        <div className="mac-session-pill">
          <span className={`mac-session-dot is-${session.connectionState}`}></span>
          <div>
            <strong>{session.currentStudentName ?? "等待识别学生"}</strong>
            <small>{session.currentStudentCompleted ? `已完成 · ${session.predictedScore} 分` : session.currentQuestionLabel ?? "未锁定题号"}</small>
          </div>
        </div>
        {hasCurrentAssignment ? <MacButton variant="primary" onClick={onOpenGrading}>进入批改</MacButton> : null}
      </div>
    </header>
  );
}
