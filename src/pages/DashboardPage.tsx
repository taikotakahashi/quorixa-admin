import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  BookOpen,
  Briefcase,
  Building2,
  ChevronRight,
  FileText,
  FolderKanban,
  MapPin,
  Pencil,
  Plus,
  Rocket,
  Users,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../auth";
import liveArt from "../assets/dash-live-art.png";

const cards = [
  {
    key: "jobs",
    label: "Jobs",
    to: "/jobs",
    icon: Briefcase,
    tint: "#ede9fe",
    color: "#7c3aed",
    spark: "M1 16 C8 14, 12 6, 20 8 S32 18, 42 10 S52 4, 58 7",
    trend: "+2 this month",
  },
  {
    key: "locations",
    label: "Locations",
    to: "/locations",
    icon: MapPin,
    tint: "#dbeafe",
    color: "#2563eb",
    spark: "M1 14 C10 16, 16 8, 24 10 S36 18, 44 9 S54 6, 58 8",
    trend: "+1 this month",
  },
  {
    key: "team",
    label: "Team",
    to: "/team",
    icon: Users,
    tint: "#ffedd5",
    color: "#ea580c",
    spark: "M1 12 C9 10, 14 16, 22 12 S34 4, 42 8 S52 14, 58 11",
    trend: "+3 this month",
  },
  {
    key: "insights",
    label: "Insights",
    to: "/insights",
    icon: FileText,
    tint: "#dcfce7",
    color: "#16a34a",
    spark: "M1 15 C8 12, 14 7, 22 9 S34 16, 44 8 S54 5, 58 6",
    trend: "+4 this month",
  },
  {
    key: "caseStudies",
    label: "Case studies",
    to: "/case-studies",
    icon: FolderKanban,
    tint: "#fce7f3",
    color: "#db2777",
    spark: "M1 13 C10 15, 16 9, 24 11 S36 17, 46 8 S54 6, 58 9",
    trend: "+5 this month",
  },
  {
    key: "clients",
    label: "Clients",
    to: "/clients",
    icon: Building2,
    tint: "#ccfbf1",
    color: "#0d9488",
    spark: "M1 16 C9 13, 15 8, 23 10 S35 18, 45 9 S54 7, 58 8",
    trend: "+1 this month",
  },
] as const;

type Counts = Record<(typeof cards)[number]["key"], number>;

function welcomeName(email: string | undefined) {
  const local = email?.split("@")[0] ?? "";
  const first = local.split(/[._-]/)[0] ?? "";
  if (!first) return "there";
  return first.charAt(0).toUpperCase() + first.slice(1);
}

