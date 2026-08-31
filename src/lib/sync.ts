import { supabase, supabaseConfig } from './supabase';
import * as local from './localdb';

type SyncProgress = (msg: string) => void;

const TABLE_MAP: Record<string, string> = {
  surveys: 'surveys',
  windows: 'windows',
  window_measurements: 'window_measurements',
  buried_measurements: 'buried_measurements',
  window_specifications: 'window_specifications',
  mullion_positions: 'mullion_positions',
  transom_positions: 'transom_positions',
  drawings: 'drawings',
  annotations: 'annotations',
  photos: 'photos',
  site_assessment: 'site_assessment',
};

const SYNC_ORDER: local.StoreName[] = [
  'surveys',
  'windows',
  'window_measurements',
  'buried_measurements',
  'window_specifications',
  'mullion_positions',
  'transom_positions',
  'drawings',
  'annotations',
  'photos',
  'site_assessment',
];

let simulateOffline = false;

export function setSimulateOffline(value: boolean) {
  simulateOffline = value;
}

export function isSimulatingOffline() {
  return simulateOffline;
}

export interface SyncErrorDetail {
  store: string;
  operation: 'push' | 'pull';
  recordId?: string;
  code: string;
  message: string;
  endpoint?: string;
  method?: string;
  httpStatus?: number;
  requestStartedAt?: string;
  requestReachedServer?: boolean;
  browserOnline?: boolean;
  hasSupabaseUrl?: boolean;
  hasAnonKey?: boolean;
  payloadKeys?: string[];
}

export interface SyncResult {
  pushed: number;
  pulled: number;
  errors: number;
  errorDetails: SyncErrorDetail[];
}

let lastSyncError: SyncErrorDetail | null = null;

export function getLastSyncError(): SyncErrorDetail | null {
  return lastSyncError;
}

export function clearLastSyncError() {
  lastSyncError = null;
}

function captureError(e: unknown): { code: string; message: string; status?: number } {
  const err = e as { code?: string; message?: string; status?: number; details?: string; hint?: string };
  const suffix = [err.details, err.hint].filter(Boolean).join(' ');
  return {
    code: err.code ?? 'unknown',
    message: [err.message ?? String(e), suffix].filter(Boolean).join(' '),
    status: err.status,
  };
}

function tableEndpoint(table: string): string {
  return `${supabaseConfig.url?.replace(/\/$/, '') ?? 'unconfigured'}/rest/v1/${table}`;
}

function diagnosticFields(table: string, method: string, startedAt: string, status?: number) {
  return {
    endpoint: tableEndpoint(table),
    method,
    httpStatus: status,
    requestStartedAt: startedAt,
    requestReachedServer: status !== undefined,
    browserOnline: navigator.onLine,
    hasSupabaseUrl: Boolean(supabaseConfig.url),
    hasAnonKey: supabaseConfig.hasAnonKey,
  };
}

export async function syncAll(progress?: SyncProgress): Promise<SyncResult> {
  const result: SyncResult = { pushed: 0, pulled: 0, errors: 0, errorDetails: [] };

  if (simulateOffline || !navigator.onLine) {
    return result;
  }

  for (const store of SYNC_ORDER) {
    try {
      const { pushed, errors } = await pushStore(store, result.errorDetails, progress);
      result.pushed += pushed;
      result.errors += errors;
    } catch (e) {
      result.errors++;
      const { code, message } = captureError(e);
      result.errorDetails.push({ store, operation: 'push', code, message });
    }
  }

  for (const store of SYNC_ORDER) {
    try {
      const { pulled, errors } = await pullStore(store, result.errorDetails, progress);
      result.pulled += pulled;
      result.errors += errors;
    } catch (e) {
      result.errors++;
      const { code, message } = captureError(e);
      result.errorDetails.push({ store, operation: 'pull', code, message });
    }
  }

  lastSyncError = result.errorDetails.length > 0 ? result.errorDetails[0] : null;

  return result;
}

