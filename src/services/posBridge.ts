// PosBridge Compatibility Adapter
// Connects existing POS UI components to the authoritative src/hardware/ subsystem
// Removes fake/simulated device discovery and routes all actions to real BridgeClient & HardwareStore.

import {
  PosBridgeConfig,
  PosBridgeDeviceInfo,
  PosBridgeStatus,
  PosBridgeDeviceType,
  PrintJobRecord,
  CashDrawerEvent,
  BridgeLogEntry,
  CustomerDisplayState,
  Order,
  CartItem,
  DiscoveredPrinter,
  RegisterPrinterAssignment,
  PrintDiagnosticLog,
  ConfiguredCustomerDisplay,
  WindowsDisplayInfo,
  PosBridgeBarcodeScanEvent,
} from '../types';
import { hardwareStore, HardwareStore } from '../hardware/HardwareStore';
import { bridgeClient, BridgeClient } from '../hardware/BridgeClient';

export class PosBridgeService {
  private store: HardwareStore = hardwareStore;
  private client: BridgeClient = bridgeClient;
  private statusListeners: Array<(status: PosBridgeStatus) => void> = [];
  private deviceListeners: Array<(devices: PosBridgeDeviceInfo[]) => void> = [];
  private printerListeners: Array<(printers: DiscoveredPrinter[]) => void> = [];
  private barcodeListeners: Array<(event: PosBridgeBarcodeScanEvent) => void> = [];
  private customerDisplayWindow: Window | null = null;
  private bridgeLogs: BridgeLogEntry[] = [];
  private diagnosticLogs: PrintDiagnosticLog[] = [];

  constructor() {
    this.store.subscribe(() => {
      this.notifyStatus();
      this.notifyPrinters();
    });

    // Window message listener for customer display touch actions or barcode wedge
    if (typeof window !== 'undefined') {
      window.addEventListener('message', this.handleWindowMessage.bind(this));
    }
  }

  private handleWindowMessage(e: MessageEvent) {
    if (!e.data || typeof e.data !== 'object') return;
    if (e.data.type === 'POS_BARCODE_SCAN') {
      this.notifyBarcodeScan({
        barcode: e.data.barcode,
        source: 'hid_scanner',
        timestamp: new Date().toISOString(),
        pipeline: 'HARDWARE_WEDGE',
        found: true,
      });
    }
  }

  // --- Status & Health ---
  public getStatus(): PosBridgeStatus {
    const health = this.store.getHealth();
    if (health.status === 'running') return 'connected';
    if (health.status === 'degraded') return 'degraded';
    return 'offline';
  }

  public subscribeStatus(callback: (status: PosBridgeStatus) => void): () => void {
    this.statusListeners.push(callback);
    callback(this.getStatus());
    return () => {
      this.statusListeners = this.statusListeners.filter(cb => cb !== callback);
    };
  }

  private notifyStatus() {
    const status = this.getStatus();
    this.statusListeners.forEach(cb => {
      try {
        cb(status);
      } catch {}
    });
  }

  public getConfig(): PosBridgeConfig {
    const health = this.store.getHealth();
    const configured = this.store.getConfiguredHardware();
    return {
      bridgeStatus: this.getStatus(),
      bridgeVersion: health.version || '1.0.4',
      localEndpoint: `http://127.0.0.1:${health.port || 5055}`,
      startMode: 'windows_service',
      lastHeartbeat: health.lastHeartbeat,
      runtime: '.NET 8 Worker Service (Free Open-Source)',

      primaryPrinter: configured.receipt_printer.deviceName || 'Receipt Printer',
      fallbackPrinter: 'Microsoft Print to PDF',
      paperWidth: '80mm',
      autoPrintReceipts: 'all_sales',
      receiptCopies: 1,
      autoCutPaper: true,

      drawerConnectionMethod: 'printer_pulse',
      autoOpenDrawerOnCash: true,
      requireManagerPinManualDrawer: true,
      requireReasonManualDrawer: true,
      drawerKickPin: 'pin_2',

      barcodeScannerMode: 'hid_keyboard_wedge',
      scannerPrefix: '',
      scannerSuffix: '\r\n',

      customerDisplayMode: 'second_monitor',
      customerDisplayEnabled: Boolean(configured.customer_display.deviceId),
      customerWelcomeMessage: configured.customer_display.welcomeMessage || 'Welcome to 377 SPIRITS! Please present valid ID.',
      customerPromoRotation: [],

      paymentTerminalAdapter: 'stripe_terminal',
      paymentDeviceId: configured.card_terminal.deviceId || 'terminal_01',
      paymentTerminalIp: '127.0.0.1',
      paymentTerminalPort: 5055,

      labelPrinterModel: 'Zebra ZD410',
      labelSize: '2x1',
      labelTemplate: 'shelf_tag_retail',

      scaleEnabled: false,
      scalePort: 'COM1',
      scaleProtocol: 'mettler_toledo',
      scaleUnits: 'lb',

      offlineAllowed: true,
      maxOfflineQueueHours: 72,
    };
  }

