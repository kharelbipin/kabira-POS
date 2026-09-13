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
  User,
} from '../types';

const STORAGE_KEY_CONFIG = 'pos_bridge_config_v2';
const STORAGE_KEY_LOGS = 'pos_bridge_logs_v2';
const STORAGE_KEY_PRINT_JOBS = 'pos_bridge_print_jobs_v2';
const STORAGE_KEY_DRAWER_EVENTS = 'pos_bridge_drawer_events_v2';
const STORAGE_KEY_OFFLINE_QUEUE = 'pos_bridge_offline_queue_v2';

// Default Bridge Configuration matching User Stories PB-001 - PB-040
export const DEFAULT_BRIDGE_CONFIG: PosBridgeConfig = {
  bridgeStatus: 'connected',
  bridgeVersion: '2.4.1-LTS (Windows POS Engine)',
  localEndpoint: 'http://127.0.0.1:5055/v1',
  startMode: 'windows_service',
  lastHeartbeat: new Date().toISOString(),
  runtime: '.NET 8 Worker Service (Free Open-Source)',

  // Receipt Printer
  primaryPrinter: 'EPSON TM-T88VII (USB001 / ESC/POS)',
  fallbackPrinter: 'STAR TSP143III (LAN / 192.168.1.185)',
  paperWidth: '80mm',
  autoPrintReceipts: 'all_sales',
  receiptCopies: 1,
  autoCutPaper: true,

  // Cash Drawer
  drawerConnectionMethod: 'printer_pulse',
  autoOpenDrawerOnCash: true,
  requireManagerPinManualDrawer: true,
  requireReasonManualDrawer: true,
  drawerKickPin: 'pin_2',

  // Barcode Scanner
  barcodeScannerMode: 'hid_keyboard_wedge',
  scannerPrefix: '',
  scannerSuffix: 'CR',

  // Customer Display
  customerDisplayMode: 'second_monitor',
  customerDisplayEnabled: true,
  customerWelcomeMessage: 'Welcome to 377 Spirits! Please present ID if purchasing alcohol.',
  customerPromoRotation: [
    'Specials this week: Garrison Brothers Bourbon 10% Off with Loyalty Points',
    'Join our 377 Spirits Club for 100 Bonus Points on Sign-up!',
    'Texas Craft Beers on special: Revolver Blood & Honey $9.99 6-Pack',
  ],

  // Payment Terminal Adapter
  paymentTerminalAdapter: 'clover',
  paymentDeviceId: 'CLOVER-FLEX-REG01',
  paymentTerminalIp: '192.168.1.190',
  paymentTerminalPort: 12345,

  // Label Printer
  labelPrinterModel: 'Zebra ZD421 (Direct Thermal 203dpi)',
  labelSize: '2x1',
  labelTemplate: 'shelf_tag_retail',

  // Scale Support
  scaleEnabled: false,
  scalePort: 'COM3',
  scaleProtocol: 'mettler_toledo',
  scaleUnits: 'lb',

  // Offline & Sync
  offlineAllowed: true,
  maxOfflineQueueHours: 72,
};

