import React from 'react';
import { useOfflineStore, AppSyncState } from '../context/useOfflineStore';
import { useAuthStore } from '../context/useAuthStore';
import { Wifi, WifiOff, RefreshCw, CloudLightning, AlertTriangle } from 'lucide-react';

const CONFIG: Record<AppSyncState, { label: string; icon: React.ElementType; classes: string; dot: string; spin?: boolean }> = {
  online: {
    label: 'Online',
    icon: Wifi,
    classes: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  offline: {
    label: 'Offline',
    icon: WifiOff,
    classes: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500 animate-pulse',
  },
  syncing: {
    label: 'Syncing…',
    icon: RefreshCw,
    classes: 'bg-blue-50 text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
    spin: true,
  },
  pendingSync: {
    label: 'Pending Sync',
    icon: CloudLightning,
    classes: 'bg-violet-50 text-violet-700 border-violet-200',
    dot: 'bg-violet-500 animate-pulse',
  },
};

interface SyncStatusIndicatorProps {
  compact?: boolean;
}

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({ compact = false }) => {
  const { syncState, pendingCount, failedCount, retryFailed, clearSynced } = useOfflineStore();
  const { token } = useAuthStore();

  const cfg = CONFIG[syncState];
  const Icon = cfg.icon;

  const handleRetry = async () => {
    if (token) await retryFailed(token);
  };

  const handleClearSynced = async () => {
    await clearSynced();
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1.5" title={cfg.label}>
        <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
        <span className="text-xs font-medium text-slate-500">{cfg.label}</span>
        {pendingCount > 0 && (
          <span className="ml-1 text-[10px] font-bold bg-violet-100 text-violet-700 rounded-full px-1.5 py-0.5">
            {pendingCount}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className={`flex items-center gap-2 border rounded-lg px-3 py-1.5 text-xs font-semibold ${cfg.classes}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
        <Icon className={`h-3.5 w-3.5 ${cfg.spin ? 'animate-spin' : ''}`} />
        <span>{cfg.label}</span>
        {pendingCount > 0 && syncState !== 'syncing' && (
          <span className="ml-auto font-bold opacity-80">({pendingCount} pending)</span>
        )}
      </div>

      {failedCount > 0 && (
        <button
          onClick={handleRetry}
          className="flex items-center gap-1.5 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-100 transition"
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          Retry {failedCount} failed
        </button>
      )}

      {syncState === 'online' && (
        <button
          onClick={handleClearSynced}
          className="text-[10px] text-slate-400 hover:text-slate-600 transition text-right"
        >
          Clear synced records
        </button>
      )}
    </div>
  );
};

export default SyncStatusIndicator;
