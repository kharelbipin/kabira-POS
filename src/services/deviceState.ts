// POS DeviceState Class
// Encapsulates multi-layer telemetry for physical & network hardware
// Explicitly provides: isConfigured, isWindowsDetected, isNetworkReachable, isResponding

import { DiscoveredPosDevice, DiscoveredDeviceCategory } from '../types';
import { RegisterHardwareMapping, BridgeTelemetryData } from './storeRegisterHardwareService';

export interface DeviceTelemetryDetails {
  latencyMs?: number;
  firmwareVersion?: string;
  driverStatus?: string;
  driverName?: string;
  heartbeatAge?: string;
  packetLoss?: number;
  signalStrength?: string;
  paperStatus?: string;
  voltageLevel?: string;
  displayResolution?: string;
  isExtended?: boolean;
  drawerPort?: string;
  vendorProtocol?: string;
  rawPnPId?: string;
  macAddress?: string;
  ipAddress?: string;
}

export interface DeviceStateInitParams {
  id: string;
  name: string;
  category: 'receipt_printer' | 'barcode_scanner' | 'cash_drawer' | 'customer_display' | 'scale' | 'card_terminal';
  categoryLabel?: string;
  isConfigured: boolean;
  isWindowsDetected: boolean;
  isNetworkReachable: boolean;
  isResponding: boolean;
  connectionType?: string;
  portOrEndpoint?: string;
  lastSeen?: string;
  errorCode?: string | null;
  errorMessage?: string | null;
  telemetry?: DeviceTelemetryDetails;
}

export class DeviceState {
  public readonly id: string;
  public readonly name: string;
  public readonly category: 'receipt_printer' | 'barcode_scanner' | 'cash_drawer' | 'customer_display' | 'scale' | 'card_terminal';
  public readonly categoryLabel: string;
  public readonly isConfigured: boolean;
  public readonly isWindowsDetected: boolean;
  public readonly isNetworkReachable: boolean;
  public readonly isResponding: boolean;
  public readonly connectionType: string;
  public readonly portOrEndpoint: string;
  public readonly lastSeen: string;
  public readonly errorCode: string | null;
  public readonly errorMessage: string | null;
  public readonly telemetry: DeviceTelemetryDetails;

  constructor(init: DeviceStateInitParams) {
    this.id = init.id;
    this.name = init.name;
    this.category = init.category;
    this.categoryLabel = init.categoryLabel || DeviceState.resolveCategoryLabel(init.category);
    this.isConfigured = Boolean(init.isConfigured);
    this.isWindowsDetected = Boolean(init.isWindowsDetected);
    this.isNetworkReachable = Boolean(init.isNetworkReachable);
    this.isResponding = Boolean(init.isResponding);
    this.connectionType = init.connectionType || 'USB';
    this.portOrEndpoint = init.portOrEndpoint || 'USB001';
    this.lastSeen = init.lastSeen || new Date().toISOString();
    this.errorCode = init.errorCode ?? null;
    this.errorMessage = init.errorMessage ?? null;
    this.telemetry = init.telemetry || {};
  }

  public static resolveCategoryLabel(category: string): string {
    switch (category) {
      case 'receipt_printer':
        return 'Receipt Printer';
      case 'barcode_scanner':
        return 'Barcode Scanner';
      case 'cash_drawer':
        return 'Cash Drawer';
      case 'customer_display':
        return 'Customer Display';
      case 'scale':
        return 'Weight Scale';
      case 'card_terminal':
        return 'Card Terminal';
      default:
        return 'POS Device';
    }
  }

  /**
   * Health classification based on multi-state layers
   */
  public get healthLevel(): 'HEALTHY' | 'DEGRADED' | 'UNASSIGNED' | 'OFFLINE' {
    if (this.isResponding && this.isConfigured) {
      return 'HEALTHY';
    }
    if ((this.isWindowsDetected || this.isNetworkReachable) && !this.isResponding) {
      return 'DEGRADED';
    }
    if ((this.isWindowsDetected || this.isNetworkReachable) && !this.isConfigured) {
      return 'UNASSIGNED';
    }
    return 'OFFLINE';
  }