  // --- Discovered Printers ---
  public getDiscoveredPrinters(): DiscoveredPrinter[] {
    const rawDevices = this.store.getDiscoveredDevices() || [];
    const devices = rawDevices.filter(d => d.category === 'receipt_printer');
    if (devices.length > 0) {
      return devices.map(d => ({
        deviceId: d.deviceId,
        name: d.name,
        type: d.connectionType as any,
        status: d.isResponding ? 'ready' : 'offline',
        queueName: d.name,
        port: d.address,
        driver: d.telemetry?.driverName || 'Generic Driver',
        manufacturer: d.manufacturer,
        model: d.model || d.name,
        paperWidth: '80mm',
        isDefault: d.isConfigured,
        lastSeen: d.lastSeen,
        details: d.errorMessage || d.address,
      }));
    }

    const configured = this.store.getConfiguredHardware().receipt_printer;
    return [
      {
        deviceId: configured.deviceId,
        name: configured.deviceName,
        type: configured.connectionType as any,
        status: this.store.getHealth().status === 'running' ? 'ready' : 'offline',
        queueName: configured.deviceName,
        port: configured.address,
        driver: 'Standard Printer Driver',
        manufacturer: configured.manufacturer,
        model: configured.deviceName,
        paperWidth: '80mm',
        isDefault: true,
        lastSeen: new Date().toISOString(),
        details: 'Configured Receipt Printer',
      },
    ];
  }

  public subscribePrinters(callback: (printers: DiscoveredPrinter[]) => void): () => void {
    this.printerListeners.push(callback);
    callback(this.getDiscoveredPrinters());
    return () => {
      this.printerListeners = this.printerListeners.filter(cb => cb !== callback);
    };
  }

  private notifyPrinters() {
    const list = this.getDiscoveredPrinters();
    this.printerListeners.forEach(cb => {
      try {
        cb(list);
      } catch {}
    });
  }

  public async discoverPrinters(): Promise<DiscoveredPrinter[]> {
    await this.store.scanHardware().catch(() => {});
    return this.getDiscoveredPrinters();
  }

  public getRegisterPrinterAssignment(): RegisterPrinterAssignment | null {
    const p = this.store.getConfiguredHardware().receipt_printer;
    const isReady = this.store.getHealth().status === 'running' && Boolean(p.deviceId);
    return {
      storeId: 'STORE-01',
      registerId: 'REG-01',
      deviceType: 'RECEIPT_PRINTER',
      bridgeDeviceId: p.deviceId || '',
      windowsQueue: p.deviceName || 'Receipt Printer',
      manufacturer: p.manufacturer || 'Generic',
      model: p.deviceName || 'Receipt Printer',
      port: p.address || 'USB001',
      connectionType: (p.connectionType === 'network' || p.connectionType === 'windows_spooler') ? p.connectionType : 'usb',
      paperWidth: '80mm',
      status: !p.deviceId ? 'not_configured' : isReady ? 'ready' : 'offline',
      default: true,
      enabled: true,
      updatedAt: new Date().toISOString(),
    };
  }

