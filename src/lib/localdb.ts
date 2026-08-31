import type {
  Survey,
  WindowRow,
  WindowMeasurements,
  BuriedMeasurements,
  WindowSpecification,
  MullionPosition,
  TransomPosition,
  Drawing,
  Annotation,
  Photo,
  SiteAssessment,
} from './types';

const DB_NAME = 'window-surveyor';
const DB_VERSION = 3;

export const STORES = [
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
] as const;

export type StoreName = (typeof STORES)[number];

export interface LocalRecord {
  id: string;
  _dirty?: boolean;
  _deleted?: boolean;
  _localUpdatedAt: string;
}

export type LocalSurvey = Survey & LocalRecord;
export type LocalWindow = WindowRow & LocalRecord;
export type LocalMeasurements = WindowMeasurements & LocalRecord;
export type LocalBuried = BuriedMeasurements & LocalRecord;
export type LocalSpec = WindowSpecification & LocalRecord;
export type LocalMullion = MullionPosition & LocalRecord;
export type LocalTransom = TransomPosition & LocalRecord;
export type LocalDrawing = Drawing & LocalRecord;
export type LocalAnnotation = Annotation & LocalRecord;
export type LocalPhoto = Photo & LocalRecord;
export type LocalSiteAssessment = SiteAssessment & LocalRecord;

let dbInstance: IDBDatabase | null = null;

export function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const store of STORES) {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store, { keyPath: 'id' });
        }
      }
    };
    req.onsuccess = () => {
      dbInstance = req.result;
      resolve(dbInstance);
    };
    req.onerror = () => reject(req.error);
  });
}

function tx(db: IDBDatabase, store: StoreName, mode: IDBTransactionMode): IDBObjectStore {
  return db.transaction(store, mode).objectStore(store);
}

export async function getAll<T>(store: StoreName): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = tx(db, store, 'readonly').getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

export async function get<T>(store: StoreName, id: string): Promise<T | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = tx(db, store, 'readonly').get(id);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function put<T extends { id: string }>(store: StoreName, record: T): Promise<T> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = tx(db, store, 'readwrite').put(record);
    req.onsuccess = () => resolve(record);
    req.onerror = () => reject(req.error);
  });
}

export async function bulkPut<T extends { id: string }>(store: StoreName, records: T[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(store, 'readwrite');
    const os = transaction.objectStore(store);
    records.forEach((r) => os.put(r));
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function remove(store: StoreName, id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = tx(db, store, 'readwrite').delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function clearStore(store: StoreName): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = tx(db, store, 'readwrite').clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getByField<T>(store: StoreName, field: string, value: string): Promise<T[]> {
  const all = await getAll<T & Record<string, unknown>>(store);
  return all.filter((r) => r[field] === value);
}

export function genId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function nowISO(): string {
  return new Date().toISOString();
}
