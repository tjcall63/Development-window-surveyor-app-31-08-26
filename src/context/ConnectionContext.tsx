import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { syncAll, getPendingCount, setSimulateOffline, isSimulatingOffline, getLastSyncError, clearLastSyncError, type SyncErrorDetail } from '@/lib/sync';

export type ConnectionStatus = 'online' | 'offline';
export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

interface ConnectionContextValue {
  online: boolean;
  simOffline: boolean;
  syncStatus: SyncStatus;
  pendingCount: number;
  lastSyncAt: number | null;
  lastSyncError: SyncErrorDetail | null;
  triggerSync: () => Promise<void>;
  refreshPending: () => Promise<void>;
  toggleSimulateOffline: () => void;
  dismissSyncError: () => void;
}

const Ctx = createContext<ConnectionContextValue | null>(null);

export function useConnection() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useConnection must be used within ConnectionProvider');
  return ctx;
}

export function ConnectionProvider({ children }: { children: ReactNode }) {
  const [online, setOnline] = useState(navigator.onLine);
  const [simOffline, setSimOffline] = useState(isSimulatingOffline());
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [lastSyncError, setLastSyncError] = useState<SyncErrorDetail | null>(null);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncing = useRef(false);
  const consecutiveFailures = useRef(0);

  const refreshPending = useCallback(async () => {
    const count = await getPendingCount();
    setPendingCount(count);
  }, []);

  const triggerSync = useCallback(async () => {
    if (syncing.current) return;
    if (simOffline) return;
    if (!navigator.onLine) return;
    syncing.current = true;
    setSyncStatus('syncing');
    try {
      const result = await syncAll();
      if (result.errors > 0) {
        consecutiveFailures.current += 1;
        setSyncStatus('error');
        setLastSyncError(getLastSyncError());
      } else {
        consecutiveFailures.current = 0;
        setSyncStatus('synced');
        setLastSyncAt(Date.now());
        setLastSyncError(null);
        clearLastSyncError();
      }
      await refreshPending();
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch {
      consecutiveFailures.current += 1;
      setSyncStatus('error');
      setLastSyncError(getLastSyncError());
      setTimeout(() => setSyncStatus('idle'), 3000);
    } finally {
      syncing.current = false;
    }
  }, [refreshPending, simOffline]);

  const toggleSimulateOffline = useCallback(() => {
    const next = !simOffline;
    setSimOffline(next);
    setSimulateOffline(next);
  }, [simOffline]);

  const dismissSyncError = useCallback(() => {
    setLastSyncError(null);
    clearLastSyncError();
  }, []);

  useEffect(() => {
    const onOnline = () => {
      setOnline(true);
      consecutiveFailures.current = 0;
      setTimeout(() => triggerSync(), 500);
    };
    const onOffline = () => {
      setOnline(false);
      setSyncStatus('idle');
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [triggerSync]);

  useEffect(() => {
    refreshPending();
    if (!simOffline && navigator.onLine) {
      triggerSync();
    }
    const interval = setInterval(() => {
      refreshPending();
      if (
        !simOffline &&
        navigator.onLine &&
        pendingCount > 0 &&
        syncStatus !== 'syncing' &&
        consecutiveFailures.current < 3
      ) {
        triggerSync();
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [refreshPending, pendingCount, syncStatus, triggerSync, simOffline]);

  useEffect(() => {
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      if (!simOffline && navigator.onLine && pendingCount > 0 && consecutiveFailures.current < 3) {
        triggerSync();
      }
    }, 2000);
    return () => {
      if (syncTimer.current) clearTimeout(syncTimer.current);
    };
  }, [pendingCount, triggerSync, simOffline]);

  const value: ConnectionContextValue = {
    online: simOffline ? false : online,
    simOffline,
    syncStatus,
    pendingCount,
    lastSyncAt,
    lastSyncError,
    triggerSync,
    refreshPending,
    toggleSimulateOffline,
    dismissSyncError,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
