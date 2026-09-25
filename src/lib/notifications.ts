import { supabase } from "./supabase";

export type AdminNotificationKind = "user_pending" | "feedback_pending" | "system";

export type AdminNotification = {
  id: string;
  recipient_id: string;
  kind: AdminNotificationKind;
  title: string;
  body: string;
  href: string;
  source_type: string | null;
  source_id: string | null;
  read_at: string | null;
  email_sent_at: string | null;
  created_at: string;
};

export async function syncAdminNotifications() {
  await supabase.rpc("sync_admin_notifications");
}

export async function fetchAdminNotifications(limit = 40) {
  const { data, error } = await supabase
    .from("admin_notifications")
    .select(
      "id, recipient_id, kind, title, body, href, source_type, source_id, read_at, email_sent_at, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as AdminNotification[];
}

export async function markNotificationRead(id: string) {
  const { error } = await supabase.rpc("mark_notification_read", { p_id: id });
  if (error) throw error;
}

export async function markAllNotificationsRead() {
  const { error } = await supabase.rpc("mark_all_notifications_read");
  if (error) throw error;
}

export async function updateNotificationPrefs(prefs: {
  notify_email?: boolean;
  notify_push?: boolean;
}) {
  const { error } = await supabase.rpc("update_notification_prefs", {
    p_notify_email: prefs.notify_email ?? null,
    p_notify_push: prefs.notify_push ?? null,
  });
  if (error) throw error;
}

/** Ask the edge function to email/push unread notifications (no-op if unset). */
export async function deliverPendingNotifications() {
  try {
    await supabase.functions.invoke("deliver-notifications", { body: {} });
  } catch {
    // Edge function / keys may be unset in local/dev — ignore.
  }
}

export async function enableBrowserPush(): Promise<string | null> {
  if (!("Notification" in window) || !("serviceWorker" in navigator)) {
    return "Push is not supported in this browser.";
  }
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return "Notification permission was denied.";

  // Register SW and store a subscription when VAPID public key is configured.
  const vapid = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
  try {
    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;

    if (vapid && "PushManager" in window) {
      const existing = await reg.pushManager.getSubscription();
      const sub =
        existing ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapid),
        }));
      const json = sub.toJSON();
      if (json.endpoint && json.keys?.p256dh && json.keys?.auth) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("push_subscriptions").upsert(
            {
              user_id: user.id,
              endpoint: json.endpoint,
              p256dh: json.keys.p256dh,
              auth: json.keys.auth,
              user_agent: navigator.userAgent,
            },
            { onConflict: "endpoint" },
          );
        }
      }
    }
  } catch (err) {
    return err instanceof Error ? err.message : "Could not enable push.";
  }

  await updateNotificationPrefs({ notify_push: true });
  return null;
}

export function showLocalNotification(title: string, body: string, href?: string) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  try {
    const n = new Notification(title, {
      body,
      icon: "/favicon.svg",
      tag: href ?? title,
    });
    n.onclick = () => {
      window.focus();
      if (href) window.location.assign(href);
      n.close();
    };
  } catch {
    // ignore
  }
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}
