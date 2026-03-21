import type { ReactNode } from "react";
import type { AppView } from "../../store/appStore";

type Item = {
  view: AppView;
  label: string;
  icon: ReactNode;
};

const items: Item[] = [
  {
    view: "dashboard",
    label: "总览",
    icon: <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 10.5h5.5V17H3zm8.5-7.5H17V17h-5.5zm-8.5 0H8.5v5.5H3z" /></svg>
  },
  {
    view: "students",
    label: "学生",
    icon: <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 10a3.5 3.5 0 1 0-3.5-3.5A3.5 3.5 0 0 0 10 10Zm0 1.5c-3.2 0-6 1.64-6 3.67V17h12v-1.83c0-2.03-2.8-3.67-6-3.67Z" /></svg>
  },
  {
    view: "assignment-form",
    label: "新建作业",
    icon: <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 3h8l4 4v10H4zm7 1.5V8h3.5M10 10v5M7.5 12.5h5" /></svg>
  },
  {
    view: "grading",
    label: "批改",
    icon: <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m4 13.5 8.8-8.8 2.5 2.5L6.5 16H4zm8-9.5 1.2-1.2a1.7 1.7 0 0 1 2.4 0l1.1 1.1a1.7 1.7 0 0 1 0 2.4L15.5 7.5" /></svg>
  },
  {
    view: "settings",
    label: "设置",
    icon: <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 6.5A3.5 3.5 0 1 0 13.5 10 3.5 3.5 0 0 0 10 6.5Zm7 3.5-.94.34a6.89 6.89 0 0 1-.44 1.06l.44.9-1.5 1.5-.9-.44a6.89 6.89 0 0 1-1.06.44L12 17h-2l-.34-.94a6.89 6.89 0 0 1-1.06-.44l-.9.44-1.5-1.5.44-.9a6.89 6.89 0 0 1-.44-1.06L3 12v-2l.94-.34a6.89 6.89 0 0 1 .44-1.06l-.44-.9 1.5-1.5.9.44a6.89 6.89 0 0 1 1.06-.44L8 3h2l.34.94a6.89 6.89 0 0 1 1.06.44l.9-.44 1.5 1.5-.44.9a6.89 6.89 0 0 1 .44 1.06L17 8z" /></svg>
  }
];

type Props = {
  activeView: AppView;
  onChangeView: (view: AppView) => void;
};

export function MacSidebar({ activeView, onChangeView }: Props) {
  return (
    <aside className="mac-nav">
      <div className="mac-nav-brand">
        <span>PT</span>
      </div>
      <nav className="mac-nav-stack">
        {items.map((item) => (
          <button
            type="button"
            key={item.view}
            className={activeView === item.view ? "mac-nav-item is-active" : "mac-nav-item"}
            onClick={() => onChangeView(item.view)}
            aria-label={item.label}
            title={item.label}
          >
            <span className="mac-nav-icon">{item.icon}</span>
          </button>
        ))}
      </nav>
      <div className="mac-nav-footer">PT</div>
    </aside>
  );
}
