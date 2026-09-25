import { useMemo, useState, type FormEvent } from "react";
import {
  Building2,
  Check,
  ChevronRight,
  MessageSquareQuote,
  Pencil,
  Plus,
  Trash2,
  Users,
  X,
} from "lucide-react";
import type {
  FeedbackAuthorType,
  FeedbackRow,
  FeedbackStatus,
} from "../lib/cms-types";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { Drawer } from "../components/Drawer";
import { EmptyState, TableSkeleton } from "../components/EmptyState";
import { ImageField } from "../components/ImageField";
import { PageHeader } from "../components/PageHeader";
import { Pagination } from "../components/Pagination";
import { SearchInput } from "../components/SearchInput";
import { MetricCard, metricTrends, sparks } from "../components/MetricCard";
import { useToast } from "../components/Toast";
import { usePagination } from "../hooks/usePagination";
import { useResourceList } from "../hooks/useResourceList";
import { supabase } from "../lib/supabase";
import feedbackBg from "../assets/feedback.png";

type Draft = Omit<FeedbackRow, "id"> & { id?: string };

const empty = (): Draft => ({
  author_name: "",
  author_role: "",
  author_type: "team",
  quote: "",
  location: null,
  photo_url: null,
  status: "pending",
  sort_order: 0,
  published: false,
});

function statusClass(status: FeedbackStatus) {
  if (status === "approved") return "badge";
  if (status === "pending") return "badge warn";
  return "badge off";
}

function statusLabel(status: FeedbackStatus) {
  if (status === "approved") return "Approved";
  if (status === "pending") return "Pending";
  return "Rejected";
}

function typeLabel(type: FeedbackAuthorType) {
  if (type === "team") return "Team";
  if (type === "user") return "User";
  return "Client";
}

