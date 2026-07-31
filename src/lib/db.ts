import Dexie, { Table } from 'dexie';

// ─── Table Shapes ────────────────────────────────────────────────────────────

export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'failed';

export interface CachedForm {
  id: string;
  title: string;
  description?: string;
  fields: any[];
  version: number;
  status: string;
  organizationId?: string;
  cachedAt: number;
}

export interface DraftEntry {
  id?: number;
  localId: string;           // uuid generated client-side
  formId: string;
  organizationId?: string;
  data: Record<string, any>;
  submitterName?: string;
  gpsLocation?: { latitude: number; longitude: number };
  createdAt: number;
  updatedAt: number;
}

export interface CachedSubmission {
  id: string;                // server id
  formId: string;
  organizationId?: string;
  data: Record<string, any>;
  submitterName?: string;
  submittedAt: string;
  cachedAt: number;
}

export interface SyncQueueEntry {
  id?: number;
  localId: string;
  formId: string;
  organizationId?: string;
  data: Record<string, any>;
  submitterName?: string;
  gpsLocation?: { latitude: number; longitude: number };
  status: SyncStatus;
  retries: number;
  lastError?: string;
  createdAt: number;
  syncedAt?: number;
  serverId?: string;         // populated after successful sync
}

export interface CachedUser {
  id: string;
  email: string;
  name: string;
  role: string;
  organizationId?: string;
  cachedAt: number;
}

export interface LookupData {
  id: string;               // composite key e.g. "choices_<formId>"
  type: string;
  payload: any;
  cachedAt: number;
}

// ─── Dexie Database ──────────────────────────────────────────────────────────

export class FormBuilderDB extends Dexie {
  forms!: Table<CachedForm, string>;
  drafts!: Table<DraftEntry, number>;
  submissions!: Table<CachedSubmission, string>;
  syncQueue!: Table<SyncQueueEntry, number>;
  users!: Table<CachedUser, string>;
  lookupData!: Table<LookupData, string>;

  constructor() {
    super('FormBuilderOfflineDB_v3');
    this.version(1).stores({
      forms:       'id, status, organizationId, cachedAt',
      drafts:      '++id, localId, formId, organizationId, createdAt',
      submissions: 'id, formId, organizationId, submittedAt, cachedAt',
      syncQueue:   '++id, localId, formId, organizationId, status, retries, createdAt',
      users:       'id, email, role, organizationId, cachedAt',
      lookupData:  'id, type, cachedAt',
    });
  }
}

export const db = new FormBuilderDB();
