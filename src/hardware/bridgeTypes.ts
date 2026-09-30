// Canonical Bridge & Hardware Types for Kabira POS
// Authoritative definitions for local Windows Hardware Bridge communication

export type BridgeHealthStatus = 'running' | 'degraded' | 'offline' | 'error';

export interface BridgeHealth {
  status: BridgeHealthStatus;
  version: string;
  machineName?: string;
  serviceRunning: boolean;
  windowsDiscovery: boolean;
  networkDiscovery: boolean;
  lastHeartbeat: string;
  port: number;
  latencyMs?: number;
  error?: string | null;
}

export type HardwareCategory =
  | 'receipt_printer'
  | 'cash_drawer'
  | 'barcode_scanner'
  | 'customer_display'
  | 'scale'
  | 'card_terminal';

export type HardwareConnectionType =
  | 'usb'
  | 'com'
  | 'network'
  | 'windows_spooler'
  | 'hid'
  | 'through_printer';

export interface HardwareTelemetryDetails {
  latencyMs?: number;
  driverName?: string;
  driverStatus?: string;
  paperStatus?: string;
  displayResolution?: string;
  isExtended?: boolean;
  vendorProtocol?: string;
  voltageLevel?: string;
  drawerPort?: string;
  rawPnPId?: string;
  macAddress?: string;
  ipAddress?: string;
  heartbeatAge?: string;
}

export interface DiscoveredHardwareDevice {
  deviceId: string;
  name: string;
  manufacturer: string;
  model?: string;
  category: HardwareCategory;
  connectionType: HardwareConnectionType;
  address: string; // e.g. 'USB001', 'COM3', '192.168.1.150:9100'
  isConfigured: boolean;
  isWindowsDetected: boolean;
  isNetworkReachable: boolean;
  isResponding: boolean;
  lastSeen: string;
  errorCode?: string | null;
  errorMessage?: string | null;
  telemetry?: HardwareTelemetryDetails;
}

export interface HardwareSummaryItem {
  detected: number;
  configured: number;
  status: string;
}

export interface HardwareSummary {
  printers: HardwareSummaryItem;
  displays: HardwareSummaryItem;
  scanners: HardwareSummaryItem;
  cashDrawers: HardwareSummaryItem;
  comDevices: HardwareSummaryItem;
  networkDevices: HardwareSummaryItem;
}

export interface AssignedDeviceConfig {
  category: HardwareCategory;
  categoryLabel: string;
  deviceId: string;
  deviceName: string;
  manufacturer: string;
  connectionType: HardwareConnectionType;
  address: string;
  isDefault: boolean;
  // Specific to cash drawer
  drawerConnectionMethod?: 'through_printer' | 'usb' | 'serial' | 'network';
  hostPrinterId?: string;
  drawerPort?: 'Drawer 1' | 'Drawer 2';
  vendorProtocol?: 'escpos' | 'epson' | 'star' | 'citizen';
  // Specific to customer display
  displayId?: string;
  isExtended?: boolean;
  welcomeMessage?: string;
}

export type ConfiguredHardwareMapping = Record<HardwareCategory, AssignedDeviceConfig>;

export interface WindowsDisplayInfo {
  id: string; // Windows screen device identifier
  name: string;
  primary: boolean;
  width: number;
  height: number;
  online: boolean;
  isExtended: boolean;
}

export interface DiagnosticTestResult {
  id: number;
  name: string;
  status: 'PASS' | 'FAIL' | 'RUNNING' | 'PENDING';
  layer: string;
  details: string;
  latencyMs?: number;
  timestamp?: string;
}

export interface MasterDiagnosticsReport {
  timestamp: string;
  bridge: BridgeHealth;
  windows: {
    printersDetected: number;
    usbDevices: number;
    comPorts: number;
    displays: number;
    isExtended: boolean;
  };
  network: {
    adapter: string;
    ip: string;
    lanDiscovery: 'Running' | 'Stopped' | 'Unavailable';
    networkDevices: number;
    posDevices: number;
  };
  configuredHardware: {
    receiptPrinter: {
      statusText: string;
      statusLevel: 'ok' | 'warning' | 'error';
      name: string;
      connection: string;
      windowsDetected: boolean;
      bridgeDetected: boolean;
      reachable: boolean;
      responding: boolean;
      errorCode?: string;
      errorMessage?: string;
    };
    cashDrawer: {
      statusText: string;
      statusLevel: 'ok' | 'warning' | 'error';
      name: string;
      connection: string;
      printer: string;
      responding: boolean;
      errorCode?: string;
      errorMessage?: string;
    };
    customerDisplay: {
      statusText: string;
      statusLevel: 'ok' | 'warning' | 'error';
      name: string;
      assignedDisplayId: string;
      isExtended: boolean;
      errorCode?: string;
      errorMessage?: string;
    };
    scanner: {
      statusText: string;
      statusLevel: 'ok' | 'warning' | 'error';
      name: string;
      connection: string;
      connected: boolean;
    };
  };
  summary: HardwareSummary;
  tests: DiagnosticTestResult[];
}
