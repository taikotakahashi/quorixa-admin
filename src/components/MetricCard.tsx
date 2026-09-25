import type { ReactNode } from "react";

type Props = {
  icon: ReactNode;
  label: string;
  value: string | number;
  tint: string;
  color: string;
  spark: string;
  /** Decorative uplift shown as “↑ {trend}”, e.g. `"12%"`. */
  trend?: string;
};

function hexToRgba(hex: string, alpha: number) {
  const raw = hex.replace("#", "");
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw;
  const n = Number.parseInt(full, 16);
  if (Number.isNaN(n)) return `rgba(124, 58, 237, ${alpha})`;
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function MetricCard({
  icon,
  label,
  value,
  tint: _tint,
  color,
  spark,
  trend = "12%",
}: Props) {
  void _tint;
  const wash = hexToRgba(color, 0.14);
  const washSoft = hexToRgba(color, 0.04);

  return (
    <article
      className="metric-card"
      style={{
        background: `linear-gradient(105deg, ${wash} 0%, ${washSoft} 45%, #ffffff 82%)`,
        borderColor: hexToRgba(color, 0.12),
      }}
    >
      <div className="metric-main">
        <span
          className="metric-icon"
          style={{
            background: `linear-gradient(145deg, ${hexToRgba(color, 0.88)} 0%, ${color} 100%)`,
            boxShadow: `0 8px 16px ${hexToRgba(color, 0.28)}`,
          }}
        >
          {icon}
        </span>
        <div className="metric-copy">
          <span className="metric-label">{label}</span>
          <strong>{value}</strong>
          <p className="metric-trend">
            <span className="metric-delta">↑ {trend}</span>
            <span className="metric-trend-muted">vs last month</span>
          </p>
        </div>
      </div>
      <svg className="spark" viewBox="0 0 72 36" fill="none" aria-hidden="true">
        <path d={`${spark} L 68 36 L 2 36 Z`} fill={color} opacity="0.1" />
        <path
          d={spark}
          stroke={color}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="68" cy="10" r="3.2" fill={color} />
      </svg>
    </article>
  );
}

export const sparks = {
  a: "M2 28 C10 26, 16 12, 24 14 S38 30, 46 16 S58 8, 68 10",
  b: "M2 24 C12 28, 18 14, 28 16 S42 30, 50 14 S60 10, 68 12",
  c: "M2 20 C12 16, 18 28, 28 20 S42 8, 52 14 S60 24, 68 18",
  d: "M2 26 C10 20, 18 12, 28 14 S40 28, 50 12 S60 8, 68 10",
};

/** Stable decorative uplifts matching the metric-card mock. */
export const metricTrends = {
  a: "12%",
  b: "14%",
  c: "27%",
  d: "9%",
} as const;