  public get healthBadgeText(): string {
    switch (this.healthLevel) {
      case 'HEALTHY':
        return 'Healthy & Online';
      case 'DEGRADED':
        return 'Communication Problem';
      case 'UNASSIGNED':
        return 'Detected / Unassigned';
      case 'OFFLINE':
      default:
        return 'Device Offline';
    }
  }

  public get statusTheme(): {
    bg: string;
    border: string;
    text: string;
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    dotColor: string;
  } {
    switch (this.healthLevel) {
      case 'HEALTHY':
        return {
          bg: 'bg-emerald-950/30',
          border: 'border-emerald-600/60',
          text: 'text-emerald-400',
          badgeBg: 'bg-emerald-900/60',
          badgeText: 'text-emerald-300',
          badgeBorder: 'border-emerald-700/60',
          dotColor: 'bg-emerald-400',
        };
      case 'DEGRADED':
        return {
          bg: 'bg-amber-950/30',
          border: 'border-amber-600/60',
          text: 'text-amber-400',
          badgeBg: 'bg-amber-900/60',
          badgeText: 'text-amber-300',
          badgeBorder: 'border-amber-700/60',
          dotColor: 'bg-amber-400',
        };
      case 'UNASSIGNED':
        return {
          bg: 'bg-sky-950/30',
          border: 'border-sky-600/60',
          text: 'text-sky-400',
          badgeBg: 'bg-sky-900/60',
          badgeText: 'text-sky-300',
          badgeBorder: 'border-sky-700/60',
          dotColor: 'bg-sky-400',
        };
      case 'OFFLINE':
      default:
        return {
          bg: 'bg-rose-950/30',
          border: 'border-rose-700/60',
          text: 'text-rose-400',
          badgeBg: 'bg-rose-900/60',
          badgeText: 'text-rose-300',
          badgeBorder: 'border-rose-700/60',
          dotColor: 'bg-rose-400',
        };
    }
  }

  /**
   * Diagnostic detail explanation for cashier and technical operators
   */
  public get diagnosticExplanation(): string {
    if (this.isResponding && this.isConfigured) {
      return `Bridge channel verified. Device responded within ${this.telemetry.latencyMs ?? 2}ms.`;
    }
    if (this.isWindowsDetected && !this.isResponding) {
      return 'Windows OS detected hardware driver, but Bridge communication failed.';
    }
    if (this.isNetworkReachable && !this.isResponding) {
      return 'Active IP respond on subnet, but POS raw socket port is blocked or closed.';
    }
    if (!this.isConfigured && this.isWindowsDetected) {
      return 'Physical hardware plugged into host PC, but not assigned to this Register.';
    }
    return this.errorMessage || 'No signal received from Windows PnP, network probe, or Bridge adapter.';
  }

