import React from 'react';
import { Delete, Check, RotateCcw } from 'lucide-react';
import { playBeep } from '../../utils/audio';

interface TouchNumericKeypadProps {
  value: string;
  onChange: (value: string) => void;
  onEnter?: () => void;
  onClear?: () => void;
  enterLabel?: string;
  enterDisabled?: boolean;
  allowDecimals?: boolean;
  maxDecimals?: number;
  quickCashOptions?: number[];
  onQuickCashSelect?: (amount: number) => void;
  exactAmount?: number;
  onExactSelect?: () => void;
  className?: string;
}

export const TouchNumericKeypad: React.FC<TouchNumericKeypadProps> = ({
  value,
  onChange,
  onEnter,
  onClear,
  enterLabel = 'ENTER',
  enterDisabled = false,
  allowDecimals = true,
  maxDecimals = 2,
  quickCashOptions,
  onQuickCashSelect,
  exactAmount,
  onExactSelect,
  className = '',
}) => {
  const handleDigit = (digit: string) => {
    playBeep('click');
    if (value.includes('.')) {
      const decimals = value.split('.')[1] || '';
      if (decimals.length >= maxDecimals) return;
    }
    if (value === '0' || value === '0.00' || value === '') {
      onChange(digit);
    } else {
      onChange(value + digit);
    }
  };

  const handleDecimal = () => {
    playBeep('click');
    if (!allowDecimals) return;
    if (!value || value === '0') {
      onChange('0.');
    } else if (!value.includes('.')) {
      onChange(value + '.');
    }
  };

  const handleBackspace = () => {
    playBeep('click');
    if (value.length <= 1) {
      onChange('');
    } else {
      onChange(value.slice(0, -1));
    }
  };

  const handleClear = () => {
    playBeep('click');
    if (onClear) {
      onClear();
    } else {
      onChange('');
    }
  };

  const handleEnter = () => {
    playBeep('click');
    if (onEnter && !enterDisabled) {
      onEnter();
    }
  };

  return (
    <div className={`space-y-3 select-none ${className}`}>
      {/* Optional Quick Cash Pills (For Cash Tender) */}
      {quickCashOptions && quickCashOptions.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
            Quick Cash
          </div>
          <div className="grid grid-cols-4 gap-2">
            {quickCashOptions.map((cash) => (
              <button
                key={cash}
                type="button"
                onClick={() => {
                  playBeep('click');
                  if (onQuickCashSelect) onQuickCashSelect(cash);
                  else onChange(cash.toFixed(2));
                }}
                className="py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:bg-amber-600 text-white font-mono font-bold text-sm border border-zinc-700 active:border-amber-400 transition-colors cursor-pointer shadow-sm"
              >
                ${cash}
              </button>
            ))}
            {exactAmount !== undefined && exactAmount > 0 && (
              <button
                type="button"
                onClick={() => {
                  playBeep('click');
                  if (onExactSelect) onExactSelect();
                  else onChange(exactAmount.toFixed(2));
                }}
                className="py-2.5 rounded-xl bg-amber-600/30 hover:bg-amber-600/40 active:bg-amber-600 text-amber-300 active:text-black font-bold text-xs uppercase tracking-wider border border-amber-500/50 transition-colors cursor-pointer shadow-sm"
              >
                Exact
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main 3x4 Touch Numeric Grid */}
      <div className="grid grid-cols-3 gap-2">
        {/* Row 1: 1 2 3 */}
        {['1', '2', '3'].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => handleDigit(d)}
            className="h-14 sm:h-16 rounded-xl bg-[#1C1C1E] hover:bg-[#2C2C2E] active:bg-[#3A3A3C] text-white font-mono font-black text-2xl border border-zinc-800 active:border-zinc-500 transition-all flex items-center justify-center cursor-pointer shadow-md"
          >
            {d}
          </button>
        ))}

        {/* Row 2: 4 5 6 */}
        {['4', '5', '6'].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => handleDigit(d)}
            className="h-14 sm:h-16 rounded-xl bg-[#1C1C1E] hover:bg-[#2C2C2E] active:bg-[#3A3A3C] text-white font-mono font-black text-2xl border border-zinc-800 active:border-zinc-500 transition-all flex items-center justify-center cursor-pointer shadow-md"
          >
            {d}
          </button>
        ))}

        {/* Row 3: 7 8 9 */}
        {['7', '8', '9'].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => handleDigit(d)}
            className="h-14 sm:h-16 rounded-xl bg-[#1C1C1E] hover:bg-[#2C2C2E] active:bg-[#3A3A3C] text-white font-mono font-black text-2xl border border-zinc-800 active:border-zinc-500 transition-all flex items-center justify-center cursor-pointer shadow-md"
          >
            {d}
          </button>
        ))}

        {/* Row 4: . 0 ⌫ */}
        <button
          type="button"
          onClick={handleDecimal}
          disabled={!allowDecimals}
          className="h-14 sm:h-16 rounded-xl bg-[#1C1C1E] hover:bg-[#2C2C2E] active:bg-[#3A3A3C] text-white font-mono font-black text-2xl border border-zinc-800 active:border-zinc-500 transition-all flex items-center justify-center cursor-pointer shadow-md disabled:opacity-30"
        >
          .
        </button>

        <button
          type="button"
          onClick={() => handleDigit('0')}
          className="h-14 sm:h-16 rounded-xl bg-[#1C1C1E] hover:bg-[#2C2C2E] active:bg-[#3A3A3C] text-white font-mono font-black text-2xl border border-zinc-800 active:border-zinc-500 transition-all flex items-center justify-center cursor-pointer shadow-md"
        >
          0
        </button>

        <button
          type="button"
          onClick={handleBackspace}
          aria-label="Backspace"
          className="h-14 sm:h-16 rounded-xl bg-[#252528] hover:bg-[#323236] active:bg-rose-900/60 text-zinc-300 hover:text-white border border-zinc-800 active:border-rose-500 transition-all flex items-center justify-center cursor-pointer shadow-md"
        >
          <Delete className="w-6 h-6" />
        </button>
      </div>

      {/* Row 5: Action Buttons [CLEAR] [ENTER] */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        <button
          type="button"
          onClick={handleClear}
          className="h-12 sm:h-13 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-zinc-300 hover:text-white font-black text-xs uppercase tracking-wider border border-zinc-700 transition-colors flex items-center justify-center space-x-1.5 cursor-pointer shadow-md"
        >
          <RotateCcw className="w-4 h-4" />
          <span>CLEAR</span>
        </button>

        <button
          type="button"
          onClick={handleEnter}
          disabled={enterDisabled}
          className="h-12 sm:h-13 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-black font-black text-xs uppercase tracking-wider transition-colors flex items-center justify-center space-x-1.5 cursor-pointer shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Check className="w-4 h-4 stroke-[3]" />
          <span>{enterLabel}</span>
        </button>
      </div>
    </div>
  );
};
