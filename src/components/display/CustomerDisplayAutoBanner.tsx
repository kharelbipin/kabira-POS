import React, { useState, useEffect } from 'react';
import { hardwareStore } from '../../hardware/HardwareStore';
import { playBeep } from '../../utils/audio';
import { CustomerDisplayView } from './CustomerDisplayView';
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
  CheckCircle2,
} from 'lucide-react';

interface CustomerDisplayAutoBannerProps {
  onOpenCustomerDisplayModal?: () => void;
}

export const CustomerDisplayAutoBanner: React.FC<CustomerDisplayAutoBannerProps> = ({
  onOpenCustomerDisplayModal,
}) => {
  const [isWindowOpen, setIsWindowOpen] = useState<boolean>(
    hardwareStore.isCustomerDisplayWindowOpen()
  );
  const [health, setHealth] = useState(hardwareStore.getHealth());
  const [configuredHardware, setConfiguredHardware] = useState(
    hardwareStore.getConfiguredHardware()
  );
  const [discoveredDevices, setDiscoveredDevices] = useState(
    hardwareStore.getDiscoveredDevices()
  );
  const [showDockedPreview, setShowDockedPreview] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(
    hardwareStore.isCustomerDisplayWarningDismissed()
  );
  const [isRetrying, setIsRetrying] = useState<boolean>(false);

  // Distinct hardware states (Requirement 8)
  // Customer window: OPEN / CLOSED
  // Physical display: DETECTED / NOT DETECTED
  // Bridge: CONNECTED / OFFLINE
  const isBridgeConnected = health.status === 'running';
  const physicalDisplays = (discoveredDevices || []).filter(
    (d) => d.category === 'customer_display'
  );
  const isPhysicalDisplayDetected =
    physicalDisplays.length > 0 || Boolean(configuredHardware.customer_display.deviceId);

  useEffect(() => {
    // Subscribe to HardwareStore changes.
    const unsub = hardwareStore.subscribe(() => {
      setHealth(hardwareStore.getHealth());
      setConfiguredHardware(hardwareStore.getConfiguredHardware());
      setDiscoveredDevices(hardwareStore.getDiscoveredDevices());
      setIsDismissed(hardwareStore.isCustomerDisplayWarningDismissed());
    });

    let cancelled = false;

    // The customer display is now launched by the local Windows backend.
    // We cannot use window.open/window.closed to track that external Edge window.
    const openInitialDisplay = async () => {
      const result = await hardwareStore.openCustomerDisplayWindow(true);
      if (!cancelled) {
        setIsWindowOpen(result.success);
      }
    };

    void openInitialDisplay();

    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  const handleManualOpen = async () => {
    playBeep('click');

    const res = await hardwareStore.openCustomerDisplayWindow(false);
    setIsWindowOpen(res.success);

    if (res.success) {
      playBeep('success');
      return;
    }

    if (onOpenCustomerDisplayModal) {
      onOpenCustomerDisplayModal();
    } else {
      alert(res.message || 'Customer display could not be opened.');
    }
  };

  const handleRetry = async () => {
    playBeep('click');
    setIsRetrying(true);

    try {
      await hardwareStore.scanHardware();
      const res = await hardwareStore.openCustomerDisplayWindow(false);
      setIsWindowOpen(res.success);

      if (res.success) {
        playBeep('success');
      }
    } catch {
      setIsWindowOpen(false);
    } finally {
      setIsRetrying(false);
    }
  };

  const handleRestart = async () => {
    playBeep('click');

    const res = await hardwareStore.restartCustomerDisplay();
    setIsWindowOpen(res.success);

    if (res.success) {
      playBeep('success');
    }
  };

  const handleDismissWarning = () => {
    playBeep('click');
    hardwareStore.dismissCustomerDisplayWarning();
    setIsDismissed(true);
  };

  // If dismissed or window is already open, do not render warning banner
  const showWarningBanner =
    !isDismissed &&
    !isWindowOpen &&
    isBridgeConnected &&
    !isPhysicalDisplayDetected;

  return (
    <>
      {/* Dismissible Warning Banner (Requirement 8: Never continuously recreated after dismissal) */}
      {showWarningBanner && (
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
                Secondary physical monitor was not detected by Windows graphics subsystem. You can open a browser customer window or use docked preview.
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
                  onClick={handleDismissWarning}
                  className="ml-auto text-amber-300 hover:text-white text-xs p-1 cursor-pointer"
                  title="Dismiss warning"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Bottom Status Pill with 3 distinct hardware states */}
      <div
        id="customer-display-auto-pill"
        className="fixed bottom-3 right-3 z-40 flex items-center gap-2 bg-slate-900/95 text-white backdrop-blur-md px-3 py-2 rounded-2xl shadow-xl border border-slate-700/80 text-xs animate-in fade-in slide-in-from-bottom-2"
      >
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            {isWindowOpen ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </>
            ) : isPhysicalDisplayDetected ? (
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400 animate-pulse" />
            ) : (
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
            )}
          </span>

          <Monitor className="w-4 h-4 text-slate-300" />
          <span className="font-semibold text-slate-200 hidden sm:inline">
            Customer Display:
          </span>

          {/* Three Truthful Hardware States */}
          <div className="flex items-center space-x-1 font-mono text-[11px]">
            <span
              className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                isWindowOpen ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-slate-800 text-slate-400'
              }`}
            >
              WINDOW: {isWindowOpen ? 'OPEN' : 'CLOSED'}
            </span>
            <span
              className={`font-bold px-1.5 py-0.5 rounded text-[10px] hidden md:inline ${
                isPhysicalDisplayDetected ? 'bg-sky-950 text-sky-300 border border-sky-800' : 'bg-slate-800 text-slate-400'
              }`}
            >
              MONITOR: {isPhysicalDisplayDetected ? 'DETECTED' : 'NOT DETECTED'}
            </span>
            <span
              className={`font-bold px-1.5 py-0.5 rounded text-[10px] hidden lg:inline ${
                isBridgeConnected ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'
              }`}
            >
              BRIDGE: {isBridgeConnected ? 'CONNECTED' : 'OFFLINE'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 pl-1 border-l border-slate-700">
          {!isWindowOpen ? (
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
            {showDockedPreview ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            <span className="hidden sm:inline">Preview</span>
          </button>
        </div>
      </div>

      {/* Docked Picture-in-Picture Preview Container */}
      {showDockedPreview && (
        <div
          id="customer-display-docked-preview"
          className="fixed bottom-14 right-3 z-40 w-96 max-w-[calc(100vw-24px)] h-64 bg-slate-950 border-2 border-indigo-500/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-3"
        >
          <div className="px-3 py-1.5 bg-indigo-950/80 border-b border-indigo-500/30 flex items-center justify-between text-xs text-indigo-200">
            <span className="font-bold flex items-center gap-1.5">
              <Monitor className="w-3.5 h-3.5 text-indigo-400" />
              Live Secondary Monitor Docked Preview
            </span>
            <button
              type="button"
              onClick={() => setShowDockedPreview(false)}
              className="text-slate-400 hover:text-white p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex-1 overflow-auto bg-slate-900 scale-90 origin-top-left w-[111%] h-[111%] pointer-events-auto">
            <CustomerDisplayView />
          </div>
        </div>
      )}
    </>
  );
};
