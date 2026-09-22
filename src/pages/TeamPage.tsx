import { useMemo, useState, type FormEvent } from "react";
import { Pencil, Plus, Trash2, Users, Crown, Code2, PenTool } from "lucide-react";
import type { TeamMemberKind, TeamMemberRow } from "../../../shared/cms-types";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { Drawer } from "../components/Drawer";
import { EmptyState, TableSkeleton } from "../components/EmptyState";
import { ImageField } from "../components/ImageField";
import { PageHeader } from "../components/PageHeader";
import { SearchInput } from "../components/SearchInput";
import { MetricCard, sparks } from "../components/MetricCard";
import { StatusBadge } from "../components/StatusBadge";
import { useToast } from "../components/Toast";
import { useResourceList } from "../hooks/useResourceList";
import { supabase } from "../lib/supabase";

type Draft = Omit<TeamMemberRow, "id"> & { id?: string };

const empty = (): Draft => ({
  slug: "",
  name: "",
  role: "",
  bio: null,
  region: null,
  quote: null,
  photo_url: null,
  kind: "team",
  sort_order: 0,
  published: true,
});

export function TeamPage() {
  const { push } = useToast();
  const { rows, loading, error, reload } = useResourceList<TeamMemberRow>("team_members");
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"all" | TeamMemberKind>("all");
  const [editing, setEditing] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (kind !== "all" && r.kind !== kind) return false;
      if (!q) return true;
      return `${r.name} ${r.role} ${r.region ?? ""} ${r.kind}`.toLowerCase().includes(q);
    });
  }, [rows, query, kind]);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setFormError(null);
    const payload = {
      ...editing,
      slug: editing.slug || null,
      bio: editing.bio || null,
      region: editing.region || null,
      quote: editing.quote || null,
    };
    const { error: err } = editing.id
      ? await supabase.from("team_members").update(payload).eq("id", editing.id)
      : await supabase.from("team_members").insert(payload);
    setSaving(false);
    if (err) {
      setFormError(err.message);
      return;
    }
    push(editing.id ? "Member saved" : "Member added");
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
    push("Member deleted");
    setDeleteId(null);
    await reload();
  };

  return (
    <div>
      <PageHeader
        title="Team"
        description="People are Home, About, Leadership, and careers portraits."
        quote="Great people build amazing things."
        actions={
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setEditing({ ...empty(), sort_order: rows.length });
              setFormError(null);
            }}
          >
            <Plus size={16} /> Add member
          </button>
        }
      />

      <div className="metric-row metric-row-4">
        <MetricCard
          icon={<Users size={16} />}
          label="Total members"
          value={loading ? "—" : rows.length}
          tint="#ede9fe"
          color="#7c3aed"
          spark={sparks.a}
        />
        <MetricCard
          icon={<Crown size={16} />}
          label="Leaders"
          value={loading ? "—" : rows.filter((r) => r.kind === "leadership").length}
          tint="#dcfce7"
          color="#16a34a"
          spark={sparks.b}
        />
        <MetricCard
          icon={<Code2 size={16} />}
          label="Engineers"
          value={loading ? "—" : rows.filter((r) => /engineer/i.test(r.role)).length}
          tint="#ffedd5"
          color="#ea580c"
          spark={sparks.c}
        />
        <MetricCard
          icon={<PenTool size={16} />}
          label="Designers"
          value={loading ? "—" : rows.filter((r) => /design/i.test(r.role)).length}
          tint="#fce7f3"
          color="#db2777"
          spark={sparks.d}
        />
      </div>

      <div className="panel">
        <div className="table-tools">
          <SearchInput value={query} onChange={setQuery} placeholder="Search people…" />
          <div className="filters">
            {(["all", "team", "leadership", "testimonial"] as const).map((k) => (
              <button
                key={k}
                type="button"
                className={`chip ${kind === k ? "active" : ""}`}
                onClick={() => setKind(k)}
              >
                {k === "all" ? "All" : k}
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
          <EmptyState title="No people found" description="Add team, leadership, or testimonials." />
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th />
                  <th>Name</th>
                  <th>Kind</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
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
                    <td style={{ textTransform: "capitalize" }}>{row.kind}</td>
                    <td>{row.role}</td>
                    <td>
                      <StatusBadge published={row.published} />
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => {
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
      </div>

      <Drawer
        open={!!editing}
        title={editing?.id ? "Edit member" : "New member"}
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
            <div className="field-row">
              <label className="field">
                <span>Kind</span>
                <select
                  value={editing.kind}
                  onChange={(e) =>
                    setEditing({ ...editing, kind: e.target.value as TeamMemberKind })
                  }
                >
                  <option value="team">Team</option>
                  <option value="leadership">Leadership</option>
                  <option value="testimonial">Testimonial</option>
                </select>
              </label>
              <label className="field">
                <span>Slug</span>
                <input
                  value={editing.slug ?? ""}
                  onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                />
              </label>
            </div>
            <label className="field">
              <span>Name</span>
              <input
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                required
              />
            </label>
            <label className="field">
              <span>Role / title</span>
              <input
                value={editing.role}
                onChange={(e) => setEditing({ ...editing, role: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Region / location</span>
              <input
                value={editing.region ?? ""}
                onChange={(e) => setEditing({ ...editing, region: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Bio</span>
              <textarea
                value={editing.bio ?? ""}
                onChange={(e) => setEditing({ ...editing, bio: e.target.value })}
              />
            </label>
            {editing.kind === "testimonial" && (
              <label className="field">
                <span>Quote</span>
                <textarea
                  value={editing.quote ?? ""}
                  onChange={(e) => setEditing({ ...editing, quote: e.target.value })}
                />
              </label>
            )}
            <ImageField
              bucket="team"
              value={editing.photo_url}
              onChange={(url) => setEditing({ ...editing, photo_url: url })}
              label="Photo"
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
        title="Delete member?"
        message="They will disappear from team, leadership, and testimonial sections."
        busy={deleting}
        onCancel={() => setDeleteId(null)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
