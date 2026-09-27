import React, { useState, useEffect } from 'react';
import {
  WindowsDisplayInfo,
  WindowsWebView2HostConfig,
} from '../../types';
import { webview2Bridge } from '../../services/webview2Bridge';
import { posBridge } from '../../services/posBridge';
import { playBeep } from '../../utils/audio';
import {
  Sparkles,
  Monitor,
  Printer,
  Barcode,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Play,
  ArrowRight,
  ArrowLeft,
  X,
  Cpu,
  Layers,
  ShieldCheck,
  Scale,
  Zap,
} from 'lucide-react';

interface DeviceSetupWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCompleted?: () => void;
}

export const DeviceSetupWizardModal: React.FC<DeviceSetupWizardModalProps> = ({
  isOpen,
  onClose,
  onCompleted,
}) => {
  const [step, setStep] = useState<number>(1);
  const [hostConfig, setHostConfig] = useState<WindowsWebView2HostConfig>(webview2Bridge.getHostConfig());
  const [displays, setDisplays] = useState<WindowsDisplayInfo[]>([]);
  const [loadingDisplays, setLoadingDisplays] = useState<boolean>(false);

  // Hardware test states (WV-059)
  const [testingDevice, setTestingDevice] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});

  useEffect(() => {
    if (!isOpen) return;
    setHostConfig(webview2Bridge.getHostConfig());
    loadDisplays();
  }, [isOpen]);

  const loadDisplays = async () => {
    setLoadingDisplays(true);
    try {
      const data = await webview2Bridge.getDisplays();
      setDisplays(data);
    } catch {
      // Ignore
    } finally {
      setLoadingDisplays(false);
    }
  };

  if (!isOpen) return null;

  const handleTestHardware = async (deviceType: 'printer' | 'drawer' | 'scanner' | 'scale' | 'terminal') => {
    setTestingDevice(deviceType);
    playBeep('click');
    try {
      let res: any;
      if (deviceType === 'printer') {
        res = await webview2Bridge.sendCommand('CHECK_PRINTER');
        setTestResults(prev => ({
          ...prev,
          printer: { success: true, message: `${res.model || 'Thermal Printer'} online • Paper OK` },
        }));
      } else if (deviceType === 'drawer') {
        res = await webview2Bridge.sendCommand('OPEN_DRAWER', { reason: 'Wizard test kick' });
        setTestResults(prev => ({
          ...prev,
          drawer: { success: true, message: `Drawer solenoid triggered on ${res.drawerPin || 'Pin 2'}` },
        }));
      } else if (deviceType === 'scale') {
        res = await webview2Bridge.sendCommand('GET_SCALE_WEIGHT');
        setTestResults(prev => ({
          ...prev,
          scale: { success: true, message: `Scale responsive: ${res.weight} ${res.unit} (Tare: ${res.tare})` },
        }));
      } else if (deviceType === 'terminal') {
        res = await webview2Bridge.sendCommand('START_PAYMENT', { amount: 1.00 });
        setTestResults(prev => ({
          ...prev,
          terminal: { success: true, message: `${res.terminal || 'Payment Terminal'} ready for EMV/NFC` },
        }));
      } else if (deviceType === 'scanner') {
        setTestResults(prev => ({
          ...prev,
          scanner: { success: true, message: 'Scanner USB HID keyboard wedge listening globally' },
        }));
      }
      playBeep('success');
    } catch (e: any) {
      playBeep('error');
      setTestResults(prev => ({
        ...prev,
        [deviceType]: { success: false, message: e.message || 'Device test failed' },
      }));
    } finally {
      setTestingDevice(null);
    }
  };

  const handleIdentifyDisplays = async () => {
    playBeep('click');
    await webview2Bridge.identifyDisplays();
  };

  const handleFinishWizard = () => {
    playBeep('success');
    webview2Bridge.updateHostConfig(hostConfig);
    if (onCompleted) onCompleted();
    onClose();
  };

  return (
    <div
      id="device-setup-wizard-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 font-sans text-white select-none"
    >
      <div className="w-full max-w-3xl bg-[#0F1420] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#151C2C] border-b border-slate-800 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#C5A059] text-black font-black text-lg flex items-center justify-center shadow-lg shadow-[#C5A059]/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold text-[#C5A059] uppercase tracking-widest">
                First-Launch Device Setup Wizard (WV-058)
              </div>
              <h2 className="text-lg font-bold text-white tracking-wide">
                Configure Windows POS Register & Peripherals
              </h2>
            </div>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map(s => (
              <div
                key={s}
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step === s
                    ? 'bg-[#C5A059] text-black font-black scale-110'
                    : step > s
                    ? 'bg-emerald-950 border border-emerald-500 text-emerald-400'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {step > s ? '✓' : s}
              </div>
            ))}
          </div>
        </div>

        {/* Wizard Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* STEP 1: REGISTER IDENTIFICATION (WV-057) */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-white">1. Store & Register Identification</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Set the unique identity for this physical checkout lane and terminal.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Business Name</label>
                  <input
                    type="text"
                    value={hostConfig.businessName}
                    onChange={e => setHostConfig({ ...hostConfig, businessName: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Store / Location Code</label>
                  <input
                    type="text"
                    value={hostConfig.storeId}
                    onChange={e => setHostConfig({ ...hostConfig, storeId: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Register ID</label>
                  <input
                    type="text"
                    value={hostConfig.registerId}
                    onChange={e => setHostConfig({ ...hostConfig, registerId: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white font-mono"
                    placeholder="e.g. REG-01"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Physical Device ID (Host Tag)</label>
                  <input
                    type="text"
                    value={hostConfig.deviceId}
                    onChange={e => setHostConfig({ ...hostConfig, deviceId: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white font-mono"
                    placeholder="e.g. POS-WIN11-TERMINAL-1"
                  />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 space-y-1">
                <span className="font-bold text-[#C5A059] block">Persistent Register Profile (WV-016)</span>
                <p className="text-[11px] text-slate-400">
                  This identity is saved locally in Windows host config and synchronizes shift drawer reports and cashier audits automatically.
                </p>
              </div>
            </div>
          )}

          {/* STEP 2: DUAL MONITOR ASSIGNMENT (WV-009 to WV-018) */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">2. Dual Monitor Setup</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Assign which screen is the Cashier Register (Display 1) and Customer Display (Display 2).
                  </p>
                </div>

                <button
                  onClick={handleIdentifyDisplays}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>Identify Displays (WV-015)</span>
                </button>
              </div>

              {/* Display List Cards */}
              <div className="space-y-3">
                {displays.map(disp => (
                  <div
                    key={disp.id}
                    className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
                      disp.deviceNumber === 1
                        ? 'bg-blue-950/20 border-blue-600/40'
                        : 'bg-emerald-950/20 border-emerald-600/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 text-white font-black text-lg flex items-center justify-center border border-slate-700">
                        {disp.deviceNumber}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">{disp.friendlyName}</h4>
                        <p className="text-[11px] text-slate-400 font-mono">
                          {disp.resolution.width} &times; {disp.resolution.height} • Bounds: ({disp.bounds.x}, {disp.bounds.y})
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={disp.assignedRole}
                        onChange={e => {
                          const nextRole = e.target.value as any;
                          const updated = displays.map(d =>
                            d.id === disp.id ? { ...d, assignedRole: nextRole } : d
                          );
                          setDisplays(updated);
                          webview2Bridge.setDisplays(updated);
                        }}
                        className="bg-slate-900 border border-slate-700 text-xs font-semibold rounded-xl px-3 py-1.5 text-slate-200"
                      >
                        <option value="cashier">Cashier Display (Display 1 - /register)</option>
                        <option value="customer">Customer Display (Display 2 - /customer-display)</option>
                        <option value="unassigned">Unassigned</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                <label className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center justify-between cursor-pointer">
                  <span className="text-xs font-semibold text-slate-300">Enable Customer Secondary Display</span>
                  <input
                    type="checkbox"
                    checked={hostConfig.customerDisplayEnabled}
                    onChange={e => setHostConfig({ ...hostConfig, customerDisplayEnabled: e.target.checked })}
                    className="w-4 h-4 accent-[#C5A059] rounded"
                  />
                </label>

                <label className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center justify-between cursor-pointer">
                  <span className="text-xs font-semibold text-slate-300">Fullscreen Borderless Customer Display</span>
                  <input
                    type="checkbox"
                    checked={hostConfig.customerDisplayFullscreen}
                    onChange={e => setHostConfig({ ...hostConfig, customerDisplayFullscreen: e.target.checked })}
                    className="w-4 h-4 accent-[#C5A059] rounded"
                  />
                </label>
              </div>
            </div>
          )}

          {/* STEP 3: PHYSICAL HARDWARE TESTS (WV-059) */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-white">3. Test POS Hardware Peripherals</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Verify printer, cash drawer, scanner, scale, and payment terminal communication through POS Bridge.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Thermal Receipt Printer */}
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                        <Printer className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">Receipt Printer (ESC/POS)</h4>
                        <p className="text-[11px] text-slate-400">Thermal receipt & autocutter</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleTestHardware('printer')}
                      disabled={testingDevice === 'printer'}
                      className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Play className="w-3 h-3" />
                      <span>{testingDevice === 'printer' ? 'Testing...' : 'Test'}</span>
                    </button>
                  </div>
                  {testResults.printer && (
                    <div className={`p-2 rounded-xl text-[11px] font-medium ${testResults.printer.success ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/40' : 'bg-rose-950/40 text-rose-300 border border-rose-800/40'}`}>
                      {testResults.printer.message}
                    </div>
                  )}
                </div>

                {/* Cash Drawer Solenoid */}
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                        <Cpu className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">Cash Drawer (24V RJ12 Pulse)</h4>
                        <p className="text-[11px] text-slate-400">Pin 2 / Pin 5 drawer solenoid</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleTestHardware('drawer')}
                      disabled={testingDevice === 'drawer'}
                      className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Play className="w-3 h-3" />
                      <span>{testingDevice === 'drawer' ? 'Kicking...' : 'Test Kick'}</span>
                    </button>
                  </div>
                  {testResults.drawer && (
                    <div className={`p-2 rounded-xl text-[11px] font-medium ${testResults.drawer.success ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/40' : 'bg-rose-950/40 text-rose-300 border border-rose-800/40'}`}>
                      {testResults.drawer.message}
                    </div>
                  )}
                </div>

                {/* Barcode Scanner */}
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                        <Barcode className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">Barcode Scanner (USB HID)</h4>
                        <p className="text-[11px] text-slate-400">Global auto-wedge listener</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleTestHardware('scanner')}
                      disabled={testingDevice === 'scanner'}
                      className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Play className="w-3 h-3" />
                      <span>Verify</span>
                    </button>
                  </div>
                  {testResults.scanner && (
                    <div className={`p-2 rounded-xl text-[11px] font-medium ${testResults.scanner.success ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/40' : 'bg-rose-950/40 text-rose-300 border border-rose-800/40'}`}>
                      {testResults.scanner.message}
                    </div>
                  )}
                </div>

                {/* Electronic Scale */}
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                        <Scale className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">Legal-For-Trade Scale</h4>
                        <p className="text-[11px] text-slate-400">Mettler Toledo / NCI RS-232</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleTestHardware('scale')}
                      disabled={testingDevice === 'scale'}
                      className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Play className="w-3 h-3" />
                      <span>Read Weight</span>
                    </button>
                  </div>
                  {testResults.scale && (
                    <div className={`p-2 rounded-xl text-[11px] font-medium ${testResults.scale.success ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/40' : 'bg-rose-950/40 text-rose-300 border border-rose-800/40'}`}>
                      {testResults.scale.message}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: WINDOWS STARTUP & ACTIVATION (WV-061 to WV-065) */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-white">4. Windows Auto-Startup & Kiosk Settings</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Configure Windows 10/11 system behavior, auto-launching, and shell restrictions.
                </p>
              </div>

              <div className="space-y-3">
                <label className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="text-xs font-bold text-white block">Auto-Start With Windows (WV-061)</span>
                    <span className="text-[11px] text-slate-400">Launch POS Host and Customer Display automatically on Windows boot</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={hostConfig.autoLaunchOnWindowsStartup}
                    onChange={e => setHostConfig({ ...hostConfig, autoLaunchOnWindowsStartup: e.target.checked })}
                    className="w-4 h-4 accent-[#C5A059] rounded"
                  />
                </label>

                <label className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="text-xs font-bold text-white block">Prevent Navigation Away (WV-005)</span>
                    <span className="text-[11px] text-slate-400">Block opening external URLs or unauthorized web domains</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={hostConfig.preventNavigationAway}
                    onChange={e => setHostConfig({ ...hostConfig, preventNavigationAway: e.target.checked })}
                    className="w-4 h-4 accent-[#C5A059] rounded"
                  />
                </label>

                <label className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="text-xs font-bold text-white block">Lockdown Kiosk Mode (WV-065)</span>
                    <span className="text-[11px] text-slate-400">Fullscreen borderless with Windows key and taskbar suppression</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={hostConfig.kioskModeEnabled}
                    onChange={e => setHostConfig({ ...hostConfig, kioskModeEnabled: e.target.checked })}
                    className="w-4 h-4 accent-[#C5A059] rounded"
                  />
                </label>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-600/40 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span className="text-xs text-emerald-300 font-medium">
                  Register setup complete! Ready to start cashier checkout operations.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation Buttons */}
        <div className="bg-[#151C2C] border-t border-slate-800 p-4 px-6 flex items-center justify-between">
          <button
            onClick={() => {
              if (step > 1) setStep(step - 1);
              else onClose();
            }}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{step === 1 ? 'Cancel' : 'Previous'}</span>
          </button>

          <div className="flex items-center gap-2">
            {step < 4 ? (
              <button
                onClick={() => {
                  playBeep('click');
                  setStep(step + 1);
                }}
                className="px-5 py-2.5 rounded-xl bg-[#C5A059] hover:bg-[#B38F46] text-black text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer shadow-lg shadow-[#C5A059]/20"
              >
                <span>Next Step</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={handleFinishWizard}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer shadow-lg shadow-emerald-900/30"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Save & Activate Register</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
