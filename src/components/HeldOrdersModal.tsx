import React from 'react';
import { HeldOrder } from '../types';
import { playBeep } from '../utils/audio';
import { PauseCircle, PlayCircle, Trash2, X, Clock, User, ShoppingBag } from 'lucide-react';

interface HeldOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  heldOrders: HeldOrder[];
  onResumeOrder: (heldOrder: HeldOrder) => void;
  onDeleteHeldOrder: (id: string) => void;
}

export const HeldOrdersModal: React.FC<HeldOrdersModalProps> = ({
  isOpen,
  onClose,
  heldOrders,
  onResumeOrder,
  onDeleteHeldOrder,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 select-none">
      <div className="bg-[#0F0F0F] border border-[#262626] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden text-[#E5E5E5] animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="bg-[#0A0A0A] px-6 py-4 border-b border-[#262626] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <PauseCircle className="w-5 h-5 text-[#C5A059]" />
            <div>
              <h2 className="text-lg font-bold font-serif italic text-[#F5F5F5]">Held Orders Queue</h2>
              <p className="text-xs text-[#737373] mt-0.5">{heldOrders.length} order(s) parked</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#737373] hover:text-white p-1 rounded cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List */}
        <div className="p-4 flex-1 overflow-y-auto space-y-3">
          {heldOrders.length === 0 ? (
            <div className="text-center py-12 text-[#737373]">
              <ShoppingBag className="w-10 h-10 mx-auto mb-2 text-[#404040]" />
              <p className="text-sm font-serif italic text-[#A3A3A3]">No held orders in queue</p>
              <p className="text-xs text-[#737373] mt-1 max-w-xs mx-auto">
                You can park an unfinished cart from the register anytime using the "Hold Order" button.
              </p>
            </div>
          ) : (
            heldOrders.map(ho => {
              const totalItems = ho.items.reduce((s, i) => s + (i.quantity ?? 0), 0);
              const totalEst = ho.items.reduce((s, i) => s + ((i.unitPrice ?? 0) * (i.quantity ?? 1)), 0);

              return (
                <div
                  key={ho.id}
                  className="bg-[#141414] border border-[#262626] hover:border-[#C5A059]/40 rounded-xl p-4 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-[#C5A059] text-sm">{ho.holdNumber}</span>
                        <span className="text-xs bg-[#1F1F1F] text-[#A3A3A3] px-2 py-0.5 rounded-md font-mono border border-[#262626]">
                          {totalItems} item(s)
                        </span>
                      </div>

                      <div className="mt-2 space-y-1 text-xs text-[#737373]">
                        {ho.customer && (
                          <div className="flex items-center space-x-1.5 text-[#E5E5E5]">
                            <User className="w-3.5 h-3.5 text-[#C5A059]" />
                            <span className="font-medium">{ho.customer.name}</span>
                            <span className="text-[#737373]">({ho.customer.phone})</span>
                          </div>
                        )}
                        <div className="flex items-center space-x-1.5 text-[#737373]">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Held {new Date(ho.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          <span>• Cashier: {ho.cashierName}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-mono text-base font-bold text-[#C5A059]">
                        ~${(totalEst ?? 0).toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Items summary pill preview */}
                  <div className="mt-3 text-xs text-[#737373] bg-[#0A0A0A] p-2 rounded-lg truncate border border-[#262626]">
                    {ho.items.map(i => `${i.quantity}x ${i.product.name}`).join(', ')}
                  </div>

                  {/* Action buttons */}
                  <div className="mt-3 pt-3 border-t border-[#262626] flex justify-end space-x-2">
                    <button
                      id={`held-delete-${ho.id}`}
                      onClick={() => {
                        playBeep('click');
                        onDeleteHeldOrder(ho.id);
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider text-[#737373] hover:text-red-400 hover:bg-[#1F1F1F] transition-colors flex items-center space-x-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Discard</span>
                    </button>

                    <button
                      id={`held-resume-${ho.id}`}
                      onClick={() => {
                        playBeep('success');
                        onResumeOrder(ho);
                        onClose();
                      }}
                      className="px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-[#C5A059] hover:bg-[#D4B06A] text-black transition-colors flex items-center space-x-1.5 shadow-sm cursor-pointer"
                    >
                      <PlayCircle className="w-4 h-4 text-black" />
                      <span>Resume Checkout</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
