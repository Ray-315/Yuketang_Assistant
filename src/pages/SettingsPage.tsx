import { save } from "@tauri-apps/plugin-dialog";
import { createBackup, exportAssignment, generateStudentTemplate, restoreBackup, saveAdapterProfile, saveSettings } from "../lib/api";
import type { AdapterProfile, AppSettings, AssignmentRecord, BackupRecord } from "../../shared/models";

type Props = {
  settings: AppSettings;
  adapters: AdapterProfile[];
  backups: BackupRecord[];
  selectedAssignmentId?: string;
  assignments: AssignmentRecord[];
  onRefresh: () => Promise<void>;
  onSettingsChange: (settings: AppSettings) => void;
};

export function SettingsPage({ settings, adapters, backups, selectedAssignmentId, assignments, onRefresh, onSettingsChange }: Props) {
  const adapter = adapters[0];
  const persistSettings = async (next: AppSettings) => {
    await saveSettings(next);
    onSettingsChange(next);
  };

  return (
    <section className="page-shell">
      <div className="page-header">
        <div>
          <p className="eyebrow">Settings</p>
          <h2>桥接、适配、备份与导出</h2>
          <p className="muted">把需要偶尔维护的系统配置收束成两组：运行配置和数据安全。</p>
        </div>
      </div>
      <div className="split-grid">
        <section className="panel form-panel">
          <div className="panel-head"><h3>应用设置</h3><span>本地优先</span></div>
          <div className="panel-head"><h3>界面模式</h3><span>{settings.uiMode === "macos" ? "macOS" : "Zen"}</span></div>
          <div className="actions">
            <button className={settings.uiMode === "zen" ? "compact-button" : "ghost-button compact-button"} onClick={() => void persistSettings({ ...settings, uiMode: "zen" })}>Zen</button>
            <button className={settings.uiMode === "macos" ? "compact-button" : "ghost-button compact-button"} onClick={() => void persistSettings({ ...settings, uiMode: "macos" })}>macOS</button>
          </div>
          <label>桥接端口<input defaultValue={settings.bridgePort} onBlur={async (event) => { await persistSettings({ ...settings, bridgePort: Number(event.target.value) }); }} /></label>
          <label>备份目录<input defaultValue={settings.backupDirectory} onBlur={async (event) => { await persistSettings({ ...settings, backupDirectory: event.target.value }); }} /></label>
          <label className="checkbox-line"><input type="checkbox" defaultChecked={settings.autoBackupEnabled} onChange={async (event) => { await persistSettings({ ...settings, autoBackupEnabled: event.target.checked }); }} />启用自动备份</label>
          <div className="actions">
            <button onClick={async () => { await createBackup(); await onRefresh(); }}>立即备份</button>
            <button className="ghost-button" onClick={async () => {
              const path = await save({ defaultPath: "students-template.xlsx" });
              if (path) await generateStudentTemplate("xlsx", path);
            }}>导出名单模板</button>
          </div>
        </section>
        <section className="panel form-panel">
          <div className="panel-head"><h3>页面适配</h3><span>{adapter?.name ?? "未配置"}</span></div>
          {adapter ? (
            <>
              <label>主选择器<input defaultValue={adapter.primarySelector} onBlur={async (event) => { await saveAdapterProfile({ ...adapter, primarySelector: event.target.value }); await onRefresh(); }} /></label>
              <label>候选选择器<input defaultValue={adapter.fallbackSelectors.join(", ")} onBlur={async (event) => { await saveAdapterProfile({ ...adapter, fallbackSelectors: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) }); await onRefresh(); }} /></label>
              <label>锚点文本<input defaultValue={adapter.anchorTexts.join(", ")} onBlur={async (event) => { await saveAdapterProfile({ ...adapter, anchorTexts: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) }); await onRefresh(); }} /></label>
            </>
          ) : null}
        </section>
      </div>
      <div className="split-grid">
        <section className="panel">
          <div className="panel-head"><h3>备份记录</h3><span>{backups.length}</span></div>
          {backups.map((item) => (
            <div key={item.id} className="row-card">
              <div>
                <strong>{item.createdAt}</strong>
                <p>{item.filePath}</p>
              </div>
              <button className="text-button" onClick={async () => { await restoreBackup(item.id); await onRefresh(); }}>恢复</button>
            </div>
          ))}
        </section>
        <section className="panel">
          <div className="panel-head"><h3>作业导出</h3><span>{assignments.length}</span></div>
          <button onClick={async () => {
            const assignmentId = selectedAssignmentId ?? assignments[0]?.id;
            const path = await save({ defaultPath: "assignment-report.xlsx" });
            if (assignmentId && path) await exportAssignment(assignmentId, "xlsx", path);
          }}>导出当前作业为 Excel</button>
          <button className="ghost-button" onClick={async () => {
            const assignmentId = selectedAssignmentId ?? assignments[0]?.id;
            const path = await save({ defaultPath: "assignment-report.csv" });
            if (assignmentId && path) await exportAssignment(assignmentId, "csv", path);
          }}>导出当前作业为 CSV</button>
        </section>
      </div>
    </section>
  );
}
