import { useMemo, useState, type FormEvent } from "react";
import { Pencil, Plus, Trash2, Users, Crown, MessageSquareQuote, ChevronRight } from "lucide-react";
import type { TeamMemberRow } from "../lib/cms-types";
import {
  parsePersonMeta,
  serializePersonMeta,
} from "../lib/personMeta";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { Drawer } from "../components/Drawer";
import { EmptyState, TableSkeleton } from "../components/EmptyState";
import { ImageField } from "../components/ImageField";
import { PageHeader } from "../components/PageHeader";
import { Pagination } from "../components/Pagination";
import { SearchInput } from "../components/SearchInput";
import { MetricCard, metricTrends, sparks } from "../components/MetricCard";
import { StatusBadge } from "../components/StatusBadge";
import { useToast } from "../components/Toast";
import { usePagination } from "../hooks/usePagination";
import { useResourceList } from "../hooks/useResourceList";
import { supabase } from "../lib/supabase";
import teamBg from "../assets/team.png";

type PersonDraft = {
  id?: string;
  slug: string;
  name: string;
  region: string;
  teamRole: string;
  leadershipRole: string;
  quote: string;
  photo_url: string | null;
  sort_order: number;
  published: boolean;
};

type SurfaceFilter = "all" | "team" | "leadership" | "quote";

const empty = (): PersonDraft => ({
  slug: "",
  name: "",
  region: "",
  teamRole: "",
  leadershipRole: "",
  quote: "",
  photo_url: null,
  sort_order: 0,
  published: true,
});

function rowToDraft(row: TeamMemberRow): PersonDraft {
  const meta = parsePersonMeta(row.bio);
  const teamRole = row.kind === "team" ? row.role : "";
  const leadershipRole =
    meta.leadershipRole || (row.kind === "leadership" ? row.role : "");
  return {
    id: row.id,
    slug: row.slug ?? "",
    name: row.name,
    region: row.region ?? "",
    teamRole,
    leadershipRole,
    quote: row.quote ?? "",
    photo_url: row.photo_url,
    sort_order: row.sort_order,
    published: row.published,
  };
}

function draftToPayload(draft: PersonDraft) {
  const teamRole = draft.teamRole.trim();
  const leadershipRole = draft.leadershipRole.trim();
  const quote = draft.quote.trim();
  return {
    slug: draft.slug.trim() || null,
    name: draft.name.trim(),
    role: teamRole || leadershipRole || "",
    region: draft.region.trim() || null,
    quote: quote || null,
    photo_url: draft.photo_url,
    kind: (teamRole ? "team" : "leadership") as "team" | "leadership",
    bio: serializePersonMeta({
      leadershipRole: leadershipRole || undefined,
      bioText: "",
    }),
    sort_order: draft.sort_order,
    published: draft.published,
  };
}

function surfaces(row: TeamMemberRow): string {
  const d = rowToDraft(row);
  const parts: string[] = [];
  if (d.teamRole) parts.push("Team");
  if (d.leadershipRole) parts.push("Leadership");
  if (d.quote) parts.push("Feedback");
  return parts.join(" · ") || "—";
}

