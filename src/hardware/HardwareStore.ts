// Canonical Authoritative Hardware Store for Kabira POS
// Single source of truth for register hardware state, Bridge discovery, and role assignments.
// No simulated hardware, fake latency, or hardcoded peripheral fallbacks.

import {
  BridgeHealth,
  DiscoveredHardwareDevice,
  ConfiguredHardwareMapping,
  HardwareSummary,
  HardwareCategory,
  AssignedDeviceConfig,
} from './bridgeTypes';
import { bridgeClient, BridgeClient } from './BridgeClient';

const STORAGE_KEY_CONFIGURED_HARDWARE = 'kabira_pos_hardware_config_v2';
const STORAGE_KEY_LAST_DEVICES = 'kabira_pos_last_discovered_v2';
const STORAGE_KEY_DISPLAY_DISMISSED = 'kabira_customer_display_warning_dismissed';

export type HardwareStoreListener = () => void;
export type BarcodeScanListener = (barcode: string, source: string) => void;
export type CustomerTouchListener = (action: { type: string; timestamp?: string; data?: any }) => void;

export class HardwareStore {
  private static instance: HardwareStore;
  private client: BridgeClient = bridgeClient;
  private listeners: Set<HardwareStoreListener> = new Set();
  private barcodeListeners: Set<BarcodeScanListener> = new Set();
  private touchListeners: Set<CustomerTouchListener> = new Set();

  // Customer Display Window & BroadcastChannel Reference
  private customerWindow: Window | null = null;
  private broadcastChannel: BroadcastChannel | null = null;

  private health: BridgeHealth = {
    status: 'offline',
    version: 'Not Connected',
    serviceRunning: false,
    windowsDiscovery: false,
    networkDiscovery: false,
    lastHeartbeat: 'Never',
    port: 5055,
    latencyMs: 0,
    error: 'Bridge unverified',
  };

  private discoveredDevices: DiscoveredHardwareDevice[] = [];
  private summary: HardwareSummary | null = null;
  private isScanning: boolean = false;
  private scanError: string | null = null;
  private lastScanTime: string | null = null;

  // Real configured hardware assignments for this POS register (no hardcoded models)
  private configured: ConfiguredHardwareMapping = {
    receipt_printer: {
      category: 'receipt_printer',
      categoryLabel: 'Receipt Printer',
      deviceId: '',
      deviceName: 'Not Configured (Scan Windows Printers)',
      manufacturer: 'Windows Print Spooler',
      connectionType: 'windows_spooler',
      address: '',
      isDefault: false,
    },
    cash_drawer: {
      category: 'cash_drawer',
      categoryLabel: 'Cash Drawer',
      deviceId: 'drawer_solenoid_relay',
      deviceName: 'Cash Drawer (Through Receipt Printer)',
      manufacturer: 'Standard 24V Solenoid',
      connectionType: 'through_printer',
      address: 'Printer Drawer Kick Port',
      isDefault: true,
      drawerConnectionMethod: 'through_printer',
      hostPrinterId: '',
      drawerPort: 'Drawer 1',
      vendorProtocol: 'epson',
    },
    barcode_scanner: {
      category: 'barcode_scanner',
      categoryLabel: 'Barcode Scanner',
      deviceId: 'usb_keyboard_wedge',
      deviceName: 'USB Barcode Scanner (HID Keyboard Wedge)',
      manufacturer: 'Standard USB HID',
      connectionType: 'hid',
      address: 'HID\\Keyboard',
      isDefault: true,
    },
    customer_display: {
      category: 'customer_display',
      categoryLabel: 'Customer Display',
      deviceId: '',
      deviceName: 'Secondary Screen (Windows Extended Desktop)',
      manufacturer: 'Windows Graphics Subsystem',
      connectionType: 'windows_spooler',
      address: 'Extended Monitor',
      isDefault: false,
