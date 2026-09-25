import { useMemo, useState, type FormEvent } from "react";
import {
  Bell,
  CalendarClock,
  Check,
  ChevronRight,
  Megaphone,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import type { AnnouncementRow, AnnouncementTone } from "../lib/cms-types";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { Drawer } from "../components/Drawer";
import { EmptyState, TableSkeleton } from "../components/EmptyState";
import { HeroInlineStats } from "../components/HeroInlineStats";
import { MetricCard, metricTrends, sparks } from "../components/MetricCard";
import { PageHeader } from "../components/PageHeader";
import { Pagination } from "../components/Pagination";
import { SearchInput } from "../components/SearchInput";
import { StatusBadge } from "../components/StatusBadge";
import { useToast } from "../components/Toast";
import { usePagination } from "../hooks/usePagination";
import { useResourceList } from "../hooks/useResourceList";
import { supabase } from "../lib/supabase";
import insightsBg from "../assets/insights.png";

const empty = (): Omit<AnnouncementRow, "id"> & { id?: string } => ({
  title: "",
  body: "",
  link_label: null,
  link_url: null,
  tone: "info",
  starts_at: null,
  ends_at: null,
  sort_order: 0,
  published: false,
});

function isActive(row: AnnouncementRow, now = Date.now()) {
  if (!row.published) return false;
  if (row.starts_at && new Date(row.starts_at).getTime() > now) return false;
  if (row.ends_at && new Date(row.ends_at).getTime() < now) return false;
  return true;
}

function isScheduled(row: AnnouncementRow, now = Date.now()) {
  return row.published && !!row.starts_at && new Date(row.starts_at).getTime() > now;
}

function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(value: string) {
  if (!value.trim()) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function toneLabel(tone: AnnouncementTone) {
  if (tone === "urgent") return "Urgent";
  if (tone === "highlight") return "Highlight";
  return "Info";
}

export function AnnouncementsPage() {
  const { push } = useToast();
  const { rows, loading, error, reload } = useResourceList<AnnouncementRow>("announcements");
  const [query, setQuery] = useState("");
  const [toneFilter, setToneFilter] = useState<"all" | AnnouncementTone>("all");
  const [editing, setEditing] = useState<(Omit<AnnouncementRow, "id"> & { id?: string }) | null>(
    null,
  );
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const now = Date.now();
  const publishedCount = rows.filter((r) => r.published).length;
  const activeCount = rows.filter((r) => isActive(r, now)).length;
  const scheduledCount = rows.filter((r) => isScheduled(r, now)).length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (toneFilter !== "all" && r.tone !== toneFilter) return false;
      if (!q) return true;
      return `${r.title} ${r.body} ${r.link_label ?? ""}`.toLowerCase().includes(q);
    });
  }, [rows, query, toneFilter]);

  const { page, setPage, pages, pageItems, rangeStart, rangeEnd, total } =
    usePagination(filtered, 8, `${query}|${toneFilter}`);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setFormError(null);
    const payload = {
      title: editing.title.trim(),
      body: editing.body.trim(),
      link_label: editing.link_label?.trim() || null,
      link_url: editing.link_url?.trim() || null,
      tone: editing.tone,
      starts_at: editing.starts_at,
      ends_at: editing.ends_at,
      sort_order: Number(editing.sort_order) || 0,
      published: editing.published,
    };
    const { error: err } = isNew
      ? await supabase.from("announcements").insert(payload)
      : await supabase.from("announcements").update(payload).eq("id", editing.id);
    setSaving(false);
    if (err) {
      setFormError(err.message);
      return;
    }
    push(isNew ? "Announcement created" : "Announcement saved");
    setEditing(null);
    await reload();
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const { error: err } = await supabase.from("announcements").delete().eq("id", deleteId);
    setDeleting(false);
    if (err) {
      push(err.message, "err");
      return;
    }
    push("Announcement deleted");
    setDeleteId(null);
    await reload();
  };

  return (
    <div>
      <PageHeader
        kicker="Site News"
        kickerIcon={Megaphone}
        title="Announcements"
        accentWord="Announcements"
        description="Publish short updates for visitors on the company website — banners, launch notes, and timely CTAs."
        quote="Keep visitors in the loop."
        background={insightsBg}
        actions={
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setIsNew(true);
              setEditing({ ...empty(), sort_order: rows.length });
              setFormError(null);
            }}
          >
            <Plus size={16} /> Add announcement <ChevronRight size={15} strokeWidth={2.4} />
          </button>
        }
        footer={
          <HeroInlineStats
            items={[
              {
                icon: <Megaphone size={22} strokeWidth={2} />,
                primary: "Visitor",
                secondary: "Updates",
                tint: "linear-gradient(145deg, #f3e8ff 0%, #e0e7ff 100%)",
                color: "#6d28d9",
              },
              {
                icon: <Bell size={22} strokeWidth={2} />,
                primary: "Timed",
                secondary: "Visibility",
                tint: "linear-gradient(145deg, #fce7f3 0%, #fbcfe8 100%)",
                color: "#db2777",
              },
              {
                icon: <Check size={22} strokeWidth={2} />,
                primary: "Live on",
                secondary: "the website",
                tint: "linear-gradient(145deg, #dbeafe 0%, #e0f2fe 100%)",
                color: "#2563eb",
              },
            ]}
          />
        }
      />

      <div className="metric-row metric-row-4">
        <MetricCard
          icon={<Megaphone size={16} />}
          label="Total"
          value={loading ? "—" : rows.length}
          tint="#ede9fe"
          color="#7c3aed"
          spark={sparks.a}
          trend={metricTrends.a}
        />
        <MetricCard
          icon={<Check size={16} />}
          label="Live now"
          value={loading ? "—" : activeCount}
          tint="#dcfce7"
          color="#16a34a"
          spark={sparks.b}
          trend={metricTrends.b}
        />
        <MetricCard
          icon={<CalendarClock size={16} />}
          label="Scheduled"
          value={loading ? "—" : scheduledCount}
          tint="#ffedd5"
          color="#ea580c"
          spark={sparks.c}
          trend={metricTrends.c}
        />
        <MetricCard
          icon={<Bell size={16} />}
          label="Published"
          value={loading ? "—" : publishedCount}
          tint="#dbeafe"
          color="#2563eb"
          spark={sparks.d}
          trend={metricTrends.d}
        />
      </div>

      <div className="panel">
        <div className="table-tools">
          <SearchInput value={query} onChange={setQuery} placeholder="Search announcements…" />
          <div className="filters">
            {(["all", "info", "highlight", "urgent"] as const).map((t) => (
              <button
                key={t}
                type="button"
                className={`chip ${toneFilter === t ? "active" : ""}`}
                onClick={() => setToneFilter(t)}
              >
                {t === "all" ? "All" : toneLabel(t)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <TableSkeleton />
        ) : error ? (
          <div className="empty">
            <p className="error">{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No announcements"
            description="Create a message for website visitors — launches, maintenance, or company news."
          />
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Announcement</th>
                  <th>Tone</th>
                  <th>Schedule</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {pageItems.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <div className="cell-title">{row.title}</div>
                      <div className="cell-sub">
                        {row.body.slice(0, 90)}
                        {row.body.length > 90 ? "…" : ""}
                      </div>
                    </td>
                    <td>{toneLabel(row.tone)}</td>
                    <td>
                      <div className="cell-sub">
                        {row.starts_at
                          ? `From ${new Date(row.starts_at).toLocaleString()}`
                          : "Starts immediately"}
                      </div>
                      <div className="cell-sub">
                        {row.ends_at
                          ? `Until ${new Date(row.ends_at).toLocaleString()}`
                          : "No end date"}
                      </div>
                    </td>
                    <td>
                      {isActive(row, now) ? (
                        <span className="badge">Live</span>
                      ) : isScheduled(row, now) ? (
                        <span className="badge warn">Scheduled</span>
                      ) : (
                        <StatusBadge published={row.published} />
                      )}
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => {
                            setIsNew(false);
                            setEditing(row);
                            setFormError(null);
                          }}
                        >
                          <Pencil size={14} /> Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-danger"
                          onClick={() => setDeleteId(row.id)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && !error && total > 0 ? (
          <Pagination
            page={page}
            pages={pages}
            total={total}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            label="announcements"
            onPageChange={setPage}
          />
        ) : null}
      </div>

      <Drawer
        open={!!editing}
        title={isNew ? "New announcement" : "Edit announcement"}
        onClose={() => !saving && setEditing(null)}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>
              Cancel
            </button>
            <div className="right">
              <button
                type="submit"
                form="announcement-form"
                className="btn btn-primary"
                disabled={saving}
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </>
        }
      >
        {editing && (
          <form
            id="announcement-form"
            onSubmit={(e) => void save(e)}
            style={{ display: "contents" }}
          >
            <label className="field">
              <span>Title</span>
              <input
                value={editing.title}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                required
                placeholder="Spring hiring event"
              />
            </label>
            <label className="field">
              <span>Message</span>
              <textarea
                rows={5}
                value={editing.body}
                onChange={(e) => setEditing({ ...editing, body: e.target.value })}
                required
                placeholder="What should visitors know?"
              />
            </label>
            <div className="field-row">
              <label className="field">
                <span>Tone</span>
                <select
                  value={editing.tone}
                  onChange={(e) =>
                    setEditing({ ...editing, tone: e.target.value as AnnouncementTone })
                  }
                >
                  <option value="info">Info</option>
                  <option value="highlight">Highlight</option>
                  <option value="urgent">Urgent</option>
                </select>
              </label>
              <label className="field">
                <span>Sort order</span>
                <input
                  type="number"
                  value={editing.sort_order}
                  onChange={(e) =>
                    setEditing({ ...editing, sort_order: Number(e.target.value) })
                  }
                />
              </label>
            </div>
            <div className="field-row">
              <label className="field">
                <span>CTA label</span>
                <input
                  value={editing.link_label ?? ""}
                  onChange={(e) =>
                    setEditing({ ...editing, link_label: e.target.value || null })
                  }
                  placeholder="Learn more"
                />
              </label>
              <label className="field">
                <span>CTA URL</span>
                <input
                  value={editing.link_url ?? ""}
                  onChange={(e) =>
                    setEditing({ ...editing, link_url: e.target.value || null })
                  }
                  placeholder="https://"
                />
              </label>
            </div>
            <div className="field-row">
              <label className="field">
                <span>Starts at</span>
                <input
                  type="datetime-local"
                  value={toLocalInput(editing.starts_at)}
                  onChange={(e) =>
                    setEditing({ ...editing, starts_at: fromLocalInput(e.target.value) })
                  }
                />
              </label>
              <label className="field">
                <span>Ends at</span>
                <input
                  type="datetime-local"
                  value={toLocalInput(editing.ends_at)}
                  onChange={(e) =>
                    setEditing({ ...editing, ends_at: fromLocalInput(e.target.value) })
                  }
                />
              </label>
            </div>
            <label className="check-row">
              <input
                type="checkbox"
                checked={editing.published}
                onChange={(e) => setEditing({ ...editing, published: e.target.checked })}
              />
              Published for website visitors
            </label>
            {formError && <p className="error">{formError}</p>}
          </form>
        )}
      </Drawer>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete announcement?"
        message="This removes the message from the public website immediately."
        busy={deleting}
        onCancel={() => setDeleteId(null)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