// Initial Device Fleet for Register #01
export const INITIAL_DEVICES: PosBridgeDeviceInfo[] = [
  {
    id: 'dev-printer-01',
    type: 'receipt_printer',
    name: 'Primary Thermal Receipt Printer',
    model: 'EPSON TM-T88VII High-Speed Thermal',
    connectionType: 'usb',
    status: 'online',
    lastHeartbeat: new Date().toISOString(),
    details: 'Port: USB001 | 80mm | Cutter Ready | Paper Status: Full',
  },
  {
    id: 'dev-printer-02',
    type: 'receipt_printer',
    name: 'Backup Thermal Receipt Printer (Fallback)',
    model: 'Star Micronics TSP143III Ethernet',
    connectionType: 'network',
    status: 'online',
    isFallback: true,
    lastHeartbeat: new Date().toISOString(),
    details: 'IP: 192.168.1.185 | 80mm | Standby Backup',
  },
  {
    id: 'dev-drawer-01',
    type: 'cash_drawer',
    name: 'Heavy-Duty 16-Inch Cash Drawer',
    model: 'APG Vasario 1616 (RJ12 via Epson Kick)',
    connectionType: 'serial',
    status: 'online',
    lastHeartbeat: new Date().toISOString(),
    details: 'Pulse: 24V Pin 2 | Microswitch Sensor: Closed',
  },
  {
    id: 'dev-scanner-01',
    type: 'barcode_scanner',
    name: 'Hands-Free 2D Barcode Gun',
    model: 'Zebra DS2208 Handheld & Cradle Scanner',
    connectionType: 'usb',
    status: 'online',
    lastHeartbeat: new Date().toISOString(),
    details: 'USB HID Wedge Mode | 1D/2D PDF417 Driverless | TX Driver License Parsing Enabled',
  },
  {
    id: 'dev-display-01',
    type: 'customer_display',
    name: 'Customer-Facing Secondary Monitor',
    model: 'ViewSonic 15.6" Full HD Customer Display',
    connectionType: 'windows_spooler',
    status: 'online',
    lastHeartbeat: new Date().toISOString(),
    details: 'Extended Display #2 (1920x1080) | Zero-Focus Stealing Architecture',
  },
  {
    id: 'dev-terminal-01',
    type: 'payment_terminal',
    name: 'Payment Terminal Adapter',
    model: 'Clover Flex Semi-Integrated Payment Device',
    connectionType: 'network',
    status: 'online',
    lastHeartbeat: new Date().toISOString(),
    details: 'IP: 192.168.1.190 | TLS 1.3 Certified | Tokenized Semi-Integration (Zero Card Data in POS)',
  },
  {
    id: 'dev-label-01',
    type: 'label_printer',
    name: 'Liquor Shelf Label Printer',
    model: 'Zebra ZD421 Direct Thermal (203 DPI)',
    connectionType: 'usb',
    status: 'online',
    lastHeartbeat: new Date().toISOString(),
    details: 'USB002 | 2" x 1" Shelf Tag Stock Loaded | TSPL/EPL2',
  },
  {
    id: 'dev-scale-01',
    type: 'scale',
    name: 'NTEP Certified Point-of-Sale Scale',
    model: 'Mettler Toledo Ariva-S Counter Scale',
    connectionType: 'serial',
    status: 'offline',
    lastHeartbeat: new Date().toISOString(),
    details: 'COM3 (Disabled - Liquor items priced by unit)',
  },
];

class PosBridgeService {
  private config: PosBridgeConfig;
  private devices: PosBridgeDeviceInfo[];
  private statusListeners: Array<(status: PosBridgeStatus) => void> = [];
  private devicesListeners: Array<(devices: PosBridgeDeviceInfo[]) => void> = [];
  private heartbeatTimer: any = null;
  private customerDisplayChannel: BroadcastChannel | null = null;

