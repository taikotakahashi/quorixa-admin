import type { ReactNode } from "react";
import { ChevronRight, Users, type LucideIcon } from "lucide-react";

type Props = {
  kicker?: string;
  kickerIcon?: LucideIcon;
  title: string;
  description?: string;
  quote?: string;
  actions?: ReactNode;
  accentWord?: string;
};

function TitleText({ title, accentWord }: { title: string; accentWord?: string }) {
  const accent = accentWord?.trim();
  if (accent) {
    const lower = title.toLowerCase();
    const accentLower = accent.toLowerCase();
    const idx = lower.lastIndexOf(accentLower);
    if (idx >= 0) {
      const before = title.slice(0, idx).trimEnd();
      const word = title.slice(idx, idx + accent.length);
      const after = title.slice(idx + accent.length);
      return (
        <>
          {before ? `${before} ` : null}
          <span className="studio-title-accent">{word}</span>
          {after}
        </>
      );
    }
  }
  const parts = title.trim().split(/\s+/);
  if (parts.length < 2) return <>{title}</>;
  const last = parts.pop()!;
  return (
    <>
      {parts.join(" ")} <span className="studio-title-accent">{last}</span>
    </>
  );
}

function BannerPeople() {
  return (
    <div className="studio-people" aria-hidden="true">
      <span className="studio-orb studio-orb-a" />
      <span className="studio-orb studio-orb-b" />
      <span className="studio-orb studio-orb-c" />
      <span className="studio-dot-grid" />
      <div className="studio-card studio-card-a">
        <span className="studio-avatar" style={{ background: "linear-gradient(135deg,#c4b5fd,#7c3aed)" }} />
        <span className="studio-lines">
          <i />
          <i />
        </span>
        <span className="studio-menu" />
      </div>
      <div className="studio-card studio-card-b">
        <span className="studio-avatar" style={{ background: "linear-gradient(135deg,#93c5fd,#6366f1)" }} />
        <span className="studio-lines">
          <i />
          <i />
        </span>
        <span className="studio-menu" />
      </div>
      <div className="studio-card studio-card-c">
        <span className="studio-avatar" style={{ background: "linear-gradient(135deg,#f0abfc,#8b5cf6)" }} />
        <span className="studio-lines">
          <i />
          <i />
        </span>
        <span className="studio-menu" />
      </div>
      <span className="studio-path" />
      <span className="studio-plus">+</span>
    </div>
  );
}

export function PageHeader({
  kicker,
  kickerIcon: KickerIcon = Users,
  title,
  description,
  quote,
  actions,
  accentWord,
}: Props) {
  return (
    <section className="studio-banner">
      <div className="studio-banner-copy">
        {kicker ? (
          <p className="studio-kicker">
            <KickerIcon size={13} strokeWidth={2.2} />
            {kicker}
          </p>
        ) : null}
        <h1>
          <TitleText title={title} accentWord={accentWord} />
        </h1>
        {description ? <p className="studio-lead">{description}</p> : null}
      </div>
      <div className="studio-banner-art">
        <BannerPeople />
        {quote ? <p className="studio-quote">{quote}</p> : null}
      </div>
      {actions ? (
        <div className="studio-banner-actions">
          <div className="studio-cta-wrap">{actions}</div>
        </div>
      ) : null}
    </section>
  );
}

export function CtaChevron() {
  return <ChevronRight size={15} strokeWidth={2.4} />;
}
