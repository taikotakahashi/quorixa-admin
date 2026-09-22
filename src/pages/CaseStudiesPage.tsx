import { useMemo, useState, type FormEvent } from "react";
import { Boxes, ExternalLink, Pencil, Plus, Send, Star, Trash2 } from "lucide-react";
import type { CaseStudyRow, CaseStudyTag } from "../../../shared/cms-types";
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
    .slice(0, 48);
}

const empty = (): CaseStudyRow => ({
  id: "",
  title: "",
  description: "",
  image_url: null,
  tags: [],
  href: null,
  industry: null,
  result: null,
  sort_order: 0,
  published: true,
});

const defaultDetail = {
  heroDescription: "",
  industries: "",
  services: [] as string[],
  solutions: [] as string[],
  technologies: [] as string[],
  outcomes: [] as string[],
  solutionAreas: [] as unknown[],
  ctaTitle: "Want to build an award-winning app?",
  ctaDescription:
    "Partner with QUORIXA to design, engineer, and scale products trusted by global brands.",
};

export function CaseStudiesPage() {
  const { push } = useToast();
  const { rows, loading, error, reload } = useResourceList<CaseStudyRow>("case_studies");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<CaseStudyRow | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [detailJson, setDetailJson] = useState(JSON.stringify(defaultDetail, null, 2));
  const [tagsText, setTagsText] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      `${r.title} ${r.industry ?? ""} ${r.result ?? ""}`.toLowerCase().includes(q),
    );
  }, [rows, query]);

  const openEdit = async (row: CaseStudyRow) => {
    setIsNew(false);
    setEditing(row);
    setTagsText((row.tags ?? []).map((t) => t.label).join(", "));
    setFormError(null);
    setDetailLoading(true);
    const { data } = await supabase
      .from("case_study_details")
      .select("detail")
      .eq("case_study_id", row.id)
      .maybeSingle();
    setDetailJson(JSON.stringify(data?.detail ?? defaultDetail, null, 2));
    setDetailLoading(false);
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setFormError(null);
    let detail: Record<string, unknown> = {};
    try {
      detail = JSON.parse(detailJson || "{}") as Record<string, unknown>;
    } catch {
      setFormError("Detail JSON is invalid — check commas and quotes.");
      setSaving(false);
      return;
    }
    const id = editing.id || slugify(editing.title) || `study-${Date.now()}`;
    const existingTags = editing.tags ?? [];
    const tags: CaseStudyTag[] = tagsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((label) => {
        const prev = existingTags.find((t) => t.label === label);
        return (
          prev ?? {
            label,
            color: "#eef2ff",
            textColor: "#3730a3",
          }
        );
      });
    const payload = {
      ...editing,
      id,
      tags,
      href: editing.href || `/our-work/${id}`,
      industry: editing.industry || null,
      result: editing.result || null,
    };
    const { error: err } = await supabase.from("case_studies").upsert(payload);
    if (err) {
      setFormError(err.message);
      setSaving(false);
      return;
    }
    const { error: dErr } = await supabase.from("case_study_details").upsert({
      case_study_id: id,
      detail,
    });
    setSaving(false);
    if (dErr) {
      setFormError(dErr.message);
      return;
    }
    push(isNew ? "Case study created" : "Case study saved");
    setEditing(null);
    await reload();
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const { error: err } = await supabase.from("case_studies").delete().eq("id", deleteId);
    setDeleting(false);
    if (err) {
      push(err.message, "err");
      return;
    }
    push("Case study deleted");
    setDeleteId(null);
    await reload();
  };

  return (
    <div>
      <PageHeader
        kicker="Our work"
        title="Case studies"
        description="Portfolio cards and detail pages under Our Work."
        quote="Real work. Real impact. Greater possibilities."
        actions={
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              const draft = { ...empty(), sort_order: rows.length };
              setIsNew(true);
              setEditing(draft);
              setTagsText("");
              setDetailJson(JSON.stringify(defaultDetail, null, 2));
              setFormError(null);
            }}
          >
            <Plus size={16} /> Add project
          </button>
        }
      />

      <div className="metric-row metric-row-4">
        <MetricCard
          icon={<Boxes size={16} />}
          label="Total projects"
          value={loading ? "—" : rows.length}
          tint="#ede9fe"
          color="#7c3aed"
          spark={sparks.a}
        />
        <MetricCard
          icon={<Send size={16} />}
          label="Published"
          value={loading ? "—" : rows.filter((r) => r.published).length}
          tint="#dcfce7"
          color="#16a34a"
          spark={sparks.b}
        />
        <MetricCard
          icon={<Boxes size={16} />}
          label="Industries"
          value={
            loading
              ? "—"
              : new Set(rows.map((r) => r.industry).filter(Boolean)).size
          }
          tint="#ffedd5"
          color="#ea580c"
          spark={sparks.c}
        />
        <MetricCard
          icon={<Star size={16} />}
          label="Featured"
          value={
            loading
              ? "—"
              : rows.filter((r) => (r.tags ?? []).some((t) => /feature/i.test(t.label))).length
          }
          tint="#fce7f3"
          color="#db2777"
          spark={sparks.d}
        />
      </div>

      <div className="panel">
        <div className="table-tools">
          <SearchInput value={query} onChange={setQuery} placeholder="Search projects…" />
        </div>

        {loading ? (
          <TableSkeleton />
        ) : error ? (
          <div className="empty">
            <p className="error">{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState title="No case studies" description="Add a project to the portfolio." />
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th />
                  <th>Project</th>
                  <th>Industry</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id}>
                    <td>
                      {row.image_url ? (
                        <img src={row.image_url} alt="" className="thumb" />
                      ) : (
                        <div className="thumb" />
                      )}
                    </td>
                    <td>
                      <div className="cell-title">{row.title}</div>
                      <div className="cell-sub">{row.result || row.id}</div>
                    </td>
                    <td>{row.industry || "—"}</td>
                    <td>
                      <StatusBadge published={row.published} />
                    </td>
                    <td>
                      <div className="row-actions">
                        <a
                          className="btn btn-sm btn-ghost"
                          href={`http://localhost:5173/our-work/${row.id}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <ExternalLink size={14} />
                        </a>
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => void openEdit(row)}
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
        title={isNew ? "New case study" : "Edit case study"}
        subtitle={detailLoading ? "Loading detail…" : undefined}
        onClose={() => !saving && setEditing(null)}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>
              Cancel
            </button>
            <div className="right">
              <button type="submit" form="cs-form" className="btn btn-primary" disabled={saving}>
                {saving ? "Saving…" : "Save project"}
              </button>
            </div>
          </>
        }
      >
        {editing && (
          <form id="cs-form" onSubmit={(e) => void save(e)} style={{ display: "contents" }}>
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
              <span>Card description</span>
              <textarea
                value={editing.description}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
              />
            </label>
            <div className="field-row">
              <label className="field">
                <span>Industry</span>
                <input
                  value={editing.industry ?? ""}
                  onChange={(e) => setEditing({ ...editing, industry: e.target.value })}
                />
              </label>
              <label className="field">
                <span>Result highlight</span>
                <input
                  value={editing.result ?? ""}
                  onChange={(e) => setEditing({ ...editing, result: e.target.value })}
                />
              </label>
            </div>
            <label className="field">
              <span>Studio tags (comma-separated)</span>
              <input value={tagsText} onChange={(e) => setTagsText(e.target.value)} />
              <span className="field-hint">e.g. AI Studio, Backend, Design Studio</span>
            </label>
            <ImageField
              bucket="case-studies"
              value={editing.image_url}
              onChange={(url) => setEditing({ ...editing, image_url: url })}
              label="Cover image"
            />
            <label className="field">
              <span>Detail JSON</span>
              <textarea
                style={{
                  minHeight: 220,
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                  fontSize: 12,
                }}
                value={detailJson}
                onChange={(e) => setDetailJson(e.target.value)}
              />
              <span className="field-hint">
                Structured long-form content for the project page. Keep valid JSON.
              </span>
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
        title="Delete case study?"
        message="Removes the card and its detail page content."
        busy={deleting}
        onCancel={() => setDeleteId(null)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