export function FeedbackPage() {
  const { push } = useToast();
  const { rows, loading, error, reload } = useResourceList<FeedbackRow>("feedback");
  const [query, setQuery] = useState("");
  const [authorType, setAuthorType] = useState<"all" | FeedbackAuthorType>("all");
  const [status, setStatus] = useState<"all" | FeedbackStatus>("all");
  const [editing, setEditing] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (authorType !== "all" && row.author_type !== authorType) return false;
      if (status !== "all" && row.status !== status) return false;
      if (!q) return true;
      return `${row.author_name} ${row.author_role} ${row.quote} ${row.location ?? ""} ${row.author_type}`
        .toLowerCase()
        .includes(q);
    });
  }, [rows, query, authorType, status]);

  const { page, setPage, pages, pageItems, rangeStart, rangeEnd, total } =
    usePagination(filtered, 8, `${query}|${authorType}|${status}`);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    if (!editing.quote.trim()) {
      setFormError("Enter the feedback quote.");
      return;
    }
    setSaving(true);
    setFormError(null);
    const payload = {
      author_name: editing.author_name.trim(),
      author_role: editing.author_role.trim(),
      author_type: editing.author_type,
      quote: editing.quote.trim(),
      location: editing.location?.trim() || null,
      photo_url: editing.photo_url || null,
      status: editing.status,
      sort_order: editing.sort_order,
      published: editing.status === "approved" ? editing.published : false,
    };
    const { error: err } = editing.id
      ? await supabase.from("feedback").update(payload).eq("id", editing.id)
      : await supabase.from("feedback").insert(payload);
    setSaving(false);
    if (err) {
      setFormError(err.message);
      return;
    }
    push(editing.id ? "Feedback saved" : "Feedback added");
    setEditing(null);
    await reload();
  };

  const setApproval = async (row: FeedbackRow, next: FeedbackStatus) => {
    setBusyId(row.id);
    const { error: err } = await supabase
      .from("feedback")
      .update({
        status: next,
        published: next === "approved",
      })
      .eq("id", row.id);
    setBusyId(null);
    if (err) {
      push(err.message, "err");
      return;
    }
    push(
      next === "approved"
        ? "Feedback approved"
        : next === "rejected"
          ? "Feedback rejected"
          : "Feedback moved to pending",
    );
    await reload();
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const { error: err } = await supabase.from("feedback").delete().eq("id", deleteId);
    setDeleting(false);
    if (err) {
      push(err.message, "err");
      return;
    }
    push("Feedback deleted");
    setDeleteId(null);
    await reload();
  };

  const pendingCount = rows.filter((r) => r.status === "pending").length;
  const approvedCount = rows.filter((r) => r.status === "approved").length;

  return (
    <div>
      <PageHeader
        kicker="Community"
        kickerIcon={MessageSquareQuote}
        title="Our Feedback"
        accentWord="Feedback"
        description="Review, edit, approve, or remove posts from team members, users, and clients."
        quote="Approve the voices that represent QUORIXA."
        background={feedbackBg}
        actions={
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setEditing({ ...empty(), sort_order: rows.length });
              setFormError(null);
            }}
          >
            <Plus size={16} /> Add feedback <ChevronRight size={15} strokeWidth={2.4} />
          </button>
        }
      />

      <div className="metric-row metric-row-4">
        <MetricCard
          icon={<MessageSquareQuote size={16} />}
          label="Total posts"
          value={loading ? "—" : rows.length}
          tint="#ede9fe"
          color="#7c3aed"
          spark={sparks.a}
          trend={metricTrends.a}
        />
        <MetricCard
          icon={<Users size={16} />}
          label="Pending"
          value={loading ? "—" : pendingCount}
          tint="#fff7ed"
          color="#d97706"
          spark={sparks.b}
          trend={metricTrends.b}
        />
        <MetricCard
          icon={<Check size={16} />}
          label="Approved"
          value={loading ? "—" : approvedCount}
          tint="#ecfdf5"
          color="#059669"
          spark={sparks.c}
          trend={metricTrends.c}
        />
        <MetricCard
          icon={<Building2 size={16} />}
          label="Client posts"
          value={loading ? "—" : rows.filter((r) => r.author_type === "client").length}
          tint="#eff6ff"
          color="#2563eb"
          spark={sparks.d}
          trend={metricTrends.d}
        />
      </div>

      <div className="panel">
        <div className="table-tools">
          <SearchInput value={query} onChange={setQuery} placeholder="Search feedback…" />
          <div className="filters">
            {(["all", "team", "user", "client"] as const).map((k) => (
              <button
                key={k}
                type="button"
                className={`chip ${authorType === k ? "active" : ""}`}
                onClick={() => setAuthorType(k)}
              >
                {k === "all" ? "All sources" : typeLabel(k)}
              </button>
            ))}
          </div>
          <div className="filters">
            {(["all", "pending", "approved", "rejected"] as const).map((k) => (
              <button
                key={k}
                type="button"
                className={`chip ${status === k ? "active" : ""}`}
                onClick={() => setStatus(k)}
              >
                {k === "all" ? "All status" : statusLabel(k)}
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
            title="No feedback yet"
            description="Add a quote, or wait for team, user, and client posts to appear here."
          />
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th />
                  <th>Author</th>
                  <th>Source</th>
                  <th>Quote</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {pageItems.map((row) => (
                  <tr key={row.id}>
                    <td>
                      {row.photo_url ? (
                        <img src={row.photo_url} alt="" className="thumb" />
                      ) : (
                        <div className="thumb" />
                      )}
                    </td>
                    <td>
                      <div className="cell-title">{row.author_name}</div>
                      <div className="cell-sub">
                        {[row.author_role, row.location].filter(Boolean).join(" · ") || "—"}
                      </div>
                    </td>
                    <td>{typeLabel(row.author_type)}</td>
                    <td>
                      <div className="cell-sub" style={{ maxWidth: 360 }}>
                        {row.quote.length > 120 ? `${row.quote.slice(0, 120)}…` : row.quote}
                      </div>
                    </td>
                    <td>
                      <span className={statusClass(row.status)}>{statusLabel(row.status)}</span>
                    </td>
                    <td>
                      <div className="row-actions user-actions">
                        {row.status !== "approved" ? (
                          <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            disabled={busyId === row.id}
                            onClick={() => void setApproval(row, "approved")}
                          >
                            <Check size={14} /> Approve
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-sm"
                            disabled={busyId === row.id}
                            onClick={() => void setApproval(row, "pending")}
                          >
                            <X size={14} /> Unapprove
                          </button>
                        )}
                        {row.status !== "rejected" ? (
                          <button
                            type="button"
                            className="btn btn-sm"
                            disabled={busyId === row.id}
                            onClick={() => void setApproval(row, "rejected")}
                          >
                            Reject
                          </button>
                        ) : null}
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
        {!loading && !error && total > 0 ? (
          <Pagination
            page={page}
            pages={pages}
            total={total}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            label="posts"
            onPageChange={setPage}
          />
        ) : null}
      </div>

      <Drawer
        open={!!editing}
        title={editing?.id ? "Edit feedback" : "New feedback"}
        subtitle="Posts stay off the public site until an administrator approves them."
        onClose={() => !saving && setEditing(null)}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>
              Cancel
            </button>
            <div className="right">
              <button type="submit" form="feedback-form" className="btn btn-primary" disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </>
        }
      >
        {editing && (
          <form id="feedback-form" onSubmit={(e) => void save(e)} style={{ display: "contents" }}>
            <div className="field-row">
              <label className="field">
                <span>Source</span>
                <select
                  value={editing.author_type}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      author_type: e.target.value as FeedbackAuthorType,
                    })
                  }
                >
                  <option value="team">Team member</option>
                  <option value="user">User</option>
                  <option value="client">Client</option>
                </select>
              </label>
              <label className="field">
                <span>Status</span>
                <select
                  value={editing.status}
                  onChange={(e) => {
                    const next = e.target.value as FeedbackStatus;
                    setEditing({
                      ...editing,
                      status: next,
                      published: next === "approved" ? editing.published || true : false,
                    });
                  }}
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </label>
            </div>
            <label className="field">
              <span>Author name</span>
              <input
                value={editing.author_name}
                onChange={(e) => setEditing({ ...editing, author_name: e.target.value })}
                required
              />
            </label>
            <label className="field">
              <span>Role / title</span>
              <input
                value={editing.author_role}
                onChange={(e) => setEditing({ ...editing, author_role: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Location</span>
              <input
                value={editing.location ?? ""}
                onChange={(e) => setEditing({ ...editing, location: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Quote</span>
              <textarea
                value={editing.quote}
                onChange={(e) => setEditing({ ...editing, quote: e.target.value })}
                required
                rows={6}
              />
            </label>
            <ImageField
              bucket="team"
              value={editing.photo_url}
              onChange={(url) => setEditing({ ...editing, photo_url: url })}
              label="Photo"
            />
            <label className="check-row">
              <input
                type="checkbox"
                checked={editing.published && editing.status === "approved"}
                disabled={editing.status !== "approved"}
                onChange={(e) => setEditing({ ...editing, published: e.target.checked })}
              />
              Show on the public site
            </label>
            {formError && <p className="error">{formError}</p>}
          </form>
        )}
      </Drawer>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete feedback"
        message="This removes the post permanently. This cannot be undone."
        busy={deleting}
        onCancel={() => !deleting && setDeleteId(null)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
