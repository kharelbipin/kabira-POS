import React, { useState, useEffect, useRef } from 'react';
import {
  CreditCard,
  Smartphone,
  QrCode,
  Keyboard,
  Lock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  RefreshCw,
  Copy,
  Check,
  ShieldCheck,
  Eye,
  EyeOff,
  UserCheck,
  Radio,
  FileSpreadsheet,
} from 'lucide-react';
import { CardFallbackMethod, PaymentSession, StoreSettings, User } from '../../types';
import { api } from '../../utils/api';
import { playBeep } from '../../utils/audio';

interface CardPaymentFallbackManagerProps {
  amountDue: number;
  orderNumber: string;
  settings: StoreSettings | null;
  currentUser: User | null;
  onPaymentSuccess: (details: {
    method: 'card' | 'contactless';
    fallbackMethod: CardFallbackMethod;
    cardBrand: string;
    cardLast4: string;
    authCode: string;
    processorTxId?: string;
    paymentSessionId?: string;
  }) => void;
  onCancel?: () => void;
}

export const CardPaymentFallbackManager: React.FC<CardPaymentFallbackManagerProps> = ({
  amountDue,
  orderNumber,
  settings,
  currentUser,
  onPaymentSuccess,
  onCancel,
}) => {
  // Selected card method: default is 'card_terminal' (primary)
  const [selectedMethod, setSelectedMethod] = useState<CardFallbackMethod>('card_terminal');

  // Terminal hardware status (PAY-014)
  const [terminalStatus, setTerminalStatus] = useState<'online' | 'offline' | 'chip_reader_error' | 'timeout'>('online');
  const [terminalIp, setTerminalIp] = useState<string>(settings?.paymentTerminalIp || '192.168.1.45');
  const [isSimulatingTerminal, setIsSimulatingTerminal] = useState<boolean>(false);

  // Active payment session (for QR / Tap to Pay / Self-Entry)
  const [activeSession, setActiveSession] = useState<PaymentSession | null>(null);
  const [sessionQrUrl, setSessionQrUrl] = useState<string>('');
  const [isCreatingSession, setIsCreatingSession] = useState<boolean>(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [remainingTime, setRemainingTime] = useState<string>('10:00');

  // Manual Keyed Card Entry state (PAY-002, PAY-016)
  const [manualCardNumber, setManualCardNumber] = useState<string>('');
  const [manualExp, setManualExp] = useState<string>('');
  const [manualCvv, setManualCvv] = useState<string>('');
  const [manualZip, setManualZip] = useState<string>('');
  const [manualReason, setManualReason] = useState<string>('Card chip damaged / unreadable');
  const [isAuthorizingManual, setIsAuthorizingManual] = useState<boolean>(false);
  const [manualError, setManualError] = useState<string | null>(null);

  // Manager Approval State (PAY-016)
  const [showManagerPinModal, setShowManagerPinModal] = useState<boolean>(false);
  const [managerPin, setManagerPin] = useState<string>('');
  const [managerPinError, setManagerPinError] = useState<string | null>(null);
  const [isManagerApproved, setIsManagerApproved] = useState<boolean>(false);

  // Terminal Primary processing state
  const [isProcessingTerminal, setIsProcessingTerminal] = useState<boolean>(false);
  const [terminalCardBrand, setTerminalCardBrand] = useState<string>('Visa');
  const [terminalError, setTerminalError] = useState<string | null>(null);

  // Customer Self-Entry in-modal state (PAY-003, PAY-005)
  const [selfCardNumber, setSelfCardNumber] = useState<string>('');
  const [selfExp, setSelfExp] = useState<string>('');
  const [selfCvv, setSelfCvv] = useState<string>('');
  const [selfZip, setSelfZip] = useState<string>('');
  const [isAuthorizingSelf, setIsAuthorizingSelf] = useState<boolean>(false);
  const [selfError, setSelfError] = useState<string | null>(null);

  const pollIntervalRef = useRef<any>(null);

  // Check initial terminal health
  useEffect(() => {
    api.getTerminalHealth()
      .then(res => {
        if (res.status) setTerminalStatus(res.status);
        if (res.deviceIp) setTerminalIp(res.deviceIp);
      })
      .catch(() => {});
  }, []);

  // Synchronize with Customer-facing Display via BroadcastChannel & localStorage
  const syncToCustomerDisplay = (screenState: 'active_cart' | 'customer_qr' | 'customer_self_entry', qrUrl?: string) => {
    try {
      const saved = localStorage.getItem('pos_customer_display_state');
      const base = saved ? JSON.parse(saved) : {};
      const updated = {
        ...base,
        screenState,
        grandTotal: amountDue,
        paymentQrUrl: qrUrl,
        paymentAmount: amountDue,
      };
      localStorage.setItem('pos_customer_display_state', JSON.stringify(updated));

      if ('BroadcastChannel' in window) {
        const channel = new BroadcastChannel('pos_customer_display_channel');
        channel.postMessage(updated);
        channel.close();
      }
    } catch (e) {}
  };

  // Switch card processing method
  const handleSelectMethod = (method: CardFallbackMethod) => {
    setSelectedMethod(method);
    setSessionError(null);
    setTerminalError(null);
    setManualError(null);
    setSelfError(null);

    // Cancel existing active session if changing method
    if (activeSession && activeSession.status !== 'payment_complete') {
      api.cancelPaymentSession(activeSession.id).catch(() => {});
      setActiveSession(null);
    }

    if (method === 'customer_qr') {
      initSession('customer_qr', 'customer', 'Customer Phone QR scan');
    } else if (method === 'tap_to_pay_phone') {
      initSession('tap_to_pay_phone', 'employee', 'Store Phone Tap to Pay');
      syncToCustomerDisplay('active_cart');
    } else if (method === 'customer_self_entry') {
      syncToCustomerDisplay('customer_self_entry');
    } else if (method === 'cashier_manual') {
      syncToCustomerDisplay('active_cart');
      const perm = settings?.cashierManualCardEntry || 'manager_required';
      if (perm === 'manager_required' && currentUser?.role !== 'manager' && currentUser?.role !== 'admin' && !isManagerApproved) {
        setShowManagerPinModal(true);
      }
    } else {
      syncToCustomerDisplay('active_cart');
    }
  };

  // Create payment session on backend (PAY-004, PAY-006, PAY-009, PAY-010)
  const initSession = async (method: CardFallbackMethod, mode: 'customer' | 'employee', reason: string) => {
    try {
      setIsCreatingSession(true);
      setSessionError(null);
      const res = await api.createPaymentSession({
        orderNumber,
        amount: amountDue,
        method,
        mode,
        registerId: 'Register #1',
        fallbackReason: reason,
      });

      if (res.success && res.session) {
        setActiveSession(res.session);
        setSessionQrUrl(res.qrUrl);
        if (mode === 'customer') {
          syncToCustomerDisplay('customer_qr', res.qrUrl);
        }
      }
    } catch (err: any) {
      setSessionError(err.message || 'Failed to initialize payment session');
    } finally {
      setIsCreatingSession(false);
    }
  };

  // Real-time Register Status Polling (PAY-011, PAY-012, PAY-022)
  useEffect(() => {
    if (!activeSession || activeSession.status === 'payment_complete' || activeSession.status === 'cancelled' || activeSession.status === 'expired') {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      return;
    }

    // Poll every 1200ms
    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await api.getPaymentSession(activeSession.id);
        if (res.success && res.session) {
          setActiveSession(res.session);

          // Check if session completed (PAY-012)
          if (res.session.status === 'payment_complete') {
            clearInterval(pollIntervalRef.current);
            playBeep();
            onPaymentSuccess({
              method: 'card',
              fallbackMethod: res.session.method as CardFallbackMethod,
              cardBrand: res.session.paymentResult?.brand || 'Card',
              cardLast4: res.session.paymentResult?.last4 || '4242',
              authCode: res.session.paymentResult?.authCode || 'APX-98421',
              processorTxId: res.session.paymentResult?.transactionId,
              paymentSessionId: res.session.id,
            });
          } else if (res.session.status === 'failed') {
            setSessionError(res.session.failureReason || 'Payment authorization failed');
          }
        }
      } catch (err) {}
    }, 1200);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [activeSession]);

  // Expiration countdown (PAY-010, PAY-022)
  useEffect(() => {
    if (!activeSession || activeSession.status === 'payment_complete') return;
    const timer = setInterval(() => {
      const diff = new Date(activeSession.expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setRemainingTime('Expired');
        setActiveSession(prev => (prev ? { ...prev, status: 'expired' } : null));
        clearInterval(timer);
      } else {
        const mins = Math.floor(diff / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setRemainingTime(`${mins}:${secs < 10 ? '0' : ''}${secs}`);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [activeSession]);

  // PAY-023: Cancel active mobile session
  const handleCancelSession = async () => {
    if (!activeSession) return;
    try {
      await api.cancelPaymentSession(activeSession.id);
      setActiveSession(null);
      syncToCustomerDisplay('active_cart');
    } catch (err: any) {
      setSessionError(err.message || 'Failed to cancel session');
    }
  };

  // Simulate hardware failure (PAY-014)
  const handleSimulateTerminalStatus = async (status: 'online' | 'offline' | 'chip_reader_error' | 'timeout') => {
    setIsSimulatingTerminal(true);
    try {
      const res = await api.simulateTerminalHealth(status);
      if (res.success) {
        setTerminalStatus(status);
        if (status !== 'online') {
          // PAY-014: Automatically switch to fallback options when terminal fails!
          if (settings?.terminalAutoFallbackOnFailure !== false) {
            handleSelectMethod('tap_to_pay_phone');
          }
        }
      }
    } finally {
      setIsSimulatingTerminal(false);
    }
  };

  // Primary Terminal Process (PAY-001)
  const handleProcessTerminalPayment = async (simulateDecline: boolean = false) => {
    if (terminalStatus !== 'online') {
      setTerminalError(`Terminal is unreachable (${terminalStatus}). Please use a fallback method.`);
      return;
    }

    setIsProcessingTerminal(true);
    setTerminalError(null);

    // Realistic terminal communication delay
    await new Promise(r => setTimeout(r, 1200));

    if (simulateDecline) {
      // PAY-015: Do Not Treat Decline as Reader Failure!
      setIsProcessingTerminal(false);
      setTerminalError('CARD DECLINED: Insufficient Funds (Issuer Code 05). Do not switch to manual entry without customer authorization.');
      return;
    }

    setIsProcessingTerminal(false);
    playBeep();
    onPaymentSuccess({
      method: 'card',
      fallbackMethod: 'card_terminal',
      cardBrand: terminalCardBrand,
      cardLast4: Math.floor(1000 + Math.random() * 9000).toString(),
      authCode: `APX-${Math.floor(100000 + Math.random() * 900000)}`,
      processorTxId: `ch_term_${Date.now()}`,
    });
  };

  // Cashier Manual Card Entry submit (PAY-002, PAY-016)
  const handleProcessManualEntry = async () => {
    const clean = manualCardNumber.replace(/\D/g, '');
    if (clean.length < 15) {
      setManualError('Enter a valid 15-16 digit card number');
      return;
    }
    if (manualExp.length < 5) {
      setManualError('Enter expiration in MM/YY format');
      return;
    }
    if (manualCvv.length < 3) {
      setManualError('Enter 3-4 digit CVV');
      return;
    }

    setIsAuthorizingManual(true);
    setManualError(null);

    try {
      // Detect brand
      let brand = 'Visa';
      if (clean.startsWith('5')) brand = 'Mastercard';
      if (clean.startsWith('3')) brand = 'American Express';
      if (clean.startsWith('6')) brand = 'Discover';

      // PAY-002, PAY-019: We NEVER store or pass raw CVV/PAN!
      const last4 = clean.slice(-4);
      const res = await api.processManualCardEntry({
        amount: amountDue,
        cardBrand: brand,
        cardLast4: last4,
        postalCode: manualZip,
        reason: manualReason,
        managerPin: isManagerApproved ? '5555' : managerPin,
        orderNumber,
      });

      if (res.success && res.paymentResult) {
        playBeep();
        onPaymentSuccess({
          method: 'card',
          fallbackMethod: 'cashier_manual',
          cardBrand: res.paymentResult.brand,
          cardLast4: res.paymentResult.last4,
          authCode: res.paymentResult.authCode,
          processorTxId: res.paymentResult.transactionId,
        });
      }
    } catch (err: any) {
      setManualError(err.message || 'Keyed transaction declined');
    } finally {
      setIsAuthorizingManual(false);
    }
  };

  // Customer Self-Entry in-modal submit (PAY-003, PAY-005)
  const handleProcessSelfEntry = async () => {
    const clean = selfCardNumber.replace(/\D/g, '');
    if (clean.length < 15) {
      setSelfError('Enter a valid 15-16 digit card number');
      return;
    }
    if (selfExp.length < 5) {
      setSelfError('Enter expiration in MM/YY');
      return;
    }
    if (selfCvv.length < 3) {
      setSelfError('Enter 3-4 digit CVV');
      return;
    }

    setIsAuthorizingSelf(true);
    setSelfError(null);

    try {
      let brand = 'Visa';
      if (clean.startsWith('5')) brand = 'Mastercard';
      if (clean.startsWith('3')) brand = 'Amex';
      const last4 = clean.slice(-4);

      // Create and authorize atomic session
      const sessRes = await api.createPaymentSession({
        orderNumber,
        amount: amountDue,
        method: 'customer_self_entry',
        mode: 'customer',
        registerId: 'Register #1',
        fallbackReason: 'Customer Self-Enter Card on Register/Display',
      });

      if (sessRes.success && sessRes.session) {
        const authRes = await api.authorizePaymentSession(sessRes.session.id, {
          cardBrand: brand,
          cardLast4: last4,
          entryMode: 'customer_self_entry',
          postalCode: selfZip,
          simulateFailure: 'none',
        });

        if (authRes.success) {
          playBeep();
          onPaymentSuccess({
            method: 'card',
            fallbackMethod: 'customer_self_entry',
            cardBrand: brand,
            cardLast4: last4,
            authCode: authRes.session.paymentResult?.authCode || 'APX-77182',
            processorTxId: authRes.session.paymentResult?.transactionId,
            paymentSessionId: authRes.session.id,
          });
        } else {
          setSelfError('Card declined');
        }
      }
    } catch (err: any) {
      setSelfError(err.message || 'Payment authorization failed');
    } finally {
      setIsAuthorizingSelf(false);
    }
  };

  // Manager PIN Approval verification (PAY-016)
  const handleVerifyManagerPin = () => {
    if (managerPin === '5555' || managerPin === '9999') {
      setIsManagerApproved(true);
      setShowManagerPinModal(false);
      setManagerPinError(null);
    } else {
      setManagerPinError('Invalid Manager PIN. Please contact store manager.');
    }
  };

  // Helper to render live session status progress tracker (PAY-011)
  const renderSessionStatusTracker = () => {
    if (!activeSession) return null;

    const steps: { key: string; label: string }[] = [
      { key: 'qr_created', label: 'QR Created' },
      { key: 'customer_connected', label: 'Device Connected' },
      { key: 'entering_payment', label: 'Entering Info' },
      { key: 'processing', label: 'Processing' },
      { key: 'payment_complete', label: 'Complete' },
    ];

    const currentIdx = steps.findIndex(s => s.key === activeSession.status);

    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs font-black uppercase tracking-wider text-amber-400">
              Live Register Status (PAY-011)
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-400 flex items-center space-x-1">
            <Clock className="w-3 h-3 text-amber-400" />
            <span>Expires in {remainingTime}</span>
          </span>
        </div>

        {/* Step indicators */}
        <div className="grid grid-cols-5 gap-1 pt-1">
          {steps.map((step, idx) => {
            const isDone = currentIdx > idx || activeSession.status === 'payment_complete';
            const isCurrent = currentIdx === idx;
            return (
              <div key={step.key} className="text-center space-y-1">
                <div
                  className={`h-1.5 rounded-full transition-all ${
                    isDone
                      ? 'bg-emerald-500'
                      : isCurrent
                      ? 'bg-amber-400 animate-pulse'
                      : 'bg-slate-800'
                  }`}
                />
                <span
                  className={`text-[9px] block font-bold leading-tight ${
                    isDone
                      ? 'text-emerald-400'
                      : isCurrent
                      ? 'text-amber-300 font-black'
                      : 'text-slate-600'
                  }`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 text-slate-800">
      {/* Question Header matching prompt: "How would you like to process the card?" */}
      <div>
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
          How would you like to process the card?
        </h3>
        <p className="text-xs text-slate-500">
          Select primary terminal or choose an approved payment fallback option below.
        </p>
      </div>

      {/* Recommended Layout from Prompt */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Left Column: Method Buttons */}
        <div className="space-y-2.5">
          {/* 1. CARD TERMINAL (Primary) */}
          <button
            type="button"
            onClick={() => handleSelectMethod('card_terminal')}
            className={`w-full text-left p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-start space-x-3 ${
              selectedMethod === 'card_terminal'
                ? 'border-amber-500 bg-amber-50/70 shadow-sm'
                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                selectedMethod === 'card_terminal'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              <CreditCard className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-900">
                  💳 CARD TERMINAL
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Primary
                </span>
              </div>
              <span className="text-xs text-slate-600 block mt-0.5">Chip / Tap / Swipe</span>
              <span className="text-[11px] text-slate-400 block">Recommended primary method</span>
            </div>
          </button>

          {/* Fallback Divider Header matching prompt: "Terminal problem?" */}
          <div className="pt-2 pb-0.5 flex items-center space-x-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
              Terminal problem? Fallback Options:
            </span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* 2. TAP TO PAY ON PHONE */}
          <button
            type="button"
            onClick={() => handleSelectMethod('tap_to_pay_phone')}
            className={`w-full text-left p-3 rounded-2xl border-2 transition-all cursor-pointer flex items-start space-x-3 ${
              selectedMethod === 'tap_to_pay_phone'
                ? 'border-amber-500 bg-amber-50/70 shadow-sm'
                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                selectedMethod === 'tap_to_pay_phone'
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              <Smartphone className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-black uppercase tracking-wider text-slate-900 block">
                📱 TAP TO PAY ON PHONE
              </span>
              <span className="text-xs text-slate-500 block">Use authorized store phone</span>
            </div>
          </button>

          {/* 3. CUSTOMER QR PAYMENT */}
          <button
            type="button"
            onClick={() => handleSelectMethod('customer_qr')}
            className={`w-full text-left p-3 rounded-2xl border-2 transition-all cursor-pointer flex items-start space-x-3 ${
              selectedMethod === 'customer_qr'
                ? 'border-amber-500 bg-amber-50/70 shadow-sm'
                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                selectedMethod === 'customer_qr'
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              <QrCode className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-black uppercase tracking-wider text-slate-900 block">
                ▣ CUSTOMER QR PAYMENT
              </span>
              <span className="text-xs text-slate-500 block">Customer scans QR with own phone</span>
            </div>
          </button>

          {/* 4. CUSTOMER SELF-ENTER CARD */}
          <button
            type="button"
            onClick={() => handleSelectMethod('customer_self_entry')}
            className={`w-full text-left p-3 rounded-2xl border-2 transition-all cursor-pointer flex items-start space-x-3 ${
              selectedMethod === 'customer_self_entry'
                ? 'border-amber-500 bg-amber-50/70 shadow-sm'
                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                selectedMethod === 'customer_self_entry'
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              <Keyboard className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-black uppercase tracking-wider text-slate-900 block">
                ⌨ CUSTOMER SELF-ENTER CARD
              </span>
              <span className="text-xs text-slate-500 block">Customer privately enters card info</span>
            </div>
          </button>

          {/* 5. CASHIER MANUAL CARD ENTRY */}
          <button
            type="button"
            onClick={() => handleSelectMethod('cashier_manual')}
            className={`w-full text-left p-3 rounded-2xl border-2 transition-all cursor-pointer flex items-start space-x-3 ${
              selectedMethod === 'cashier_manual'
                ? 'border-amber-500 bg-amber-50/70 shadow-sm'
                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                selectedMethod === 'cashier_manual'
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              <Lock className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-black uppercase tracking-wider text-slate-900 block">
                🔐 CASHIER MANUAL CARD ENTRY
              </span>
              <span className="text-xs text-slate-500 block">Permission / manager approval</span>
            </div>
          </button>
        </div>

        {/* Right Column: Active Interactive Panel for Selected Method */}
        <div className="bg-slate-50 border border-slate-200 rounded-3xl p-4 flex flex-col justify-between">
          {/* Method 1: Primary Card Terminal */}
          {selectedMethod === 'card_terminal' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Terminal Status
                </span>
                <span
                  className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    terminalStatus === 'online'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-rose-100 text-rose-800 border border-rose-300'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      terminalStatus === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                    }`}
                  />
                  <span className="capitalize">{terminalStatus.replace(/_/g, ' ')}</span>
                </span>
              </div>

              {/* Terminal Connection Details */}
              <div className="p-3 bg-white rounded-2xl border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between text-slate-500">
                  <span>Hardware Model:</span>
                  <span className="font-semibold text-slate-800">PAX D210 EMV Wireless</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Device IP:</span>
                  <span className="font-mono text-slate-800">{terminalIp}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Status:</span>
                  <span className="font-semibold text-slate-800">
                    {terminalStatus === 'online' ? 'Connected & Ready' : 'Hardware Alert (PAY-014)'}
                  </span>
                </div>
              </div>

              {/* Hardware Fault Simulation (PAY-014) */}
              <div className="bg-amber-50/80 border border-amber-200 p-3 rounded-2xl text-xs space-y-2">
                <div className="flex items-center justify-between text-amber-900 font-bold">
                  <span className="flex items-center space-x-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>PAY-014 Terminal Tester:</span>
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSimulateTerminalStatus('chip_reader_error')}
                    disabled={isSimulatingTerminal}
                    className="p-1.5 rounded-lg bg-white hover:bg-amber-100 border border-amber-300 text-[10px] font-bold text-slate-800 text-left transition-colors"
                  >
                    Simulate Chip Error
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSimulateTerminalStatus('offline')}
                    disabled={isSimulatingTerminal}
                    className="p-1.5 rounded-lg bg-white hover:bg-amber-100 border border-amber-300 text-[10px] font-bold text-slate-800 text-left transition-colors"
                  >
                    Simulate Terminal Offline
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSimulateTerminalStatus('online')}
                    disabled={isSimulatingTerminal}
                    className="p-1.5 rounded-lg bg-white hover:bg-emerald-50 border border-emerald-300 text-[10px] font-bold text-emerald-800 col-span-2 text-center transition-colors"
                  >
                    Restore Terminal Online
                  </button>
                </div>
              </div>

              {terminalError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <div>
                    <span className="font-bold block">Terminal Message</span>
                    <span>{terminalError}</span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleProcessTerminalPayment(false)}
                  disabled={isProcessingTerminal || terminalStatus !== 'online'}
                  className="w-full py-3 px-4 rounded-2xl bg-[#F3C067] hover:bg-[#F59E0B] text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-all shadow-md active:scale-98 cursor-pointer disabled:opacity-50"
                >
                  {isProcessingTerminal ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Communicating with Terminal...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4" />
                      <span>Send ${amountDue.toFixed(2)} to Terminal</span>
                    </>
                  )}
                </button>

                {/* Decline test button (PAY-015) */}
                <button
                  type="button"
                  onClick={() => handleProcessTerminalPayment(true)}
                  disabled={isProcessingTerminal}
                  className="w-full text-center text-[10px] text-slate-500 hover:text-amber-700 underline font-mono"
                >
                  Test Card Decline (PAY-015: Ensure Decline Remains Declined)
                </button>
              </div>
            </div>
          )}

          {/* Method 2: Tap to Pay on Store Phone (PAY-006, PAY-007, PAY-008) */}
          {selectedMethod === 'tap_to_pay_phone' && (
            <div className="space-y-3 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 mb-3">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-900">
                    Employee Store Phone Terminal
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-100 text-purple-800">
                    Store Device
                  </span>
                </div>

                <p className="text-xs text-slate-500 mb-3">
                  Scan this QR code with the authorized store phone or launch directly on this device to accept customer tap.
                </p>

                {/* QR Code Container */}
                {sessionQrUrl ? (
                  <div className="p-3 bg-white rounded-2xl border border-slate-200 text-center shadow-xs flex flex-col items-center">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(sessionQrUrl)}`}
                      alt="Store Phone Tap QR"
                      className="w-36 h-36 object-contain mb-2"
                      referrerPolicy="no-referrer"
                    />
                    <div className="text-[10px] font-mono text-slate-400">
                      Scan with Store Phone Camera
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
                    <span>Creating secure employee session...</span>
                  </div>
                )}
              </div>

              {renderSessionStatusTracker()}

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <a
                  href={sessionQrUrl || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center space-x-2 transition-colors cursor-pointer text-center"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Store Phone Simulator in New Tab</span>
                </a>

                {activeSession && (
                  <button
                    type="button"
                    onClick={handleCancelSession}
                    className="w-full py-2 text-center text-xs text-rose-600 hover:text-rose-700 font-bold transition-colors"
                  >
                    Cancel Tap to Pay Session (PAY-023)
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Method 3: Customer QR Payment (PAY-004, PAY-005, PAY-008, PAY-009, PAY-010) */}
          {selectedMethod === 'customer_qr' && (
            <div className="space-y-3 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 mb-3">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-900">
                    Customer Phone QR Code
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-800">
                    Mirrored on 2nd Display
                  </span>
                </div>

                <p className="text-xs text-slate-500 mb-3">
                  Customer scans with their own phone camera to pay privately with Apple Pay, Google Pay, or Card.
                </p>

                {/* QR Code Container */}
                {sessionQrUrl ? (
                  <div className="p-3 bg-white rounded-2xl border border-slate-200 text-center shadow-xs flex flex-col items-center">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(sessionQrUrl)}`}
                      alt="Customer Payment QR"
                      className="w-36 h-36 object-contain mb-2"
                      referrerPolicy="no-referrer"
                    />
                    <div className="text-[11px] font-black text-amber-600">
                      Amount: ${amountDue.toFixed(2)} (Fixed, PAY-009)
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-500" />
                    <span>Generating single-use payment token...</span>
                  </div>
                )}
              </div>

              {renderSessionStatusTracker()}

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <a
                  href={sessionQrUrl || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center justify-center space-x-2 transition-colors cursor-pointer text-center shadow-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Customer Phone Page in New Tab</span>
                </a>

                {activeSession && (
                  <button
                    type="button"
                    onClick={handleCancelSession}
                    className="w-full py-2 text-center text-xs text-rose-600 hover:text-rose-700 font-bold transition-colors"
                  >
                    Cancel Customer QR Session (PAY-023)
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Method 4: Customer Self-Enter Card (PAY-003, PAY-005, PAY-017) */}
          {selectedMethod === 'customer_self_entry' && (
            <div className="space-y-3 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 mb-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-900">
                    Customer Private Entry
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-indigo-100 text-indigo-800">
                    Turn Screen to Customer
                  </span>
                </div>

                <p className="text-[11px] text-slate-500 mb-2">
                  Customer privately enters card info directly into the secure payment form below.
                </p>

                {selfError && (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs mb-2">
                    {selfError}
                  </div>
                )}

                <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-2.5">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Card Number
                    </label>
                    <input
                      type="text"
                      placeholder="•••• •••• •••• ••••"
                      value={selfCardNumber}
                      onChange={e => setSelfCardNumber(e.target.value.replace(/\D/g, '').slice(0, 16))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Expires (MM/YY)
                      </label>
                      <input
                        type="text"
                        placeholder="MM/YY"
                        value={selfExp}
                        onChange={e => setSelfExp(e.target.value)}
                        maxLength={5}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 text-center focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Security CVV
                      </label>
                      <input
                        type="password"
                        placeholder="•••"
                        value={selfCvv}
                        onChange={e => setSelfCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        maxLength={4}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 text-center focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Billing ZIP
                    </label>
                    <input
                      type="text"
                      placeholder="76048"
                      value={selfZip}
                      onChange={e => setSelfZip(e.target.value.replace(/\D/g, '').slice(0, 5))}
                      maxLength={5}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleProcessSelfEntry}
                  disabled={isAuthorizingSelf}
                  className="w-full py-3 px-4 rounded-2xl bg-[#F3C067] hover:bg-[#F59E0B] text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-all shadow-md active:scale-98 cursor-pointer disabled:opacity-50"
                >
                  {isAuthorizingSelf ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Authorizing Private Entry...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Customer Pay ${amountDue.toFixed(2)}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Method 5: Cashier Manual Card Entry (PAY-002, PAY-016) */}
          {selectedMethod === 'cashier_manual' && (
            <div className="space-y-3 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 mb-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-900">
                    Cashier Keyed Card Entry
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-100 text-rose-800">
                    {isManagerApproved ? 'Manager Approved' : 'Keyed CNP'}
                  </span>
                </div>

                {manualError && (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs mb-2">
                    {manualError}
                  </div>
                )}

                <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-2.5">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Reason for Manual Entry (PAY-028 Audit)
                    </label>
                    <select
                      value={manualReason}
                      onChange={e => setManualReason(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-amber-400"
                    >
                      <option value="Card chip damaged / unreadable">Card chip damaged / unreadable</option>
                      <option value="Magnetic stripe unreadable">Magnetic stripe unreadable</option>
                      <option value="Reader communication timeout">Reader communication timeout</option>
                      <option value="Card-not-present / phone order">Card-not-present / phone order</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Card Number
                    </label>
                    <input
                      type="text"
                      placeholder="4532 •••• •••• 8920"
                      value={manualCardNumber}
                      onChange={e => setManualCardNumber(e.target.value.replace(/\D/g, '').slice(0, 16))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Expires (MM/YY)
                      </label>
                      <input
                        type="text"
                        placeholder="MM/YY"
                        value={manualExp}
                        onChange={e => setManualExp(e.target.value)}
                        maxLength={5}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 text-center focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1 flex justify-between">
                        <span>CVV</span>
                        <span className="text-[9px] text-slate-400">Never saved</span>
                      </label>
                      <input
                        type="password"
                        placeholder="•••"
                        value={manualCvv}
                        onChange={e => setManualCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        maxLength={4}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 text-center focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Billing ZIP
                    </label>
                    <input
                      type="text"
                      placeholder="76048"
                      value={manualZip}
                      onChange={e => setManualZip(e.target.value.replace(/\D/g, '').slice(0, 5))}
                      maxLength={5}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleProcessManualEntry}
                  disabled={isAuthorizingManual}
                  className="w-full py-3 px-4 rounded-2xl bg-[#F3C067] hover:bg-[#F59E0B] text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-all shadow-md active:scale-98 cursor-pointer disabled:opacity-50"
                >
                  {isAuthorizingManual ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Authorizing Keyed Transaction...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Process Keyed ${amountDue.toFixed(2)}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Manager PIN Modal (PAY-016) */}
      {showManagerPinModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 mx-auto flex items-center justify-center">
              <UserCheck className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h4 className="text-base font-black text-slate-900 uppercase">
                Manager Approval Required
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Store policy requires manager approval before processing a keyed card transaction (PAY-016).
              </p>
            </div>

            {managerPinError && (
              <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs text-center font-semibold">
                {managerPinError}
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1 text-center">
                Enter Manager PIN (Demo: 5555 or 9999)
              </label>
              <input
                type="password"
                maxLength={4}
                value={managerPin}
                onChange={e => setManagerPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full text-center text-2xl font-mono tracking-widest bg-slate-50 border border-slate-200 rounded-xl py-2 focus:outline-none focus:border-amber-400"
                autoFocus
              />
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowManagerPinModal(false);
                  handleSelectMethod('card_terminal');
                }}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleVerifyManagerPin}
                className="flex-1 py-2.5 rounded-xl bg-[#F3C067] hover:bg-[#F59E0B] text-slate-950 text-xs font-black uppercase tracking-wider"
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
