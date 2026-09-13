import React, { useState } from 'react';
import { Ticket, X, Plus, Minus, DollarSign, CheckCircle2, Sparkles } from 'lucide-react';
import { Product } from '../../types';
import { playBeep } from '../../utils/audio';

interface LottoSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddLottoProduct: (product: Product, quantity?: number) => void;
}

const LOTTO_GAMES = [
  { id: 'scratch', name: 'Texas Scratch-Off', defaultPrices: [1, 2, 5, 10, 20, 30, 50, 100], icon: '🎟️' },
  { id: 'mega', name: 'Mega Millions', defaultPrices: [2, 5, 10, 20], icon: '🎱' },
  { id: 'powerball', name: 'Powerball', defaultPrices: [2, 4, 10, 20], icon: '⚡' },
  { id: 'twostep', name: 'Texas Two Step', defaultPrices: [1, 2, 5, 10], icon: '🤠' },
  { id: 'pick3', name: 'Pick 3 / Daily 4', defaultPrices: [1, 2, 5], icon: '🎲' },
  { id: 'allornothing', name: 'All or Nothing', defaultPrices: [2, 4, 10], icon: '🎯' },
  { id: 'custom', name: 'Custom Lottery Game', defaultPrices: [5, 10, 20, 50], icon: '🏷️' },
];

const QUICK_AMOUNTS = [1, 2, 3, 5, 10, 20, 30, 50, 100];

