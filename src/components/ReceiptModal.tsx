import React, { useState, useRef } from 'react';
import { Order, StoreSettings } from '../types';
import { playBeep } from '../utils/audio';
import { posBridge } from '../services/posBridge';
import {
  Printer,
  Mail,
  Check,
  CheckCircle2,
  Share2,
  X,
  Store,
  Sparkles,
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
  const [emailInput, setEmailInput] = useState<string>(order?.customerPhone ? `${order.customerName?.toLowerCase().replace(/\s+/g, '.')}@example.com` : '');
  const [emailSent, setEmailSent] = useState<boolean>(false);
  const [isSendingEmail, setIsSendingEmail] = useState<boolean>(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !order) return null;

  const handlePrint = () => {
    playBeep('click');
    posBridge.printReceipt(order, settings);
    window.print();
  };

  const handleSendEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput) return;
    setIsSendingEmail(true);
    setTimeout(() => {
      setIsSendingEmail(false);
      setEmailSent(true);
      playBeep('success');
    }, 600);
  };

  const formattedDate = new Date(order.createdAt).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 select-none overflow-y-auto">
      <div className="bg-[#0F0F0F] border border-[#262626] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden text-[#E5E5E5] animate-in fade-in zoom-in-95 duration-150 my-auto flex flex-col">
        {/* Header toolbar */}
        <div className="bg-[#0A0A0A] px-5 py-3.5 border-b border-[#262626] flex items-center justify-between">
          <div className="flex items-center space-x-2 text-[#C5A059] font-bold text-sm uppercase tracking-wider">
            <CheckCircle2 className="w-4 h-4" />
            <span>Transaction Completed</span>
          </div>
          <button
            onClick={onClose}
            className="text-[#737373] hover:text-white p-1 rounded cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable Thermal Receipt Canvas (CA-08) */}
        <div className="p-5 bg-[#0A0A0A] flex-1 overflow-y-auto max-h-[60vh]">
          <div
            ref={receiptRef}
            id="thermal-receipt"
            className="bg-white text-slate-900 p-6 rounded-lg font-mono text-xs shadow-md border border-slate-200 mx-auto max-w-[320px] print:m-0 print:p-0 print:border-none print:shadow-none"
          >
            {/* Store Branding */}
            <div className="text-center space-y-1 mb-4">
              <div className="font-bold text-sm uppercase tracking-wider text-slate-950">
                {settings?.storeName || '377 Spirits'}
              </div>
              <div className="text-[10px] text-slate-600">{settings?.tagline}</div>
              <div className="text-[10px] text-slate-600">{settings?.address || 'Granbury, TX 76049'}</div>
              <div className="text-[10px] text-slate-600">
                {settings?.cityStateZip || (settings?.city && settings?.state ? `${settings.city}, ${settings.state} ${settings.zip || ''}`.trim() : 'Granbury, TX 76049')} • {settings?.phone || '(817) 555-0377'}
              </div>
              <div className="text-[10px] text-slate-500">Tax ID: {settings?.taxId}</div>
            </div>

            {/* Receipt Metadata */}
            <div className="border-t border-b border-dashed border-slate-400 py-2 my-2 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>ORDER:</span>
                <span className="font-bold">{order.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>DATE:</span>
                <span>{formattedDate}</span>
              </div>
              <div className="flex justify-between">
                <span>CASHIER:</span>
                <span>{order.cashierName}</span>
              </div>
              {order.customerName && (
                <div className="flex justify-between">
                  <span>CUSTOMER:</span>
                  <span>{order.customerName}</span>
                </div>
              )}
            </div>

            {/* Line Items */}
            <div className="py-2 space-y-2 border-b border-dashed border-slate-400">
              <div className="flex justify-between font-bold text-[10px] text-slate-700">
                <span>ITEM</span>
                <span>TOTAL</span>
              </div>
              {order.items.map((item, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="flex justify-between font-semibold">
                    <span className="truncate max-w-[180px]">{item.product.name}</span>
                    <span>${(((item.unitPrice ?? 0) * item.quantity) - (item.discountAmount ?? 0)).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>
                      {item.quantity} x ${(item.unitPrice ?? 0).toFixed(2)} ({item.product.size})
                    </span>
                    {(item.discountAmount ?? 0) > 0 && (
                      <span className="text-emerald-700 font-medium">
                        Disc -${(item.discountAmount ?? 0).toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Financials Breakdown */}
            <div className="py-2 space-y-1 text-[11px] border-b border-dashed border-slate-400">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>${(order.subtotal ?? 0).toFixed(2)}</span>
              </div>
              {(order.discountTotal ?? 0) > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Total Discount:</span>
                  <span>-${(order.discountTotal ?? 0).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Sales Tax:</span>
                <span>${(order.taxTotal ?? 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-sm pt-1 text-slate-950">
                <span>TOTAL:</span>
                <span>${(order.grandTotal ?? 0).toFixed(2)}</span>
              </div>
            </div>

            {/* Loyalty Rewards Breakdown on Receipt */}
            {(order.pointsEarned !== undefined || (order.pointsRedeemed !== undefined && order.pointsRedeemed > 0) || order.customerLoyaltyBalance !== undefined) && (
              <div className="py-2 border-b border-dashed border-slate-400 space-y-1 text-[11px]">
                <div className="font-bold text-[10px] text-amber-900 uppercase tracking-wider flex justify-between">
                  <span>★ LOYALTY REWARDS</span>
                  {order.customerLoyaltyBalance !== undefined && (
                    <span>BAL: {order.customerLoyaltyBalance} PTS</span>
                  )}
                </div>
                {order.pointsRedeemed && order.pointsRedeemed > 0 ? (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>Points Redeemed:</span>
                    <span>-{order.pointsRedeemed} pts (-${((order.pointsDiscountAmount || 0)).toFixed(2)})</span>
                  </div>
                ) : null}
                {order.pointsEarned && order.pointsEarned > 0 ? (
                  <div className="flex justify-between text-amber-800 font-bold">
                    <span>Points Earned Today:</span>
                    <span>+{order.pointsEarned} pts</span>
                  </div>
                ) : null}
              </div>
            )}

            {/* Payment Summary */}
            <div className="py-2 space-y-1 text-[10px]">
              <div className="flex justify-between">
                <span>PAYMENT METHOD:</span>
                <span className="uppercase font-bold">
                  {order.payment.method === 'split'
                    ? (order.payment.splitDetails?.splitType === 'two_cards' ? 'SPLIT (2 CARDS)' : 'SPLIT (CASH + CARD)')
                    : order.payment.method}
                </span>
              </div>
              {order.payment.method === 'cash' ? (
                <>
                  {order.payment.cashEntries && order.payment.cashEntries.length > 1 ? (
                    <div className="py-1 border-y border-dashed border-slate-300 my-1 space-y-0.5">
                      <div className="font-bold text-[9px] text-slate-600 uppercase">Cash Tenders ({order.payment.cashEntries.length})</div>
                      {order.payment.cashEntries.map((c, i) => (
                        <div key={c.id || i} className="flex justify-between text-[9px] text-slate-700">
                          <span>Tender #{i + 1} ({c.time}):</span>
                          <span>+${c.amount.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <div className="flex justify-between">
                    <span>CASH TENDERED:</span>
                    <span>${((order.payment.cashTendered || order.grandTotal || 0)).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>CHANGE DUE:</span>
                    <span>${((order.payment.changeDue || 0)).toFixed(2)}</span>
                  </div>
                </>
              ) : order.payment.method === 'split' ? (
                order.payment.splitDetails?.splitType === 'two_cards' ? (
                  <>
                    <div className="flex justify-between">
                      <span>CARD 1 ({order.payment.splitDetails?.card1Brand || 'Card'} ****{order.payment.splitDetails?.card1Last4 || '1029'}):</span>
                      <span>${((order.payment.splitDetails?.card1Amount || 0)).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[9px] text-slate-500">
                      <span>AUTH 1:</span>
                      <span>{order.payment.splitDetails?.card1Auth || 'APX1-98231'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>CARD 2 ({order.payment.splitDetails?.card2Brand || 'Card'} ****{order.payment.splitDetails?.card2Last4 || '8841'}):</span>
                      <span>${((order.payment.splitDetails?.card2Amount || 0)).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[9px] text-slate-500">
                      <span>AUTH 2:</span>
                      <span>{order.payment.splitDetails?.card2Auth || 'APX2-44120'}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span>CASH PORTION:</span>
                      <span>${((order.payment.splitDetails?.cashAmount || 0)).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>CARD PORTION:</span>
                      <span>${((order.payment.splitDetails?.cardAmount || 0)).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[9px] text-slate-500">
                      <span>AUTH CODE:</span>
                      <span>{order.payment.authCode || 'SPL-92811'}</span>
                    </div>
                  </>
                )
              ) : (
                <>
                  <div className="flex justify-between">
                    <span>CARD:</span>
                    <span>{order.payment.cardBrand} **** {order.payment.cardLast4}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>AUTH CODE:</span>
                    <span>{order.payment.authCode}</span>
                  </div>
                </>
              )}
            </div>

            {/* Barcode representation */}
            <div className="text-center pt-3 border-t border-dashed border-slate-400 space-y-1">
              <div className="h-8 bg-slate-900 mx-auto w-40 flex items-center justify-center text-[10px] text-white tracking-[6px] font-mono">
                ||||||||||||||||||||
              </div>
              <div className="text-[9px] text-slate-600">{order.orderNumber}</div>
              <div className="text-[9px] text-slate-600 italic pt-2">
                {settings?.receiptFooter || 'Thank you for shopping! Please drink responsibly.'}
              </div>
            </div>
          </div>
        </div>

        {/* Email & Print Actions */}
        <div className="p-4 bg-[#141414] border-t border-[#262626] space-y-3">
          {/* Email input form */}
          <form onSubmit={handleSendEmail} className="flex gap-2">
            <input
              id="receipt-email-input"
              type="email"
              placeholder="customer@example.com"
              value={emailInput}
              onChange={e => setEmailInput(e.target.value)}
              className="flex-1 bg-[#1A1A1A] border border-[#262626] rounded-lg px-3 py-1.5 text-xs text-[#E5E5E5] placeholder:text-[#666666] focus:border-[#C5A059] focus:outline-hidden"
            />
            <button
              id="receipt-send-email-btn"
              type="submit"
              disabled={isSendingEmail || emailSent}
              className="px-3.5 py-1.5 rounded-lg bg-[#1A1A1A] hover:bg-[#262626] text-[#E5E5E5] text-xs font-bold uppercase tracking-wider border border-[#262626] flex items-center space-x-1.5 cursor-pointer transition-colors"
            >
              {emailSent ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Mail className="w-3.5 h-3.5 text-[#C5A059]" />}
              <span>{emailSent ? 'Sent!' : isSendingEmail ? 'Sending...' : 'Email'}</span>
            </button>
          </form>

          <div className="grid grid-cols-2 gap-2">
            <button
              id="receipt-print-btn"
              onClick={handlePrint}
              className="py-2.5 rounded-lg bg-[#1A1A1A] hover:bg-[#262626] text-[#E5E5E5] text-xs font-bold uppercase tracking-wider border border-[#262626] flex items-center justify-center space-x-2 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4 text-[#C5A059]" />
              <span>Print Receipt</span>
            </button>

            <button
              id="receipt-new-sale-btn"
              onClick={onStartNewSale}
              className="py-2.5 rounded-lg bg-[#C5A059] hover:bg-[#D4B06A] text-black text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-2 transition-colors cursor-pointer shadow-md"
            >
              <Sparkles className="w-4 h-4 text-black" />
              <span>New Sale</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
