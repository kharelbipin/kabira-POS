import React from 'react';
import {
  Printer,
  Archive,
  ScanBarcode,
  Monitor,
  Scale,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Activity,
  HardDrive,
  Wifi,
  Radio,
  Cpu,
  RefreshCw,
  Terminal,
  ExternalLink,
  ShieldAlert,
  HelpCircle,
} from 'lucide-react';
import { DeviceState } from '../../services/deviceState';

interface DeviceHealthStatusCardProps {
  deviceState: DeviceState;
  onTestDevice?: (device: DeviceState) => void;
  onConfigureDevice?: (device: DeviceState) => void;
  onProbeDevice?: (device: DeviceState) => void;
  isTesting?: boolean;
}

export const DeviceHealthStatusCard: React.FC<DeviceHealthStatusCardProps> = ({
  deviceState,
  onTestDevice,
  onConfigureDevice,
  onProbeDevice,
  isTesting = false,
}) => {
  const theme = deviceState.statusTheme;

  const getDeviceIcon = (cat: string) => {
    switch (cat) {
      case 'receipt_printer':
        return <Printer className="w-5 h-5 text-amber-400" />;
      case 'barcode_scanner':
        return <ScanBarcode className="w-5 h-5 text-sky-400" />;
      case 'cash_drawer':
        return <Archive className="w-5 h-5 text-emerald-400" />;
      case 'customer_display':
        return <Monitor className="w-5 h-5 text-purple-400" />;
      case 'scale':
        return <Scale className="w-5 h-5 text-amber-300" />;
      case 'card_terminal':
        return <CreditCard className="w-5 h-5 text-blue-400" />;
      default:
        return <Activity className="w-5 h-5 text-slate-400" />;
    }
  };

  return (
    <div
      className={`rounded-2xl border ${theme.border} ${theme.bg} p-5 shadow-xl flex flex-col justify-between transition-all hover:border-slate-600 space-y-4`}
    >
      {/* Top Header: Category & Health Status Badge */}
      <div className="flex items-start justify-between gap-3 border-b border-white/5 pb-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-black/50 border border-white/10 flex items-center justify-center shrink-0 shadow-inner">
            {getDeviceIcon(deviceState.category)}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-mono tracking-wider uppercase text-slate-400 font-bold">
                {deviceState.categoryLabel}
              </span>
            </div>
            <h3 className="text-sm font-bold text-white tracking-tight line-clamp-1">
              {deviceState.name}
            </h3>
          </div>
        </div>

        <div className="flex flex-col items-end shrink-0">
          <span
            className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border flex items-center space-x-1.5 ${theme.badgeBg} ${theme.badgeText} ${theme.badgeBorder}`}
          >
            <span className={`w-2 h-2 rounded-full ${theme.dotColor} ${deviceState.healthLevel === 'HEALTHY' ? 'animate-pulse' : ''}`} />
            <span>{deviceState.healthBadgeText}</span>
          </span>
          <span className="text-[9px] font-mono text-slate-500 mt-1">
            {deviceState.connectionType} &bull; {deviceState.portOrEndpoint}
          </span>
        </div>
      </div>

      {/* 4 CORE TELEMETRY INDICATORS SPECIFIED BY USER:
          1. IsConfigured
          2. IsWindowsDetected
          3. IsNetworkReachable
          4. IsResponding
      */}
      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
        {/* 1. IsConfigured */}
        <div className="bg-black/40 border border-white/5 rounded-xl p-2.5 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Cpu className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-slate-300 text-[11px]">IsConfigured</span>
          </div>
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
              deviceState.isConfigured
                ? 'bg-emerald-950 text-emerald-300 border-emerald-700/60'
                : 'bg-slate-900 text-slate-400 border-slate-700'
            }`}
          >
            {deviceState.isConfigured ? 'YES' : 'NO'}
          </span>
        </div>

        {/* 2. IsWindowsDetected */}
        <div className="bg-black/40 border border-white/5 rounded-xl p-2.5 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <HardDrive className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-slate-300 text-[11px]">IsWindowsDetected</span>
          </div>
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
              deviceState.isWindowsDetected
                ? 'bg-emerald-950 text-emerald-300 border-emerald-700/60'
                : 'bg-rose-950 text-rose-300 border-rose-700/60'
            }`}
          >
            {deviceState.isWindowsDetected ? 'YES' : 'NO'}
          </span>
        </div>

        {/* 3. IsNetworkReachable */}
        <div className="bg-black/40 border border-white/5 rounded-xl p-2.5 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Wifi className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-slate-300 text-[11px]">IsNetworkReachable</span>
          </div>
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
              deviceState.isNetworkReachable
                ? 'bg-emerald-950 text-emerald-300 border-emerald-700/60'
                : 'bg-slate-900 text-slate-400 border-slate-700'
            }`}
          >
            {deviceState.isNetworkReachable ? 'YES' : 'NO'}
          </span>
        </div>

        {/* 4. IsResponding */}
        <div className="bg-black/40 border border-white/5 rounded-xl p-2.5 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-slate-300 text-[11px]">IsResponding</span>
          </div>
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
              deviceState.isResponding
                ? 'bg-emerald-950 text-emerald-300 border-emerald-700/60'
                : 'bg-amber-950 text-amber-300 border-amber-700/60'
            }`}
          >
            {deviceState.isResponding ? 'YES' : 'NO'}
          </span>
        </div>
      </div>

      {/* Layer Analysis Diagnostic Text */}
      <div className="bg-black/60 border border-white/10 rounded-xl p-3 text-[11px] font-mono space-y-1">
        <div className="flex items-center justify-between text-slate-400 border-b border-white/5 pb-1">
          <span className="text-[10px] uppercase font-bold text-slate-500">Bridge Telemetry Trace</span>
          {deviceState.telemetry.latencyMs !== undefined && (
            <span className="text-slate-300">{deviceState.telemetry.latencyMs}ms latency</span>
          )}
        </div>
        <p className="text-slate-300 leading-relaxed font-sans pt-0.5">
          {deviceState.diagnosticExplanation}
        </p>
        {deviceState.errorCode && (
          <div className="text-[10px] text-amber-400/90 font-mono flex items-center space-x-1 pt-0.5">
            <AlertTriangle className="w-3 h-3 shrink-0" />
            <span>Code: {deviceState.errorCode}</span>
          </div>
        )}
      </div>

      {/* Additional Bridge Telemetry Metadata Tags */}
      <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono text-slate-400">
        {deviceState.telemetry.driverStatus && (
          <span className="bg-slate-900/80 px-2 py-0.5 rounded border border-white/5">
            Driver: {deviceState.telemetry.driverStatus}
          </span>
        )}
        {deviceState.telemetry.displayResolution && (
          <span className="bg-slate-900/80 px-2 py-0.5 rounded border border-white/5">
            Res: {deviceState.telemetry.displayResolution}
          </span>
        )}
        {deviceState.telemetry.vendorProtocol && (
          <span className="bg-slate-900/80 px-2 py-0.5 rounded border border-white/5">
            Pulse: {deviceState.telemetry.vendorProtocol}
          </span>
        )}
        {deviceState.telemetry.paperStatus && (
          <span className="bg-slate-900/80 px-2 py-0.5 rounded border border-white/5 text-emerald-400">
            {deviceState.telemetry.paperStatus}
          </span>
        )}
        <span className="bg-slate-900/80 px-2 py-0.5 rounded border border-white/5 ml-auto text-slate-500">
          Heartbeat: {deviceState.telemetry.heartbeatAge || 'Live'}
        </span>
      </div>

      {/* Card Action Toolbar */}
      <div className="flex items-center justify-between pt-2 border-t border-white/5">
        <div className="flex items-center space-x-2">
          {onTestDevice && (
            <button
              type="button"
              onClick={() => onTestDevice(deviceState)}
              disabled={isTesting}
              className="px-3 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 font-bold text-[11px] uppercase tracking-wider border border-sky-500/40 flex items-center space-x-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isTesting ? 'animate-spin' : ''}`} />
              <span>{isTesting ? 'Testing...' : 'Test Device'}</span>
            </button>
          )}

          {onProbeDevice && (
            <button
              type="button"
              onClick={() => onProbeDevice(deviceState)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[11px] uppercase tracking-wider border border-slate-700 flex items-center space-x-1 transition-colors cursor-pointer"
            >
              <span>Probe</span>
            </button>
          )}
        </div>

        {onConfigureDevice && (
          <button
            type="button"
            onClick={() => onConfigureDevice(deviceState)}
            className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-[11px] uppercase tracking-wider border border-amber-500/40 flex items-center space-x-1 transition-colors cursor-pointer"
          >
            <span>Configure</span>
          </button>
        )}
      </div>
    </div>
  );
};
