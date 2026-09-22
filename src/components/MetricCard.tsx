import type { ReactNode } from "react";

type Props = {
  icon: ReactNode;
  label: string;
  value: string | number;
  tint: string;
  color: string;
  spark: string;
};

export function MetricCard({ icon, label, value, tint, color, spark }: Props) {
  return (
    <article className="metric-card">
      <div className="metric-top">
        <span className="metric-icon" style={{ background: tint, color }}>
          {icon}
        </span>
        <span className="metric-label">{label}</span>
      </div>
      <div className="metric-main">
        <strong>{value}</strong>
        <svg className="spark" viewBox="0 0 60 22" fill="none" aria-hidden="true">
          <path d={spark} stroke={color} strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
      <span className="stat-trend">vs last month</span>
    </article>
  );
}

export const sparks = {
  a: "M1 16 C8 14, 12 6, 20 8 S32 18, 42 10 S52 4, 58 7",
  b: "M1 14 C10 16, 16 8, 24 10 S36 18, 44 9 S54 6, 58 8",
  c: "M1 12 C9 10, 14 16, 22 12 S34 4, 42 8 S52 14, 58 11",
  d: "M1 15 C8 12, 14 7, 22 9 S34 16, 44 8 S54 5, 58 6",
};
