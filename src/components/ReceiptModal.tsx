import React, { useState, useRef, useEffect } from 'react';
import { Order, StoreSettings } from '../types';
import { playBeep } from '../utils/audio';
import { hardwareStore, bridgeClient, DiscoveredHardwareDevice } from '../hardware';
import {
    Printer,
    Mail,
    Check,
    CheckCircle2,
    Share2,
    X,
    Store,
    Sparkles,
    RefreshCw,
    AlertCircle,
    RotateCcw,
    Smartphone,
    Send,
    FileText,
} from 'lucide-react';

interface ReceiptModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: Order | null;
    settings: StoreSettings | null;
    onStartNewSale: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
    isOpen,
    onClose,
    order,
    settings,
    onStartNewSale,
}) => {
    const [emailInput, setEmailInput] = useState<string>('customer@email.com');
    const [mobileInput, setMobileInput] = useState<string>('(817) 555-1234');
    const [emailStatus, setEmailStatus] = useState<'idle' | 'pending' | 'sent' | 'delivered' | 'failed'>('idle');
    const [smsStatus, setSmsStatus] = useState<'idle' | 'pending' | 'sent' | 'delivered' | 'failed'>('idle');
    const [emailDeliveryInfo, setEmailDeliveryInfo] = useState<{ id?: string; providerRef?: string; message?: string } | null>(null);
    const [smsDeliveryInfo, setSmsDeliveryInfo] = useState<{ id?: string; providerRef?: string; receiptUrl?: string; message?: string } | null>(null);
    const [showPaperPreview, setShowPaperPreview] = useState<boolean>(true);

    const [printStatus, setPrintStatus] = useState<'idle' | 'printing' | 'printed' | 'offline' | 'error'>('idle');
    const [printJobId, setPrintJobId] = useState<string | null>(null);
    const [printerUsed, setPrinterUsed] = useState<string | null>(null);
    const [printError, setPrintError] = useState<string | null>(null);
    const [isReprint, setIsReprint] = useState<boolean>(false);
    const [autoPrintedOnce, setAutoPrintedOnce] = useState<boolean>(false);
    const [showSelectPrinter, setShowSelectPrinter] = useState<boolean>(false);
    const [isRetryingBridge, setIsRetryingBridge] = useState<boolean>(false);
    const [isScanningPrinters, setIsScanningPrinters] = useState<boolean>(false);
    const [discoveredPrinters, setDiscoveredPrinters] = useState<DiscoveredHardwareDevice[]>(() =>
        hardwareStore.getDiscoveredDevices().filter(d => d.category === 'receipt_printer')
    );
    const [configuredPrinter, setConfiguredPrinter] = useState<{
        name: string;
        connection: string;
        windowsDetected: boolean;
        bridgeDetected: boolean;
    }>(() => {
        const p = hardwareStore.getConfiguredHardware().receipt_printer;
        const isBridgeOnline = hardwareStore.getHealth().status === 'running';
        return {
            name: p.deviceId ? p.deviceName : 'No Printer Configured',
            connection: p.connectionType === 'network' ? 'Network' : (p.connectionType === 'windows_spooler' ? 'Windows Spooler' : 'USB'),
            windowsDetected: Boolean(p.deviceId),
            bridgeDetected: isBridgeOnline && Boolean(p.deviceId),
        };
    });
    const [isTestPrinting, setIsTestPrinting] = useState<boolean>(false);
    const [testPrintMessage, setTestPrintMessage] = useState<string | null>(null);
    const receiptRef = useRef<HTMLDivElement>(null);

    // Sync configured printer with HardwareStore
    useEffect(() => {
        const updatePrinter = () => {
            const p = hardwareStore.getConfiguredHardware().receipt_printer;
            const isBridgeOnline = hardwareStore.getHealth().status === 'running';
            setConfiguredPrinter({
                name: p.deviceId ? p.deviceName : 'No Printer Configured',
                connection: p.connectionType === 'network' ? 'Network' : (p.connectionType === 'windows_spooler' ? 'Windows Spooler' : 'USB'),
                windowsDetected: Boolean(p.deviceId),
                bridgeDetected: isBridgeOnline && Boolean(p.deviceId),
            });
            setDiscoveredPrinters(hardwareStore.getDiscoveredDevices().filter(d => d.category === 'receipt_printer'));
        };

        updatePrinter();
        const unsub = hardwareStore.subscribe(updatePrinter);
        return () => unsub();
    }, []);

    // Direct Hardware Receipt Print (Bypasses window.print popup)
    const handleDirectPrint = async (asReprint: boolean = false) => {
        if (!order) return;
        playBeep('click');

        const printer = hardwareStore.getConfiguredHardware().receipt_printer;
        if (!printer.deviceId) {
            playBeep('error');
            setPrintStatus('offline');
            setPrintError('No receipt printer configured for this register. Please select an installed Windows printer below.');
            return;
        }

        setPrintStatus('printing');
        setPrintError(null);
        if (asReprint) setIsReprint(true);

        try {
            const res = await hardwareStore.printReceipt(order, {
                isReprint: asReprint,
                reason: asReprint ? 'Cashier reprint request' : 'Customer checkout receipt',
            });

            if (res.success) {
                playBeep('success');
                setPrintStatus('printed');
                setPrintError(null);
                setPrintJobId(res.jobId || `JOB-${Date.now().toString().slice(-6)}`);
                setPrinterUsed(res.printerUsed || printer.deviceName);
            } else {
                playBeep('error');
                setPrintStatus('offline');
                setPrintError(
                    res.windowsDetected
                        ? 'WINDOWS DETECTED - PRINT COMMUNICATION FAILED'
                        : res.error || 'Receipt printer is unreachable or offline.'
                );
            }
        } catch (err: any) {
            playBeep('error');
            setPrintStatus('offline');
            setPrintError(
                configuredPrinter.windowsDetected
                    ? 'WINDOWS DETECTED - PRINT COMMUNICATION FAILED'
                    : err?.message || 'Failed to communicate with POS Local Bridge.'
            );
        }
    };

    // Physical Test Print
    const handleTestPrint = async () => {
        setIsTestPrinting(true);
        setTestPrintMessage(null);
        playBeep('click');

        try {
            const res = await hardwareStore.testDevice('receipt_printer');

            if (res.success) {
                // A successful hardware response must clear any stale
                // printer-offline state left by an earlier failed attempt.
                setPrintStatus('idle');
                setPrintError(null);
                setTestPrintMessage(null);
                playBeep('success');
            } else {
                setPrintStatus('offline');
                setTestPrintMessage(res.message || 'Printer test failed.');
                playBeep('error');
            }
        } catch (err: any) {
            setPrintStatus('offline');
            setTestPrintMessage(err?.message || 'Printer test failed.');
            playBeep('error');
        } finally {
            setIsTestPrinting(false);
        }
    };

    // Optional manual fallback: only trigger browser print dialog if user explicitly requests
    const handleSystemPrintFallback = () => {
        playBeep('click');
        window.print();
    };

    const handleRetryBridge = async () => {
        setIsRetryingBridge(true);
        playBeep('click');
        try {
            await hardwareStore.refreshHealth();
            await hardwareStore.scanHardware();
            await handleDirectPrint(false);
        } catch { }
        setIsRetryingBridge(false);
    };

    const handleScanPrinters = async () => {
        setIsScanningPrinters(true);
        playBeep('click');
        try {
            await hardwareStore.scanHardware();
            setDiscoveredPrinters(hardwareStore.getDiscoveredDevices().filter(d => d.category === 'receipt_printer'));
        } catch { }
        setIsScanningPrinters(false);
    };

    const handleSelectPrinterChange = (printer: DiscoveredHardwareDevice) => {
        playBeep('click');
        hardwareStore.assignDevice('receipt_printer', {
            deviceId: printer.deviceId,
            deviceName: printer.name,
            manufacturer: printer.manufacturer,
            connectionType: printer.connectionType,
            address: printer.address,
            isDefault: true,
        });
        setShowSelectPrinter(false);
        playBeep('success');
    };

    // Printing is intentionally NOT triggered when this modal opens.
    // App.tsx owns the automatic print after a successful sale.
    // This prevents duplicate receipt jobs and printer contention.
    useEffect(() => {
        if (!isOpen) {
            setAutoPrintedOnce(false);
            setPrintStatus('idle');
            setPrintJobId(null);
            setPrinterUsed(null);
            setPrintError(null);
            setIsReprint(false);
        }
    }, [isOpen]);

    if (!isOpen || !order) return null;

    const handleSendDigital = async (deliveryType: 'email' | 'sms') => {
        if (!order) return;
        const dest = deliveryType === 'email' ? emailInput.trim() : mobileInput.trim();
        if (!dest) return;

        playBeep('click');
        if (deliveryType === 'email') {
            setEmailStatus('pending');
        } else {
            setSmsStatus('pending');
        }

        try {
            const res = await fetch('/api/receipts/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transactionId: order.orderNumber || order.id,
                    deliveryType,
                    destination: dest,
                }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                playBeep('success');
                if (deliveryType === 'email') {
                    setEmailStatus('sent');
                    setEmailDeliveryInfo({
                        id: data.delivery?.id,
                        providerRef: data.delivery?.providerRef,
                        message: data.message,
                    });
                } else {
                    setSmsStatus('sent');
                    setSmsDeliveryInfo({
                        id: data.delivery?.id,
                        providerRef: data.delivery?.providerRef,
                        receiptUrl: data.delivery?.receiptUrl,
                        message: data.message,
                    });
                }

                setTimeout(async () => {
                    try {
                        const stRes = await fetch(`/api/receipts/${order.orderNumber || order.id}/status`);
                        if (stRes.ok) {
                            const stData = await stRes.json();
                            const matching = stData.deliveries?.find((d: any) => d.id === data.delivery?.id);
                            if (matching?.status === 'Delivered') {
                                if (deliveryType === 'email') setEmailStatus('delivered');
                                else setSmsStatus('delivered');
                            }
                        }
                    } catch { }
                }, 1300);
            } else {
                playBeep('error');
                if (deliveryType === 'email') {
                    setEmailStatus('failed');
                    setEmailDeliveryInfo({ message: data.error || 'Failed to send email' });
                } else {
                    setSmsStatus('failed');
                    setSmsDeliveryInfo({ message: data.error || 'Failed to send SMS' });
                }
            }
        } catch (e: any) {
            playBeep('error');
            if (deliveryType === 'email') {
                setEmailStatus('failed');
                setEmailDeliveryInfo({ message: e?.message || 'Network error' });
            } else {
                setSmsStatus('failed');
                setSmsDeliveryInfo({ message: e?.message || 'Network error' });
            }
        }
    };

    const formattedDate = new Date(order.createdAt).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-2 sm:p-4 select-none overflow-hidden">
            <div className="bg-[#0F0F0F] border border-[#262626] rounded-2xl shadow-2xl w-full max-w-md max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-2rem)] min-h-0 overflow-hidden text-[#E5E5E5] animate-in fade-in zoom-in-95 duration-150 flex flex-col">
                {/* Header toolbar */}
                <div className="bg-[#0A0A0A] px-5 py-3 border-b border-[#262626] flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-[#C5A059] font-bold text-xs uppercase tracking-wider">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>KaBiRa POS</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-[#737373] hover:text-white p-1 rounded cursor-pointer transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* TRANSACTION COMPLETE & Total (User Spec) */}
                <div className="bg-[#121212] px-5 py-3.5 border-b border-[#262626] flex items-center justify-between">
                    <div>
                        <div className="text-[11px] font-mono tracking-widest text-zinc-400 uppercase font-bold">
                            TRANSACTION COMPLETE
                        </div>
                        <div className="text-2xl font-black text-white font-mono">
                            Total: ${(order.grandTotal || 0).toFixed(2)}
                        </div>
                    </div>
                    <div className="text-right font-mono">
                        <div className="text-[10px] text-zinc-400">{order.orderNumber}</div>
                        <div className="text-xs text-[#C5A059] font-bold uppercase">{order.payment.method}</div>
                    </div>
                </div>

                {/* Receipt Delivery Options (User Story Spec) */}
                <div className="px-5 py-3 bg-[#161616] border-b border-[#262626] space-y-2.5">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider text-white font-mono">
                            Receipt Delivery
                        </span>
                        <button
                            type="button"
                            onClick={() => setShowPaperPreview(!showPaperPreview)}
                            className="text-[11px] text-[#C5A059] hover:underline flex items-center space-x-1 cursor-pointer"
                        >
                            <FileText className="w-3.5 h-3.5" />
                            <span>{showPaperPreview ? 'Hide Preview' : 'Paper Preview'}</span>
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <button
                            id="receipt-print-btn"
                            type="button"
                            onClick={() => handleDirectPrint(printStatus === 'printed')}
                            disabled={printStatus === 'printing'}
                            className="py-2 px-3 rounded-xl bg-[#242424] hover:bg-[#323232] text-white text-xs font-bold uppercase tracking-wider border border-white/10 flex items-center justify-center space-x-2 transition-colors cursor-pointer disabled:opacity-50"
                        >
                            {printStatus === 'printing' ? (
                                <>
                                    <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                                    <span>Printing...</span>
                                </>
                            ) : printStatus === 'printed' ? (
                                <>
                                    <RotateCcw className="w-3.5 h-3.5 text-[#C5A059]" />
                                    <span>Reprint</span>
                                </>
                            ) : (
                                <>
                                    <Printer className="w-3.5 h-3.5 text-[#C5A059]" />
                                    <span>Print</span>
                                </>
                            )}
                        </button>

                        <button
                            id="receipt-no-receipt-btn"
                            type="button"
                            onClick={() => {
                                playBeep('click');
                                onStartNewSale();
                            }}
                            className="py-2 px-3 rounded-xl bg-[#1D1D1D] hover:bg-[#282828] text-zinc-300 text-xs font-bold uppercase tracking-wider border border-white/10 flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                        >
                            <X className="w-3.5 h-3.5 text-zinc-500" />
                            <span>No Receipt</span>
                        </button>
                    </div>

                    {/* Email */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                            Email
                        </label>
                        <div className="flex gap-2">
                            <input
                                id="receipt-email-input"
                                type="email"
                                placeholder="customer@email.com"
                                value={emailInput}
                                onChange={e => setEmailInput(e.target.value)}
                                className="flex-1 bg-[#1F1F1F] border border-[#333333] rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-zinc-600 focus:border-[#C5A059] focus:outline-hidden font-mono"
                            />
                            <button
                                id="receipt-send-email-btn"
                                type="button"
                                onClick={() => handleSendDigital('email')}
                                disabled={emailStatus === 'pending' || emailStatus === 'sent' || emailStatus === 'delivered' || !emailInput}
                                className="px-3.5 py-1.5 rounded-lg bg-[#272727] hover:bg-[#383838] text-white text-xs font-bold uppercase tracking-wider border border-[#444] flex items-center space-x-1.5 cursor-pointer disabled:opacity-40 transition-colors shrink-0"
                            >
                                {emailStatus === 'pending' ? (
                                    <RefreshCw className="w-3 h-3 text-amber-400 animate-spin" />
                                ) : emailStatus === 'delivered' || emailStatus === 'sent' ? (
                                    <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                    <Mail className="w-3 h-3 text-[#C5A059]" />
                                )}
                                <span>
                                    {emailStatus === 'pending'
                                        ? 'Sending...'
                                        : emailStatus === 'delivered'
                                            ? 'Delivered'
                                            : emailStatus === 'sent'
                                                ? 'Sent'
                                                : 'Send Email'}
                                </span>
                            </button>
                        </div>
                        {emailDeliveryInfo && (
                            <div className="text-[10px] text-zinc-400 font-mono flex items-center justify-between px-1">
                                <span>Status: <strong className={emailStatus === 'delivered' ? 'text-emerald-400' : emailStatus === 'sent' ? 'text-sky-400' : 'text-rose-400'}>{emailStatus.toUpperCase()}</strong></span>
                                {emailDeliveryInfo.providerRef && <span className="text-zinc-500">Ref: {emailDeliveryInfo.providerRef}</span>}
                            </div>
                        )}
                    </div>

                    {/* Mobile */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                            Mobile
                        </label>
                        <div className="flex gap-2">
                            <input
                                id="receipt-mobile-input"
                                type="tel"
                                placeholder="(817) 555-1234"
                                value={mobileInput}
                                onChange={e => setMobileInput(e.target.value)}
                                className="flex-1 bg-[#1F1F1F] border border-[#333333] rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-zinc-600 focus:border-[#C5A059] focus:outline-hidden font-mono"
                            />
                            <button
                                id="receipt-send-text-btn"
                                type="button"
                                onClick={() => handleSendDigital('sms')}
                                disabled={smsStatus === 'pending' || smsStatus === 'sent' || smsStatus === 'delivered' || !mobileInput}
                                className="px-3.5 py-1.5 rounded-lg bg-[#272727] hover:bg-[#383838] text-white text-xs font-bold uppercase tracking-wider border border-[#444] flex items-center space-x-1.5 cursor-pointer disabled:opacity-40 transition-colors shrink-0"
                            >
                                {smsStatus === 'pending' ? (
                                    <RefreshCw className="w-3 h-3 text-amber-400 animate-spin" />
                                ) : smsStatus === 'delivered' || smsStatus === 'sent' ? (
                                    <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                    <Smartphone className="w-3 h-3 text-[#C5A059]" />
                                )}
                                <span>
                                    {smsStatus === 'pending'
                                        ? 'Sending...'
                                        : smsStatus === 'delivered'
                                            ? 'Delivered'
                                            : smsStatus === 'sent'
                                                ? 'Sent'
                                                : 'Send Text'}
                                </span>
                            </button>
                        </div>
                        {smsDeliveryInfo && (
                            <div className="text-[10px] text-zinc-400 font-mono flex items-center justify-between px-1">
                                <span>Status: <strong className={smsStatus === 'delivered' ? 'text-emerald-400' : smsStatus === 'sent' ? 'text-sky-400' : 'text-rose-400'}>{smsStatus.toUpperCase()}</strong></span>
                                {smsDeliveryInfo.receiptUrl && <span className="text-amber-400">Secure receipt link</span>}
                            </div>
                        )}
                    </div>
                </div>

                {/* Direct Hardware Bridge Print Status Banner */}
                <div className="px-5 pt-3">
                    {printStatus === 'printed' && (
                        <div className="bg-emerald-950/40 border border-emerald-600/50 rounded-xl px-3 py-2 text-xs flex items-center justify-between text-emerald-200">
                            <div className="flex items-center space-x-2">
                                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                                <div>
                                    <span className="font-bold text-white block">
                                        Direct Print Sent to Hardware
                                    </span>
                                    <span className="text-[11px] text-emerald-300">
                                        {printerUsed || 'Default Thermal Printer'} • Job #{printJobId}
                                    </span>
                                </div>
                            </div>
                            <span className="text-[10px] bg-emerald-900/60 text-emerald-300 px-2 py-0.5 rounded font-mono uppercase font-bold border border-emerald-700/60">
                                Direct
                            </span>
                        </div>
                    )}

                    {printStatus === 'printing' && (
                        <div className="bg-amber-950/30 border border-amber-600/50 rounded-xl px-3 py-2 text-xs flex items-center space-x-2 text-amber-200">
                            <RefreshCw className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
                            <span>Transmitting receipt to Local Bridge printer...</span>
                        </div>
                    )}

                </div>

                {/* Printable Thermal Receipt Canvas (CA-08) */}
                {showPaperPreview && (
                    <div className="p-3 sm:p-4 bg-[#0A0A0A] flex-1 min-h-0 overflow-y-auto border-b border-[#262626]">
                        <div
                            ref={receiptRef}
                            id="thermal-receipt"
                            className="bg-white text-slate-900 p-6 rounded-lg font-mono text-xs shadow-md border border-slate-200 mx-auto max-w-[320px] print:m-0 print:p-0 print:border-none print:shadow-none"
                        >
                            {isReprint && (
                                <div className="text-center bg-black text-white font-bold py-1 px-2 text-xs uppercase tracking-widest rounded-xs mb-3">
                                    ** REPRINT **
                                </div>
                            )}
                            {/* Store Branding */}
                            <div className="text-center space-y-1 mb-4">
                                <div className="flex items-center justify-center space-x-1.5">
                                    <span className="font-black text-base text-slate-950 tracking-tight">Ka</span>
                                    <span className="font-black text-base text-sky-600 tracking-tight">Bi</span>
                                    <span className="font-black text-base text-slate-950 tracking-tight">Ra</span>
                                    <span className="font-mono text-[10px] font-black border border-slate-700 px-1 py-0.2 rounded">POS</span>
                                </div>
                                <div className="font-['Cinzel',serif] font-black text-xs uppercase tracking-[0.2em] text-slate-900">
                                    377 SPIRITS
                                </div>
                                <div className="text-[10px] text-slate-600">Fine Liquors, Craft Spirits, Wine &amp; Beer</div>
                                <div className="text-[10px] text-slate-600">{settings?.phone || '(817) 555-0377'}</div>
                                <div className="text-[10px] text-slate-500">Tax ID: {settings?.taxId || 'TX-76-3770149'}</div>
                            </div>

                            {/* Receipt Metadata */}
                            <div className="border-t border-b border-dashed border-slate-400 py-2 my-2 space-y-1 text-[11px]">
                                <div className="flex justify-between">
                                    <span>ORDER:</span>
                                    <span className="font-bold">{order.orderNumber}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>DATE:</span>
                                    <span>{formattedDate}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>CASHIER:</span>
                                    <span>{order.cashierName}</span>
                                </div>
                                {order.customerName && (
                                    <div className="flex justify-between">
                                        <span>CUSTOMER:</span>
                                        <span>{order.customerName}</span>
                                    </div>
                                )}
                            </div>

                            {/* Line Items */}
                            <div className="py-2 space-y-2 border-b border-dashed border-slate-400">
                                <div className="flex justify-between font-bold text-[10px] text-slate-700">
                                    <span>ITEM</span>
                                    <span>TOTAL</span>
                                </div>
                                {order.items.map((item, idx) => (
                                    <div key={idx} className="space-y-0.5">
                                        <div className="flex justify-between font-semibold">
                                            <span className="truncate max-w-[180px]">{item.product.name}</span>
                                            <span>${(((item.unitPrice ?? 0) * item.quantity) - (item.discountAmount ?? 0)).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between text-[10px] text-slate-500">
                                            <span>
                                                {item.quantity} x ${(item.unitPrice ?? 0).toFixed(2)} ({item.product.size})
                                            </span>
                                            {(item.discountAmount ?? 0) > 0 && (
                                                <span className="text-emerald-700 font-medium">
                                                    Disc -${(item.discountAmount ?? 0).toFixed(2)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Financials Breakdown */}
                            <div className="py-2 space-y-1 text-[11px] border-b border-dashed border-slate-400">
                                <div className="flex justify-between">
                                    <span>Subtotal:</span>
                                    <span>${(order.subtotal ?? 0).toFixed(2)}</span>
                                </div>
                                {(order.discountTotal ?? 0) > 0 && (
                                    <div className="flex justify-between text-emerald-700 font-semibold">
                                        <span>Total Discount:</span>
                                        <span>-${(order.discountTotal ?? 0).toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span>Sales Tax:</span>
                                    <span>${(order.taxTotal ?? 0).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between font-bold text-sm pt-1 text-slate-950">
                                    <span>TOTAL:</span>
                                    <span>${(order.grandTotal ?? 0).toFixed(2)}</span>
                                </div>
                            </div>

                            {/* Loyalty Rewards Breakdown on Receipt */}
                            {(order.pointsEarned !== undefined || (order.pointsRedeemed !== undefined && order.pointsRedeemed > 0) || order.customerLoyaltyBalance !== undefined) && (
                                <div className="py-2 border-b border-dashed border-slate-400 space-y-1 text-[11px]">
                                    <div className="font-bold text-[10px] text-amber-900 uppercase tracking-wider flex justify-between">
                                        <span>★ LOYALTY REWARDS</span>
                                        {order.customerLoyaltyBalance !== undefined && (
                                            <span>BAL: {order.customerLoyaltyBalance} PTS</span>
                                        )}
                                    </div>
                                    {order.pointsRedeemed && order.pointsRedeemed > 0 ? (
                                        <div className="flex justify-between text-emerald-700 font-medium">
                                            <span>Points Redeemed:</span>
                                            <span>-{order.pointsRedeemed} pts (-${((order.pointsDiscountAmount || 0)).toFixed(2)})</span>
                                        </div>
                                    ) : null}
                                    {order.pointsEarned && order.pointsEarned > 0 ? (
                                        <div className="flex justify-between text-amber-800 font-bold">
                                            <span>Points Earned Today:</span>
                                            <span>+{order.pointsEarned} pts</span>
                                        </div>
                                    ) : null}
                                </div>
                            )}

                            {/* Payment Summary */}
                            <div className="py-2 space-y-1 text-[10px]">
                                <div className="flex justify-between">
                                    <span>PAYMENT METHOD:</span>
                                    <span className="uppercase font-bold">
                                        {order.payments && order.payments.length > 1
                                            ? `MULTI-TENDER (${order.payments.length} PAYMENTS)`
                                            : order.payment?.method === 'split'
                                                ? (order.payment?.splitDetails?.splitType === 'two_cards' ? 'SPLIT (2 CARDS)' : 'SPLIT (CASH + CARD)')
                                                : order.payment?.method || 'CASH'}
                                    </span>
                                </div>

                                {/* Multi-Payment Details if order has payments list */}
                                {order.payments && order.payments.length > 1 ? (
                                    <div className="py-1 border-y border-dashed border-slate-300 my-1 space-y-1">
                                        <div className="font-bold text-[9px] text-slate-700 uppercase">
                                            PAYMENTS RECORDED ({order.payments.length}):
                                        </div>
                                        {order.payments.map((p, idx) => (
                                            <div key={p.id || idx} className="space-y-0.5">
                                                <div className="flex justify-between text-[9.5px]">
                                                    <span className="uppercase font-semibold">
                                                        {p.method === 'cash'
                                                            ? `#${idx + 1} CASH:`
                                                            : `#${idx + 1} ${p.cardBrand || 'CARD'}${p.cardLast4 ? ` ****${p.cardLast4}` : ''}:`}
                                                    </span>
                                                    <span className="font-bold font-mono">${p.amount.toFixed(2)}</span>
                                                </div>
                                                {p.authCode && (
                                                    <div className="flex justify-between text-[8.5px] text-slate-500 pl-2">
                                                        <span>Auth: {p.authCode}</span>
                                                        <span className="uppercase text-emerald-700 font-bold">APPROVED</span>
                                                    </div>
                                                )}
                                                {p.changeDue !== undefined && p.changeDue > 0 && (
                                                    <div className="flex justify-between text-[8.5px] text-slate-500 pl-2">
                                                        <span>Change Tendered:</span>
                                                        <span>${p.changeDue.toFixed(2)}</span>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                        <div className="flex justify-between font-bold text-[9.5px] pt-1 border-t border-dotted border-slate-300">
                                            <span>TOTAL PAID:</span>
                                            <span>${order.payments.reduce((s, p) => s + p.amount, 0).toFixed(2)}</span>
                                        </div>
                                    </div>
                                ) : order.payment?.method === 'cash' ? (
                                    <>
                                        {order.payment?.cashEntries && order.payment.cashEntries.length > 1 ? (
                                            <div className="py-1 border-y border-dashed border-slate-300 my-1 space-y-0.5">
                                                <div className="font-bold text-[9px] text-slate-600 uppercase">Cash Tenders ({order.payment.cashEntries.length})</div>
                                                {order.payment.cashEntries.map((c, i) => (
                                                    <div key={c.id || i} className="flex justify-between text-[9px] text-slate-700">
                                                        <span>Tender #{i + 1} ({c.time}):</span>
                                                        <span>+${c.amount.toFixed(2)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : null}
                                        <div className="flex justify-between">
                                            <span>CASH TENDERED:</span>
                                            <span>${((order.payment?.cashTendered || order.grandTotal || 0)).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between font-bold">
                                            <span>CHANGE DUE:</span>
                                            <span>${((order.payment?.changeDue || 0)).toFixed(2)}</span>
                                        </div>
                                    </>
                                ) : order.payment?.method === 'split' ? (
                                    order.payment?.splitDetails?.splitType === 'two_cards' ? (
                                        <>
                                            <div className="flex justify-between">
                                                <span>CARD 1 ({order.payment.splitDetails?.card1Brand || 'Card'}{order.payment.splitDetails?.card1Last4 ? ` ****${order.payment.splitDetails.card1Last4}` : ''}):</span>
                                                <span>${((order.payment.splitDetails?.card1Amount || 0)).toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between text-[9px] text-slate-500">
                                                <span>AUTH 1:</span>
                                                <span>{order.payment.splitDetails?.card1Auth || 'Not provided'}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>CARD 2 ({order.payment.splitDetails?.card2Brand || 'Card'}{order.payment.splitDetails?.card2Last4 ? ` ****${order.payment.splitDetails.card2Last4}` : ''}):</span>
                                                <span>${((order.payment.splitDetails?.card2Amount || 0)).toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between text-[9px] text-slate-500">
                                                <span>AUTH 2:</span>
                                                <span>{order.payment.splitDetails?.card2Auth || 'Not provided'}</span>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="flex justify-between">
                                                <span>CASH PORTION:</span>
                                                <span>${((order.payment.splitDetails?.cashAmount || 0)).toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>CARD PORTION:</span>
                                                <span>${((order.payment.splitDetails?.cardAmount || 0)).toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between text-[9px] text-slate-500">
                                                <span>AUTH CODE:</span>
                                                <span>{order.payment.authCode || 'Not provided'}</span>
                                            </div>
                                        </>
                                    )
                                ) : (
                                    <>
                                        <div className="flex justify-between">
                                            <span>CARD:</span>
                                            <span>{order.payment.cardBrand} **** {order.payment.cardLast4}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>AUTH CODE:</span>
                                            <span>{order.payment.authCode}</span>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Barcode representation */}
                            <div className="text-center pt-3 border-t border-dashed border-slate-400 space-y-1">
                                <div className="h-8 bg-slate-900 mx-auto w-40 flex items-center justify-center text-[10px] text-white tracking-[6px] font-mono">
                                    ||||||||||||||||||||
                                </div>
                                <div className="text-[9px] text-slate-600">{order.orderNumber}</div>
                                <div className="text-[9px] text-slate-600 italic pt-2">
                                    {settings?.receiptFooter || 'Thank you for shopping! Please drink responsibly.'}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer actions */}
                <div className="p-3.5 bg-[#121212] border-t border-[#262626] flex items-center justify-between shrink-0">
                    <button
                        type="button"
                        onClick={handleSystemPrintFallback}
                        className="text-[11px] text-zinc-500 hover:text-zinc-300 underline cursor-pointer"
                    >
                        Windows Print Dialog
                    </button>

                    <button
                        id="receipt-new-sale-btn"
                        type="button"
                        onClick={onStartNewSale}
                        className="px-5 py-2 rounded-xl bg-[#C5A059] hover:bg-[#D4B06A] text-black text-xs font-black uppercase tracking-wider flex items-center space-x-2 transition-colors cursor-pointer shadow-md"
                    >
                        <Sparkles className="w-4 h-4 text-black" />
                        <span>New Sale</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