export function DashboardPage() {
  const { session } = useAuth();
  const [counts, setCounts] = useState<Counts>({
    jobs: 0,
    locations: 0,
    team: 0,
    insights: 0,
    caseStudies: 0,
    clients: 0,
  });
  const [published, setPublished] = useState({ jobs: 0, insights: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const tableMap = [
        ["jobs", "jobs"],
        ["talent_locations", "locations"],
        ["team_members", "team"],
        ["insights", "insights"],
        ["case_studies", "caseStudies"],
        ["clients", "clients"],
      ] as const;

      const next = { ...counts };
      await Promise.all(
        tableMap.map(async ([table, key]) => {
          const { count } = await supabase
            .from(table)
            .select("*", { count: "exact", head: true });
          next[key] = count ?? 0;
        }),
      );

      const [{ count: pubJobs }, { count: pubInsights }] = await Promise.all([
        supabase.from("jobs").select("*", { count: "exact", head: true }).eq("published", true),
        supabase
          .from("insights")
          .select("*", { count: "exact", head: true })
          .eq("published", true),
      ]);

      setCounts(next);
      setPublished({ jobs: pubJobs ?? 0, insights: pubInsights ?? 0 });
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const name = welcomeName(session?.user.email);

  return (
    <div>
      <section className="dash-hero">
        <div className="dash-hero-copy">
          <p className="dash-kicker">Welcome back, {name} 👋</p>
          <h1>Content overview</h1>
          <p className="dash-hero-lead">
            Manage everything that powers careers, team pages, blog, and portfolios
            — without leaving code.
          </p>
          <div className="dash-hero-actions">
            <Link to="/jobs?new=1" className="btn btn-primary">
              <Plus size={15} /> New Job
            </Link>
            <a className="btn" href="http://localhost:5173" target="_blank" rel="noreferrer">
              <BookOpen size={15} /> View Guide
            </a>
          </div>
        </div>
        <div className="dash-hero-art" aria-hidden="true" />
      </section>

      <div className="stats">
        {cards.map(({ key, label, to, icon: Icon, tint, color, spark, trend }) => (
          <Link key={key} to={to} className="stat-card">
            <div className="stat-top">
              <div className="stat-label">
                <span className="stat-icon" style={{ background: tint, color }}>
                  <Icon size={15} strokeWidth={2.2} />
                </span>
                {label}
              </div>
            </div>
            <strong>{loading ? "—" : counts[key]}</strong>
            <div className="stat-foot">
              <span className="stat-trend">↑ {trend}</span>
              <svg className="spark" viewBox="0 0 60 22" fill="none" aria-hidden>
                <path
                  d={spark}
                  stroke={color}
                  strokeWidth="2"
                  strokeLinecap="round"
                  opacity="0.85"
                />
              </svg>
            </div>
          </Link>
        ))}
      </div>

      <div className="dash-grid">
        <section className="live-card">
          <div className="card-head">
            <h3>
              Live on the site <span className="online-dot" aria-hidden />
            </h3>
            <Link to="/jobs" className="view-all">
              View all <ChevronRight size={14} />
            </Link>
          </div>
          <p className="muted" style={{ margin: "0 0 4px" }}>
            {loading
              ? "Loading publish stats…"
              : `${published.jobs} published jobs · ${published.insights} updated insights`}
          </p>

          <div className="live-links">
            <Link to="/jobs" className="live-link" style={{ background: "#f5f3ff" }}>
              <span style={{ background: "#ede9fe", color: "#7c3aed" }}>
                <Pencil size={14} />
              </span>
              <span className="live-copy">
                <strong>Edit jobs</strong>
                <small>Update job listings and details.</small>
              </span>
              <ChevronRight size={16} />
            </Link>
            <Link to="/insights" className="live-link" style={{ background: "#ecfdf5" }}>
              <span style={{ background: "#dcfce7", color: "#16a34a" }}>
                <FileText size={14} />
              </span>
              <span className="live-copy">
                <strong>Edit posts</strong>
                <small>Manage blog content.</small>
              </span>
              <ChevronRight size={16} />
            </Link>
            <Link to="/case-studies" className="live-link" style={{ background: "#fdf2f8" }}>
              <span style={{ background: "#fce7f3", color: "#db2777" }}>
                <FolderKanban size={14} />
              </span>
              <span className="live-copy">
                <strong>Edit projects</strong>
                <small>Showcase your work.</small>
              </span>
              <ChevronRight size={16} />
            </Link>
            <Link to="/team" className="live-link" style={{ background: "#fff7ed" }}>
              <span style={{ background: "#ffedd5", color: "#ea580c" }}>
                <Users size={14} />
              </span>
              <span className="live-copy">
                <strong>Edit team</strong>
                <small>Keep your team information fresh.</small>
              </span>
              <ChevronRight size={16} />
            </Link>
          </div>

          <div className="live-foot">
            <img src={liveArt} alt="" className="live-foot-art" />
            <div>
              <strong>Everything is live!</strong>
              <span className="muted">
                Your published content is serving on the marketing site.
              </span>
            </div>
          </div>
        </section>

        <section className="quick-card">
          <div className="card-head">
            <h3>Quick Actions</h3>
            <Link to="/jobs" className="view-all">
              See all <ChevronRight size={14} />
            </Link>
          </div>
          <div className="quick-list">
            <Link to="/jobs?new=1" className="quick-item">
              <i style={{ background: "#ede9fe", color: "#7c3aed" }}>
                <Briefcase size={16} />
              </i>
              <span className="live-copy">
                <strong>Create new job</strong>
                <small>Add a new job listing</small>
              </span>
              <ChevronRight className="chev" size={16} />
            </Link>
            <Link to="/locations" className="quick-item">
              <i style={{ background: "#dbeafe", color: "#2563eb" }}>
                <MapPin size={16} />
              </i>
              <span className="live-copy">
                <strong>Add location</strong>
                <small>Manage office locations</small>
              </span>
              <ChevronRight className="chev" size={16} />
            </Link>
            <Link to="/team" className="quick-item">
              <i style={{ background: "#ffedd5", color: "#ea580c" }}>
                <Users size={16} />
              </i>
              <span className="live-copy">
                <strong>Manage team</strong>
                <small>Invite and organize members</small>
              </span>
              <ChevronRight className="chev" size={16} />
            </Link>
            <Link to="/insights" className="quick-item">
              <i style={{ background: "#dcfce7", color: "#16a34a" }}>
                <ArrowUpRight size={16} />
              </i>
              <span className="live-copy">
                <strong>View insights</strong>
                <small>Check site performance</small>
              </span>
              <ChevronRight className="chev" size={16} />
            </Link>
          </div>

          <Link to="/jobs?new=1" className="promo">
            <div className="promo-icon">
              <Rocket size={18} />
            </div>
            <div>
              <strong>Build something great</strong>
              <span>Your next big opportunity is just a click away.</span>
            </div>
            <span className="promo-go">
              <ChevronRight size={16} />
            </span>
          </Link>
        </section>
      </div>
    </div>
  );
}
