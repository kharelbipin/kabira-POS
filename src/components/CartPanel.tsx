import React, { useState } from 'react';
import { CartItem, Customer, StoreSettings } from '../types';
import { playBeep } from '../utils/audio';
import {
  Trash2,
  Plus,
  Minus,
  Tag,
  UserPlus,
  UserCheck,
  PauseCircle,
  RotateCcw,
  CheckCircle2,
  X,
  Percent,
  DollarSign,
  AlertCircle,
  ShoppingCart,
  Receipt,
  Layers,
  MoreVertical,
} from 'lucide-react';

interface CartPanelProps {
  items: CartItem[];
  onUpdateQuantity: (productId: string, delta: number) => void;
  onSetQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  selectedCustomer: Customer | null;
  onOpenCustomerModal: () => void;
  onRemoveCustomer: () => void;
  orderDiscountPercent: number;
  orderDiscountAmount: number;
  onApplyOrderDiscount: (percent: number, amount: number, promoCode?: string) => void;
  onOpenItemDiscount: (item: CartItem) => void;
  onHoldOrder: () => void;
  onOpenHeldOrders: () => void;
  heldOrdersCount: number;
  onProceedToCheckout: () => void;
  settings: StoreSettings | null;
  onOpenDrawer?: () => void;
  onPrintLastReceipt?: () => void;
}

