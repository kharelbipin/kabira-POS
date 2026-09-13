import React, { useState } from 'react';
import { DollarSign, X, CheckCircle2, AlertTriangle, Key, Receipt } from 'lucide-react';
import { Product, User } from '../../types';
import { playBeep } from '../../utils/audio';
import { posBridge } from '../../services/posBridge';

interface LottoPayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: User | null;
  onAddLottoPayout: (payoutProduct: Product) => void;
}

const QUICK_PAYOUTS = [5, 10, 20, 25, 40, 50, 100, 200, 500];

export const LottoPayoutModal: React.FC<LottoPayoutModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onAddLottoPayout,
}) => {
  const [payoutStr, setPayoutStr] = useState('20.00');
  const [ticketNumber, setTicketNumber] = useState('');
  const [kickDrawer, setKickDrawer] = useState(true);
  const [managerPin, setManagerPin] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const payoutAmount = Math.max(0, parseFloat(payoutStr) || 0);
  const requiresManagerPin = payoutAmount >= 200 && currentUser?.role === 'Cashier';

  const handleQuickAmount = (val: number) => {
    playBeep('click');
    setPayoutStr(val.toFixed(2));
    setErrorMsg(null);
  };

  const handleKeypad = (char: string) => {
    playBeep('click');
    setErrorMsg(null);
    if (char === 'C') {
      setPayoutStr('0.00');
    } else if (char === '.') {
      if (!payoutStr.includes('.')) {
        setPayoutStr(payoutStr + '.');
      }
    } else if (char === '00') {
      if (payoutStr === '0.00' || payoutStr === '0') return;
      const num = parseFloat(payoutStr) * 100;
      setPayoutStr(num.toFixed(2));
    } else {
      if (payoutStr === '0.00' || payoutStr === '0') {
        setPayoutStr(char + '.00');
      } else if (payoutStr.includes('.')) {
        const parts = payoutStr.split('.');
        if (parts[1].length < 2) {
          setPayoutStr(parts[0] + '.' + parts[1] + char);
        } else {
          const raw = (payoutStr.replace('.', '') + char).replace(/^0+/, '');
          const cents = (parseInt(raw) / 100).toFixed(2);
          setPayoutStr(cents);
        }
      } else {
        setPayoutStr(payoutStr + char);
      }
    }
  };

  const handleConfirmPayout = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (payoutAmount <= 0) {
      playBeep('error');
      setErrorMsg('Please enter a valid winning ticket payout amount.');
      return;
    }

    // Texas Lottery in-store retail limit check
    if (payoutAmount > 599.0) {
      playBeep('error');
      setErrorMsg(
        'Texas Lottery rules prohibit in-store retail payouts over $599.00. Direct customer to the Texas Lottery Claim Center.'
      );
      return;
    }

    if (requiresManagerPin) {
      if (managerPin !== '5555' && managerPin !== '9999') {
        playBeep('error');
        setErrorMsg('Manager PIN (5555 or 9999) required for payouts >= $200.00');
        return;
      }
    }

    playBeep('success');

    // Create negative price product for cart offset
    const payoutItem: Product = {
      id: `lotto-payout-${Date.now()}`,
      name: `Texas Lotto Winning Payout (-$${payoutAmount.toFixed(2)})`,
      sku: 'LOTTO-PAYOUT',
      barcode: ticketNumber.trim() ? `TKT-${ticketNumber.trim()}` : 'LOTTO-PAYOUT',
      categoryId: 'cat-9',
      categoryName: 'Lotto',
      price: -payoutAmount,
      cost: -payoutAmount,
      taxRate: 0.0,
      size: ticketNumber ? `Tkt #${ticketNumber}` : 'Cash Payout',
      stockQuantity: 9999,
      lowStockThreshold: 1,
      imageUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=400',
      description: `Texas Lottery winning ticket drawer redemption ($${payoutAmount.toFixed(2)})`,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // If kick drawer enabled, trigger POS bridge pulse
    if (kickDrawer) {
      posBridge.kickCashDrawer({
        type: 'lotto_payout',
        user: currentUser || undefined,
        amount: payoutAmount,
        reason: `Texas Lotto Winning Ticket Payout: $${payoutAmount.toFixed(2)}`,
        orderNumber: ticketNumber ? `TKT-${ticketNumber}` : undefined,
      }).catch(console.error);
    }

    onAddLottoPayout(payoutItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 select-none animate-in fade-in duration-150">
      <div className="bg-[#0F172A] border border-rose-900/60 rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden text-slate-100 flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="bg-rose-950/80 border-b border-rose-800/60 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-400/40 flex items-center justify-center text-rose-400 shadow-xs">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
                <span>Texas Lottery Payout</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  F7 Hotkey
                </span>
              </h2>
              <p className="text-xs text-rose-300/80">
                Redeem winning scratch-off or draw game ticket from till
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Error notice if any */}
          {errorMsg && (
            <div className="p-3 bg-rose-950/90 border border-rose-500/50 rounded-2xl text-rose-200 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Amount Display with Large Negative Visual */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-400">
                Winning Payout Amount (Customer Credit)
              </span>
              <span className="text-[11px] text-slate-400 font-mono">Till Cash Payout</span>
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-rose-500 text-2xl font-black">
                -$
              </div>
              <input
                type="number"
                step="0.50"
                min="0.50"
                value={payoutStr}
                onChange={e => {
                  setPayoutStr(e.target.value);
                  setErrorMsg(null);
                }}
                className="w-full bg-slate-950 border-2 border-rose-500/60 focus:border-rose-400 focus:ring-4 focus:ring-rose-500/20 rounded-2xl pl-12 pr-4 py-3 text-3xl font-mono font-black text-rose-400 text-right focus:outline-none tracking-tight"
              />
            </div>

            {/* Quick Denominations */}
            <div>
              <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">
                Common Payout Amounts:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_PAYOUTS.map(amt => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => handleQuickAmount(amt)}
                    className={`px-3 py-1.5 rounded-xl font-mono font-bold text-xs border transition-all cursor-pointer ${
                      payoutAmount === amt
                        ? 'bg-rose-600 text-white border-rose-400 shadow-xs'
                        : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    ${amt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Keypad & Audit inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Numeric Keypad */}
            <div className="sm:col-span-2 grid grid-cols-3 gap-1.5 bg-slate-900/60 p-2 rounded-2xl border border-slate-800">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '00'].map(k => (
                <button
                  key={k}
                  type="button"
                  onClick={() => handleKeypad(k)}
                  className={`py-3 rounded-xl font-mono font-bold text-base transition-colors cursor-pointer active:scale-95 ${
                    k === 'C'
                      ? 'bg-rose-950/60 text-rose-300 hover:bg-rose-900/60 border border-rose-800/40'
                      : 'bg-slate-800/80 hover:bg-slate-700 text-slate-100 border border-slate-700'
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>

            {/* Options & Ticket Details */}
            <div className="flex flex-col justify-between bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Ticket Validation Code / #
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={ticketNumber}
                    onChange={e => setTicketNumber(e.target.value)}
                    placeholder="e.g. 7482"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder:text-slate-600 font-mono"
                  />
                  <Receipt className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-2.5 pointer-events-none" />
                </div>
              </div>

              {/* Kick Drawer Checkbox */}
              <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                <input
                  type="checkbox"
                  checked={kickDrawer}
                  onChange={e => setKickDrawer(e.target.checked)}
                  className="w-4 h-4 accent-rose-500 rounded"
                />
                <span className="font-semibold">Pop Cash Drawer (Pulse)</span>
              </label>

              {/* Manager PIN if high payout */}
              {requiresManagerPin && (
                <div className="bg-rose-950/40 border border-rose-800/50 p-2.5 rounded-xl space-y-1">
                  <div className="flex items-center space-x-1.5 text-[11px] font-bold text-rose-400">
                    <Key className="w-3.5 h-3.5" />
                    <span>Manager PIN Required (&gt;=$200)</span>
                  </div>
                  <input
                    type="password"
                    maxLength={4}
                    value={managerPin}
                    onChange={e => setManagerPin(e.target.value)}
                    placeholder="PIN (5555)"
                    className="w-full bg-slate-950 border border-rose-700/60 rounded-lg px-2 py-1 text-xs text-center font-mono text-white"
                  />
                </div>
              )}

              <div className="text-[10px] text-slate-500 leading-tight">
                Texas Lottery retail limit: Max $599.00 in-store payout per ticket.
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-950 px-6 py-4 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmPayout}
            disabled={payoutAmount <= 0}
            className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-rose-600/30 transition-all cursor-pointer flex items-center justify-center space-x-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Confirm Lotto Payout (-${payoutAmount.toFixed(2)})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
