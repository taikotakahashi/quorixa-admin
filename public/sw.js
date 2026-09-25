/* global self */
self.addEventListener("push", (event) => {
  let title = "Studio notification";
  let body = "You have a new update.";
  let href = "/";
  try {
    const data = event.data ? event.data.json() : null;
    if (data?.title) title = data.title;
    if (data?.body) body = data.body;
    if (data?.href) href = data.href;
  } catch {
    const text = event.data ? event.data.text() : "";
    if (text) body = text;
  }
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      data: { href },
      icon: "/favicon.svg",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const href = (event.notification.data && event.notification.data.href) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          if (client.navigate) client.navigate(href);
          return client.focus();
        }
      }
      return self.clients.openWindow(href);
    }),
  );
});
