const scheduledTimers = new Map();

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
