import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Briefcase,
  Building2,
  FileText,
  FolderKanban,
  LayoutDashboard,
  MapPin,
  Megaphone,
  MessageSquareQuote,
  Plus,
  Search,
  Shield,
  Users,
  type LucideIcon,
} from "lucide-react";
import { searchCmsRecords, type CmsHit } from "../lib/cmsSearch";

type Command = {
  id: string;
  label: string;
  hint?: string;
  group: "Navigate" | "Create" | "Content";
  to: string;
  icon: LucideIcon;
  keywords?: string;
};

const commands: Command[] = [
  {
    id: "dash",
    label: "Dashboard",
    group: "Navigate",
    to: "/",
    icon: LayoutDashboard,
    keywords: "home overview",
  },
  {
    id: "jobs",
    label: "Jobs",
    group: "Navigate",
    to: "/jobs",
    icon: Briefcase,
    keywords: "careers roles openings",
  },
  {
    id: "locations",
    label: "Locations",
    group: "Navigate",
    to: "/locations",
    icon: MapPin,
    keywords: "map countries",
  },
  {
    id: "team",
    label: "Team",
    group: "Navigate",
    to: "/team",
    icon: Users,
    keywords: "people members",
  },
  {
    id: "insights",
    label: "Insights",
    group: "Navigate",
    to: "/insights",
    icon: FileText,
    keywords: "blog posts articles news",
  },
  {
    id: "case-studies",
    label: "Case studies",
    group: "Navigate",
    to: "/case-studies",
    icon: FolderKanban,
    keywords: "projects portfolio work",
  },
  {
    id: "clients",
    label: "Clients",
    group: "Navigate",
    to: "/clients",
    icon: Building2,
    keywords: "brands logos",
  },
  {
    id: "feedback",
    label: "Feedback",
    group: "Navigate",
    to: "/feedback",
    icon: MessageSquareQuote,
    keywords: "quotes testimonials",
  },
  {
    id: "announcements",
    label: "Announcements",
    group: "Navigate",
    to: "/announcements",
    icon: Megaphone,
    keywords: "news updates banner visitors site",
  },
  {
    id: "users",
    label: "Users",
    group: "Navigate",
    to: "/users",
    icon: Shield,
    keywords: "access admin accounts",
  },
  {
    id: "new-job",
    label: "Create new job",
    hint: "Opens Jobs with a blank draft",
    group: "Create",
    to: "/jobs?new=1",
    icon: Plus,
    keywords: "add job posting",
  },
  {
    id: "new-announcement",
    label: "Create announcement",
    hint: "Share news with website visitors",
    group: "Create",
    to: "/announcements",
    icon: Megaphone,
    keywords: "add news banner update",
  },
];

type Props = {
  open: boolean;
  onClose: () => void;
};

type ListItem = Command | CmsHit;

export function CommandPalette({ open, onClose }: Props) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [cmsHits, setCmsHits] = useState<CmsHit[]>([]);
  const [searching, setSearching] = useState(false);

  const filteredCommands = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => {
      const hay = `${c.label} ${c.hint ?? ""} ${c.keywords ?? ""} ${c.group}`.toLowerCase();
      return hay.includes(q);
    });
  }, [query]);

  const items: ListItem[] = useMemo(
    () => [...filteredCommands, ...cmsHits],
    [filteredCommands, cmsHits],
  );

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActive(0);
    setCmsHits([]);
    const t = window.setTimeout(() => inputRef.current?.focus(), 10);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [query, cmsHits.length]);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      setCmsHits([]);
      setSearching(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const t = window.setTimeout(() => {
      void searchCmsRecords(q)
        .then((hits) => {
          if (!cancelled) setCmsHits(hits);
        })
        .catch(() => {
          if (!cancelled) setCmsHits([]);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 220);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [query, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((i) => Math.min(i + 1, Math.max(items.length - 1, 0)));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const cmd = items[active];
        if (cmd) {
          navigate(cmd.to);
          onClose();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, items, active, navigate, onClose]);

  if (!open) return null;

  const groups = (["Navigate", "Create", "Content"] as const).filter((g) =>
    items.some((c) => c.group === g),
  );

  let flatIndex = -1;

  return (
    <div className="cmdk-backdrop" role="presentation" onClick={onClose}>
      <div
        className="cmdk"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cmdk-search">
          <Search size={18} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages, actions, and CMS content…"
            aria-label="Search commands and content"
          />
          <kbd>Esc</kbd>
        </div>
        <div className="cmdk-list" role="listbox">
          {items.length === 0 ? (
            <p className="cmdk-empty">
              {searching
                ? "Searching content…"
                : query.trim().length >= 2
                  ? "No matching pages or content."
                  : "Type to search pages and CMS records."}
            </p>
          ) : (
            groups.map((group) => (
              <div key={group} className="cmdk-group">
                <div className="cmdk-group-label">
                  {group}
                  {group === "Content" && searching ? " · searching…" : ""}
                </div>
                {items
                  .filter((c) => c.group === group)
                  .map((cmd) => {
                    flatIndex += 1;
                    const index = flatIndex;
                    const Icon = cmd.icon;
                    return (
                      <button
                        key={cmd.id}
                        type="button"
                        role="option"
                        aria-selected={index === active}
                        className={`cmdk-item${index === active ? " active" : ""}`}
                        onMouseEnter={() => setActive(index)}
                        onClick={() => {
                          navigate(cmd.to);
                          onClose();
                        }}
                      >
                        <span className="cmdk-item-icon">
                          <Icon size={16} strokeWidth={2} />
                        </span>
                        <span className="cmdk-item-copy">
                          <strong>{cmd.label}</strong>
                          {cmd.hint ? <small>{cmd.hint}</small> : null}
                        </span>
                      </button>
                    );
                  })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export function shortcutLabel() {
  if (typeof navigator === "undefined") return "Ctrl K";
  const mac = /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent);
  return mac ? "⌘K" : "Ctrl K";
}
