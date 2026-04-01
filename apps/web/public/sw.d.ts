/// <reference lib="webworker" />

// Type declarations for Workbox modules
declare module 'workbox-core' {
  export function setConfig(config: { debug: boolean }): void;
  export function skipWaiting(): void;
  export function clientsClaim(): void;
}

declare module 'workbox-precaching' {
  export function precacheAndRoute(entries: any[]): void;
  export function cleanupOutdatedCaches(): void;
  export function createHandlerForURL(url: string): any;
}

declare module 'workbox-routing' {
  export function registerRoute(matcher: any, handler: any): void;
  export function NavigationRoute(handler: any, options?: any): any;
  export function RegExpRoute(regexp: RegExp, handler: any): any;
}

declare module 'workbox-strategies' {
  export class CacheFirst {
    constructor(options?: any);
  }
  export class NetworkFirst {
    constructor(options?: any);
  }
  export class StaleWhileRevalidate {
    constructor(options?: any);
  }
  export class NetworkOnly {
    constructor(options?: any);
  }
  export class CacheOnly {
    constructor(options?: any);
  }
}

declare module 'workbox-cacheable-response' {
  export class CacheableResponsePlugin {
    constructor(config: { statuses?: number[]; headers?: Record<string, string> });
  }
}

declare module 'workbox-expiration' {
  export class ExpirationPlugin {
    constructor(config: { maxEntries?: number; maxAgeSeconds?: number; purgeOnQuotaError?: boolean });
  }
}

// Extend ServiceWorkerGlobalScope
interface ServiceWorkerGlobalScope {
  __WB_MANIFEST: any[];
  registration: {
    sync: {
      register(tag: string): Promise<void>;
    };
  };
}

// SyncEvent for background sync
interface SyncEvent extends Event {
  readonly tag: string;
  readonly lastChance: boolean;
  waitUntil(promise: Promise<any>): void;
}

// Extend NotificationOptions
interface NotificationOptions {
  vibrate?: number[];
  requireInteraction?: boolean;
  actions?: NotificationAction[];
  data?: any;
}
