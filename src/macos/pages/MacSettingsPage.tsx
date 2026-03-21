import { save } from "@tauri-apps/plugin-dialog";
import { createBackup, exportAssignment, generateStudentTemplate, restoreBackup, saveAdapterProfile, saveSettings } from "../../lib/api";
import { MacButton, MacField, MacInput, MacSegmented, MacSelect } from "../components/MacControls";
import { MacListRow, MacPanel } from "../components/MacSurface";
import type { AdapterProfile, AppSettings, AssignmentRecord, BackupRecord } from "../../../shared/models";

type Props = {
  settings: AppSettings;
  adapters: AdapterProfile[];
  backups: BackupRecord[];
  selectedAssignmentId?: string;
  assignments: AssignmentRecord[];
  onRefresh: () => Promise<void>;
  onSettingsChange: (settings: AppSettings) => void;
};

export function MacSettingsPage({ settings, adapters, backups, selectedAssignmentId, assignments, onRefresh, onSettingsChange }: Props) {
  const adapter = adapters[0];
  const persistSettings = async (next: AppSettings) => {
    await saveSettings(next);
    onSettingsChange(next);
  };

  return (
    <section className="mac-page">
      <div className="mac-settings-grid">
        <MacPanel title="应用设置" meta="本地优先">
          <div className="mac-form-stack">
            <MacField label="界面模式">
              <MacSegmented
                value={settings.uiMode}
                onChange={(value) => void persistSettings({ ...settings, uiMode: value as "zen" | "macos" })}
                options={[
                  { label: "Zen", value: "zen" },
                  { label: "macOS", value: "macos" }
                ]}
              />
            </MacField>
            <MacField label="桥接端口"><MacInput defaultValue={settings.bridgePort} onBlur={async (event) => { await persistSettings({ ...settings, bridgePort: Number(event.target.value) }); }} /></MacField>
            <MacField label="备份目录"><MacInput defaultValue={settings.backupDirectory} onBlur={async (event) => { await persistSettings({ ...settings, backupDirectory: event.target.value }); }} /></MacField>
            <div className="mac-inline-actions">
              <MacButton onClick={async () => { await createBackup(); await onRefresh(); }}>立即备份</MacButton>
              <MacButton variant="ghost" onClick={async () => {
                const path = await save({ defaultPath: "students-template.xlsx" });
                if (path) await generateStudentTemplate("xlsx", path);
              }}>导出名单模板</MacButton>
            </div>
          </div>
        </MacPanel>

        <MacPanel title="页面适配" meta={adapter?.name ?? "未配置"}>
          {adapter ? (
            <div className="mac-form-stack">
              <MacField label="适配器状态">
                <MacSelect
                  value={adapter.enabled ? "enabled" : "disabled"}
                  options={[{ label: "启用", value: "enabled" }, { label: "停用", value: "disabled" }]}
                  onChange={async (value) => { await saveAdapterProfile({ ...adapter, enabled: value === "enabled" }); await onRefresh(); }}
                />
              </MacField>
              <MacField label="主选择器"><MacInput defaultValue={adapter.primarySelector} onBlur={async (event) => { await saveAdapterProfile({ ...adapter, primarySelector: event.target.value }); await onRefresh(); }} /></MacField>
              <MacField label="候选选择器"><MacInput defaultValue={adapter.fallbackSelectors.join(", ")} onBlur={async (event) => { await saveAdapterProfile({ ...adapter, fallbackSelectors: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) }); await onRefresh(); }} /></MacField>
              <MacField label="锚点文本"><MacInput defaultValue={adapter.anchorTexts.join(", ")} onBlur={async (event) => { await saveAdapterProfile({ ...adapter, anchorTexts: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) }); await onRefresh(); }} /></MacField>
            </div>
          ) : <div className="mac-empty">当前没有适配器配置。</div>}
        </MacPanel>

        <MacPanel title="备份记录" meta={`${backups.length} 条`}>
          <div className="mac-list">
            {backups.length > 0 ? backups.map((item) => (
              <MacListRow
                key={item.id}
                body={<><strong>{item.createdAt}</strong><small>{item.filePath}</small></>}
                trailing={<MacButton variant="ghost" size="sm" onClick={async () => { await restoreBackup(item.id); await onRefresh(); }}>恢复</MacButton>}
              />
            )) : <div className="mac-empty">当前没有备份记录。</div>}
          </div>
        </MacPanel>

        <MacPanel title="作业导出" meta={`${assignments.length} 份`}>
          <div className="mac-form-stack">
            <MacButton onClick={async () => {
              const assignmentId = selectedAssignmentId ?? assignments[0]?.id;
              const path = await save({ defaultPath: "assignment-report.xlsx" });
              if (assignmentId && path) await exportAssignment(assignmentId, "xlsx", path);
            }}>导出当前作业为 Excel</MacButton>
            <MacButton variant="ghost" onClick={async () => {
              const assignmentId = selectedAssignmentId ?? assignments[0]?.id;
              const path = await save({ defaultPath: "assignment-report.csv" });
              if (assignmentId && path) await exportAssignment(assignmentId, "csv", path);
            }}>导出当前作业为 CSV</MacButton>
          </div>
        </MacPanel>
      </div>
    </section>
  );
}
