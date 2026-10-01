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
  const [showDisplayDetails, setShowDisplayDetails] = useState<boolean>(false);
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
          className="fixed top-24 right-4 z-40 max-w-md bg-amber-950/90 text-amber-100 border-2 border-amber-500/80 rounded-xl shadow-2xl p-3 backdrop-blur-md animate-in fade-in slide-in-from-top-2"
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

      {/* Compact Customer Display header indicator.
          No floating bottom bar: checkout buttons remain fully visible. */}
      <div className="fixed top-[64px] right-4 z-40 hidden md:block">
        <button
          type="button"
          onClick={() => {
            playBeep('click');
            setShowDisplayDetails(prev => !prev);
          }}
          className={`h-8 px-3 rounded-lg border shadow-sm bg-white flex items-center gap-2 text-[11px] font-bold cursor-pointer transition-colors ${
            isWindowOpen
              ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
              : isPhysicalDisplayDetected
                ? 'border-amber-200 text-amber-700 hover:bg-amber-50'
                : 'border-rose-200 text-rose-700 hover:bg-rose-50'
          }`}
          title="Customer Display status and controls"
        >
          <Monitor className="w-3.5 h-3.5" />
          <span>Display 2</span>
          <span
            className={`w-2 h-2 rounded-full ${
              isWindowOpen
                ? 'bg-emerald-500'
                : isPhysicalDisplayDetected
                  ? 'bg-amber-400'
                  : 'bg-rose-500'
            }`}
          />
          <span className="hidden lg:inline">
            {isWindowOpen
              ? 'Connected'
              : isPhysicalDisplayDetected
                ? 'Ready'
                : 'Unavailable'}
          </span>
        </button>
      </div>

      {/* On-demand display details. Only shown when cashier clicks the compact chip. */}
      {showDisplayDetails && (
        <div
          id="customer-display-details-popover"
          className="fixed top-[100px] right-4 z-50 w-[360px] max-w-[calc(100vw-24px)] rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden"
        >
          <div className="px-3 py-2.5 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Monitor className="w-4 h-4 text-sky-300" />
              <div>
                <div className="text-xs font-black">Customer Display</div>
                <div className="text-[10px] text-slate-400">
                  Secondary display controls
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowDisplayDetails(false)}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-3 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                <div className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                  Window
                </div>
                <div className={`text-[11px] font-black mt-1 ${isWindowOpen ? 'text-emerald-700' : 'text-slate-600'}`}>
                  {isWindowOpen ? 'OPEN' : 'CLOSED'}
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                <div className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                  Monitor
                </div>
                <div className={`text-[11px] font-black mt-1 ${isPhysicalDisplayDetected ? 'text-sky-700' : 'text-rose-700'}`}>
                  {isPhysicalDisplayDetected ? 'DETECTED' : 'MISSING'}
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                <div className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                  Bridge
                </div>
                <div className={`text-[11px] font-black mt-1 ${isBridgeConnected ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {isBridgeConnected ? 'ONLINE' : 'OFFLINE'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {!isWindowOpen ? (
                <button
                  type="button"
                  onClick={handleManualOpen}
                  className="h-9 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open Screen
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleRestart}
                  className="h-9 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Restart Display
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  playBeep('click');
                  setShowDockedPreview(prev => !prev);
                }}
                className={`h-9 rounded-lg border text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer ${
                  showDockedPreview
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {showDockedPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {showDockedPreview ? 'Hide Preview' : 'Preview'}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRetry}
                disabled={isRetrying}
                className="h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
                Retry
              </button>

              {onOpenCustomerDisplayModal && (
                <button
                  type="button"
                  onClick={() => {
                    playBeep('click');
                    onOpenCustomerDisplayModal();
                  }}
                  className="h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  Select Display
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Docked Picture-in-Picture Preview Container */}
      {showDockedPreview && (
        <div
          id="customer-display-docked-preview"
          className="fixed bottom-3 right-3 z-40 w-96 max-w-[calc(100vw-24px)] h-64 bg-slate-950 border-2 border-indigo-500/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-3"
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
