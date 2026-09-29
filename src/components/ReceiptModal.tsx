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
