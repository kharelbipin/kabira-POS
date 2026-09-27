import React, { useState, useEffect, useRef } from 'react';
import { posBridge } from '../../services/posBridge';
import { deviceDiscovery } from '../../services/deviceDiscoveryService';
import { playBeep } from '../../utils/audio';
import { CustomerDisplayView } from './CustomerDisplayView';
import { ConfiguredCustomerDisplay } from '../../types';
import {
  Monitor,
  ExternalLink,
  RotateCcw,
  Eye,
  EyeOff,
  X,
  AlertTriangle,
  RefreshCw,
  Sliders,
} from 'lucide-react';

interface CustomerDisplayAutoBannerProps {
  onOpenCustomerDisplayModal?: () => void;
}

export const CustomerDisplayAutoBanner: React.FC<CustomerDisplayAutoBannerProps> = ({
  onOpenCustomerDisplayModal,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(posBridge.isCustomerDisplayWindowOpen());
  const [displayConfig, setDisplayConfig] = useState<ConfiguredCustomerDisplay>(
    posBridge.getCustomerDisplayConfig()
  );
  const [showDockedPreview, setShowDockedPreview] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);
  const hasAttemptedGesture = useRef<boolean>(false);

  useEffect(() => {
    // 1. Subscribe to Customer Display Config changes
    const unsub = posBridge.subscribeCustomerDisplayConfig((cfg) => {
      setDisplayConfig(cfg);
    });

    // 2. Initial attempt on component mount
    if (deviceDiscovery.isAutoOpenCustomerDisplayEnabled()) {
      posBridge.openCustomerDisplayWindow(true).then((res) => {
        setIsOpen(!res.blocked && posBridge.isCustomerDisplayWindowOpen());
      });
    }

    // 3. Browser popup shield bypass: attach a one-time gesture listener on first click/key
    const handleFirstGesture = () => {
      if (hasAttemptedGesture.current) return;
      hasAttemptedGesture.current = true;

      if (
        deviceDiscovery.isAutoOpenCustomerDisplayEnabled() &&
        !posBridge.isCustomerDisplayWindowOpen() &&
        posBridge.getCustomerDisplayConfig().status !== 'WARNING'
      ) {
        posBridge.openCustomerDisplayWindow(false).then((res) => {
          setIsOpen(!res.blocked && posBridge.isCustomerDisplayWindowOpen());
        });
      }
    };

    window.addEventListener('click', handleFirstGesture, { once: true, capture: true });
    window.addEventListener('keydown', handleFirstGesture, { once: true, capture: true });

    // 4. Periodic health heartbeat to check if window is closed or alive
    const interval = setInterval(() => {
      const current = posBridge.isCustomerDisplayWindowOpen();
      setIsOpen(current);
    }, 2000);

    return () => {
      unsub();
      window.removeEventListener('click', handleFirstGesture, { capture: true });
      window.removeEventListener('keydown', handleFirstGesture, { capture: true });
      clearInterval(interval);
    };
  }, []);

  const handleManualOpen = async () => {
    playBeep('click');
    const res = await posBridge.openCustomerDisplayWindow(false);
    if (res.blocked) {
      if (onOpenCustomerDisplayModal) {
        onOpenCustomerDisplayModal();
      } else {
        alert(
          'Customer Display Window pop-up was blocked by your browser.\nPlease allow popups for this site in your browser URL bar or use the Live Docked Preview.'
        );
      }
    } else {
      setIsOpen(posBridge.isCustomerDisplayWindowOpen());
      playBeep('success');
    }
  };

  const handleRetry = async () => {
    playBeep('click');
    setIsRetrying(true);
    const res = await posBridge.openCustomerDisplayWindow(false);
    setIsRetrying(false);
    if (res.success) {
      setIsOpen(true);
      playBeep('success');
    }
  };

  const handleRestart = async () => {
    playBeep('click');
    await posBridge.restartCustomerDisplay();
    setIsOpen(posBridge.isCustomerDisplayWindowOpen());
  };

  // If customer monitor is missing or in warning state:
  // Show required non-intrusive warning with RETRY | SELECT DISPLAY
  const isWarningOrDisconnected =
    displayConfig.status === 'WARNING' || displayConfig.status === 'DISCONNECTED';

  if (isDismissed && isOpen) {
    return null;
  }

  return (
    <>
      {/* If configured monitor is unavailable, show required non-blocking alert */}
      {isWarningOrDisconnected && !isOpen && (
        <div
          id="customer-display-warning-banner"
          className="fixed top-14 right-4 z-40 max-w-md bg-amber-950/90 text-amber-100 border-2 border-amber-500/80 rounded-xl shadow-2xl p-3 backdrop-blur-md animate-in fade-in slide-in-from-top-2"
        >
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold uppercase tracking-wider text-amber-300">
                Customer Display Not Available
              </div>
              <p className="text-xs text-amber-200/90 mt-0.5 leading-relaxed">
                {displayConfig.warningMessage || 'Configured customer monitor could not be found.'}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={handleRetry}
                  disabled={isRetrying}
                  className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-md shadow-xs transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${isRetrying ? 'animate-spin' : ''}`} />
                  RETRY
                </button>
                {onOpenCustomerDisplayModal && (
                  <button
                    type="button"
                    onClick={() => {
                      playBeep('click');
                      onOpenCustomerDisplayModal();
                    }}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-md border border-slate-600 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Sliders className="w-3 h-3 text-amber-400" />
                    SELECT DISPLAY
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsDismissed(true)}
                  className="ml-auto text-amber-300 hover:text-white text-xs p-1"
                  title="Dismiss warning"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Bottom Status Pill */}
      <div
        id="customer-display-auto-pill"
        className="fixed bottom-3 right-3 z-40 flex items-center gap-2 bg-slate-900/95 text-white backdrop-blur-md px-3 py-2 rounded-2xl shadow-xl border border-slate-700/80 text-xs animate-in fade-in slide-in-from-bottom-2"
      >
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            {isOpen ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </>
            ) : isWarningOrDisconnected ? (
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 animate-pulse" />
            ) : (
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400 animate-pulse" />
            )}
          </span>

          <Monitor className="w-4 h-4 text-slate-300" />
          <span className="font-semibold text-slate-200 hidden sm:inline">
            Customer Display:
          </span>
          <span
            className={`font-bold ${
              isOpen
                ? 'text-emerald-400'
                : isWarningOrDisconnected
                ? 'text-rose-400'
                : 'text-amber-400'
            }`}
          >
            {isOpen
              ? 'CONNECTED / SYNCED'
              : isWarningOrDisconnected
              ? 'NOT DETECTED'
              : 'READY TO OPEN'}
          </span>
        </div>

        <div className="flex items-center gap-1 pl-1 border-l border-slate-700">
          {!isOpen ? (
            <button
              type="button"
              onClick={handleManualOpen}
              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
            >
              <ExternalLink className="w-3 h-3" />
              OPEN SCREEN
            </button>
          ) : (
            <button
              type="button"
              onClick={handleRestart}
              title="Restart Customer Display Window"
              className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              playBeep('click');
              setShowDockedPreview(!showDockedPreview);
            }}
            title={showDockedPreview ? 'Hide Docked Live Preview' : 'Show Docked Live Preview'}
            className={`px-2 py-1 rounded-lg font-medium transition-colors flex items-center gap-1 cursor-pointer ${
              showDockedPreview
                ? 'bg-indigo-600 text-white'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            {showDockedPreview ? (
              <EyeOff className="w-3.5 h-3.5 text-indigo-200" />
            ) : (
              <Eye className="w-3.5 h-3.5 text-slate-300" />
            )}
            <span className="hidden md:inline">Preview</span>
          </button>

          {isOpen && (
            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              className="p-1 text-slate-400 hover:text-slate-200 cursor-pointer"
              title="Dismiss pill"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Docked Picture-in-Picture Live Preview Window for single-monitor cashiers */}
      {showDockedPreview && (
        <div className="fixed bottom-14 right-3 z-50 w-96 max-w-[95vw] h-64 bg-slate-950 rounded-2xl shadow-2xl border-2 border-indigo-500/60 overflow-hidden flex flex-col animate-in zoom-in-95">
          <div className="bg-slate-900 px-3 py-1.5 flex items-center justify-between border-b border-slate-800 text-xs">
            <span className="text-slate-200 font-bold flex items-center gap-1.5">
              <Monitor className="w-3.5 h-3.5 text-indigo-400" />
              Live Customer Screen (Display Mirror)
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleManualOpen}
                title="Pop out to secondary monitor"
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setShowDockedPreview(false)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-hidden relative scale-75 origin-top-left w-[133.33%] h-[133.33%] pointer-events-none">
            <CustomerDisplayView />
          </div>
        </div>
      )}
    </>
  );
};
