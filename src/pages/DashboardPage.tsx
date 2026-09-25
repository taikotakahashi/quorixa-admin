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
  Megaphone,
  Pencil,
  Plus,
  Rocket,
  Users,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../auth";
import { MetricCard, metricTrends, sparks } from "../components/MetricCard";
import liveArt from "../assets/dash-live-art.png";

const cards = [
  {
    key: "jobs",
    label: "Jobs",
    to: "/jobs",
    icon: Briefcase,
    tint: "#ede9fe",
    color: "#7c3aed",
    spark: sparks.a,
    trend: metricTrends.a,
  },
  {
    key: "locations",
    label: "Locations",
    to: "/locations",
    icon: MapPin,
    tint: "#dbeafe",
    color: "#2563eb",
    spark: sparks.b,
    trend: metricTrends.b,
  },
  {
    key: "team",
    label: "Team",
    to: "/team",
    icon: Users,
    tint: "#ffedd5",
    color: "#ea580c",
    spark: sparks.c,
    trend: metricTrends.c,
  },
  {
    key: "insights",
    label: "Insights",
    to: "/insights",
    icon: FileText,
    tint: "#dcfce7",
    color: "#16a34a",
    spark: sparks.d,
    trend: metricTrends.d,
  },
  {
    key: "caseStudies",
    label: "Case studies",
    to: "/case-studies",
    icon: FolderKanban,
    tint: "#fce7f3",
    color: "#db2777",
    spark: sparks.a,
    trend: metricTrends.a,
  },
  {
    key: "clients",
    label: "Clients",
    to: "/clients",
    icon: Building2,
    tint: "#ccfbf1",
    color: "#0d9488",
    spark: sparks.b,
    trend: metricTrends.b,
  },
  {
    key: "announcements",
    label: "Announcements",
    to: "/announcements",
    icon: Megaphone,
    tint: "#fce7f3",
    color: "#c026d3",
    spark: sparks.c,
    trend: metricTrends.c,
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
    announcements: 0,
  });
  const [published, setPublished] = useState({ jobs: 0, insights: 0, announcements: 0 });
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
        ["announcements", "announcements"],
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

      const [{ count: pubJobs }, { count: pubInsights }, { count: pubAnnouncements }] =
        await Promise.all([
          supabase.from("jobs").select("*", { count: "exact", head: true }).eq("published", true),
          supabase
            .from("insights")
            .select("*", { count: "exact", head: true })
            .eq("published", true),
          supabase
            .from("announcements")
            .select("*", { count: "exact", head: true })
            .eq("published", true),
        ]);

      setCounts(next);
      setPublished({
        jobs: pubJobs ?? 0,
        insights: pubInsights ?? 0,
        announcements: pubAnnouncements ?? 0,
      });
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
          <h1>
            Content <span className="studio-title-accent">overview</span>
          </h1>
          <p className="dash-hero-lead">
            Manage everything that powers careers, team pages, blog, and portfolios
            — without leaving code.
          </p>
          <div className="dash-hero-actions">
            <Link to="/jobs?new=1" className="btn btn-primary">
              <Plus size={15} /> New Job
            </Link>
            <a className="btn" href="http://quorixa-solution.vercel.app" target="_blank" rel="noreferrer">
              <BookOpen size={15} /> View Guide
            </a>
          </div>
        </div>
      </section>

      <div className="stats">
        {cards.map(({ key, label, to, icon: Icon, tint, color, spark, trend }) => (
          <Link key={key} to={to} className="metric-link">
            <MetricCard
              icon={<Icon size={16} strokeWidth={2.2} />}
              label={label}
              value={loading ? "—" : counts[key]}
              tint={tint}
              color={color}
              spark={spark}
              trend={trend}
            />
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
              : `${published.jobs} published jobs · ${published.insights} updated insights · ${published.announcements} live announcements`}
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
            <Link to="/announcements" className="live-link" style={{ background: "#fdf4ff" }}>
              <span style={{ background: "#fce7f3", color: "#c026d3" }}>
                <Megaphone size={14} />
              </span>
              <span className="live-copy">
                <strong>Edit announcements</strong>
                <small>Share news with website visitors.</small>
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