export const LottoSaleModal: React.FC<LottoSaleModalProps> = ({
  isOpen,
  onClose,
  onAddLottoProduct,
}) => {
  const [selectedGame, setSelectedGame] = useState(LOTTO_GAMES[0]);
  const [amountStr, setAmountStr] = useState('5.00');
  const [quantity, setQuantity] = useState(1);

  if (!isOpen) return null;

  const unitPrice = Math.max(0, parseFloat(amountStr) || 0);
  const totalAmount = unitPrice * quantity;

  const handleQuickAmount = (val: number) => {
    playBeep('click');
    setAmountStr(val.toFixed(2));
  };

  const handleKeypad = (char: string) => {
    playBeep('click');
    if (char === 'C') {
      setAmountStr('0.00');
    } else if (char === '.') {
      if (!amountStr.includes('.')) {
        setAmountStr(amountStr + '.');
      }
    } else if (char === '00') {
      if (amountStr === '0.00' || amountStr === '0') return;
      const num = parseFloat(amountStr) * 100;
      setAmountStr(num.toFixed(2));
    } else {
      // Numerical entry
      if (amountStr === '0.00' || amountStr === '0') {
        setAmountStr(char + '.00');
      } else if (amountStr.includes('.')) {
        const parts = amountStr.split('.');
        if (parts[1].length < 2) {
          setAmountStr(parts[0] + '.' + parts[1] + char);
        } else {
          // Replace cents or shift
          const raw = (amountStr.replace('.', '') + char).replace(/^0+/, '');
          const cents = (parseInt(raw) / 100).toFixed(2);
          setAmountStr(cents);
        }
      } else {
        setAmountStr(amountStr + char);
      }
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (unitPrice <= 0) {
      playBeep('error');
      return;
    }

    playBeep('click');

    const lottoProd: Product = {
      id: `lotto-${selectedGame.id}-${unitPrice.toFixed(0)}-${Date.now()}`,
      name: `${selectedGame.name} ($${unitPrice.toFixed(2)})`,
      sku: `LOTTO-${selectedGame.id.toUpperCase()}-${Math.round(unitPrice)}`,
      barcode: `079934${Math.floor(100000 + Math.random() * 900000)}`,
      categoryId: 'cat-9',
      categoryName: 'Lotto',
      price: unitPrice,
      cost: Number((unitPrice * 0.95).toFixed(2)),
      taxRate: 0.0, // Texas Lottery is tax exempt
      size: `${selectedGame.name}`,
      stockQuantity: 9999,
      lowStockThreshold: 10,
      imageUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=400',
      description: `Official Texas Lottery - ${selectedGame.name} ticket`,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onAddLottoProduct(lottoProd, quantity);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 select-none animate-in fade-in duration-150">
      <div className="bg-[#0F172A] border border-slate-700 rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden text-slate-100 flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="bg-emerald-950/80 border-b border-emerald-800/60 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shadow-xs">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
                <span>Texas Lottery Sale</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  F6 Hotkey
                </span>
              </h2>
              <p className="text-xs text-emerald-300/80">Select game, tap quick denomination or type custom ticket amount</p>
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
          {/* Game Selection Chips */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 block">
              Lottery Game Category
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {LOTTO_GAMES.map(game => {
                const isSelected = selectedGame.id === game.id;
                return (
                  <button
                    key={game.id}
                    type="button"
                    onClick={() => {
                      playBeep('click');
                      setSelectedGame(game);
                      setAmountStr(game.defaultPrices[0].toFixed(2));
                    }}
                    className={`px-3 py-2.5 rounded-xl text-left border transition-all cursor-pointer flex items-center space-x-2 ${
                      isSelected
                        ? 'bg-emerald-600/30 border-emerald-400 text-white shadow-xs ring-2 ring-emerald-500/30'
                        : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <span className="text-base">{game.icon}</span>
                    <span className="text-xs font-bold truncate">{game.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Amount Display & Quick Amounts */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Ticket Price Amount ($)
              </span>
              <span className="text-[11px] text-emerald-400 font-semibold">Texas Sales Tax Exempt (0.00%)</span>
            </div>

            {/* Large Price Input */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-emerald-400 text-2xl font-black">
                $
              </div>
              <input
                type="number"
                step="0.50"
                min="0.50"
                value={amountStr}
                onChange={e => setAmountStr(e.target.value)}
                className="w-full bg-slate-950 border-2 border-emerald-500/60 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/20 rounded-2xl pl-10 pr-4 py-3 text-3xl font-mono font-black text-white text-right focus:outline-none tracking-tight"
              />
            </div>

            {/* Quick Price Buttons */}
            <div>
              <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">Quick Texas Denominations:</span>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_AMOUNTS.map(amt => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => handleQuickAmount(amt)}
                    className={`px-3 py-1.5 rounded-xl font-mono font-bold text-xs border transition-all cursor-pointer ${
                      unitPrice === amt
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-xs'
                        : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    ${amt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Keypad & Quantity controls */}
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
                      ? 'bg-rose-950/50 text-rose-300 hover:bg-rose-900/60 border border-rose-800/40'
                      : 'bg-slate-800/80 hover:bg-slate-700 text-slate-100 border border-slate-700'
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>

            {/* Quantity Counter & Summary Card */}
            <div className="flex flex-col justify-between bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl space-y-3">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Number of Tickets
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      playBeep('click');
                      setQuantity(q => Math.max(1, q - 1));
                    }}
                    className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white flex items-center justify-center font-bold cursor-pointer"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <div className="flex-1 text-center font-mono font-black text-xl text-white bg-slate-950 py-1.5 rounded-xl border border-slate-800">
                    {quantity}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      playBeep('click');
                      setQuantity(q => q + 1);
                    }}
                    className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white flex items-center justify-center font-bold cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="bg-slate-950/90 p-3 rounded-xl border border-slate-800/80 space-y-1 text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Lotto Charge</span>
                <div className="text-2xl font-black font-mono text-emerald-400">
                  ${totalAmount.toFixed(2)}
                </div>
                <div className="text-[10px] text-slate-400">
                  {quantity} x ${unitPrice.toFixed(2)}
                </div>
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
            onClick={handleSubmit}
            disabled={unitPrice <= 0}
            className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition-all cursor-pointer flex items-center justify-center space-x-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Add to Sale (${totalAmount.toFixed(2)})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
