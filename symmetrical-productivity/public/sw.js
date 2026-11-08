const CACHE_NAME = 'symmetry-manager-offline-v2';
const PRECACHE_URLS = ['/', '/index.html', '/manifest.json', '/favicon.svg'];

const scheduledTimers = new Map();

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Stale-While-Revalidate + Offline Fallback for full offline installation support
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request);
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            cache.put(event.request, response.clone());
          }
          return response;
        })
        .catch(() => cached || cache.match('/index.html'));

      return cached || networkFetch;
    })
  );
});

// Background Lock-Screen Alarm Scheduling in Service Worker
self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || !data.type) return;

  if (data.type === 'SCHEDULE_LOCKSCREEN_ALARM') {
    const existing = scheduledTimers.get(data.id);
    if (existing) clearTimeout(existing);

    const timerId = setTimeout(() => {
      scheduledTimers.delete(data.id);
      if (self.registration && self.registration.showNotification) {
        self.registration.showNotification(data.title, {
          body: data.body,
          tag: `symmetry-alarm-${data.id}`,
          renotify: true,
          requireInteraction: data.eventType === 'MANDATORY_60M_BREAK',
          vibrate: [200, 100, 200],
          data: { eventType: data.eventType },
        });
      }
    }, Math.max(100, data.secondsFromNow * 1000));

    scheduledTimers.set(data.id, timerId);
  } else if (data.type === 'CANCEL_LOCKSCREEN_ALARMS') {
    for (const timerId of scheduledTimers.values()) {
      clearTimeout(timerId);
    }
    scheduledTimers.clear();
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) return client.focus();
        }
        if (self.clients.openWindow) return self.clients.openWindow('/');
      })
  );
});