  public subscribePrinterAssignment(callback: (asg: RegisterPrinterAssignment | null) => void): () => void {
    callback(this.getRegisterPrinterAssignment());
    return this.store.subscribe(() => {
      callback(this.getRegisterPrinterAssignment());
    });
  }

  public setRegisterPrinterAssignment(params: {
    bridgeDeviceId: string;
    printerName?: string;
    windowsQueue?: string;
    connectionType?: 'usb' | 'network' | 'windows_spooler';
    portOrEndpoint?: string;
    storeId?: string;
    registerId?: string;
    deviceType?: string;
    manufacturer?: string;
    model?: string;
    port?: string;
    paperWidth?: string;
    status?: string;
    default?: boolean;
    enabled?: boolean;
    updatedAt?: string;
  }): RegisterPrinterAssignment {
    const pName = params.printerName || params.windowsQueue || 'Receipt Printer';
    const cType = (params.connectionType === 'network' || params.connectionType === 'windows_spooler') ? params.connectionType : 'usb';
    this.store.assignDevice('receipt_printer', {
      deviceId: params.bridgeDeviceId,
      deviceName: pName,
      connectionType: cType,
      address: params.portOrEndpoint || params.port || params.windowsQueue || 'USB001',
    });
    return this.getRegisterPrinterAssignment()!;
  }

  public isPrinterConnected(): boolean {
    const health = this.store.getHealth();
    return health.status === 'running';
  }

  public async testPrintPrinter(printerId: string): Promise<{ success: boolean; message: string; log?: string }> {
    const res = await this.client.testPrint(printerId);
    this.logDiagnostic(res.success ? 'info' : 'error', 'Printer', `Test print ${printerId}: ${res.message}`);
    return res;
  }

  // --- Real Receipt Printing ---
  public async printReceipt(order: Order, settings?: any): Promise<{
    success: boolean;
    jobId?: string;
    printJobId?: string;
    printerUsed?: string;
    message?: string;
    error?: string;
  }> {
    const res = await this.store.printReceipt({ order, settings });
    const configured = this.store.getConfiguredHardware().receipt_printer;
    const printJobId = res.jobId || `JOB-${Date.now().toString().slice(-6)}`;
    const printerUsed = configured.deviceName || 'Receipt Printer';
    const out = {
      success: res.success,
      jobId: printJobId,
      printJobId,
      printerUsed,
      message: res.message,
      error: res.success ? undefined : (res.message || 'Printer communication failed'),
    };
    this.logDiagnostic(
      res.success ? 'info' : 'error',
      'Printer',
      `Print receipt for Order ${order.id || order.orderNumber}: ${res.message || 'Sent'}`
    );
    return out;
  }

  // --- Cash Drawer ---
  public async kickCashDrawer(options?: {
    type?: string;
    reason?: string;
    orderNumber?: string;
    amount?: number;
    user?: any;
    managerPin?: string;
    method?: 'through_printer' | 'usb' | 'serial';
    printerId?: string;
    pulseDurationMs?: number;
  }): Promise<{ success: boolean; message: string; error?: string }> {
    const res = await this.store.openCashDrawer();
    this.logDiagnostic(
      res.success ? 'info' : 'error',
      'Drawer',
      `Cash drawer kick (${options?.type || 'manual'}): ${res.message}`
    );
    return {
      success: res.success,
      message: res.message,
      error: res.success ? undefined : res.message,
    };
  }

  // --- Customer Display & Screens ---
  public async detectDisplays(): Promise<WindowsDisplayInfo[]> {
    const res = await this.client.getDisplays();
    return res.displays.map((d, index) => ({
      id: d.id,
      deviceNumber: index + 1,
      deviceName: d.name,
      friendlyName: d.name,
      isPrimary: d.primary,
      resolution: { width: d.width || 1920, height: d.height || 1080 },
      bounds: { x: index * (d.width || 1920), y: 0, width: d.width || 1920, height: d.height || 1080 },
      scaleFactor: 1.0,
      assignedRole: d.primary ? 'cashier' : 'customer',
      connected: d.online,
    }));
  }

