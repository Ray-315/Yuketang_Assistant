import { useMemo, useState } from "react";
import { SelectField } from "../components/SelectField";
import { saveAssignment } from "../lib/api";
import { defaultScorePolicy } from "../../shared/scoring";
import type { ClassRecord } from "../../shared/models";

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

export function AssignmentFormPage({ classes, selectedClassId, onSaved }: Props) {
  const [title, setTitle] = useState("");
  const [summaryChapter, setSummaryChapter] = useState("");
  const [classId, setClassId] = useState(selectedClassId ?? classes[0]?.id ?? "");
  const [sections, setSections] = useState<SectionDraft[]>([createSection(0)]);

  const previewLabels = useMemo(
    () =>
      sections.flatMap((section) => {
        const questions = section.questions
          .split(/[\n,，、\s]+/)
          .map((item) => item.trim())
          .filter(Boolean);
        return questions.map((question) =>
          section.chapter.trim() ? `${section.chapter.trim()}-${question}` : question
        );
      }),
    [sections]
  );

  const classOptions = useMemo(
    () => classes.map((item) => ({ label: item.name, value: item.id })),
    [classes]
  );

  const updateSection = (id: string, patch: Partial<SectionDraft>) => {
    setSections((current) =>
      current.map((section) => (section.id === id ? { ...section, ...patch } : section))
    );
  };

  const addSection = () => {
    setSections((current) => [...current, createSection(current.length)]);
  };

  const removeSection = (id: string) => {
    setSections((current) => (current.length === 1 ? current : current.filter((item) => item.id !== id)));
  };

  const submit = async () => {
    if (!classId || !title.trim() || previewLabels.length === 0) return;
    await saveAssignment({
      classId,
      title,
      chapter: summaryChapter,
      questionLabels: previewLabels,
      scoringPolicy: defaultScorePolicy
    });
    setTitle("");
    setSummaryChapter("");
    setSections([createSection(0)]);
    await onSaved();
  };

  return (
    <section className="page-shell dense-page">
      <div className="page-header compact-header">
        <div>
          <p className="eyebrow">Assignment Composer</p>
          <h2>按章节组织题目，创建后直接冻结本次花名册。</h2>
        </div>
        <div className="header-note">
          <strong>{previewLabels.length}</strong>
          <span>道题将被初始化</span>
        </div>
      </div>
      <section className="panel form-panel compact-panel">
        <div className="form-grid compact-form-grid">
          <label>
            班级
            <SelectField value={classId} options={classOptions} onChange={setClassId} placeholder="选择班级" />
          </label>
          <label>
            作业名称
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="例如 第六章课后练习"
            />
          </label>
          <label>
            总章节说明
            <input
              value={summaryChapter}
              onChange={(event) => setSummaryChapter(event.target.value)}
              placeholder="例如 第六章 6.1-6.3"
            />
          </label>
        </div>

        <div className="section-editor">
          <div className="section-editor-head">
            <div>
              <h3>章节与题号</h3>
              <p className="muted">每个章节单独输入章节号，再填题号。系统自动生成 `章节-题号`。</p>
            </div>
            <button className="ghost-button compact-button" onClick={addSection}>
              新增章节
            </button>
          </div>
          {sections.map((section, index) => (
            <article key={section.id} className="section-card">
              <div className="section-card-head">
                <strong>章节 {index + 1}</strong>
                <button
                  className="text-button"
                  onClick={() => removeSection(section.id)}
                  disabled={sections.length === 1}
                >
                  删除
                </button>
              </div>
              <div className="section-fields">
                <label>
                  章节号
                  <input
                    value={section.chapter}
                    onChange={(event) => updateSection(section.id, { chapter: event.target.value })}
                    placeholder="例如 6.1"
                  />
                </label>
                <label className="question-field">
                  题号
                  <textarea
                    value={section.questions}
                    onChange={(event) => updateSection(section.id, { questions: event.target.value })}
                    placeholder="例如 1,2,3 或 1 2 3"
                  />
                </label>
              </div>
            </article>
          ))}
        </div>

        <div className="preview-strip">
          <div className="panel-head">
            <h3>题目预览</h3>
            <span>{previewLabels.length} 题</span>
          </div>
          <div className="tag-flow">
            {previewLabels.length > 0 ? (
              previewLabels.map((label) => (
                <span key={label} className="tag-chip">
                  {label}
                </span>
              ))
            ) : (
              <span className="muted">先输入章节号和题号。</span>
            )}
          </div>
        </div>

        <div className="form-footer">
          <p className="muted">如果某组题目不属于章节，章节号留空即可，系统会直接使用题号。</p>
          <button className="compact-button" onClick={submit}>
            创建作业
          </button>
        </div>
      </section>
    </section>
  );
}
