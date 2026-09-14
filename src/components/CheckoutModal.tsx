import React, { useState, useEffect } from 'react';
import { PaymentMethod, CartItem, Customer, User, StoreSettings, CashTenderEntry, CardFallbackMethod } from '../types';
import { playBeep } from '../utils/audio';
import { CardPaymentFallbackManager } from './payment/CardPaymentFallbackManager';
import {
  Banknote,
  CreditCard,
  Smartphone,
  Split,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  Wifi,
  CheckCircle2,
  X,
  AlertCircle,
  RotateCcw,
  Sparkles,
  Award,
  Gift,
  Coins,
  Star,
  Check,
  Plus,
  Trash2,
  ListOrdered,
  CheckCheck,
  Layers,
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
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [cardBrand, setCardBrand] = useState<'Visa' | 'Mastercard' | 'Amex'>('Visa');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Loyalty Program Redemption State
  const loyaltyEnabled = settings?.loyaltyProgramEnabled !== false;
  const earnRate = settings?.loyaltyPointsPerDollar ?? 1;
  const redemptionRate = settings?.loyaltyPointsPerDollarDiscount ?? 20; // 20 pts = $1
  const minPointsToRedeem = settings?.loyaltyMinPointsToRedeem ?? 50;
  const maxDiscountPercent = settings?.loyaltyMaxDiscountPercent ?? 50;

  // Max allowed dollar discount based on policy (e.g. 50% of subtotal)
  const maxAllowedDiscountDollars = Math.min(grandTotal, (subtotal * maxDiscountPercent) / 100);
  const customerPoints = customer?.loyaltyPoints ?? 0;
  const maxPointsCustomerCanRedeem = Math.min(
    customerPoints,
    Math.floor(maxAllowedDiscountDollars * redemptionRate)
  );
  const canCustomerRedeem = loyaltyEnabled && !!customer && customerPoints >= minPointsToRedeem && maxPointsCustomerCanRedeem >= minPointsToRedeem;

  const [applyLoyaltyPoints, setApplyLoyaltyPoints] = useState<boolean>(false);
  const [pointsToRedeem, setPointsToRedeem] = useState<number>(0);

  // Initialize points to redeem when toggle is activated
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

  // Payment cash tender & Multi-Cash Tender Entries
  const [cashEntries, setCashEntries] = useState<CashTenderEntry[]>([]);
  const [cashTendered, setCashTendered] = useState<string>((effectiveGrandTotal || 0).toFixed(2));
  const [customCashInput, setCustomCashInput] = useState<string>('');

  // Split payment state (Two Cards or Cash + Card)
  const [splitType, setSplitType] = useState<'two_cards' | 'cash_card'>('two_cards');
  const [card1Amount, setCard1Amount] = useState<string>(((effectiveGrandTotal || 0) / 2).toFixed(2));
  const [card2Amount, setCard2Amount] = useState<string>((effectiveGrandTotal - ((effectiveGrandTotal || 0) / 2)).toFixed(2));
  const [card1Brand, setCard1Brand] = useState<'Visa' | 'Mastercard' | 'Amex'>('Visa');
  const [card2Brand, setCard2Brand] = useState<'Visa' | 'Mastercard' | 'Amex'>('Mastercard');
  const [card1Approved, setCard1Approved] = useState<boolean>(false);
  const [card2Approved, setCard2Approved] = useState<boolean>(false);
  const [splitCash, setSplitCash] = useState<string>(((effectiveGrandTotal || 0) / 2).toFixed(2));

  // Sync cash tender and split defaults when effectiveGrandTotal updates
  useEffect(() => {
    setCashTendered((effectiveGrandTotal || 0).toFixed(2));
    const half = Math.round((effectiveGrandTotal / 2) * 100) / 100;
    const rem = Math.max(0, Math.round((effectiveGrandTotal - half) * 100) / 100);
    setCard1Amount(half.toFixed(2));
    setCard2Amount(rem.toFixed(2));
    setSplitCash(half.toFixed(2));
  }, [effectiveGrandTotal]);

  // Manager Approval State
  const discountThreshold = settings?.requireManagerDiscountAbove ?? 20;
  const isHighDiscount = discountPercent > discountThreshold;
  const isManagerOrAdmin = currentUser?.role === 'Manager' || currentUser?.role === 'Admin';
  const needsManagerApproval = isHighDiscount && !isManagerOrAdmin;
  const [managerPin, setManagerPin] = useState<string>('');
  const [managerApproved, setManagerApproved] = useState<boolean>(false);
  const [managerApprovalError, setManagerApprovalError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Tendered calculations supporting both cumulative multi-entries and single entry
  const totalCashFromEntries = cashEntries.reduce((sum, e) => sum + e.amount, 0);
  const tenderedAmount = cashEntries.length > 0
    ? totalCashFromEntries
    : (parseFloat(cashTendered) || 0);

  const changeDue = Math.max(0, Math.round((tenderedAmount - effectiveGrandTotal) * 100) / 100);
  const cashRemainingDue = Math.max(0, Math.round((effectiveGrandTotal - tenderedAmount) * 100) / 100);
  const isCashInsufficient = tenderedAmount < (effectiveGrandTotal - 0.005);

  // Split payment logic
  const splitCashAmount = parseFloat(splitCash) || 0;
  const splitCardAmount = Math.max(0, effectiveGrandTotal - splitCashAmount);

  // Two Cards split calculations
  const numCard1 = parseFloat(card1Amount) || 0;
  const numCard2 = parseFloat(card2Amount) || 0;
  const totalTwoCards = Math.round((numCard1 + numCard2) * 100) / 100;
  const cardsRemainingDue = Math.max(0, Math.round((effectiveGrandTotal - totalTwoCards) * 100) / 100);
  const isTwoCardsBalanced = Math.abs(totalTwoCards - effectiveGrandTotal) <= 0.01;

  const handleSplit5050 = () => {
    playBeep('click');
    const half = Math.round((effectiveGrandTotal / 2) * 100) / 100;
    const rem = Math.max(0, Math.round((effectiveGrandTotal - half) * 100) / 100);
    setCard1Amount(half.toFixed(2));
    setCard2Amount(rem.toFixed(2));
  };

  const handleCard1Change = (val: string) => {
    setCard1Amount(val);
    const n = parseFloat(val) || 0;
    const rem = Math.max(0, Math.round((effectiveGrandTotal - n) * 100) / 100);
    setCard2Amount(rem.toFixed(2));
  };

  // Add a cash tender entry (supports customer giving multiple bills / payments)
  const handleAddCashEntry = (amount: number) => {
    if (amount <= 0) return;
    playBeep('click');
    const rounded = Math.round(amount * 100) / 100;
    const newEntry: CashTenderEntry = {
      id: `cash-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      amount: rounded,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    };
    setCashEntries(prev => [...prev, newEntry]);
    setCustomCashInput('');
  };

  const handleRemoveCashEntry = (id: string) => {
    playBeep('click');
    setCashEntries(prev => prev.filter(e => e.id !== id));
  };

  const handleClearCashEntries = () => {
    playBeep('click');
    setCashEntries([]);
    setCashTendered('');
  };

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

  const handleFastCash = (amount: number) => {
    // Adds directly to entries list if entries exist, or sets single tender
    if (cashEntries.length > 0) {
      handleAddCashEntry(amount);
    } else {
      playBeep('click');
      setCashTendered(amount.toFixed(2));
    }
  };

  const handleExactCash = () => {
    playBeep('click');
    if (cashEntries.length > 0) {
      if (cashRemainingDue > 0) {
        handleAddCashEntry(cashRemainingDue);
      }
    } else {
      setCashTendered(effectiveGrandTotal.toFixed(2));
    }
  };

  const handleNumpad = (char: string) => {
    playBeep('click');
    if (char === 'C') {
      setCashTendered('');
    } else if (char === '.') {
      if (!cashTendered.includes('.')) {
        setCashTendered(cashTendered + '.');
      }
    } else {
      if (cashTendered.includes('.') && cashTendered.split('.')[1].length >= 2) return;
      setCashTendered(cashTendered === '0' ? char : cashTendered + char);
    }
  };

  const handleProcessPayment = async () => {
    if (needsManagerApproval && !managerApproved) {
      setError('Manager authorization is required for high discount before checkout.');
      return;
    }

    if (method === 'cash' && isCashInsufficient) {
      playBeep('error');
      setError(`Insufficient cash received: Tendered $${tenderedAmount.toFixed(2)} is less than total $${effectiveGrandTotal.toFixed(2)}`);
      return;
    }

    if (method === 'split' && splitType === 'two_cards' && !isTwoCardsBalanced) {
      playBeep('error');
      setError(`Card 1 ($${numCard1.toFixed(2)}) + Card 2 ($${numCard2.toFixed(2)}) must equal order total $${effectiveGrandTotal.toFixed(2)}`);
      return;
    }

    setError(null);
    setIsProcessing(true);

    try {
      let paymentData: any = {
        method,
        amount: effectiveGrandTotal,
        pointsRedeemed: applyLoyaltyPoints ? pointsToRedeem : 0,
        pointsDiscountAmount: pointsDiscount,
      };

      if (method === 'cash') {
        paymentData.cashTendered = tenderedAmount;
        paymentData.changeDue = changeDue;
        paymentData.cashEntries = cashEntries.length > 0 ? cashEntries : undefined;
      } else if (method === 'card') {
        await new Promise(r => setTimeout(r, 600));
        paymentData.cardBrand = cardBrand;
        paymentData.cardLast4 = Math.floor(1000 + Math.random() * 9000).toString();
        paymentData.authCode = `APX-${Math.floor(10000 + Math.random() * 90000)}`;
        paymentData.fallbackMethod = 'card_terminal';
        paymentData.processorTxId = `ch_term_${Date.now()}`;
      } else if (method === 'contactless') {
        await new Promise(r => setTimeout(r, 600));
        paymentData.cardBrand = 'Apple Pay / Google Wallet';
        paymentData.authCode = `NFC-${Math.floor(10000 + Math.random() * 90000)}`;
      } else if (method === 'split') {
        await new Promise(r => setTimeout(r, 600));
        if (splitType === 'two_cards') {
          paymentData.splitDetails = {
            splitType: 'two_cards',
            card1Amount: numCard1,
            card1Brand,
            card1Last4: Math.floor(1000 + Math.random() * 9000).toString(),
            card1Auth: `APX1-${Math.floor(10000 + Math.random() * 90000)}`,
            card2Amount: numCard2,
            card2Brand,
            card2Last4: Math.floor(1000 + Math.random() * 9000).toString(),
            card2Auth: `APX2-${Math.floor(10000 + Math.random() * 90000)}`,
          };
          paymentData.cardBrand = `${card1Brand} & ${card2Brand}`;
          paymentData.authCode = `SPL2-${Math.floor(10000 + Math.random() * 90000)}`;
        } else {
          paymentData.splitDetails = {
            splitType: 'cash_card',
            cashAmount: splitCashAmount,
            cardAmount: splitCardAmount,
            cardBrand,
            cardLast4: Math.floor(1000 + Math.random() * 9000).toString(),
            authCode: `SPL-${Math.floor(10000 + Math.random() * 90000)}`,
          };
          paymentData.cardBrand = cardBrand;
          paymentData.cardLast4 = '9182';
          paymentData.authCode = `SPL-${Math.floor(10000 + Math.random() * 90000)}`;
        }
      }

      await onCompleteOrder(paymentData);
      playBeep('success');
    } catch (err: any) {
      playBeep('error');
      setError(err.message || 'Payment processing failed');
      setIsProcessing(false);
    }
  };

  // Points earned on the remaining balance
  const pointsEarnedOnThisOrder = loyaltyEnabled && effectiveGrandTotal > 0 ? Math.floor(effectiveGrandTotal * earnRate) : 0;
  const expectedEndingBalance = customerPoints - (applyLoyaltyPoints ? pointsToRedeem : 0) + pointsEarnedOnThisOrder;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 select-none">
      <div className="bg-[#0F0F0F] border border-[#262626] rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden text-[#E5E5E5] animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-[#0A0A0A] px-6 py-4 border-b border-[#262626] flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold font-serif italic text-[#F5F5F5]">Complete Payment & Checkout</h2>
            <p className="text-xs text-[#737373] mt-0.5">
              {customer ? `Attached Customer: ${customer.name} (${customer.loyaltyPoints} pts)` : 'Walk-in Customer'}
            </p>
          </div>
          <button
            id="checkout-close-btn"
            onClick={onClose}
            disabled={isProcessing}
            className="p-1.5 rounded-lg text-[#737373] hover:text-white hover:bg-[#1A1A1A] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Manager Approval Banner if Needed (CA-04) */}
        {needsManagerApproval && !managerApproved && (
          <div className="bg-[#1C1405] border-b border-[#C5A059]/40 p-4 text-[#F5E6CC]">
            <div className="flex items-center space-x-2 mb-2 font-semibold text-sm">
              <ShieldCheck className="w-4 h-4 text-[#C5A059]" />
              <span>Manager Override Required (Discount {discountPercent}% &gt; {discountThreshold}%)</span>
            </div>
            <p className="text-xs text-[#C5A059]/90 mb-3">
              Store policy requires a manager or admin to approve discounts exceeding {discountThreshold}%.
            </p>
            <div className="flex items-center space-x-2">
              <input
                id="manager-override-pin"
                type="password"
                maxLength={4}
                value={managerPin}
                onChange={e => setManagerPin(e.target.value)}
                placeholder="Manager PIN (5555)"
                className="w-36 bg-[#0A0A0A] border border-[#C5A059]/50 rounded-lg px-3 py-1.5 text-sm text-[#E5E5E5] placeholder:text-[#666666] focus:outline-hidden"
              />
              <button
                id="manager-approve-btn"
                type="button"
                onClick={handleVerifyManagerPin}
                className="px-3.5 py-1.5 rounded-lg bg-[#C5A059] hover:bg-[#D4B06A] text-black text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                Approve Discount
              </button>
              {managerApprovalError && (
                <span className="text-xs text-red-400 font-medium">{managerApprovalError}</span>
              )}
            </div>
          </div>
        )}

        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {error && (
            <div className="p-3 rounded-lg bg-red-950/40 border border-red-800 text-red-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Amount Due Box */}
          <div className="bg-[#141414] p-4 rounded-xl border border-[#262626] flex items-center justify-between">
            <div>
              <div className="text-xs text-[#737373] font-medium uppercase tracking-wider">Amount Due</div>
              <div className="text-3xl font-bold text-[#C5A059] font-mono tracking-tight mt-0.5">
                ${(effectiveGrandTotal || 0).toFixed(2)}
              </div>
              {applyLoyaltyPoints && pointsDiscount > 0 && (
                <div className="text-xs text-emerald-400 font-mono mt-0.5 flex items-center space-x-1">
                  <span>Orig: ${(grandTotal || 0).toFixed(2)}</span>
                  <span>•</span>
                  <span>Loyalty Disc: -${(pointsDiscount || 0).toFixed(2)}</span>
                </div>
              )}
            </div>
            <div className="text-right text-xs text-[#888888] space-y-0.5 font-mono">
              <div>Subtotal: ${(subtotal || 0).toFixed(2)}</div>
              {discountTotal > 0 && <div className="text-green-400">Item Disc: -${(discountTotal || 0).toFixed(2)}</div>}
              {applyLoyaltyPoints && pointsDiscount > 0 && (
                <div className="text-emerald-400">Points Disc: -${(pointsDiscount || 0).toFixed(2)}</div>
              )}
              <div>Tax: ${(taxTotal || 0).toFixed(2)}</div>
            </div>
          </div>

          {/* Customer Loyalty Points Balance & Redemption Section */}
          {loyaltyEnabled && (
            <div className="bg-[#14120C] border border-[#C5A059]/30 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#C5A059]/20 border border-[#C5A059]/40 flex items-center justify-center text-[#C5A059]">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-[#F5F5F5] flex items-center space-x-2">
                      <span>Customer Loyalty Rewards</span>
                      {customer?.loyaltyTier && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-[#C5A059]/20 text-[#C5A059] border border-[#C5A059]/30">
                          {customer.loyaltyTier}
                        </span>
                      )}
                    </div>
                    {customer ? (
                      <p className="text-xs text-[#C5A059] font-medium">
                        {customer.name} has <span className="font-bold font-mono">{(customer.loyaltyPoints || 0).toLocaleString()}</span> points
                        <span className="text-[#888888] text-[11px] ml-1.5">
                          (Worth ~${(((customer.loyaltyPoints || 0) / redemptionRate) || 0).toFixed(2)} off)
                        </span>
                      </p>
                    ) : (
                      <p className="text-xs text-[#888888]">No customer attached to this sale</p>
                    )}
                  </div>
                </div>

                {customer && (
                  <div className="text-right text-[11px] text-[#888888] hidden sm:block">
                    <div>Rate: {redemptionRate} pts = $1.00</div>
                    <div>Min to redeem: {minPointsToRedeem} pts</div>
                  </div>
                )}
              </div>

              {/* Customer with points: Redemption Controls */}
              {customer ? (
                <div>
                  {!canCustomerRedeem ? (
                    <div className="p-2.5 rounded-lg bg-[#1A1812] border border-[#332A15] text-[#A3A3A3] text-xs flex items-center justify-between">
                      <span>
                        {customerPoints < minPointsToRedeem
                          ? `Requires at least ${minPointsToRedeem} points to redeem discounts (Customer has ${customerPoints} pts).`
                          : `Maximum discount policy reached for this cart.`}
                      </span>
                      <span className="text-[#C5A059] font-semibold text-[11px] ml-2 shrink-0">
                        Earns +{pointsEarnedOnThisOrder} pts on this sale
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-3 pt-1">
                      {/* Checkbox Toggle */}
                      <label
                        htmlFor="redeem-loyalty-toggle"
                        className={`flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer ${
                          applyLoyaltyPoints
                            ? 'bg-[#1F1B10] border-[#C5A059] text-white shadow-xs'
                            : 'bg-[#14120C] border-[#2E2818] text-[#A3A3A3] hover:border-[#C5A059]/50'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            id="redeem-loyalty-toggle"
                            checked={applyLoyaltyPoints}
                            onChange={e => handleToggleLoyalty(e.target.checked)}
                            className="w-4 h-4 rounded border-[#C5A059] text-[#C5A059] focus:ring-0 bg-[#0A0A0A] cursor-pointer"
                          />
                          <div>
                            <div className="text-xs font-bold text-[#E5E5E5] flex items-center space-x-1.5">
                              <Coins className="w-3.5 h-3.5 text-[#C5A059]" />
                              <span>Apply Points Discount to this Purchase</span>
                            </div>
                            <div className="text-[11px] text-[#737373]">
                              Up to {maxPointsCustomerCanRedeem} pts can be applied (max ${(((maxPointsCustomerCanRedeem / redemptionRate) || 0)).toFixed(2)} off)
                            </div>
                          </div>
                        </div>

                        {applyLoyaltyPoints && (
                          <div className="text-right">
                            <span className="text-xs font-bold font-mono text-emerald-400">
                              -${(pointsDiscount || 0).toFixed(2)}
                            </span>
                            <div className="text-[10px] text-[#C5A059]">({pointsToRedeem} pts)</div>
                          </div>
                        )}
                      </label>

                      {/* Active Redemption Adjustment Slider and Quick Buttons */}
                      {applyLoyaltyPoints && (
                        <div className="p-3 rounded-lg bg-[#0F0E0A] border border-[#2E2818] space-y-3 animate-in fade-in duration-150">
                          {/* Quick preset buttons */}
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-[#A3A3A3]">Quick Select:</span>
                            <div className="flex space-x-1.5">
                              <button
                                type="button"
                                onClick={() => { playBeep('click'); setPointsToRedeem(minPointsToRedeem); }}
                                className={`px-2 py-1 rounded text-[11px] font-bold border transition-colors cursor-pointer ${
                                  pointsToRedeem === minPointsToRedeem
                                    ? 'bg-[#C5A059] text-black border-[#C5A059]'
                                    : 'bg-[#1A1A1A] text-[#888888] border-[#262626] hover:text-white'
                                }`}
                              >
                                Min ({minPointsToRedeem} pts)
                              </button>

                              {maxPointsCustomerCanRedeem > minPointsToRedeem * 2 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    playBeep('click');
                                    const half = Math.floor(maxPointsCustomerCanRedeem / 2);
                                    setPointsToRedeem(Math.max(minPointsToRedeem, half));
                                  }}
                                  className="px-2 py-1 rounded text-[11px] font-bold border bg-[#1A1A1A] text-[#888888] border-[#262626] hover:text-white transition-colors cursor-pointer"
                                >
                                  Half (~${((((maxPointsCustomerCanRedeem / 2) / redemptionRate) || 0)).toFixed(2)})
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => { playBeep('click'); setPointsToRedeem(maxPointsCustomerCanRedeem); }}
                                className={`px-2 py-1 rounded text-[11px] font-bold border transition-colors cursor-pointer ${
                                  pointsToRedeem === maxPointsCustomerCanRedeem
                                    ? 'bg-[#C5A059] text-black border-[#C5A059]'
                                    : 'bg-[#1A1A1A] text-[#888888] border-[#262626] hover:text-white'
                                }`}
                              >
                                Max ({maxPointsCustomerCanRedeem} pts)
                              </button>
                            </div>
                          </div>

                          {/* Slider & Input */}
                          <div className="flex items-center space-x-3">
                            <input
                              type="range"
                              min={minPointsToRedeem}
                              max={maxPointsCustomerCanRedeem}
                              step={5}
                              value={pointsToRedeem}
                              onChange={e => setPointsToRedeem(Number(e.target.value))}
                              className="flex-1 accent-[#C5A059] cursor-pointer"
                            />
                            <div className="flex items-center space-x-1.5 shrink-0">
                              <input
                                type="number"
                                min={minPointsToRedeem}
                                max={maxPointsCustomerCanRedeem}
                                step={5}
                                value={pointsToRedeem}
                                onChange={e => {
                                  const val = parseInt(e.target.value) || 0;
                                  setPointsToRedeem(Math.max(minPointsToRedeem, Math.min(maxPointsCustomerCanRedeem, val)));
                                }}
                                className="w-20 bg-[#141414] border border-[#2E2818] focus:border-[#C5A059] rounded px-2 py-1 text-xs font-mono text-center text-[#E5E5E5] focus:outline-hidden"
                              />
                              <span className="text-xs text-[#737373]">pts</span>
                            </div>
                          </div>

                          {/* Forecast summary */}
                          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#262215] text-[11px]">
                            <div className="bg-[#14120B] p-2 rounded border border-[#262215]">
                              <div className="text-[#737373]">Redemption Value</div>
                              <div className="font-bold text-emerald-400 font-mono">-${(pointsDiscount || 0).toFixed(2)}</div>
                            </div>
                            <div className="bg-[#14120B] p-2 rounded border border-[#262215]">
                              <div className="text-[#737373]">Points Earned</div>
                              <div className="font-bold text-[#C5A059] font-mono">+{pointsEarnedOnThisOrder} pts</div>
                            </div>
                            <div className="bg-[#14120B] p-2 rounded border border-[#262215]">
                              <div className="text-[#737373]">Ending Balance</div>
                              <div className="font-bold text-white font-mono">{expectedEndingBalance} pts</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-[#888888] bg-[#12100A] p-2.5 rounded-lg border border-[#262215] flex items-center justify-between">
                  <span>Attach a customer at the register to redeem rewards and earn points for this order.</span>
                  <span className="text-[#C5A059] font-medium text-[11px] ml-2 shrink-0">
                    Earns {earnRate} pt / $1
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Payment Method Selector (CA-06) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-[#A3A3A3] mb-2.5">
              Select Payment Method
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <button
                type="button"
                id="pay-method-cash"
                onClick={() => { setMethod('cash'); setError(null); }}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all cursor-pointer ${
                  method === 'cash'
                    ? 'bg-[#C5A059]/15 border-[#C5A059] text-[#C5A059] shadow-sm'
                    : 'bg-[#141414] border-[#262626] text-[#A3A3A3] hover:bg-[#1A1A1A] hover:text-[#E5E5E5]'
                }`}
              >
                <Banknote className="w-6 h-6 mb-1 text-[#C5A059]" />
                <span className="text-xs font-bold uppercase tracking-wider">Cash</span>
              </button>

              <button
                type="button"
                id="pay-method-card"
                onClick={() => { setMethod('card'); setError(null); }}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all cursor-pointer ${
                  method === 'card'
                    ? 'bg-[#C5A059]/15 border-[#C5A059] text-[#C5A059] shadow-sm'
                    : 'bg-[#141414] border-[#262626] text-[#A3A3A3] hover:bg-[#1A1A1A] hover:text-[#E5E5E5]'
                }`}
              >
                <CreditCard className="w-6 h-6 mb-1 text-[#C5A059]" />
                <span className="text-xs font-bold uppercase tracking-wider">Terminal Card</span>
              </button>

              <button
                type="button"
                id="pay-method-contactless"
                onClick={() => { setMethod('contactless'); setError(null); }}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all cursor-pointer ${
                  method === 'contactless'
                    ? 'bg-[#C5A059]/15 border-[#C5A059] text-[#C5A059] shadow-sm'
                    : 'bg-[#141414] border-[#262626] text-[#A3A3A3] hover:bg-[#1A1A1A] hover:text-[#E5E5E5]'
                }`}
              >
                <Smartphone className="w-6 h-6 mb-1 text-[#C5A059]" />
                <span className="text-xs font-bold uppercase tracking-wider">Apple / Google</span>
              </button>

              <button
                type="button"
                id="pay-method-split"
                onClick={() => { setMethod('split'); setError(null); }}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all cursor-pointer ${
                  method === 'split'
                    ? 'bg-[#C5A059]/15 border-[#C5A059] text-[#C5A059] shadow-sm'
                    : 'bg-[#141414] border-[#262626] text-[#A3A3A3] hover:bg-[#1A1A1A] hover:text-[#E5E5E5]'
                }`}
              >
                <Split className="w-6 h-6 mb-1 text-[#C5A059]" />
                <span className="text-xs font-bold uppercase tracking-wider">Split Payment</span>
              </button>

              <button
                type="button"
                id="pay-method-fallback"
                onClick={() => { setMethod('fallback'); setError(null); }}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all cursor-pointer ${
                  method === 'fallback'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-400 shadow-sm'
                    : 'bg-[#141414] border-[#262626] text-[#A3A3A3] hover:bg-[#1A1A1A] hover:text-[#E5E5E5]'
                }`}
              >
                <ShieldAlert className="w-6 h-6 mb-1 text-amber-400" />
                <span className="text-xs font-bold uppercase tracking-wider">Fallback Menu</span>
                <span className="text-[10px] text-[#737373] mt-0.5">QR / Phone / Keyed</span>
              </button>
            </div>
          </div>

          {/* Payment Method Content Area */}
          {method === 'cash' && (
            <div className="space-y-4 bg-[#141414] p-4 rounded-xl border border-[#262626]">
              {/* Cash Summary Banner */}
              <div className="flex items-center justify-between bg-[#0A0A0A] p-3 rounded-lg border border-[#222222]">
                <div>
                  <div className="text-xs text-[#737373]">Total Cash Received</div>
                  <div className="text-2xl font-black font-mono text-[#E5E5E5] flex items-center space-x-2">
                    <span>${(tenderedAmount || 0).toFixed(2)}</span>
                    {cashEntries.length > 0 && (
                      <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-[#C5A059]/20 text-[#C5A059] border border-[#C5A059]/40">
                        {cashEntries.length} {cashEntries.length === 1 ? 'installment' : 'installments'}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  {isCashInsufficient ? (
                    <div>
                      <div className="text-xs text-amber-400 font-bold uppercase tracking-wider">Still Due / Remaining</div>
                      <div className="text-xl font-bold font-mono text-amber-400">
                        ${cashRemainingDue.toFixed(2)}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-xs text-[#737373]">Change Due</div>
                      <div className="text-2xl font-black font-mono text-[#C5A059]">
                        ${(changeDue || 0).toFixed(2)}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Multi-Cash Tender Entry Form */}
              <div className="bg-[#181818] p-3 rounded-lg border border-[#2A2A2A] space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <ListOrdered className="w-3.5 h-3.5 text-[#C5A059]" />
                    <span>Enter Cash Tender Amount</span>
                  </label>
                  {cashEntries.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearCashEntries}
                      className="text-[11px] text-red-400 hover:text-red-300 font-bold underline cursor-pointer"
                    >
                      Reset All Entries
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-2.5 text-xs text-[#737373] font-bold">$</span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 20.00"
                      value={customCashInput}
                      onChange={e => setCustomCashInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const val = parseFloat(customCashInput);
                          if (val > 0) handleAddCashEntry(val);
                        }
                      }}
                      className="w-full bg-[#0A0A0A] border border-[#333333] rounded-lg pl-7 pr-3 py-2 text-sm text-white font-mono font-bold focus:border-[#C5A059] outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const val = parseFloat(customCashInput);
                      if (val > 0) handleAddCashEntry(val);
                    }}
                    disabled={!customCashInput || parseFloat(customCashInput) <= 0}
                    className="px-4 py-2 bg-[#C5A059] hover:bg-[#B38F46] disabled:opacity-30 disabled:cursor-not-allowed text-black text-xs font-black uppercase tracking-wider rounded-lg transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Cash</span>
                  </button>
                </div>

                {/* Fast Bill Buttons (Adds directly as cash installment) */}
                <div className="grid grid-cols-5 gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={handleExactCash}
                    className="py-1.5 px-1 text-center rounded-lg bg-[#222222] hover:bg-[#2C2C2C] border border-[#333333] hover:border-[#C5A059] text-[11px] font-bold text-[#C5A059] cursor-pointer"
                  >
                    Exact (${(cashRemainingDue > 0 ? cashRemainingDue : effectiveGrandTotal).toFixed(2)})
                  </button>
                  {[10, 20, 50, 100].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => handleFastCash(amt)}
                      className="py-1.5 rounded-lg bg-[#222222] hover:bg-[#2C2C2C] border border-[#333333] text-[11px] font-bold text-[#E5E5E5] hover:border-[#C5A059] cursor-pointer"
                    >
                      + ${amt} Bill
                    </button>
                  ))}
                </div>
              </div>

              {/* Cash Entries Log Table (Shows all entered amounts) */}
              {cashEntries.length > 0 && (
                <div className="bg-[#0D0D0D] border border-[#262626] rounded-lg overflow-hidden">
                  <div className="bg-[#141414] px-3 py-1.5 border-b border-[#222222] flex items-center justify-between text-[11px] font-bold text-[#AAAAAA] uppercase tracking-wider">
                    <span>Cash Tender Entries Log ({cashEntries.length})</span>
                    <span className="text-[#C5A059]">Total: ${totalCashFromEntries.toFixed(2)}</span>
                  </div>
                  <div className="max-h-32 overflow-y-auto divide-y divide-[#1F1F1F]">
                    {cashEntries.map((entry, idx) => (
                      <div key={entry.id} className="px-3 py-1.5 flex items-center justify-between text-xs hover:bg-[#161616]">
                        <div className="flex items-center space-x-2">
                          <span className="w-5 h-5 rounded-full bg-[#222222] text-[#999999] text-[10px] font-bold flex items-center justify-center">
                            #{idx + 1}
                          </span>
                          <span className="font-mono font-bold text-white text-sm">+ ${entry.amount.toFixed(2)}</span>
                          <span className="text-[10px] text-[#666666]">{entry.time}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveCashEntry(entry.id)}
                          className="text-red-400 hover:text-red-300 p-1 hover:bg-red-950/40 rounded transition-colors cursor-pointer"
                          title="Delete entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Touch Numpad for Single or Custom Tender */}
              {cashEntries.length === 0 && (
                <div className="grid grid-cols-3 gap-1.5 max-w-[240px] mx-auto pt-1">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => handleNumpad(n)}
                      className="h-9 rounded-lg bg-[#1A1A1A] hover:bg-[#262626] active:bg-[#C5A059] active:text-black text-[#E5E5E5] font-bold text-sm border border-[#262626] cursor-pointer"
                    >
                      {n}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleNumpad('.')}
                    className="h-9 rounded-lg bg-[#1A1A1A] hover:bg-[#262626] text-[#E5E5E5] font-bold text-sm border border-[#262626] cursor-pointer"
                  >
                    .
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNumpad('0')}
                    className="h-9 rounded-lg bg-[#1A1A1A] hover:bg-[#262626] active:bg-[#C5A059] active:text-black text-[#E5E5E5] font-bold text-sm border border-[#262626] cursor-pointer"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNumpad('C')}
                    className="h-9 rounded-lg bg-[#141414] hover:bg-[#262626] text-[#737373] hover:text-white text-xs font-semibold uppercase border border-[#262626] cursor-pointer"
                  >
                    CLR
                  </button>
                </div>
              )}
            </div>
          )}

          {method === 'card' && (
            <div className="bg-[#141414] p-5 rounded-2xl border border-[#262626] space-y-4">
              <div className="flex items-center justify-between border-b border-[#222222] pb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Counter PIN Pad Terminal Online
                  </span>
                </div>
                <span className="text-[11px] font-mono text-[#888888]">
                  IP: {settings?.terminalIp || '192.168.1.180:8080'}
                </span>
              </div>

              <div className="p-4 bg-[#191919] rounded-xl border border-[#2A2A2A] text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-[#C5A059]/15 text-[#C5A059] mx-auto flex items-center justify-center">
                  <CreditCard className="w-6 h-6" />
                </div>
                <h4 className="font-serif italic font-bold text-base text-white">
                  Insert, Tap, or Swipe on Counter Terminal
                </h4>
                <p className="text-xs text-[#888888] max-w-sm mx-auto">
                  Customer is prompted on customer-facing Verifone/Pax device for EMV Chip or PIN verification.
                </p>

                {/* Card Brand Selector */}
                <div className="flex items-center justify-center space-x-2 pt-2">
                  {(['Visa', 'Mastercard', 'Amex'] as const).map(brand => (
                    <button
                      key={brand}
                      type="button"
                      onClick={() => setCardBrand(brand)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        cardBrand === brand
                          ? 'bg-[#C5A059] text-black shadow-xs'
                          : 'bg-[#222222] text-[#888888] hover:text-white'
                      }`}
                    >
                      {brand}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                id="btn-process-terminal-card"
                disabled={isProcessing}
                onClick={async () => {
                  try {
                    setIsProcessing(true);
                    await onCompleteOrder({
                      method: 'card',
                      amount: effectiveGrandTotal,
                      pointsRedeemed: applyLoyaltyPoints ? pointsToRedeem : 0,
                      pointsDiscountAmount: pointsDiscount,
                      cardBrand,
                      cardLast4: Math.floor(1000 + Math.random() * 9000).toString(),
                      authCode: `AUTH-${Math.floor(100000 + Math.random() * 900000)}`,
                      fallbackMethod: 'card_terminal',
                    });
                    playBeep('success');
                  } catch (err: any) {
                    playBeep('error');
                    setError(err.message || 'Terminal charge failed');
                    setIsProcessing(false);
                  }
                }}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#C5A059] to-[#D4AF37] hover:from-[#D4AF37] hover:to-[#C5A059] text-black font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center space-x-2 transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {isProcessing ? 'Waiting for PIN Pad Approval...' : `Process Terminal Card ($${effectiveGrandTotal.toFixed(2)})`}
                </span>
              </button>

              {/* Notice & switch to Fallback Menu */}
              <div className="p-3 rounded-xl bg-[#1A1A1A] border border-[#2B2B2B] flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-xs text-[#AAAAAA]">
                    Terminal frozen, offline, or customer wants QR / Phone checkout?
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    playBeep('click');
                    setMethod('fallback');
                  }}
                  className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 font-bold text-[11px] uppercase tracking-wider transition-colors cursor-pointer shrink-0 ml-2"
                >
                  Switch to Fallback Menu →
                </button>
              </div>
            </div>
          )}

          {method === 'fallback' && (
            <div className="bg-[#141414] p-4 sm:p-5 rounded-2xl border border-amber-500/30">
              <div className="flex items-center justify-between mb-3 border-b border-[#262626] pb-2.5">
                <div className="flex items-center space-x-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                    Emergency Payment Fallback Center
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setMethod('card')}
                  className="text-[11px] text-[#888888] hover:text-[#C5A059] transition-colors cursor-pointer"
                >
                  ← Back to Terminal
                </button>
              </div>

              <CardPaymentFallbackManager
                amountDue={effectiveGrandTotal}
                orderNumber={`ORD-${Date.now().toString().slice(-5)}`}
                settings={settings}
                currentUser={currentUser}
                onPaymentSuccess={async details => {
                  try {
                    setIsProcessing(true);
                    const paymentData: any = {
                      method: 'card',
                      amount: effectiveGrandTotal,
                      pointsRedeemed: applyLoyaltyPoints ? pointsToRedeem : 0,
                      pointsDiscountAmount: pointsDiscount,
                      cardBrand: details.cardBrand,
                      cardLast4: details.cardLast4,
                      authCode: details.authCode,
                      fallbackMethod: details.fallbackMethod,
                      processorTxId: details.processorTxId,
                      paymentSessionId: details.paymentSessionId,
                    };
                    await onCompleteOrder(paymentData);
                    playBeep('success');
                  } catch (err: any) {
                    playBeep('error');
                    setError(err.message || 'Payment processing failed');
                    setIsProcessing(false);
                  }
                }}
              />
            </div>
          )}

          {method === 'contactless' && (
            <div className="bg-[#141414] p-5 rounded-xl border border-[#262626] text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#C5A059]/15 text-[#C5A059] mx-auto flex items-center justify-center animate-pulse">
                <Smartphone className="w-6 h-6" />
              </div>
              <h4 className="font-serif italic font-bold text-base text-[#F5F5F5]">Hold Phone Near Reader</h4>
              <p className="text-xs text-[#737373] max-w-sm mx-auto">
                Ready for Apple Pay, Google Wallet, or Samsung Pay. NFC reader is actively listening.
              </p>
            </div>
          )}

          {method === 'split' && (
            <div className="bg-[#141414] p-4 rounded-xl border border-[#262626] space-y-4">
              {/* Split Mode Switcher */}
              <div className="flex items-center justify-between border-b border-[#262626] pb-3">
                <div className="flex items-center space-x-2">
                  <Split className="w-4 h-4 text-[#C5A059]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-white">
                    Choose Split Mode
                  </span>
                </div>
                <div className="flex space-x-1.5">
                  <button
                    type="button"
                    onClick={() => setSplitType('two_cards')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                      splitType === 'two_cards'
                        ? 'bg-[#C5A059] text-black shadow-xs'
                        : 'bg-[#1F1F1F] text-[#888888] hover:text-white'
                    }`}
                  >
                    Split In Two Cards
                  </button>
                  <button
                    type="button"
                    onClick={() => setSplitType('cash_card')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                      splitType === 'cash_card'
                        ? 'bg-[#C5A059] text-black shadow-xs'
                        : 'bg-[#1F1F1F] text-[#888888] hover:text-white'
                    }`}
                  >
                    Cash + Card
                  </button>
                </div>
              </div>

              {/* Mode A: Split Between Two Cards */}
              {splitType === 'two_cards' && (
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#999999]">
                      Total Order: <strong className="text-white">${effectiveGrandTotal.toFixed(2)}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={handleSplit5050}
                      className="px-2.5 py-1 rounded bg-[#222222] hover:bg-[#2C2C2C] border border-[#3A3A3A] hover:border-[#C5A059] text-[11px] font-bold text-[#C5A059] uppercase transition-colors cursor-pointer"
                    >
                      Split 50 / 50 (${(effectiveGrandTotal / 2).toFixed(2)} each)
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Card 1 Block */}
                    <div className="bg-[#181818] border border-[#2B2B2B] rounded-xl p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white uppercase flex items-center gap-1.5">
                          <CreditCard className="w-3.5 h-3.5 text-[#C5A059]" />
                          <span>Card 1 Charge</span>
                        </span>
                        {card1Approved ? (
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/50 border border-emerald-800/50 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Check className="w-2.5 h-2.5" /> Approved
                          </span>
                        ) : (
                          <span className="text-[10px] text-[#777777]">Terminal Ready</span>
                        )}
                      </div>

                      <div>
                        <label className="text-[10px] text-[#888888] uppercase block mb-1">Card 1 Amount ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={card1Amount}
                          onChange={e => handleCard1Change(e.target.value)}
                          className="w-full bg-[#0E0E0E] border border-[#333333] rounded-lg px-3 py-2 text-sm text-white font-mono font-bold focus:border-[#C5A059] outline-none"
                        />
                      </div>

                      <div className="flex items-center space-x-1.5">
                        {(['Visa', 'Mastercard', 'Amex'] as const).map(b => (
                          <button
                            key={b}
                            type="button"
                            onClick={() => setCard1Brand(b)}
                            className={`flex-1 py-1 rounded text-[10px] font-bold uppercase tracking-wider border cursor-pointer ${
                              card1Brand === b
                                ? 'bg-[#C5A059] text-black border-[#C5A059]'
                                : 'bg-[#101010] text-[#777777] border-[#262626]'
                            }`}
                          >
                            {b}
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          playBeep('success');
                          setCard1Approved(true);
                        }}
                        className={`w-full py-1.5 rounded-lg text-xs font-bold uppercase transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                          card1Approved
                            ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-700/50'
                            : 'bg-[#222222] hover:bg-[#2C2C2C] text-white border border-[#3A3A3A]'
                        }`}
                      >
                        {card1Approved ? <CheckCheck className="w-3.5 h-3.5" /> : <CreditCard className="w-3.5 h-3.5 text-[#C5A059]" />}
                        <span>{card1Approved ? 'Card 1 Swiped / Captured' : `Tap / Swipe Card 1 ($${numCard1.toFixed(2)})`}</span>
                      </button>
                    </div>

                    {/* Card 2 Block */}
                    <div className="bg-[#181818] border border-[#2B2B2B] rounded-xl p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white uppercase flex items-center gap-1.5">
                          <CreditCard className="w-3.5 h-3.5 text-[#C5A059]" />
                          <span>Card 2 Charge</span>
                        </span>
                        {card2Approved ? (
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/50 border border-emerald-800/50 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Check className="w-2.5 h-2.5" /> Approved
                          </span>
                        ) : (
                          <span className="text-[10px] text-[#777777]">Terminal Ready</span>
                        )}
                      </div>

                      <div>
                        <label className="text-[10px] text-[#888888] uppercase block mb-1">Card 2 Amount ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={card2Amount}
                          onChange={e => setCard2Amount(e.target.value)}
                          className="w-full bg-[#0E0E0E] border border-[#333333] rounded-lg px-3 py-2 text-sm text-white font-mono font-bold focus:border-[#C5A059] outline-none"
                        />
                      </div>

                      <div className="flex items-center space-x-1.5">
                        {(['Visa', 'Mastercard', 'Amex'] as const).map(b => (
                          <button
                            key={b}
                            type="button"
                            onClick={() => setCard2Brand(b)}
                            className={`flex-1 py-1 rounded text-[10px] font-bold uppercase tracking-wider border cursor-pointer ${
                              card2Brand === b
                                ? 'bg-[#C5A059] text-black border-[#C5A059]'
                                : 'bg-[#101010] text-[#777777] border-[#262626]'
                            }`}
                          >
                            {b}
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          playBeep('success');
                          setCard2Approved(true);
                        }}
                        className={`w-full py-1.5 rounded-lg text-xs font-bold uppercase transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                          card2Approved
                            ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-700/50'
                            : 'bg-[#222222] hover:bg-[#2C2C2C] text-white border border-[#3A3A3A]'
                        }`}
                      >
                        {card2Approved ? <CheckCheck className="w-3.5 h-3.5" /> : <CreditCard className="w-3.5 h-3.5 text-[#C5A059]" />}
                        <span>{card2Approved ? 'Card 2 Swiped / Captured' : `Tap / Swipe Card 2 ($${numCard2.toFixed(2)})`}</span>
                      </button>
                    </div>
                  </div>

                  {/* Card Balance Verification Banner */}
                  <div className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                    isTwoCardsBalanced
                      ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-300'
                      : 'bg-amber-950/30 border-amber-800/40 text-amber-300'
                  }`}>
                    <div className="flex items-center space-x-2">
                      {isTwoCardsBalanced ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-amber-400" />}
                      <span>
                        Combined Total: <strong>${totalTwoCards.toFixed(2)}</strong> of ${effectiveGrandTotal.toFixed(2)}
                      </span>
                    </div>
                    {!isTwoCardsBalanced && (
                      <button
                        type="button"
                        onClick={() => {
                          const rem = Math.max(0, effectiveGrandTotal - numCard1);
                          setCard2Amount(rem.toFixed(2));
                        }}
                        className="text-[11px] font-bold underline text-amber-200 hover:text-white cursor-pointer"
                      >
                        Fix Balance to Card 2 (${(effectiveGrandTotal - numCard1).toFixed(2)})
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Mode B: Split Cash + Card */}
              {splitType === 'cash_card' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-[#737373] mb-1">Cash Portion ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={splitCash}
                        onChange={e => setSplitCash(e.target.value)}
                        className="w-full bg-[#0A0A0A] border border-[#262626] rounded-lg px-3 py-2 text-sm text-[#E5E5E5] font-mono focus:border-[#C5A059] focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#737373] mb-1">Card Balance ($)</label>
                      <div className="bg-[#0A0A0A] border border-[#262626] rounded-lg px-3 py-2 text-sm text-[#C5A059] font-mono font-bold">
                        ${(splitCardAmount || 0).toFixed(2)}
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px] text-[#737373]">
                    Cash collected first, remainder will prompt on customer card terminal.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="bg-[#0A0A0A] px-6 py-4 border-t border-[#262626] flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[#737373] hover:text-white rounded-lg hover:bg-[#1A1A1A] transition-colors cursor-pointer"
          >
            Cancel / Back to Cart
          </button>

          <button
            type="button"
            id="checkout-complete-btn"
            onClick={handleProcessPayment}
            disabled={isProcessing || (needsManagerApproval && !managerApproved)}
            className="px-6 py-3 rounded-lg bg-[#C5A059] hover:bg-[#D4B06A] active:scale-98 text-black font-bold uppercase tracking-widest text-sm shadow-lg flex items-center space-x-2 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <CheckCircle2 className="w-4 h-4 text-black" />
            <span>
              {isProcessing ? 'Processing...' : `Charge & Complete ($${(effectiveGrandTotal || 0).toFixed(2)})`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
