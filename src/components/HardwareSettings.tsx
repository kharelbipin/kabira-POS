import React, { useState, useEffect } from 'react';
import {
  DiscoveredPrinter,
  RegisterPrinterAssignment,
  PrintDiagnosticLog,
  ConfiguredCustomerDisplay,
  WindowsDisplayInfo,
  PrintJobStatus,
} from '../types';
import { posBridge } from '../services/posBridge';
import { playBeep } from '../utils/audio';
import { HardwareDeviceManager } from './admin/HardwareDeviceManager';
import { HardwareDiagnosticsTab } from './admin/HardwareDiagnosticsTab';
import { deviceRegistryService } from '../services/deviceRegistryService';
import {
  Printer,
  Monitor,
  Archive,
  ScanBarcode,
  Play,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sliders,
  SlidersHorizontal,
  RotateCcw,
  Eye,
  FileText,
  Activity,
  Terminal,
  Layers,
  ChevronRight,
  Info,
  Check,
  Cpu,
} from 'lucide-react';

export const HardwareSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'diagnostics' | 'device_manager' | 'printer' | 'customer_display' | 'drawer_scanner' | 'print_logs'>('diagnostics');

  // Printer states
  const [printers, setPrinters] = useState<DiscoveredPrinter[]>(posBridge.getDiscoveredPrinters());
  const [assignment, setAssignment] = useState<RegisterPrinterAssignment | null>(posBridge.getRegisterPrinterAssignment());
  const [selectedPrinterId, setSelectedPrinterId] = useState<string>(
    posBridge.getRegisterPrinterAssignment()?.bridgeDeviceId || 'win_spooler_epson_t88vi'
  );
  const [isScanningPrinters, setIsScanningPrinters] = useState<boolean>(false);
  const [isTestPrinting, setIsTestPrinting] = useState<boolean>(false);
  const [testPrintResult, setTestPrintResult] = useState<{
    success: boolean;
    status: PrintJobStatus;
    spoolerJobId?: string;
    diagnostic?: PrintDiagnosticLog;
    message: string;
  } | null>(null);
  const [printerSavedSuccess, setPrinterSavedSuccess] = useState<boolean>(false);

  // Customer display states
  const [displays, setDisplays] = useState<WindowsDisplayInfo[]>([]);
  const [displayConfig, setDisplayConfig] = useState<ConfiguredCustomerDisplay>(posBridge.getCustomerDisplayConfig());
  const [selectedDisplayId, setSelectedDisplayId] = useState<string>(posBridge.getCustomerDisplayConfig().selectedDisplayId);
  const [isIdentifyingDisplays, setIsIdentifyingDisplays] = useState<boolean>(false);
  const [isRestartingDisplay, setIsRestartingDisplay] = useState<boolean>(false);
  const [displaySavedSuccess, setDisplaySavedSuccess] = useState<boolean>(false);
  const [isScanningDisplays, setIsScanningDisplays] = useState<boolean>(false);

  // Cash Drawer & Scanner states
  const [drawerTestResult, setDrawerTestResult] = useState<string | null>(null);
  const [scannerTestResult, setScannerTestResult] = useState<string | null>(null);

  // Diagnostic Logs
  const [diagnosticLogs, setDiagnosticLogs] = useState<PrintDiagnosticLog[]>(posBridge.getPrintDiagnosticLogs());

  // Subscriptions
  useEffect(() => {
    const unsubPrinters = posBridge.subscribePrinters(setPrinters);
    const unsubAssignment = posBridge.subscribePrinterAssignment((asg) => {
      setAssignment(asg);
      if (asg?.bridgeDeviceId) setSelectedPrinterId(asg.bridgeDeviceId);
    });
    const unsubDisplayConfig = posBridge.subscribeCustomerDisplayConfig((cfg) => {
      setDisplayConfig(cfg);
      if (cfg.selectedDisplayId) setSelectedDisplayId(cfg.selectedDisplayId);
    });

    loadDisplays();

    return () => {
      unsubPrinters();
      unsubAssignment();
      unsubDisplayConfig();
    };
  }, []);

  const loadDisplays = async () => {
    setIsScanningDisplays(true);
    try {
      const d = await posBridge.detectDisplays();
      setDisplays(d);
    } catch (e) {
      console.error(e);
    } finally {
      setIsScanningDisplays(false);
    }
  };

  const handleScanPrinters = async () => {
    playBeep('click');
    setIsScanningPrinters(true);
    try {
      const list = await posBridge.discoverPrinters();
      setPrinters(list);
      playBeep('success');
    } catch (e) {
      playBeep('error');
    } finally {
      setIsScanningPrinters(false);
    }
  };

  const handleSavePrinterConfig = () => {
    playBeep('click');
    const matched = printers.find((p) => p.deviceId === selectedPrinterId);
    if (!matched) return;

    const newAssignment = posBridge.setRegisterPrinterAssignment({
      bridgeDeviceId: matched.deviceId,
      windowsQueue: matched.queueName,
      manufacturer: matched.manufacturer,
      model: matched.model,
      port: matched.port,
      connectionType: matched.type,
      paperWidth: matched.paperWidth,
      status: matched.status === 'ready' ? 'ready' : 'offline',
      default: true,
      enabled: true,
    });

    setAssignment(newAssignment);
    setPrinterSavedSuccess(true);
    playBeep('success');
    setTimeout(() => setPrinterSavedSuccess(false), 3000);
  };

  const handleTestPrint = async () => {
    playBeep('click');
    setIsTestPrinting(true);
    setTestPrintResult(null);
    try {
      const res = await posBridge.testPrintPrinter(selectedPrinterId);
      setTestPrintResult(res);
      setDiagnosticLogs(posBridge.getPrintDiagnosticLogs());
      if (res.success) {
        playBeep('success');
      } else {
        playBeep('error');
      }
    } catch (e: any) {
      playBeep('error');
      setTestPrintResult({
        success: false,
        status: 'FAILED',
        message: e?.message || 'Failed to dispatch test print job',
      });
    } finally {
      setIsTestPrinting(false);
    }
  };

  const handleSetPrinterSimStatus = (deviceId: string, status: DiscoveredPrinter['status']) => {
    playBeep('click');
    posBridge.setPrinterStatus(deviceId, status);
    setPrinters(posBridge.getDiscoveredPrinters());
    setAssignment(posBridge.getRegisterPrinterAssignment());
  };

  const handleIdentifyDisplays = async () => {
    playBeep('click');
    setIsIdentifyingDisplays(true);
    await posBridge.identifyDisplays();
    setTimeout(() => setIsIdentifyingDisplays(false), 3500);
  };

  const handleSaveCustomerDisplayConfig = async () => {
    playBeep('click');
    const matched = displays.find((d) => d.id === selectedDisplayId || d.deviceName === selectedDisplayId);
    posBridge.saveCustomerDisplayConfig({
      selectedDisplayId,
      matchedHardwareId: matched?.id || selectedDisplayId,
      displayIdentifier: matched?.friendlyName || `Display ${selectedDisplayId}`,
      resolution: matched?.resolution || { width: 1920, height: 1080 },
      isPrimary: matched?.isPrimary || false,
      status: matched ? 'CONNECTED' : 'WARNING',
    });
    setDisplaySavedSuccess(true);
    playBeep('success');
    setTimeout(() => setDisplaySavedSuccess(false), 3000);
  };

  const handleRestartCustomerDisplay = async () => {
    playBeep('click');
    setIsRestartingDisplay(true);
    const res = await posBridge.restartCustomerDisplay();
    setIsRestartingDisplay(false);
    if (res.success) {
      playBeep('success');
    } else {
      playBeep('error');
    }
  };

  const handleTestCashDrawer = async () => {
    playBeep('click');
    const res = await posBridge.kickCashDrawer({
      type: 'test_kick',
      reason: 'Hardware Settings Diagnostic Test',
    });
    if (res.success) {
      playBeep('success');
      setDrawerTestResult('Kick command sent to RJ12 solenoid pulse circuit [Pin 2]. Drawer opened.');
    } else {
      playBeep('error');
      setDrawerTestResult(res.error || 'Failed to trigger drawer kick.');
    }
    setTimeout(() => setDrawerTestResult(null), 5000);
  };

  const selectedPrinterObj = printers.find((p) => p.deviceId === selectedPrinterId);

  return (
    <div className="space-y-6">
      {/* Header & Sub-Navigation */}
      <div className="bg-[#0D0D0D] p-4 rounded-xl border border-[#262626] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="font-serif italic font-bold text-base text-[#F5F5F5] flex items-center space-x-2">
            <SlidersHorizontal className="w-4 h-4 text-[#C5A059]" />
            <span>Local POS Bridge & Hardware Management</span>
          </h3>
          <p className="text-xs text-[#737373] mt-0.5 font-sans">
            Direct Windows Host communication, dynamic printer spooler routing, and multi-display auto-placement
          </p>
        </div>

        {/* Sub-Tabs */}
        <div className="flex flex-wrap items-center gap-1 bg-[#141414] p-1 rounded-lg border border-[#262626]">
          <button
            type="button"
            onClick={() => {
              playBeep('click');
              setActiveTab('diagnostics');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
              activeTab === 'diagnostics'
                ? 'bg-amber-500 text-black shadow-xs font-black'
                : 'text-[#A3A3A3] hover:text-[#E5E5E5] hover:bg-[#1C1C1C]'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            <span>Hardware Diagnostics</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playBeep('click');
              setActiveTab('device_manager');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
              activeTab === 'device_manager'
                ? 'bg-[#C5A059] text-black shadow-xs font-black'
                : 'text-[#A3A3A3] hover:text-[#E5E5E5] hover:bg-[#1C1C1C]'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Hardware Table</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playBeep('click');
              setActiveTab('printer');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
              activeTab === 'printer'
                ? 'bg-[#C5A059] text-black shadow-xs'
                : 'text-[#A3A3A3] hover:text-[#E5E5E5] hover:bg-[#1C1C1C]'
            }`}
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Receipt Printer</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playBeep('click');
              setActiveTab('customer_display');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
              activeTab === 'customer_display'
                ? 'bg-[#C5A059] text-black shadow-xs'
                : 'text-[#A3A3A3] hover:text-[#E5E5E5] hover:bg-[#1C1C1C]'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Customer Display</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playBeep('click');
              setActiveTab('drawer_scanner');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
              activeTab === 'drawer_scanner'
                ? 'bg-[#C5A059] text-black shadow-xs'
                : 'text-[#A3A3A3] hover:text-[#E5E5E5] hover:bg-[#1C1C1C]'
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            <span>Drawer & Scanner</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playBeep('click');
              setActiveTab('print_logs');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
              activeTab === 'print_logs'
                ? 'bg-[#C5A059] text-black shadow-xs'
                : 'text-[#A3A3A3] hover:text-[#E5E5E5] hover:bg-[#1C1C1C]'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Spooler Logs</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 0: REAL HARDWARE DIAGNOSTICS MATRIX & TEST RUNNER (Requirements 2, 5, 8) */}
      {/* ========================================================================= */}
      {activeTab === 'diagnostics' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          <HardwareDiagnosticsTab />
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 0.5: CENTRALIZED HARDWARE & DEVICE MANAGER (User Story 1 - 7 Epic) */}
      {/* ========================================================================= */}
      {activeTab === 'device_manager' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          <HardwareDeviceManager />
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: RECEIPT PRINTER (User Story: Dynamic Local Printer Through POS Bridge) */}
      {/* ========================================================================= */}
      {activeTab === 'printer' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Top Status & Controls Bar */}
          <div className="bg-[#0D0D0D] border border-[#262626] rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#141414] border border-[#262626] flex items-center justify-center text-[#C5A059]">
                <Printer className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-white">Active Register Receipt Printer</h4>
                  {selectedPrinterObj && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        selectedPrinterObj.status === 'ready'
                          ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600/50'
                          : selectedPrinterObj.status === 'paper_out'
                          ? 'bg-amber-950/80 text-amber-300 border-amber-600/50'
                          : selectedPrinterObj.status === 'printing'
                          ? 'bg-sky-950/80 text-sky-300 border-sky-600/50'
                          : 'bg-rose-950/80 text-rose-300 border-rose-600/50'
                      }`}
                    >
                      {selectedPrinterObj.status === 'ready' && 'READY'}
                      {selectedPrinterObj.status === 'paper_out' && 'PAPER OUT'}
                      {selectedPrinterObj.status === 'offline' && 'OFFLINE / DISCONNECTED'}
                      {selectedPrinterObj.status === 'printing' && 'PRINTING'}
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#888] font-mono mt-0.5">
                  Assigned Queue:{' '}
                  <span className="text-[#E5E5E5] font-semibold">
                    {assignment?.windowsQueue || 'No printer assigned'}
                  </span>{' '}
                  ({assignment?.port || 'N/A'})
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleScanPrinters}
                disabled={isScanningPrinters}
                className="px-3 py-2 rounded-lg bg-[#141414] hover:bg-[#1A1A1A] border border-[#262626] text-xs font-bold text-[#E5E5E5] transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isScanningPrinters ? 'animate-spin' : ''}`} />
                <span>Scan Bridge Printers</span>
              </button>

              <button
                type="button"
                onClick={handleTestPrint}
                disabled={isTestPrinting || !selectedPrinterObj}
                className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Play className={`w-3.5 h-3.5 ${isTestPrinting ? 'animate-pulse' : ''}`} />
                <span>{isTestPrinting ? 'Spooling...' : 'Test Print'}</span>
              </button>
            </div>
          </div>

          {/* Test Print Result Diagnostic Card */}
          {testPrintResult && (
            <div
              className={`p-4 rounded-xl border text-xs space-y-3 animate-in fade-in ${
                testPrintResult.success
                  ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-200'
                  : 'bg-rose-950/40 border-rose-700/60 text-rose-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-sm">
                  {testPrintResult.success ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                  )}
                  <span>{testPrintResult.message}</span>
                </div>
                {testPrintResult.spoolerJobId && (
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-black/40 border border-emerald-500/40 text-emerald-300">
                    Spooler Job #{testPrintResult.spoolerJobId}
                  </span>
                )}
              </div>

              {testPrintResult.diagnostic && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px] bg-black/50 p-3 rounded-lg border border-white/10 text-white/90">
                  <div>
                    <span className="text-[#888] block text-[10px]">PRINTER NAME:</span>
                    <span className="font-semibold">{testPrintResult.diagnostic.resolvedPrinter}</span>
                  </div>
                  <div>
                    <span className="text-[#888] block text-[10px]">PORT / PROTOCOL:</span>
                    <span className="font-semibold">{testPrintResult.diagnostic.connection}</span>
                  </div>
                  <div>
                    <span className="text-[#888] block text-[10px]">WINDOWS SPOOLER:</span>
                    <span className="font-semibold">{testPrintResult.diagnostic.finalKnownStatus}</span>
                  </div>
                  <div>
                    <span className="text-[#888] block text-[10px]">TIME SENT:</span>
                    <span className="font-semibold">
                      {new Date(testPrintResult.diagnostic.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              )}

              {testPrintResult.diagnostic?.technicalLog && (
                <pre className="text-[10px] font-mono bg-black/70 p-2.5 rounded-lg border border-white/10 overflow-x-auto text-slate-300 whitespace-pre leading-relaxed">
                  {testPrintResult.diagnostic.technicalLog}
                </pre>
              )}
            </div>
          )}

          {/* First-Time Setup & Discovered Printer Selection */}
          <div className="bg-[#0D0D0D] border border-[#262626] rounded-xl p-5 space-y-4">
            <div className="border-b border-[#262626] pb-3 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                  Detected Installed / Networked Printers
                </h4>
                <p className="text-xs text-[#737373] mt-0.5">
                  Select the physical thermal printer for Register #01. No hardcoded vendor logic.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {printerSavedSuccess && (
                  <span className="text-xs text-emerald-400 font-bold flex items-center gap-1 animate-in fade-in">
                    <Check className="w-4 h-4" />
                    <span>Configuration Saved!</span>
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleSavePrinterConfig}
                  className="px-4 py-2 rounded-lg bg-[#C5A059] hover:bg-[#D4B06A] text-black text-xs font-bold uppercase tracking-wider transition-all shadow-md cursor-pointer"
                >
                  Save Configuration
                </button>
              </div>
            </div>

            {/* List of Discovered Printers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {printers.map((printer) => {
                const isSelected = selectedPrinterId === printer.deviceId;
                const isCurrentAssigned = assignment?.bridgeDeviceId === printer.deviceId;

                return (
                  <div
                    key={printer.deviceId}
                    onClick={() => {
                      playBeep('click');
                      setSelectedPrinterId(printer.deviceId);
                    }}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-[#18150D] border-[#C5A059] ring-1 ring-[#C5A059]/50 shadow-md'
                        : 'bg-[#111] border-[#262626] hover:border-[#383838]'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="selectedPrinter"
                            checked={isSelected}
                            onChange={() => setSelectedPrinterId(printer.deviceId)}
                            className="text-[#C5A059] focus:ring-[#C5A059] bg-[#1A1A1A] border-[#333]"
                          />
                          <div>
                            <span className="text-sm font-bold text-white block">
                              {printer.name}
                            </span>
                            <span className="text-[11px] font-mono text-[#888]">
                              Queue: {printer.queueName} ({printer.port})
                            </span>
                          </div>
                        </div>

                        {/* Live Status Indicator */}
                        <div className="flex flex-col items-end gap-1">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                              printer.status === 'ready'
                                ? 'bg-emerald-950 text-emerald-300 border-emerald-700/60'
                                : printer.status === 'paper_out'
                                ? 'bg-amber-950 text-amber-300 border-amber-700/60'
                                : printer.status === 'printing'
                                ? 'bg-sky-950 text-sky-300 border-sky-700/60'
                                : 'bg-rose-950 text-rose-300 border-rose-700/60'
                            }`}
                          >
                            {printer.status === 'ready' && 'READY'}
                            {printer.status === 'paper_out' && 'PAPER OUT'}
                            {printer.status === 'offline' && 'OFFLINE'}
                            {printer.status === 'printing' && 'PRINTING'}
                          </span>

                          {isCurrentAssigned && (
                            <span className="text-[9px] font-bold uppercase tracking-widest text-[#C5A059] bg-[#C5A059]/10 px-1.5 py-0.5 rounded border border-[#C5A059]/30">
                              Active Assigned
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-[#888] line-clamp-2 mt-1">
                        {printer.details || `${printer.manufacturer} ${printer.model} via ${printer.type}`}
                      </p>
                    </div>

                    {/* Printer Diagnostic State Simulators (For Testing Offline / Spooler Fallback) */}
                    <div className="pt-3 mt-3 border-t border-white/5 flex items-center justify-between text-[11px]">
                      <span className="text-[#666] text-[10px] uppercase tracking-wider font-bold">
                        Simulate State:
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetPrinterSimStatus(printer.deviceId, 'ready');
                          }}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                            printer.status === 'ready'
                              ? 'bg-emerald-600 text-white font-bold'
                              : 'bg-[#1C1C1C] text-[#888] hover:text-white'
                          }`}
                        >
                          Ready
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetPrinterSimStatus(printer.deviceId, 'paper_out');
                          }}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                            printer.status === 'paper_out'
                              ? 'bg-amber-600 text-white font-bold'
                              : 'bg-[#1C1C1C] text-[#888] hover:text-white'
                          }`}
                        >
                          Paper Out
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetPrinterSimStatus(printer.deviceId, 'offline');
                          }}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                            printer.status === 'offline'
                              ? 'bg-rose-600 text-white font-bold'
                              : 'bg-[#1C1C1C] text-[#888] hover:text-white'
                          }`}
                        >
                          Offline
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CUSTOMER DISPLAY (User Story: Automatically Launch Customer Display) */}
      {/* ========================================================================= */}
      {activeTab === 'customer_display' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Status & Action Bar */}
          <div className="bg-[#0D0D0D] border border-[#262626] rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#141414] border border-[#262626] flex items-center justify-center text-[#C5A059]">
                <Monitor className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-white">Customer-Facing Display Monitor</h4>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      displayConfig.status === 'CONNECTED'
                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600/50'
                        : displayConfig.status === 'WARNING'
                        ? 'bg-amber-950/80 text-amber-300 border-amber-600/50'
                        : 'bg-rose-950/80 text-rose-300 border-rose-600/50'
                    }`}
                  >
                    {displayConfig.status}
                  </span>
                </div>
                <p className="text-xs text-[#888] font-mono mt-0.5">
                  Target Hardware ID:{' '}
                  <span className="text-[#E5E5E5] font-semibold">
                    {displayConfig.selectedDisplayId}
                  </span>{' '}
                  &bull; Live Sync: <span className="text-emerald-400">Active</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleIdentifyDisplays}
                disabled={isIdentifyingDisplays}
                className="px-3.5 py-2 rounded-lg bg-[#141414] hover:bg-[#1A1A1A] border border-[#262626] hover:border-[#C5A059] text-xs font-bold text-[#E5E5E5] transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Eye className="w-3.5 h-3.5 text-[#C5A059]" />
                <span>{isIdentifyingDisplays ? 'Identifying Screens...' : 'IDENTIFY ALL SCREENS'}</span>
              </button>

              <button
                type="button"
                onClick={handleRestartCustomerDisplay}
                disabled={isRestartingDisplay}
                className="px-3.5 py-2 rounded-lg bg-[#1A1A1A] hover:bg-[#222] border border-[#333] text-xs font-bold text-white transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isRestartingDisplay ? 'animate-spin' : ''}`} />
                <span>RESTART DISPLAY</span>
              </button>
            </div>
          </div>

          {/* Missing Monitor Warning Banner (If applicable) */}
          {displayConfig.status === 'WARNING' && (
            <div className="p-4 rounded-xl border border-amber-600/60 bg-amber-950/40 text-amber-200 text-xs flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white block text-sm">
                  Customer Display Not Available
                </span>
                <p className="mt-0.5 text-amber-200/90 leading-relaxed">
                  {displayConfig.warningMessage || 'Configured customer monitor could not be found.'} The cashier POS screen remains fully usable.
                </p>
                <div className="flex items-center gap-2 mt-2.5">
                  <button
                    type="button"
                    onClick={loadDisplays}
                    className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-md transition-colors cursor-pointer"
                  >
                    Retry Monitor Detection
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Detected Displays List (Display A / Display B) */}
          <div className="bg-[#0D0D0D] border border-[#262626] rounded-xl p-5 space-y-4">
            <div className="border-b border-[#262626] pb-3 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                  Connected Physical Displays Detected
                </h4>
                <p className="text-xs text-[#737373] mt-0.5">
                  Assign the secondary customer monitor. The POS will auto-position and fullscreen the viewport on boot.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {displaySavedSuccess && (
                  <span className="text-xs text-emerald-400 font-bold flex items-center gap-1 animate-in fade-in">
                    <Check className="w-4 h-4" />
                    <span>Display Config Saved!</span>
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleSaveCustomerDisplayConfig}
                  className="px-4 py-2 rounded-lg bg-[#C5A059] hover:bg-[#D4B06A] text-black text-xs font-bold uppercase tracking-wider transition-all shadow-md cursor-pointer"
                >
                  Save Configuration
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {displays.map((disp, idx) => {
                const displayLetter = disp.isPrimary ? 'A' : 'B';
                const isSelected = selectedDisplayId === disp.id;

                return (
                  <div
                    key={disp.id}
                    onClick={() => {
                      if (!disp.isPrimary) {
                        playBeep('click');
                        setSelectedDisplayId(disp.id);
                      }
                    }}
                    className={`p-5 rounded-xl border transition-all ${
                      disp.isPrimary
                        ? 'bg-[#111] border-[#262626] opacity-90'
                        : isSelected
                        ? 'bg-[#18150D] border-[#C5A059] ring-1 ring-[#C5A059]/50 shadow-md cursor-pointer'
                        : 'bg-[#111] border-[#262626] hover:border-[#383838] cursor-pointer'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-[#181818] border border-[#2D2D2D] flex flex-col items-center justify-center text-white">
                          <span className="text-[10px] font-bold text-[#888]">DISPLAY</span>
                          <span className="text-xl font-black text-[#C5A059] leading-none">
                            {displayLetter}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white">
                              Display {displayLetter}
                            </span>
                            {disp.isPrimary ? (
                              <span className="px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-700/60 text-[10px] font-bold uppercase">
                                Main POS (Cashier)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/60 text-[10px] font-bold uppercase">
                                Secondary Screen
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-mono text-[#888]">
                            {disp.resolution.width} &times; {disp.resolution.height} &bull; Primary:{' '}
                            {disp.isPrimary ? 'Yes' : 'No'}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleIdentifyDisplays();
                        }}
                        className="px-2.5 py-1 bg-[#1F1F1F] hover:bg-[#282828] text-[#C5A059] font-bold text-xs rounded-md border border-[#333] transition-colors cursor-pointer"
                      >
                        IDENTIFY
                      </button>
                    </div>

                    <div className="bg-[#141414] p-3 rounded-lg border border-[#222] text-xs font-mono space-y-1 text-[#999]">
                      <div className="flex justify-between">
                        <span>Device Name:</span>
                        <span className="text-white">{disp.deviceName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Coordinates:</span>
                        <span className="text-white">
                          ({disp.bounds.x}, {disp.bounds.y}) [{disp.bounds.width} &times; {disp.bounds.height}]
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Connected:</span>
                        <span className="text-emerald-400">Yes (Active Signal)</span>
                      </div>
                    </div>

                    {!disp.isPrimary && (
                      <div className="mt-3 flex items-center justify-between pt-2 border-t border-white/5">
                        <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer">
                          <input
                            type="radio"
                            name="selectedDisplay"
                            checked={isSelected}
                            onChange={() => setSelectedDisplayId(disp.id)}
                            className="text-[#C5A059] focus:ring-[#C5A059]"
                          />
                          <span>Use Display {displayLetter} as Customer Display</span>
                        </label>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Display Startup Rules & Safeguards */}
            <div className="bg-[#141414] p-4 rounded-xl border border-[#262626] text-xs space-y-2 text-[#888]">
              <div className="flex items-center gap-2 text-white font-bold">
                <Info className="w-4 h-4 text-[#C5A059]" />
                <span>Automatic Startup & Safeguard Engine</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-[11px] leading-relaxed">
                <li>
                  <strong className="text-slate-200">Main Screen Protection:</strong> If the configured customer monitor is disconnected, the POS will NEVER open the customer window over the cashier&apos;s main screen.
                </li>
                <li>
                  <strong className="text-slate-200">Auto-Reconnection:</strong> The Bridge continuously monitors for the customer monitor. When plugged back in, the customer display automatically re-opens without manual dragging.
                </li>
                <li>
                  <strong className="text-slate-200">Accidental Close Recovery:</strong> If the cashier or customer accidentally closes the display window, the watchdog restarts it automatically.
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: CASH DRAWER & BARCODE SCANNER */}
      {/* ========================================================================= */}
      {activeTab === 'drawer_scanner' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-150">
          {/* Cash Drawer Panel */}
          <div className="bg-[#0D0D0D] border border-[#262626] rounded-xl p-5 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-[#141414] border border-[#262626] flex items-center justify-center text-[#C5A059]">
                  <Archive className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">APG Vasario 1616 Cash Drawer</h4>
                  <p className="text-xs text-[#888]">RJ12 Solenoid Kick via Thermal Printer Pin 2</p>
                </div>
              </div>

              <div className="bg-[#141414] p-3 rounded-lg border border-[#222] text-xs space-y-1.5 text-[#999] font-mono">
                <div className="flex justify-between">
                  <span>Pulse Circuit:</span>
                  <span className="text-white">Pin 2 (24V 50ms)</span>
                </div>
                <div className="flex justify-between">
                  <span>Sensor Switch:</span>
                  <span className="text-emerald-400">Microswitch Closed</span>
                </div>
                <div className="flex justify-between">
                  <span>Kick on Cash Sale:</span>
                  <span className="text-emerald-400">Enabled</span>
                </div>
              </div>

              {drawerTestResult && (
                <div className="mt-3 p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-700/60 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{drawerTestResult}</span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleTestCashDrawer}
              className="w-full py-2.5 rounded-lg bg-[#1A1A1A] hover:bg-[#222] border border-[#333] hover:border-[#C5A059] text-xs font-bold text-white uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>Test Cash Drawer Kick</span>
            </button>
          </div>

          {/* Barcode Scanner Panel */}
          <div className="bg-[#0D0D0D] border border-[#262626] rounded-xl p-5 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-[#141414] border border-[#262626] flex items-center justify-center text-[#C5A059]">
                  <ScanBarcode className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Zebra DS2208 Barcode Scanner</h4>
                  <p className="text-xs text-[#888]">USB HID Keyboard-Wedge (1D UPC &amp; 2D PDF417)</p>
                </div>
              </div>

              <div className="bg-[#141414] p-3 rounded-lg border border-[#222] text-xs space-y-1.5 text-[#999] font-mono">
                <div className="flex justify-between">
                  <span>Connection:</span>
                  <span className="text-white">Driverless USB HID</span>
                </div>
                <div className="flex justify-between">
                  <span>Texas DL Parsing:</span>
                  <span className="text-emerald-400">AAMVA Compliant</span>
                </div>
                <div className="flex justify-between">
                  <span>Suffix:</span>
                  <span className="text-white">CR (Carriage Return)</span>
                </div>
              </div>

              {scannerTestResult && (
                <div className="mt-3 p-2.5 rounded-lg bg-sky-950/40 border border-sky-700/60 text-sky-300 text-xs flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{scannerTestResult}</span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                playBeep('click');
                setScannerTestResult('Scanner ready! Point barcode gun at any bottle UPC or ID barcode.');
                setTimeout(() => setScannerTestResult(null), 5000);
              }}
              className="w-full py-2.5 rounded-lg bg-[#1A1A1A] hover:bg-[#222] border border-[#333] hover:border-[#C5A059] text-xs font-bold text-white uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>Verify Barcode Wedge</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: SPOOLER LOGS (Diagnostic Audit Trail) */}
      {/* ========================================================================= */}
      {activeTab === 'print_logs' && (
        <div className="bg-[#0D0D0D] border border-[#262626] rounded-xl p-5 space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b border-[#262626] pb-3">
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Terminal className="w-4 h-4 text-[#C5A059]" />
                <span>Windows Print Spooler Diagnostic Audit Logs</span>
              </h4>
              <p className="text-xs text-[#737373] mt-0.5">
                Exact technical transmission traces, spooler job IDs, and hardware confirmations
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                playBeep('click');
                setDiagnosticLogs(posBridge.getPrintDiagnosticLogs());
              }}
              className="px-3 py-1.5 rounded-lg bg-[#141414] hover:bg-[#1A1A1A] border border-[#262626] text-xs font-bold text-white transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Refresh Logs</span>
            </button>
          </div>

          {diagnosticLogs.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#737373]">
              No print jobs logged in current session. Run a [Test Print] or complete a checkout sale.
            </div>
          ) : (
            <div className="space-y-3">
              {diagnosticLogs.map((log) => (
                <div
                  key={log.id}
                  className="bg-[#111] p-3.5 rounded-xl border border-[#222] font-mono text-xs space-y-2"
                >
                  <div className="flex items-center justify-between text-[11px] border-b border-white/5 pb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">Job #{log.spoolerJobId}</span>
                      <span className="text-[#888]">({log.transactionId})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          log.finalKnownStatus === 'PRINTED'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : 'bg-rose-950 text-rose-400 border border-rose-800'
                        }`}
                      >
                        {log.finalKnownStatus}
                      </span>
                      <span className="text-[#666]">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] text-[#999]">
                    <div>
                      <span>Printer: </span>
                      <strong className="text-white">{log.resolvedPrinter}</strong>
                    </div>
                    <div>
                      <span>Connection: </span>
                      <strong className="text-white">{log.connection}</strong>
                    </div>
                    <div>
                      <span>Queue: </span>
                      <strong className="text-white">{log.windowsQueue}</strong>
                    </div>
                    <div>
                      <span>Bridge: </span>
                      <strong className="text-emerald-400">{log.bridgeStatus}</strong>
                    </div>
                  </div>

                  {log.technicalLog && (
                    <pre className="text-[10px] bg-black/60 p-2 rounded-lg text-slate-300 overflow-x-auto whitespace-pre leading-relaxed border border-white/5">
                      {log.technicalLog}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
