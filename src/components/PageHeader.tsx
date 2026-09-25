import type { ReactNode, CSSProperties } from "react";
import { ChevronRight, Users, type LucideIcon } from "lucide-react";

type Props = {
  kicker?: string;
  kickerIcon?: LucideIcon;
  title: string;
  description?: string;
  quote?: string;
  actions?: ReactNode;
  accentWord?: string;
  background?: string;
  footer?: ReactNode;
};

function TitleText({ title, accentWord }: { title: string; accentWord?: string }) {
  const renderLine = (line: string, key: number) => {
    const accent = accentWord?.trim();
    if (accent) {
      const lower = line.toLowerCase();
      const accentLower = accent.toLowerCase();
      const idx = lower.lastIndexOf(accentLower);
      if (idx >= 0) {
        const before = line.slice(0, idx).trimEnd();
        const word = line.slice(idx, idx + accent.length);
        const after = line.slice(idx + accent.length);
        return (
          <span key={key} className="studio-title-line">
            {before ? `${before} ` : null}
            <span className="studio-title-accent">{word}</span>
            {after}
          </span>
        );
      }
    }
    const parts = line.trim().split(/\s+/);
    if (parts.length < 2) {
      return (
        <span key={key} className="studio-title-line">
          {line}
        </span>
      );
    }
    const last = parts.pop()!;
    return (
      <span key={key} className="studio-title-line">
        {parts.join(" ")} <span className="studio-title-accent">{last}</span>
      </span>
    );
  };

  const lines = title.split("\n");
  if (lines.length === 1) return <>{renderLine(lines[0], 0)}</>;
  return <>{lines.map((line, i) => renderLine(line, i))}</>;
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
  background,
  footer,
}: Props) {
  const style: CSSProperties | undefined = background
    ? {
        backgroundImage: `url(${background})`,
        backgroundColor: "#f4f2fb",
        backgroundPosition: "center",
        backgroundSize: "100% 100%",
        backgroundRepeat: "no-repeat",
      }
    : undefined;

  return (
    <section className={`studio-banner${background ? " has-photo" : ""}${footer ? " has-footer" : ""}`} style={style}>
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
        {footer ? <div className="studio-banner-footer">{footer}</div> : null}
      </div>
      <div className="studio-banner-art">
        {background ? null : <BannerPeople />}
        {quote && !background ? <p className="studio-quote">{quote}</p> : null}
        {quote && background ? <p className="studio-quote studio-quote-on-photo">{quote}</p> : null}
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
