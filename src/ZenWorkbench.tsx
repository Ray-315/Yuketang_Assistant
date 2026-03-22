import { Sidebar } from "./components/Sidebar";
import { AssignmentDetailPage } from "./pages/AssignmentDetailPage";
import { AssignmentFormPage } from "./pages/AssignmentFormPage";
import { DashboardPage } from "./pages/DashboardPage";
import { GradingPage } from "./pages/GradingPage";
import { SettingsPage } from "./pages/SettingsPage";
import { StudentsPage } from "./pages/StudentsPage";
import { useAppStore, useScopedData } from "./store/appStore";
import { viewTitles } from "./viewMeta";
import type { AppSettings } from "../shared/models";

type Props = {
  onSettingsChange: (settings: AppSettings) => void;
};

export function ZenWorkbench({ onSettingsChange }: Props) {
  const store = useScopedData();
  const currentViewMeta = viewTitles[store.activeView];

  return (
    <main className="app-shell">
      <Sidebar
        classes={store.classes}
        assignments={store.assignments}
        selectedClassId={store.selectedClassId}
        selectedAssignmentId={store.selectedAssignmentId}
        activeView={store.activeView}
        onSelectClass={store.selectClass}
        onSelectAssignment={(id) => void store.selectAssignment(id)}
        onChangeView={store.setView}
      />
      <section className="content-shell">
        <header className="content-topbar">
          <div className="topbar-copy">
            <p className="eyebrow">Workbench</p>
            <h2>{currentViewMeta.title}</h2>
            <p className="muted">{currentViewMeta.note}</p>
          </div>
          <div className="topbar-meta">
            <div className="session-chip">
              <span className={`dot ${store.session.connectionState}`}></span>
              <div>
                <strong>{store.currentClass?.name ?? "未选择班级"}</strong>
                <small>{store.session.currentStudentName ?? "等待识别学生"}</small>
              </div>
            </div>
            {store.selectedAssignmentId ? (
              <button className="floating-console topbar-console" onClick={() => store.setView("grading")}>
                进入批改控制台
              </button>
            ) : null}
          </div>
        </header>
        {store.error ? <div className="banner error">{store.error}</div> : null}
        {store.activeView === "dashboard" ? <DashboardPage classes={store.classes} assignments={store.assignments} backups={store.backups} session={store.session} onRefresh={store.refreshAll} /> : null}
        {store.activeView === "students" ? <StudentsPage classes={store.classes} currentClass={store.currentClass} students={store.students} onRefresh={store.refreshAll} /> : null}
        {store.activeView === "assignment-form" ? <AssignmentFormPage classes={store.classes} selectedClassId={store.selectedClassId} onSaved={store.refreshAll} /> : null}
        {store.activeView === "assignment-detail" ? <AssignmentDetailPage detail={store.assignmentDetail} /> : null}
        {store.activeView === "grading" ? (
          <GradingPage
            assignments={store.assignments}
            students={store.students}
            session={store.session}
            selectedAssignmentId={store.selectedAssignmentId}
            onRefresh={store.refreshAll}
            onSession={(session) => useAppStore.setState({ session })}
            onGrade={(action) => store.runGrade({ action })}
          />
        ) : null}
        {store.activeView === "settings" ? (
          <SettingsPage
            settings={store.settings}
            adapters={store.adapters}
            backups={store.backups}
            selectedAssignmentId={store.selectedAssignmentId}
            assignments={store.assignments}
            onRefresh={store.refreshAll}
            onSettingsChange={onSettingsChange}
          />
        ) : null}
      </section>
    </main>
  );
}
