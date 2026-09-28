import React, { useState, useEffect, useCallback } from 'react';
import { hardwareStore } from '../../hardware/HardwareStore';
import { bridgeClient } from '../../hardware/BridgeClient';
import { playBeep } from '../../utils/audio';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Wifi,
  Server,
  Monitor,
  Cpu,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

interface StartupHealthModalProps {
  isOpen: boolean;
  onProceed: () => void;
  autoProceedIfHealthy?: boolean;
}

export const StartupHealthModal: React.FC<StartupHealthModalProps> = ({
  isOpen,
  onProceed,
  autoProceedIfHealthy = true,
}) => {
  const [checking, setChecking] = useState<boolean>(true);
  const [retrySeconds, setRetrySeconds] = useState<number>(0);
  const [hasProceeded, setHasProceeded] = useState<boolean>(false);

  const [checks, setChecks] = useState<{
    internet: { status: 'ok' | 'warn' | 'error'; message: string };
    backend: { status: 'ok' | 'warn' | 'error'; message: string };
    bridge: { status: 'ok' | 'warn' | 'error'; message: string };
    display: { status: 'ok' | 'warn' | 'error'; message: string };
    allOk: boolean;
  }>({
    internet: { status: 'ok', message: 'Verifying...' },
    backend: { status: 'ok', message: 'Verifying...' },
    bridge: { status: 'ok', message: 'Verifying...' },
    display: { status: 'ok', message: 'Verifying...' },
    allOk: false,
  });

  const runHealthCheck = useCallback(async () => {
    setChecking(true);
    try {
      // 1. Internet Check
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      const internetStatus = isOnline ? 'ok' : 'warn';
      const internetMsg = isOnline ? 'Connected to local/cloud network' : 'Operating in offline mode';

      // 2. Backend Server Check
      let backendStatus: 'ok' | 'error' = 'ok';
      let backendMsg = 'Express POS backend active';
      try {
        const res = await fetch('/api/products?limit=1');
        if (!res.ok && res.status >= 500) {
          backendStatus = 'error';
          backendMsg = `Backend returned HTTP ${res.status}`;
        }
      } catch {
        backendStatus = 'error';
        backendMsg = 'Cannot reach backend server';
      }

      // 3. Hardware Bridge Check (Port 5055)
      const bridgeHealth = await hardwareStore.refreshHealth();
      const bridgeStatus = bridgeHealth.status === 'running' ? 'ok' : 'warn';
      const bridgeMsg =
        bridgeHealth.status === 'running'
          ? `Bridge v${bridgeHealth.version} running (Port ${bridgeHealth.port})`
          : 'Bridge service offline at 127.0.0.1:5055';

      // 4. Secondary Display Check
      const displaysRes = await bridgeClient.getDisplays();
      const displayStatus = displaysRes.displays.length > 1 ? 'ok' : 'ok';
      const displayMsg =
        displaysRes.displays.length > 1
          ? `Dual monitors detected (${displaysRes.displays.length} screens)`
          : 'Single monitor (Browser customer window available)';

      const allOk = backendStatus === 'ok';

      setChecks({
        internet: { status: internetStatus, message: internetMsg },
        backend: { status: backendStatus, message: backendMsg },
        bridge: { status: bridgeStatus, message: bridgeMsg },
        display: { status: displayStatus, message: displayMsg },
        allOk,
      });

      setChecking(false);

      if (allOk) {
        playBeep('success');
        if (autoProceedIfHealthy && !hasProceeded) {
          setTimeout(() => {
            setHasProceeded(true);
            onProceed();
          }, 1200);
        }
      } else {
        playBeep('error');
        setRetrySeconds(5);
      }
    } catch (e) {
      console.error('Startup health check failed:', e);
      setChecking(false);
      setRetrySeconds(5);
    }
  }, [autoProceedIfHealthy, hasProceeded, onProceed]);

  useEffect(() => {
    if (!isOpen) return;
    runHealthCheck();
  }, [isOpen, runHealthCheck]);

  // Auto-retry countdown timer
  useEffect(() => {
    if (retrySeconds <= 0) return;
    const timer = window.setInterval(() => {
      setRetrySeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          runHealthCheck();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [retrySeconds, runHealthCheck]);

  if (!isOpen) return null;

  return (
    <div
      id="startup-health-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#07090E] p-4 font-sans text-white select-none"
    >
      <div className="w-full max-w-2xl bg-[#0D111A] border border-slate-800 rounded-3xl shadow-2xl p-8 flex flex-col space-y-6">
        {/* Brand Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#C5A059] to-[#8C6D2C] flex items-center justify-center shadow-lg shadow-[#C5A059]/20 text-black font-black text-xl">
              377
            </div>
            <div>
              <div className="text-xs font-bold text-[#C5A059] tracking-widest uppercase">
                Windows POS Host Initialization
              </div>
              <h1 className="text-xl font-bold tracking-tight text-white">
                377 Spirits POS — Starting...
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1 rounded-full">
              KaBiRa POS
            </span>
          </div>
        </div>

        {/* Verification Subtitle */}
        <p className="text-xs text-slate-400 leading-relaxed">
          Verifying hardware devices, local POS Bridge, network connectivity, and secondary customer monitor before unlocking the Cashier Register.
        </p>

        {/* Diagnostic Checks Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Internet */}
          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex items-start gap-3">
            <div className="p-2 rounded-xl bg-blue-950/60 border border-blue-800/50 text-blue-400 mt-0.5">
              <Wifi className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">Internet Connection</span>
                {checking ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-400" />
                ) : checks.internet.status === 'ok' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                )}
              </div>
              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                {checking ? 'Testing network gateway...' : checks.internet.message}
              </p>
            </div>
          </div>

          {/* POS Backend */}
          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-950/60 border border-amber-800/50 text-amber-400 mt-0.5">
              <Server className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">POS Backend Server</span>
                {checking ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-400" />
                ) : checks.backend.status === 'ok' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-500" />
                )}
              </div>
              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                {checking ? 'Connecting to /api/health...' : checks.backend.message}
              </p>
            </div>
          </div>

          {/* POS Bridge Service */}
          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex items-start gap-3">
            <div className="p-2 rounded-xl bg-purple-950/60 border border-purple-800/50 text-purple-400 mt-0.5">
              <Cpu className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">POS Hardware Bridge</span>
                {checking ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-400" />
                ) : checks.bridge.status === 'ok' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                )}
              </div>
              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                {checking ? 'Checking port 5055...' : checks.bridge.message}
              </p>
            </div>
          </div>

          {/* Displays */}
          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex items-start gap-3">
            <div className="p-2 rounded-xl bg-emerald-950/60 border border-emerald-800/50 text-emerald-400 mt-0.5">
              <Monitor className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">Customer Display</span>
                {checking ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-400" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                )}
              </div>
              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                {checking ? 'Enumerating displays...' : checks.display.message}
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            {retrySeconds > 0 ? (
              <span className="text-amber-400 flex items-center gap-1.5 font-mono">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Auto-retrying in {retrySeconds}s...
              </span>
            ) : checking ? (
              <span className="flex items-center gap-1.5 font-mono">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#C5A059]" />
                Verifying system peripherals...
              </span>
            ) : checks.allOk ? (
              <span className="text-emerald-400 flex items-center gap-1.5 font-semibold">
                <ShieldCheck className="w-4 h-4" />
                All startup diagnostics passed.
              </span>
            ) : (
              <span className="text-amber-400 font-semibold">
                Startup check warning. You may retry or proceed.
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={runHealthCheck}
              disabled={checking}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              Re-run Check
            </button>
            <button
              type="button"
              onClick={() => {
                playBeep('success');
                onProceed();
              }}
              className="px-6 py-2 rounded-xl bg-[#C5A059] hover:bg-[#B38F48] text-black text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-[#C5A059]/20"
            >
              <span>Enter Register</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
