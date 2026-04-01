/// <reference lib="webworker" />

// Simple service worker with minimal type issues
// @ts-nocheck

import { clientsClaim } from 'workbox-core';
import { ExpirationPlugin } from 'workbox-expiration';
import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst, NetworkFirst } from 'workbox-strategies';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

// Claim clients immediately
clientsClaim();

// Precache all assets
precacheAndRoute(self.__WB_MANIFEST);

// App Shell routing
const handler = createHandlerBoundToURL('/ar/dashboard');
registerRoute(({ request, url }: any) => {
  return request.destination === 'document';
}, handler);

// Cache static assets
registerRoute(
  ({ request }: any) => request.destination === 'style' || 
    request.destination === 'script' ||
    request.destination === 'worker' ||
    request.destination === 'image' ||
    request.destination === 'font',
  new StaleWhileRevalidate({
    cacheName: 'static-assets',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      }),
    ],
  })
);

// Cache API responses
registerRoute(
  ({ url }: any) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 24 * 60 * 60, // 1 day
      }),
    ],
    networkTimeoutSeconds: 10,
  })
);

// Background sync for offline actions
self.addEventListener('sync', (event: any) => {
  if (event.tag === 'sync-viewings') {
    event.waitUntil(syncViewings());
  }
  if (event.tag === 'sync-leads') {
    event.waitUntil(syncLeads());
  }
});

async function syncViewings() {
  // Get pending viewings from IndexedDB and sync
  console.log('Syncing offline viewings...');
}

async function syncLeads() {
  // Get pending leads from IndexedDB and sync
  console.log('Syncing offline leads...');
}

// Push notifications
self.addEventListener('push', (event: any) => {
  if (!event.data) return;

  const data = event.data.json();
  
  const options: any = {
    body: data.body || 'إشعار جديد',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/ar/dashboard',
    },
    actions: data.actions || [],
    dir: 'rtl',
    lang: 'ar',
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'نظام العقارات', options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event: any) => {
  event.notification.close();

  const url = event.notification.data?.url || '/ar/dashboard';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients: any[]) => {
      // Check if there's already a window open
      for (const client of clients) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus();
        }
      }
      // Open new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});

// Skip waiting on update
self.addEventListener('message', (event: any) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

export {};
