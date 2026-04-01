// ═══════════════════════════════════════════════════════════════
// OfflineIndicator - شريط يظهر في الأعلى عند الـ offline (مع i18n)
// ═══════════════════════════════════════════════════════════════

'use client';

import { useState, useEffect, useCallback, memo } from 'react';
import { useTranslations } from 'next-intl';
import {
  Wifi,
  WifiOff,
  CloudOff,
  RefreshCw,
  CheckCircle,
  X,
} from 'lucide-react';
import useOffline from '@/hooks/useOffline';

interface OfflineIndicatorProps {
  showSyncButton?: boolean;
  autoHide?: boolean;
  autoHideDelay?: number;
}

export const OfflineIndicator = memo(function OfflineIndicator({
  showSyncButton = true,
  autoHide = true,
  autoHideDelay = 5000,
}: OfflineIndicatorProps) {
  const t = useTranslations('offline');
  const tCommon = useTranslations('common');
  
  const {
    isOnline,
    pendingSync,
    isSyncing,
    syncProgress,
    lastSyncTime,
    syncNow,
  } = useOffline();

  const [isHidden, setIsHidden] = useState(false);
  const [showSyncSuccess, setShowSyncSuccess] = useState(false);

  // Auto-hide when online and no pending sync
  useEffect(() => {
    if (autoHide && isOnline && pendingSync === 0) {
      const timer = setTimeout(() => {
        setIsHidden(true);
      }, autoHideDelay);
      
      return () => clearTimeout(timer);
    } else {
      setIsHidden(false);
    }
  }, [autoHide, autoHideDelay, isOnline, pendingSync]);

  // Show sync success message
  useEffect(() => {
    if (syncProgress && !isSyncing && syncProgress.completed > 0) {
      setShowSyncSuccess(true);
      
      const timer = setTimeout(() => {
        setShowSyncSuccess(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [syncProgress, isSyncing]);

  // Handle sync button click
  const handleSync = useCallback(async () => {
    if (!isOnline || isSyncing) return;
    await syncNow();
  }, [isOnline, isSyncing, syncNow]);

  // Don't render if hidden
  if (isHidden && isOnline && pendingSync === 0) {
    return null;
  }

  // Online with pending sync
  if (isOnline && pendingSync > 0) {
    return (
      <div className="fixed top-0 start-0 end-0 z-50 animate-slide-down">
        <div className="bg-yellow-500 text-white px-4 py-2 flex items-center justify-center gap-3 text-sm">
          <CloudOff className="w-4 h-4" />
          <span>
            {t('pendingSync', { count: pendingSync })}
          </span>
          {showSyncButton && (
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="flex items-center gap-1 px-3 py-1 bg-white/20 hover:bg-white/30 
                rounded-lg transition-colors disabled:opacity-50"
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{t('syncing')}</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  <span>{t('syncNow')}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    );
  }

  // Sync success message
  if (showSyncSuccess) {
    return (
      <div className="fixed top-0 start-0 end-0 z-50 animate-slide-down">
        <div className="bg-green-500 text-white px-4 py-2 flex items-center justify-center gap-3 text-sm">
          <CheckCircle className="w-4 h-4" />
          <span>{t('syncSuccess')}</span>
          <button
            onClick={() => setShowSyncSuccess(false)}
            className="p-1 hover:bg-white/20 rounded transition-colors"
            aria-label={tCommon('close')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Offline status
  if (!isOnline) {
    return (
      <div className="fixed top-0 start-0 end-0 z-50 animate-slide-down">
        <div className="bg-red-500 text-white px-4 py-2 flex items-center justify-center gap-3 text-sm">
          <WifiOff className="w-4 h-4" />
          <span>
            {t('offlineMessage')}
          </span>
          {pendingSync > 0 && (
            <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs">
              {t('pendingCount', { count: pendingSync })}
            </span>
          )}
        </div>
      </div>
    );
  }

  // Online status (minimal indicator)
  return (
    <div className="fixed bottom-20 lg:bottom-4 start-4 z-40 animate-fade-in">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 
        text-green-700 dark:text-green-300 rounded-full text-xs shadow-sm">
        <Wifi className="w-3 h-3" />
        <span>{t('online')}</span>
        {lastSyncTime && (
          <span className="text-green-600 dark:text-green-400">
            • {t('lastSync')}: {formatTimeAgo(lastSyncTime, t)}
          </span>
        )}
      </div>
    </div>
  );
});

// Format time ago helper
function formatTimeAgo(dateString: string, t: (key: string, params?: Record<string, any>) => string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMinutes < 1) {
    return t('timeNow');
  } else if (diffMinutes < 60) {
    return t('timeMinutesAgo', { count: diffMinutes });
  } else if (diffHours < 24) {
    return t('timeHoursAgo', { count: diffHours });
  } else {
    return t('timeDaysAgo', { count: diffDays });
  }
}

export default OfflineIndicator;
