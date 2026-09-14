import React, { useState } from 'react';
import { ShieldAlert, X, DollarSign, AlertTriangle } from 'lucide-react';
import { CardFallbackMethod, StoreSettings, User } from '../../types';
import { CardPaymentFallbackManager } from './CardPaymentFallbackManager';

interface StandalonePaymentFallbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartGrandTotal: number;
  cartItemCount: number;
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
    amountPaid: number;
  }) => void;
}

export const StandalonePaymentFallbackModal: React.FC<StandalonePaymentFallbackModalProps> = ({
  isOpen,
  onClose,
  cartGrandTotal,
  cartItemCount,
  settings,
  currentUser,
  onPaymentSuccess,
}) => {
  const [customAmount, setCustomAmount] = useState<string>(
    cartGrandTotal > 0 ? cartGrandTotal.toFixed(2) : '25.00'
  );

  // Sync custom amount when cartGrandTotal changes if cart has items
  React.useEffect(() => {
    if (cartGrandTotal > 0) {
      setCustomAmount(cartGrandTotal.toFixed(2));
    }
  }, [cartGrandTotal]);

  if (!isOpen) return null;

  const numericAmount = parseFloat(customAmount) || 0;
  const activeOrderNumber = `ORD-${Date.now().toString().slice(-6)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 md:p-6 select-none overflow-y-auto">
      <div className="bg-[#121212] border border-[#2B2B2B] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#242424] bg-[#161616] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[#F5BD47] flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-serif italic font-bold text-base text-white tracking-wide">
                  Emergency Payment Fallback Center
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                  Separate Dedicated Menu
                </span>
              </div>
              <p className="text-xs text-[#888888]">
                Manual Card Entry • Customer QR Link • SMS Link • Offline Store & Forward
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#888888] hover:text-white hover:bg-[#222222] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Amount Bar */}
          <div className="bg-[#181818] border border-[#282828] rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs uppercase font-black text-[#777777] tracking-wider block">
                {cartItemCount > 0 ? `Current Cart Total (${cartItemCount} items)` : 'Emergency Charge Amount'}
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-2xl font-mono font-black text-[#F5BD47]">
                  ${numericAmount.toFixed(2)}
                </span>
                {cartItemCount > 0 && (
                  <span className="text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-md font-medium">
                    Linked to Register Cart
                  </span>
                )}
              </div>
            </div>

            {cartItemCount === 0 && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <label className="text-xs text-[#AAAAAA] uppercase font-bold shrink-0">Set Amount ($):</label>
                <div className="relative w-36">
                  <DollarSign className="w-3.5 h-3.5 text-[#888888] absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={customAmount}
                    onChange={e => setCustomAmount(e.target.value)}
                    className="w-full bg-[#121212] border border-[#333333] rounded-lg pl-7 pr-2.5 py-1.5 text-xs text-white font-mono font-bold focus:outline-none focus:border-[#F5BD47]"
                  />
                </div>
              </div>
            )}
          </div>

          {numericAmount <= 0 ? (
            <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-800/40 text-amber-300 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Please enter a valid payment amount greater than $0.00 to initiate fallback processing.</span>
            </div>
          ) : (
            <CardPaymentFallbackManager
              amountDue={numericAmount}
              orderNumber={activeOrderNumber}
              settings={settings}
              currentUser={currentUser}
              onPaymentSuccess={details => {
                onPaymentSuccess({
                  ...details,
                  amountPaid: numericAmount,
                });
                onClose();
              }}
              onCancel={onClose}
            />
          )}
        </div>
      </div>
    </div>
  );
};
