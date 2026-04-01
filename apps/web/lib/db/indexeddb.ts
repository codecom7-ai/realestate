// ═══════════════════════════════════════════════════════════════
// IndexedDB Wrapper - للـ offline storage
// Native API بدون external libraries
// ═══════════════════════════════════════════════════════════════

const DB_NAME = 'real-estate-os-offline';
const DB_VERSION = 1;

// Store names
export const STORES = {
  CLIENTS: 'clients',
  LEADS: 'leads',
  PROPERTIES: 'properties',
  ACTIVITIES: 'activities',
  SYNC_QUEUE: 'sync_queue',
  SETTINGS: 'settings',
} as const;

export type StoreName = typeof STORES[keyof typeof STORES];

// Types for stored data
export interface StoredClient {
  id: string;
  tempId?: string; // For offline-created entities
  data: Record<string, any>;
  updatedAt: string;
  syncStatus: 'synced' | 'pending' | 'failed';
}

export interface StoredLead {
  id: string;
  tempId?: string;
  data: Record<string, any>;
  updatedAt: string;
  syncStatus: 'synced' | 'pending' | 'failed';
}

export interface StoredProperty {
  id: string;
  tempId?: string;
  data: Record<string, any>;
  updatedAt: string;
  syncStatus: 'synced' | 'pending' | 'failed';
}

export interface StoredActivity {
  id: string;
  tempId?: string;
  data: Record<string, any>;
  updatedAt: string;
  syncStatus: 'synced' | 'pending' | 'failed';
}

export interface SyncQueueItem {
  id: string;
  action: 'create' | 'update' | 'delete';
  entityType: StoreName;
  entityId: string;
  tempId?: string;
  data: Record<string, any>;
  createdAt: string;
  attempts: number;
  lastAttempt?: string;
  error?: string;
}

// Database instance
let db: IDBDatabase | null = null;
let dbInitPromise: Promise<IDBDatabase> | null = null;

// Initialize database
export async function initDB(): Promise<IDBDatabase> {
  // Return existing promise if initialization is in progress
  if (dbInitPromise) {
    return dbInitPromise;
  }

  // Return existing database if available
  if (db) {
    return db;
  }

  dbInitPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not available'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      dbInitPromise = null;
      reject(new Error('Failed to open database'));
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // Create object stores
      if (!database.objectStoreNames.contains(STORES.CLIENTS)) {
        const clientStore = database.createObjectStore(STORES.CLIENTS, { keyPath: 'id' });
        clientStore.createIndex('syncStatus', 'syncStatus', { unique: false });
        clientStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }

      if (!database.objectStoreNames.contains(STORES.LEADS)) {
        const leadStore = database.createObjectStore(STORES.LEADS, { keyPath: 'id' });
        leadStore.createIndex('syncStatus', 'syncStatus', { unique: false });
        leadStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }

      if (!database.objectStoreNames.contains(STORES.PROPERTIES)) {
        const propertyStore = database.createObjectStore(STORES.PROPERTIES, { keyPath: 'id' });
        propertyStore.createIndex('syncStatus', 'syncStatus', { unique: false });
        propertyStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }

      if (!database.objectStoreNames.contains(STORES.ACTIVITIES)) {
        const activityStore = database.createObjectStore(STORES.ACTIVITIES, { keyPath: 'id' });
        activityStore.createIndex('syncStatus', 'syncStatus', { unique: false });
        activityStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }

      if (!database.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        const syncStore = database.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id' });
        syncStore.createIndex('entityType', 'entityType', { unique: false });
        syncStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      if (!database.objectStoreNames.contains(STORES.SETTINGS)) {
        database.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
      }
    };
  });

  return dbInitPromise;
}

// Generic put operation
export async function put<T extends { id: string }>(
  storeName: StoreName,
  data: T
): Promise<void> {
  const database = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(data);

    request.onerror = () => {
      reject(new Error(`Failed to put data in ${storeName}`));
    };

    request.onsuccess = () => {
      resolve();
    }
  });
}

