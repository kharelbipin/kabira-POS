import React, { useState, useEffect, useCallback } from 'react';
import { webview2Bridge } from '../../services/webview2Bridge';
import { StartupHealthCheckResult } from '../../types';
import { playBeep } from '../../utils/audio';
import {
  Activity,
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
  const [health, setHealth] = useState<StartupHealthCheckResult | null>(null);
  const [checking, setChecking] = useState<boolean>(true);
  const [retrySeconds, setRetrySeconds] = useState<number>(0);
  const [hasProceeded, setHasProceeded] = useState<boolean>(false);

  const runHealthCheck = useCallback(async () => {
    setChecking(true);
    try {
      const res = await webview2Bridge.checkStartupHealth();
      setHealth(res);
      setChecking(false);

      if (res.allOk) {
        playBeep('success');
        if (autoProceedIfHealthy && !hasProceeded) {
          // Auto-continue to register after 1.2s smooth animation
          setTimeout(() => {
            setHasProceeded(true);
            onProceed();
          }, 1200);
        }
      } else {
        playBeep('error');
        // Countdown to automatic retry (WV-008)
        setRetrySeconds(5);
      }
    } catch (e) {
      console.error('Health check failed:', e);
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
      setRetrySeconds(prev => {
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

  const checks = health?.checks;

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
              v3.4.0 (WebView2)
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
                ) : checks?.internet.status === 'ok' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                )}
              </div>
              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                {checking ? 'Testing network gateway...' : checks?.internet.message}
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
                ) : checks?.backend.status === 'ok' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-500" />
                )}
              </div>
              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                {checking ? 'Connecting to /api/health...' : checks?.backend.message}
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
                ) : checks?.bridge.status === 'ok' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                )}
              </div>
              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                {checking ? 'Testing 127.0.0.1:5055 service...' : checks?.bridge.message}
              </p>
            </div>
          </div>

          {/* Dual Displays */}
          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex items-start gap-3">
            <div className="p-2 rounded-xl bg-emerald-950/60 border border-emerald-800/50 text-emerald-400 mt-0.5">
              <Monitor className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">Dual Monitor System</span>
                {checking ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-400" />
                ) : checks?.display2.status === 'ok' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                )}
              </div>
              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                {checking ? 'Scanning Windows display layout...' : `${checks?.display1.name} & ${checks?.display2.name}`}
              </p>
            </div>
          </div>
        </div>

        {/* Footer & Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800/80">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            {retrySeconds > 0 ? (
              <span className="text-amber-400 font-semibold flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Reconnecting automatically in {retrySeconds}s...
              </span>
            ) : checking ? (
              <span className="flex items-center gap-1.5 text-slate-400">
                <Activity className="w-3.5 h-3.5 animate-pulse text-[#C5A059]" />
                Initializing system components...
              </span>
            ) : (
              <span className="text-emerald-400 font-medium flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Environment validated and secure.
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={runHealthCheck}
              disabled={checking}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
              <span>Retry Checks</span>
            </button>

            <button
              onClick={() => {
                playBeep('click');
                onProceed();
              }}
              className="px-5 py-2 rounded-xl bg-[#C5A059] hover:bg-[#B38F46] text-black text-xs font-extrabold uppercase tracking-wider flex items-center gap-2 transition-transform active:scale-95 cursor-pointer shadow-lg shadow-[#C5A059]/20"
            >
              <span>Launch POS Register</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
