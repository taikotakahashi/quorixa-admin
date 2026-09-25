import { useCallback, useEffect, useMemo, useState } from "react";
import { Settings, Shield, ShieldOff, Trash2, UserX, UserCheck, Users } from "lucide-react";
import type { AccountRole, AccountStatus, Profile } from "../auth";
import { useAuth } from "../auth";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { EmptyState, TableSkeleton } from "../components/EmptyState";
import { HeroInlineStats } from "../components/HeroInlineStats";
import { PageHeader } from "../components/PageHeader";
import { Pagination } from "../components/Pagination";
import { SearchInput } from "../components/SearchInput";
import { useToast } from "../components/Toast";
import { usePagination } from "../hooks/usePagination";
import { supabase } from "../lib/supabase";
import usersBg from "../assets/user.png";

type ActionKind = "grant" | "revoke" | "disable" | "enable" | "delete";

type Pending = {
  kind: ActionKind;
  user: Profile;
};

const copy: Record<ActionKind, { title: string; label: string; danger: boolean }> = {
  grant: {
    title: "Grant administrator access",
    label: "Grant admin",
    danger: false,
  },
  revoke: {
    title: "Remove administrator access",
    label: "Revoke admin",
    danger: true,
  },
  disable: {
    title: "Disable account",
    label: "Disable",
    danger: true,
  },
  enable: {
    title: "Enable account",
    label: "Enable",
    danger: false,
  },
  delete: {
    title: "Delete account",
    label: "Delete",
    danger: true,
  },
};

function statusClass(status: AccountStatus) {
  if (status === "active") return "badge";
  if (status === "pending") return "badge warn";
  return "badge off";
}

function statusLabel(status: AccountStatus) {
  if (status === "active") return "Active";
  if (status === "pending") return "Pending";
  return "Disabled";
}

export function UsersPage() {
  const { session } = useAuth();
  const { push } = useToast();
  const [rows, setRows] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: err } = await supabase
      .from("profiles")
      .select("id, email, full_name, role, status")
      .order("created_at", { ascending: false });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setError(null);
    setRows((data as Profile[] | null) ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      `${row.full_name ?? ""} ${row.email} ${row.role} ${row.status}`.toLowerCase().includes(q),
    );
  }, [rows, query]);

  const { page, setPage, pages, pageItems, rangeStart, rangeEnd, total } =
    usePagination(filtered, 8, query);

  const run = async () => {
    if (!pending) return;
    setBusy(true);
    const { user, kind } = pending;
    const next: Record<Exclude<ActionKind, "delete">, { role: AccountRole; status: AccountStatus }> = {
      grant: { role: "admin", status: "active" },
      revoke: { role: "member", status: "active" },
      disable: { role: user.role, status: "disabled" },
      enable: { role: user.role, status: "active" },
    };

    const result =
      kind === "delete"
        ? await supabase.rpc("admin_delete_user", { target: user.id })
        : await supabase.rpc("admin_update_user", {
            target: user.id,
            new_role: next[kind].role,
            new_status: next[kind].status,
          });

    setBusy(false);
    if (result.error) {
      push(result.error.message, "err");
      return;
    }
    push(
      kind === "delete"
        ? "Account deleted"
        : kind === "grant"
          ? "Administrator access granted"
          : kind === "revoke"
            ? "Administrator access removed"
            : kind === "disable"
              ? "Account disabled"
              : "Account enabled",
    );
    setPending(null);
    await load();
  };

  const selfId = session?.user.id;

  return (
    <div>
      <PageHeader
        kicker="Access"
        kickerIcon={Shield}
        title="Studio Users"
        accentWord="Users"
        description="Manage studio users, view their registration status, and grant or revoke administrator access."
        quote="Approve the people who should run the studio."
        background={usersBg}
        footer={
          <HeroInlineStats
            items={[
              {
                icon: <Users size={20} strokeWidth={2} />,
                primary: "User",
                secondary: "Management",
                tint: "linear-gradient(145deg, #f3e8ff 0%, #e0e7ff 100%)",
                color: "#6d28d9",
              },
              {
                icon: <Shield size={20} strokeWidth={2} />,
                primary: "Access",
                secondary: "Control",
                tint: "linear-gradient(145deg, #fce7f3 0%, #fbcfe8 100%)",
                color: "#db2777",
              },
              {
                icon: <Settings size={20} strokeWidth={2} />,
                primary: "Admin",
                secondary: "Permissions",
                tint: "linear-gradient(145deg, #ede9fe 0%, #ddd6fe 100%)",
                color: "#7c3aed",
              },
            ]}
          />
        }
      />

      <div className="panel">
        <div className="table-tools">
          <SearchInput value={query} onChange={setQuery} placeholder="Search users…" />
        </div>

        {loading ? (
          <TableSkeleton />
        ) : error ? (
          <div className="empty">
            <p className="error">{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState title="No users" description="Registered accounts will appear here." />
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Access</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {pageItems.map((row) => {
                  const mine = row.id === selfId;
                  return (
                    <tr key={row.id}>
                      <td className="cell-title">{row.full_name || "—"}</td>
                      <td>{row.email || "—"}</td>
                      <td>
                        <span className={row.role === "admin" ? "badge" : "badge off"}>
                          {row.role === "admin" ? "Admin" : "Member"}
                        </span>
                      </td>
                      <td>
                        <span className={statusClass(row.status)}>{statusLabel(row.status)}</span>
                      </td>
                      <td>
                        {mine ? (
                          <span className="muted">You</span>
                        ) : (
                          <div className="row-actions user-actions">
                            {row.role !== "admin" || row.status !== "active" ? (
                              <button
                                type="button"
                                className="btn btn-sm btn-primary"
                                onClick={() => setPending({ kind: "grant", user: row })}
                              >
                                <Shield size={14} /> Grant admin
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="btn btn-sm"
                                onClick={() => setPending({ kind: "revoke", user: row })}
                              >
                                <ShieldOff size={14} /> Revoke
                              </button>
                            )}
                            {row.status === "disabled" ? (
                              <button
                                type="button"
                                className="btn btn-sm"
                                onClick={() => setPending({ kind: "enable", user: row })}
                              >
                                <UserCheck size={14} /> Enable
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="btn btn-sm"
                                onClick={() => setPending({ kind: "disable", user: row })}
                              >
                                <UserX size={14} /> Disable
                              </button>
                            )}
                            <button
                              type="button"
                              className="btn btn-sm btn-danger"
                              onClick={() => setPending({ kind: "delete", user: row })}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!loading && total > 0 ? (
          <Pagination
            page={page}
            pages={pages}
            total={total}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            label="users"
            onPageChange={setPage}
          />
        ) : null}
      </div>

      <ConfirmDialog
        open={!!pending}
        title={pending ? copy[pending.kind].title : ""}
        message={
          pending
            ? pending.kind === "delete"
              ? `Delete ${pending.user.email || "this account"}? This cannot be undone.`
              : pending.kind === "grant"
                ? `${pending.user.email || "This account"} will be able to open the studio and manage users.`
                : pending.kind === "revoke"
                  ? `${pending.user.email || "This account"} will stay registered but lose administrator access.`
                  : pending.kind === "disable"
                    ? `${pending.user.email || "This account"} will be blocked from the studio.`
                    : `${pending.user.email || "This account"} will be able to sign in again. Administrator access stays as it is now.`
            : ""
        }
        confirmLabel={pending ? copy[pending.kind].label : "Confirm"}
        danger={pending ? copy[pending.kind].danger : true}
        busy={busy}
        onCancel={() => !busy && setPending(null)}
        onConfirm={() => void run()}
      />
    </div>
  );
}