export const CartPanel: React.FC<CartPanelProps> = ({
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  selectedCustomer,
  onOpenCustomerModal,
  onRemoveCustomer,
  orderDiscountPercent,
  orderDiscountAmount,
  onApplyOrderDiscount,
  onOpenItemDiscount,
  onHoldOrder,
  onOpenHeldOrders,
  heldOrdersCount,
  onProceedToCheckout,
  settings,
  onOpenDrawer,
  onPrintLastReceipt,
}) => {
  const [showDiscountModal, setShowDiscountModal] = useState<boolean>(false);
  const [discountType, setDiscountType] = useState<'percent' | 'amount' | 'promo'>('percent');
  const [discountVal, setDiscountVal] = useState<string>('10');
  const [promoCodeInput, setPromoCodeInput] = useState<string>('');
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);

  // Financial calculations
  const rawSubtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const itemDiscountsTotal = items.reduce((sum, item) => sum + item.discountAmount, 0);
  const adjustedSubtotal = Math.max(0, rawSubtotal - itemDiscountsTotal);

  let calculatedOrderDiscount = 0;
  if (orderDiscountPercent > 0) {
    calculatedOrderDiscount = (adjustedSubtotal * orderDiscountPercent) / 100;
  } else if (orderDiscountAmount > 0) {
    calculatedOrderDiscount = Math.min(adjustedSubtotal, orderDiscountAmount);
  }

  const subtotalAfterDiscounts = Math.max(0, adjustedSubtotal - calculatedOrderDiscount);
  const taxRate = settings?.defaultTaxRate ?? 0.0825;
  const taxTotal = subtotalAfterDiscounts * taxRate;
  const grandTotal = subtotalAfterDiscounts + taxTotal;

  const handleApplyDiscountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (discountType === 'percent') {
      const p = parseFloat(discountVal) || 0;
      onApplyOrderDiscount(p, 0);
    } else if (discountType === 'amount') {
      const a = parseFloat(discountVal) || 0;
      onApplyOrderDiscount(0, a);
    } else if (discountType === 'promo') {
      const code = promoCodeInput.trim().toUpperCase();
      if (code === 'HAPPYHOUR15') {
        onApplyOrderDiscount(15, 0, code);
      } else if (code === 'VIP20') {
        onApplyOrderDiscount(20, 0, code);
      } else if (code === 'STAFF10') {
        onApplyOrderDiscount(10, 0, code);
      } else if (code === 'FIVE5') {
        onApplyOrderDiscount(0, 5, code);
      } else {
        alert('Invalid promo code. Try HAPPYHOUR15, VIP20, or FIVE5');
        return;
      }
    }
    setShowDiscountModal(false);
  };

  const totalItemsCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div className="flex flex-col h-full bg-white text-slate-800 select-none shadow-xs border-l border-slate-200">
      {/* Top Header matching user mockup */}
      <div className="p-3.5 border-b border-slate-200 bg-white flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h2 className="font-bold text-sm text-slate-900 tracking-tight">Current Order</h2>
          <span className="text-[11px] text-slate-400 font-mono">#TXN-00001</span>
        </div>

        {/* Customer Attachment / Options */}
        <div className="flex items-center space-x-2">
          {selectedCustomer ? (
            <div className="flex items-center space-x-1.5 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
              <UserCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="text-xs font-bold text-slate-800 truncate max-w-[100px]">
                {selectedCustomer.name}
              </span>
              <button
                id="cart-remove-customer-btn"
                onClick={onRemoveCustomer}
                className="text-slate-400 hover:text-rose-500 p-0.5 rounded cursor-pointer"
                title="Detach customer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              id="cart-attach-customer-btn"
              onClick={onOpenCustomerModal}
              className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-200 transition-colors cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5 text-slate-600" />
              <span>Customer</span>
            </button>
          )}

          <button
            type="button"
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Clear Cart Confirmation Dialog */}
      {showClearConfirm && (
        <div className="p-3 bg-rose-50 border-b border-rose-200 text-rose-800 text-xs flex items-center justify-between animate-in fade-in">
          <span className="font-medium">Clear all {totalItemsCount} items from order?</span>
          <div className="flex space-x-1.5">
            <button
              id="cart-confirm-clear"
              onClick={() => {
                onClearCart();
                setShowClearConfirm(false);
              }}
              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] uppercase cursor-pointer"
            >
              Clear
            </button>
            <button
              id="cart-cancel-clear"
              onClick={() => setShowClearConfirm(false)}
              className="px-2.5 py-1 rounded-lg bg-white text-slate-700 text-[11px] uppercase font-semibold border border-slate-200 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
            <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-300">
              <ShoppingCart className="w-8 h-8" />
            </div>
            <p className="text-sm font-bold text-slate-700">No items in current order</p>
            <p className="text-xs text-slate-400 max-w-xs">
              Scan a product, tap an item, or use the buttons above to add items to the cart.
            </p>
          </div>
        ) : (
          items.map(item => (
            <div
              key={item.product.id}
              className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col gap-2 group transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-slate-900 truncate leading-tight">
                    {item.product.name}
                  </h4>
                  <div className="flex items-center space-x-1.5 text-[11px] text-slate-500 mt-0.5 font-medium">
                    <span>${(item.unitPrice ?? 0).toFixed(2)}</span>
                    <span>•</span>
                    <span>{item.product.size}</span>
                  </div>
                  {(item.discountAmount ?? 0) > 0 && (
                    <div className="text-[10px] text-emerald-600 font-bold mt-0.5 flex items-center space-x-1">
                      <Tag className="w-2.5 h-2.5" />
                      <span>Discount: -${(item.discountAmount ?? 0).toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <div className="text-xs font-black text-slate-900 font-mono">
                    ${(((item.unitPrice ?? 0) * item.quantity) - (item.discountAmount ?? 0)).toFixed(2)}
                  </div>
                  <button
                    id={`cart-item-discount-${item.product.id}`}
                    onClick={() => onOpenItemDiscount(item)}
                    className="text-[10px] text-amber-700 hover:underline block mt-0.5 cursor-pointer uppercase font-bold"
                  >
                    {item.discountAmount > 0 ? 'Edit Disc' : 'Add Disc'}
                  </button>
                </div>
              </div>

              {/* Stepper & Remove */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                <button
                  id={`cart-item-remove-${item.product.id}`}
                  onClick={() => onRemoveItem(item.product.id)}
                  className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                  title="Remove item"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                <div className="flex items-center gap-2">
                  <button
                    id={`cart-item-minus-${item.product.id}`}
                    onClick={() => onUpdateQuantity(item.product.id, -1)}
                    className="w-6 h-6 border border-slate-200 rounded-lg flex items-center justify-center bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer active:scale-95"
                  >
                    -
                  </button>

                  <span className="w-6 text-center text-xs font-bold font-mono text-slate-900">
                    {item.quantity}
                  </span>

                  <button
                    id={`cart-item-plus-${item.product.id}`}
                    onClick={() => onUpdateQuantity(item.product.id, 1)}
                    className="w-6 h-6 border border-slate-200 rounded-lg flex items-center justify-center bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer active:scale-95"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Cart Summary & Financials */}
      <div className="p-4 bg-[#F8FAFC] border-t border-slate-200 flex flex-col gap-2 shrink-0">
        <div className="flex justify-between text-xs text-slate-600 font-medium">
          <span>Subtotal ({totalItemsCount} items)</span>
          <span className="font-mono text-slate-900 font-bold">${(rawSubtotal ?? 0).toFixed(2)}</span>
        </div>

        {((calculatedOrderDiscount ?? 0) > 0 || (itemDiscountsTotal ?? 0) > 0) && (
          <div className="flex justify-between text-xs text-emerald-700 font-bold">
            <span>Discounts Applied</span>
            <span className="font-mono">
              -${((calculatedOrderDiscount ?? 0) + (itemDiscountsTotal ?? 0)).toFixed(2)}
            </span>
          </div>
        )}

        <div className="flex justify-between text-xs text-slate-600 font-medium">
          <span>Tax ({((taxRate ?? 0) * 100).toFixed(2)}%)</span>
          <span className="font-mono text-slate-900 font-bold">${(taxTotal ?? 0).toFixed(2)}</span>
        </div>

        <div className="flex justify-between items-center pt-2 border-t border-slate-200">
          <div>
            <span className="text-sm font-black text-slate-900 uppercase tracking-tight">Total</span>
            <span className="text-[10px] text-slate-400 ml-1.5 uppercase font-mono font-bold">USD</span>
          </div>
          <span className="text-2xl font-black text-slate-950 font-mono tracking-tight">
            ${(grandTotal ?? 0).toFixed(2)}
          </span>
        </div>

        {/* Big Complete Checkout Button (Matches Design HTML) */}
        <button
          id="cart-checkout-btn"
          onClick={onProceedToCheckout}
          disabled={items.length === 0}
          className="w-full py-3 mt-1 bg-[#F3C067] hover:bg-[#F59E0B] active:scale-[0.99] text-slate-950 font-black rounded-xl uppercase tracking-wider text-xs shadow-xs flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <CheckCircle2 className="w-4 h-4 text-slate-950" />
          <span>Complete Checkout (F9)</span>
        </button>

        {/* Sub Action Buttons */}
        <div className="flex gap-2">
          <button
            id="cart-discount-btn"
            onClick={() => setShowDiscountModal(true)}
            disabled={items.length === 0}
            className="flex-1 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl text-[11px] font-bold text-slate-700 transition-colors disabled:opacity-40 cursor-pointer text-center"
          >
            % Discount
          </button>

          <button
            id="cart-hold-btn"
            onClick={onHoldOrder}
            disabled={items.length === 0}
            className="flex-1 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl text-[11px] font-bold text-slate-700 transition-colors disabled:opacity-40 cursor-pointer text-center"
            title="Hold current order (CA-09)"
          >
            ⏸ Hold Order
          </button>

          <button
            id="cart-quick-clear-btn"
            onClick={() => setShowClearConfirm(true)}
            disabled={items.length === 0}
            className="py-1.5 px-3 border border-rose-200 bg-white hover:bg-rose-50 rounded-xl text-[11px] font-bold text-rose-600 transition-colors disabled:opacity-40 cursor-pointer"
            title="Clear"
          >
            🗑 Clear
          </button>
        </div>

        {/* Hardware shortcuts bottom row matching mockup */}
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/70">
          <button
            type="button"
            onClick={() => {
              playBeep('click');
              if (onOpenDrawer) onOpenDrawer();
              else alert('Cash Drawer kick signal sent to Epson TM-T88VII.');
            }}
            className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-bold border border-slate-200 transition-colors cursor-pointer text-center"
          >
            🗄 Open Drawer (F8)
          </button>
          <button
            type="button"
            onClick={() => {
              playBeep('click');
              if (onPrintLastReceipt) onPrintLastReceipt();
              else alert('Reprinting last completed customer receipt...');
            }}
            className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-bold border border-slate-200 transition-colors cursor-pointer text-center"
          >
            🧾 Last Receipt
          </button>
        </div>
      </div>

      {/* Order Discount Modal */}
      {showDiscountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-3.5 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-black text-sm text-slate-900">Apply Order Discount</h3>
              <button
                onClick={() => setShowDiscountModal(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleApplyDiscountSubmit} className="p-5 space-y-4">
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                <button
                  type="button"
                  id="disc-type-percent"
                  onClick={() => setDiscountType('percent')}
                  className={`flex-1 py-1.5 font-bold uppercase tracking-wider rounded-lg text-[10px] ${
                    discountType === 'percent' ? 'bg-amber-400 text-slate-950 font-black shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Percentage (%)
                </button>
                <button
                  type="button"
                  id="disc-type-amount"
                  onClick={() => setDiscountType('amount')}
                  className={`flex-1 py-1.5 font-bold uppercase tracking-wider rounded-lg text-[10px] ${
                    discountType === 'amount' ? 'bg-amber-400 text-slate-950 font-black shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Dollar ($)
                </button>
                <button
                  type="button"
                  id="disc-type-promo"
                  onClick={() => setDiscountType('promo')}
                  className={`flex-1 py-1.5 font-bold uppercase tracking-wider rounded-lg text-[10px] ${
                    discountType === 'promo' ? 'bg-amber-400 text-slate-950 font-black shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Promo Code
                </button>
              </div>

              {discountType === 'promo' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Enter Promotional Code</label>
                  <input
                    id="discount-promo-input"
                    type="text"
                    value={promoCodeInput}
                    onChange={e => setPromoCodeInput(e.target.value)}
                    placeholder="e.g. HAPPYHOUR15, VIP20"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 uppercase focus:border-amber-400 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Available demo codes: HAPPYHOUR15, VIP20, FIVE5</p>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {discountType === 'percent' ? 'Discount Percentage (%)' : 'Discount Dollar Amount ($)'}
                  </label>
                  <div className="relative">
                    {discountType === 'percent' ? (
                      <Percent className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    ) : (
                      <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    )}
                    <input
                      id="discount-value-input"
                      type="number"
                      step={discountType === 'percent' ? '1' : '0.01'}
                      min="0"
                      max={discountType === 'percent' ? '100' : '1000'}
                      value={discountVal}
                      onChange={e => setDiscountVal(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 focus:border-amber-400 focus:outline-none font-mono"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onApplyOrderDiscount(0, 0);
                    setShowDiscountModal(false);
                  }}
                  className="px-3 py-1.5 text-xs text-rose-600 hover:bg-slate-100 rounded-xl cursor-pointer uppercase font-bold"
                >
                  Remove
                </button>
                <button
                  type="submit"
                  id="discount-apply-submit"
                  className="px-4 py-1.5 text-xs font-black uppercase rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 cursor-pointer shadow-xs"
                >
                  Apply to Cart
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
