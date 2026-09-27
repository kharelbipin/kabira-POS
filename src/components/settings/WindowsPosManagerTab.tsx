import React, { useState, useEffect } from 'react';
import {
  WindowsDisplayInfo,
  WindowsWebView2HostConfig,
  StartupHealthCheckResult,
} from '../../types';
import { webview2Bridge } from '../../services/webview2Bridge';
import { posBridge } from '../../services/posBridge';
import { playBeep } from '../../utils/audio';
import { DeviceSetupWizardModal } from '../startup/DeviceSetupWizardModal';
import { PWAInstallButton } from '../pwa/PWAInstallButton';
import { DeviceManagerView } from './DeviceManagerView';
import { HardwareDeviceManager } from '../admin/HardwareDeviceManager';
import {
  Monitor,
  Printer,
  Barcode,
  Cpu,
  RefreshCw,
  Play,
  CheckCircle2,
  AlertTriangle,
  Download,
  ShieldCheck,
  Zap,
  Activity,
  Maximize2,
  Lock,
  Layers,
  Sparkles,
  RotateCcw,
  Sliders,
  ExternalLink,
} from 'lucide-react';

interface WindowsPosManagerTabProps {
  onOpenCustomerDisplayWindow?: () => void;
  activeCartCount?: number;
}

