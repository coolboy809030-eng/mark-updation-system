import React, { useEffect, useState } from 'react';
import { Cloud, CloudOff, CheckCircle2, RefreshCw, Zap } from 'lucide-react';
import { instantSyncBridge, SyncStatusInfo } from '../../utils/instantSyncBridge';

interface SyncStatusBarProps {
  className?: string;
  onManualSync?: () => void;
  isSheetConfigured?: boolean;
}

export const SyncStatusBar: React.FC<SyncStatusBarProps> = ({
  className = '',
  onManualSync,
  isSheetConfigured = true
}) => {
  const [syncStatus, setSyncStatus] = useState<SyncStatusInfo>(() => instantSyncBridge.getStatus());

  useEffect(() => {
    const unsubscribe = instantSyncBridge.subscribe((status) => {
      setSyncStatus(status);
    });
    return unsubscribe;
  }, []);

  return (
    <div
      id="sync-status-bar"
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border shadow-xs transition-all ${
        syncStatus.state === 'syncing'
          ? 'bg-amber-500/15 border-amber-500/40 text-amber-900'
          : syncStatus.state === 'synced'
          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-900'
          : syncStatus.state === 'error'
          ? 'bg-rose-500/15 border-rose-500/30 text-rose-900'
          : 'bg-slate-800/80 border-slate-700/60 text-slate-200'
      } ${className}`}
      title={syncStatus.message}
    >
      {/* ⚡ Instant Local Status Badge */}
      <span className="flex items-center gap-1 font-bold text-amber-500">
        <Zap className="w-3.5 h-3.5 fill-amber-500" />
        <span className="text-[11px]">0.01s Instant</span>
      </span>

      <span className="text-slate-400">|</span>

      {/* Cloud Status */}
      <div className="flex items-center gap-1.5">
        {syncStatus.state === 'syncing' ? (
          <>
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
            <span className="text-[11px] font-semibold">क्लाउड सिंक हो रहा है...</span>
          </>
        ) : syncStatus.state === 'synced' ? (
          <>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-[11px] font-semibold">
              {syncStatus.lastSyncedTime ? `सिंक्ड (${syncStatus.lastSyncedTime})` : 'क्लाउड सुरक्षित'}
            </span>
          </>
        ) : syncStatus.state === 'error' ? (
          <>
            <CloudOff className="w-3.5 h-3.5 text-rose-600" />
            <span className="text-[11px] font-semibold text-rose-700">ऑफ़लाइन सुरक्षित</span>
          </>
        ) : (
          <>
            <Cloud className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[11px] text-slate-300">
              {isSheetConfigured ? 'क्लाउड तैयार' : 'स्थानीय मोड'}
            </span>
          </>
        )}
      </div>

      {/* Optional Manual Sync Button */}
      {onManualSync && (
        <button
          type="button"
          onClick={onManualSync}
          className="ml-1 p-1 hover:bg-black/10 rounded-full transition-colors cursor-pointer"
          title="अभी Google Sheet से सिंक करें (Force Refresh)"
        >
          <RefreshCw className={`w-3 h-3 ${syncStatus.state === 'syncing' ? 'animate-spin' : ''}`} />
        </button>
      )}
    </div>
  );
};
