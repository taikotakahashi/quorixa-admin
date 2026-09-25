import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  CheckCheck,
  ChevronRight,
  Mail,
  MessageSquareQuote,
  Users,
} from "lucide-react";
import { useAuth } from "../auth";
import {
  deliverPendingNotifications,
  enableBrowserPush,
  fetchAdminNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  showLocalNotification,
  syncAdminNotifications,
  updateNotificationPrefs,
  type AdminNotification,
} from "../lib/notifications";
import { supabase } from "../lib/supabase";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function NotificationsMenu({ open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const rootRef = useRef<HTMLDivElement>(null);
  const seenIds = useRef<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<AdminNotification[]>([]);
  const [emailOn, setEmailOn] = useState(true);
  const [pushOn, setPushOn] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pushMsg, setPushMsg] = useState<string | null>(null);

  const unread = items.filter((i) => !i.read_at);
  const unreadCount = unread.length;

  const load = useCallback(async (opts?: { announce?: boolean }) => {
    setLoading(true);
    try {
      await syncAdminNotifications();
      const rows = await fetchAdminNotifications();
      if (opts?.announce) {
        const fresh = rows.filter((r) => !r.read_at && !seenIds.current.has(r.id));
        for (const n of fresh) {
          if (profile?.notify_push !== false) {
            showLocalNotification(n.title, n.body, n.href);
          }
        }
      }
      for (const r of rows) seenIds.current.add(r.id);
      setItems(rows);
      void deliverPendingNotifications();
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [profile?.notify_push]);

  useEffect(() => {
    setEmailOn(profile?.notify_email !== false);
    setPushOn(profile?.notify_push !== false);
  }, [profile?.notify_email, profile?.notify_push]);

  useEffect(() => {
    void load({ announce: false });
    const id = window.setInterval(() => void load({ announce: true }), 60_000);
    return () => window.clearInterval(id);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    void load({ announce: false });
  }, [open, load]);

  useEffect(() => {
    const channel = supabase
      .channel("admin-notifications")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "admin_notifications" },
        () => {
          void load({ announce: true });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) onOpenChange(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onOpenChange]);

  const openItem = async (item: AdminNotification) => {
    try {
      if (!item.read_at) await markNotificationRead(item.id);
    } catch {
      // ignore
    }
    setItems((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, read_at: n.read_at ?? new Date().toISOString() } : n)),
    );
    navigate(item.href || "/");
    onOpenChange(false);
  };

  const markAll = async () => {
    setBusy(true);
    try {
      await markAllNotificationsRead();
      setItems((prev) =>
        prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })),
      );
    } finally {
      setBusy(false);
    }
  };

  const toggleEmail = async () => {
    const next = !emailOn;
    setEmailOn(next);
    try {
      await updateNotificationPrefs({ notify_email: next });
      if (next) void deliverPendingNotifications();
    } catch {
      setEmailOn(!next);
    }
  };

  const togglePush = async () => {
    if (!pushOn) {
      setBusy(true);
      const err = await enableBrowserPush();
      setBusy(false);
      if (err) {
        setPushMsg(err);
        return;
      }
      setPushOn(true);
      setPushMsg("Browser notifications enabled.");
      return;
    }
    setPushOn(false);
    try {
      await updateNotificationPrefs({ notify_push: false });
      setPushMsg(null);
    } catch {
      setPushOn(true);
    }
  };

  return (
    <div className="notif-wrap" ref={rootRef}>
      <button
        type="button"
        className="icon-btn"
        aria-label="Notifications"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => onOpenChange(!open)}
      >
        <Bell size={17} />
        {unreadCount > 0 ? <span className="dot" /> : null}
      </button>

      {open ? (
        <div className="notif-panel" role="menu" aria-label="Notifications">
          <div className="notif-head">
            <strong>Notifications</strong>
            {unreadCount > 0 ? <span className="notif-count">{unreadCount}</span> : null}
          </div>

          <div className="notif-prefs">
            <button
              type="button"
              className={`notif-pref${emailOn ? " on" : ""}`}
              onClick={() => void toggleEmail()}
              title="Email digests for unread items"
            >
              <Mail size={14} /> Email {emailOn ? "on" : "off"}
            </button>
            <button
              type="button"
              className={`notif-pref${pushOn ? " on" : ""}`}
              onClick={() => void togglePush()}
              disabled={busy}
              title="Browser push notifications"
            >
              <Bell size={14} /> Push {pushOn ? "on" : "off"}
            </button>
            {unreadCount > 0 ? (
              <button
                type="button"
                className="notif-pref"
                onClick={() => void markAll()}
                disabled={busy}
              >
                <CheckCheck size={14} /> Mark all read
              </button>
            ) : null}
          </div>
          {pushMsg ? <p className="notif-hint">{pushMsg}</p> : null}

          {loading ? (
            <p className="notif-empty">Checking for updates…</p>
          ) : items.length === 0 ? (
            <p className="notif-empty">You’re all caught up.</p>
          ) : (
            <ul className="notif-list">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`notif-item${item.read_at ? " read" : ""}`}
                    role="menuitem"
                    onClick={() => void openItem(item)}
                  >
                    <span
                      className="notif-item-icon"
                      style={
                        item.kind === "user_pending"
                          ? { background: "#ede9fe", color: "#6d28d9" }
                          : { background: "#fce7f3", color: "#db2777" }
                      }
                    >
                      {item.kind === "user_pending" ? (
                        <Users size={15} strokeWidth={2} />
                      ) : (
                        <MessageSquareQuote size={15} strokeWidth={2} />
                      )}
                    </span>
                    <span className="notif-item-copy">
                      <strong>{item.title}</strong>
                      <small>{item.body}</small>
                    </span>
                    {!item.read_at ? <span className="notif-unread" aria-label="Unread" /> : null}
                    <ChevronRight size={14} className="notif-chev" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {unreadCount > 0 ? (
            <div className="notif-foot">
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => {
                  const first = unread[0];
                  if (first) void openItem(first);
                }}
              >
                Review pending
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
