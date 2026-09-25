import { useMemo, useState, type FormEvent } from "react";
import { Pencil, Plus, Trash2, ChevronRight, Building2 } from "lucide-react";
import type { ClientRow } from "../lib/cms-types";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { Drawer } from "../components/Drawer";
import { EmptyState, TableSkeleton } from "../components/EmptyState";
import { ImageField } from "../components/ImageField";
import { PageHeader } from "../components/PageHeader";
import { Pagination } from "../components/Pagination";
import { SearchInput } from "../components/SearchInput";
import { StatusBadge } from "../components/StatusBadge";
import { useToast } from "../components/Toast";
import { usePagination } from "../hooks/usePagination";
import { useResourceList } from "../hooks/useResourceList";
import { supabase } from "../lib/supabase";

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

const empty = (): ClientRow => ({
  id: "",
  name: "",
  logo_url: null,
  url: null,
  sort_order: 0,
  published: true,
});

export function ClientsPage() {
  const { push } = useToast();
  const { rows, loading, error, reload } = useResourceList<ClientRow>("clients");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<ClientRow | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(q));
  }, [rows, query]);

  const { page, setPage, pages, pageItems, rangeStart, rangeEnd, total } =
    usePagination(filtered, 8, query);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setFormError(null);
    const id = editing.id || slugify(editing.name) || `client-${Date.now()}`;
    const { error: err } = await supabase.from("clients").upsert({
      ...editing,
      id,
      url: editing.url || null,
    });
    setSaving(false);
    if (err) {
      setFormError(err.message);
      return;
    }
    push(isNew ? "Client added" : "Client saved");
    setEditing(null);
    await reload();
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const { error: err } = await supabase.from("clients").delete().eq("id", deleteId);
    setDeleting(false);
    if (err) {
      push(err.message, "err");
      return;
    }
    push("Client deleted");
    setDeleteId(null);
    await reload();
  };

  return (
    <div>
      <PageHeader
        kicker="Clients"
        kickerIcon={Building2}
        title="Our Clients"
        accentWord="Clients"
        description="Logo marquee brands on Home and About."
        quote="Brands that build with us."
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
            <Plus size={16} /> Add client <ChevronRight size={15} strokeWidth={2.4} />
          </button>
        }
      />

      <div className="panel">
        <div className="table-tools">
          <SearchInput value={query} onChange={setQuery} placeholder="Search clients…" />
        </div>

        {loading ? (
          <TableSkeleton />
        ) : error ? (
          <div className="empty">
            <p className="error">{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState title="No clients" description="Add logos for the home marquee." />
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th />
                  <th>Name</th>
                  <th>Website</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {pageItems.map((row) => (
                  <tr key={row.id}>
                    <td>
                      {row.logo_url ? (
                        <img src={row.logo_url} alt="" className="thumb" />
                      ) : (
                        <div className="thumb" />
                      )}
                    </td>
                    <td className="cell-title">{row.name}</td>
                    <td>
                      {row.url ? (
                        <a href={row.url} target="_blank" rel="noreferrer" className="muted">
                          {row.url.replace(/^https?:\/\//, "")}
                        </a>
                      ) : (
                        "—"
                      )}
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
            label="clients"
            onPageChange={setPage}
          />
        ) : null}
      </div>

      <Drawer
        open={!!editing}
        title={isNew ? "New client" : "Edit client"}
        onClose={() => !saving && setEditing(null)}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>
              Cancel
            </button>
            <div className="right">
              <button type="submit" form="client-form" className="btn btn-primary" disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </>
        }
      >
        {editing && (
          <form id="client-form" onSubmit={(e) => void save(e)} style={{ display: "contents" }}>
            <label className="field">
              <span>Name</span>
              <input
                value={editing.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setEditing({
                    ...editing,
                    name,
                    id: isNew && !editing.id ? slugify(name) : editing.id,
                  });
                }}
                required
              />
            </label>
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
              <span>Website URL</span>
              <input
                value={editing.url ?? ""}
                onChange={(e) => setEditing({ ...editing, url: e.target.value })}
                placeholder="https://"
              />
            </label>
            <ImageField
              bucket="clients"
              value={editing.logo_url}
              onChange={(url) => setEditing({ ...editing, logo_url: url })}
              label="Logo"
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
        title="Delete client?"
        message="Removes this logo from the public marquee."
        busy={deleting}
        onCancel={() => setDeleteId(null)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