  /**
   * Builds DeviceState for each of the 4 core POS devices
   * (Printer, Scanner, Cash Drawer, Display)
   */
  public static buildCoreDeviceStates(
    mapping: RegisterHardwareMapping,
    discoveredDevices: DiscoveredPosDevice[],
    telemetry: BridgeTelemetryData,
    diagnosticsReport?: any
  ): DeviceState[] {
    const list: DeviceState[] = [];

    // 1. RECEIPT PRINTER
    const printerMapping = mapping.receipt_printer;
    const isPrinterConfigured = Boolean(printerMapping && (printerMapping.deviceKey || printerMapping.deviceName));
    // Check if printer has a communication issue or is fully working
    const printerDiag = diagnosticsReport?.configuredHardware?.receiptPrinter;
    const isPrinterWindowsDetected = printerDiag ? Boolean(printerDiag.windowsDetected) : true;
    const isPrinterNetwork = printerMapping?.connectionType === 'network';
    const isPrinterReachable = isPrinterNetwork ? Boolean(printerDiag?.reachable ?? true) : false;
    // In our scenario: EPSON TM-T88VI is Windows detected: true, Bridge detected: false (communication problem)
    const isPrinterResponding = printerDiag ? Boolean(printerDiag.responding) : (printerMapping?.status === 'Ready');

    list.push(
      new DeviceState({
        id: 'core-printer',
        name: printerMapping?.deviceName || 'EPSON TM-T88VI',
        category: 'receipt_printer',
        categoryLabel: 'Receipt Printer',
        isConfigured: isPrinterConfigured,
        isWindowsDetected: isPrinterWindowsDetected,
        isNetworkReachable: isPrinterReachable,
        isResponding: isPrinterResponding,
        connectionType: printerMapping?.connectionType === 'network' ? 'Network' : 'USB',
        portOrEndpoint: printerMapping?.portOrEndpoint || 'USB001',
        errorCode: isPrinterResponding ? null : (printerDiag?.errorCode || 'ERR_BRIDGE_PRINTER_COMM'),
        errorMessage: isPrinterResponding
          ? null
          : (printerDiag?.errorMessage || 'Windows detected the printer driver, but Bridge communication timed out.'),
        telemetry: {
          latencyMs: isPrinterResponding ? 4 : 250,
          driverName: 'EPSON Advanced Printer Driver 6 (APD6)',
          driverStatus: isPrinterWindowsDetected ? 'Windows Driver Installed' : 'Missing Driver',
          paperStatus: 'Paper OK',
          rawPnPId: 'USB\\VID_04B8&PID_0202\\6&22b493&0&2',
          heartbeatAge: '1 sec ago',
        },
      })
    );

    // 2. BARCODE SCANNER
    const scannerMapping = mapping.barcode_scanner;
    const isScannerConfigured = Boolean(scannerMapping && (scannerMapping.deviceKey || scannerMapping.deviceName));
    const isScannerWindowsDetected = true; // Zebra DS2208 HID Wedge detected
    const isScannerResponding = scannerMapping?.status !== 'Offline';

    list.push(
      new DeviceState({
        id: 'core-scanner',
        name: scannerMapping?.deviceName || 'Zebra DS2208 2D Imager',
        category: 'barcode_scanner',
        categoryLabel: 'Barcode Scanner',
        isConfigured: isScannerConfigured,
        isWindowsDetected: isScannerWindowsDetected,
        isNetworkReachable: false,
        isResponding: isScannerResponding,
        connectionType: 'USB (HID Wedge)',
        portOrEndpoint: scannerMapping?.portOrEndpoint || 'HID\\VID_05E0&PID_1200',
        errorCode: isScannerResponding ? null : 'ERR_SCANNER_DISCONNECTED',
        errorMessage: isScannerResponding ? null : 'Scanner USB cable detached',
        telemetry: {
          latencyMs: 1,
          driverName: 'Windows Standard HID Keyboard Device',
          driverStatus: 'Ready / Keystroke Emulation Active',
          rawPnPId: 'HID\\VID_05E0&PID_1200&REV_0100',
          heartbeatAge: 'Live',
        },
      })
    );

    // 3. CASH DRAWER
    const drawerMapping = mapping.cash_drawer;
    const isDrawerConfigured = Boolean(drawerMapping && (drawerMapping.deviceKey || drawerMapping.deviceName));
    const isDrawerThroughPrinter = drawerMapping?.connectionType === 'software_service' || !drawerMapping?.connectionType || drawerMapping?.connectionType === 'usb';
    // If through receipt printer, Windows detection is linked to the printer
    const isDrawerWindowsDetected = isDrawerThroughPrinter ? isPrinterWindowsDetected : true;
    const isDrawerResponding = isDrawerConfigured && isPrinterResponding && drawerMapping?.status === 'Ready';

    list.push(
      new DeviceState({
        id: 'core-drawer',
        name: drawerMapping?.deviceName || 'APG Vasario 1616 Cash Drawer',
        category: 'cash_drawer',
        categoryLabel: 'Cash Drawer',
        isConfigured: isDrawerConfigured,
        isWindowsDetected: isDrawerWindowsDetected,
        isNetworkReachable: false,
        isResponding: isDrawerResponding,
        connectionType: 'Through Receipt Printer (RJ11/RJ12)',
        portOrEndpoint: 'Drawer Port 1 (Pin 2 Solenoid)',
        errorCode: isDrawerResponding ? null : 'ERR_DRAWER_PRINTER_RELAY',
        errorMessage: isDrawerResponding
          ? null
          : 'Drawer pulse route degraded because host receipt printer has bridge communication problem.',
        telemetry: {
          latencyMs: isDrawerResponding ? 15 : 120,
          driverName: 'ESC/POS Solenoid Kick Relay',
          driverStatus: isDrawerResponding ? 'Ready to Open' : 'Waiting for Printer Channel',
          drawerPort: 'Drawer 1',
          vendorProtocol: 'ESC/POS 24V Pulse',
          voltageLevel: '24V DC / 1.0A',
          heartbeatAge: '1 sec ago',
        },
      })
    );

    // 4. CUSTOMER DISPLAY
    const displayMapping = mapping.customer_display;
    const isDisplayConfigured = Boolean(displayMapping && (displayMapping.deviceKey || displayMapping.deviceName));
    const isDisplayWindowsDetected = true; // 2 screens enumerated
    const isDisplayResponding = isDisplayConfigured && displayMapping?.status === 'Ready';

    list.push(
      new DeviceState({
        id: 'core-display',
        name: displayMapping?.deviceName || 'Secondary Screen (1920×1080 DISPLAY2)',
        category: 'customer_display',
        categoryLabel: 'Customer Display',
        isConfigured: isDisplayConfigured,
        isWindowsDetected: isDisplayWindowsDetected,
        isNetworkReachable: false,
        isResponding: isDisplayResponding,
        connectionType: 'HDMI / Windows Extended Desktop',
        portOrEndpoint: 'DISPLAY2 (Secondary)',
        errorCode: isDisplayResponding ? null : 'WARN_DISPLAY_UNVERIFIED',
        errorMessage: isDisplayResponding
          ? null
          : 'Display 2 detected by Windows graphics adapter, but customer display window not yet active.',
        telemetry: {
          latencyMs: 3,
          driverName: 'DirectX / Windows Extended Desktop',
          driverStatus: 'Extended Desktop Active',
          displayResolution: '1920 × 1080 @ 60Hz',
          isExtended: true,
          heartbeatAge: 'Live',
        },
      })
    );

    return list;
  }