async function pushStore(
  store: local.StoreName,
  errorDetails: SyncErrorDetail[],
  progress?: SyncProgress,
): Promise<{ pushed: number; errors: number }> {
  const table = TABLE_MAP[store];
  const records = await local.getAll<Record<string, unknown> & local.LocalRecord>(store);
  const dirty = records.filter((r) => r._dirty);
  if (dirty.length === 0) return { pushed: 0, errors: 0 };

  let pushed = 0;
  let errors = 0;
  for (const record of dirty) {
    try {
      const requestStartedAt = new Date().toISOString();
      if (record._deleted) {
        const { error } = await supabase.from(table).delete().eq('id', record.id);
        if (error) throw error;
        await local.remove(store, record.id);
        pushed++;
        continue;
      }

      const { _dirty, _deleted, _localUpdatedAt, _syncStatus, sync_status, ...clean } = record;
      const payloadKeys = Object.keys(clean).sort();
      console.debug('[sync] survey payload structure', {
        store,
        recordId: record.id,
        payloadKeys,
        hasLocalOnlyFields: payloadKeys.some((key) => key.startsWith('_') || key === 'sync_status'),
      });
      const { error } = await supabase.from(table).upsert(clean);
      if (error) throw error;

      const updated = { ...record, _dirty: false } as Record<string, unknown> & local.LocalRecord;
      if (store === 'photos') {
        updated.sync_status = 'synced';
      }
      await local.put(store, updated);
      pushed++;
    } catch (e) {
      errors++;
      const { code, message, status } = captureError(e);
      const detail: SyncErrorDetail = {
        store,
        operation: 'push',
        recordId: record.id,
        code,
        message,
        ...diagnosticFields(table, record._deleted ? 'DELETE' : 'POST', new Date().toISOString(), status),
      };
      errorDetails.push(detail);
      progress?.(`Failed to push ${store}/${record.id}: ${message}`);
    }
  }
  return { pushed, errors };
}

async function pullStore(
  store: local.StoreName,
  errorDetails: SyncErrorDetail[],
  progress?: SyncProgress,
): Promise<{ pulled: number; errors: number }> {
  const table = TABLE_MAP[store];
  try {
    const { data, error } = await supabase.from(table).select('*');
    if (error) throw error;
    if (!data || data.length === 0) return { pulled: 0, errors: 0 };

    const localRecords = await local.getAll<Record<string, unknown> & local.LocalRecord>(store);
    const localMap = new Map(localRecords.map((r) => [r.id, r]));

    let count = 0;
    for (const remoteRow of data) {
      const remote = remoteRow as Record<string, unknown>;
      const id = remote.id as string;
      const existing = localMap.get(id);

      if (existing?._dirty && !existing._deleted) {
        continue;
      }

      if (existing?._deleted) {
        continue;
      }

      const remoteUpdated = (remote.updated_at as string) ?? '';
      const localUpdated = existing?._localUpdatedAt ?? '';
      if (existing && remoteUpdated && localUpdated && remoteUpdated <= localUpdated) {
        continue;
      }

      const record = { ...remote, _dirty: false, _localUpdatedAt: remoteUpdated || local.nowISO() } as unknown as local.LocalRecord;
      if (store === 'photos') {
        (record as unknown as Record<string, unknown>).sync_status = 'synced';
      }
      await local.put(store, record);
      count++;
    }

    return { pulled: count, errors: 0 };
  } catch (e) {
    const { code, message, status } = captureError(e);
    errorDetails.push({
      store,
      operation: 'pull',
      code,
      message,
      ...diagnosticFields(table, 'GET', new Date().toISOString(), status),
    });
    progress?.(`Failed to pull ${store}: ${message}`);
    return { pulled: 0, errors: 1 };
  }
}

export async function getPendingCount(): Promise<number> {
  let count = 0;
  for (const store of SYNC_ORDER) {
    const records = await local.getAll<local.LocalRecord>(store);
    count += records.filter((r) => r._dirty).length;
  }
  return count;
}
