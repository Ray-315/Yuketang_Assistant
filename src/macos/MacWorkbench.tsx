import "./macos.css";
import { useScopedData, useAppStore } from "../store/appStore";
import { MacSidebar } from "./components/MacSidebar";
import { MacToolbar } from "./components/MacToolbar";
import { MacDashboardPage } from "./pages/MacDashboardPage";
import { MacStudentsPage } from "./pages/MacStudentsPage";
import { MacAssignmentFormPage } from "./pages/MacAssignmentFormPage";
import { MacAssignmentDetailPage } from "./pages/MacAssignmentDetailPage";
import { MacGradingPage } from "./pages/MacGradingPage";
import { MacSettingsPage } from "./pages/MacSettingsPage";
import type { AppSettings } from "../../shared/models";

type Props = {
  onSettingsChange: (settings: AppSettings) => void;
};

export function MacWorkbench({ onSettingsChange }: Props) {
  const store = useScopedData();

  return (
    <main className="mac-shell">
      <MacSidebar activeView={store.activeView} onChangeView={store.setView} />
      <section className="mac-workspace">
        <MacToolbar
          activeView={store.activeView}
          classes={store.classes}
          assignments={store.assignments}
          selectedClassId={store.selectedClassId}
          selectedAssignmentId={store.selectedAssignmentId}
          currentClassName={store.currentClass?.name}
          session={store.session}
          onSelectClass={(id) => {
            store.selectClass(id);
            const visibleAssignmentIds = new Set(
              (id ? store.assignments.filter((item) => item.classId === id) : store.assignments).map((item) => item.id)
            );
            if (store.selectedAssignmentId && !visibleAssignmentIds.has(store.selectedAssignmentId)) {
              void store.selectAssignment(undefined);
            }
          }}
          onSelectAssignment={(id) => void store.selectAssignment(id)}
          onOpenGrading={() => store.setView("grading")}
        />
        {store.error ? <div className="mac-banner is-error">{store.error}</div> : null}
        <div className="mac-page-host">
          {store.activeView === "dashboard" ? <MacDashboardPage classes={store.classes} assignments={store.assignments} backups={store.backups} session={store.session} onRefresh={store.refreshAll} /> : null}
          {store.activeView === "students" ? <MacStudentsPage currentClass={store.currentClass} students={store.students} onRefresh={store.refreshAll} /> : null}
          {store.activeView === "assignment-form" ? <MacAssignmentFormPage classes={store.classes} selectedClassId={store.selectedClassId} onSaved={store.refreshAll} /> : null}
          {store.activeView === "assignment-detail" ? <MacAssignmentDetailPage detail={store.assignmentDetail} /> : null}
          {store.activeView === "grading" ? (
            <MacGradingPage
              assignments={store.assignments}
              students={store.students}
              session={store.session}
              selectedAssignmentId={store.selectedAssignmentId}
              assignmentDetail={store.assignmentDetail}
              onRefresh={store.refreshAll}
              onSession={(session) => useAppStore.setState({ session })}
              onGrade={(action) => store.runGrade({ action })}
            />
          ) : null}
          {store.activeView === "settings" ? (
            <MacSettingsPage
              settings={store.settings}
              adapters={store.adapters}
              backups={store.backups}
              selectedAssignmentId={store.selectedAssignmentId}
              assignments={store.assignments}
              onRefresh={store.refreshAll}
              onSettingsChange={onSettingsChange}
            />
          ) : null}
        </div>
      </section>
    </main>
  );
}
