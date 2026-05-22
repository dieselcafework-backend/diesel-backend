// public/sw.js
// Runs in the background even when the tab is closed or screen is off.

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try { data = event.data.json(); }
  catch (_) { data = { title: '🛎️ New Order!', body: event.data.text() }; }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body:      data.body,
      icon:      '/icon-192.png',   // add a 192×192 icon to your public/ folder
      badge:     '/icon-192.png',
      tag:       'velvet-vault-order',
      renotify:  true,              // re-alert even if a notification already exists
      vibrate:   [200, 100, 200, 100, 400],
      data:      { url: '/admin/dashboard', orderId: data.orderId },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // If dashboard tab already open — focus it
        for (const client of clientList) {
          if (client.url.includes('/admin/dashboard') && 'focus' in client) {
            return client.focus();
          }
        }
        // Otherwise open a new tab
        if (clients.openWindow) {
          return clients.openWindow('/admin/dashboard');
        }
      })
  );
});
