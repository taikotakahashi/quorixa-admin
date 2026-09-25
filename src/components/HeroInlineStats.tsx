import type { ReactNode } from "react";

export type HeroInlineItem = {
  icon: ReactNode;
  primary: string;
  secondary: string;
  tint: string;
  color: string;
};

type Props = {
  items: HeroInlineItem[];
};

export function HeroInlineStats({ items }: Props) {
  return (
    <div className="hero-inline-stats">
      {items.map((item) => (
        <div key={`${item.primary}-${item.secondary}`} className="hero-inline-stat">
          <span
            className="hero-inline-icon"
            style={{
              background: item.tint,
              color: item.color,
              boxShadow: `0 8px 18px ${item.color}22`,
            }}
          >
            {item.icon}
          </span>
          <div>
            <strong>{item.primary}</strong>
            <span>{item.secondary}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
