// Deliver unread admin notifications via email (Resend) and Web Push.
// Secrets (optional): RESEND_API_KEY, RESEND_FROM, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser();
    if (userErr || !user) {
      return json({ error: "Unauthorized" }, 401);
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: profile } = await admin
      .from("profiles")
      .select("id, email, role, status, notify_email, notify_push")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || profile.role !== "admin" || profile.status !== "active") {
      return json({ error: "Forbidden" }, 403);
    }

    const { data: unread } = await admin
      .from("admin_notifications")
      .select("*")
      .eq("recipient_id", user.id)
      .is("read_at", null)
      .is("email_sent_at", null)
      .order("created_at", { ascending: false })
      .limit(20);

    const rows = unread ?? [];
    let emailed = 0;
    let pushed = 0;

    if (profile.notify_email && rows.length > 0) {
      const resendKey = Deno.env.get("RESEND_API_KEY");
      const from = Deno.env.get("RESEND_FROM") ?? "Studio <onboarding@resend.dev>";
      if (resendKey && profile.email) {
        const list = rows
          .map((n) => `• ${n.title}${n.body ? ` — ${n.body}` : ""}`)
          .join("\n");
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from,
            to: [profile.email],
            subject: `You have ${rows.length} studio notification${rows.length === 1 ? "" : "s"}`,
            text: `Pending items in the studio:\n\n${list}\n\nOpen the admin app to review.`,
          }),
        });
        if (res.ok) {
          emailed = rows.length;
          const ids = rows.map((r) => r.id);
          await admin
            .from("admin_notifications")
            .update({ email_sent_at: new Date().toISOString() })
            .in("id", ids);
        }
      }
    }

    if (profile.notify_push && rows.length > 0) {
      const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY");
      const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY");
      const vapidSubject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@example.com";
      if (vapidPublic && vapidPrivate) {
        const { data: subs } = await admin
          .from("push_subscriptions")
          .select("*")
          .eq("user_id", user.id);
        // Dynamic import web-push-compatible sender via Fetch to a push endpoint is complex in Deno.
        // Prefer local Notification API when the app is open; mark intent when keys exist.
        if (subs && subs.length > 0) {
          try {
            const webpush = await import("https://esm.sh/web-push@3.6.7");
            webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
            for (const sub of subs) {
              const payload = JSON.stringify({
                title: rows[0].title,
                body: rows[0].body || `${rows.length} unread notification(s)`,
                href: rows[0].href || "/",
              });
              try {
                await webpush.sendNotification(
                  {
                    endpoint: sub.endpoint,
                    keys: { p256dh: sub.p256dh, auth: sub.auth },
                  },
                  payload,
                );
                pushed += 1;
              } catch {
                // Drop dead subscriptions
                await admin.from("push_subscriptions").delete().eq("id", sub.id);
              }
            }
          } catch {
            // web-push unavailable — skip
          }
        }
      }
    }

    return json({ ok: true, unread: rows.length, emailed, pushed });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Failed" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