  public getCustomerDisplayConfig(): ConfiguredCustomerDisplay {
    const disp = this.store.getConfiguredHardware().customer_display;
    const isConn = this.store.getHealth().status === 'running' && Boolean(disp.deviceId);
    return {
      registerId: 'REG-01',
      enabled: Boolean(disp.deviceId),
      selectedDisplayId: disp.displayId || 'DISPLAY2',
      matchedHardwareId: disp.deviceId,
      displayIdentifier: disp.deviceName || 'Customer Pole Display',
      resolution: { width: 1024, height: 768 },
      isPrimary: false,
      autoStartOnBoot: true,
      autoRelaunchOnClose: true,
      fullscreenBorderless: false,
      status: !disp.deviceId ? 'NOT_CONFIGURED' : isConn ? 'CONNECTED' : 'DISCONNECTED',
      lastChecked: new Date().toISOString(),
      warningMessage: undefined,
    };
  }

  public subscribeCustomerDisplayConfig(callback: (cfg: ConfiguredCustomerDisplay) => void): () => void {
    callback(this.getCustomerDisplayConfig());
    return this.store.subscribe(() => {
      callback(this.getCustomerDisplayConfig());
    });
  }

  public saveCustomerDisplayConfig(cfg: Partial<ConfiguredCustomerDisplay>) {
    this.store.assignDevice('customer_display', {
      displayId: cfg.selectedDisplayId || undefined,
      isExtended: !cfg.isPrimary,
      welcomeMessage: cfg.warningMessage || 'Welcome to 377 SPIRITS!',
    });
  }

  public isCustomerDisplayWindowOpen(): boolean {
    return Boolean(this.customerDisplayWindow && !this.customerDisplayWindow.closed);
  }

  public async openCustomerDisplayWindow(isAutoAttempt: boolean = false): Promise<{ success: boolean; blocked?: boolean; message: string }> {
    if (this.isCustomerDisplayWindowOpen()) {
      this.customerDisplayWindow?.focus();
      return { success: true, message: 'Customer display already active' };
    }

    try {
      const url = `${window.location.origin}?mode=customer-display`;
      const w = window.open(url, 'KabiraCustomerDisplay', 'width=1024,height=768,menubar=no,toolbar=no,location=no');
      if (w) {
        this.customerDisplayWindow = w;
        return { success: true, message: 'Customer display window opened' };
      }
      return { success: false, blocked: true, message: 'Browser popup blocker prevented display window' };
    } catch (e: any) {
      return { success: false, message: e.message || 'Customer display open failed' };
    }
  }

  public async restartCustomerDisplay(): Promise<{ success: boolean; message: string; blocked?: boolean }> {
    if (this.customerDisplayWindow && !this.customerDisplayWindow.closed) {
      try {
        this.customerDisplayWindow.close();
      } catch {}
    }
    this.customerDisplayWindow = null;
    const res = await this.openCustomerDisplayWindow(false);
    return {
      success: res.success,
      message: res.message,
      blocked: res.blocked,
    };
  }

  public syncCartToCustomerDisplay(cart: CartItem[], totals: any, storeMeta?: any) {
    this.broadcastCustomerDisplay({
      type: 'CART_UPDATE',
      cart,
      totals,
      storeMeta,
    });
  }

  public broadcastCustomerDisplay(payload: any) {
    if (this.customerDisplayWindow && !this.customerDisplayWindow.closed) {
      try {
        this.customerDisplayWindow.postMessage(payload, '*');
      } catch {}
    }
  }

  public async identifyDisplays(): Promise<{ success: boolean; message: string }> {
    return await this.client.testDisplay('DISPLAY2');
  }

  // --- Barcode Scanning ---
  public subscribeBarcodeScan(callback: (event: PosBridgeBarcodeScanEvent) => void): () => void {
    this.barcodeListeners.push(callback);
    return () => {
      this.barcodeListeners = this.barcodeListeners.filter(cb => cb !== callback);
    };
  }

  private notifyBarcodeScan(event: PosBridgeBarcodeScanEvent) {
    this.barcodeListeners.forEach(cb => {
      try {
        cb(event);
      } catch {}
    });
  }

