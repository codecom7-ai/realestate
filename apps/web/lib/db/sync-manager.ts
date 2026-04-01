// ═══════════════════════════════════════════════════════════════
// Sync Manager - إدارة المزامنة بين Offline و Online
// ═══════════════════════════════════════════════════════════════

import {
  STORES,
  SyncQueueItem,
  initDB,
  put,
  get,
  getAll,
  remove,
  getByIndex,
  setLastSyncTime,
  generateTempId,
  isTempId,
} from './indexeddb';
import { apiClient } from '@/lib/api';

// Types
export type SyncAction = 'create' | 'update' | 'delete';
export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'failed';
export type ConflictResolution = 'server' | 'client' | 'merge';

export interface SyncConflict {
  id: string;
  entityType: string;
  entityId: string;
  clientData: Record<string, any>;
  serverData: Record<string, any>;
  conflictType: 'update_conflict' | 'delete_conflict';
  createdAt: string;
}

export interface SyncProgress {
  total: number;
  completed: number;
  failed: number;
  current?: string;
}

// Event types for sync events
type SyncEventType = 'sync:start' | 'sync:progress' | 'sync:complete' | 'sync:error' | 'sync:conflict';

interface SyncEventCallback {
  (data: any): void;
}

// Sync Manager class
class SyncManager {
  private isSyncing = false;
  private eventListeners: Map<SyncEventType, SyncEventCallback[]> = new Map();
  private maxRetries = 3;
  private retryDelay = 5000; // 5 seconds