export function TeamPage() {
  const { push } = useToast();
  const { rows, loading, error, reload } = useResourceList<TeamMemberRow>("team_members");
  const [query, setQuery] = useState("");
  const [surface, setSurface] = useState<SurfaceFilter>("all");
  const [editing, setEditing] = useState<PersonDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      const d = rowToDraft(r);
      if (surface === "team" && !d.teamRole) return false;
      if (surface === "leadership" && !d.leadershipRole) return false;
      if (surface === "quote" && !d.quote) return false;
      if (!q) return true;
      return `${d.name} ${d.teamRole} ${d.leadershipRole} ${d.region} ${d.quote}`
        .toLowerCase()
        .includes(q);
    });
  }, [rows, query, surface]);

  const {
    page,
    setPage,
    pages,
    pageItems,
    rangeStart,
    rangeEnd,
    total,
  } = usePagination(filtered, 8, `${query}|${surface}`);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    if (!editing.teamRole.trim() && !editing.leadershipRole.trim()) {
      setFormError("Add at least a team role or a leadership role.");
      return;
    }
    setSaving(true);
    setFormError(null);
    const payload = draftToPayload(editing);
    const { error: err } = editing.id
      ? await supabase.from("team_members").update(payload).eq("id", editing.id)
      : await supabase.from("team_members").insert(payload);
    setSaving(false);
    if (err) {
      setFormError(err.message);
      return;
    }
    push(editing.id ? "Person saved" : "Person added");
    setEditing(null);
    await reload();
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const { error: err } = await supabase.from("team_members").delete().eq("id", deleteId);
    setDeleting(false);
    if (err) {
      push(err.message, "err");
      return;
    }
    push("Person deleted");
    setDeleteId(null);
    await reload();
  };

  return (
    <div>
      <PageHeader
        kicker="Team"
        title="Our Team"
        accentWord="Team"
        description="People are Home, About, Leadership, and careers portraits."
        quote="Great people build amazing things."
        background={teamBg}
        actions={
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setEditing({ ...empty(), sort_order: rows.length });
              setFormError(null);
            }}
          >
            <Plus size={16} /> Add member <ChevronRight size={15} strokeWidth={2.4} />
          </button>
        }
      />

      <div className="metric-row metric-row-4">
        <MetricCard
          icon={<Users size={16} />}
          label="People"
          value={loading ? "—" : rows.length}
          tint="#ede9fe"
          color="#7c3aed"
          spark={sparks.a}
          trend={metricTrends.a}
        />
        <MetricCard
          icon={<Users size={16} />}
          label="On team grid"
          value={
            loading
              ? "—"
              : rows.filter((r) => rowToDraft(r).teamRole).length
          }
          tint="#ffedd5"
          color="#ea580c"
          spark={sparks.b}
          trend={metricTrends.b}
        />
        <MetricCard
          icon={<Crown size={16} />}
          label="Leadership"
          value={
            loading
              ? "—"
              : rows.filter((r) => rowToDraft(r).leadershipRole).length
          }
          tint="#dcfce7"
          color="#16a34a"
          spark={sparks.c}
          trend={metricTrends.c}
        />
        <MetricCard
          icon={<MessageSquareQuote size={16} />}
          label="With feedback"
          value={
            loading ? "—" : rows.filter((r) => rowToDraft(r).quote).length
          }
          tint="#fce7f3"
          color="#db2777"
          spark={sparks.d}
          trend={metricTrends.d}
        />
      </div>

      <div className="panel">
        <div className="table-tools">
          <SearchInput value={query} onChange={setQuery} placeholder="Search people…" />
          <div className="filters">
            {(
              [
                ["all", "All"],
                ["team", "Team"],
                ["leadership", "Leadership"],
                ["quote", "Feedback"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                className={`chip ${surface === k ? "active" : ""}`}
                onClick={() => setSurface(k)}
              >
                {label}
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
          <EmptyState title="No people found" description="Add a person with team and/or leadership roles." />
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th />
                  <th>Name</th>
                  <th>Surfaces</th>
                  <th>Roles</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {pageItems.map((row) => {
                  const d = rowToDraft(row);
                  return (
                    <tr key={row.id}>
                      <td>
                        {row.photo_url ? (
                          <img src={row.photo_url} alt="" className="thumb" />
                        ) : (
                          <div className="thumb" />
                        )}
                      </td>
                      <td>
                        <div className="cell-title">{row.name}</div>
                        <div className="cell-sub">{row.region || "—"}</div>
                      </td>
                      <td>{surfaces(row)}</td>
                      <td>
                        <div className="cell-title" style={{ fontWeight: 500 }}>
                          {d.teamRole || d.leadershipRole || "—"}
                        </div>
                        {d.teamRole && d.leadershipRole ? (
                          <div className="cell-sub">{d.leadershipRole}</div>
                        ) : null}
                      </td>
                      <td>
                        <StatusBadge published={row.published} />
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            type="button"
                            className="btn btn-sm"
                            onClick={() => {
                              setEditing(rowToDraft(row));
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
                  );
                })}
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
            label="people"
            onPageChange={setPage}
          />
        ) : null}
      </div>

      <Drawer
        open={!!editing}
        title={editing?.id ? "Edit person" : "New person"}
        onClose={() => !saving && setEditing(null)}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>
              Cancel
            </button>
            <div className="right">
              <button type="submit" form="team-form" className="btn btn-primary" disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </>
        }
      >
        {editing && (
          <form id="team-form" onSubmit={(e) => void save(e)} style={{ display: "contents" }}>
            <label className="field">
              <span>Name</span>
              <input
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                required
              />
            </label>
            <div className="field-row">
              <label className="field">
                <span>Slug</span>
                <input
                  value={editing.slug}
                  onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                  placeholder="amelia-chen"
                />
              </label>
              <label className="field">
                <span>Region / location</span>
                <input
                  value={editing.region}
                  onChange={(e) => setEditing({ ...editing, region: e.target.value })}
                />
              </label>
            </div>
            <label className="field">
              <span>Team role</span>
              <input
                value={editing.teamRole}
                onChange={(e) => setEditing({ ...editing, teamRole: e.target.value })}
                placeholder="Engineering Director"
              />
            </label>
            <label className="field">
              <span>Leadership title</span>
              <input
                value={editing.leadershipRole}
                onChange={(e) => setEditing({ ...editing, leadershipRole: e.target.value })}
                placeholder="CEO"
              />
            </label>
            <label className="field">
              <span>Feedback quote</span>
              <textarea
                value={editing.quote}
                onChange={(e) => setEditing({ ...editing, quote: e.target.value })}
                placeholder="Optional — shown on About culture"
              />
            </label>
            <ImageField
              bucket="team"
              value={editing.photo_url}
              onChange={(url) => setEditing({ ...editing, photo_url: url })}
              label="Photo (one per person)"
            />
            <label className="check-row">
              <input
                type="checkbox"
                checked={editing.published}
                onChange={(e) => setEditing({ ...editing, published: e.target.checked })}
              />
              Published
            </label>
            {formError && <p className="error">{formError}</p>}
          </form>
        )}
      </Drawer>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete this person?"
        message="Their team, leadership, and feedback appearances will be removed."
        confirmLabel={deleting ? "Deleting…" : "Delete"}
        busy={deleting}
        onCancel={() => setDeleteId(null)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
