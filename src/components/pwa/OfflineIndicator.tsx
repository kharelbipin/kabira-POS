import React, { useEffect, useState } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      id="pwa-offline-status-banner"
      className="fixed bottom-4 left-4 z-50 flex items-center space-x-2.5 rounded-2xl bg-slate-900/95 border border-amber-500/50 px-4 py-2.5 text-xs font-semibold text-amber-200 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-2"
    >
      <div className="p-1 rounded-lg bg-amber-500/20 text-amber-400 shrink-0">
        <WifiOff className="w-4 h-4 animate-pulse" />
      </div>
      <div>
        <div className="font-bold text-white text-xs">Offline Mode Active</div>
        <div className="text-[11px] text-amber-300/80">Local catalog &amp; cached register transactions operational</div>
      </div>
    </div>
  );
};
