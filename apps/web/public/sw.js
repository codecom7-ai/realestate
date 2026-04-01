// Service Worker v3 - Real Estate OS
// نظام تشغيل المكتب العقاري المصري
var CACHE_NAME = 'realestate-os-v3';
var OFFLINE_URL = '/ar/offline';

self.addEventListener('install', function(event) {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names.filter(function(name) { return name !== CACHE_NAME; })
             .map(function(name) { return caches.delete(name); })
      );
    }).then(function() { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(event) {
  if (event.request.method !== 'GET') return;

  var url = new URL(event.request.url);

  // Skip: extensions + external + API
  if (url.protocol === 'chrome-extension:') return;
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;
  if (url.pathname.startsWith('/_next/')) return;

  // Network first strategy
  event.respondWith(
    fetch(event.request).catch(function() {
      return caches.match(event.request);
    })
  );
});

self.addEventListener('push', function(event) {
  if (!event.data) return;
  var data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || 'نظام العقارات', {
      body: data.body || 'إشعار جديد',
      icon: '/icons/icon-192x192.png',
      dir: 'rtl',
      lang: 'ar'
    })
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    self.clients.openWindow('/ar/dashboard')
  );
});