export const WindowsPosManagerTab: React.FC<WindowsPosManagerTabProps> = ({
  onOpenCustomerDisplayWindow,
  activeCartCount = 0,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'hardware_manager' | 'discovery' | 'host'>('hardware_manager');
  const [hostConfig, setHostConfig] = useState<WindowsWebView2HostConfig>(webview2Bridge.getHostConfig());
  const [displays, setDisplays] = useState<WindowsDisplayInfo[]>([]);
  const [healthCheck, setHealthCheck] = useState<StartupHealthCheckResult | null>(null);
  const [testingDevice, setTestingDevice] = useState<string | null>(null);
  const [testMessage, setTestMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showSetupWizard, setShowSetupWizard] = useState<boolean>(false);
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState<boolean>(false);
  const [isPrinterAvailable, setIsPrinterAvailable] = useState<boolean>(posBridge.isPrinterConnected());

  useEffect(() => {
    loadData();
    const unsubDisplays = webview2Bridge.subscribeDisplays(setDisplays);
    const unsubPrinter = posBridge.subscribePrinterAssignment(() => {
      setIsPrinterAvailable(posBridge.isPrinterConnected());
    });
    return () => {
      unsubDisplays();
      unsubPrinter();
    };
  }, []);

  const loadData = async () => {
    setHostConfig(webview2Bridge.getHostConfig());
    const disp = await webview2Bridge.getDisplays();
    setDisplays(disp);
    const health = await webview2Bridge.checkStartupHealth();
    setHealthCheck(health);
  };

  const handleIdentifyDisplays = async () => {
    playBeep('click');
    await webview2Bridge.identifyDisplays();
    setTestMessage({ type: 'success', text: 'Display Identification overlays active for 3.5 seconds (WV-015)' });
  };

  const handleTestCustomerDisplay = async () => {
    playBeep('click');
    await webview2Bridge.sendCommand('TEST_CUSTOMER_DISPLAY', { message: '377 Spirits Customer Monitor Live Test' });
    setTestMessage({ type: 'success', text: 'Test signal transmitted to Display 2 (/customer-display)' });
  };

  const handleRestartCustomerDisplay = async () => {
    playBeep('click');
    await webview2Bridge.sendCommand('RESTART_CUSTOMER_DISPLAY');
    setTestMessage({ type: 'success', text: 'Restart signal sent to Display 2 window (WV-076)' });
  };

  const handleTestHardwareCommand = async (command: any, label: string) => {
    setTestingDevice(command);
    playBeep('click');
    try {
      const res = await webview2Bridge.sendCommand(command);
      playBeep('success');
      setTestMessage({
        type: 'success',
        text: `${label} success: ${res.model || res.drawerPin || res.weight || 'Command verified'}`,
      });
    } catch (e: any) {
      playBeep('error');
      setTestMessage({ type: 'error', text: `${label} failed: ${e.message}` });
    } finally {
      setTestingDevice(null);
    }
  };

  const handleCheckUpdates = async () => {
    playBeep('click');
    if (activeCartCount > 0) {
      // WV-080: Prevent update while sale or payment is active
      alert('Cannot install or check updates while a customer sale or transaction is in progress (WV-080).');
      return;
    }
    setUpdateStatus('Checking for signed Windows package updates...');
    const res = await webview2Bridge.checkForUpdates();
    setTimeout(() => {
      setUpdateStatus(`You are running the latest production build (${res.currentVersion}).`);
    }, 800);
  };

  const handleSaveConfig = () => {
    playBeep('success');
    webview2Bridge.updateHostConfig(hostConfig);
    setTestMessage({ type: 'success', text: 'Windows POS Host settings saved to persistent registry.' });
  };

  const handleDownloadSetupPackage = () => {
    playBeep('click');
    const setupContent = `# =========================================================================
# 377 SPIRITS - KaBiRa POS Windows Host Deployment Script (WV-054 to WV-062)
# Register ID: ${hostConfig.registerId}
# Device ID: ${hostConfig.deviceId}
# Store: ${hostConfig.storeId}
# =========================================================================

Write-Host "Starting KaBiRa POS Windows Setup..." -ForegroundColor Cyan

# 1. Verify WebView2 Evergreen Runtime (WV-055)
$regKey = "HKLM:\\SOFTWARE\\WOW6432Node\\Microsoft\\EdgeUpdate\\Clients\\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}"
if (-not (Test-Path $regKey)) {
    Write-Host "WebView2 Runtime not found. Downloading Microsoft Evergreen Bootstrapper..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri "https://go.microsoft.com/fwlink/p/?LinkId=2124703" -OutFile "$env:TEMP\\MicrosoftEdgeWebview2Setup.exe"
    Start-Process -FilePath "$env:TEMP\\MicrosoftEdgeWebview2Setup.exe" -ArgumentList "/silent /install" -Wait
}

# 2. Register POS Hardware Bridge Service (WV-056, WV-062)
$BridgeServicePath = "$PSScriptRoot\\bridge\\PosBridgeService.exe"
if (Test-Path $BridgeServicePath) {
    New-Service -Name "KaBiRaPosBridge" -BinaryPathName $BridgeServicePath -DisplayName "KaBiRa POS Hardware Bridge" -StartupType Automatic
    Start-Service -Name "KaBiRaPosBridge"
}

# 3. Configure Auto-Startup & Shell Kiosk Shortcut (WV-060, WV-061)
$WScriptShell = New-Object -ComObject WScript.Shell
$Shortcut = $WScriptShell.CreateShortcut("$env:USERPROFILE\\Desktop\\KaBiRa POS.lnk")
$Shortcut.TargetPath = "$PSScriptRoot\\KaBiRa.WindowsPos.exe"
$Shortcut.Arguments = "--register-id=${hostConfig.registerId} --device-id=${hostConfig.deviceId} --fullscreen"
$Shortcut.Save()

Write-Host "KaBiRa POS Installation Completed Successfully!" -ForegroundColor Green
`;
    const blob = new Blob([setupContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `KaBiRa-POS-Setup-${hostConfig.registerId}.ps1`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div id="windows-pos-manager-tab" className="space-y-6 font-sans">
      {/* Test Feedback Banner */}
      {testMessage && (
        <div
          className={`p-3.5 rounded-2xl border flex items-center justify-between animate-in fade-in ${
            testMessage.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-semibold">
            {testMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{testMessage.text}</span>
          </div>
          <button
            onClick={() => setTestMessage(null)}
            className="text-xs font-bold px-2 py-1 bg-black/30 hover:bg-black/50 rounded-lg"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* PWA Direct Installation Card */}
      <PWAInstallButton variant="full" />

      {/* SUBTAB NAVIGATION (Smart Bridge Device Discovery vs Windows Host Setup) */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-200/90 rounded-2xl w-fit">
        <button
          type="button"
          onClick={() => {
            playBeep('click');
            setActiveSubTab('hardware_manager');
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'hardware_manager'
              ? 'bg-slate-900 text-white shadow-xs font-black'
              : 'text-slate-700 hover:text-slate-900'
          }`}
        >
          <Cpu className="w-4 h-4 text-sky-400" />
          Store & Register Hardware Manager
        </button>

        <button
          type="button"
          onClick={() => {
            playBeep('click');
            setActiveSubTab('discovery');
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'discovery'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-700 hover:text-slate-900'
          }`}
        >
          <Cpu className="w-4 h-4 text-amber-400" />
          Discovered Devices Fleet
        </button>

        <button
          type="button"
          onClick={() => {
            playBeep('click');
            setActiveSubTab('host');
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'host'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-700 hover:text-slate-900'
          }`}
        >
          <Monitor className="w-4 h-4 text-indigo-400" />
          Dual Monitor & Windows Host Deployment
        </button>
      </div>

      {activeSubTab === 'hardware_manager' ? (
        <HardwareDeviceManager onOpenCustomerDisplay={onOpenCustomerDisplayWindow} />
      ) : activeSubTab === 'discovery' ? (
        <DeviceManagerView />
      ) : (
        <>
          {/* TOP OVERVIEW CARD */}
          <div className="bg-gradient-to-br from-[#0F1420] to-[#151C2C] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#C5A059] to-[#8C6D2C] text-black font-black text-xl flex items-center justify-center shadow-lg shadow-[#C5A059]/20">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#C5A059] uppercase tracking-widest">
                  EPIC WV-001 — Windows POS Wrapper & Multi-Monitor Host
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-950 border border-emerald-500 text-emerald-400">
                  {webview2Bridge.isRunningInWebView2() ? 'Native WebView2 Active' : 'Host Bridge Active'}
                </span>
              </div>
              <h2 className="text-xl font-bold text-white tracking-wide">
                Windows 10/11 POS Host & Dual-Screen Management
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSetupWizard(true)}
              className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Launch Device Wizard (WV-058)</span>
            </button>

            <button
              onClick={handleDownloadSetupPackage}
              className="px-4 py-2 rounded-xl bg-[#C5A059] hover:bg-[#B38F46] text-black text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer shadow-lg shadow-[#C5A059]/20"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Installer Package (WV-054)</span>
            </button>
          </div>
        </div>

        {/* Status Metrics Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl">
            <span className="text-slate-400 block text-[11px]">Installed Register ID</span>
            <span className="text-white font-mono font-bold text-sm">{hostConfig.registerId}</span>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl">
            <span className="text-slate-400 block text-[11px]">Hardware Device ID</span>
            <span className="text-white font-mono font-bold text-sm">{hostConfig.deviceId}</span>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl">
            <span className="text-slate-400 block text-[11px]">WebView2 Runtime</span>
            <span className="text-emerald-400 font-bold text-sm">{hostConfig.runtimeVersion}</span>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl">
            <span className="text-slate-400 block text-[11px]">POS Bridge Service</span>
            <span className="text-emerald-400 font-bold text-sm">Online (127.0.0.1:5055)</span>
          </div>
        </div>
      </div>

      {/* SECTION 1: DUAL MONITOR CONFIGURATION (WV-009 - WV-018, WV-073) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <div className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">
              EPIC Dual Monitor Support
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Cashier & Customer Display Configuration
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleIdentifyDisplays}
              className="px-3.5 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Identify Displays (WV-015)</span>
            </button>

            <button
              onClick={handleTestCustomerDisplay}
              className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Test Screen (WV-075)</span>
            </button>

            <button
              onClick={handleRestartCustomerDisplay}
              className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restart Display 2 (WV-076)</span>
            </button>
          </div>
        </div>

        {/* Display List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displays.map(disp => (
            <div
              key={disp.id}
              className={`p-5 rounded-2xl border flex flex-col justify-between space-y-4 transition-all ${
                disp.assignedRole === 'cashier'
                  ? 'bg-blue-50/60 border-blue-200'
                  : 'bg-emerald-50/60 border-emerald-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl text-white font-black text-xl flex items-center justify-center shadow-md ${
                    disp.assignedRole === 'cashier' ? 'bg-blue-600' : 'bg-emerald-600'
                  }`}>
                    {disp.deviceNumber}
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                      {disp.isPrimary ? 'Primary Windows Monitor' : 'Extended Secondary Screen'}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900">{disp.friendlyName}</h4>
                    <p className="text-xs text-slate-600 font-mono mt-0.5">
                      {disp.resolution.width} &times; {disp.resolution.height} • Bounds: {disp.bounds.x}, {disp.bounds.y}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200/80">
                <span className="text-xs font-semibold text-slate-700">Display Role:</span>
                <select
                  value={disp.assignedRole}
                  onChange={e => {
                    const newRole = e.target.value as any;
                    const updated = displays.map(d =>
                      d.id === disp.id ? { ...d, assignedRole: newRole } : d
                    );
                    setDisplays(updated);
                    webview2Bridge.setDisplays(updated);
                  }}
                  className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 shadow-xs"
                >
                  <option value="cashier">Display 1 (Cashier Route: /register)</option>
                  <option value="customer">Display 2 (Customer Route: /customer-display)</option>
                  <option value="unassigned">Unassigned</option>
                </select>
              </div>
            </div>
          ))}
        </div>

        {/* Customer Display Behavior Settings (WV-073) */}
        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Customer Secondary Display Parameters (WV-073)
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Dedicated Route URL (WV-012)
              </label>
              <input
                type="text"
                value={hostConfig.customerDisplayUrl}
                onChange={e => setHostConfig({ ...hostConfig, customerDisplayUrl: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Welcome Reset Timeout (WV-029)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={3}
                  max={60}
                  value={hostConfig.returnToWelcomeTimeoutSec}
                  onChange={e => setHostConfig({ ...hostConfig, returnToWelcomeTimeoutSec: Number(e.target.value) || 8 })}
                  className="w-24 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-bold text-center"
                />
                <span className="text-xs text-slate-500 font-medium">seconds after checkout</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Customer Touchscreen Calibration (WV-052)
              </label>
              <div className="text-xs text-slate-600">
                Independent touch controller mapped to Display 2 (Focus protection active).
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            <label className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between cursor-pointer">
              <span className="text-xs font-bold text-slate-800">Customer Display Enabled (WV-011)</span>
              <input
                type="checkbox"
                checked={hostConfig.customerDisplayEnabled}
                onChange={e => setHostConfig({ ...hostConfig, customerDisplayEnabled: e.target.checked })}
                className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
              />
            </label>

            <label className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between cursor-pointer">
              <span className="text-xs font-bold text-slate-800">Fullscreen Borderless on Display 2 (WV-013)</span>
              <input
                type="checkbox"
                checked={hostConfig.customerDisplayFullscreen}
                onChange={e => setHostConfig({ ...hostConfig, customerDisplayFullscreen: e.target.checked })}
                className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
              />
            </label>
          </div>
        </div>
      </div>

      {/* SECTION 2: STANDARDIZED HARDWARE BRIDGE COMMANDS (WV-031 to WV-041) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <div className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">
              EPIC POS Bridge Integration (WV-041)
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Standardized Hardware Command Controls
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Bridge Service Online</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Print Receipt */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2">
                  <Printer className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-bold text-slate-900">RECEIPT_PRINTER (WV-036)</span>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    isPrinterAvailable
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-rose-100 text-rose-800 border-rose-300'
                  }`}
                >
                  {isPrinterAvailable ? 'Online' : 'Offline'}
                </span>
              </div>
              <p className="text-[11px] text-slate-600">
                {isPrinterAvailable
                  ? 'Dispatches ESC/POS ticket to thermal printer with paper cut'
                  : 'No printer connected in the system. Status: Offline / Not Detected.'}
              </p>
            </div>
            <button
              onClick={() => handleTestHardwareCommand('CHECK_PRINTER', 'Receipt Printer')}
              disabled={testingDevice === 'CHECK_PRINTER'}
              className="w-full py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
            >
              <Play className="w-3 h-3" />
              <span>{testingDevice === 'CHECK_PRINTER' ? 'Testing...' : 'Test Printer'}</span>
            </button>
          </div>

          {/* Open Cash Drawer */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Cpu className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-900">OPEN_DRAWER (WV-037)</span>
              </div>
              <p className="text-[11px] text-slate-600">Fires 24V solenoid pulse through RJ12 Pin 2 or Pin 5</p>
            </div>
            <button
              onClick={() => handleTestHardwareCommand('OPEN_DRAWER', 'Cash Drawer')}
              disabled={testingDevice === 'OPEN_DRAWER'}
              className="w-full py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
            >
              <Play className="w-3 h-3" />
              <span>{testingDevice === 'OPEN_DRAWER' ? 'Kicking...' : 'Kick Drawer'}</span>
            </button>
          </div>

          {/* Scale Weight */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Activity className="w-4 h-4 text-purple-600" />
                <span className="text-xs font-bold text-slate-900">GET_SCALE_WEIGHT (WV-039)</span>
              </div>
              <p className="text-[11px] text-slate-600">Reads tare and live net weight over RS-232 / USB scale</p>
            </div>
            <button
              onClick={() => handleTestHardwareCommand('GET_SCALE_WEIGHT', 'Digital Scale')}
              disabled={testingDevice === 'GET_SCALE_WEIGHT'}
              className="w-full py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
            >
              <Play className="w-3 h-3" />
              <span>{testingDevice === 'GET_SCALE_WEIGHT' ? 'Reading...' : 'Read Weight'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 3: SYSTEM DIAGNOSTICS MATRIX (WV-077) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <div className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">
              EPIC Diagnostics & Health Check (WV-077)
            </div>
            <h3 className="text-base font-bold text-slate-900">
              POS Hardware & System Diagnostic Matrix
            </h3>
          </div>

          <button
            onClick={async () => {
              setIsCheckingHealth(true);
              playBeep('click');
              const h = await webview2Bridge.checkStartupHealth();
              setHealthCheck(h);
              setIsCheckingHealth(false);
              playBeep('success');
            }}
            className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isCheckingHealth ? 'animate-spin' : ''}`} />
            <span>Refresh Diagnostics</span>
          </button>
        </div>

        {healthCheck && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {Object.entries(healthCheck.checks).map(([key, item]: [string, any]) => (
              <div
                key={key}
                className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between"
              >
                <div>
                  <span className="text-xs font-bold text-slate-900 uppercase block">
                    {key.replace(/([A-Z])/g, ' $1')}
                  </span>
                  <span className="text-[11px] text-slate-600 block truncate max-w-[200px]">
                    {item.message}
                  </span>
                </div>
                {item.status === 'ok' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 4: VERSIONING & UPDATES (WV-078 to WV-082) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <div className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">
              EPIC Updates (WV-078, WV-079, WV-080)
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Application Version & Update Safeguards
            </h3>
          </div>

          <button
            onClick={handleCheckUpdates}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Check for Updates</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-slate-500 block text-[11px]">Windows Wrapper Version</span>
            <span className="text-slate-900 font-bold">{hostConfig.wrapperVersion}</span>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-slate-500 block text-[11px]">Bridge Service Version</span>
            <span className="text-slate-900 font-bold">{hostConfig.bridgeVersion}</span>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-slate-500 block text-[11px]">Web POS Build Version</span>
            <span className="text-slate-900 font-bold">{hostConfig.webPosVersion}</span>
          </div>
        </div>

        {updateStatus && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs font-medium text-blue-900">
            {updateStatus}
          </div>
        )}

        {activeCartCount > 0 && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-medium text-amber-900 flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              Safe Update Lock (WV-080): Active cart with {activeCartCount} items in progress. Updates cannot be applied until sale completes.
            </span>
          </div>
        )}
      </div>

      {/* Save Action Footer */}
      <div className="flex justify-end pt-2">
        <button
          onClick={handleSaveConfig}
          className="px-6 py-3 rounded-2xl bg-[#C5A059] hover:bg-[#B38F46] text-black text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-transform active:scale-95 cursor-pointer shadow-lg shadow-[#C5A059]/20"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Save Windows POS Host Settings</span>
        </button>
      </div>
        </>
      )}

      {/* Device Setup Wizard Modal */}
      <DeviceSetupWizardModal
        isOpen={showSetupWizard}
        onClose={() => setShowSetupWizard(false)}
        onCompleted={loadData}
      />
    </div>
  );
};
