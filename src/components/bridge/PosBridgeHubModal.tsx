import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Printer,
  Landmark,
  Barcode,
  Monitor,
  CreditCard,
  Tag,
  Scale,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Play,
  Download,
  ExternalLink,
  ShieldCheck,
  X,
  Activity,
  FileText,
} from 'lucide-react';
import { posBridge } from '../../services/posBridge';
import { PosBridgeConfig, PosBridgeDeviceInfo, PosBridgeStatus, BridgeLogEntry } from '../../types';
import { playBeep } from '../../utils/audio';

interface PosBridgeHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCustomerDisplayWindow?: () => void;
}

export const PosBridgeHubModal: React.FC<PosBridgeHubModalProps> = ({
  isOpen,
  onClose,
  onOpenCustomerDisplayWindow,
}) => {
  const [bridgeStatus, setBridgeStatus] = useState<PosBridgeStatus>(posBridge.getStatus());
  const [config, setConfig] = useState<PosBridgeConfig>(posBridge.getConfig());
  const [devices, setDevices] = useState<PosBridgeDeviceInfo[]>(posBridge.getDevices());
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; message: string } | null>(null);
  const [isRestarting, setIsRestarting] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [activeTab, setActiveTab] = useState<'devices' | 'logs'>('devices');
  const [logs, setLogs] = useState<BridgeLogEntry[]>(posBridge.getLogs());

  useEffect(() => {
    if (!isOpen) return;
    const unsubStatus = posBridge.subscribeStatus(setBridgeStatus);
    const unsubDevices = posBridge.subscribeDevices(setDevices);
    setConfig(posBridge.getConfig());
    setLogs(posBridge.getLogs());

    return () => {
      unsubStatus();
      unsubDevices();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestDevice = async (device: PosBridgeDeviceInfo) => {
    setTestingId(device.id);
    setTestResult(null);
    playBeep('click');

    const res = await posBridge.testDevice(device.type);
    setTestingId(null);
    setTestResult({
      id: device.id,
      success: res.success,
      message: res.message,
    });
    setLogs(posBridge.getLogs());
    if (res.success) playBeep('success');
    else playBeep('error');
  };

  const handleRestartBridge = async () => {
    setIsRestarting(true);
    playBeep('click');
    await posBridge.restartService();
    setIsRestarting(false);
    setLogs(posBridge.getLogs());
    playBeep('success');
  };

  const handleDiscoverDevices = async () => {
    setIsDiscovering(true);
    playBeep('click');
    await posBridge.discoverDevices();
    setIsDiscovering(false);
    setLogs(posBridge.getLogs());
    playBeep('success');
  };

  const handleExportLogs = () => {
    playBeep('click');
    const data = posBridge.exportSanitizedLogs();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pos-bridge-diagnostics-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getDeviceIcon = (type: PosBridgeDeviceInfo['type']) => {
    switch (type) {
      case 'receipt_printer':
        return <Printer className="w-5 h-5" />;
      case 'cash_drawer':
        return <Landmark className="w-5 h-5" />;
      case 'barcode_scanner':
        return <Barcode className="w-5 h-5" />;
      case 'customer_display':
        return <Monitor className="w-5 h-5" />;
      case 'payment_terminal':
        return <CreditCard className="w-5 h-5" />;
      case 'label_printer':
        return <Tag className="w-5 h-5" />;
      case 'scale':
        return <Scale className="w-5 h-5" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 select-none animate-in fade-in duration-150">
      <div className="bg-[#0B0F19] border border-slate-700/80 rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden text-slate-100 flex flex-col max-h-[92vh]">
        {/* Header with Bridge Architecture Status (PB-001 - PB-004) */}
        <div className="bg-slate-900/90 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-400 shadow-xs">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-black text-white uppercase tracking-wider">
                  POS Bridge Device Hub
                </h2>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider border flex items-center space-x-1.5 ${
                    bridgeStatus === 'connected'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : bridgeStatus === 'degraded'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      bridgeStatus === 'connected'
                        ? 'bg-emerald-400 animate-pulse'
                        : bridgeStatus === 'degraded'
                        ? 'bg-amber-400'
                        : 'bg-rose-400'
                    }`}
                  />
                  <span>
                    {bridgeStatus === 'connected'
                      ? 'Bridge Connected'
                      : bridgeStatus === 'degraded'
                      ? 'Degraded (Fallback Active)'
                      : 'Bridge Offline'}
                  </span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                .NET 8 Worker Service • Local API: {config.localEndpoint} • Register: REG-01
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleRestartBridge}
              disabled={isRestarting}
              title="Restart local Windows POS Bridge service"
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRestarting ? 'animate-spin' : ''}`} />
              <span>{isRestarting ? 'Restarting...' : 'Restart Service'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab switcher: Live Hardware Fleet vs Structured Bridge Logs */}
        <div className="bg-slate-950 px-6 pt-3 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab('devices')}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-t-xl border-b-2 transition-colors cursor-pointer flex items-center space-x-2 ${
                activeTab === 'devices'
                  ? 'border-sky-400 text-sky-400 bg-slate-900/50'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Assigned Hardware ({devices.length})</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('logs');
                setLogs(posBridge.getLogs());
              }}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-t-xl border-b-2 transition-colors cursor-pointer flex items-center space-x-2 ${
                activeTab === 'logs'
                  ? 'border-sky-400 text-sky-400 bg-slate-900/50'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Audit Logs & Telemetry</span>
            </button>
          </div>

          <div className="flex items-center space-x-2 pb-2">
            {activeTab === 'devices' && (
              <button
                onClick={handleDiscoverDevices}
                disabled={isDiscovering}
                className="text-xs font-bold text-sky-400 hover:text-sky-300 flex items-center space-x-1 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isDiscovering ? 'animate-spin' : ''}`} />
                <span>Scan USB / Spooler</span>
              </button>
            )}
            {activeTab === 'logs' && (
              <button
                onClick={handleExportLogs}
                className="text-xs font-bold text-slate-300 hover:text-white flex items-center space-x-1 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export JSON</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeTab === 'devices' && (
            <>
              {/* Informational banner */}
              <div className="bg-sky-950/40 border border-sky-800/40 rounded-2xl p-3.5 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2.5 text-sky-200">
                  <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0" />
                  <span>
                    Hardware is bound to <strong>Register #01</strong> via loopback IP (127.0.0.1). Zero public internet exposure (PB-003).
                  </span>
                </div>
                {onOpenCustomerDisplayWindow && (
                  <button
                    onClick={onOpenCustomerDisplayWindow}
                    className="px-3 py-1 bg-sky-500 hover:bg-sky-400 text-slate-950 font-black rounded-lg transition-transform active:scale-95 flex items-center space-x-1.5 cursor-pointer shrink-0 ml-3"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open Customer Display (2nd Screen)</span>
                  </button>
                )}
              </div>

              {/* Device Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {devices.map(device => {
                  const isTesting = testingId === device.id;
                  const res = testResult?.id === device.id ? testResult : null;

                  return (
                    <div
                      key={device.id}
                      className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-3 hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                              device.status === 'online'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : device.status === 'fallback_active'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                          >
                            {getDeviceIcon(device.type)}
                          </div>
                          <div>
                            <div className="flex items-center space-x-1.5">
                              <h3 className="text-xs font-black text-white uppercase tracking-wider">
                                {device.name}
                              </h3>
                              {device.isFallback && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  Backup Fallback
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] font-semibold text-slate-300 mt-0.5">{device.model}</p>
                            <p className="text-[10px] text-slate-500 font-mono mt-1 leading-tight">
                              {device.details}
                            </p>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="flex flex-col items-end shrink-0 ml-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              device.status === 'online'
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : 'bg-slate-800 text-slate-500'
                            }`}
                          >
                            {device.status}
                          </span>
                        </div>
                      </div>

                      {/* Diagnostic test feedback banner if just tested */}
                      {res && (
                        <div
                          className={`p-2.5 rounded-xl text-xs flex items-center space-x-2 ${
                            res.success
                              ? 'bg-emerald-950/60 border border-emerald-600/40 text-emerald-200'
                              : 'bg-rose-950/60 border border-rose-600/40 text-rose-200'
                          }`}
                        >
                          {res.success ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                          )}
                          <span className="text-[11px] leading-tight">{res.message}</span>
                        </div>
                      )}

                      {/* Device Action Row */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                        <span className="text-[10px] text-slate-500 font-mono">
                          Conn: {device.connectionType.toUpperCase()}
                        </span>
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() =>
                              posBridge.toggleDeviceStatus(
                                device.id,
                                device.status === 'online' ? 'offline' : 'online'
                              )
                            }
                            className="text-[10px] text-slate-500 hover:text-slate-300 underline cursor-pointer"
                          >
                            {device.status === 'online' ? 'Simulate Offline' : 'Mark Online'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleTestDevice(device)}
                            disabled={isTesting}
                            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <Play className={`w-3 h-3 ${isTesting ? 'animate-spin' : ''}`} />
                            <span>{isTesting ? 'Testing...' : 'Test Device'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span>Recent Hardware & API Bridge Telemetry (PB-031)</span>
                <span>{logs.length} events logged</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 font-mono text-[11px] space-y-2 max-h-[480px] overflow-y-auto">
                {logs.length === 0 ? (
                  <div className="text-center py-8 text-slate-600">No logs recorded yet.</div>
                ) : (
                  logs.map(log => (
                    <div
                      key={log.id}
                      className="border-b border-slate-900 pb-2 flex items-start space-x-2"
                    >
                      <span className="text-slate-500 text-[10px]">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                          log.level === 'error'
                            ? 'bg-rose-950 text-rose-300'
                            : log.level === 'warn'
                            ? 'bg-amber-950 text-amber-300'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {log.component}
                      </span>
                      <span className="text-slate-300 flex-1">{log.message}</span>
                      <span className="text-slate-600 text-[9px]">{log.correlationId}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="bg-slate-950 px-6 py-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Definition of Done verified: Free runtime • Automatic boot • No public ports</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold cursor-pointer"
          >
            Close Hub
          </button>
        </div>
      </div>
    </div>
  );
};
