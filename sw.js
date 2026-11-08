/**
 * Academix - Service Worker for Offline Resilience & Background Reminders
 */

const CACHE_NAME = 'academix-cache-v4';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/app.css',
  '/logo.svg',
  '/js/data.js',
  '/js/services/date-service.js',
  '/js/services/task-status-service.js',
  '/js/services/carry-forward-service.js',
  '/js/services/recovery-planner-service.js',
  '/js/services/revision-scheduler-service.js',
  '/js/services/notification-service.js',
  '/js/services/scheduling-conflict-service.js',
  '/js/services/execution-analytics-service.js',
  '/js/services/index.js',
  '/js/ai-service.js',
  '/js/supabase-client.js',
  '/js/store.js',
  '/js/views/dashboard.js',
  '/js/views/calendar.js',
  '/js/views/tasks.js',
  '/js/views/planner.js',
  '/js/views/subjects.js',
  '/js/views/examinations.js',
  '/js/views/analytics.js',
  '/js/views/notes.js',
  '/js/views/focus.js',
  '/js/views/settings.js',
  '/js/app.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  // Let REST API calls pass to network
  if (event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => caches.match('/index.html'));
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return self.clients.openWindow('/');
    })
  );
});

