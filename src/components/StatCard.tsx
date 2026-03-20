type Props = {
  label: string;
  value: string | number;
  tone?: "default" | "alert" | "accent";
  note?: string;
};

export function StatCard({ label, value, tone = "default", note }: Props) {
  return (
    <article className={`stat-card ${tone}`}>
      <p className="stat-label">{label}</p>
      <strong className="stat-value">{value}</strong>
      {note ? <small>{note}</small> : null}
    </article>
  );
}
