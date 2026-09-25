import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState, type ReactNode } from "react";
import {
  Bell,
  Briefcase,
  Building2,
  ChevronRight,
  Crown,
  ExternalLink,
  FileText,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  MessageSquareQuote,
  Search,
  Settings,
  Shield,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "./auth";
import sidebarLogo from "./assets/uorixa-logo.png";

const links = [
  { to: "/", label: "Dashboard", end: true, icon: LayoutDashboard },
  { to: "/jobs", label: "Jobs", icon: Briefcase },
  { to: "/locations", label: "Locations", icon: MapPin },
  { to: "/team", label: "Team", icon: Users },
  { to: "/insights", label: "Insights", icon: FileText },
  { to: "/case-studies", label: "Case studies", icon: FolderKanban },
  { to: "/clients", label: "Clients", icon: Building2 },
  { to: "/feedback", label: "Feedback", icon: MessageSquareQuote },
  { to: "/users", label: "Users", icon: Shield },
];

function displayName(email: string) {
  const local = email.split("@")[0] ?? "";
  const first = local.split(/[._-]/)[0] ?? "";
  if (!first) return "Admin";
  return first.charAt(0).toUpperCase() + first.slice(1);
}

export function Shell({ children }: { children: ReactNode }) {
  const { signOut, session, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const email = session?.user.email ?? "";
  const name = displayName(email);
  const initial = name.slice(0, 1).toUpperCase() || "A";
  const crumb =
    links.find((l) =>
      l.end ? location.pathname === "/" : location.pathname.startsWith(l.to),
    )?.label ?? "Admin";
  const showPhase = location.pathname !== "/" && !location.pathname.startsWith("/jobs");

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <div className="layout">
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="brand">
          <img src={sidebarLogo} alt="UORIXA" className="brand-logo-full" />
        </div>

        <div className="nav-label">Manage</div>
        <nav className="side-nav">
          {links.map((l) => {
            const Icon = l.icon;
            return (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
                onClick={() => setOpen(false)}
              >
                <Icon size={18} strokeWidth={1.9} />
                {l.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-foot">
          <div className="upgrade-card">
            <span className="upgrade-icon">
              <Crown size={16} />
            </span>
            <div>
              <strong>Upgrade to Pro</strong>
              <span>Unlock more features and grow faster.</span>
            </div>
            <ChevronRight size={16} />
          </div>
          <a className="nav-link" href="http://quorixa-solution.vercel.app" target="_blank" rel="noreferrer">
            <ExternalLink size={17} strokeWidth={1.9} />
            View website
          </a>
          <div className="user-chip">
            <div className="user-avatar">{initial}</div>
            <div className="user-meta">
              <strong title={email}>{email || "Admin"}</strong>
              <span>{profile?.role === "admin" ? "Administrator" : "Member"}</span>
            </div>
            <ChevronRight size={16} />
          </div>
          <button type="button" className="nav-link nav-btn">
            <Settings size={17} strokeWidth={1.9} />
            Settings
          </button>
          <button type="button" className="nav-link nav-btn" onClick={() => void signOut()}>
            <LogOut size={17} strokeWidth={1.9} />
            Sign out
          </button>
        </div>
      </aside>

      <div className="main-wrap">
        <header className="topbar">
          <button
            type="button"
            className="btn btn-ghost btn-icon menu-btn"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>

          <nav className="breadcrumb" aria-label="Breadcrumb">
            <button type="button" className="crumb-link" onClick={() => navigate("/")}>
              Home
            </button>
            <ChevronRight size={14} />
            <span className="crumb-current">{crumb}</span>
          </nav>

          <label className="top-search">
            <Search size={16} />
            <input placeholder="Search anything..." aria-label="Search anything" />
            <kbd>⌘K</kbd>
          </label>

          <div className="topbar-actions">
            <button type="button" className="icon-btn" aria-label="Notifications">
              <Bell size={17} />
              <span className="dot" />
            </button>
            {showPhase ? (
              <span className="phase-pill">Phase | CMS</span>
            ) : (
              <div className="top-user">
                <div className="user-avatar">{initial}</div>
                <div className="user-meta">
                  <strong>{name}</strong>
                  <span>{profile?.role === "admin" ? "Administrator" : "Member"}</span>
                </div>
              </div>
            )}
          </div>
        </header>
        <main className="main">{children}</main>
      </div>

      {open ? (
        <div
          className="drawer-backdrop"
          style={{ zIndex: 25 }}
          onClick={() => setOpen(false)}
          aria-hidden
        />
      ) : null}
    </div>
  );
}