  /**
   * Builds DeviceState instances from generic discovered devices
   */
  public static fromDiscoveredDevice(
    dev: DiscoveredPosDevice,
    mapping: RegisterHardwareMapping,
    telemetry: BridgeTelemetryData
  ): DeviceState {
    const isConfigured = Boolean(
      dev.isAssigned ||
      Object.values(mapping).some(m => m.deviceKey === dev.deviceKey)
    );

    const isWindows = Boolean(
      dev.isPhysicalHardware ||
      dev.connectionType === 'usb' ||
      dev.connectionType === 'hid' ||
      dev.connectionType === 'windows_spooler'
    );

    const isNetwork = Boolean(
      dev.isNetworkDevice ||
      dev.connectionType === 'network' ||
      dev.ipAddress
    );

    const isResponding = dev.status === 'Ready' || dev.status === 'Connected';

    return new DeviceState({
      id: dev.deviceKey,
      name: dev.name,
      category: dev.category as any,
      isConfigured,
      isWindowsDetected: isWindows,
      isNetworkReachable: isNetwork,
      isResponding,
      connectionType: dev.connectionType,
      portOrEndpoint: dev.ipAddress ? `${dev.ipAddress}:${dev.port || 9100}` : (dev.usbComIdentifier || 'Local Port'),
      lastSeen: dev.lastSeen || new Date().toISOString(),
      errorCode: isResponding ? null : 'ERR_DEV_NOT_RESPONDING',
      errorMessage: isResponding ? null : dev.details,
      telemetry: {
        latencyMs: dev.latencyMs ?? 5,
        firmwareVersion: dev.technicalInfo?.firmwareVersion,
        macAddress: dev.macAddress,
        ipAddress: dev.ipAddress,
        rawPnPId: dev.usbComIdentifier,
        heartbeatAge: 'Live',
      },
    });
  }
}