  constructor() {
    this.config = this.loadConfig();
    this.devices = [...INITIAL_DEVICES];

    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.customerDisplayChannel = new BroadcastChannel('pos_customer_display_channel');
      } catch (e) {}
    }

    this.startHeartbeatLoop();
  }

  private loadConfig(): PosBridgeConfig {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
      if (saved) {
        return { ...DEFAULT_BRIDGE_CONFIG, ...JSON.parse(saved) };
      }
    } catch (e) {}
    return { ...DEFAULT_BRIDGE_CONFIG };
  }

  public saveConfig(updates: Partial<PosBridgeConfig>) {
    this.config = { ...this.config, ...updates };
    try {
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(this.config));
    } catch (e) {}
    this.log('BridgeCore', 'info', `Bridge configuration updated for Register #01.`);
    this.notifyStatusListeners();
  }

  public getConfig(): PosBridgeConfig {
    return { ...this.config };
  }

  public getDevices(): PosBridgeDeviceInfo[] {
    return [...this.devices];
  }

  public getStatus(): PosBridgeStatus {
    // Check if any critical device is failed
    const primaryPrinter = this.devices.find(d => d.type === 'receipt_printer' && !d.isFallback);
    const drawer = this.devices.find(d => d.type === 'cash_drawer');

    if (this.config.bridgeStatus === 'offline') return 'offline';
    if (primaryPrinter?.status === 'offline' || primaryPrinter?.status === 'error') {
      return 'degraded'; // PB-004: A single failed device marks status degraded, not unusable
    }
    if (drawer?.status === 'offline' || drawer?.status === 'error') {
      return 'degraded';
    }
    return this.config.bridgeStatus;
  }

  public subscribeStatus(cb: (status: PosBridgeStatus) => void): () => void {
    this.statusListeners.push(cb);
    cb(this.getStatus());
    return () => {
      this.statusListeners = this.statusListeners.filter(l => l !== cb);
    };
  }

  public subscribeDevices(cb: (devices: PosBridgeDeviceInfo[]) => void): () => void {
    this.devicesListeners.push(cb);
    cb(this.getDevices());
    return () => {
      this.devicesListeners = this.devicesListeners.filter(l => l !== cb);
    };
  }

  private notifyStatusListeners() {
    const status = this.getStatus();
    this.statusListeners.forEach(fn => fn(status));
  }

  private notifyDevicesListeners() {
    this.devicesListeners.forEach(fn => fn([...this.devices]));
  }

  private startHeartbeatLoop() {
    if (typeof window === 'undefined') return;

    // Periodic health check every 4 seconds (PB-002, PB-030)
    this.heartbeatTimer = setInterval(() => {
      this.config.lastHeartbeat = new Date().toISOString();
      // Auto-reconnect simulation: if primary was testing or temporarily degraded, recover cleanly
      let changed = false;
      this.devices = this.devices.map(d => {
        if (d.status === 'testing') {
          changed = true;
          return { ...d, status: 'online', lastHeartbeat: new Date().toISOString() };
        }
        return { ...d, lastHeartbeat: new Date().toISOString() };
      });
      if (changed) {
        this.notifyDevicesListeners();
        this.notifyStatusListeners();
      }
    }, 4000);
  }

  // ----------------------------------------------------
  // PB-010 to PB-013: Receipt Printing with Fallback & Retry
  // ----------------------------------------------------
  public async printReceipt(
    order: Order,
    options?: { isReprint?: boolean; forceFallback?: boolean; user?: User; reason?: string }
  ): Promise<{ success: boolean; printerUsed: string; wasFallback: boolean; printJobId: string; error?: string }> {
    const printJobId = `PJ-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const primaryDevice = this.devices.find(d => d.type === 'receipt_printer' && !d.isFallback);
    const fallbackDevice = this.devices.find(d => d.type === 'receipt_printer' && d.isFallback);

    const primaryOnline = primaryDevice && primaryDevice.status === 'online' && !options?.forceFallback;
    let targetPrinter = primaryOnline ? this.config.primaryPrinter : this.config.fallbackPrinter;
    let wasFallback = !primaryOnline;

    if (!primaryOnline && (!fallbackDevice || fallbackDevice.status !== 'online')) {
      // Both printers failed
      this.recordPrintJob({
        printJobId,
        orderId: order.id,
        orderNumber: order.orderNumber,
        timestamp: new Date().toISOString(),
        printerUsed: 'None',
        wasFallback: true,
        status: 'failed',
        retryCount: 0,
        reason: 'Both primary and fallback printers offline',
        userName: options?.user?.name || 'Cashier',
      });
      this.log('Printer', 'error', `Print job ${printJobId} failed for order #${order.orderNumber}: All printers unreachable.`);
      return {
        success: false,
        printerUsed: 'None',
        wasFallback: true,
        printJobId,
        error: 'Receipt printer offline. Sale completed; reprint when printer is ready.',
      };
    }

    // Simulate structured print job transmission to local bridge endpoint
    await new Promise(r => setTimeout(r, 400));

    this.recordPrintJob({
      printJobId,
      orderId: order.id,
      orderNumber: order.orderNumber,
      timestamp: new Date().toISOString(),
      printerUsed: targetPrinter,
      wasFallback,
      status: 'success',
      retryCount: 0,
      reason: options?.isReprint ? (options?.reason || 'Customer requested reprint') : 'Automatic sale print',
      userName: options?.user?.name || 'Cashier',
    });

    this.log(
      'Printer',
      wasFallback ? 'warn' : 'info',
      `Print job ${printJobId} sent to [${targetPrinter}] for order #${order.orderNumber}. ${wasFallback ? '(Fallback printer utilized)' : ''}`
    );

    return {
      success: true,
      printerUsed: targetPrinter,
      wasFallback,
      printJobId,
    };
  }

  // ----------------------------------------------------
  // PB-014, PB-015: Cash Drawer Kick (Sale & Manual)
  // ----------------------------------------------------
  public async kickCashDrawer(params: {
    type: CashDrawerEvent['type'];
    user?: User;
    managerPin?: string;
    reason?: string;
    orderNumber?: string;
    amount?: number;
  }): Promise<{ success: boolean; error?: string }> {
    const drawer = this.devices.find(d => d.type === 'cash_drawer');
    if (!drawer || drawer.status === 'offline') {
      this.log('Drawer', 'error', `Failed to open cash drawer: APG Drawer device offline or disconnected.`);
      return { success: false, error: 'Cash drawer offline or pulse connection severed.' };
    }

    // Manual opening permission & manager PIN enforcement (PB-015)
    if (params.type === 'manual_open' && this.config.requireManagerPinManualDrawer) {
      if (params.managerPin !== '5555' && params.managerPin !== '9999' && params.user?.role !== 'Admin' && params.user?.role !== 'Manager') {
        this.log('Drawer', 'warn', `Unauthorized manual drawer opening attempt by ${params.user?.name || 'Unknown'}.`);
        return { success: false, error: 'Manager authorization PIN required to open drawer manually.' };
      }
    }

    const event: CashDrawerEvent = {
      id: `CDE-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      timestamp: new Date().toISOString(),
      registerId: 'REG-01',
      type: params.type,
      userName: params.user?.name || 'Terminal User',
      userRole: params.user?.role || 'Cashier',
      orderNumber: params.orderNumber,
      amount: params.amount,
      reason: params.reason || (params.type === 'sale_cash' ? 'Cash sale tender committed' : 'Manual till access'),
      managerPinUsed: !!params.managerPin,
    };

    this.recordDrawerEvent(event);
    this.log('Drawer', 'info', `Drawer kick pulse sent [Pin 2]. Reason: ${event.reason} by ${event.userName}`);

    // Pulse vibration / audio feedback
    if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
      navigator.vibrate?.([80, 50, 80]);
    }

    return { success: true };
  }

  // ----------------------------------------------------
  // PB-009: Test Device Endpoint
  // ----------------------------------------------------
  public async testDevice(deviceType: PosBridgeDeviceType): Promise<{ success: boolean; message: string; details?: string }> {
    this.log('BridgeCore', 'info', `Executing diagnostic hardware test on: ${deviceType}`);
    await new Promise(r => setTimeout(r, 600));

    switch (deviceType) {
      case 'receipt_printer': {
        const primary = this.devices.find(d => d.type === 'receipt_printer' && !d.isFallback);
        if (primary && primary.status === 'online') {
          return {
            success: true,
            message: 'Epson TM-T88VII test receipt printed successfully.',
            details: 'ESC/POS sequence sent: Header, barcode, test cut OK.',
          };
        }
        return { success: false, message: 'Printer did not respond. Check USB connection and paper roll.' };
      }

      case 'cash_drawer': {
        return this.kickCashDrawer({
          type: 'test_kick',
          reason: 'Diagnostic test from Settings > Devices',
        }).then(res => ({
          success: res.success,
          message: res.success ? 'Cash drawer kick pulse fired successfully (APG 1616).' : (res.error || 'Failed to trigger drawer'),
          details: 'Pulse command 27,112,0,50,250 sent via ESC/POS kick port.',
        }));
      }

      case 'barcode_scanner': {
        return {
          success: true,
          message: 'Barcode scanner is active in USB HID Keyboard-Wedge mode.',
          details: 'Ready to receive scans. Try scanning any product bottle UPC.',
        };
      }

      case 'customer_display': {
        this.broadcastCustomerDisplay({
          screenState: 'welcome',
          storeName: '377 Spirits',
          tagline: 'Fine Liquors, Craft Spirits, Wine & Beer',
          items: [],
          subtotal: 0,
          discountTotal: 0,
          taxTotal: 0,
          grandTotal: 0,
          welcomeMessage: 'Diagnostic Test: Customer display is connected and synced!',
        });
        return {
          success: true,
          message: 'Test message transmitted to Secondary Customer Monitor.',
          details: 'Dual-monitor viewport synchronized via BroadcastChannel.',
        };
      }

      case 'payment_terminal': {
        return {
          success: true,
          message: 'Clover Flex terminal diagnostic ping passed (Roundtrip: 18ms).',
          details: 'Endpoint 192.168.1.190:12345 TLS handshake verified. Ready for transaction handoff.',
        };
      }

      case 'label_printer': {
        return {
          success: true,
          message: 'Zebra ZD421 printed diagnostic 2"x1" shelf tag.',
          details: 'TSPL print template executed. Calibration: Ready.',
        };
      }

      case 'scale': {
        return {
          success: false,
          message: 'Scale adapter is currently disabled for this register.',
          details: 'To enable, toggle Scale Support in Settings > Devices and configure COM port.',
        };
      }

      default:
        return { success: true, message: 'Device test completed.' };
    }
  }

  // ----------------------------------------------------
  // PB-007: Automatic Device Discovery
  // ----------------------------------------------------
  public async discoverDevices(): Promise<PosBridgeDeviceInfo[]> {
    this.log('BridgeCore', 'info', `Scanning Windows spooler, USB endpoints, and local network for POS hardware...`);
    await new Promise(r => setTimeout(r, 900));

    const discovered = [...INITIAL_DEVICES];
    this.devices = discovered;
    this.notifyDevicesListeners();
    this.notifyStatusListeners();
    return discovered;
  }

  // ----------------------------------------------------
  // PB-020, PB-021: Payment Terminal Adapter
  // ----------------------------------------------------
  public async sendPaymentTerminal(
    amount: number,
    transactionRef: string
  ): Promise<{ status: 'approved' | 'declined' | 'cancelled' | 'timeout' | 'error'; authCode?: string; cardBrand?: string; cardLast4?: string; error?: string }> {
    this.log('PaymentTerminal', 'info', `Handoff payment amount $${amount.toFixed(2)} to ${this.config.paymentTerminalAdapter.toUpperCase()} (Ref: ${transactionRef})`);

    // Simulate semi-integrated terminal prompt
    await new Promise(r => setTimeout(r, 1200));

    // Never logs raw card PAN or CVV (PB-020)
    const cardLast4 = Math.floor(1000 + Math.random() * 9000).toString();
    const authCode = `APX-${Math.floor(100000 + Math.random() * 900000)}`;

    this.log('PaymentTerminal', 'info', `Terminal transaction approved for $${amount.toFixed(2)}. Auth: ${authCode}, Last4: *${cardLast4}`);

    return {
      status: 'approved',
      authCode,
      cardBrand: 'Visa Credit',
      cardLast4,
    };
  }

  // ----------------------------------------------------
  // PB-038: Label Printer Support
  // ----------------------------------------------------
  public async printShelfLabel(data: {
    name: string;
    price: number;
    sku: string;
    barcode: string;
    size: string;
  }): Promise<{ success: boolean; message: string }> {
    this.log('BridgeCore', 'info', `Sent label print job to ${this.config.labelPrinterModel}: ${data.name} ($${data.price.toFixed(2)})`);
    await new Promise(r => setTimeout(r, 500));
    return {
      success: true,
      message: `Printed shelf label: ${data.name} - $${data.price.toFixed(2)} (${data.size})`,
    };
  }

  // ----------------------------------------------------
  // PB-018, PB-019: Real-Time Customer Cart Display
  // ----------------------------------------------------
  public broadcastCustomerDisplay(state: Partial<CustomerDisplayState>) {
    const fullState: CustomerDisplayState = {
      screenState: state.screenState || 'active_cart',
      storeName: state.storeName || '377 Spirits',
      tagline: state.tagline || 'Fine Liquors, Craft Spirits, Wine & Beer',
      items: state.items || [],
      subtotal: state.subtotal ?? 0,
      discountTotal: state.discountTotal ?? 0,
      taxTotal: state.taxTotal ?? 0,
      grandTotal: state.grandTotal ?? 0,
      tenderedAmount: state.tenderedAmount,
      changeDue: state.changeDue,
      welcomeMessage: state.welcomeMessage || this.config.customerWelcomeMessage,
      promoBanner: state.promoBanner || this.config.customerPromoRotation[0],
      lastScannedItem: state.lastScannedItem,
    };

    try {
      localStorage.setItem('pos_customer_display_state', JSON.stringify(fullState));
      if (this.customerDisplayChannel) {
        this.customerDisplayChannel.postMessage(fullState);
      }
    } catch (e) {}
  }

  public syncCartToCustomerDisplay(
    cartItems: CartItem[],
    totals: { subtotal: number; discountTotal: number; taxTotal: number; grandTotal: number },
    storeInfo?: { storeName?: string; tagline?: string }
  ) {
    if (!this.config.customerDisplayEnabled) return;

    // Filter out internal cost & margins (PB-019)
    const sanitizedItems = cartItems.map(item => ({
      name: item.product.name,
      size: item.product.size || '',
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: (item.unitPrice * item.quantity) - (item.discountAmount || 0),
    }));

    const lastItem = cartItems.length > 0 ? cartItems[cartItems.length - 1].product.name : undefined;

    this.broadcastCustomerDisplay({
      screenState: cartItems.length === 0 ? 'welcome' : 'active_cart',
      storeName: storeInfo?.storeName || '377 Spirits',
      tagline: storeInfo?.tagline || 'Fine Liquors, Craft Spirits, Wine & Beer',
      items: sanitizedItems,
      subtotal: totals.subtotal,
      discountTotal: totals.discountTotal,
      taxTotal: totals.taxTotal,
      grandTotal: totals.grandTotal,
      lastScannedItem: lastItem,
    });
  }

  // ----------------------------------------------------
  // Logging & Auditing (PB-031, PB-034, PB-035)
  // ----------------------------------------------------
  private log(component: BridgeLogEntry['component'], level: BridgeLogEntry['level'], message: string) {
    const entry: BridgeLogEntry = {
      id: `LOG-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      timestamp: new Date().toISOString(),
      registerId: 'REG-01',
      component,
      level,
      message,
      correlationId: `CORR-${Math.floor(100000 + Math.random() * 900000)}`,
    };

    try {
      const logs = this.getLogs();
      logs.unshift(entry);
      if (logs.length > 200) logs.pop();
      localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(logs));
    } catch (e) {}
  }

  public getLogs(): BridgeLogEntry[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_LOGS);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return [];
  }

  public getPrintJobs(): PrintJobRecord[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_PRINT_JOBS);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return [];
  }

  private recordPrintJob(job: PrintJobRecord) {
    try {
      const jobs = this.getPrintJobs();
      jobs.unshift(job);
      if (jobs.length > 100) jobs.pop();
      localStorage.setItem(STORAGE_KEY_PRINT_JOBS, JSON.stringify(jobs));
    } catch (e) {}
  }

  public getDrawerEvents(): CashDrawerEvent[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_DRAWER_EVENTS);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return [];
  }

  private recordDrawerEvent(ev: CashDrawerEvent) {
    try {
      const events = this.getDrawerEvents();
      events.unshift(ev);
      if (events.length > 100) events.pop();
      localStorage.setItem(STORAGE_KEY_DRAWER_EVENTS, JSON.stringify(events));
    } catch (e) {}
  }

  public exportSanitizedLogs(): string {
    const logs = this.getLogs();
    const config = this.getConfig();
    const devices = this.getDevices();

    const dump = {
      exportTimestamp: new Date().toISOString(),
      store: '377 Spirits - Granbury, TX #01',
      bridgeVersion: config.bridgeVersion,
      runtime: config.runtime,
      bridgeStatus: this.getStatus(),
      devices,
      logs,
    };
    return JSON.stringify(dump, null, 2);
  }

  public restartService(): Promise<{ success: boolean; message: string }> {
    this.config.bridgeStatus = 'starting';
    this.notifyStatusListeners();
    return new Promise(resolve => {
      setTimeout(() => {
        this.config.bridgeStatus = 'connected';
        this.config.lastHeartbeat = new Date().toISOString();
        this.notifyStatusListeners();
        this.log('BridgeCore', 'info', 'POS Bridge Windows Service restarted gracefully (PID 4482).');
        resolve({ success: true, message: 'POS Bridge service restarted successfully.' });
      }, 1200);
    });
  }

  public toggleDeviceStatus(deviceId: string, newStatus: 'online' | 'offline'): void {
    this.devices = this.devices.map(d => (d.id === deviceId ? { ...d, status: newStatus } : d));
    this.notifyDevicesListeners();
    this.notifyStatusListeners();
    this.log('BridgeCore', newStatus === 'online' ? 'info' : 'warn', `Device [${deviceId}] set to ${newStatus}.`);
  }
}

export const posBridge = new PosBridgeService();
