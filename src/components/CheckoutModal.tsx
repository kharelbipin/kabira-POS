import React, { useState, useEffect } from 'react';
import {
  PaymentMethod,
  CartItem,
  Customer,
  User,
  StoreSettings,
  PaymentRecord,
} from '../types';
import { playBeep } from '../utils/audio';
import { hardwareStore } from '../hardware';
import { CardPaymentFallbackManager } from './payment/CardPaymentFallbackManager';
import {
  Banknote,
  CreditCard,
  Smartphone,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  X,
  AlertCircle,
  AlertTriangle,
  Award,
  Check,
  Trash2,
  Clock,
  Wifi,
  ChevronDown,
  Gift,
  FileText,
  UserCheck,
  RefreshCw,
} from 'lucide-react';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  subtotal: number;
  discountTotal: number;
  discountPercent: number;
  taxTotal: number;
  grandTotal: number;
  customer: Customer | null;
  currentUser: User | null;
  settings: StoreSettings | null;
  onCompleteOrder: (paymentDetails: any) => Promise<void>;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  items,
  subtotal,
  discountTotal,
  discountPercent,
  taxTotal,
  grandTotal,
  customer,
  currentUser,
  settings,
  onCompleteOrder,
}) => {
  // ----------------------------------------------------
  // Loyalty Program Redemption State
  // ----------------------------------------------------
  const loyaltyEnabled = settings?.loyaltyProgramEnabled !== false;
  const earnRate = settings?.loyaltyPointsPerDollar ?? 1;
  const redemptionRate = settings?.loyaltyPointsPerDollarDiscount ?? 20; // 20 pts = $1
  const minPointsToRedeem = settings?.loyaltyMinPointsToRedeem ?? 50;
  const maxDiscountPercent = settings?.loyaltyMaxDiscountPercent ?? 50;

  const maxAllowedDiscountDollars = Math.min(grandTotal, (subtotal * maxDiscountPercent) / 100);
  const customerPoints = customer?.loyaltyPoints ?? 0;
  const maxPointsCustomerCanRedeem = Math.min(
    customerPoints,
    Math.floor(maxAllowedDiscountDollars * redemptionRate)
  );
  const canCustomerRedeem = loyaltyEnabled && !!customer && customerPoints >= minPointsToRedeem && maxPointsCustomerCanRedeem >= minPointsToRedeem;

  const [applyLoyaltyPoints, setApplyLoyaltyPoints] = useState<boolean>(false);
  const [pointsToRedeem, setPointsToRedeem] = useState<number>(0);

  const handleToggleLoyalty = (checked: boolean) => {
    playBeep('click');
    setApplyLoyaltyPoints(checked);
    if (checked && pointsToRedeem === 0) {
      setPointsToRedeem(maxPointsCustomerCanRedeem);
    }
  };

  const pointsDiscount = applyLoyaltyPoints && pointsToRedeem > 0
    ? Math.round((pointsToRedeem / redemptionRate) * 100) / 100
    : 0;

  const safeGrandTotal = Number(grandTotal) || 0;
  const effectiveGrandTotal = Math.max(0, Math.round((safeGrandTotal - pointsDiscount) * 100) / 100);

  // ----------------------------------------------------
  // Manager Approval State (Discounts exceeding threshold)
  // ----------------------------------------------------
  const discountThreshold = settings?.requireManagerDiscountAbove ?? 20;
  const isHighDiscount = discountPercent > discountThreshold;
  const isManagerOrAdmin = currentUser?.role === 'Manager' || currentUser?.role === 'Admin';
  const needsManagerApproval = isHighDiscount && !isManagerOrAdmin;
  const [managerPin, setManagerPin] = useState<string>('');
  const [managerApproved, setManagerApproved] = useState<boolean>(false);
  const [managerApprovalError, setManagerApprovalError] = useState<string | null>(null);

  const handleVerifyManagerPin = () => {
    if (managerPin === '5555' || managerPin === '9999') {
      playBeep('success');
      setManagerApproved(true);
      setManagerApprovalError(null);
    } else {
      playBeep('error');
      setManagerApprovalError('Invalid Manager PIN. Use 5555 or 9999');
    }
  };

  // ----------------------------------------------------
  // Core Multi-Payment / Partial Tender Engine State
  // ----------------------------------------------------
  const [recordedPayments, setRecordedPayments] = useState<PaymentRecord[]>([]);
  const [tenderInput, setTenderInput] = useState<string>('');
  const [tenderInputError, setTenderInputError] = useState<string | null>(null);
  const [changeDueCustomer, setChangeDueCustomer] = useState<number>(0);

  // Card Terminal Flow (With 30-Second Timeout & Auto-Refresh)
  const [activeCardCharge, setActiveCardCharge] = useState<number | null>(null);
  const [cardBrand, setCardBrand] = useState<'Visa' | 'Mastercard' | 'Amex' | 'Discover' | 'Apple Pay' | 'Google Pay'>('Visa');
  const [terminalStatus, setTerminalStatus] = useState<'idle' | 'waiting' | 'approved' | 'declined' | 'cancelled' | 'timeout'>('idle');
  const [terminalErrorMsg, setTerminalErrorMsg] = useState<string | null>(null);
  const [cardTimerSeconds, setCardTimerSeconds] = useState<number>(30);
  const [cardTimeoutNotification, setCardTimeoutNotification] = useState<string | null>(null);

  // Other Payment Methods Menu
  const [showOtherMenu, setShowOtherMenu] = useState<boolean>(false);
  const [otherMethodType, setOtherMethodType] = useState<'gift_card' | 'cheque' | 'store_credit' | 'fallback' | null>(null);
  const [otherReference, setOtherReference] = useState<string>('');

  // General Status & Warnings
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [showCancelWarning, setShowCancelWarning] = useState<boolean>(false);
  const [showNumpad, setShowNumpad] = useState<boolean>(false);

  // ----------------------------------------------------
  // Dynamic Core Calculations
  // Total Paid = Sum of all successful payments
  // Remaining Balance = Order Total - Total Paid
  // ----------------------------------------------------
  const successfulPayments = recordedPayments.filter(p => p.status === 'completed' || p.status === 'approved');
  const totalAmountPaid = Math.round(successfulPayments.reduce((sum, p) => sum + p.amount, 0) * 100) / 100;
  const remainingBalance = Math.max(0, Math.round((effectiveGrandTotal - totalAmountPaid) * 100) / 100);
  const isPartiallyPaid = totalAmountPaid > 0 && remainingBalance > 0.005;
  const isFullyPaid = remainingBalance <= 0.005 && effectiveGrandTotal > 0;

  // Reset or initialize when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setRecordedPayments([]);
      setTenderInput('');
      setTenderInputError(null);
      setChangeDueCustomer(0);
      setActiveCardCharge(null);
      setTerminalStatus('idle');
      setTerminalErrorMsg(null);
      setCardTimerSeconds(30);
      setCardTimeoutNotification(null);
      setShowOtherMenu(false);
      setOtherMethodType(null);
      setShowCancelWarning(false);
      setManagerApproved(false);
      setManagerPin('');
      setApplyLoyaltyPoints(false);
      setPointsToRedeem(0);
    }
  }, [isOpen]);

  const handleCardTimeout = () => {
    playBeep('error');
    const timedOutAmt = activeCardCharge;
    setActiveCardCharge(null);
    setTerminalStatus('idle');
    setIsProcessing(false);
    setTenderInput('');
    setCardTimeoutNotification(
      `Card Terminal Timed Out (30s): System did not receive payment from the counter PIN pad ($${(timedOutAmt || 0).toFixed(2)}). Screen automatically refreshed and unlocked. Cashier can retry Card or tender Cash.`
    );
  };

  const handleCancelCardTerminal = () => {
    playBeep('click');
    setActiveCardCharge(null);
    setTerminalStatus('idle');
    setIsProcessing(false);
    setTerminalErrorMsg(null);
    setCardTimeoutNotification(null);
  };

  // ----------------------------------------------------
  // 30-Second Card Terminal Watchdog & Auto-Refresh
  // If terminal does not get payment within 30 seconds, automatically cancel and refresh the screen!
  // Unconditionally called at top level to strictly adhere to React Rules of Hooks
  // ----------------------------------------------------
  useEffect(() => {
    let timer: any = null;
    if (isOpen && activeCardCharge !== null && terminalStatus === 'waiting') {
      setCardTimerSeconds(30);
      timer = setInterval(() => {
        setCardTimerSeconds(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            handleCardTimeout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setCardTimerSeconds(30);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isOpen, activeCardCharge, terminalStatus]);

  // Helper to determine active amount: if input is entered, use that amount; if empty, use remaining balance
  const getActiveAmount = (): number => {
    const parsed = parseFloat(tenderInput);
    if (!isNaN(parsed) && parsed > 0) {
      return Math.round(parsed * 100) / 100;
    }
    return remainingBalance;
  };

  // ----------------------------------------------------
  // Cash Tender Handler (Multiple Partial or Exact/Excess Cash)
  // ----------------------------------------------------
  const handlePayCash = (overrideAmount?: number) => {
    if (needsManagerApproval && !managerApproved) {
      setTenderInputError('Manager authorization required before collecting payment.');
      return;
    }

    const amt = overrideAmount !== undefined ? overrideAmount : getActiveAmount();
    if (isNaN(amt) || amt <= 0) {
      playBeep('error');
      setTenderInputError('Please enter a valid cash amount greater than $0.00');
      return;
    }

    setTenderInputError(null);
    setGeneralError(null);

    // If customer hands more cash than remaining, calculate change due
    let actualPaymentAmount = amt;
    let changeFromThisPayment = 0;
    if (amt > (remainingBalance + 0.005)) {
      actualPaymentAmount = remainingBalance;
      changeFromThisPayment = Math.round((amt - remainingBalance) * 100) / 100;
    }

    const newPaymentRecord: PaymentRecord = {
      id: `pay-${Date.now()}-cash-${Math.random().toString(36).substr(2, 4)}`,
      method: 'cash',
      amount: actualPaymentAmount,
      status: 'completed',
      timestamp: new Date().toISOString(),
      cashierId: currentUser?.id || 'usr-1',
      cashierName: currentUser?.name || 'Cashier',
      registerId: 'reg-01',
      paymentReference: changeFromThisPayment > 0
        ? `Tendered $${amt.toFixed(2)} • Change Due: $${changeFromThisPayment.toFixed(2)}`
        : 'Cash Tendered',
      cashTendered: amt,
      changeDue: changeFromThisPayment,
    };

    playBeep('success');
    setRecordedPayments(prev => [...prev, newPaymentRecord]);
    setTenderInput('');
    if (changeFromThisPayment > 0) {
      setChangeDueCustomer(prev => prev + changeFromThisPayment);
    }
  };

  // ----------------------------------------------------
  // Card Tender Handler
  // If cashier entered an amount, charge that amount.
  // If no amount entered, charge the full remaining balance.
  // ----------------------------------------------------
  const handleInitiateCardPayment = (overrideAmount?: number) => {
    if (needsManagerApproval && !managerApproved) {
      setTenderInputError('Manager authorization required before collecting payment.');
      return;
    }

    const amt = overrideAmount !== undefined ? overrideAmount : getActiveAmount();
    if (isNaN(amt) || amt <= 0) {
      playBeep('error');
      setTenderInputError('Please enter a valid card amount greater than $0.00');
      return;
    }

    if (amt > (remainingBalance + 0.005)) {
      playBeep('error');
      setTenderInputError(`Card amount ($${amt.toFixed(2)}) cannot exceed remaining balance of $${remainingBalance.toFixed(2)}`);
      return;
    }

    setTenderInputError(null);
    setGeneralError(null);
    setCardTimeoutNotification(null);
    setActiveCardCharge(amt);
    setTerminalStatus('waiting');
    setTerminalErrorMsg(null);
    setCardTimerSeconds(30);
  };

  // Process Card Terminal Outcomes (Simulate Approved, Declined, Cancelled, Timeout)
  const handleTerminalOutcome = async (outcome: 'approved' | 'declined' | 'cancelled' | 'timeout') => {
    if (!activeCardCharge || activeCardCharge <= 0) return;

    setIsProcessing(true);
    setTerminalStatus('waiting');
    setTerminalErrorMsg(null);

    // Realistic terminal PIN pad simulation latency
    await new Promise(r => setTimeout(r, 600));

    if (outcome === 'approved') {
      playBeep('success');
      setTerminalStatus('approved');

      const cardRecord: PaymentRecord = {
        id: `pay-${Date.now()}-card-${Math.random().toString(36).substr(2, 4)}`,
        method: 'card',
        amount: activeCardCharge,
        status: 'approved',
        timestamp: new Date().toISOString(),
        cashierId: currentUser?.id || 'usr-1',
        cashierName: currentUser?.name || 'Cashier',
        registerId: 'reg-01',
        cardBrand,
        cardLast4: Math.floor(1000 + Math.random() * 9000).toString(),
        authCode: `AUTH-${Math.floor(100000 + Math.random() * 900000)}`,
        paymentReference: `${cardBrand} PIN Pad Approved`,
      };

      setRecordedPayments(prev => [...prev, cardRecord]);
      setActiveCardCharge(null);
      setTenderInput('');
      setIsProcessing(false);
      setCardTimeoutNotification(null);
    } else if (outcome === 'declined') {
      playBeep('error');
      setIsProcessing(false);
      setTerminalStatus('declined');
      setTerminalErrorMsg(
        `Card Terminal: DECLINED (Code 51: Insufficient funds). Previous payments ($${totalAmountPaid.toFixed(2)}) remain safely recorded. Remaining balance is $${remainingBalance.toFixed(2)}.`
      );
    } else if (outcome === 'cancelled') {
      playBeep('click');
      setIsProcessing(false);
      setTerminalStatus('cancelled');
      setTerminalErrorMsg(
        `Customer Cancelled: Transaction was cancelled at the PIN pad. Previously collected payments ($${totalAmountPaid.toFixed(2)}) remain preserved.`
      );
    } else if (outcome === 'timeout') {
      playBeep('error');
      setIsProcessing(false);
      setTerminalStatus('timeout');
      setTerminalErrorMsg(
        `Device Timeout: Terminal response timed out. Previously collected payments ($${totalAmountPaid.toFixed(2)}) remain preserved.`
      );
    }
  };

  // ----------------------------------------------------
  // Other Payment Method Handler (Gift Card, Cheque, Store Credit, Fallback)
  // ----------------------------------------------------
  const handlePayOther = (methodType: 'gift_card' | 'cheque' | 'store_credit') => {
    const amt = getActiveAmount();
    if (isNaN(amt) || amt <= 0) {
      setTenderInputError('Please enter a valid amount');
      return;
    }
    if (amt > (remainingBalance + 0.005)) {
      setTenderInputError(`Amount cannot exceed remaining balance of $${remainingBalance.toFixed(2)}`);
      return;
    }

    playBeep('success');
    const newRecord: PaymentRecord = {
      id: `pay-${Date.now()}-${methodType}-${Math.random().toString(36).substr(2, 4)}`,
      method: methodType === 'gift_card' ? 'cash' : 'card', // mapped to supported enum
      amount: amt,
      status: 'completed',
      timestamp: new Date().toISOString(),
      cashierId: currentUser?.id || 'usr-1',
      cashierName: currentUser?.name || 'Cashier',
      registerId: 'reg-01',
      paymentReference: `${methodType.toUpperCase()} ${otherReference ? `(#${otherReference})` : ''}`,
      authCode: `OTH-${Math.floor(10000 + Math.random() * 90000)}`,
    };

    setRecordedPayments(prev => [...prev, newRecord]);
    setTenderInput('');
    setShowOtherMenu(false);
    setOtherMethodType(null);
    setOtherReference('');
  };

  // ----------------------------------------------------
  // Void an individual payment (if cashier mistakenly entered it)
  // ----------------------------------------------------
  const handleVoidPayment = (paymentId: string) => {
    const target = recordedPayments.find(p => p.id === paymentId);
    if (!target) return;

    playBeep('click');
    const wasRealCashPayment =
      target.method === 'cash' &&
      Number(target.cashTendered ?? 0) > 0;

    if (wasRealCashPayment) {
      // Open only when actual physical cash must be returned.
      hardwareStore.openCashDrawer().catch(() => {});
    }

    setRecordedPayments(prev => prev.filter(p => p.id !== paymentId));
  };

  // ----------------------------------------------------
  // Final Sale Completion Handler
  // Triggered when remainingBalance is 0 and cashier finalizes sale
  // ----------------------------------------------------
  const handleFinalizeSale = async () => {
    if (remainingBalance > 0.005) {
      playBeep('error');
      setGeneralError(`Cannot complete sale: Remaining balance of $${remainingBalance.toFixed(2)} must be paid.`);
      return;
    }

    setIsProcessing(true);
    setGeneralError(null);

    try {
      const lastCard = [...successfulPayments].reverse().find(p => p.method === 'card');

      // Only real physical cash records carry cashTendered.
      // Gift cards are currently mapped to the supported 'cash' enum,
      // so method === 'cash' alone is not safe enough.
      const totalCashTendered = successfulPayments
        .filter(
          p =>
            p.method === 'cash' &&
            Number(p.cashTendered ?? 0) > 0
        )
        .reduce(
          (sum, p) => sum + Number(p.cashTendered ?? 0),
          0
        );

      const paymentPayload: any = {
        method: recordedPayments.length === 1 ? recordedPayments[0].method : 'split',
        amount: effectiveGrandTotal,
        cashTendered: totalCashTendered,
        changeDue: changeDueCustomer,
        cardBrand: lastCard?.cardBrand || 'Visa',
        cardLast4: lastCard?.cardLast4 || '8392',
        authCode: lastCard?.authCode || `AUTH-${Math.floor(100000 + Math.random() * 900000)}`,
        payments: successfulPayments,
        splitDetails: {
          splitType: 'multiple',
          payments: successfulPayments,
          totalPaid: totalAmountPaid,
        },
        pointsRedeemed: applyLoyaltyPoints ? pointsToRedeem : 0,
        pointsDiscountAmount: pointsDiscount,
      };

      await onCompleteOrder(paymentPayload);
      playBeep('success');
    } catch (err: any) {
      playBeep('error');
      setGeneralError(err.message || 'Payment completion failed');
      setIsProcessing(false);
    }
  };

  // ----------------------------------------------------
  // Cancel / Close Protection
  // If partial payment collected, warn before abandoning
  // ----------------------------------------------------
  const handleRequestClose = () => {
    if (totalAmountPaid > 0) {
      playBeep('error');
      setShowCancelWarning(true);
    } else {
      onClose();
    }
  };

  const handleVoidAllAndCancel = () => {
    playBeep('click');

    const hasRealCashToReturn = successfulPayments.some(
      p =>
        p.method === 'cash' &&
        Number(p.cashTendered ?? 0) > 0
    );

    if (hasRealCashToReturn) {
      hardwareStore.openCashDrawer().catch(() => {});
    }

    setRecordedPayments([]);
    setShowCancelWarning(false);
    onClose();
  };

  // Touch Numpad input handler
  const handleNumpadPress = (val: string) => {
    playBeep('click');
    if (val === 'C') {
      setTenderInput('');
    } else if (val === 'DEL') {
      setTenderInput(prev => (prev.length > 1 ? prev.slice(0, -1) : ''));
    } else if (val === '.') {
      if (!tenderInput.includes('.')) {
        setTenderInput(tenderInput ? tenderInput + '.' : '0.');
      }
    } else {
      if (tenderInput.includes('.') && tenderInput.split('.')[1].length >= 2) return;
      setTenderInput(tenderInput === '0' ? val : tenderInput + val);
    }
  };

  const activeAmountForButtons = getActiveAmount();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-3 sm:p-4 select-none">
      <div className="bg-[#0F0F0F] border border-[#262626] rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden text-[#E5E5E5] flex flex-col max-h-[94vh]">
        {/* Modal Header */}
        <div className="bg-[#0A0A0A] px-5 py-3.5 border-b border-[#262626] flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg sm:text-xl font-bold font-serif italic text-[#F5F5F5]">
              Payment &amp; Checkout
            </h2>
            <p className="text-xs text-[#737373] mt-0.5">
              {customer ? `Attached Customer: ${customer.name} (${customer.loyaltyPoints} pts)` : 'Walk-in Customer'}
            </p>
          </div>
          <button
            id="checkout-close-btn"
            onClick={handleRequestClose}
            disabled={isProcessing}
            className="p-1.5 rounded-lg text-[#737373] hover:text-white hover:bg-[#1A1A1A] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Manager Approval Banner if Needed */}
        {needsManagerApproval && !managerApproved && (
          <div className="bg-[#1C1405] border-b border-[#C5A059]/40 px-5 py-3 text-[#F5E6CC] shrink-0">
            <div className="flex items-center space-x-2 mb-1.5 font-semibold text-xs sm:text-sm">
              <ShieldCheck className="w-4 h-4 text-[#C5A059]" />
              <span>Manager Override Required (Discount {discountPercent}% &gt; {discountThreshold}%)</span>
            </div>
            <div className="flex items-center space-x-2">
              <input
                id="manager-override-pin"
                type="password"
                maxLength={4}
                value={managerPin}
                onChange={e => setManagerPin(e.target.value)}
                placeholder="Manager PIN (5555)"
                className="w-36 bg-[#0A0A0A] border border-[#C5A059]/50 rounded-lg px-3 py-1 text-xs text-[#E5E5E5] placeholder:text-[#666666] focus:outline-hidden"
              />
              <button
                id="manager-approve-btn"
                type="button"
                onClick={handleVerifyManagerPin}
                className="px-3 py-1 rounded-lg bg-[#C5A059] hover:bg-[#D4B06A] text-black text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                Approve
              </button>
              {managerApprovalError && (
                <span className="text-xs text-red-400 font-medium">{managerApprovalError}</span>
              )}
            </div>
          </div>
        )}

        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Card Terminal 30-Second Timeout Notification Banner */}
          {cardTimeoutNotification && (
            <div className="bg-amber-950/40 border-2 border-amber-500/60 rounded-xl p-3.5 flex items-start justify-between text-xs text-amber-100 animate-in fade-in">
              <div className="flex items-start space-x-2.5">
                <Clock className="w-5 h-5 text-amber-400 mt-0.5 shrink-0 animate-pulse" />
                <div className="space-y-0.5">
                  <span className="font-black uppercase tracking-wider text-amber-300 block text-xs">
                    Card Terminal Timed Out (30s) — System Refreshed
                  </span>
                  <p className="text-zinc-200 text-xs leading-relaxed">{cardTimeoutNotification}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCardTimeoutNotification(null)}
                className="ml-3 px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {generalError && (
            <div className="p-3 rounded-lg bg-red-950/50 border border-red-800 text-red-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{generalError}</span>
            </div>
          )}

          {/* ========================================================
              CORE METRIC BANNER:
              TOTAL: $100.00 | PAID: $40.00 | REMAINING: $60.00
              ======================================================== */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3 bg-[#141414] p-3.5 sm:p-4 rounded-xl border border-[#262626]">
            {/* TOTAL */}
            <div className="space-y-0.5">
              <div className="text-[10px] sm:text-xs text-[#888888] uppercase tracking-wider font-semibold">
                Total
              </div>
              <div className="text-xl sm:text-2xl font-black font-mono text-white tracking-tight">
                ${(effectiveGrandTotal || 0).toFixed(2)}
              </div>
              <div className="text-[10px] text-[#737373] hidden sm:block">
                Subtotal: ${(subtotal || 0).toFixed(2)} • Tax: ${(taxTotal || 0).toFixed(2)}
              </div>
            </div>

            {/* PAID */}
            <div className="space-y-0.5 border-x border-[#262626] px-2.5 sm:px-3">
              <div className="text-[10px] sm:text-xs text-emerald-400 uppercase tracking-wider font-semibold">
                Paid
              </div>
              <div className="text-xl sm:text-2xl font-black font-mono text-emerald-400 tracking-tight">
                ${totalAmountPaid.toFixed(2)}
              </div>
              <div className="text-[10px] text-[#737373]">
                {successfulPayments.length} {successfulPayments.length === 1 ? 'tender' : 'tenders'}
              </div>
            </div>

            {/* REMAINING */}
            <div className="space-y-0.5 pl-1">
              <div className={`text-[10px] sm:text-xs uppercase tracking-wider font-semibold ${
                remainingBalance <= 0.005 ? 'text-emerald-400' : 'text-[#C5A059]'
              }`}>
                Remaining
              </div>
              <div className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${
                remainingBalance <= 0.005 ? 'text-emerald-400' : 'text-[#C5A059]'
              }`}>
                ${remainingBalance.toFixed(2)}
              </div>
              <div className="text-[10px]">
                {remainingBalance <= 0.005 ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <Check className="w-3 h-3" /> Paid in Full
                  </span>
                ) : isPartiallyPaid ? (
                  <span className="text-amber-400 font-bold">Open / Partial</span>
                ) : (
                  <span className="text-[#888888]">Due now</span>
                )}
              </div>
            </div>
          </div>

          {/* Customer Loyalty Rewards (If customer attached and rewards enabled) */}
          {loyaltyEnabled && customer && canCustomerRedeem && (
            <div className="bg-[#14120C] border border-[#C5A059]/30 rounded-xl p-3 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <Award className="w-4 h-4 text-[#C5A059]" />
                <div>
                  <span className="font-bold text-white">Redeem Points: </span>
                  <span className="text-[#C5A059]">
                    {customer.name} has {customer.loyaltyPoints} pts (Worth ${(maxPointsCustomerCanRedeem / redemptionRate).toFixed(2)})
                  </span>
                </div>
              </div>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={applyLoyaltyPoints}
                  onChange={e => handleToggleLoyalty(e.target.checked)}
                  className="rounded border-[#332A15] text-[#C5A059] focus:ring-[#C5A059]"
                />
                <span className="text-[11px] font-bold text-white uppercase">Apply Discount</span>
              </label>
            </div>
          )}

          {/* ========================================================
              PAYMENTS ALREADY COLLECTED (LEDGER)
              Cash — $20.00 ✓
              Cash — $20.00 ✓
              Card — $30.00 ✓
              ======================================================== */}
          {recordedPayments.length > 0 && (
            <div className="bg-[#121212] border border-[#242424] rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400 uppercase tracking-wider border-b border-[#222222] pb-2">
                <div className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Payments Collected on this Order ({recordedPayments.length})</span>
                </div>
                <span className="text-emerald-400 font-mono">Total Paid: ${totalAmountPaid.toFixed(2)}</span>
              </div>

              <div className="space-y-1.5">
                {recordedPayments.map((p, idx) => (
                  <div
                    key={p.id || idx}
                    className="flex items-center justify-between bg-[#181818] border border-[#2A2A2A] rounded-lg px-3 py-2 text-xs"
                  >
                    <div className="flex items-center space-x-2.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 flex items-center justify-center text-[10px] font-bold">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="font-bold text-white flex items-center gap-1.5">
                          {p.method === 'cash' ? (
                            <Banknote className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <CreditCard className="w-3.5 h-3.5 text-[#C5A059]" />
                          )}
                          <span className="capitalize">
                            {p.method === 'cash'
                              ? 'Cash'
                              : `${p.cardBrand || 'Card'} (****${p.cardLast4 || '8392'})`}
                          </span>
                          <span className="text-zinc-400 font-normal">—</span>
                          <span className="font-mono text-emerald-400 font-bold">${p.amount.toFixed(2)}</span>
                          <span className="text-emerald-400 font-bold text-sm">✓</span>
                        </div>
                        <div className="text-[10px] text-zinc-500 flex items-center space-x-2 mt-0.5">
                          <span>{new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          <span>•</span>
                          <span>Cashier: {p.cashierName || 'Staff'}</span>
                          {p.authCode && (
                            <>
                              <span>•</span>
                              <span className="font-mono text-[9px] text-zinc-400">Auth: {p.authCode}</span>
                            </>
                          )}
                          {p.changeDue !== undefined && p.changeDue > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-[#C5A059]">Change Given: ${p.changeDue.toFixed(2)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 uppercase">
                        {p.status}
                      </span>
                      {remainingBalance > 0.005 && (
                        <button
                          type="button"
                          onClick={() => handleVoidPayment(p.id)}
                          title="Void this payment"
                          className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-red-950/30 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Change Due Banner if customer gave excess cash */}
          {changeDueCustomer > 0 && (
            <div className="bg-emerald-950/30 border border-emerald-800/60 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Banknote className="w-5 h-5 text-emerald-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Change Due Customer:
                </span>
              </div>
              <span className="text-2xl font-black font-mono text-emerald-400">
                ${changeDueCustomer.toFixed(2)}
              </span>
            </div>
          )}

          {/* ========================================================
              PAYMENT INPUT & TENDER ACTION SECTION
              Visible while remainingBalance > 0
              Amount: [________]
              CASH | CARD | OTHER PAYMENT
              ======================================================== */}
          {remainingBalance > 0.005 ? (
            <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 space-y-3.5">
              {/* Amount Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="tender-amount-input" className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                    <span>Amount to Pay</span>
                    <span className="text-[11px] font-normal text-zinc-500">
                      (Leave blank to pay full remaining ${remainingBalance.toFixed(2)})
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowNumpad(!showNumpad)}
                    className="text-[11px] text-[#C5A059] hover:underline cursor-pointer"
                  >
                    {showNumpad ? 'Hide Numpad' : 'Touch Keypad'}
                  </button>
                </div>

                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xl font-bold font-mono text-[#C5A059]">$</span>
                  <input
                    id="tender-amount-input"
                    type="text"
                    inputMode="decimal"
                    placeholder={remainingBalance.toFixed(2)}
                    value={tenderInput}
                    onFocus={() => setShowNumpad(true)}
                    onClick={() => setShowNumpad(true)}
                    onChange={e => {
                      const val = e.target.value;
                      if (/^\d*\.?\d{0,2}$/.test(val) || val === '') {
                        setTenderInput(val);
                        setTenderInputError(null);
                      }
                    }}
                    className="w-full bg-[#0A0A0A] border-2 border-[#333333] focus:border-[#C5A059] rounded-xl pl-8 pr-4 py-2.5 text-xl text-white font-mono font-bold outline-none transition-colors"
                  />
                  {tenderInput && (
                    <button
                      type="button"
                      onClick={() => setTenderInput('')}
                      className="absolute right-3 top-3 text-xs text-zinc-500 hover:text-white uppercase font-bold"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {tenderInputError && (
                  <div className="mt-1.5 text-xs text-red-400 font-medium flex items-center space-x-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{tenderInputError}</span>
                  </div>
                )}
              </div>

              {/* Quick Amount Buttons */}
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                <button
                  type="button"
                  onClick={() => { playBeep('click'); setTenderInput(remainingBalance.toFixed(2)); }}
                  className="px-2.5 py-1 rounded-lg bg-[#202020] hover:bg-[#282828] text-xs font-mono font-bold text-[#C5A059] border border-[#333333] hover:border-[#C5A059] cursor-pointer transition-colors"
                >
                  Full (${remainingBalance.toFixed(2)})
                </button>

                {remainingBalance > 10 && (
                  <button
                    type="button"
                    onClick={() => {
                      playBeep('click');
                      const half = Math.round((remainingBalance / 2) * 100) / 100;
                      setTenderInput(half.toFixed(2));
                    }}
                    className="px-2.5 py-1 rounded-lg bg-[#202020] hover:bg-[#282828] text-xs font-mono font-bold text-zinc-300 border border-[#333333] cursor-pointer transition-colors"
                  >
                    Half (${(Math.round((remainingBalance / 2) * 100) / 100).toFixed(2)})
                  </button>
                )}

                {[10, 20, 50, 100].map(amt => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => { playBeep('click'); setTenderInput(amt.toFixed(2)); }}
                    className="px-2.5 py-1 rounded-lg bg-[#202020] hover:bg-[#282828] text-xs font-mono font-bold text-zinc-300 border border-[#333333] cursor-pointer transition-colors"
                  >
                    ${amt}
                  </button>
                ))}
              </div>

              {/* Touch Numpad (Collapsible) */}
              {showNumpad && (
                <div className="bg-[#0C0C0C] p-2.5 rounded-xl border border-[#222222] max-w-[260px] mx-auto">
                  <div className="grid grid-cols-3 gap-1.5">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => handleNumpadPress(d)}
                        className="h-9 rounded-lg bg-[#1E1E1E] hover:bg-[#2A2A2A] text-white font-bold text-base border border-[#333333] cursor-pointer"
                      >
                        {d}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => handleNumpadPress('.')}
                      className="h-9 rounded-lg bg-[#1E1E1E] hover:bg-[#2A2A2A] text-white font-bold text-base border border-[#333333] cursor-pointer"
                    >
                      .
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNumpadPress('0')}
                      className="h-9 rounded-lg bg-[#1E1E1E] hover:bg-[#2A2A2A] text-white font-bold text-base border border-[#333333] cursor-pointer"
                    >
                      0
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNumpadPress('DEL')}
                      className="h-9 rounded-lg bg-[#1E1E1E] hover:bg-[#2A2A2A] text-amber-400 font-bold text-xs uppercase border border-[#333333] cursor-pointer"
                    >
                      DEL
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                    <button
                      type="button"
                      onClick={() => handleNumpadPress('C')}
                      className="h-9 rounded-lg bg-[#1E1E1E] hover:bg-[#2A2A2A] text-red-400 font-bold text-xs uppercase border border-[#333333] cursor-pointer"
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        playBeep('click');
                        setTenderInputError(null);
                        setShowNumpad(false);
                      }}
                      className="h-9 rounded-lg bg-[#C5A059] hover:bg-[#D4B36B] text-black font-black text-xs uppercase border border-[#C5A059] cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}

              {/* ========================================================
                  PRIMARY TENDER BUTTONS:
                  CASH | CARD | OTHER PAYMENT
                  ======================================================== */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                {/* CASH BUTTON */}
                <button
                  type="button"
                  id="tender-btn-cash"
                  onClick={() => handlePayCash()}
                  disabled={isProcessing}
                  className="py-3 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-bold uppercase tracking-wider flex flex-col items-center justify-center cursor-pointer shadow-md transition-all disabled:opacity-50"
                >
                  <div className="flex items-center space-x-1.5">
                    <Banknote className="w-5 h-5" />
                    <span className="text-sm font-black">CASH</span>
                  </div>
                  <span className="text-[11px] font-mono opacity-90 mt-0.5">
                    Pay ${activeAmountForButtons.toFixed(2)}
                  </span>
                </button>

                {/* CARD BUTTON */}
                <button
                  type="button"
                  id="tender-btn-card"
                  onClick={() => handleInitiateCardPayment()}
                  disabled={isProcessing}
                  className="py-3 px-3 rounded-xl bg-gradient-to-r from-[#C5A059] to-[#D4AF37] hover:from-[#D4AF37] hover:to-[#C5A059] active:scale-98 text-black font-bold uppercase tracking-wider flex flex-col items-center justify-center cursor-pointer shadow-md transition-all disabled:opacity-50"
                >
                  <div className="flex items-center space-x-1.5">
                    <CreditCard className="w-5 h-5" />
                    <span className="text-sm font-black">CARD</span>
                  </div>
                  <span className="text-[11px] font-mono opacity-90 mt-0.5">
                    Charge ${activeAmountForButtons.toFixed(2)}
                  </span>
                </button>

                {/* OTHER PAYMENT BUTTON */}
                <button
                  type="button"
                  id="tender-btn-other"
                  onClick={() => setShowOtherMenu(!showOtherMenu)}
                  disabled={isProcessing}
                  className="py-3 px-3 rounded-xl bg-[#202020] hover:bg-[#282828] active:scale-98 text-zinc-200 border border-[#333333] hover:border-[#555555] font-bold uppercase tracking-wider flex flex-col items-center justify-center cursor-pointer transition-all disabled:opacity-50"
                >
                  <div className="flex items-center space-x-1.5">
                    <Gift className="w-4 h-4 text-[#C5A059]" />
                    <span className="text-xs font-black">OTHER</span>
                    <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                  </div>
                  <span className="text-[10px] text-zinc-400 mt-0.5">
                    Gift / Check / Credit
                  </span>
                </button>
              </div>

              {/* Other Payment Dropdown / Menu */}
              {showOtherMenu && (
                <div className="p-3 bg-[#0C0C0C] border border-[#2B2B2B] rounded-xl space-y-2.5 animate-in fade-in duration-100">
                  <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                    Select Alternative Tender Method for ${activeAmountForButtons.toFixed(2)}:
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handlePayOther('gift_card')}
                      className="py-2 px-2 rounded-lg bg-[#181818] hover:bg-[#242424] border border-[#333333] text-xs font-bold text-white flex items-center justify-center space-x-1 cursor-pointer"
                    >
                      <Gift className="w-3.5 h-3.5 text-[#C5A059]" />
                      <span>Gift Card</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePayOther('cheque')}
                      className="py-2 px-2 rounded-lg bg-[#181818] hover:bg-[#242424] border border-[#333333] text-xs font-bold text-white flex items-center justify-center space-x-1 cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 text-[#C5A059]" />
                      <span>Check</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePayOther('store_credit')}
                      className="py-2 px-2 rounded-lg bg-[#181818] hover:bg-[#242424] border border-[#333333] text-xs font-bold text-white flex items-center justify-center space-x-1 cursor-pointer"
                    >
                      <UserCheck className="w-3.5 h-3.5 text-[#C5A059]" />
                      <span>Store Credit</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ========================================================
               TRANSACTION PAID IN FULL CELEBRATION BANNER
               When remainingBalance <= 0
               ======================================================== */
            <div className="bg-emerald-950/40 border border-emerald-700/60 rounded-xl p-4 text-center space-y-2">
              <div className="flex items-center justify-center space-x-2 text-emerald-400 font-bold text-sm uppercase">
                <CheckCircle2 className="w-5 h-5" />
                <span>Order Paid in Full (${(effectiveGrandTotal || 0).toFixed(2)})</span>
              </div>
              <p className="text-xs text-zinc-300">
                All payments have been successfully recorded. Ready to complete transaction and print receipt.
              </p>
            </div>
          )}

          {/* ========================================================
              CARD TERMINAL ACTIVE PROMPT / MODAL OVERLAY
              When Card button is pressed for a specific amount
              ======================================================== */}
          {activeCardCharge !== null && (
            <div className="bg-[#121212] border-2 border-[#C5A059]/60 rounded-xl p-4 space-y-3.5 shadow-2xl animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-[#262626] pb-2.5">
                <div className="flex items-center space-x-2.5">
                  <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-white block">
                      Counter PIN Pad Terminal Active
                    </span>
                    <span className="text-[11px] text-zinc-400">
                      Waiting for customer card tap, chip insert, or swipe
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-zinc-400 uppercase block">Sending to Terminal</span>
                  <span className="text-xl font-black font-mono text-[#C5A059]">
                    ${activeCardCharge.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* 30-Second Countdown & Progress Bar */}
              <div className="bg-[#1A1A1A] p-3 rounded-lg border border-[#2D2D2D] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-1.5 text-zinc-300 font-medium">
                    <Clock className={`w-4 h-4 ${cardTimerSeconds <= 10 ? 'text-red-400 animate-bounce' : 'text-amber-400'}`} />
                    <span>Auto-refresh if not received:</span>
                  </div>
                  <span className={`font-mono font-black text-sm ${cardTimerSeconds <= 10 ? 'text-red-400 animate-pulse' : 'text-[#C5A059]'}`}>
                    {cardTimerSeconds} seconds left
                  </span>
                </div>
                <div className="w-full bg-[#0D0D0D] h-2 rounded-full overflow-hidden border border-[#333333]">
                  <div
                    className={`h-full transition-all duration-1000 ${
                      cardTimerSeconds <= 10
                        ? 'bg-red-500'
                        : 'bg-gradient-to-r from-amber-400 to-[#C5A059]'
                    }`}
                    style={{ width: `${(cardTimerSeconds / 30) * 100}%` }}
                  />
                </div>
                <div className="text-[10px] text-zinc-500 flex justify-between">
                  <span>If terminal fails or jams, screen resets automatically at 0s</span>
                  <span className="text-zinc-400">Previous payments safe</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Select Card Brand / Method:</span>
                <div className="flex space-x-1">
                  {(['Visa', 'Mastercard', 'Amex', 'Discover', 'Apple Pay'] as const).map(b => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setCardBrand(b as any)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                        cardBrand === b
                          ? 'bg-[#C5A059] text-black border-[#C5A059]'
                          : 'bg-[#1C1C1C] text-zinc-400 border-[#2D2D2D] hover:text-white'
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>

              {terminalErrorMsg && (
                <div className="p-3 rounded-lg bg-red-950/60 border border-red-800/70 text-red-200 text-xs flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                  <span className="leading-snug">{terminalErrorMsg}</span>
                </div>
              )}

              {/* Terminal Simulation Actions */}
              <div className="space-y-2">
                <div className="text-[10px] font-bold text-zinc-500 uppercase flex items-center justify-between">
                  <span>Terminal Response Simulator:</span>
                  <span className="text-zinc-600">Simulate hardware callback</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => handleTerminalOutcome('approved')}
                    className="py-2.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-bold text-xs uppercase flex items-center justify-center space-x-1.5 cursor-pointer shadow disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Simulate: APPROVED (${activeCardCharge.toFixed(2)})</span>
                  </button>

                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => handleTerminalOutcome('declined')}
                    className="py-2.5 px-3 rounded-lg bg-red-950/80 hover:bg-red-900 active:scale-98 text-red-200 border border-red-800/60 font-bold text-xs uppercase flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                    <span>Simulate: DECLINED (Code 51)</span>
                  </button>

                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => handleTerminalOutcome('cancelled')}
                    className="py-1.5 px-2 rounded-lg bg-[#222222] hover:bg-[#2C2C2C] text-zinc-300 font-bold text-[10px] uppercase flex items-center justify-center space-x-1 cursor-pointer disabled:opacity-50"
                  >
                    <X className="w-3 h-3" />
                    <span>Simulate: Customer Cancel</span>
                  </button>

                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => handleTerminalOutcome('timeout')}
                    className="py-1.5 px-2 rounded-lg bg-[#222222] hover:bg-[#2C2C2C] text-zinc-300 font-bold text-[10px] uppercase flex items-center justify-center space-x-1 cursor-pointer disabled:opacity-50"
                  >
                    <Clock className="w-3 h-3" />
                    <span>Simulate: Timeout</span>
                  </button>
                </div>
              </div>

              {/* Instant Cancel & Screen Refresh Button */}
              <div className="flex items-center justify-between pt-2 border-t border-[#262626]">
                <span className="text-[11px] text-zinc-500">
                  Terminal not responding? Click to instantly reset.
                </span>
                <button
                  type="button"
                  onClick={handleCancelCardTerminal}
                  className="px-3 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 border border-red-800/50 text-red-300 hover:text-white text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 cursor-pointer transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Cancel & Refresh Screen Now</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="bg-[#0A0A0A] px-5 py-3.5 border-t border-[#262626] flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={handleRequestClose}
            disabled={isProcessing}
            className="px-3.5 py-2 text-xs font-semibold uppercase tracking-wider text-[#737373] hover:text-white rounded-lg hover:bg-[#1A1A1A] transition-colors cursor-pointer"
          >
            Cancel / Back to Cart
          </button>

          <button
            type="button"
            id="checkout-complete-btn"
            onClick={handleFinalizeSale}
            disabled={isProcessing || remainingBalance > 0.005 || (needsManagerApproval && !managerApproved)}
            className="px-6 py-2.5 rounded-xl bg-[#C5A059] hover:bg-[#D4B06A] active:scale-98 text-black font-bold uppercase tracking-wider text-xs sm:text-sm shadow-lg flex items-center space-x-2 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <CheckCircle2 className="w-4 h-4 text-black" />
            <span>
              {isProcessing
                ? 'Processing...'
                : remainingBalance > 0.005
                ? `Remaining Due: $${remainingBalance.toFixed(2)}`
                : `Complete Sale & Print Receipt ($${(effectiveGrandTotal || 0).toFixed(2)})`}
            </span>
          </button>
        </div>
      </div>

      {/* Cancel Transaction Warning Modal for Partially Paid Transactions */}
      {showCancelWarning && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/90 p-4">
          <div className="bg-[#121212] border border-amber-600/70 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center space-x-3 text-amber-400">
              <AlertTriangle className="w-7 h-7 shrink-0" />
              <div>
                <h3 className="text-lg font-bold text-white">Partial Payment in Progress</h3>
                <p className="text-[11px] text-zinc-400">Cannot silently abandon collected funds</p>
              </div>
            </div>

            <p className="text-sm text-zinc-300 leading-relaxed">
              This transaction already contains a partial payment of{' '}
              <strong className="text-emerald-400">${totalAmountPaid.toFixed(2)}</strong>.
              The payment must be voided/refunded before the sale can be cancelled.
            </p>

            <div className="bg-[#1A1A1A] border border-[#2D2D2D] rounded-xl p-3 text-xs space-y-1.5">
              <div className="text-zinc-400 uppercase font-bold text-[10px]">Captured Payments to Reverse:</div>
              {recordedPayments.map((p, idx) => (
                <div key={p.id || idx} className="flex justify-between font-mono text-xs">
                  <span className="text-white uppercase">{p.method} Tender:</span>
                  <span className="text-emerald-400 font-bold">${p.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={handleVoidAllAndCancel}
                className="w-full py-2.5 rounded-lg bg-red-600 hover:bg-red-500 active:scale-98 text-white font-bold text-xs uppercase cursor-pointer shadow transition-all"
              >
                Void / Reverse Cash (${totalAmountPaid.toFixed(2)}) &amp; Cancel Sale
              </button>

              <button
                type="button"
                onClick={() => setShowCancelWarning(false)}
                className="w-full py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 active:scale-98 text-zinc-200 font-bold text-xs uppercase cursor-pointer transition-all"
              >
                Keep Sale Open &amp; Return to Checkout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
