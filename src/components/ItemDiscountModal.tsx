import React, { useState } from 'react';
import { CartItem } from '../types';
import { playBeep } from '../utils/audio';
import { Tag, Percent, DollarSign, X } from 'lucide-react';

interface ItemDiscountModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: CartItem | null;
  onApplyDiscount: (productId: string, discountAmount: number) => void;
}

export const ItemDiscountModal: React.FC<ItemDiscountModalProps> = ({
  isOpen,
  onClose,
  item,
  onApplyDiscount,
}) => {
  const [type, setType] = useState<'percent' | 'amount'>('percent');
  const [value, setValue] = useState<string>('10');

  if (!isOpen || !item) return null;

  const itemTotal = item.unitPrice * item.quantity;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(value) || 0;
    let computedDiscount = 0;
    if (type === 'percent') {
      computedDiscount = (itemTotal * val) / 100;
    } else {
      computedDiscount = Math.min(itemTotal, val);
    }
    playBeep('click');
    onApplyDiscount(item.product.id, computedDiscount);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 select-none">
      <div className="bg-[#0F0F0F] border border-[#262626] rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden text-[#E5E5E5] p-5 space-y-4">
        <div className="flex justify-between items-center border-b border-[#262626] pb-3">
          <div>
            <h3 className="font-serif italic font-bold text-base text-[#F5F5F5]">Line Item Discount</h3>
            <p className="text-xs text-[#737373] truncate max-w-[240px] font-sans">{item.product.name}</p>
          </div>
          <button onClick={onClose} className="text-[#737373] hover:text-white cursor-pointer transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-[#141414] p-3 rounded-lg border border-[#262626] text-xs flex justify-between font-mono">
          <span className="text-[#A3A3A3]">Line Total ({item.quantity}x):</span>
          <span className="font-bold text-[#F5F5F5]">${itemTotal.toFixed(2)}</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div className="flex bg-[#141414] p-1 rounded-lg border border-[#262626] text-xs">
            <button
              type="button"
              onClick={() => setType('percent')}
              className={`flex-1 py-1 font-bold uppercase tracking-wider text-[11px] rounded transition-colors ${
                type === 'percent' ? 'bg-[#C5A059] text-black shadow-sm' : 'text-[#737373] hover:text-white'
              }`}
            >
              Percentage (%)
            </button>
            <button
              type="button"
              onClick={() => setType('amount')}
              className={`flex-1 py-1 font-bold uppercase tracking-wider text-[11px] rounded transition-colors ${
                type === 'amount' ? 'bg-[#C5A059] text-black shadow-sm' : 'text-[#737373] hover:text-white'
              }`}
            >
              Fixed Dollar ($)
            </button>
          </div>

          <div>
            <label className="block text-[#A3A3A3] font-bold uppercase tracking-wider mb-1.5">
              {type === 'percent' ? 'Discount Percentage (%)' : 'Discount Dollar Amount ($)'}
            </label>
            <input
              type="number"
              step={type === 'percent' ? '1' : '0.01'}
              min="0"
              max={type === 'percent' ? '100' : itemTotal}
              value={value}
              onChange={e => setValue(e.target.value)}
              className="w-full bg-[#141414] border border-[#262626] rounded-lg p-2 text-sm text-[#E5E5E5] font-mono focus:outline-hidden focus:border-[#C5A059]"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2 border-t border-[#262626]">
            <button
              type="button"
              onClick={() => {
                onApplyDiscount(item.product.id, 0);
                onClose();
              }}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider text-red-400 hover:bg-red-950/30 transition-colors cursor-pointer"
            >
              Clear Discount
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-[#C5A059] hover:bg-[#D4B06A] text-black font-bold uppercase tracking-wider text-xs transition-colors cursor-pointer shadow-md"
            >
              Apply Discount
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
