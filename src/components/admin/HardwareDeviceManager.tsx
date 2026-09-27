import React, { useState, useEffect, useMemo } from 'react';
import {
  Printer,
  Archive,
  ScanBarcode,
  Monitor,
  Scale,
  CreditCard,
  Cpu,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Play,
  Download,
  ShieldCheck,
  Activity,
  Layers,
  FileText,
  Server,
  Terminal,
  Settings,
  ArrowRight,
  Sliders,
  ChevronRight,
  HardDrive,
  Usb,
  Wifi,
  Radio,
  FileCode,
  Lock,
  RotateCcw,
  Check,
  Eye,
  Info,
  ExternalLink,
  Laptop,
  Network,
  Plus,
  Search,
  Filter,
} from 'lucide-react';
import {
  storeRegisterHardwareService,
  RegisterHardwareMapping,
  RegisterHardwareItemConfig,
  BridgeTelemetryData,
  BridgeUpdateStatus,
} from '../../services/storeRegisterHardwareService';
import { deviceDiscovery } from '../../services/deviceDiscoveryService';
import { DiscoveredPosDevice, DiscoveredDeviceCategory } from '../../types';
import { playBeep } from '../../utils/audio';
import { HardwareDiagnosticsTab } from './HardwareDiagnosticsTab';
import { DeviceState } from '../../services/deviceState';
import { DeviceHealthStatusCard } from './DeviceHealthStatusCard';

interface HardwareDeviceManagerProps {
  onOpenCustomerDisplay?: () => void;
}

