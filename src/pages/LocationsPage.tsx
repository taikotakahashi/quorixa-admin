import { useMemo, useState, type FormEvent } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { TalentLocationRow, TalentRegion } from "../lib/cms-types";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { Drawer } from "../components/Drawer";
import { EmptyState, TableSkeleton } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { SearchInput } from "../components/SearchInput";
import { StatusBadge } from "../components/StatusBadge";
import { useToast } from "../components/Toast";
import { useResourceList } from "../hooks/useResourceList";
import { supabase } from "../lib/supabase";

const empty = (): TalentLocationRow => ({
  id: "",
  name: "",
  region: "Americas",
  flag: "",
  utc_offset: "UTC",
  x: 50,
  y: 50,
  open_roles_override: null,
  sort_order: 0,
  published: true,
});

export function LocationsPage() {
  const { push } = useToast();
  const { rows, loading, error, reload } = useResourceList<TalentLocationRow>(
    "talent_locations",
  );
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState<"all" | TalentRegion>("all");
  const [editing, setEditing] = useState<TalentLocationRow | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (region !== "all" && r.region !== region) return false;
      if (!q) return true;
      return `${r.name} ${r.id} ${r.region}`.toLowerCase().includes(q);
    });
  }, [rows, query, region]);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setFormError(null);
    const { error: err } = await supabase.from("talent_locations").upsert({
      ...editing,
      open_roles_override:
        editing.open_roles_override === null ||
        Number.isNaN(Number(editing.open_roles_override))
          ? null
          : Number(editing.open_roles_override),
      x: Number(editing.x),
      y: Number(editing.y),
    });
    setSaving(false);
    if (err) {
      setFormError(err.message);
      return;
    }
    push(isNew ? "Location created" : "Location saved");
    setEditing(null);
    await reload();
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const { error: err } = await supabase
      .from("talent_locations")
      .delete()
      .eq("id", deleteId);
    setDeleting(false);
    if (err) {
      push(err.message, "err");
      return;
    }
    push("Location deleted");
    setDeleteId(null);
    await reload();
  };

  return (
    <div>
      <PageHeader
        title="Locations"
        description="Countries on the talent map. Map X/Y are percentages on the world map."
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
            <Plus size={16} /> Add location
          </button>
        }
      />

      <div className="panel">
        <div className="table-tools">
          <SearchInput value={query} onChange={setQuery} placeholder="Search countries…" />
          <div className="filters">
            {(["all", "Americas", "Europe", "Asia"] as const).map((r) => (
              <button
                key={r}
                type="button"
                className={`chip ${region === r ? "active" : ""}`}
                onClick={() => setRegion(r)}
              >
                {r === "all" ? "All" : r}
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
          <EmptyState title="No locations" description="Add countries for the careers map." />
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Country</th>
                  <th>Region</th>
                  <th>Map %</th>
                  <th>Override</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <div className="cell-title">
                        {row.flag} {row.name}
                      </div>
                      <div className="cell-sub">{row.utc_offset}</div>
                    </td>
                    <td>{row.region}</td>
                    <td>
                      {row.x}, {row.y}
                    </td>
                    <td>{row.open_roles_override ?? "auto"}</td>
                    <td>
                      <StatusBadge published={row.published} />
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
      </div>

      <Drawer
        open={!!editing}
        title={isNew ? "New location" : "Edit location"}
        onClose={() => !saving && setEditing(null)}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>
              Cancel
            </button>
            <div className="right">
              <button type="submit" form="loc-form" className="btn btn-primary" disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </>
        }
      >
        {editing && (
          <form id="loc-form" onSubmit={(e) => void save(e)} style={{ display: "contents" }}>
            <div className="field-row">
              <label className="field">
                <span>ID</span>
                <input
                  value={editing.id}
                  onChange={(e) => setEditing({ ...editing, id: e.target.value })}
                  required
                  disabled={!isNew}
                />
              </label>
              <label className="field">
                <span>Name</span>
                <input
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  required
                />
              </label>
            </div>
            <div className="field-row-3">
              <label className="field">
                <span>Region</span>
                <select
                  value={editing.region}
                  onChange={(e) =>
                    setEditing({ ...editing, region: e.target.value as TalentRegion })
                  }
                >
                  <option>Americas</option>
                  <option>Europe</option>
                  <option>Asia</option>
                </select>
              </label>
              <label className="field">
                <span>Flag</span>
                <input
                  value={editing.flag}
                  onChange={(e) => setEditing({ ...editing, flag: e.target.value })}
                  placeholder="🇵🇱"
                />
              </label>
              <label className="field">
                <span>UTC</span>
                <input
                  value={editing.utc_offset}
                  onChange={(e) => setEditing({ ...editing, utc_offset: e.target.value })}
                />
              </label>
            </div>
            <div className="field-row-3">
              <label className="field">
                <span>Map X %</span>
                <input
                  type="number"
                  value={editing.x}
                  onChange={(e) => setEditing({ ...editing, x: Number(e.target.value) })}
                />
              </label>
              <label className="field">
                <span>Map Y %</span>
                <input
                  type="number"
                  value={editing.y}
                  onChange={(e) => setEditing({ ...editing, y: Number(e.target.value) })}
                />
              </label>
              <label className="field">
                <span>Open roles override</span>
                <input
                  type="number"
                  value={editing.open_roles_override ?? ""}
                  placeholder="auto"
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      open_roles_override:
                        e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                />
              </label>
            </div>
            <div
              style={{
                position: "relative",
                height: 160,
                borderRadius: 12,
                background:
                  "linear-gradient(180deg,#e2e8f0,#f8fafc), repeating-linear-gradient(90deg,#cbd5e1 0 1px,transparent 1px 20px), repeating-linear-gradient(#cbd5e1 0 1px,transparent 1px 20px)",
                border: "1px solid var(--border)",
                overflow: "hidden",
              }}
            >
              <div
                title="Pin preview"
                style={{
                  position: "absolute",
                  left: `${editing.x}%`,
                  top: `${editing.y}%`,
                  width: 14,
                  height: 14,
                  marginLeft: -7,
                  marginTop: -7,
                  borderRadius: "50%",
                  background: "var(--accent)",
                  boxShadow: "0 0 0 4px rgba(232,93,4,.25)",
                }}
              />
              <span
                className="muted"
                style={{ position: "absolute", left: 10, bottom: 8, fontSize: 11 }}
              >
                Pin preview (not the real map)
              </span>
            </div>
            <label className="check-row">
              <input
                type="checkbox"
                checked={editing.published}
                onChange={(e) => setEditing({ ...editing, published: e.target.checked })}
              />
              Published on maps
            </label>
            {formError && <p className="error">{formError}</p>}
          </form>
        )}
      </Drawer>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete location?"
        message="Jobs linked to this country will keep their location label but lose the map link."
        busy={deleting}
        onCancel={() => setDeleteId(null)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
