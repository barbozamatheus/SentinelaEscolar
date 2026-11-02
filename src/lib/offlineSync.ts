import { OfflineAttendancePayload } from '../types/database';
import { supabase } from './supabase';

const DB_NAME = 'sentinela_escolar_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'pending_attendance_queue';

function openOfflineDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Salva um registro de chamada na fila local IndexedDB quando o dispositivo está offline
 * e agenda sincronização via Service Worker Background Sync.
 */
export async function enqueueOfflineAttendance(payload: OfflineAttendancePayload): Promise<void> {
  const db = await openOfflineDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(payload);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    const registration = await navigator.serviceWorker.ready;
    try {
      await (registration as unknown as { sync: { register: (tag: string) => Promise<void> } }).sync.register(
        'sync-attendance-queue'
      );
    } catch {
      // Fallback imediato via evento 'online' do navegador
    }
  }
}

export async function getPendingOfflineQueue(): Promise<OfflineAttendancePayload[]> {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result as OfflineAttendancePayload[]);
    req.onerror = () => reject(req.error);
  });
}

export async function clearOfflineQueueItem(id: string): Promise<void> {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Sincroniza registros pendentes do IndexedDB para o Supabase (Upsert idempotente)
 */
export async function flushOfflineAttendanceQueue(): Promise<{ synced: number; failed: number }> {
  if (!navigator.onLine) return { synced: 0, failed: 0 };

  const queue = await getPendingOfflineQueue();
  let synced = 0;
  let failed = 0;

  for (const item of queue) {
    const { error } = await supabase.from('attendance_records').upsert(
      {
        class_id: item.class_id,
        student_id: item.student_id,
        attendance_date: item.attendance_date,
        bimester: item.bimester,
        status: item.status,
        synced_from_offline: true,
        client_updated_at: item.client_updated_at,
      },
      { onConflict: 'class_id,student_id,attendance_date' }
    );

    if (!error) {
      await clearOfflineQueueItem(item.id);
      synced++;
    } else {
      failed++;
    }
  }

  return { synced, failed };
}

export function registerOfflineServiceWorker(onSyncTrigger?: () => void): void {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Service worker registration optional in dev mode
      });
    });

    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'TRIGGER_ATTENDANCE_SYNC') {
        flushOfflineAttendanceQueue().then(() => onSyncTrigger?.());
      }
    });

    window.addEventListener('online', () => {
      flushOfflineAttendanceQueue().then(() => onSyncTrigger?.());
    });
  }
}
