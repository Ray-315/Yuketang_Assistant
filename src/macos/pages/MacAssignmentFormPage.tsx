import { useEffect, useMemo, useState } from "react";
import { defaultScorePolicy } from "../../../shared/scoring";
import { saveAssignment } from "../../lib/api";
import { MacButton, MacField, MacInput, MacSelect, MacTextarea } from "../components/MacControls";
import { MacPanel } from "../components/MacSurface";
import type { ClassRecord } from "../../../shared/models";

type Props = {
  classes: ClassRecord[];
  selectedClassId?: string;
  onSaved: () => Promise<void>;
};

type SectionDraft = {
  id: string;
  chapter: string;
  questions: string;
};

const createSection = (index: number): SectionDraft => ({
  id: `section-${index}-${Date.now()}`,
  chapter: index === 0 ? "6.1" : "",
  questions: index === 0 ? "1,2,3" : ""
});

export function MacAssignmentFormPage({ classes, selectedClassId, onSaved }: Props) {
  const [title, setTitle] = useState("");
  const [summaryChapter, setSummaryChapter] = useState("");
  const [classId, setClassId] = useState(selectedClassId ?? classes[0]?.id ?? "");
  const [sections, setSections] = useState<SectionDraft[]>([createSection(0)]);

  const classOptions = useMemo(() => classes.map((item) => ({ label: item.name, value: item.id })), [classes]);
  const previewLabels = useMemo(
    () => sections.flatMap((section) => {
      const questions = section.questions.split(/[\n,，、\s]+/).map((item) => item.trim()).filter(Boolean);
      return questions.map((question) => section.chapter.trim() ? `${section.chapter.trim()}-${question}` : question);
    }),
    [sections]
  );

  const updateSection = (id: string, patch: Partial<SectionDraft>) => {
    setSections((current) => current.map((section) => section.id === id ? { ...section, ...patch } : section));
  };

  useEffect(() => {
    if (selectedClassId) {
      setClassId(selectedClassId);
      return;
    }
    if (!classId && classes[0]?.id) {
      setClassId(classes[0].id);
    }
  }, [selectedClassId, classId, classes]);

  const submit = async () => {
    if (!classId || !title.trim() || previewLabels.length === 0) return;
    await saveAssignment({ classId, title, chapter: summaryChapter, questionLabels: previewLabels, scoringPolicy: defaultScorePolicy });
    setTitle("");
    setSummaryChapter("");
    setSections([createSection(0)]);
    await onSaved();
  };

  return (
    <section className="mac-page">
      <div className="mac-compose-grid">
        <MacPanel title="作业结构" meta={`${previewLabels.length} 道题将被初始化`}>
          <div className="mac-callout">
            <div>
              <strong>按章节维护题号</strong>
              <small>题目标识会自动组合成“章节号-题号”，创建后直接冻结本次花名册。</small>
            </div>
          </div>
          <div className="mac-form-stack">
            <MacField label="班级"><MacSelect value={classId} options={classOptions} placeholder="选择班级" onChange={setClassId} /></MacField>
            <MacField label="作业名称"><MacInput value={title} onChange={(event) => setTitle(event.target.value)} placeholder="例如 3.20" /></MacField>
            <MacField label="章节说明"><MacInput value={summaryChapter} onChange={(event) => setSummaryChapter(event.target.value)} placeholder="例如 第六章 6.1-6.3" /></MacField>
            <div className="mac-inline-actions">
              <MacButton variant="ghost" onClick={() => setSections((current) => [...current, createSection(current.length)])}>新增章节</MacButton>
              <MacButton onClick={submit}>创建作业</MacButton>
            </div>
          </div>
          <div className="mac-section-stack">
            {sections.map((section, index) => (
              <div key={section.id} className="mac-section-card">
                <div className="mac-section-head">
                  <strong>章节 {index + 1}</strong>
                  <MacButton variant="ghost" size="sm" onClick={() => setSections((current) => current.length === 1 ? current : current.filter((item) => item.id !== section.id))}>删除</MacButton>
                </div>
                <div className="mac-two-col">
                  <MacField label="章节号"><MacInput value={section.chapter} onChange={(event) => updateSection(section.id, { chapter: event.target.value })} placeholder="例如 6.1" /></MacField>
                  <MacField label="题号"><MacTextarea value={section.questions} onChange={(event) => updateSection(section.id, { questions: event.target.value })} placeholder="例如 1,2,3 或 1 2 3" /></MacField>
                </div>
              </div>
            ))}
          </div>
        </MacPanel>

        <MacPanel className="mac-preview-panel" title="题目预览" meta={`${previewLabels.length} 题`}>
          <div className="mac-preview-stack">
            <div className="mac-callout">
              <div>
                <strong>{title || "未命名作业"}</strong>
                <small>{summaryChapter || "还没有填写章节说明"}</small>
              </div>
            </div>
          </div>
          <div className="mac-chip-wrap">
            {previewLabels.length > 0 ? previewLabels.map((label) => (
              <span key={label} className="mac-chip">{label}</span>
            )) : <div className="mac-empty">先录入章节号和题号。</div>}
          </div>
        </MacPanel>
      </div>
    </section>
  );
}
