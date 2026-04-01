// ═══════════════════════════════════════════════════════════════
// PWA Offline Storage - IndexedDB Wrapper
// ═══════════════════════════════════════════════════════════════

const DB_NAME = 'realestate_os_offline';
const DB_VERSION = 1;

interface OfflineStore {
  leads: IDBObjectStore;
  properties: IDBObjectStore;
  clients: IDBObjectStore;
  viewings: IDBObjectStore;
  sync_queue: IDBObjectStore;
}

class OfflineDB {
  private db: IDBDatabase | null = null;

  async init(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Leads store
        if (!db.objectStoreNames.contains('leads')) {
          const leadsStore = db.createObjectStore('leads', { keyPath: 'id' });
          leadsStore.createIndex('stage', 'stage', { unique: false });
          leadsStore.createIndex('assignedToId', 'assignedToId', { unique: false });
          leadsStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        // Properties store
        if (!db.objectStoreNames.contains('properties')) {
          const propertiesStore = db.createObjectStore('properties', { keyPath: 'id' });
          propertiesStore.createIndex('status', 'status', { unique: false });
          propertiesStore.createIndex('city', 'city', { unique: false });
        }

        // Clients store
        if (!db.objectStoreNames.contains('clients')) {
          const clientsStore = db.createObjectStore('clients', { keyPath: 'id' });
          clientsStore.createIndex('phone', 'phone', { unique: false });
        }

        // Viewings store
        if (!db.objectStoreNames.contains('viewings')) {
          const viewingsStore = db.createObjectStore('viewings', { keyPath: 'id' });
          viewingsStore.createIndex('scheduledAt', 'scheduledAt', { unique: false });
          viewingsStore.createIndex('leadId', 'leadId', { unique: false });
        }

        // Sync queue for offline changes
        if (!db.objectStoreNames.contains('sync_queue')) {
          const syncStore = db.createObjectStore('sync_queue', { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          syncStore.createIndex('entityType', 'entityType', { unique: false });
          syncStore.createIndex('action', 'action', { unique: false });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  async get<T>(storeName: string, id: string): Promise<T | undefined> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async put<T extends { id: string }>(storeName: string, data: T): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put({
        ...data,
        updatedAt: new Date().toISOString(),
      });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName: string, id: string): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async addToSyncQueue(
    action: 'create' | 'update' | 'delete',
    entityType: string,
    entityId: string,
    data?: Record<string, unknown>
  ): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('sync_queue', 'readwrite');
      const store = transaction.objectStore('sync_queue');
      const request = store.add({
        action,
        entityType,
        entityId,
        data,
        timestamp: new Date().toISOString(),
        synced: false,
      });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getSyncQueue(): Promise<Array<{
    id: number;
    action: string;
    entityType: string;
    entityId: string;
    data?: Record<string, unknown>;
    timestamp: string;
  }>> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('sync_queue', 'readonly');
      const store = transaction.objectStore('sync_queue');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async clearSyncQueueItem(id: number): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('sync_queue', 'readwrite');
      const store = transaction.objectStore('sync_queue');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearStore(storeName: string): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

export const offlineDB = new OfflineDB();

// ═══════════════════════════════════════════════════════════════
// Offline Sync Manager
// ═══════════════════════════════════════════════════════════════

export class OfflineSyncManager {
  private isOnline = true;
  private syncInProgress = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.isOnline = navigator.onLine;
      window.addEventListener('online', () => this.handleOnline());
      window.addEventListener('offline', () => this.handleOffline());
    }
  }

  private handleOnline() {
    this.isOnline = true;
    this.sync();
  }

  private handleOffline() {
    this.isOnline = false;
  }

  async sync(): Promise<{ success: boolean; syncedCount: number; errors: string[] }> {
    if (!this.isOnline || this.syncInProgress) {
      return { success: false, syncedCount: 0, errors: ['Already syncing or offline'] };
    }

    this.syncInProgress = true;
    const errors: string[] = [];
    let syncedCount = 0;

    try {
      const queue = await offlineDB.getSyncQueue();

      for (const item of queue) {
        try {
          await this.syncItem(item);
          await offlineDB.clearSyncQueueItem(item.id);
          syncedCount++;
        } catch (error) {
          errors.push(`Failed to sync ${item.entityType}:${item.entityId}: ${error}`);
        }
      }

      return { success: errors.length === 0, syncedCount, errors };
    } finally {
      this.syncInProgress = false;
    }
  }

  private async syncItem(item: {
    action: string;
    entityType: string;
    entityId: string;
    data?: Record<string, unknown>;
  }): Promise<void> {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    
    const endpoint = this.getEndpoint(item.entityType);
    const method = item.action === 'create' ? 'POST' 
                 : item.action === 'update' ? 'PATCH' 
                 : 'DELETE';

    const response = await fetch(`${apiBaseUrl}/api/v1/${endpoint}${item.action !== 'create' ? `/${item.entityId}` : ''}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        // Add auth header from storage
      },
      body: item.data ? JSON.stringify(item.data) : undefined,
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
  }

  private getEndpoint(entityType: string): string {
    const endpoints: Record<string, string> = {
      lead: 'leads',
      property: 'properties',
      client: 'clients',
      viewing: 'viewings',
      activity: 'activities',
    };
    return endpoints[entityType] || entityType;
  }

  getOnlineStatus(): boolean {
    return this.isOnline;
  }
}

export const syncManager = new OfflineSyncManager();
