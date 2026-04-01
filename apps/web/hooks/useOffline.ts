'use client';

// ═══════════════════════════════════════════════════════════════
// useOffline Hook - للتعامل مع الـ offline
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { syncManager, SyncProgress } from '@/lib/db/sync-manager';
import { getPendingSyncCount, getLastSyncTime } from '@/lib/db/indexeddb';

interface UseOfflineReturn {
  // Online status
  isOnline: boolean;
  wasOffline: boolean;
  
  // Sync state
  pendingSync: number;
  isSyncing: boolean;
  syncProgress: SyncProgress | null;
  lastSyncTime: string | null;
  
  // Sync actions
  syncNow: () => Promise<SyncProgress | null>;
  
  // Events
  onOnline: (callback: () => void) => void;
  onOffline: (callback: () => void) => void;
}

export function useOffline(): UseOfflineReturn {
  // State
  const [isOnline, setIsOnline] = useState(true);
  const [wasOffline, setWasOffline] = useState(false);
  const [pendingSync, setPendingSync] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // Check initial online status
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
    }
  }, []);

  // Update pending sync count
  const updatePendingCount = useCallback(async () => {
    try {
      const count = await getPendingSyncCount();
      setPendingSync(count);
    } catch (error) {
      console.error('Failed to get pending sync count:', error);
    }
  }, []);

  // Update last sync time
  const updateLastSyncTime = useCallback(async () => {
    try {
      const time = await getLastSyncTime();
      setLastSyncTime(time);
    } catch (error) {
      console.error('Failed to get last sync time:', error);
    }
  }, []);

  // Handle online event
  const handleOnline = useCallback(() => {
    setIsOnline(true);
    // Auto-sync when coming back online
    if (wasOffline && pendingSync > 0) {
      syncManager.processQueue();
    }
  }, [wasOffline, pendingSync]);

  // Handle offline event
  const handleOffline = useCallback(() => {
    setIsOnline(false);
    setWasOffline(true);
  }, []);

  // Set up event listeners
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Initial checks
    setIsOnline(navigator.onLine);
    updatePendingCount();
    updateLastSyncTime();

    // Event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Sync manager events
    syncManager.on('sync:start', () => {
      setIsSyncing(true);
    });

    syncManager.on('sync:progress', (progress: SyncProgress) => {
      setSyncProgress(progress);
    });

    syncManager.on('sync:complete', (progress: SyncProgress) => {
      setIsSyncing(false);
      setSyncProgress(progress);
      updatePendingCount();
      updateLastSyncTime();
      
      // Clear progress after a delay
      setTimeout(() => {
        setSyncProgress(null);
      }, 3000);
    });

    syncManager.on('sync:error', (error: any) => {
      console.error('Sync error:', error);
      setIsSyncing(false);
    });

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline, updatePendingCount, updateLastSyncTime]);

  // Sync now action
  const syncNow = useCallback(async (): Promise<SyncProgress | null> => {
    if (!isOnline || isSyncing) {
      return null;
    }

    try {
      const progress = await syncManager.processQueue();
      return progress;
    } catch (error) {
      console.error('Sync failed:', error);
      return null;
    }
  }, [isOnline, isSyncing]);

  // Event registration helpers
  const onOnline = useCallback((callback: () => void) => {
    const handler = () => {
      if (navigator.onLine) {
        callback();
      }
    };
    window.addEventListener('online', handler);
    
    return () => {
      window.removeEventListener('online', handler);
    };
  }, []);

  const onOffline = useCallback((callback: () => void) => {
    const handler = () => {
      if (!navigator.onLine) {
        callback();
      }
    };
    window.addEventListener('offline', handler);
    
    return () => {
      window.removeEventListener('offline', handler);
    };
  }, []);

  return {
    isOnline,
    wasOffline,
    pendingSync,
    isSyncing,
    syncProgress,
    lastSyncTime,
    syncNow,
    onOnline,
    onOffline,
  };
}

export default useOffline;
