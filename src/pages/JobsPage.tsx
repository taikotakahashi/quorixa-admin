import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowUpDown,
  Briefcase,
  Building2,
  ChevronDown,
  ChevronRight,
  Globe2,
  Info,
  Link2,
  MapPin,
  Monitor,
  Pencil,
  Plus,
  Save,
  Trash2,
  Users,
} from "lucide-react";
import type { JobRow, JobType } from "../lib/cms-types";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { Drawer } from "../components/Drawer";
import { EmptyState, TableSkeleton } from "../components/EmptyState";
import { MetricCard, metricTrends, sparks } from "../components/MetricCard";
import { PageHeader } from "../components/PageHeader";
import { Pagination } from "../components/Pagination";
import { SearchInput } from "../components/SearchInput";
import { StatusBadge } from "../components/StatusBadge";
import { useToast } from "../components/Toast";
import { usePagination } from "../hooks/usePagination";
import { useResourceList } from "../hooks/useResourceList";
import { supabase } from "../lib/supabase";
import jobsBg from "../assets/job.png";

type Draft = JobRow;

function lines(v: string) {
  return v
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function slugify(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

const empty = (): Draft => ({
  id: "",
  title: "",
  department: "Engineering",
  location_label: "",
  type: "Remote",
  level: "Senior",
  technologies: [],
  summary: "",
  responsibilities: [],
  requirements: [],
  location_id: null,
  sort_order: 0,
  published: true,
});

export function JobsPage() {
  const { push } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const { rows, loading, error, reload } = useResourceList<JobRow>("jobs");
  const [locations, setLocations] = useState<{ id: string; name: string; flag?: string }[]>(
    [],
  );
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "published" | "draft">("all");
  const [dept, setDept] = useState("all");
  const [place, setPlace] = useState("all");
  const [kind, setKind] = useState("all");
  const [sortAsc, setSortAsc] = useState(true);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [techText, setTechText] = useState("");
  const [respText, setRespText] = useState("");
  const [reqText, setReqText] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    void supabase
      .from("talent_locations")
      .select("id,name,flag")
      .order("sort_order")
      .then(({ data }) => setLocations(data ?? []));
  }, []);

  const publishedCount = useMemo(
    () => rows.filter((r) => r.published).length,
    [rows],
  );
  const draftCount = rows.length - publishedCount;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = rows.filter((r) => {
      if (status === "published" && !r.published) return false;
      if (status === "draft" && r.published) return false;
      if (dept !== "all" && r.department !== dept) return false;
      if (place !== "all" && r.location_label !== place) return false;
      if (kind !== "all" && r.type !== kind) return false;
      if (!q) return true;
      return [r.title, r.department, r.location_label, r.level, r.type, ...r.technologies]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
    return [...list].sort((a, b) =>
      sortAsc ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title),
    );
  }, [rows, query, status, sortAsc, dept, place, kind]);

  const departments = useMemo(
    () => [...new Set(rows.map((r) => r.department).filter(Boolean))].sort(),
    [rows],
  );
  const places = useMemo(
    () => [...new Set(rows.map((r) => r.location_label).filter(Boolean))].sort(),
    [rows],
  );
  const {
    page,
    setPage,
    pages,
    pageItems: pageRows,
    rangeStart,
    rangeEnd,
    total,
  } = usePagination(
    filtered,
    6,
    `${query}|${status}|${dept}|${place}|${kind}|${sortAsc}`,
  );

  useEffect(() => {
    if (loading) return;
    if (new URLSearchParams(location.search).get("new") !== "1") return;
    openNew();
    navigate("/jobs", { replace: true });
    // Open the composer once when the dashboard asks for a new job.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, location.search]);

  const openNew = () => {
    setIsNew(true);
    setEditing({ ...empty(), sort_order: rows.length });
    setTechText("");
    setRespText("");
    setReqText("");
    setFormError(null);
  };

  const openEdit = (row: JobRow) => {
    setIsNew(false);
    setEditing({ ...row });
    setTechText(row.technologies.join("\n"));
    setRespText(row.responsibilities.join("\n"));
    setReqText(row.requirements.join("\n"));
    setFormError(null);
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setFormError(null);
    const id = editing.id || slugify(editing.title) || `job-${Date.now()}`;
    const payload = {
      ...editing,
      id,
      technologies: lines(techText),
      responsibilities: lines(respText),
      requirements: lines(reqText),
      location_id: editing.location_id || null,
    };
    const { error: err } = await supabase.from("jobs").upsert(payload);
    setSaving(false);
    if (err) {
      setFormError(err.message);
      return;
    }
    push(isNew ? "Job created" : "Job saved");
    setEditing(null);
    await reload();
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const { error: err } = await supabase.from("jobs").delete().eq("id", deleteId);
    setDeleting(false);
    if (err) {
      push(err.message, "err");
      return;
    }
    push("Job deleted");
    setDeleteId(null);
    await reload();
  };

  const selectedLoc = locations.find((l) => l.id === editing?.location_id);

  return (
    <div>
      <PageHeader
        kicker="Jobs"
        kickerIcon={Briefcase}
        title="Open Jobs"
        accentWord="Jobs"
        description="Open roles shown on Careers. Link each job to a map location for accurate open-role counts."
        quote="Build great teams."
        background={jobsBg}
        actions={
          <button type="button" className="btn btn-primary" onClick={openNew}>
            <Plus size={16} /> Add job <ChevronRight size={15} strokeWidth={2.4} />
          </button>
        }
      />

      <div className="metric-row metric-row-4">
        <MetricCard
          icon={<Briefcase size={16} />}
          label="Open roles"
          value={loading ? "—" : rows.length}
          tint="#ede9fe"
          color="#7c3aed"
          spark={sparks.a}
          trend={metricTrends.a}
        />
        <MetricCard
          icon={<Globe2 size={16} />}
          label="Published"
          value={loading ? "—" : publishedCount}
          tint="#dcfce7"
          color="#16a34a"
          spark={sparks.b}
          trend={metricTrends.b}
        />
        <MetricCard
          icon={<Pencil size={16} />}
          label="Drafts"
          value={loading ? "—" : draftCount}
          tint="#ffedd5"
          color="#ea580c"
          spark={sparks.c}
          trend={metricTrends.c}
        />
        <MetricCard
          icon={<Users size={16} />}
          label="Total applicants"
          value="—"
          tint="#dbeafe"
          color="#2563eb"
          spark={sparks.d}
          trend={metricTrends.d}
        />
      </div>

      <div className="panel jobs-panel">
        <div className="table-tools jobs-tools">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search title, stack, location…"
          />
          <div className="filters">
            <button
              type="button"
              className={`chip ${status === "all" ? "active" : ""}`}
              onClick={() => setStatus("all")}
            >
              All
            </button>
            <button
              type="button"
              className={`chip chip-dot ${status === "published" ? "active" : ""}`}
              onClick={() => setStatus("published")}
            >
              <i style={{ background: "#22c55e" }} />
              Published
            </button>
            <button
              type="button"
              className={`chip chip-dot ${status === "draft" ? "active" : ""}`}
              onClick={() => setStatus("draft")}
            >
              <i style={{ background: "#94a3b8" }} />
              Drafts
            </button>
            <select className="chip filter-select" value={dept} onChange={(e) => setDept(e.target.value)}>
              <option value="all">All departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <select className="chip filter-select" value={place} onChange={(e) => setPlace(e.target.value)}>
              <option value="all">All locations</option>
              {places.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <select className="chip filter-select" value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="all">All types</option>
              <option>Remote</option>
              <option>Hybrid</option>
              <option>On-site</option>
            </select>
            <button
              type="button"
              className="chip sort-chip"
              onClick={() => setSortAsc((v) => !v)}
            >
              <ArrowUpDown size={14} />
              Sort
              <ChevronDown size={14} />
            </button>
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
            title={rows.length ? "No matches" : "No jobs yet"}
            description={
              rows.length
                ? "Try a different search or filter."
                : "Create your first role to show on the Careers page."
            }
            action={
              !rows.length ? (
                <button type="button" className="btn btn-primary" onClick={openNew}>
                  <Plus size={16} /> Add job
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Dept</th>
                  <th>Location</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Applicants</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row, idx) => (
                  <tr key={row.id}>
                    <td>
                      <div className="role-cell">
                        <span
                          className="role-icon"
                          style={{
                            background: idx % 2 === 0 ? "#ede9fe" : "#e0e7ff",
                            color: "#6366f1",
                          }}
                        >
                          <Briefcase size={15} />
                        </span>
                        <div>
                          <div className="cell-title">{row.title}</div>
                          <div className="cell-sub">(ID: {row.id})</div>
                        </div>
                      </div>
                    </td>
                    <td>{row.department}</td>
                    <td>
                      <span className="inline-meta">
                        <MapPin size={14} />
                        {row.location_label || "—"}
                      </span>
                    </td>
                    <td>
                      <span className="inline-meta">
                        <Monitor size={14} />
                        {row.type}
                      </span>
                    </td>
                    <td>
                      <StatusBadge published={row.published} />
                    </td>
                    <td className="muted">—</td>
                    <td>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="btn btn-sm btn-edit"
                          onClick={() => openEdit(row)}
                        >
                          <Pencil size={14} /> Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-danger"
                          onClick={() => setDeleteId(row.id)}
                          aria-label="Delete"
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
            label="jobs"
            onPageChange={setPage}
          />
        ) : null}
      </div>

      <Drawer
        open={!!editing}
        title={isNew ? "New job" : "Edit job"}
        subtitle="Make changes to your job listing. Press Esc to close."
        icon={<Briefcase size={18} color="#fff" />}
        onClose={() => !saving && setEditing(null)}
        footer={
          <>
            <button
              type="button"
              className="btn"
              onClick={() => setEditing(null)}
              disabled={saving}
            >
              Cancel
            </button>
            <div className="right">
              <button type="submit" form="job-form" className="btn btn-primary" disabled={saving}>
                <Save size={15} />
                {saving ? "Saving…" : "Save job"}
              </button>
            </div>
          </>
        }
      >
        {editing && (
          <form id="job-form" onSubmit={(e) => void save(e)} style={{ display: "contents" }}>
            <label className="field field-iconed">
              <span>
                <i className="fi" style={{ background: "#ede9fe", color: "#7c3aed" }}>
                  <Briefcase size={13} />
                </i>
                Title
              </span>
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
                placeholder="Senior Front-end Engineer"
              />
              <span className="field-hint">A clear and specific title helps you attract the right candidates.</span>
            </label>

            <label className="field field-iconed">
              <span>
                <i className="fi" style={{ background: "#dbeafe", color: "#2563eb" }}>
                  <Link2 size={13} />
                </i>
                URL id
              </span>
              <input
                value={editing.id}
                onChange={(e) => setEditing({ ...editing, id: e.target.value })}
                required
                disabled={!isNew}
              />
              <span className="field-hint hint-info">
                <Info size={12} /> Locked to keep public URLs stable.
              </span>
            </label>

            <div className="field-row-3">
              <label className="field field-iconed">
                <span>
                  <i className="fi" style={{ background: "#ede9fe", color: "#7c3aed" }}>
                    <Building2 size={13} />
                  </i>
                  Department
                </span>
                <input
                  value={editing.department}
                  onChange={(e) => setEditing({ ...editing, department: e.target.value })}
                />
              </label>
              <label className="field field-iconed">
                <span>
                  <i className="fi" style={{ background: "#ccfbf1", color: "#0d9488" }}>
                    <ArrowUpDown size={13} />
                  </i>
                  Level
                </span>
                <input
                  value={editing.level}
                  onChange={(e) => setEditing({ ...editing, level: e.target.value })}
                />
              </label>
              <label className="field field-iconed">
                <span>
                  <i className="fi" style={{ background: "#ffedd5", color: "#ea580c" }}>
                    <Monitor size={13} />
                  </i>
                  Type
                </span>
                <select
                  value={editing.type}
                  onChange={(e) => setEditing({ ...editing, type: e.target.value as JobType })}
                >
                  <option>Remote</option>
                  <option>Hybrid</option>
                  <option>On-site</option>
                </select>
              </label>
            </div>

            <label className="field field-iconed">
              <span>
                <i className="fi" style={{ background: "#dbeafe", color: "#2563eb" }}>
                  <MapPin size={13} />
                </i>
                Location label
              </span>
              <input
                value={editing.location_label}
                onChange={(e) => setEditing({ ...editing, location_label: e.target.value })}
                placeholder="Remote — Europe"
              />
              <span className="field-hint">This will be shown on the job list and search results.</span>
            </label>

            <label className="field field-iconed">
              <span>
                <i className="fi" style={{ background: "#fce7f3", color: "#db2777" }}>
                  <Globe2 size={13} />
                </i>
                Map country
              </span>
              <select
                value={editing.location_id ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, location_id: e.target.value || null })
                }
              >
                <option value="">— none —</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.flag ? `${l.flag} ` : ""}
                    {l.name}
                  </option>
                ))}
              </select>
              {selectedLoc ? (
                <span className="field-hint">
                  Selected: {selectedLoc.flag} {selectedLoc.name}
                </span>
              ) : null}
            </label>

            <label className="field field-iconed">
              <span>
                <i className="fi" style={{ background: "#ede9fe", color: "#7c3aed" }}>
                  <Pencil size={13} />
                </i>
                Summary
              </span>
              <textarea
                maxLength={500}
                value={editing.summary}
                onChange={(e) => setEditing({ ...editing, summary: e.target.value })}
              />
              <span className="field-count">{editing.summary.length}/500</span>
              <span className="field-hint">Write a short and compelling summary of this role.</span>
            </label>

            <label className="field field-iconed">
              <span>
                <i className="fi" style={{ background: "#dcfce7", color: "#16a34a" }}>
                  <Briefcase size={13} />
                </i>
                Technologies (one per line)
              </span>
              <textarea value={techText} onChange={(e) => setTechText(e.target.value)} />
              <span className="field-count">{lines(techText).length} items</span>
              <span className="field-hint">List the key technologies used in this role (one per line).</span>
            </label>

            <label className="field field-iconed">
              <span>
                <i className="fi" style={{ background: "#dbeafe", color: "#2563eb" }}>
                  <Info size={13} />
                </i>
                Responsibilities (one per line)
              </span>
              <textarea value={respText} onChange={(e) => setRespText(e.target.value)} />
              <span className="field-count">{lines(respText).length} items</span>
            </label>

            <label className="field field-iconed">
              <span>
                <i className="fi" style={{ background: "#ffedd5", color: "#ea580c" }}>
                  <Info size={13} />
                </i>
                Requirements (one per line)
              </span>
              <textarea value={reqText} onChange={(e) => setReqText(e.target.value)} />
              <span className="field-count">{lines(reqText).length} items</span>
            </label>

            <label className="check-row">
              <input
                type="checkbox"
                checked={editing.published}
                onChange={(e) => setEditing({ ...editing, published: e.target.checked })}
              />
              Published on Careers
            </label>
            {formError && <p className="error">{formError}</p>}
          </form>
        )}
      </Drawer>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete job?"
        message="This removes the role from the public Careers page. This cannot be undone."
        busy={deleting}
        onCancel={() => setDeleteId(null)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
