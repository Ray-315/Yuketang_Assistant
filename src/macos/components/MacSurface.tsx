import type { ReactNode } from "react";

export function MacPanel({
  title,
  meta,
  actions,
  className,
  children
}: {
  title?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={["mac-panel", className].filter(Boolean).join(" ")}>
      {title || meta || actions ? (
        <div className="mac-panel-head">
          <div className="mac-panel-copy">
            {title ? <h3>{title}</h3> : null}
            {meta ? <span className="mac-panel-meta">{meta}</span> : null}
          </div>
          {actions ? <div className="mac-panel-actions">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function MacStatCard({
  label,
  value,
  note,
  tone = "default"
}: {
  label: string;
  value: string | number;
  note?: string;
  tone?: "default" | "accent" | "danger";
}) {
  return (
    <article className={`mac-stat-card is-${tone}`}>
      <span className="mac-stat-label">{label}</span>
      <strong className="mac-stat-value">{value}</strong>
      {note ? <small className="mac-stat-note">{note}</small> : null}
    </article>
  );
}

export function MacListRow({
  leading,
  body,
  trailing,
  danger = false
}: {
  leading?: ReactNode;
  body: ReactNode;
  trailing?: ReactNode;
  danger?: boolean;
}) {
  return (
    <div className={danger ? "mac-list-row is-danger" : "mac-list-row"}>
      {leading ? <div className="mac-list-leading">{leading}</div> : null}
      <div className="mac-list-body">{body}</div>
      {trailing ? <div className="mac-list-trailing">{trailing}</div> : null}
    </div>
  );
}
