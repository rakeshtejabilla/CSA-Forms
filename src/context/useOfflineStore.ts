import { create } from 'zustand';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { db, SyncStatus, SyncQueueEntry, DraftEntry } from '../lib/db';
import { useAuthStore } from './useAuthStore';
import { useSettingsStore } from './useSettingsStore';

const API_URL = import.meta.env.VITE_API_URL || '/api';

// ─── State Shape ──────────────────────────────────────────────────────────────

export type AppSyncState = 'online' | 'offline' | 'syncing' | 'pendingSync';

interface OfflineState {
  isOnline: boolean;
  syncState: AppSyncState;
  pendingCount: number;
  failedCount: number;

  // Actions
  loadCounts: () => Promise<void>;
  saveDraft: (formId: string, data: Record<string, any>, submitterName?: string, gpsLocation?: { latitude: number; longitude: number }) => Promise<string>;
  queueSubmission: (formId: string, data: Record<string, any>, submitterName?: string, gpsLocation?: { latitude: number; longitude: number }) => Promise<string>;
  syncToServer: (token: string) => Promise<{ success: number; failed: number }>;
  retryFailed: (token: string) => Promise<{ success: number; failed: number }>;
  getDraftsForForm: (formId: string) => Promise<DraftEntry[]>;
  getSyncQueueForForm: (formId: string) => Promise<SyncQueueEntry[]>;
  clearSynced: () => Promise<void>;
}

// ─── Zustand Store ────────────────────────────────────────────────────────────

export const useOfflineStore = create<OfflineState>((set, get) => ({
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  syncState: typeof navigator !== 'undefined' && navigator.onLine ? 'online' : 'offline',
  pendingCount: 0,
  failedCount: 0,

  loadCounts: async () => {
    try {
      const pending = await db.syncQueue.where('status').anyOf(['pending', 'syncing']).count();
      const failed = await db.syncQueue.where('status').equals('failed').count();
      const { isOnline } = get();
      const syncState: AppSyncState = !isOnline
        ? 'offline'
        : pending > 0
        ? 'pendingSync'
        : 'online';
      set({ pendingCount: pending, failedCount: failed, syncState });
    } catch {
      set({ pendingCount: 0, failedCount: 0 });
    }
  },

  saveDraft: async (formId, data, submitterName, gpsLocation) => {
    const localId = uuidv4();
    const organizationId = useAuthStore.getState().user?.organizationId;
    await db.drafts.add({
      localId,
      formId,
      organizationId,
      data,
      submitterName,
      gpsLocation,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    await get().loadCounts();
    return localId;
  },

  queueSubmission: async (formId, data, submitterName, gpsLocation) => {
    const localId = uuidv4();
    const organizationId = useAuthStore.getState().user?.organizationId;
    await db.syncQueue.add({
      localId,
      formId,
      organizationId,
      data,
      submitterName,
      gpsLocation,
      status: 'pending',
      retries: 0,
      createdAt: Date.now(),
    });
    await get().loadCounts();

    // Auto-trigger sync if online
    const token = useAuthStore.getState().token;
    const { offlineSync } = useSettingsStore.getState();
    if (get().isOnline && token && offlineSync) {
      setTimeout(() => get().syncToServer(token), 500);
    }
    return localId;
  },

  syncToServer: async (token: string) => {
    const { isOnline } = get();
    if (!isOnline) return { success: 0, failed: 0 };

    set(s => ({ syncState: 'syncing' as AppSyncState, pendingCount: s.pendingCount }));

    const pending = await db.syncQueue
      .where('status')
      .anyOf(['pending'])
      .and(entry => entry.retries < 3)
      .toArray();

    if (pending.length === 0) {
      await get().loadCounts();
      return { success: 0, failed: 0 };
    }

    // Mark all as syncing
    await db.syncQueue
      .where('localId')
      .anyOf(pending.map(p => p.localId))
      .modify({ status: 'syncing' as SyncStatus });

    let success = 0;
    let failed = 0;

    try {
      const response = await axios.post(
        `${API_URL}/submissions/sync/bulk`,
        {
          submissions: pending.map(p => ({
            localId: p.localId,
            formId: p.formId,
            data: p.data,
            gpsLocation: p.gpsLocation,
            submitterName: p.submitterName,
          })),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const results: Array<{ localId: string; serverId?: string; status: 'synced' | 'failed'; error?: string }> = response.data.results;

      for (const result of results) {
        if (result.status === 'synced') {
          await db.syncQueue
            .where('localId')
            .equals(result.localId)
            .modify({
              status: 'synced' as SyncStatus,
              serverId: result.serverId,
              syncedAt: Date.now(),
            });
          success++;
        } else {
          await db.syncQueue
            .where('localId')
            .equals(result.localId)
            .modify((entry: SyncQueueEntry) => {
              entry.status = 'failed';
              entry.retries = (entry.retries || 0) + 1;
              entry.lastError = result.error;
            });
          failed++;
        }
      }
    } catch (err: any) {
      // Network failure — revert all syncing back to pending
      await db.syncQueue
        .where('localId')
        .anyOf(pending.map(p => p.localId))
        .modify((entry: SyncQueueEntry) => {
          entry.status = 'pending';
          entry.retries = (entry.retries || 0) + 1;
          entry.lastError = err.message;
        });
      failed = pending.length;
    }

    await get().loadCounts();
    return { success, failed };
  },

  retryFailed: async (token: string) => {
    // Reset failed entries back to pending so next sync picks them up
    await db.syncQueue
      .where('status')
      .equals('failed')
      .modify({ status: 'pending' as SyncStatus });
    return get().syncToServer(token);
  },

  getDraftsForForm: async (formId: string) => {
    return db.drafts.where('formId').equals(formId).toArray();
  },

  getSyncQueueForForm: async (formId: string) => {
    return db.syncQueue.where('formId').equals(formId).toArray();
  },

  clearSynced: async () => {
    await db.syncQueue.where('status').equals('synced').delete();
    await get().loadCounts();
  },
}));

// ─── Online/Offline Listeners ─────────────────────────────────────────────────

if (typeof window !== 'undefined') {
  window.addEventListener('online', async () => {
    useOfflineStore.setState({ isOnline: true });
    await useOfflineStore.getState().loadCounts();
    // Auto-sync on reconnect if offlineSync is enabled
    const token = useAuthStore.getState().token;
    const { offlineSync } = useSettingsStore.getState();
    if (token && offlineSync) {
      useOfflineStore.getState().syncToServer(token);
    }
  });

  window.addEventListener('offline', () => {
    useOfflineStore.setState({ isOnline: false, syncState: 'offline' });
  });

  // Background sync every 30 seconds when online if offlineSync is enabled
  setInterval(async () => {
    const { isOnline } = useOfflineStore.getState();
    const token = useAuthStore.getState().token;
    const { offlineSync } = useSettingsStore.getState();
    if (isOnline && token && offlineSync) {
      const { pendingCount } = useOfflineStore.getState();
      if (pendingCount > 0) {
        useOfflineStore.getState().syncToServer(token);
      }
    }
  }, 30_000);
}