  // Event handling
  on(event: SyncEventType, callback: SyncEventCallback): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.push(callback);
    this.eventListeners.set(event, listeners);
  }

  off(event: SyncEventType, callback: SyncEventCallback): void {
    const listeners = this.eventListeners.get(event) || [];
    const index = listeners.indexOf(callback);
    if (index > -1) {
      listeners.splice(index, 1);
      this.eventListeners.set(event, listeners);
    }
  }

  private emit(event: SyncEventType, data?: any): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.forEach(callback => callback(data));
  }

  // Add item to sync queue
  async addToQueue(
    action: SyncAction,
    entityType: keyof typeof STORES,
    entityId: string,
    data: Record<string, any>
  ): Promise<string> {
    const id = generateTempId();
    
    const queueItem: SyncQueueItem = {
      id,
      action,
      entityType: entityType as any,
      entityId,
      tempId: isTempId(entityId) ? entityId : undefined,
      data,
      createdAt: new Date().toISOString(),
      attempts: 0,
    };

    await put(STORES.SYNC_QUEUE, queueItem);
    
    // Also update the local entity
    await this.updateEntitySyncStatus(entityType, entityId, 'pending');
    
    return id;
  }

  // Update entity sync status
  private async updateEntitySyncStatus(
    entityType: keyof typeof STORES,
    entityId: string,
    status: SyncStatus
  ): Promise<void> {
    const storeName = entityType as any;
    const entity = await get(storeName, entityId);

    if (entity) {
      await put(storeName, {
        ...entity,
        syncStatus: status,
        updatedAt: new Date().toISOString(),
      } as any);
    }
  }

  // Process the sync queue
  async processQueue(): Promise<SyncProgress> {
    if (this.isSyncing) {
      return { total: 0, completed: 0, failed: 0 };
    }

    this.isSyncing = true;
    this.emit('sync:start', {});

    const queue = await getAll<SyncQueueItem>(STORES.SYNC_QUEUE);
    const progress: SyncProgress = {
      total: queue.length,
      completed: 0,
      failed: 0,
    };

    if (queue.length === 0) {
      this.isSyncing = false;
      this.emit('sync:complete', progress);
      return progress;
    }

    // Sort by creation time (oldest first)
    queue.sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    for (const item of queue) {
      progress.current = item.id;
      this.emit('sync:progress', progress);

      try {
        await this.processQueueItem(item);
        
        // Remove from queue on success
        await remove(STORES.SYNC_QUEUE, item.id);
        
        // Update entity status
        if (item.tempId && item.data.id) {
          // Replace temp ID with real ID
          await this.replaceTempId(item);
        } else {
          await this.updateEntitySyncStatus(
            item.entityType as keyof typeof STORES,
            item.entityId,
            'synced'
          );
        }
        
        progress.completed++;
      } catch (error: any) {
        console.error('Sync failed for item:', item, error);
        
        // Update attempts and error
        const updatedItem: SyncQueueItem = {
          ...item,
          attempts: item.attempts + 1,
          lastAttempt: new Date().toISOString(),
          error: error.message || 'Unknown error',
        };
        
        await put(STORES.SYNC_QUEUE, updatedItem);
        
        // Mark entity as failed if max retries exceeded
        if (updatedItem.attempts >= this.maxRetries) {
          await this.updateEntitySyncStatus(
            item.entityType as keyof typeof STORES,
            item.entityId,
            'failed'
          );
        }
        
        progress.failed++;
      }
    }

    this.isSyncing = false;
    
    // Update last sync time
    await setLastSyncTime(new Date().toISOString());
    
    this.emit('sync:complete', progress);
    return progress;
  }

  // Process a single queue item
  private async processQueueItem(item: SyncQueueItem): Promise<void> {
    const { action, entityType, entityId, data } = item;

    switch (entityType) {
      case STORES.CLIENTS:
        await this.syncClient(action, entityId, data);
        break;
      case STORES.LEADS:
        await this.syncLead(action, entityId, data);
        break;
      case STORES.PROPERTIES:
        await this.syncProperty(action, entityId, data);
        break;
      case STORES.ACTIVITIES:
        await this.syncActivity(action, entityId, data);
        break;
      default:
        throw new Error(`Unknown entity type: ${entityType}`);
    }
  }

  // Sync client
  private async syncClient(
    action: SyncAction,
    entityId: string,
    data: Record<string, any>
  ): Promise<void> {
    switch (action) {
      case 'create':
        if (isTempId(entityId)) {
          const response = await apiClient.createClient(data);
          data.id = response.data.id;
        } else {
          await apiClient.createClient(data);
        }
        break;
      case 'update':
        await apiClient.updateClient(entityId, data);
        break;
      case 'delete':
        await apiClient.deleteUser(entityId);
        break;
    }
  }

  // Sync lead
  private async syncLead(
    action: SyncAction,
    entityId: string,
    data: Record<string, any>
  ): Promise<void> {
    switch (action) {
      case 'create':
        if (isTempId(entityId)) {
          const response = await apiClient.createLead(data);
          data.id = response.data.id;
        } else {
          await apiClient.createLead(data);
        }
        break;
      case 'update':
        await apiClient.updateLead(entityId, data);
        break;
      case 'delete':
        // Leads don't have delete endpoint, use soft delete via update
        await apiClient.updateLead(entityId, { deletedAt: new Date().toISOString() });
        break;
    }
  }

  // Sync property
  private async syncProperty(
    action: SyncAction,
    entityId: string,
    data: Record<string, any>
  ): Promise<void> {
    switch (action) {
      case 'create':
        if (isTempId(entityId)) {
          const response = await apiClient.createProperty(data);
          data.id = response.data.id;
        } else {
          await apiClient.createProperty(data);
        }
        break;
      case 'update':
        await apiClient.updateProperty(entityId, data);
        break;
      case 'delete':
        // Properties don't have delete endpoint
        await apiClient.updateProperty(entityId, { deletedAt: new Date().toISOString() });
        break;
    }
  }

  // Sync activity
  private async syncActivity(
    action: SyncAction,
    entityId: string,
    data: Record<string, any>
  ): Promise<void> {
    switch (action) {
      case 'create':
        if (isTempId(entityId)) {
          const response = await apiClient.createActivity(data);
          data.id = response.data.id;
        } else {
          await apiClient.createActivity(data);
        }
        break;
      case 'update':
        await apiClient.updateActivity(entityId, data);
        break;
      case 'delete':
        await apiClient.deleteActivity(entityId);
        break;
    }
  }

  // Replace temp ID with real ID
  private async replaceTempId(item: SyncQueueItem): Promise<void> {
    const storeName = item.entityType;
    const tempEntity = await get(storeName, item.entityId);
    
    if (tempEntity && item.data.id) {
      // Remove old temp entity
      await remove(storeName, item.entityId);
      
      // Create new entity with real ID
      await put(storeName, {
        ...tempEntity,
        id: item.data.id,
        tempId: item.entityId, // Keep reference to temp ID
        syncStatus: 'synced',
        updatedAt: new Date().toISOString(),
      });
    }
  }

  // Handle conflict
  async handleConflict(
    conflict: SyncConflict,
    resolution: ConflictResolution
  ): Promise<void> {
    const { entityType, entityId } = conflict;

    switch (resolution) {
      case 'server':
        // Accept server version
        await put(entityType as any, {
          id: entityId,
          data: conflict.serverData,
          syncStatus: 'synced',
          updatedAt: new Date().toISOString(),
        });
        break;
      
      case 'client':
        // Keep client version and re-sync
        await this.addToQueue('update', entityType as any, entityId, conflict.clientData);
        break;
      
      case 'merge':
        // Merge both versions (simple merge - prefer server for conflicts)
        const merged = { ...conflict.serverData, ...conflict.clientData };
        await put(entityType as any, {
          id: entityId,
          data: merged,
          syncStatus: 'pending',
          updatedAt: new Date().toISOString(),
        });
        await this.addToQueue('update', entityType as any, entityId, merged);
        break;
    }
  }

  // Get pending items count
  async getPendingCount(): Promise<number> {
    const queue = await getAll<SyncQueueItem>(STORES.SYNC_QUEUE);
    return queue.length;
  }

  // Get failed items
  async getFailedItems(): Promise<SyncQueueItem[]> {
    const queue = await getAll<SyncQueueItem>(STORES.SYNC_QUEUE);
    return queue.filter(item => item.attempts >= this.maxRetries);
  }

  // Retry failed items
  async retryFailed(): Promise<SyncProgress> {
    const failedItems = await this.getFailedItems();
    
    // Reset attempts for failed items
    for (const item of failedItems) {
      await put(STORES.SYNC_QUEUE, {
        ...item,
        attempts: 0,
        error: undefined,
      });
    }

    return this.processQueue();
  }

  // Check if syncing
  getIsSyncing(): boolean {
    return this.isSyncing;
  }
}

// Export singleton instance
export const syncManager = new SyncManager();

export default syncManager;
