import { useMemo, useState, type FormEvent } from "react";
import { ExternalLink, FileText, MapPin, Newspaper, Pencil, Plus, Trash2 } from "lucide-react";
import type { InsightRow, InsightSection } from "../lib/cms-types";
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

function slugify(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

const empty = (): InsightRow => ({
  id: "",
  title: "",
  excerpt: "",
  category: "",
  section: "Insights",
  tags: [],
  published_at: null,
  read_time: "5 min",
  image_url: null,
  content: [],
  featured: false,
  sort_order: 0,
  published: true,
});

export function InsightsPage() {
  const { push } = useToast();
  const { rows, loading, error, reload } = useResourceList<InsightRow>("insights");
  const [query, setQuery] = useState("");
  const [section, setSection] = useState<"all" | InsightSection>("all");
  const [editing, setEditing] = useState<InsightRow | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [tagsText, setTagsText] = useState("");
  const [contentText, setContentText] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (section !== "all" && r.section !== section) return false;
      if (!q) return true;
      return `${r.title} ${r.excerpt} ${r.category} ${r.tags.join(" ")}`
        .toLowerCase()
        .includes(q);
    });
  }, [rows, query, section]);

  const openEdit = (row: InsightRow) => {
    setIsNew(false);
    setEditing(row);
    setTagsText(row.tags.join(", "));
    setContentText(row.content.join("\n\n"));
    setFormError(null);
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setFormError(null);
    const id = editing.id || slugify(editing.title) || `post-${Date.now()}`;
    const payload = {
      ...editing,
      id,
      tags: tagsText
        .split(/[,\n]/)
        .map((s) => s.trim())
        .filter(Boolean),
      content: contentText
        .split(/\n\n+/)
        .map((s) => s.trim())
        .filter(Boolean),
      published_at: editing.published_at || null,
    };
    const { error: err } = await supabase.from("insights").upsert(payload);
    setSaving(false);
    if (err) {
      setFormError(err.message);
      return;
    }
    push(isNew ? "Post created" : "Post saved");
    setEditing(null);
    await reload();
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const { error: err } = await supabase.from("insights").delete().eq("id", deleteId);
    setDeleting(false);
    if (err) {
      push(err.message, "err");
      return;
    }
    push("Post deleted");
    setDeleteId(null);
    await reload();
  };

  return (
    <div>
      <PageHeader
        kicker="Insights"
        title="Blog posts and news on insights."
        description="Share ideas, stories, and updates. Manage your blog posts, articles, and news to keep your audience informed and inspired."
        quote="Great content builds great things."
        actions={
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setIsNew(true);
              setEditing({ ...empty(), sort_order: rows.length });
              setTagsText("");
              setContentText("");
              setFormError(null);
            }}
          >
            <Plus size={16} /> New post
          </button>
        }
      />

      <div className="metric-row metric-row-4">
        <MetricCard
          icon={<FileText size={16} />}
          label="Total posts"
          value={loading ? "—" : rows.length}
          tint="#ede9fe"
          color="#7c3aed"
          spark={sparks.a}
        />
        <MetricCard
          icon={<MapPin size={16} />}
          label="Insights"
          value={loading ? "—" : rows.filter((r) => r.section === "Insights").length}
          tint="#dbeafe"
          color="#2563eb"
          spark={sparks.b}
        />
        <MetricCard
          icon={<FileText size={16} />}
          label="Articles"
          value={loading ? "—" : rows.filter((r) => r.section === "Articles").length}
          tint="#ffedd5"
          color="#ea580c"
          spark={sparks.c}
        />
        <MetricCard
          icon={<Newspaper size={16} />}
          label="News"
          value={loading ? "—" : rows.filter((r) => r.section === "News").length}
          tint="#fce7f3"
          color="#db2777"
          spark={sparks.d}
        />
      </div>

      <div className="panel">
        <div className="table-tools">
          <SearchInput value={query} onChange={setQuery} placeholder="Search posts…" />
          <div className="filters">
            {(["all", "Insights", "Articles", "News"] as const).map((s) => (
              <button
                key={s}
                type="button"
                className={`chip ${section === s ? "active" : ""}`}
                onClick={() => setSection(s)}
              >
                {s === "all" ? "All" : s}
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
          <EmptyState title="No posts" description="Publish your first insight." />
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Section</th>
                  <th>Flags</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <div className="cell-title">{row.title}</div>
                      <div className="cell-sub">{row.published_at || row.read_time}</div>
                    </td>
                    <td>{row.section}</td>
                    <td>{row.featured ? <span className="badge warn">Featured</span> : "—"}</td>
                    <td>
                      <StatusBadge published={row.published} />
                    </td>
                    <td>
                      <div className="row-actions">
                        <a
                          className="btn btn-sm btn-ghost"
                          href={`http://localhost:5173/insights/${row.id}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <ExternalLink size={14} />
                        </a>
                        <button type="button" className="btn btn-sm" onClick={() => openEdit(row)}>
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
        title={isNew ? "New post" : "Edit post"}
        onClose={() => !saving && setEditing(null)}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>
              Cancel
            </button>
            <div className="right">
              <button type="submit" form="insight-form" className="btn btn-primary" disabled={saving}>
                {saving ? "Saving…" : "Save post"}
              </button>
            </div>
          </>
        }
      >
        {editing && (
          <form id="insight-form" onSubmit={(e) => void save(e)} style={{ display: "contents" }}>
            <label className="field">
              <span>Title</span>
              <input
                value={editing.title}
                onChange={(e) => {
                  const title = e.target.value;
                  setEditing({
                    ...editing,
                    title,
                    id: isNew && !editing.id ? slugify(title) : editing.id,
                  });
                }}
                required
              />
            </label>
            <label className="field">
              <span>URL id</span>
              <input
                value={editing.id}
                onChange={(e) => setEditing({ ...editing, id: e.target.value })}
                required
                disabled={!isNew}
              />
            </label>
            <label className="field">
              <span>Excerpt</span>
              <textarea
                value={editing.excerpt}
                onChange={(e) => setEditing({ ...editing, excerpt: e.target.value })}
              />
            </label>
            <div className="field-row-3">
              <label className="field">
                <span>Section</span>
                <select
                  value={editing.section}
                  onChange={(e) =>
                    setEditing({ ...editing, section: e.target.value as InsightSection })
                  }
                >
                  <option>Insights</option>
                  <option>Articles</option>
                  <option>News</option>
                </select>
              </label>
              <label className="field">
                <span>Category</span>
                <input
                  value={editing.category}
                  onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                />
              </label>
              <label className="field">
                <span>Read time</span>
                <input
                  value={editing.read_time}
                  onChange={(e) => setEditing({ ...editing, read_time: e.target.value })}
                />
              </label>
            </div>
            <label className="field">
              <span>Publish date</span>
              <input
                type="date"
                value={editing.published_at ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, published_at: e.target.value || null })
                }
              />
            </label>
            <label className="field">
              <span>Tags (comma-separated)</span>
              <input value={tagsText} onChange={(e) => setTagsText(e.target.value)} />
            </label>
            <label className="field">
              <span>Body (blank line between paragraphs)</span>
              <textarea
                style={{ minHeight: 180 }}
                value={contentText}
                onChange={(e) => setContentText(e.target.value)}
              />
            </label>
            <ImageField
              bucket="insights"
              value={editing.image_url}
              onChange={(url) => setEditing({ ...editing, image_url: url })}
            />
            <label className="check-row">
              <input
                type="checkbox"
                checked={editing.featured}
                onChange={(e) => setEditing({ ...editing, featured: e.target.checked })}
              />
              Featured on Insights landing
            </label>
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
        title="Delete post?"
        message="This removes the article from the public Insights pages."
        busy={deleting}
        onCancel={() => setDeleteId(null)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
