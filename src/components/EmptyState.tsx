import { Inbox } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  title: string;
  description?: string;
  action?: ReactNode;
};

export function EmptyState({ title, description, action }: Props) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Inbox size={22} />
      </div>
      <h3>{title}</h3>
      {description ? <p>{description}</p> : null}
      {action}
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="skeleton">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skel-line" style={{ width: `${70 + (i % 3) * 10}%` }} />
      ))}
    </div>
  );
}