export const HardwareDeviceManager: React.FC<HardwareDeviceManagerProps> = ({ onOpenCustomerDisplay }) => {
  // Navigation State
  const stores = storeRegisterHardwareService.getStores();
  const [selectedStoreId, setSelectedStoreId] = useState<string>(storeRegisterHardwareService.getActiveStore().id);
  const [selectedRegisterId, setSelectedRegisterId] = useState<string>(storeRegisterHardwareService.getActiveRegister().id);
  const [viewTab, setViewTab] = useState<'diagnostics' | 'manager' | 'discovery' | 'single_installer' | 'architecture' | 'deployment' | 'logs'>('diagnostics');

  // Hardware Mapping for selected Store & Register
  const [hardwareMapping, setHardwareMapping] = useState<RegisterHardwareMapping>(
    storeRegisterHardwareService.getRegisterHardware(selectedStoreId, selectedRegisterId)
  );

  // Discovered Devices list
  const [discoveredDevices, setDiscoveredDevices] = useState<DiscoveredPosDevice[]>(deviceDiscovery.getDiscoveredDevices());
  const [filterLocalOnly, setFilterLocalOnly] = useState<boolean>(deviceDiscovery.getFilterLocalOnly());
  const [isBridgeInstalled, setIsBridgeInstalled] = useState<boolean>(storeRegisterHardwareService.isBridgeInstalled());
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanStage, setScanStage] = useState<string>('');

  // Single Installer Execution Simulator states
  const [isDownloadingExe, setIsDownloadingExe] = useState<boolean>(false);
  const [isSimulatingInstaller, setIsSimulatingInstaller] = useState<boolean>(false);
  const [installerProgress, setInstallerProgress] = useState<number>(0);
  const [installerStepText, setInstallerStepText] = useState<string>('');
  const [installerLogs, setInstallerLogs] = useState<string[]>([]);
  const [showInstallerSuccessModal, setShowInstallerSuccessModal] = useState<boolean>(false);
  const [installerScriptTab, setInstallerScriptTab] = useState<'inno_setup' | 'wix_toolset'>('inno_setup');

  // Live Telemetry & Bridge Update Status
  const [telemetry, setTelemetry] = useState<BridgeTelemetryData>(storeRegisterHardwareService.getTelemetrySnapshot());
  const [updateStatus, setUpdateStatus] = useState<BridgeUpdateStatus>({
    isUpdating: false,
    step: 'idle',
    progress: 0,
    targetVersion: '2.9.0',
    currentVersion: '2.8.4',
    message: 'Bridge is healthy',
    rollbackOccurred: false,
    log: [],
  });

  // Modal / Drawer states
  const [configuringCategory, setConfiguringCategory] = useState<keyof RegisterHardwareMapping | null>(null);
  const [selectedDeviceKeyForAssign, setSelectedDeviceKeyForAssign] = useState<string>('');
  const [testResultModal, setTestResultModal] = useState<{
    categoryLabel: string;
    deviceName: string;
    success: boolean;
    message: string;
    log: string;
  } | null>(null);
  const [isTestingInProgress, setIsTestingInProgress] = useState<boolean>(false);
  const [showPackageInspector, setShowPackageInspector] = useState<boolean>(false);
  const [inspectorFile, setInspectorFile] = useState<'setup.iss' | 'Product.wxs' | 'install.ps1' | 'uninstall.ps1' | 'config.json'>('setup.iss');
  const [isDownloadingZip, setIsDownloadingZip] = useState<boolean>(false);
  const [showRollbackNotice, setShowRollbackNotice] = useState<boolean>(false);

  // Discovery Filter, Pairing, and Summary Modals
  const [fleetFilter, setFleetFilter] = useState<'all' | 'connected' | 'defaults'>('all');
  const [discoverySummaryModal, setDiscoverySummaryModal] = useState<{
    open: boolean;
    count: number;
    summary: string[];
  } | null>(null);
  const [customProbeModal, setCustomProbeModal] = useState<{
    open: boolean;
    ip: string;
    port: number;
    loading: boolean;
    result?: string;
    success?: boolean;
  } | null>(null);
  const [pairError, setPairError] = useState<string | null>(null);
  const [pairingActive, setPairingActive] = useState<string | null>(null);
  const [fleetViewMode, setFleetViewMode] = useState<'cards' | 'table'>('cards');

  // Core 4 Discovered POS Devices (Printer, Scanner, Cash Drawer, Display) using DeviceState class
  const coreDeviceStates = useMemo(() => {
    return DeviceState.buildCoreDeviceStates(hardwareMapping, discoveredDevices, telemetry);
  }, [hardwareMapping, discoveredDevices, telemetry]);

  // All fleet devices mapped to DeviceState instances
  const fleetDeviceStates = useMemo(() => {
    return discoveredDevices.map(d => DeviceState.fromDiscoveredDevice(d, hardwareMapping, telemetry));
  }, [discoveredDevices, hardwareMapping, telemetry]);

  // Filtered fleet devices based on active filter tab
  const filteredFleetDevices = useMemo(() => {
    return discoveredDevices.filter(dev => {
      if (fleetFilter === 'connected') {
        return (
          (dev.isPhysicalHardware ||
            dev.isNetworkDevice ||
            dev.connectionType === 'network' ||
            dev.connectionType === 'usb' ||
            dev.connectionType === 'hid') &&
          !dev.isBuiltInDefault
        );
      }
      if (fleetFilter === 'defaults') {
        return !!dev.isBuiltInDefault;
      }
      return true;
    });
  }, [discoveredDevices, fleetFilter]);

  const handleProbeDeviceFromCard = (ds: DeviceState) => {
    playBeep('click');
    if (ds.telemetry.ipAddress || ds.portOrEndpoint.includes('.')) {
      const parts = ds.portOrEndpoint.split(':');
      const ip = ds.telemetry.ipAddress || parts[0] || '192.168.1.120';
      const port = Number(parts[1]) || 9100;
      handleProbeEndpoint(ip, port);
    } else {
      setIsScanning(true);
      setScanStage(`Probing ${ds.name} (${ds.portOrEndpoint})...`);
      setTimeout(() => {
        setIsScanning(false);
        playBeep('success');
      }, 600);
    }
  };

  // Sync state subscriptions
  useEffect(() => {
    const unsubHw = storeRegisterHardwareService.subscribe(() => {
      setHardwareMapping(storeRegisterHardwareService.getRegisterHardware(selectedStoreId, selectedRegisterId));
    });

    const unsubTelemetry = storeRegisterHardwareService.subscribeTelemetry(setTelemetry);
    const unsubUpdate = storeRegisterHardwareService.subscribeUpdate(setUpdateStatus);
    const unsubDevices = deviceDiscovery.subscribeDevices(setDiscoveredDevices);

    return () => {
      unsubHw();
      unsubTelemetry();
      unsubUpdate();
      unsubDevices();
    };
  }, [selectedStoreId, selectedRegisterId]);

  // Handle Store Selection
  const handleStoreChange = (storeId: string) => {
    playBeep('click');
    setSelectedStoreId(storeId);
    storeRegisterHardwareService.setActiveStore(storeId);
    const store = storeRegisterHardwareService.getStore(storeId);
    if (store && store.registers.length > 0) {
      setSelectedRegisterId(store.registers[0].id);
      storeRegisterHardwareService.setActiveRegister(store.registers[0].id);
      setHardwareMapping(storeRegisterHardwareService.getRegisterHardware(storeId, store.registers[0].id));
    }
  };

  // Handle Register Selection
  const handleRegisterChange = (regId: string) => {
    playBeep('click');
    setSelectedRegisterId(regId);
    storeRegisterHardwareService.setActiveRegister(regId);
    setHardwareMapping(storeRegisterHardwareService.getRegisterHardware(selectedStoreId, regId));
  };

  // Trigger Live Hardware & Network Discovery
  const handleScanDevices = async () => {
    playBeep('click');
    setIsScanning(true);
    setPairError(null);
    setScanStage('Querying Physical USB/HID Buses & Same-Network Subnet...');
    try {
      const list = await deviceDiscovery.scanForDevices();
      setDiscoveredDevices(list);

      // Auto-assign the right discovered hardware to the current register!
      const autoAssigned = storeRegisterHardwareService.autoAssignDiscoveredHardware(
        selectedStoreId,
        selectedRegisterId,
        list
      );
      setHardwareMapping(storeRegisterHardwareService.getRegisterHardware(selectedStoreId, selectedRegisterId));

      setDiscoverySummaryModal({
        open: true,
        count: autoAssigned.assignedCount,
        summary: autoAssigned.summary,
      });

      playBeep('success');
    } catch {
      playBeep('error');
    } finally {
      setIsScanning(false);
      setScanStage('');
    }
  };

  // Pair USB Hardware (WebUSB API)
  const handlePairUsb = async () => {
    setPairError(null);
    setPairingActive('usb');
    try {
      playBeep('click');
      const dev = await deviceDiscovery.pairUsbDevice();
      if (dev) {
        const list = deviceDiscovery.getDiscoveredDevices();
        setDiscoveredDevices(list);
        storeRegisterHardwareService.autoAssignDiscoveredHardware(selectedStoreId, selectedRegisterId, list);
        setHardwareMapping(storeRegisterHardwareService.getRegisterHardware(selectedStoreId, selectedRegisterId));
        playBeep('success');
      }
    } catch (e: any) {
      setPairError(e.message || 'Failed to pair USB device');
      playBeep('error');
    } finally {
      setPairingActive(null);
    }
  };

  // Pair HID Scanner (WebHID API)
  const handlePairHid = async () => {
    setPairError(null);
    setPairingActive('hid');
    try {
      playBeep('click');
      const dev = await deviceDiscovery.pairHidDevice();
      if (dev) {
        const list = deviceDiscovery.getDiscoveredDevices();
        setDiscoveredDevices(list);
        storeRegisterHardwareService.autoAssignDiscoveredHardware(selectedStoreId, selectedRegisterId, list);
        setHardwareMapping(storeRegisterHardwareService.getRegisterHardware(selectedStoreId, selectedRegisterId));
        playBeep('success');
      }
    } catch (e: any) {
      setPairError(e.message || 'Failed to pair HID device');
      playBeep('error');
    } finally {
      setPairingActive(null);
    }
  };

  // Pair Serial / COM Port (Web Serial API)
  const handlePairSerial = async () => {
    setPairError(null);
    setPairingActive('serial');
    try {
      playBeep('click');
      const dev = await deviceDiscovery.pairSerialDevice();
      if (dev) {
        const list = deviceDiscovery.getDiscoveredDevices();
        setDiscoveredDevices(list);
        storeRegisterHardwareService.autoAssignDiscoveredHardware(selectedStoreId, selectedRegisterId, list);
        setHardwareMapping(storeRegisterHardwareService.getRegisterHardware(selectedStoreId, selectedRegisterId));
        playBeep('success');
      }
    } catch (e: any) {
      setPairError(e.message || 'Failed to pair Serial COM port');
      playBeep('error');
    } finally {
      setPairingActive(null);
    }
  };

  // Probe Custom Network IP / Port
  const handleProbeEndpoint = async (ip: string, port: number) => {
    if (!ip) return;
    setCustomProbeModal(prev => prev ? { ...prev, loading: true, result: undefined } : null);
    try {
      const res = await deviceDiscovery.probeNetworkEndpoint(ip, port);
      setCustomProbeModal(prev => prev ? {
        ...prev,
        loading: false,
        result: res.message,
        success: res.reachable,
      } : null);
      if (res.reachable) {
        const list = await deviceDiscovery.scanForDevices();
        setDiscoveredDevices(list);
        storeRegisterHardwareService.autoAssignDiscoveredHardware(selectedStoreId, selectedRegisterId, list);
        setHardwareMapping(storeRegisterHardwareService.getRegisterHardware(selectedStoreId, selectedRegisterId));
        playBeep('success');
      } else {
        playBeep('error');
      }
    } catch (e: any) {
      setCustomProbeModal(prev => prev ? {
        ...prev,
        loading: false,
        result: `Failed to probe: ${e.message}`,
        success: false,
      } : null);
      playBeep('error');
    }
  };

  // Test an assigned hardware item
  const handleTestCategory = async (catKey: keyof RegisterHardwareMapping) => {
    playBeep('click');
    setIsTestingInProgress(true);
    const res = await storeRegisterHardwareService.testRegisterDevice(selectedStoreId, selectedRegisterId, catKey);
    setIsTestingInProgress(false);

    const item = hardwareMapping[catKey];
    setTestResultModal({
      categoryLabel: item.categoryLabel,
      deviceName: item.deviceName,
      success: res.success,
      message: res.message,
      log: res.log,
    });

    if (res.success) playBeep('success');
    else playBeep('error');
  };

  // Open Configure Drawer
  const handleOpenConfigure = (catKey: keyof RegisterHardwareMapping) => {
    playBeep('click');
    setConfiguringCategory(catKey);
    const current = hardwareMapping[catKey];
    setSelectedDeviceKeyForAssign(current.deviceKey);
  };

  // Save selected device assignment to current Register
  const handleSaveDeviceAssignment = () => {
    if (!configuringCategory || !selectedDeviceKeyForAssign) return;
    playBeep('click');

    const matchedDev = discoveredDevices.find(d => d.deviceKey === selectedDeviceKeyForAssign);
    if (matchedDev) {
      storeRegisterHardwareService.assignDeviceToRegister(
        selectedStoreId,
        selectedRegisterId,
        configuringCategory,
        matchedDev,
        true
      );
      setHardwareMapping(storeRegisterHardwareService.getRegisterHardware(selectedStoreId, selectedRegisterId));
      playBeep('success');
    }
    setConfiguringCategory(null);
  };

  // Download real POSBridge.zip
  const handleDownloadZip = async () => {
    playBeep('click');
    setIsDownloadingZip(true);
    try {
      const blob = await storeRegisterHardwareService.generateDeploymentZip();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `POSBridge-${selectedRegisterId}-${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      playBeep('success');
    } catch (e) {
      console.error(e);
      playBeep('error');
    } finally {
      setIsDownloadingZip(false);
    }
  };

  // One-click Install Hardware Bridge: Downloads the complete package and runs Bridge in background without asking again
  const handleInstallBridge = async () => {
    playBeep('click');
    setIsSimulatingInstaller(true);
    setInstallerProgress(0);
    setInstallerStepText('Generating & downloading complete setup package...');
    setInstallerLogs(['[START] KaBiRa-POS-Installer-Setup.exe generation started for ' + selectedRegisterId]);

    try {
      const res = await storeRegisterHardwareService.installBridgeAndRun((step, progress, log) => {
        setInstallerStepText(step);
        setInstallerProgress(progress);
        setInstallerLogs(prev => [...prev, log]);
      });

      setIsBridgeInstalled(true);
      setDiscoveredDevices(deviceDiscovery.getDiscoveredDevices());
      setHardwareMapping(storeRegisterHardwareService.getRegisterHardware(selectedStoreId, selectedRegisterId));
      setShowInstallerSuccessModal(true);
      playBeep('success');
    } catch (e) {
      console.error(e);
      playBeep('error');
    } finally {
      setIsSimulatingInstaller(false);
    }
  };

  const handleToggleFilterLocalOnly = () => {
    playBeep('click');
    const nextVal = !filterLocalOnly;
    setFilterLocalOnly(nextVal);
    deviceDiscovery.setFilterLocalOnly(nextVal);
    setDiscoveredDevices(deviceDiscovery.getDiscoveredDevices(nextVal));
  };

  // Download Single Unified Windows Installer Package (.exe)
  const handleDownloadSingleInstaller = async () => {
    playBeep('click');
    setIsDownloadingExe(true);
    try {
      const blob = await storeRegisterHardwareService.generateSingleInstallerPackage();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `KaBiRa-POS-Installer-Setup-${selectedRegisterId}-v2.8.4.exe`;
      a.click();
      URL.revokeObjectURL(url);
      playBeep('success');
    } catch (e) {
      console.error(e);
      playBeep('error');
    } finally {
      setIsDownloadingExe(false);
    }
  };

  // Execute 1-Click Single Installer Simulation
  const handleRunInstallerSimulation = async () => {
    playBeep('click');
    setIsSimulatingInstaller(true);
    setInstallerProgress(0);
    setInstallerStepText('Initializing Inno Setup / WiX Bootstrapper...');
    setInstallerLogs(['[START] KaBiRa-POS-Installer-Setup.exe launched with Administrative privileges.']);

    try {
      const result = await storeRegisterHardwareService.runSingleInstallerSimulation(
        (step, progress, log) => {
          setInstallerStepText(step);
          setInstallerProgress(progress);
          setInstallerLogs(prev => [...prev, log]);
        }
      );

      // Re-fetch discovered devices after bridge discovery
      setDiscoveredDevices(deviceDiscovery.getDiscoveredDevices());
      setHardwareMapping(storeRegisterHardwareService.getRegisterHardware(selectedStoreId, selectedRegisterId));
      setShowInstallerSuccessModal(true);
      playBeep('success');
    } catch (e) {
      console.error(e);
      playBeep('error');
    } finally {
      setIsSimulatingInstaller(false);
    }
  };

  const currentStore = storeRegisterHardwareService.getStore(selectedStoreId) || stores[0];
  const currentRegister = currentStore.registers.find(r => r.id === selectedRegisterId) || currentStore.registers[0];

  // Helper icon for hardware category
  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'receipt_printer':
        return <Printer className="w-5 h-5 text-sky-400" />;
      case 'cash_drawer':
        return <Archive className="w-5 h-5 text-amber-400" />;
      case 'barcode_scanner':
        return <ScanBarcode className="w-5 h-5 text-emerald-400" />;
      case 'customer_display':
        return <Monitor className="w-5 h-5 text-purple-400" />;
      case 'scale':
        return <Scale className="w-5 h-5 text-teal-400" />;
      case 'card_terminal':
        return <CreditCard className="w-5 h-5 text-indigo-400" />;
      default:
        return <Cpu className="w-5 h-5 text-slate-400" />;
    }
  };

  // Helper icon for connection type
  const getConnectionIcon = (conn: string) => {
    switch (conn) {
      case 'usb':
      case 'hid':
        return <Usb className="w-3.5 h-3.5 text-blue-400" />;
      case 'network':
        return <Wifi className="w-3.5 h-3.5 text-emerald-400" />;
      case 'bluetooth':
        return <Radio className="w-3.5 h-3.5 text-indigo-400" />;
      case 'com':
        return <HardDrive className="w-3.5 h-3.5 text-amber-400" />;
      default:
        return <Server className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <div className="bg-[#0B0F19] text-slate-100 rounded-3xl border border-slate-800 shadow-2xl p-4 md:p-6 space-y-6 select-none animate-in fade-in duration-150">
      {/* Top Header: Breadcrumbs & Store / Register Hierarchy */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div>
          {/* Breadcrumb matching user story */}
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-400 mb-1.5">
            <span className="text-amber-400 font-bold uppercase tracking-wider">Admin Portal</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span>Stores</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-sky-300 font-bold">{currentStore.name}</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span>Registers</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-emerald-300 font-bold">{currentRegister.name}</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-white font-extrabold underline decoration-sky-500">Hardware Manager</span>
          </div>

          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white uppercase tracking-wider flex items-center space-x-2">
                <span>Local POS Hardware Bridge & Device Manager</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  .NET 8 Background Service
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Centralized register hardware management • Localhost API (127.0.0.1:5055) • Zero manual cashier setup
              </p>
            </div>
          </div>
        </div>

        {/* Live Bridge Connection Pill & Action buttons */}
        <div className="flex items-center flex-wrap gap-2.5">
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 flex items-center space-x-2.5 text-xs shadow-inner">
            <span className={`w-2.5 h-2.5 rounded-full ${isBridgeInstalled ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <div>
              <div className="font-bold text-slate-200 flex items-center space-x-1.5">
                <span>Bridge v{telemetry.bridgeVersion}</span>
                <span className="text-[10px] text-emerald-400 font-mono">({telemetry.latencyMs}ms RTT)</span>
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                {isBridgeInstalled ? '127.0.0.1:5055 • Active Service' : 'Port 5055 • Ready to Install'}
              </div>
            </div>
          </div>

          {/* Single Install Action Button */}
          {!isBridgeInstalled ? (
            <button
              type="button"
              onClick={handleInstallBridge}
              disabled={isSimulatingInstaller}
              className="px-4 py-2.5 rounded-xl bg-[#C5A059] hover:bg-[#D4AF37] text-slate-950 text-xs font-black uppercase tracking-wider flex items-center space-x-2 cursor-pointer shadow-lg transition-transform active:scale-95 disabled:opacity-50"
              title="Download full installer package and install Hardware Bridge on back of screen without asking again"
            >
              <Download className={`w-4 h-4 ${isSimulatingInstaller ? 'animate-bounce' : ''}`} />
              <span>{isSimulatingInstaller ? 'Installing & Starting Bridge...' : 'Install Hardware Bridge (1-Click)'}</span>
            </button>
          ) : (
            <div className="flex items-center space-x-2">
              <div className="px-3.5 py-2 rounded-xl bg-emerald-950/80 border border-emerald-500/50 flex items-center space-x-2 text-xs text-emerald-300 font-bold shadow-inner">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Bridge Running in Background</span>
              </div>
              <button
                type="button"
                onClick={handleInstallBridge}
                disabled={isSimulatingInstaller}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                title="Download updated package or restart bridge background service"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Re-Download Package</span>
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowPackageInspector(true)}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 flex items-center space-x-1.5 cursor-pointer"
            title="Inspect install.ps1, setup.iss, and service architecture"
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Scripts</span>
          </button>
        </div>
      </div>

      {/* Store & Register Selectors Bar (Guarantees isolation per Store -> Register -> Device) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Store Selector */}
          <div className="flex items-center space-x-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Store:</label>
            <select
              value={selectedStoreId}
              onChange={e => handleStoreChange(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-sky-500 cursor-pointer"
            >
              {stores.map(st => (
                <option key={st.id} value={st.id}>
                  {st.name} ({st.storeNumber})
                </option>
              ))}
            </select>
          </div>

          {/* Register Selector */}
          <div className="flex items-center space-x-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Register:</label>
            <select
              value={selectedRegisterId}
              onChange={e => handleRegisterChange(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-amber-300 focus:outline-none focus:border-amber-400 cursor-pointer"
            >
              {currentStore.registers.map(r => (
                <option key={r.id} value={r.id}>
                  {r.name} [{r.computerName}]
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Isolation Acceptance Criteria Notice */}
        <div className="flex items-center space-x-2 text-[11px] text-slate-400 bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            Hardware settings are strictly isolated per register. Changing <strong>{currentRegister.name}</strong> will not alter other registers.
          </span>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex items-center space-x-2 border-b border-slate-800 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setViewTab('diagnostics')}
          className={`px-4 py-2.5 rounded-t-xl text-xs font-black uppercase tracking-wider flex items-center space-x-2 transition-colors cursor-pointer border-b-2 ${
            viewTab === 'diagnostics'
              ? 'border-amber-400 text-amber-400 bg-slate-900/60'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-4 h-4 text-amber-400" />
          <span>Hardware Diagnostics</span>
        </button>

        <button
          type="button"
          onClick={() => setViewTab('manager')}
          className={`px-4 py-2.5 rounded-t-xl text-xs font-black uppercase tracking-wider flex items-center space-x-2 transition-colors cursor-pointer border-b-2 ${
            viewTab === 'manager'
              ? 'border-sky-400 text-sky-400 bg-slate-900/60'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Register Hardware Table</span>
        </button>

        <button
          type="button"
          onClick={() => setViewTab('discovery')}
          className={`px-4 py-2.5 rounded-t-xl text-xs font-black uppercase tracking-wider flex items-center space-x-2 transition-colors cursor-pointer border-b-2 ${
            viewTab === 'discovery'
              ? 'border-sky-400 text-sky-400 bg-slate-900/60'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Usb className="w-4 h-4" />
          <span>Discovered Devices Fleet ({discoveredDevices.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setViewTab('single_installer')}
          className={`px-4 py-2.5 rounded-t-xl text-xs font-black uppercase tracking-wider flex items-center space-x-2 transition-colors cursor-pointer border-b-2 ${
            viewTab === 'single_installer'
              ? 'border-[#C5A059] text-[#C5A059] bg-slate-900/60'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Download className="w-4 h-4 text-[#C5A059]" />
          <span>Single POS Installer (WiX / Inno Setup)</span>
        </button>

        <button
          type="button"
          onClick={() => setViewTab('architecture')}
          className={`px-4 py-2.5 rounded-t-xl text-xs font-black uppercase tracking-wider flex items-center space-x-2 transition-colors cursor-pointer border-b-2 ${
            viewTab === 'architecture'
              ? 'border-sky-400 text-sky-400 bg-slate-900/60'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Bridge Pipeline & Security</span>
        </button>

        <button
          type="button"
          onClick={() => setViewTab('deployment')}
          className={`px-4 py-2.5 rounded-t-xl text-xs font-black uppercase tracking-wider flex items-center space-x-2 transition-colors cursor-pointer border-b-2 ${
            viewTab === 'deployment'
              ? 'border-sky-400 text-sky-400 bg-slate-900/60'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <HardDrive className="w-4 h-4" />
          <span>Windows Service & Updates</span>
        </button>

        <button
          type="button"
          onClick={() => setViewTab('logs')}
          className={`px-4 py-2.5 rounded-t-xl text-xs font-black uppercase tracking-wider flex items-center space-x-2 transition-colors cursor-pointer border-b-2 ${
            viewTab === 'logs'
              ? 'border-sky-400 text-sky-400 bg-slate-900/60'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Diagnostics & Audit Logs</span>
        </button>
      </div>

      {/* TAB 0: Real Hardware Diagnostics Matrix & Troubleshooting (Admin -> Hardware -> Diagnostics) */}
      {viewTab === 'diagnostics' && (
        <HardwareDiagnosticsTab />
      )}

      {/* TAB 1: Centralized Hardware Manager Table (User Story 3 Spec) */}
      {viewTab === 'manager' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-white flex items-center space-x-2">
                <span>Active Hardware Assigned to {currentRegister.name}</span>
                <span className="text-slate-500 font-mono text-xs">({currentStore.name})</span>
              </h2>
              <p className="text-xs text-slate-400">
                Direct ESC/POS spooler, RJ12 drawer kick, HID scanner, secondary monitor, and semi-integrated terminal bindings.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              {onOpenCustomerDisplay && (
                <button
                  type="button"
                  onClick={onOpenCustomerDisplay}
                  className="px-3 py-1.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40 text-xs font-bold flex items-center space-x-1.5 hover:bg-purple-500/30 transition-all cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Launch Customer Display (Screen 2)</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleScanDevices}
                disabled={isScanning}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 text-xs font-bold border border-slate-700 flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                <span>{isScanning ? 'Probing...' : 'Discover Hardware'}</span>
              </button>
            </div>
          </div>

          {/* Real-time Discovery Result Notice */}
          {discoverySummaryModal?.open && (
            <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-emerald-200 animate-in fade-in shadow-md">
              <div className="space-y-1">
                <div className="flex items-center space-x-2 font-bold text-white">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    Hardware Auto-Discovery Succeeded: Linked {discoverySummaryModal.count} Live Devices to {currentRegister.name}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 text-[11px] text-emerald-300">
                  {discoverySummaryModal.summary.map((s, idx) => (
                    <span key={idx} className="bg-emerald-900/40 border border-emerald-700/50 px-2.5 py-0.5 rounded-lg">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDiscoverySummaryModal(null)}
                className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold text-xs border border-emerald-500/40 cursor-pointer shrink-0 self-start sm:self-center"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Visual Health Status Cards for Discovered Hardware (Printer, Scanner, Cash Drawer, Display) using DeviceState */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0A0D14] p-4 rounded-2xl border border-slate-800 shadow-md">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30 shadow-inner">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-white font-mono flex items-center space-x-2">
                    <span>Discovered Hardware Health Cards (DeviceState Telemetry)</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                      Live Telemetry
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Real-time Bridge validation: <strong className="text-slate-200">IsConfigured</strong>, <strong className="text-slate-200">IsWindowsDetected</strong>, <strong className="text-slate-200">IsNetworkReachable</strong>, and <strong className="text-slate-200">IsResponding</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 self-start sm:self-center">
                <span className="text-[11px] font-mono px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 flex items-center space-x-2">
                  <span className={`w-2 h-2 rounded-full ${telemetry.bridgeStatus === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                  <span>Bridge: <strong className="text-white font-bold">{telemetry.bridgeStatus.toUpperCase()}</strong> ({telemetry.latencyMs}ms)</span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {coreDeviceStates.map(ds => (
                <DeviceHealthStatusCard
                  key={ds.id}
                  deviceState={ds}
                  onTestDevice={() => handleTestCategory(ds.category as keyof RegisterHardwareMapping)}
                  onConfigureDevice={() => handleOpenConfigure(ds.category as keyof RegisterHardwareMapping)}
                  onProbeDevice={handleProbeDeviceFromCard}
                  isTesting={isTestingInProgress}
                />
              ))}
            </div>
          </div>

          {/* User Story Table Spec: Hardware | Device | Status | Action */}
          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60 shadow-md">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-black uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Hardware</th>
                  <th className="py-3 px-4">Device</th>
                  <th className="py-3 px-4">Interface / Port</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Diagnostic Test</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {(
                  [
                    'receipt_printer',
                    'cash_drawer',
                    'barcode_scanner',
                    'customer_display',
                    'scale',
                    'card_terminal',
                  ] as Array<keyof RegisterHardwareMapping>
                ).map(catKey => {
                  const item = hardwareMapping[catKey];
                  return (
                    <tr key={catKey} className="hover:bg-slate-850/50 transition-colors">
                      {/* Hardware Category */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-8 h-8 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0">
                            {getCategoryIcon(catKey)}
                          </div>
                          <span className="font-black text-white text-xs tracking-wide">
                            {item.categoryLabel}
                          </span>
                        </div>
                      </td>

                      {/* Device Assigned */}
                      <td className="py-3.5 px-4">
                        <div>
                          <div className="font-bold text-slate-100 flex items-center space-x-1.5">
                            <span>{item.deviceName}</span>
                            {item.isDefault && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-sky-500/20 text-sky-300 border border-sky-500/30">
                                Default
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Mfg: <span className="text-slate-300">{item.manufacturer}</span>
                          </div>
                        </div>
                      </td>

                      {/* Interface / Port */}
                      <td className="py-3.5 px-4 font-mono text-[11px]">
                        <div className="flex items-center space-x-1.5 text-slate-300">
                          {getConnectionIcon(item.connectionType)}
                          <span>{item.portOrEndpoint}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border flex items-center space-x-1.5 w-fit ${
                            item.status === 'Ready' || item.status === 'Connected'
                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                              : item.status === 'Unknown'
                              ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                              : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              item.status === 'Ready' || item.status === 'Connected'
                                ? 'bg-emerald-400'
                                : item.status === 'Unknown'
                                ? 'bg-amber-400'
                                : 'bg-rose-400'
                            }`}
                          />
                          <span>{item.status}</span>
                        </span>
                      </td>

                      {/* Diagnostic Test Status */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => handleTestCategory(catKey)}
                            disabled={isTestingInProgress}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold border border-slate-700 flex items-center space-x-1 cursor-pointer disabled:opacity-50 transition-transform active:scale-95"
                          >
                            <Play className="w-2.5 h-2.5 text-amber-400" />
                            <span>Test</span>
                          </button>
                          <span
                            className={`text-[10px] font-bold uppercase ${
                              item.testStatus === 'Passed'
                                ? 'text-emerald-400'
                                : item.testStatus === 'Failed'
                                ? 'text-rose-400'
                                : item.testStatus === 'Testing'
                                ? 'text-amber-400 animate-pulse'
                                : 'text-slate-500'
                            }`}
                          >
                            {item.testStatus}
                          </span>
                        </div>
                      </td>

                      {/* Action: Configure */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenConfigure(catKey)}
                          className="px-3.5 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-xs cursor-pointer hover:shadow-sky-500/20 active:scale-95"
                        >
                          Configure
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: All Discovered Devices Fleet */}
      {viewTab === 'discovery' && (
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-white flex items-center space-x-2">
                <span>Hardware & Same-Network Peripherals Discovery</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  {discoveredDevices.length} Total Nodes
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {discoveredDevices.filter(d => (d.isPhysicalHardware || d.isNetworkDevice || d.connectionType === 'network' || d.connectionType === 'usb' || d.connectionType === 'hid') && !d.isBuiltInDefault).length} Live Detected
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Probing physical WebUSB/WebHID buses, Windows system monitors, and active local network subnet endpoints.
              </p>
            </div>

            {/* Hardware & Network Action Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleScanDevices}
                disabled={isScanning}
                className="px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-black uppercase tracking-wider flex items-center space-x-1.5 cursor-pointer shadow-md transition-all active:scale-95 disabled:opacity-50"
                title="Scan connected physical USB/HID hardware and same-network subnet devices"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                <span>{isScanning ? 'Scanning...' : 'Scan Peripherals Now'}</span>
              </button>

              <button
                type="button"
                onClick={handlePairUsb}
                disabled={pairingActive === 'usb'}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center space-x-1.5 cursor-pointer transition-all active:scale-95"
                title="Pair physical USB printer or scanner via browser WebUSB"
              >
                <Usb className={`w-3.5 h-3.5 text-emerald-400 ${pairingActive === 'usb' ? 'animate-spin' : ''}`} />
                <span>Pair USB Device</span>
              </button>

              <button
                type="button"
                onClick={handlePairHid}
                disabled={pairingActive === 'hid'}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center space-x-1.5 cursor-pointer transition-all active:scale-95"
                title="Pair physical barcode scanner via browser WebHID"
              >
                <ScanBarcode className={`w-3.5 h-3.5 text-sky-400 ${pairingActive === 'hid' ? 'animate-spin' : ''}`} />
                <span>Pair HID Scanner</span>
              </button>

              <button
                type="button"
                onClick={handlePairSerial}
                disabled={pairingActive === 'serial'}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center space-x-1.5 cursor-pointer transition-all active:scale-95"
                title="Pair serial COM port for scale or drawer via Web Serial"
              >
                <Terminal className={`w-3.5 h-3.5 text-amber-400 ${pairingActive === 'serial' ? 'animate-spin' : ''}`} />
                <span>Pair COM Port</span>
              </button>

              <button
                type="button"
                onClick={() => setCustomProbeModal({ open: true, ip: '192.168.1.120', port: 9100, loading: false })}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-purple-300 text-xs font-bold border border-slate-700 flex items-center space-x-1.5 cursor-pointer transition-all active:scale-95"
                title="Probe specific IP and port on same local network subnet"
              >
                <Network className="w-3.5 h-3.5 text-purple-400" />
                <span>Probe Network IP</span>
              </button>
            </div>
          </div>

          {pairError && (
            <div className="bg-amber-950/40 border border-amber-800/40 rounded-2xl p-3 flex items-center justify-between text-xs text-amber-200 animate-in fade-in">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{pairError}</span>
              </div>
              <button
                type="button"
                onClick={() => setPairError(null)}
                className="text-amber-400 hover:text-white font-bold text-xs cursor-pointer ml-3"
              >
                Dismiss
              </button>
            </div>
          )}

          {isScanning && (
            <div className="bg-sky-950/40 border border-sky-800/40 rounded-2xl p-3 flex items-center space-x-3 text-xs text-sky-200">
              <RefreshCw className="w-4 h-4 text-sky-400 animate-spin shrink-0" />
              <span>{scanStage}</span>
            </div>
          )}

          {/* Fleet Filter Tabs & Filter Local Only Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2 text-xs font-bold">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setFleetFilter('all')}
                className={`px-3 py-1.5 rounded-xl cursor-pointer transition-colors ${
                  fleetFilter === 'all'
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All Discovered Peripherals ({discoveredDevices.length})
              </button>
              <button
                type="button"
                onClick={() => setFleetFilter('connected')}
                className={`px-3 py-1.5 rounded-xl cursor-pointer transition-colors ${
                  fleetFilter === 'connected'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Physical & Same-Network Hardware ({
                  discoveredDevices.filter(d => (d.isPhysicalHardware || d.isNetworkDevice || d.connectionType === 'network' || d.connectionType === 'usb' || d.connectionType === 'hid') && !d.isBuiltInDefault).length
                })
              </button>
              <button
                type="button"
                onClick={() => setFleetFilter('defaults')}
                className={`px-3 py-1.5 rounded-xl cursor-pointer transition-colors ${
                  fleetFilter === 'defaults'
                    ? 'bg-slate-800 text-slate-200 border border-slate-700'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Built-in System Drivers & Fallbacks
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setFleetViewMode('cards')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    fleetViewMode === 'cards'
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Health Status Cards
                </button>
                <button
                  type="button"
                  onClick={() => setFleetViewMode('table')}
                  className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    fleetViewMode === 'table'
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Data Table
                </button>
              </div>

              <button
                type="button"
                onClick={handleToggleFilterLocalOnly}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer transition-colors border ${
                  filterLocalOnly
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                }`}
                title="Filter out virtual software fallbacks and built-in seeds, prioritizing only physical USB/HID/Serial and live network hardware"
              >
                <Filter className="w-3.5 h-3.5" />
                <span>Filter Physical / Live Only: <strong>{filterLocalOnly ? 'ON' : 'OFF'}</strong></span>
              </button>
            </div>
          </div>

          {/* Cards View vs Data Table View */}
          {fleetViewMode === 'cards' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredFleetDevices.length === 0 ? (
                  <div className="col-span-full text-center py-12 text-slate-400 bg-slate-900/40 rounded-2xl border border-slate-800">
                    <Usb className="w-8 h-8 text-slate-600 mb-2 mx-auto" />
                    <span className="text-sm font-bold text-slate-300 block">No Discovered Devices Match Filter</span>
                    <p className="text-xs text-slate-500 mt-1">Plug in peripheral hardware or adjust your fleet filter.</p>
                  </div>
                ) : (
                  filteredFleetDevices.map(dev => {
                    const ds = DeviceState.fromDiscoveredDevice(dev, hardwareMapping, telemetry);
                    return (
                      <DeviceHealthStatusCard
                        key={ds.id}
                        deviceState={ds}
                        onTestDevice={() => {
                          let targetCat: keyof RegisterHardwareMapping = 'receipt_printer';
                          if (dev.category === 'cash_drawer') targetCat = 'cash_drawer';
                          else if (dev.category === 'barcode_scanner') targetCat = 'barcode_scanner';
                          else if (dev.category === 'customer_display') targetCat = 'customer_display';
                          else if (dev.category === 'scale') targetCat = 'scale';
                          else if (dev.category === 'payment_terminal') targetCat = 'card_terminal';
                          handleTestCategory(targetCat);
                        }}
                        onConfigureDevice={() => {
                          let targetCat: keyof RegisterHardwareMapping = 'receipt_printer';
                          if (dev.category === 'cash_drawer') targetCat = 'cash_drawer';
                          else if (dev.category === 'barcode_scanner') targetCat = 'barcode_scanner';
                          else if (dev.category === 'customer_display') targetCat = 'customer_display';
                          else if (dev.category === 'scale') targetCat = 'scale';
                          else if (dev.category === 'payment_terminal') targetCat = 'card_terminal';
                          handleOpenConfigure(targetCat);
                        }}
                        onProbeDevice={handleProbeDeviceFromCard}
                      />
                    );
                  })
                )}
              </div>
            </div>
          ) : (
          /* Full Discovered Fleet Table */
          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60 shadow-md">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-black uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Device Name & Origin</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Manufacturer</th>
                  <th className="py-3 px-4">Connection</th>
                  <th className="py-3 px-4">IP / COM Port</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Connect to Function</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {discoveredDevices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400">
                      <div className="flex flex-col items-center justify-center space-y-2 max-w-md mx-auto">
                        <Usb className="w-8 h-8 text-slate-600 mb-1" />
                        <span className="text-sm font-bold text-slate-300">No Physical Peripherals Detected</span>
                        <p className="text-xs text-slate-500 leading-relaxed text-center">
                          No external receipt printers, barcode scanners, or serial devices are currently plugged into this computer or responding on the same network. Plug in your hardware and click <strong>Scan Peripherals Now</strong>, or install the POS Hardware Bridge.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  discoveredDevices
                    .filter(dev => {
                      if (fleetFilter === 'connected') {
                        return (dev.isPhysicalHardware || dev.isNetworkDevice || dev.connectionType === 'network' || dev.connectionType === 'usb' || dev.connectionType === 'hid') && !dev.isBuiltInDefault;
                      }
                      if (fleetFilter === 'defaults') {
                        return !!dev.isBuiltInDefault;
                      }
                      return true;
                    })
                    .map(dev => {
                      return (
                        <tr key={dev.deviceKey} className="hover:bg-slate-850/50 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-white flex items-center space-x-2 flex-wrap gap-1">
                              <span>{dev.name}</span>
                              {dev.isPhysicalHardware && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1">
                                  <Usb className="w-2.5 h-2.5" />
                                  <span>Physical Hardware</span>
                                </span>
                              )}
                              {dev.isNetworkDevice && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center space-x-1">
                                  <Network className="w-2.5 h-2.5" />
                                  <span>Network: {dev.networkName || 'LAN Subnet'}</span>
                                </span>
                              )}
                              {dev.isBuiltInDefault && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                                  Default / Fallback
                                </span>
                              )}
                              {dev.isAssigned && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                                  Assigned
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1">
                              {dev.details || dev.deviceKey}
                            </div>
                          </td>

                          <td className="py-3 px-4 font-semibold text-slate-300 uppercase text-[10px]">
                            {dev.category.replace('_', ' ')}
                          </td>

                          <td className="py-3 px-4 text-slate-300">{dev.manufacturer}</td>

                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-1.5 text-slate-300 uppercase text-[10px] font-mono">
                              {getConnectionIcon(dev.connectionType)}
                              <span>
                                {dev.connectionType === 'network'
                                  ? (dev.networkName || 'Network')
                                  : dev.connectionType}
                              </span>
                            </div>
                          </td>

                        <td className="py-3 px-4 font-mono text-[11px] text-sky-300">
                          {dev.ipAddress ? (
                            <div className="flex items-center space-x-1">
                              <span>{dev.ipAddress}:{dev.port || 9100}</span>
                              <button
                                type="button"
                                onClick={() => handleProbeEndpoint(dev.ipAddress!, dev.port || 9100)}
                                className="p-0.5 rounded hover:bg-slate-700 text-slate-400 hover:text-sky-300"
                                title="Probe this IP endpoint"
                              >
                                <Search className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            dev.usbComIdentifier || dev.technicalInfo?.endpoint || 'N/A'
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex flex-col">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase w-fit ${
                                dev.status === 'Ready' || dev.status === 'Connected'
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : 'bg-rose-500/20 text-rose-300'
                              }`}
                            >
                              {dev.status}
                            </span>
                            {dev.latencyMs ? (
                              <span className="text-[10px] text-slate-500 font-mono mt-0.5">
                                {dev.latencyMs}ms ping
                              </span>
                            ) : null}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              let targetCat: keyof RegisterHardwareMapping = 'receipt_printer';
                              if (dev.category === 'cash_drawer') targetCat = 'cash_drawer';
                              else if (dev.category === 'barcode_scanner') targetCat = 'barcode_scanner';
                              else if (dev.category === 'customer_display') targetCat = 'customer_display';
                              else if (dev.category === 'scale') targetCat = 'scale';
                              else if (dev.category === 'payment_terminal') targetCat = 'card_terminal';

                              storeRegisterHardwareService.assignDeviceToRegister(
                                selectedStoreId,
                                selectedRegisterId,
                                targetCat,
                                dev,
                                true
                              );
                              setHardwareMapping(storeRegisterHardwareService.getRegisterHardware(selectedStoreId, selectedRegisterId));
                              playBeep('success');
                            }}
                            className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 font-bold text-[11px] border border-slate-700 cursor-pointer active:scale-95"
                          >
                            Set Default for {currentRegister.id}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )}

    {/* TAB: SINGLE POS INSTALLER (Inno Setup & WiX Toolset) */}
      {viewTab === 'single_installer' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Top Banner */}
          <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-sky-950/40 border border-amber-500/30 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 rounded-2xl bg-[#C5A059]/20 border border-[#C5A059]/40 flex items-center justify-center text-[#C5A059] shrink-0 shadow-lg">
                  <Download className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-base font-black text-white uppercase tracking-wider">
                      Single Unified POS Windows Installer Engine
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      Zero Manual Extraction
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed max-w-2xl">
                    Customers download and run a single installer executable (<strong>KaBiRa-POS-Installer-Setup.exe</strong>). The installer deploys the POS application, registers the .NET 8 Worker Service as an automatic Windows Service, configures firewall loopback rules, and starts the bridge in the background without user terminal commands.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={handleDownloadSingleInstaller}
                  disabled={isDownloadingExe}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#C5A059] hover:bg-[#D4AF37] text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-2 cursor-pointer shadow-lg transition-transform active:scale-95 disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>{isDownloadingExe ? 'Compiling Installer...' : 'Download Installer (.exe)'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleRunInstallerSimulation}
                  disabled={isSimulatingInstaller}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-2 cursor-pointer shadow-lg transition-transform active:scale-95 disabled:opacity-50"
                >
                  <Play className={`w-4 h-4 ${isSimulatingInstaller ? 'animate-spin' : ''}`} />
                  <span>{isSimulatingInstaller ? 'Simulating Installation...' : 'Run 1-Click Simulation'}</span>
                </button>
              </div>
            </div>

            {/* Post-Installation Flow Verification */}
            <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
              <div className="flex items-center space-x-3 text-slate-300">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>
                  <strong>Post-Installation Auto-Discovery:</strong> When installation concludes, the POS launches automatically, discovers connected peripherals, and allows the administrator to connect and save defaults for <strong>{currentRegister.name}</strong>.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setViewTab('manager')}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 font-bold text-xs flex items-center space-x-1.5 cursor-pointer shrink-0 border border-slate-700"
              >
                <span>Open Hardware Manager</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Interactive 1-Click Installer Setup Simulation Terminal */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Terminal className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-black uppercase tracking-wider text-white">
                  Windows Installer Execution Console (Inno Setup / WiX)
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {isSimulatingInstaller ? `${installerProgress}% In Progress` : 'Ready for 1-Click Test'}
              </span>
            </div>

            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-amber-300">
                  {installerStepText || 'Ready to run single installer simulation on Windows terminal.'}
                </span>
                <span className="font-mono text-slate-400">{installerProgress}%</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 via-sky-400 to-emerald-400 transition-all duration-300"
                  style={{ width: `${installerProgress}%` }}
                />
              </div>
            </div>

            {/* Terminal Log window */}
            <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 font-mono text-[11px] text-slate-300 space-y-1.5 max-h-56 overflow-y-auto shadow-inner">
              {installerLogs.length === 0 ? (
                <div className="text-slate-600 py-4 text-center">
                  Click &quot;Run 1-Click Simulation&quot; above to simulate fresh Windows terminal installation without extracting ZIP files.
                </div>
              ) : (
                installerLogs.map((log, idx) => (
                  <div key={idx} className="flex items-start space-x-2">
                    <span className="text-slate-500">{`>`}</span>
                    <span
                      className={
                        log.includes('[SUCCESS]') || log.includes('[READY]')
                          ? 'text-emerald-400 font-bold'
                          : log.includes('[SERVICE]') || log.includes('[PREREQ]')
                          ? 'text-sky-300'
                          : 'text-slate-300'
                      }
                    >
                      {log}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* WiX Toolset vs Inno Setup Architecture & Code Viewer */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center space-x-2">
                  <FileCode className="w-4 h-4 text-[#C5A059]" />
                  <span>Installer Packaging Configurations (Inno Setup & WiX Toolset)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Production-grade scripts for compiling standalone setup executables and enterprise MSI packages
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setInstallerScriptTab('inno_setup')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    installerScriptTab === 'inno_setup'
                      ? 'bg-[#C5A059] text-black font-black'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Inno Setup (setup.iss)
                </button>
                <button
                  type="button"
                  onClick={() => setInstallerScriptTab('wix_toolset')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    installerScriptTab === 'wix_toolset'
                      ? 'bg-[#C5A059] text-black font-black'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  WiX Toolset (Product.wxs)
                </button>
              </div>
            </div>

            {/* Script Viewer Container */}
            <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 font-mono text-[11px] text-slate-300 whitespace-pre-wrap overflow-x-auto max-h-96 select-text">
              {installerScriptTab === 'inno_setup'
                ? storeRegisterHardwareService.getInnoSetupScript()
                : storeRegisterHardwareService.getWixToolsetScript()}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: POS Bridge Architectural Pipeline & Security */}
      {viewTab === 'architecture' && (
        <div className="space-y-6">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-black uppercase tracking-wider text-white flex items-center space-x-2">
              <Layers className="w-4 h-4 text-sky-400" />
              <span>POS Application to Physical Device Communication Pipeline</span>
            </h2>

            {/* Visual Flow diagram: POS App -> Local Bridge API -> Device Discovery -> Hardware Adapters -> Physical Devices */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-2">
              <div className="bg-slate-950 p-4 rounded-xl border border-sky-500/30 text-center flex flex-col justify-between">
                <div className="text-[10px] font-black uppercase text-sky-400 tracking-wider">Layer 1</div>
                <div className="my-2">
                  <Laptop className="w-6 h-6 text-sky-400 mx-auto mb-1" />
                  <div className="text-xs font-black text-white">Web POS App</div>
                  <div className="text-[10px] text-slate-400 mt-1">Browser / WebView2 UI</div>
                </div>
                <div className="text-[9px] text-slate-500 font-mono">React 19 Frontend</div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-emerald-500/30 text-center flex flex-col justify-between">
                <div className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">Layer 2</div>
                <div className="my-2">
                  <Server className="w-6 h-6 text-emerald-400 mx-auto mb-1" />
                  <div className="text-xs font-black text-white">Local Bridge API</div>
                  <div className="text-[10px] text-slate-400 mt-1">http://127.0.0.1:5055</div>
                </div>
                <div className="text-[9px] text-emerald-400 font-mono">Bearer Token Auth</div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-amber-500/30 text-center flex flex-col justify-between">
                <div className="text-[10px] font-black uppercase text-amber-400 tracking-wider">Layer 3</div>
                <div className="my-2">
                  <Usb className="w-6 h-6 text-amber-400 mx-auto mb-1" />
                  <div className="text-xs font-black text-white">Device Discovery</div>
                  <div className="text-[10px] text-slate-400 mt-1">PnP, Spooler, COM, mDNS</div>
                </div>
                <div className="text-[9px] text-slate-500 font-mono">PnP Watchdog Daemon</div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-purple-500/30 text-center flex flex-col justify-between">
                <div className="text-[10px] font-black uppercase text-purple-400 tracking-wider">Layer 4</div>
                <div className="my-2">
                  <HardDrive className="w-6 h-6 text-purple-400 mx-auto mb-1" />
                  <div className="text-xs font-black text-white">Hardware Adapters</div>
                  <div className="text-[10px] text-slate-400 mt-1">ESC/POS, RJ12, HID, OPOS</div>
                </div>
                <div className="text-[9px] text-purple-400 font-mono">.NET Native DLLs</div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-blue-500/30 text-center flex flex-col justify-between">
                <div className="text-[10px] font-black uppercase text-blue-400 tracking-wider">Layer 5</div>
                <div className="my-2">
                  <Printer className="w-6 h-6 text-blue-400 mx-auto mb-1" />
                  <div className="text-xs font-black text-white">Physical Devices</div>
                  <div className="text-[10px] text-slate-400 mt-1">Thermal, Drawer, Scale</div>
                </div>
                <div className="text-[9px] text-slate-500 font-mono">USB / COM / Ethernet</div>
              </div>
            </div>

            {/* Cloud Admin Portal telemetry sink */}
            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2 text-slate-300">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span>
                  <strong>Cloud Admin Sync:</strong> Active register telemetry transmitted every 5 seconds to Cloud Portal (/api/bridge/telemetry).
                </span>
              </div>
              <span className="text-[10px] text-emerald-400 font-mono">Status: Synced & Online</span>
            </div>
          </div>

          {/* Security & Authenticode Certification */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center space-x-2">
              <Lock className="w-4 h-4 text-emerald-400" />
              <span>Security, Loopback Isolation & Authenticode Code Signature</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                <div className="font-bold text-white flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Loopback Bound (127.0.0.1)</span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  The POS Bridge listens strictly on loopback port 5055 with Windows Firewall loopback protection. It does not accept any external internet requests.
                </p>
                <div className="text-[10px] font-mono text-slate-500">
                  Auth: Bearer {telemetry.authToken}
                </div>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                <div className="font-bold text-white flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-sky-400" />
                  <span>Digital Authenticode Signature</span>
                </div>
                <div className="text-slate-400 space-y-1 text-[11px]">
                  <div>Subject: <span className="text-slate-200">{telemetry.signedCertificate.subject}</span></div>
                  <div>Issuer: <span className="text-slate-200">{telemetry.signedCertificate.issuer}</span></div>
                  <div>Thumbprint: <span className="text-slate-300 font-mono">{telemetry.signedCertificate.thumbprint}</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Windows Service & Silent Updates with Rollback */}
      {viewTab === 'deployment' && (
        <div className="space-y-6">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-black uppercase tracking-wider text-white flex items-center space-x-2">
                  <HardDrive className="w-4 h-4 text-amber-400" />
                  <span>Windows Background Service Deployment & Updates</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Installed via sc.exe create • Starts automatically before user login • Restarts on crash
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => storeRegisterHardwareService.triggerBridgeUpdate(false)}
                  disabled={updateStatus.isUpdating}
                  className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black uppercase tracking-wider flex items-center space-x-1.5 cursor-pointer shadow-md transition-all active:scale-95 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${updateStatus.isUpdating ? 'animate-spin' : ''}`} />
                  <span>{updateStatus.isUpdating ? 'Updating Bridge...' : 'Update Bridge from Admin Portal'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => storeRegisterHardwareService.triggerBridgeUpdate(true)}
                  disabled={updateStatus.isUpdating}
                  className="px-3 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-bold border border-rose-500/40 flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                  title="Simulates a failed hardware health check and verifies instant rollback"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Simulate Update with Rollback</span>
                </button>
              </div>
            </div>

            {/* Update Progress Banner */}
            {updateStatus.isUpdating && (
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-amber-300 uppercase tracking-wide">
                    Step: {updateStatus.step.replace(/_/g, ' ')}
                  </span>
                  <span className="font-mono text-slate-400">{updateStatus.progress}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-sky-400 to-emerald-400 transition-all duration-300"
                    style={{ width: `${updateStatus.progress}%` }}
                  />
                </div>
                <p className="text-xs text-slate-300 font-mono">{updateStatus.message}</p>
              </div>
            )}

            {/* Update Status Summary */}
            {!updateStatus.isUpdating && updateStatus.message && (
              <div
                className={`p-4 rounded-2xl border text-xs flex items-center space-x-3 ${
                  updateStatus.rollbackOccurred
                    ? 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                    : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                }`}
              >
                {updateStatus.rollbackOccurred ? (
                  <RotateCcw className="w-5 h-5 text-rose-400 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                )}
                <div className="flex-1">
                  <div className="font-bold">{updateStatus.message}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                    Current Version: v{storeRegisterHardwareService.getTelemetrySnapshot().bridgeVersion} • Service: KaBiRaPOSBridge.exe
                  </div>
                </div>
              </div>
            )}

            {/* Deployment Package Details */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">
                Package Contents for POSBridge.zip
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs font-mono">
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">POSBridge.exe</div>
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">POSBridge.Service.exe</div>
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">config.json</div>
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">updater.exe</div>
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">install.ps1</div>
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">uninstall.ps1</div>
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">/drivers (INF & CCO)</div>
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">/adapters (DLL plugins)</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: Diagnostics & Audit Logs */}
      {viewTab === 'logs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-wider text-white">
              Hardware Bridge Event Telemetry & Audit Logs
            </h2>
            <button
              type="button"
              onClick={() => {
                const logs = deviceDiscovery.getAuditLogs();
                const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `bridge-audit-logs-${new Date().toISOString().slice(0, 10)}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="text-xs font-bold text-sky-400 hover:text-sky-300 flex items-center space-x-1 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Audit JSON</span>
            </button>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 font-mono text-[11px] space-y-2 max-h-[420px] overflow-y-auto">
            {deviceDiscovery.getAuditLogs().map(entry => (
              <div key={entry.id} className="border-b border-slate-900 pb-2 flex items-start space-x-2">
                <span className="text-slate-500 text-[10px]">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-slate-800 text-slate-300">
                  {entry.action}
                </span>
                <span className="text-slate-200 font-semibold">{entry.deviceName}</span>
                <span className="text-slate-400 flex-1">{entry.details}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: Configure Hardware Device Drawer / Dialog */}
      {configuringCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-[#0B0F19] border border-slate-700 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden text-slate-100 flex flex-col">
            <div className="bg-slate-900 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-400">
                  {getCategoryIcon(configuringCategory)}
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-white">
                    Configure {hardwareMapping[configuringCategory].categoryLabel}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Register: <strong className="text-sky-300">{currentRegister.name}</strong> • Store: {currentStore.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfiguringCategory(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                Select Discovered Device to Assign:
              </label>

              <div className="space-y-2">
                {discoveredDevices
                  .filter(
                    d =>
                      d.category === configuringCategory ||
                      (configuringCategory === 'card_terminal' && d.category === 'payment_terminal') ||
                      d.category === 'software_service'
                  )
                  .map(dev => (
                    <div
                      key={dev.deviceKey}
                      onClick={() => setSelectedDeviceKeyForAssign(dev.deviceKey)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                        selectedDeviceKeyForAssign === dev.deviceKey
                          ? 'bg-sky-950/60 border-sky-500 text-white shadow-md'
                          : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="font-bold text-xs flex items-center space-x-2">
                          <span>{dev.name}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                              dev.status === 'Ready' || dev.status === 'Connected'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-rose-500/20 text-rose-300'
                            }`}
                          >
                            {dev.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {dev.manufacturer} • {dev.connectionType.toUpperCase()} •{' '}
                          {dev.ipAddress ? `${dev.ipAddress}:${dev.port || 9100}` : (dev.usbComIdentifier || dev.technicalInfo?.endpoint)}
                        </div>
                      </div>

                      <div className="w-5 h-5 rounded-full border flex items-center justify-center shrink-0 border-slate-600">
                        {selectedDeviceKeyForAssign === dev.deviceKey && (
                          <div className="w-3 h-3 rounded-full bg-sky-400" />
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="bg-slate-950 px-6 py-4 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Configuration saves specifically to <strong>{currentRegister.id}</strong>.
              </span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setConfiguringCategory(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveDeviceAssignment}
                  className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs uppercase tracking-wider cursor-pointer shadow-md"
                >
                  Save Configuration
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Test Diagnostic Result */}
      {testResultModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-[#0B0F19] border border-slate-700 rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden text-slate-100 flex flex-col">
            <div className="bg-slate-900 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                {testResultModal.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                )}
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-white">
                    {testResultModal.categoryLabel} Diagnostic Test Result
                  </h3>
                  <p className="text-xs text-slate-400">{testResultModal.deviceName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTestResultModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div
                className={`p-3.5 rounded-2xl border text-xs font-medium leading-relaxed ${
                  testResultModal.success
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                    : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                }`}
              >
                {testResultModal.message}
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Bridge Diagnostic Log:
                </label>
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300">
                  {testResultModal.log}
                </div>
              </div>
            </div>

            <div className="bg-slate-950 px-6 py-3.5 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setTestResultModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer"
              >
                Close Diagnostic
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Deployment Package Inspector (install.ps1, config.json, etc.) */}
      {showPackageInspector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-[#0B0F19] border border-slate-700 rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden text-slate-100 flex flex-col max-h-[85vh]">
            <div className="bg-slate-900 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <FileCode className="w-5 h-5 text-sky-400" />
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-white">
                    POSBridge.zip Package Inspector
                  </h3>
                  <p className="text-xs text-slate-400">
                    Silent Windows Service installer, uninstaller, and config for Register {currentRegister.id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPackageInspector(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-950 px-6 py-2 border-b border-slate-800 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setInspectorFile('setup.iss')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer ${
                  inspectorFile === 'setup.iss' ? 'bg-[#C5A059] text-black font-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                Inno Setup (setup.iss)
              </button>
              <button
                type="button"
                onClick={() => setInspectorFile('Product.wxs')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer ${
                  inspectorFile === 'Product.wxs' ? 'bg-[#C5A059] text-black font-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                WiX Toolset (Product.wxs)
              </button>
              <button
                type="button"
                onClick={() => setInspectorFile('install.ps1')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer ${
                  inspectorFile === 'install.ps1' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40' : 'text-slate-400 hover:text-white'
                }`}
              >
                install.ps1 (Service Script)
              </button>
              <button
                type="button"
                onClick={() => setInspectorFile('uninstall.ps1')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer ${
                  inspectorFile === 'uninstall.ps1' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40' : 'text-slate-400 hover:text-white'
                }`}
              >
                uninstall.ps1
              </button>
              <button
                type="button"
                onClick={() => setInspectorFile('config.json')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer ${
                  inspectorFile === 'config.json' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40' : 'text-slate-400 hover:text-white'
                }`}
              >
                config.json (Register Bindings)
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 font-mono text-[11px] bg-slate-950 text-slate-300 leading-relaxed whitespace-pre-wrap select-text">
              {inspectorFile === 'setup.iss' && storeRegisterHardwareService.getInnoSetupScript()}
              {inspectorFile === 'Product.wxs' && storeRegisterHardwareService.getWixToolsetScript()}
              {inspectorFile === 'install.ps1' && (
                `# KaBiRa POS Hardware Bridge - Silent Windows Service Installer
# Registers Windows Service to start automatically before login

$ServiceName = "KaBiRaPOSBridge"
$DisplayName = "KaBiRa Local POS Hardware Bridge Service"
$InstallDir  = "$env:ProgramFiles\\KaBiRa\\POSBridge"
$BinaryPath  = "$InstallDir\\POSBridge.Service.exe"

# 1. Stage binaries and config for Register ${currentRegister.id} (${currentStore.name})
New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
Copy-Item -Path "*.*" -Destination $InstallDir -Recurse -Force

# 2. Register Windows Service (sc.exe create with auto start)
sc.exe create $ServiceName binPath= "\\"$BinaryPath\\"" start= auto DisplayName= "$DisplayName"

# 3. Configure auto-restart on crash recovery
sc.exe failure $ServiceName reset= 86400 actions= restart/5000/restart/10000/restart/30000

# 4. Open Windows loopback firewall port
netsh advfirewall firewall add rule name="KaBiRa POS Bridge 5055" dir=in action=allow protocol=TCP localport=5055 remoteip=127.0.0.1

# 5. Start service
Start-Service -Name $ServiceName
Write-Host ">>> Service installed and running on 127.0.0.1:5055!" -ForegroundColor Green`
              )}

              {inspectorFile === 'uninstall.ps1' && (
                `# KaBiRa POS Hardware Bridge - Service Uninstaller
$ServiceName = "KaBiRaPOSBridge"
Stop-Service -Name $ServiceName -Force
sc.exe delete $ServiceName
netsh advfirewall firewall delete rule name="KaBiRa POS Bridge 5055"
Remove-Item -Path "$env:ProgramFiles\\KaBiRa\\POSBridge" -Recurse -Force
Write-Host ">>> POS Bridge removed."`
              )}

              {inspectorFile === 'config.json' && (
                JSON.stringify(
                  {
                    bridgeVersion: telemetry.bridgeVersion,
                    storeId: currentStore.id,
                    storeName: currentStore.name,
                    registerId: currentRegister.id,
                    registerName: currentRegister.name,
                    computerName: currentRegister.computerName,
                    localApi: {
                      host: '127.0.0.1',
                      port: 5055,
                      authEnabled: true,
                      bearerToken: telemetry.authToken,
                    },
                    hardwareAssignments: hardwareMapping,
                  },
                  null,
                  2
                )
              )}
            </div>

            <div className="bg-slate-900 px-6 py-3 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Single installer configurations for <strong>Inno Setup & WiX Toolset</strong>.
              </span>
              <button
                type="button"
                onClick={() => setShowPackageInspector(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: 1-Click Installation Success & Hardware Auto-Discovery Result */}
      {showInstallerSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-[#0B0F19] border border-emerald-500/50 rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden text-slate-100 flex flex-col">
            <div className="bg-emerald-950/80 px-6 py-4 border-b border-emerald-500/30 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-white">
                    Installation & Auto-Discovery Complete!
                  </h3>
                  <p className="text-xs text-emerald-200">
                    POS Bridge service running automatically in the background
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowInstallerSuccessModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between font-mono">
                  <span className="text-slate-400">Target Register:</span>
                  <span className="font-bold text-white">{currentRegister.name} ({currentRegister.id})</span>
                </div>
                <div className="flex items-center justify-between font-mono">
                  <span className="text-slate-400">Windows Service:</span>
                  <span className="text-emerald-400 font-bold">KaBiRaPOSBridge (Automatic, Running)</span>
                </div>
                <div className="flex items-center justify-between font-mono">
                  <span className="text-slate-400">Localhost Endpoint:</span>
                  <span className="text-sky-300 font-bold">http://127.0.0.1:5055/v1</span>
                </div>
                <div className="flex items-center justify-between font-mono">
                  <span className="text-slate-400">Peripherals Discovered:</span>
                  <span className="text-amber-300 font-bold">{discoveredDevices.length} Connected Devices</span>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                The POS client and hardware bridge have been installed without extracting ZIP files or running command-line commands. You can now test, select, and assign your discovered peripherals as register defaults.
              </p>
            </div>

            <div className="bg-slate-950 px-6 py-4 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Register: <strong className="text-slate-200">{currentRegister.id}</strong>
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowInstallerSuccessModal(false);
                  setViewTab('manager');
                }}
                className="px-4 py-2 rounded-xl bg-[#C5A059] hover:bg-[#D4AF37] text-slate-950 font-black text-xs uppercase tracking-wider cursor-pointer shadow-md transition-transform active:scale-95"
              >
                Configure Register Defaults Now →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Probe Custom Subnet IP / Port */}
      {customProbeModal?.open && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Network className="w-5 h-5 text-purple-400" />
                <h3 className="font-black text-white text-sm uppercase tracking-wider">
                  Probe Network POS Endpoint
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCustomProbeModal(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-300">
                Test direct socket connectivity to a network thermal printer (port 9100), payment terminal (port 12345/10009), or POS bridge on the same local subnet.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    IP Address:
                  </label>
                  <input
                    type="text"
                    value={customProbeModal.ip}
                    onChange={e => setCustomProbeModal({ ...customProbeModal, ip: e.target.value })}
                    placeholder="e.g. 192.168.1.120"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Port:
                  </label>
                  <input
                    type="number"
                    value={customProbeModal.port}
                    onChange={e => setCustomProbeModal({ ...customProbeModal, port: Number(e.target.value) || 9100 })}
                    placeholder="9100"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-purple-500"
                  />
                  <div className="text-[10px] text-slate-500 mt-1">
                    Standard: 9100 (ESC/POS Receipt Printer), 10009 (PAX), 12345 (Clover), 5055 (Local Bridge)
                  </div>
                </div>
              </div>

              {customProbeModal.result && (
                <div
                  className={`p-3 rounded-xl text-xs font-mono border ${
                    customProbeModal.success
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                      : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                  }`}
                >
                  <div className="flex items-center space-x-1.5 font-bold mb-1">
                    {customProbeModal.success ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-rose-400" />
                    )}
                    <span>{customProbeModal.success ? 'Endpoint Online & Responding' : 'Connection Failed'}</span>
                  </div>
                  <div>{customProbeModal.result}</div>
                </div>
              )}
            </div>

            <div className="bg-slate-950 px-6 py-4 border-t border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCustomProbeModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
              >
                Close
              </button>
              <button
                type="button"
                disabled={customProbeModal.loading}
                onClick={() => handleProbeEndpoint(customProbeModal.ip, customProbeModal.port)}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase tracking-wider flex items-center space-x-1.5 shadow-md disabled:opacity-50 cursor-pointer"
              >
                {customProbeModal.loading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Search className="w-3.5 h-3.5" />
                )}
                <span>{customProbeModal.loading ? 'Probing...' : 'Probe Endpoint Now'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