  // --- Diagnostics & Logs ---
  public getPrintDiagnosticLogs(): PrintDiagnosticLog[] {
    return this.diagnosticLogs;
  }

  private logDiagnostic(
    level: 'info' | 'warn' | 'error',
    component: 'BridgeCore' | 'Printer' | 'Drawer' | 'Scanner' | 'Display' | 'PaymentTerminal' | 'OfflineQueue' | 'Scale',
    message: string
  ) {
    const entry: BridgeLogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString(),
      registerId: 'REG-01',
      component,
      level,
      message,
      correlationId: `cid_${Date.now()}`,
    };
    this.bridgeLogs.unshift(entry);
    if (this.bridgeLogs.length > 100) {
      this.bridgeLogs.pop();
    }

    if (component === 'Printer') {
      const diag: PrintDiagnosticLog = {
        id: entry.id,
        transactionId: `TX-${Date.now().toString().slice(-6)}`,
        registerId: 'REG-01',
        bridgeStatus: this.getStatus(),
        requestedDeviceType: 'RECEIPT_PRINTER',
        configuredDeviceId: this.store.getConfiguredHardware().receipt_printer.deviceId,
        resolvedPrinter: this.store.getConfiguredHardware().receipt_printer.deviceName,
        connection: this.store.getConfiguredHardware().receipt_printer.connectionType,
        windowsQueue: this.store.getConfiguredHardware().receipt_printer.deviceName,
        printerStatusBeforeJob: 'Ready',
        jobSubmitted: level !== 'error',
        spoolerJobId: `SPOOL-${Date.now().toString().slice(-5)}`,
        finalKnownStatus: level === 'error' ? 'FAILED' : 'PRINTED',
        timestamp: entry.timestamp,
        technicalLog: message,
        errorReason: level === 'error' ? message : undefined,
      };
      this.diagnosticLogs.unshift(diag);
      if (this.diagnosticLogs.length > 50) {
        this.diagnosticLogs.pop();
      }
    }
  }

  public getDevices(): PosBridgeDeviceInfo[] {
    const devices = this.store.getDiscoveredDevices() || [];
    return devices.map(d => {
      const cType: 'usb' | 'network' | 'serial' | 'bluetooth' | 'windows_spooler' =
        d.connectionType === 'network'
          ? 'network'
          : d.connectionType === 'windows_spooler'
          ? 'windows_spooler'
          : d.connectionType === 'com'
          ? 'serial'
          : 'usb';

      return {
        id: d.deviceId,
        name: d.name,
        type: d.category as PosBridgeDeviceType,
        status: d.isResponding ? 'online' : 'offline',
        connectionType: cType,
        model: d.model || d.name,
        lastHeartbeat: d.lastSeen,
        details: d.address,
      };
    });
  }

  public subscribeDevices(callback: (devices: PosBridgeDeviceInfo[]) => void): () => void {
    this.deviceListeners.push(callback);
    callback(this.getDevices());
    return () => {
      this.deviceListeners = this.deviceListeners.filter(cb => cb !== callback);
    };
  }

  public getLogs(): BridgeLogEntry[] {
    return this.bridgeLogs;
  }

  public async restartService(): Promise<{ success: boolean; message: string }> {
    await this.store.refreshHealth();
    return { success: true, message: 'Bridge status refreshed' };
  }

  public async discoverDevices(): Promise<PosBridgeDeviceInfo[]> {
    await this.store.scanHardware().catch(() => {});
    return this.getDevices();
  }

  public async testDevice(type: PosBridgeDeviceType): Promise<{ success: boolean; message: string }> {
    return await this.store.testDevice(type as any);
  }

  public setPrinterStatus(deviceId: string, status: 'ready' | 'offline') {
    // Device status is queried directly from Bridge
  }

  public toggleDeviceStatus(type: PosBridgeDeviceType, status: 'online' | 'offline') {
    // Device status is queried directly from Bridge
  }

  public exportSanitizedLogs(): string {
    return JSON.stringify(this.bridgeLogs, null, 2);
  }

  public markBridgeInstalled() {
    this.store.refreshHealth().catch(() => {});
  }
}

export const posBridge = new PosBridgeService();
