import type { ReactNode } from "react";

type Props = {
  kicker?: string;
  title: string;
  description?: string;
  quote?: string;
  actions?: ReactNode;
};

function BannerArt() {
  return (
    <svg className="studio-art" viewBox="0 0 420 220" aria-hidden="true">
      <defs>
        <linearGradient id="artWash" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ddd6fe" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#bfdbfe" stopOpacity="0.05" />
        </linearGradient>
        <linearGradient id="artCard" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#f5f3ff" />
        </linearGradient>
      </defs>
      <path
        d="M20 150 C 90 90, 160 190, 240 120 S 360 40, 430 90"
        fill="none"
        stroke="#c4b5fd"
        strokeWidth="18"
        strokeLinecap="round"
        opacity="0.55"
      />
      <path
        d="M10 170 C 100 120, 180 200, 270 140 S 380 70, 440 110"
        fill="none"
        stroke="#93c5fd"
        strokeWidth="10"
        strokeLinecap="round"
        opacity="0.45"
      />
      <g transform="translate(150 28) rotate(-8)">
        <rect width="150" height="108" rx="18" fill="url(#artCard)" stroke="#e9e5ff" />
        <rect x="16" y="16" width="46" height="46" rx="12" fill="#ddd6fe" />
        <rect x="74" y="22" width="58" height="8" rx="4" fill="#e9d5ff" />
        <rect x="74" y="38" width="42" height="8" rx="4" fill="#f3e8ff" />
        <rect x="16" y="74" width="118" height="8" rx="4" fill="#ede9fe" />
        <rect x="16" y="88" width="86" height="8" rx="4" fill="#f5f3ff" />
      </g>
      <g transform="translate(248 58) rotate(7)">
        <rect width="132" height="96" rx="16" fill="#ffffff" stroke="#e0e7ff" />
        <rect x="14" y="14" width="40" height="40" rx="10" fill="#c4b5fd" />
        <path d="M22 34 h24 M22 42 h16" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
        <rect x="64" y="20" width="52" height="7" rx="3.5" fill="#e0e7ff" />
        <rect x="64" y="34" width="36" height="7" rx="3.5" fill="#ede9fe" />
        <rect x="14" y="66" width="104" height="7" rx="3.5" fill="#f1f5f9" />
        <rect x="14" y="78" width="72" height="7" rx="3.5" fill="#f8fafc" />
      </g>
      <circle cx="132" cy="78" r="18" fill="#ffffff" stroke="#ddd6fe" />
      <path d="M124 78 h16 M132 70 v16" stroke="#8b5cf6" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export function PageHeader({ kicker, title, description, quote, actions }: Props) {
  return (
    <section className="studio-banner">
      <div className="studio-banner-copy">
        {kicker ? <p className="studio-kicker">{kicker}</p> : null}
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      <div className="studio-banner-art">
        <BannerArt />
        {quote ? (
          <p className="studio-quote">
            “{quote}”
            <span />
          </p>
        ) : null}
      </div>
      {actions ? <div className="studio-banner-actions">{actions}</div> : null}
    </section>
  );
}
