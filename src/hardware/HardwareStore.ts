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

    // Customer Display launcher state & BroadcastChannel reference
    // The customer display is launched by the local Node/PowerShell backend,
    // so there is no browser Window reference to track here.
    private customerDisplayLaunchActive: boolean = false;
    private broadcastChannel: BroadcastChannel | null = null;

    // Customer display performance:
    // BroadcastChannel stays real-time, while localStorage persistence is
    // coalesced so rapid cart updates do not block the cashier UI repeatedly.
    private lastCustomerDisplayPayloadJson: string | null = null;
    private pendingCustomerDisplayPayloadJson: string | null = null;
    private customerDisplayPersistTimer: ReturnType<typeof setTimeout> | null = null;

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
            deviceId: '',
            deviceName: 'Not Configured',
            manufacturer: '',
            connectionType: 'through_printer',
            address: '',
            isDefault: false,
            drawerConnectionMethod: 'through_printer',
            hostPrinterId: '',
            drawerPort: 'Drawer 1',
            vendorProtocol: 'escpos',
        },
        barcode_scanner: {
            category: 'barcode_scanner',
            categoryLabel: 'Barcode Scanner',
            deviceId: '',
            deviceName: 'Not Configured',
            manufacturer: '',
            connectionType: 'hid',
            address: '',
            isDefault: false,
        },
        customer_display: {
            category: 'customer_display',
            categoryLabel: 'Customer Display',
            deviceId: '',
            deviceName: 'Not Configured',
            manufacturer: '',
            connectionType: 'windows_spooler',
            address: '',
            isDefault: false,
            displayId: '',
            isExtended: false,
            welcomeMessage: 'Welcome to 377 SPIRITS! Please present valid ID if purchasing age-restricted items.',
        },
        scale: {
            category: 'scale',
            categoryLabel: 'Weight Scale',
            deviceId: '',
            deviceName: 'Not Configured',
            manufacturer: 'Generic',
            connectionType: 'usb',
            address: 'None',
            isDefault: false,
        },
        card_terminal: {
            category: 'card_terminal',
            categoryLabel: 'Card Terminal',
            deviceId: '',
            deviceName: 'Not Configured',
            manufacturer: 'Generic',
            connectionType: 'network',
            address: 'None',
            isDefault: false,
        },
    };

    private constructor() {
        this.loadPersistedConfig();
        this.initBroadcastChannel();
        this.initWindowMessageListener();
        this.refreshHealth().catch(() => { });
    }

    public static getInstance(): HardwareStore {
        if (!HardwareStore.instance) {
            HardwareStore.instance = new HardwareStore();
        }
        return HardwareStore.instance;
    }

    private initBroadcastChannel() {
        try {
            if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
                this.broadcastChannel = new BroadcastChannel('pos_customer_display_channel');
                this.broadcastChannel.onmessage = (event) => {
                    if (event.data && event.data.type === 'CUSTOMER_TOUCH_ACTION') {
                        this.notifyCustomerTouchAction(event.data.action);
                    }
                };
            }
        } catch { }
    }

    private initWindowMessageListener() {
        if (typeof window !== 'undefined') {
            window.addEventListener('message', (event) => {
                if (event.origin !== window.location.origin) return;
                if (event.data && typeof event.data === 'object') {
                    if (event.data.type === 'CUSTOMER_TOUCH_ACTION' && event.data.action) {
                        this.notifyCustomerTouchAction(event.data.action);
                    } else if (
                        event.data.type === 'LOYALTY_PHONE_ENTERED' ||
                        event.data.type === 'RECEIPT_PREFERENCE' ||
                        event.data.type === 'TIP_SELECTED'
                    ) {
                        this.notifyCustomerTouchAction(event.data);
                    }
                }
            });
        }
    }

    private loadPersistedConfig() {
        try {
            const savedConfig = localStorage.getItem(STORAGE_KEY_CONFIGURED_HARDWARE);
            if (savedConfig) {
                this.configured = { ...this.configured, ...JSON.parse(savedConfig) };

                // Remove legacy simulated assignments that older builds persisted.
                if (this.configured.cash_drawer?.deviceId === 'drawer_solenoid_relay') {
                    this.configured.cash_drawer = {
                        ...this.configured.cash_drawer,
                        deviceId: '',
                        deviceName: 'Not Configured',
                        manufacturer: '',
                        address: '',
                        isDefault: false,
                        hostPrinterId: '',
                        drawerPort: 'Drawer 1',
                        vendorProtocol: 'escpos',
                    };
                }

                if (this.configured.barcode_scanner?.deviceId === 'usb_keyboard_wedge') {
                    this.configured.barcode_scanner = {
                        ...this.configured.barcode_scanner,
                        deviceId: '',
                        deviceName: 'Not Configured',
                        manufacturer: '',
                        address: '',
                        isDefault: false,
                    };
                }
            }
            const savedDevices = localStorage.getItem(STORAGE_KEY_LAST_DEVICES);
            if (savedDevices) {
                try {
                    const parsed = JSON.parse(savedDevices);
                    this.discoveredDevices = Array.isArray(parsed) ? parsed : [];
                } catch {
                    this.discoveredDevices = [];
                }
            } else {
                this.discoveredDevices = [];
            }
        } catch {
            this.discoveredDevices = [];
        }
    }

    private savePersistedConfig() {
        try {
            localStorage.setItem(STORAGE_KEY_CONFIGURED_HARDWARE, JSON.stringify(this.configured));
            localStorage.setItem(
                STORAGE_KEY_LAST_DEVICES,
                JSON.stringify(Array.isArray(this.discoveredDevices) ? this.discoveredDevices : [])
            );
        } catch { }
    }

    public subscribe(listener: HardwareStoreListener): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private notify() {
        this.listeners.forEach((fn) => {
            try {
                fn();
            } catch { }
        });
    }

    // State Getters
    public getHealth(): BridgeHealth {
        return this.health;
    }

    public getDiscoveredDevices(): DiscoveredHardwareDevice[] {
        return Array.isArray(this.discoveredDevices) ? this.discoveredDevices : [];
    }

    public getConfiguredHardware(): ConfiguredHardwareMapping {
        return this.configured;
    }

    public getSummary(): HardwareSummary | null {
        return this.summary;
    }

    public getIsScanning(): boolean {
        return this.isScanning;
    }

    public getScanError(): string | null {
        return this.scanError;
    }

    public getLastScanTime(): string | null {
        return this.lastScanTime;
    }

    /**
     * Probes real Bridge service health
     */
    public async refreshHealth(): Promise<BridgeHealth> {
        const health = await this.client.getHealth();
        this.health = health;
        this.notify();
        return health;
    }

    /**
     * Executes hardware scan on Bridge and records real detected devices
     */
    public async scanHardware(): Promise<DiscoveredHardwareDevice[]> {
        this.isScanning = true;
        this.scanError = null;
        this.notify();

        try {
            const devices = await this.client.scanDevices();
            this.discoveredDevices = Array.isArray(devices) ? devices : [];
            this.lastScanTime = new Date().toLocaleTimeString();

            // Discovery never silently assigns a device to this register.
            // The cashier/admin must explicitly choose the correct discovered device.

            this.savePersistedConfig();

            // Update health and summary
            await this.refreshHealth();
            this.summary = await this.client.getSummary();

            this.isScanning = false;
            this.notify();
            return this.discoveredDevices;
        } catch (err: any) {
            this.isScanning = false;
            this.scanError = err.message || 'Bridge scan failed';
            this.health = {
                ...this.health,
                status: 'offline',
                error: err.message,
            };
            this.notify();
            throw err;
        }
    }

    /**
     * Updates register hardware configuration
     */
    public assignDevice(category: HardwareCategory, config: Partial<AssignedDeviceConfig>) {
    this.configured[category] = {
        ...this.configured[category],
        ...config,
    };

    // A cash drawer connected through an ESC/POS receipt printer is a
    // printer-controlled capability, not a separately discovered device.
    //
    // Whenever the register's receipt printer is selected, automatically
    // link the drawer to that exact printer. This avoids using the Windows
    // default printer or any hardcoded Epson/XP-80C printer name.
    if (category === 'receipt_printer') {
        const selectedPrinter = this.configured.receipt_printer;

        if (selectedPrinter?.deviceId) {
            this.configured.cash_drawer = {
                ...this.configured.cash_drawer,
                deviceId: `drawer_via_${selectedPrinter.deviceId}`,
                deviceName: `Cash Drawer via ${selectedPrinter.deviceName}`,
                manufacturer: 'ESC/POS printer-controlled drawer',
                connectionType: 'through_printer',
                address: selectedPrinter.address || '',
                isDefault: false,
                drawerConnectionMethod: 'through_printer',
                hostPrinterId: selectedPrinter.deviceId,
                drawerPort: 'Drawer 1',
                vendorProtocol: 'escpos',
            };
        } else {
            // If the receipt printer is removed, remove its drawer mapping too.
            this.configured.cash_drawer = {
                ...this.configured.cash_drawer,
                deviceId: '',
                deviceName: 'Not Configured',
                manufacturer: '',
                address: '',
                isDefault: false,
                hostPrinterId: '',
                drawerConnectionMethod: 'through_printer',
                drawerPort: 'Drawer 1',
                vendorProtocol: 'escpos',
            };
        }
    }

    this.savePersistedConfig();
    this.notify();
}

    /**
     * Direct hardware test using selected device ID
     */
    public async testDevice(category: HardwareCategory): Promise<{
        success: boolean;
        message: string;
        windowsDetected?: boolean;
        latencyMs?: number;
    }> {
        const item = this.configured[category];
        if (!item) {
            return { success: false, message: `No ${category} configured` };
        }

        if (category === 'receipt_printer') {
            if (!item.deviceId) {
                return {
                    success: false,
                    windowsDetected: false,
                    message: 'No receipt printer assigned to this register. Please select an installed Windows printer.',
                };
            }
            const startTime = performance.now();
            const res = await this.client.testPrint(item.deviceId);
            const elapsed = Math.round(performance.now() - startTime);
            return {
                success: res.success,
                windowsDetected: res.windowsDetected ?? false,
                message: res.message,
                latencyMs: elapsed,
            };
        }

        if (category === 'cash_drawer') {
            if (!item.deviceId || !item.hostPrinterId) {
                return {
                    success: false,
                    message: 'No cash drawer is configured and linked to a receipt printer for this register.',
                };
            }
            const startTime = performance.now();
            const res = await this.client.openDrawer({
                connectionMethod: item.drawerConnectionMethod || 'through_printer',
                printerId: item.hostPrinterId,
                drawerPort: item.drawerPort,
            });
            const elapsed = Math.round(performance.now() - startTime);
            return {
                success: res.success,
                message: res.message,
                latencyMs: elapsed,
            };
        }

        if (category === 'customer_display') {
            const targetDisplay = item.displayId;
            if (!targetDisplay) {
                return {
                    success: false,
                    message: 'No customer display is configured for this register.',
                };
            }
            const startTime = performance.now();
            const res = await this.client.testDisplay(targetDisplay);
            const elapsed = Math.round(performance.now() - startTime);
            return {
                success: res.success,
                message: res.message,
                latencyMs: elapsed,
            };
        }

        if (category === 'barcode_scanner') {
            if (!item.deviceId) {
                return {
                    success: false,
                    message: 'No barcode scanner is configured for this register.',
                };
            }

            const detected = this.discoveredDevices.find(
                (device) =>
                    device.category === 'barcode_scanner' &&
                    device.deviceId === item.deviceId
            );

            if (!detected) {
                return {
                    success: false,
                    message: 'Configured barcode scanner was not detected by the Hardware Bridge. Run Scan Peripherals and select a detected scanner.',
                };
            }

            return {
                success: Boolean(detected.isResponding),
                message: detected.isResponding
                    ? `${detected.name} is detected and responding through the Hardware Bridge.`
                    : `${detected.name} is detected but has not been verified as responding.`,
            };
        }

        return {
            success: false,
            message: `Direct test for ${item.categoryLabel} not supported without physical peripheral driver.`,
        };
    }

    /**
     * Formats a completed sale into plain receipt text for the Windows Bridge.
     * This intentionally avoids sending raw Order/Cart JSON to an ESC/POS printer.
     * The formatter accepts the common KaBiRa order shapes used by the UI while
     * keeping missing optional fields blank instead of inventing transaction data.
     */
    private formatReceiptText(receiptData: any, options?: any): string {
        if (typeof receiptData === 'string') {
            return receiptData.trim();
        }

        if (!receiptData || typeof receiptData !== 'object') {
            return '';
        }

        const opts = options || {};
        const WIDTH = 42;
        const divider = '-'.repeat(WIDTH);
        const doubleDivider = '='.repeat(WIDTH);

        const money = (value: any): string => {
            const n = Number(value);
            return Number.isFinite(n) ? `$${n.toFixed(2)}` : '$0.00';
        };

        const value = (...candidates: any[]): any =>
            candidates.find((candidate) => candidate !== undefined && candidate !== null && candidate !== '');

        const safeText = (input: any): string =>
            String(input ?? '')
                .replace(/[\r\n]+/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();

        const center = (input: any): string => {
            const text = safeText(input);
            if (text.length >= WIDTH) return text;
            return ' '.repeat(Math.max(0, Math.floor((WIDTH - text.length) / 2))) + text;
        };

        const leftRight = (left: any, right: any): string => {
            const leftText = safeText(left);
            const rightText = safeText(right);
            const gap = WIDTH - leftText.length - rightText.length;
            if (gap >= 1) return leftText + ' '.repeat(gap) + rightText;
            return `${leftText.slice(0, Math.max(1, WIDTH - rightText.length - 1))} ${rightText}`;
        };

        const wrap = (input: any, indent = ''): string[] => {
            const text = safeText(input);
            if (!text) return [];
            const maxWidth = Math.max(8, WIDTH - indent.length);
            const words = text.split(' ');
            const result: string[] = [];
            let current = '';

            for (const word of words) {
                if (!current) {
                    current = word;
                    continue;
                }
                if ((current + ' ' + word).length <= maxWidth) {
                    current += ' ' + word;
                } else {
                    result.push(indent + current);
                    current = word;
                }
            }

            if (current) result.push(indent + current);
            return result;
        };

        const pushMultiline = (lines: string[], input: any, centered = false) => {
            String(input ?? '')
                .split(/\r?\n/)
                .map(line => line.trim())
                .filter(Boolean)
                .forEach(line => {
                    const wrapped = wrap(line);
                    wrapped.forEach(part => lines.push(centered ? center(part) : part));
                });
        };

        const storeName = value(
            opts.receiptStoreName,
            receiptData.store?.receiptStoreName,
            '377 SPIRITS'
        );
        const posBrand = value(opts.posBrand, 'KaBiRa POS');
        const tagline = value(
            opts.tagline,
            receiptData.store?.tagline,
            'Fine Liquors, Craft Spirits, Wine & Beer'
        );
        const storeAddress = value(opts.address, opts.storeAddress, receiptData.storeAddress, receiptData.store?.address);
        const storePhone = value(opts.phone, opts.storePhone, receiptData.storePhone, receiptData.store?.phone);
        const taxId = value(opts.taxId, receiptData.taxId, receiptData.store?.taxId);

        const orderNumber = value(
            receiptData.orderNumber,
            receiptData.orderNo,
            receiptData.transactionNumber,
            receiptData.transactionId,
            receiptData.id
        );
        const cashier = value(
            receiptData.cashierName,
            receiptData.cashier?.name,
            receiptData.employeeName,
            receiptData.employee?.name
        );
        const customerName = value(
            receiptData.customerName,
            receiptData.customer?.name
        );
        const createdAt = value(
            receiptData.completedAt,
            receiptData.createdAt,
            receiptData.timestamp,
            receiptData.date
        );

        const items = Array.isArray(receiptData.items)
            ? receiptData.items
            : Array.isArray(receiptData.cart)
                ? receiptData.cart
                : Array.isArray(receiptData.lines)
                    ? receiptData.lines
                    : [];

        const subtotal = value(receiptData.subtotal, receiptData.totals?.subtotal, 0);
        const discount = value(
            receiptData.discountTotal,
            receiptData.discount,
            receiptData.totals?.discountTotal,
            receiptData.totals?.discount,
            0
        );
        const tax = value(
            receiptData.taxTotal,
            receiptData.tax,
            receiptData.totals?.taxTotal,
            receiptData.totals?.tax,
            0
        );
        const total = value(
            receiptData.grandTotal,
            receiptData.total,
            receiptData.totals?.grandTotal,
            receiptData.totals?.total,
            0
        );

        const payment = receiptData.payment || {};
        const payments = Array.isArray(receiptData.payments) ? receiptData.payments : [];
        const paymentMethod = value(receiptData.paymentMethod, payment.method, receiptData.paymentType, 'cash');
        const footer = value(
            opts.receiptFooter,
            opts.footer,
            receiptData.receiptFooter,
            'Thank you for shopping! Please drink responsibly.'
        );

        const lines: string[] = [];

        if (opts.isReprint) {
            lines.push(doubleDivider);
            lines.push(center('** REPRINT **'));
            lines.push(doubleDivider);
        }

        // Store branding / logo equivalent from the on-screen receipt.
        lines.push(center(posBrand));
        lines.push(center(String(storeName).toUpperCase()));
        pushMultiline(lines, tagline, true);
        if (storeAddress) pushMultiline(lines, storeAddress, true);
        if (storePhone) lines.push(center(storePhone));
        if (taxId) lines.push(center(`Tax ID: ${taxId}`));

        lines.push(divider);
        if (orderNumber) lines.push(leftRight('ORDER:', orderNumber));
        if (createdAt) {
            const parsed = new Date(createdAt);
            const dateText = Number.isNaN(parsed.getTime()) ? String(createdAt) : parsed.toLocaleString();
            lines.push(leftRight('DATE:', dateText));
        }
        if (cashier) lines.push(leftRight('CASHIER:', cashier));
        if (customerName) lines.push(leftRight('CUSTOMER:', customerName));

        lines.push(divider);
        lines.push(leftRight('ITEM', 'TOTAL'));

        for (const item of items) {
            const product = item?.product || {};
            const name = value(item?.name, product?.name, item?.description, 'Item');
            const size = value(item?.size, product?.size, product?.volume);
            const quantity = Number(value(item?.quantity, item?.qty, 1)) || 1;
            const unitPrice = Number(value(item?.unitPrice, item?.price, product?.price, 0)) || 0;
            const lineDiscount =
                (Number(value(item?.discountAmount, item?.discount, 0)) || 0) +
                (Number(item?.manufacturerDiscountAmount || 0) || 0);
            const previewLineTotal = Math.max(0, quantity * unitPrice - lineDiscount);

            const itemNameLines = wrap(name);
            if (itemNameLines.length > 0) {
                const lastNameLine = itemNameLines.pop()!;
                itemNameLines.forEach(nameLine => lines.push(nameLine));
                lines.push(leftRight(lastNameLine, money(previewLineTotal)));
            }

            const detail = `${quantity} x ${money(unitPrice)}${size ? ` (${size})` : ''}`;
            lines.push(detail);
            if (lineDiscount > 0) {
                lines.push(leftRight('  Discount', `-${money(lineDiscount)}`));
            }
        }

        lines.push(divider);
        lines.push(leftRight('Subtotal:', money(subtotal)));
        if (Number(discount) > 0) lines.push(leftRight('Total Discount:', `-${money(discount)}`));
        lines.push(leftRight('Sales Tax:', money(tax)));
        lines.push(leftRight('TOTAL:', money(total)));

        const hasLoyalty =
            receiptData.pointsEarned !== undefined ||
            (receiptData.pointsRedeemed !== undefined && Number(receiptData.pointsRedeemed) > 0) ||
            receiptData.customerLoyaltyBalance !== undefined;

        if (hasLoyalty) {
            lines.push(divider);
            lines.push(center('LOYALTY REWARDS'));
            if (receiptData.customerLoyaltyBalance !== undefined) {
                lines.push(leftRight('Balance:', `${receiptData.customerLoyaltyBalance} PTS`));
            }
            if (Number(receiptData.pointsRedeemed || 0) > 0) {
                lines.push(
                    leftRight(
                        'Points Redeemed:',
                        `-${receiptData.pointsRedeemed} PTS (-${money(receiptData.pointsDiscountAmount || 0)})`
                    )
                );
            }
            if (Number(receiptData.pointsEarned || 0) > 0) {
                lines.push(leftRight('Points Earned Today:', `+${receiptData.pointsEarned} PTS`));
            }
        }

        lines.push(divider);

        if (payments.length > 1) {
            lines.push(`PAYMENT METHOD: MULTI-TENDER (${payments.length})`);
            lines.push(`PAYMENTS RECORDED (${payments.length}):`);

            payments.forEach((p: any, idx: number) => {
                const method = String(p?.method || 'card').toLowerCase();
                const label = method === 'cash'
                    ? `#${idx + 1} CASH`
                    : `#${idx + 1} ${safeText(p?.cardBrand || 'CARD')}${p?.cardLast4 ? ` ****${p.cardLast4}` : ''}`;

                lines.push(leftRight(label + ':', money(p?.amount || 0)));
                if (p?.authCode) {
                    lines.push(leftRight(`  Auth: ${p.authCode}`, 'APPROVED'));
                }
                if (Number(p?.changeDue || 0) > 0) {
                    lines.push(leftRight('  Change Tendered:', money(p.changeDue)));
                }
            });

            const totalPaid = payments.reduce((sum: number, p: any) => sum + (Number(p?.amount) || 0), 0);
            lines.push(leftRight('TOTAL PAID:', money(totalPaid)));
        } else if (String(paymentMethod).toLowerCase() === 'cash') {
            lines.push('PAYMENT METHOD: CASH');

            if (Array.isArray(payment.cashEntries) && payment.cashEntries.length > 1) {
                lines.push(`CASH TENDERS (${payment.cashEntries.length})`);
                payment.cashEntries.forEach((entry: any, idx: number) => {
                    const label = `Tender #${idx + 1}${entry?.time ? ` (${entry.time})` : ''}`;
                    lines.push(leftRight(label + ':', `+${money(entry?.amount || 0)}`));
                });
            }

            lines.push(
                leftRight(
                    'CASH TENDERED:',
                    money(value(payment.cashTendered, payment.amountTendered, receiptData.amountTendered, total))
                )
            );
            lines.push(leftRight('CHANGE DUE:', money(value(payment.changeDue, receiptData.changeDue, 0))));
        } else if (String(paymentMethod).toLowerCase() === 'split') {
            const split = payment.splitDetails || {};
            if (split.splitType === 'two_cards') {
                lines.push('PAYMENT METHOD: SPLIT (2 CARDS)');
                lines.push(
                    leftRight(
                        `CARD 1 (${split.card1Brand || 'Card'}${split.card1Last4 ? ` ****${split.card1Last4}` : ''}):`,
                        money(split.card1Amount || 0)
                    )
                );
                lines.push(leftRight('AUTH 1:', split.card1Auth || 'Not provided'));
                lines.push(
                    leftRight(
                        `CARD 2 (${split.card2Brand || 'Card'}${split.card2Last4 ? ` ****${split.card2Last4}` : ''}):`,
                        money(split.card2Amount || 0)
                    )
                );
                lines.push(leftRight('AUTH 2:', split.card2Auth || 'Not provided'));
            } else {
                lines.push('PAYMENT METHOD: SPLIT (CASH + CARD)');
                lines.push(leftRight('CASH PORTION:', money(split.cashAmount || 0)));
                lines.push(leftRight('CARD PORTION:', money(split.cardAmount || 0)));
                lines.push(leftRight('AUTH CODE:', payment.authCode || 'Not provided'));
            }
        } else {
            lines.push(`PAYMENT METHOD: ${String(paymentMethod).toUpperCase()}`);
            const cardBrand = value(payment.cardBrand, receiptData.cardBrand, 'CARD');
            const cardLast4 = value(payment.cardLast4, payment.lastFour, receiptData.cardLast4, receiptData.lastFour);
            if (cardLast4) {
                lines.push(leftRight('CARD:', `${cardBrand} **** ${String(cardLast4).slice(-4)}`));
            }
            if (payment.authCode) {
                lines.push(leftRight('AUTH CODE:', payment.authCode));
            }
        }

        lines.push(divider);
        lines.push(center('||||||||||||||||||||||||'));
        if (orderNumber) lines.push(center(orderNumber));
        lines.push('');
        pushMultiline(lines, footer, true);
        lines.push('');
        lines.push('');

        return lines.join('\n');
    }

    /**
     * Real receipt printing to the explicitly configured printer ID.
     * Success means the Bridge accepted the print request; it does not claim
     * that paper physically exited the printer.
     */
    public async printReceipt(
        receiptData: any,
        options?: any
    ): Promise<{
        success: boolean;
        jobId?: string;
        printerUsed?: string;
        message?: string;
        windowsDetected?: boolean;
        error?: string;
    }> {
        const printer = this.configured.receipt_printer;
        if (!printer || !printer.deviceId) {
            return {
                success: false,
                windowsDetected: false,
                message: 'No receipt printer configured on this register. Select a printer in Hardware Settings.',
                error: 'No receipt printer configured',
            };
        }

        const receiptText = this.formatReceiptText(receiptData, options);
        if (!receiptText) {
            return {
                success: false,
                windowsDetected: false,
                message: 'Receipt data could not be formatted for printing.',
                error: 'Invalid receipt data',
            };
        }

        const res = await this.client.printReceipt(printer.deviceId, receiptText);
        return {
            success: res.success,
            jobId: res.jobId,
            printerUsed: res.printerUsed || printer.deviceName,
            message: res.message,
            windowsDetected: res.success,
            error: res.success ? undefined : res.message,
        };
    }

    /**
     * Real cash drawer pulse
     */
    public async openCashDrawer(options?: any): Promise<{ success: boolean; message: string; error?: string }> {
        const drawer = this.configured.cash_drawer;
        if (!drawer?.deviceId || !drawer.hostPrinterId) {
            return {
                success: false,
                message: 'Cash drawer is not configured and linked to a receipt printer.',
                error: 'Cash drawer not configured',
            };
        }

        const res = await this.client.openDrawer({
            connectionMethod: drawer.drawerConnectionMethod || 'through_printer',
            printerId: drawer.hostPrinterId,
            drawerPort: drawer.drawerPort,
            ...(options || {}),
        });
        return {
            success: res.success,
            message: res.message,
            error: res.success ? undefined : res.message,
        };
    }

    /**
     * Customer display test
     */
    public async testCustomerDisplay(displayId?: string): Promise<{ success: boolean; message: string }> {
        const disp = this.configured.customer_display;
        const targetDisplay = displayId || disp.displayId;
        if (!targetDisplay) {
            return { success: false, message: 'No customer display is configured for this register.' };
        }
        return await this.client.testDisplay(targetDisplay);
    }

    // ==============================================================================
    // CUSTOMER DISPLAY WINDOW & LIFECYCLE (Requirement 8)
    // Browser customer window: OPEN / CLOSED
    // Physical monitor detection: DETECTED / NOT DETECTED
    // Bridge: CONNECTED / OFFLINE
    // ==============================================================================

    public isCustomerDisplayWindowOpen(): boolean {
        return this.customerDisplayLaunchActive;
    }

    public async openCustomerDisplayWindow(
        _isAutoAttempt: boolean = false
    ): Promise<{
        success: boolean;
        blocked?: boolean;
        message: string;
    }> {
        try {
            const response = await fetch('/api/customer-display/open', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                this.customerDisplayLaunchActive = false;
                this.notify();

                return {
                    success: false,
                    message:
                        result.error ||
                        'Customer display could not be opened on the secondary monitor.',
                };
            }

            this.customerDisplayLaunchActive = true;
            this.notify();

            return {
                success: true,
                message:
                    result.message ||
                    'Customer display opened on the secondary Windows display.',
            };
        } catch (e: any) {
            this.customerDisplayLaunchActive = false;
            this.notify();

            return {
                success: false,
                message:
                    e?.message ||
                    'Customer display launcher is unavailable.',
            };
        }
    }

    public async restartCustomerDisplay(): Promise<{
        success: boolean;
        message: string;
        blocked?: boolean;
    }> {
        return await this.openCustomerDisplayWindow(false);
    }

    public broadcastCustomerDisplay(payload: any) {
        let serialized: string | null = null;

        try {
            serialized = JSON.stringify(payload);

            // Do not rebroadcast identical display state.
            if (serialized === this.lastCustomerDisplayPayloadJson) {
                return;
            }

            this.lastCustomerDisplayPayloadJson = serialized;
        } catch {
            // Payloads should be plain JSON data, but BroadcastChannel can still
            // be attempted if serialization ever fails.
        }

        // BroadcastChannel is the real-time path to the customer display.
        // Keep this immediate so the customer screen still feels instant.
        try {
            if (this.broadcastChannel) {
                this.broadcastChannel.postMessage(payload);
            }
        } catch { }

        // localStorage is retained as startup/fallback state, but writes are
        // synchronous and can block the cashier UI. Coalesce rapid updates and
        // persist only the most recent display state on the next event-loop turn.
        if (serialized !== null) {
            this.pendingCustomerDisplayPayloadJson = serialized;

            if (this.customerDisplayPersistTimer === null) {
                this.customerDisplayPersistTimer = setTimeout(() => {
                    const latest = this.pendingCustomerDisplayPayloadJson;

                    this.pendingCustomerDisplayPayloadJson = null;
                    this.customerDisplayPersistTimer = null;

                    if (latest === null) {
                        return;
                    }

                    try {
                        localStorage.setItem('pos_customer_display_state', latest);
                    } catch { }
                }, 0);
            }
        }
    }

    public syncCartToCustomerDisplay(cart: any[], totals: any, storeMeta?: any) {
        const rawSubtotal = totals?.subtotal ?? 0;
        const discountTotal = totals?.discountTotal ?? 0;
        const taxTotal = totals?.taxTotal ?? 0;
        const grandTotal = totals?.grandTotal ?? 0;

        const payload = {
            screenState: cart.length === 0 ? 'welcome' : 'cart',
            storeName: storeMeta?.storeName || 'KABIRA POS  377 SPIRITS',
            tagline: storeMeta?.tagline || 'Fine Liquors, Craft Spirits, Wine & Beer',
            items: cart.map((it: any) => ({
                id: it.product?.id || it.id,
                name: it.product?.name || it.name,
                size: it.product?.size || '',
                quantity: it.quantity,
                unitPrice: it.unitPrice,
                lineTotal:
                    it.unitPrice * it.quantity -
                    Number(it.discountAmount || 0) -
                    Number(it.manufacturerDiscountAmount || 0),
            })),
            subtotal: rawSubtotal,
            discountTotal: discountTotal,
            taxTotal: taxTotal,
            grandTotal: grandTotal,
            welcomeMessage: this.configured.customer_display.welcomeMessage,
        };

        this.broadcastCustomerDisplay(payload);
    }

    // Warning banner dismissal persistence (Requirement 8: must not recreate continuously)
    public isCustomerDisplayWarningDismissed(): boolean {
        try {
            return sessionStorage.getItem(STORAGE_KEY_DISPLAY_DISMISSED) === 'true';
        } catch {
            return false;
        }
    }

    public dismissCustomerDisplayWarning() {
        try {
            sessionStorage.setItem(STORAGE_KEY_DISPLAY_DISMISSED, 'true');
        } catch { }
        this.notify();
    }

    public resetCustomerDisplayWarningDismissal() {
        try {
            sessionStorage.removeItem(STORAGE_KEY_DISPLAY_DISMISSED);
        } catch { }
        this.notify();
    }

    // ==============================================================================
    // BARCODE SCANNER & CUSTOMER TOUCH LISTENERS
    // ==============================================================================

    public subscribeBarcodeScan(callback: BarcodeScanListener): () => void {
        this.barcodeListeners.add(callback);
        return () => this.barcodeListeners.delete(callback);
    }

    public notifyBarcodeScan(barcode: string, source: string = 'Hardware Scanner') {
        this.barcodeListeners.forEach((cb) => {
            try {
                cb(barcode, source);
            } catch { }
        });
    }

    public subscribeCustomerTouchAction(callback: CustomerTouchListener): () => void {
        this.touchListeners.add(callback);
        return () => this.touchListeners.delete(callback);
    }

    public notifyCustomerTouchAction(action: { type: string; timestamp?: string; data?: any }) {
        this.touchListeners.forEach((cb) => {
            try {
                cb(action);
            } catch { }
        });
    }

    public broadcastCustomerTouchAction(action: { type: string; timestamp?: string; data?: any }) {
        try {
            if (this.broadcastChannel) {
                this.broadcastChannel.postMessage({ type: 'CUSTOMER_TOUCH_ACTION', action });
            }
        } catch { }

        if (typeof window !== 'undefined' && window.opener && !window.opener.closed) {
            try {
                window.opener.postMessage({ type: 'CUSTOMER_TOUCH_ACTION', action }, window.location.origin);
            } catch { }
        }

        this.notifyCustomerTouchAction(action);
    }
}

export const hardwareStore = HardwareStore.getInstance();