// Generic get operation
export async function get<T>(
  storeName: StoreName,
  id: string
): Promise<T | null> {
  const database = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(id);

    request.onerror = () => {
      reject(new Error(`Failed to get data from ${storeName}`));
    };

    request.onsuccess = () => {
      resolve(request.result || null);
    };
  });
}

// Get all items from store
export async function getAll<T>(
  storeName: StoreName
): Promise<T[]> {
  const database = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onerror = () => {
      reject(new Error(`Failed to get all data from ${storeName}`));
    };

    request.onsuccess = () => {
      resolve(request.result || []);
    };
  });
}

// Delete item from store
export async function remove(
  storeName: StoreName,
  id: string
): Promise<void> {
  const database = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(id);

    request.onerror = () => {
      reject(new Error(`Failed to delete data from ${storeName}`));
    };

    request.onsuccess = () => {
      resolve();
    };
  });
}

// Clear entire store
export async function clear(
  storeName: StoreName
): Promise<void> {
  const database = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.clear();

    request.onerror = () => {
      reject(new Error(`Failed to clear ${storeName}`));
    };

    request.onsuccess = () => {
      resolve();
    };
  });
}

// Get items by index
export async function getByIndex<T>(
  storeName: StoreName,
  indexName: string,
  value: IDBValidKey | IDBKeyRange
): Promise<T[]> {
  const database = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const index = store.index(indexName);
    const request = index.getAll(value);

    request.onerror = () => {
      reject(new Error(`Failed to get data by index from ${storeName}`));
    };

    request.onsuccess = () => {
      resolve(request.result || []);
    };
  });
}

// Count items in store
export async function count(
  storeName: StoreName
): Promise<number> {
  const database = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.count();

    request.onerror = () => {
      reject(new Error(`Failed to count ${storeName}`));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };
  });
}

// Batch put operation
export async function putBatch<T extends { id: string }>(
  storeName: StoreName,
  items: T[]
): Promise<void> {
  const database = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    
    let completed = 0;
    const total = items.length;

    if (total === 0) {
      resolve();
      return;
    }

    items.forEach((item) => {
      const request = store.put(item);
      
      request.onsuccess = () => {
        completed++;
        if (completed === total) {
          resolve();
        }
      };

      request.onerror = () => {
        reject(new Error(`Failed to put batch data in ${storeName}`));
      };
    });
  });
}

// Generate temp ID for offline entities
export function generateTempId(): string {
  return `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Check if ID is a temp ID
export function isTempId(id: string): boolean {
  return id.startsWith('temp_');
}

// Get pending sync count
export async function getPendingSyncCount(): Promise<number> {
  const syncItems = await getByIndex<SyncQueueItem>(
    STORES.SYNC_QUEUE,
    'entityType',
    IDBKeyRange.lowerBound('')
  );
  return syncItems.length;
}

// Get last sync time
export async function getLastSyncTime(): Promise<string | null> {
  const database = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORES.SETTINGS, 'readonly');
    const store = transaction.objectStore(STORES.SETTINGS);
    const request = store.get('lastSyncTime');

    request.onerror = () => {
      reject(new Error('Failed to get last sync time'));
    };

    request.onsuccess = () => {
      resolve(request.result?.value || null);
    };
  });
}

// Set last sync time
export async function setLastSyncTime(time: string): Promise<void> {
  const database = await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORES.SETTINGS, 'readwrite');
    const store = transaction.objectStore(STORES.SETTINGS);
    const request = store.put({ key: 'lastSyncTime', value: time });

    request.onerror = () => {
      reject(new Error('Failed to set last sync time'));
    };

    request.onsuccess = () => {
      resolve();
    };
  });
}

// Close database connection
export function closeDB(): void {
  if (db) {
    db.close();
    db = null;
    dbInitPromise = null;
  }
}

// Export for compatibility
export const indexedDBClient = {
  init: initDB,
  put,
  get,
  getAll,
  delete: remove,
  clear,
  getByIndex,
  count,
  putBatch,
  generateTempId,
  isTempId,
  getPendingSyncCount,
  getLastSyncTime,
  setLastSyncTime,
  close: closeDB,
  STORES,
};

export default indexedDBClient;
