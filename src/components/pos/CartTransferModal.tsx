import React, { useState } from 'react';
import { api } from '../../utils/api';
import { playBeep } from '../../utils/audio';
import { Product, CartItem } from '../../types';
import { QrCode, Scan, ArrowRight, CheckCircle2, AlertCircle, RefreshCw, X, ShoppingCart, Smartphone } from 'lucide-react';

interface CartTransferModalProps {
  onClose: () => void;
  onImportCart: (items: CartItem[], customerInfo?: { name?: string; phone?: string }) => void;
  products: Product[];
  currentCartItems: CartItem[];
}

export const CartTransferModal: React.FC<CartTransferModalProps> = ({
  onClose,
  onImportCart,
  products,
  currentCartItems,
}) => {
  const [mode, setMode] = useState<'scan' | 'generate'>('scan');
  const [transferCodeInput, setTransferCodeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successTransfer, setSuccessTransfer] = useState<any | null>(null);

  // For Generate Mode
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [generatedTransfer, setGeneratedTransfer] = useState<any | null>(null);

  // Claim transfer code
  const handleLookupAndClaim = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!transferCodeInput.trim()) return;

    setLoading(true);
    setError(null);
    try {
      // 1. Claim cart transfer on server
      const res = await api.claimCartTransfer(transferCodeInput.trim(), 'reg-1');
      const transfer = res.transfer;

      // 2. Map items to local cart items with current product metadata
      const mappedItems: CartItem[] = transfer.items.map((item: any) => {
        const prod = products.find(p => p.id === item.productId || p.id === item.product?.id);
        const effectiveProd = prod || item.product;
        const price = effectiveProd?.price || item.unitPrice || 0;
        const qty = item.quantity || 1;
        const tax = price * qty * (effectiveProd?.taxRate || 0.0825);
        return {
          product: effectiveProd,
          quantity: qty,
          unitPrice: price,
          taxAmount: Math.round(tax * 100) / 100,
          lineTotal: Math.round((price * qty + tax) * 100) / 100,
        };
      });

      playBeep('success');
      setSuccessTransfer(transfer);
      onImportCart(mappedItems, { name: transfer.customerName, phone: transfer.customerPhone });
    } catch (err: any) {
      playBeep('error');
      setError(err.message || 'Cart transfer code not found or expired');
    } finally {
      setLoading(false);
    }
  };

  // Generate transfer code from current cart
  const handleGenerateCode = async () => {
    if (currentCartItems.length === 0) {
      setError('Current POS cart is empty. Add items first to create a mobile transfer code.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const itemsPayload = currentCartItems.map(item => ({
        productId: item.product.id,
        productName: item.product.name,
        sku: item.product.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
      }));

      const res = await api.createCartTransfer({
        items: itemsPayload,
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        sourceChannel: 'pos',
        destinationRegisterId: 'mobile_queue',
      });

      playBeep('success');
      setGeneratedTransfer(res.transfer);
    } catch (err: any) {
      playBeep('error');
      setError(err.message || 'Failed to generate transfer code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 select-none animate-in fade-in">
      <div className="bg-[#111111] border border-[#262626] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden text-[#E5E5E5] flex flex-col">
        {/* Header */}
        <div className="bg-[#161616] px-6 py-4 border-b border-[#262626] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <QrCode className="w-5 h-5 text-[#C5A059]" />
            <div>
              <h3 className="font-serif italic font-bold text-base text-[#F5F5F5]">
                Omnichannel Cart Transfer (US-013 & US-014)
              </h3>
              <p className="text-[11px] text-[#888888]">
                Transfer carts seamlessly between mobile queue-busters and registers
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#737373] hover:text-white rounded-lg hover:bg-[#222222] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch: Scan / Import vs. Export */}
        <div className="flex border-b border-[#262626] bg-[#0E0E0E]">
          <button
            onClick={() => {
              setMode('scan');
              setError(null);
            }}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors ${
              mode === 'scan'
                ? 'text-[#C5A059] border-b-2 border-[#C5A059] bg-[#141414]'
                : 'text-[#737373] hover:text-[#E5E5E5]'
            }`}
          >
            Import Mobile Cart
          </button>
          <button
            onClick={() => {
              setMode('generate');
              setError(null);
            }}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors ${
              mode === 'generate'
                ? 'text-[#C5A059] border-b-2 border-[#C5A059] bg-[#141414]'
                : 'text-[#737373] hover:text-[#E5E5E5]'
            }`}
          >
            Generate Transfer QR
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-red-300 text-xs flex items-center space-x-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {successTransfer && (
            <div className="p-4 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-emerald-200 text-xs space-y-2 animate-in fade-in">
              <div className="flex items-center space-x-2 font-bold text-emerald-400">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Successfully Imported Cart {successTransfer.transferCode}!</span>
              </div>
              <p className="text-[11px] text-[#A3A3A3]">
                {successTransfer.items.length} items loaded into the register. Customer: {successTransfer.customerName || 'Walk-in'}.
              </p>
              <button
                onClick={onClose}
                className="w-full mt-2 py-2 bg-emerald-500 hover:bg-emerald-600 text-black font-bold uppercase text-xs rounded-lg transition-colors cursor-pointer"
              >
                Proceed to Checkout
              </button>
            </div>
          )}

          {mode === 'scan' && !successTransfer && (
            <form onSubmit={handleLookupAndClaim} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#A3A3A3] uppercase tracking-wider mb-2">
                  Enter or Scan Transfer Code (e.g. CART-5421)
                </label>
                <div className="relative">
                  <Scan className="w-4 h-4 text-[#737373] absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={transferCodeInput}
                    onChange={e => setTransferCodeInput(e.target.value.toUpperCase())}
                    placeholder="CART-XXXX or scan QR barcode"
                    autoFocus
                    className="w-full bg-[#181818] border border-[#2E2E2E] rounded-xl pl-10 pr-4 py-2.5 font-mono text-sm text-[#F5F5F5] placeholder:text-[#555555] focus:outline-hidden focus:border-[#C5A059]"
                  />
                </div>
              </div>

              <div className="p-3 bg-[#161616] rounded-xl border border-[#242424] text-[11px] text-[#888888] space-y-1">
                <div className="font-semibold text-[#E5E5E5] flex items-center space-x-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-[#C5A059]" />
                  <span>How Queue-Busting Works:</span>
                </div>
                <p>
                  Floor associates scan bottles with a phone or tablet for customers waiting in line, tap "Complete Prepared Cart", and hand or display the transfer code to the customer. When the customer reaches register #1, scan or type that code to claim the cart instantly.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || !transferCodeInput.trim()}
                className="w-full py-3 rounded-xl bg-[#C5A059] hover:bg-[#D4AF65] text-black font-bold uppercase tracking-wider text-xs flex items-center justify-center space-x-2 transition-transform active:scale-98 disabled:opacity-50 cursor-pointer shadow-md"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                <span>Import Prepared Cart</span>
              </button>
            </form>
          )}

          {mode === 'generate' && (
            <div className="space-y-4">
              {generatedTransfer ? (
                <div className="bg-[#161616] p-4 rounded-xl border border-[#262626] text-center space-y-3">
                  <div className="text-xs text-[#888888] uppercase font-bold tracking-wider">
                    Scan or Enter on Any Terminal:
                  </div>
                  <div className="font-mono text-3xl font-black text-[#C5A059] tracking-widest bg-[#0F0F0F] py-3 rounded-xl border border-[#2A2A2A]">
                    {generatedTransfer.transferCode}
                  </div>
                  <div className="text-xs text-[#A3A3A3]">
                    QR Data: <span className="font-mono text-[10px] text-[#737373]">{generatedTransfer.qrData}</span>
                  </div>
                  <p className="text-[11px] text-emerald-400">
                    Cart transferred with {generatedTransfer.items.length} items (${generatedTransfer.subtotal.toFixed(2)} subtotal). Valid for 1 hour.
                  </p>
                  <button
                    onClick={() => setGeneratedTransfer(null)}
                    className="px-4 py-2 bg-[#222222] hover:bg-[#2A2A2A] text-white text-xs font-bold uppercase rounded-lg transition-colors cursor-pointer"
                  >
                    Generate Another
                  </button>
                </div>
              ) : (
                <div className="space-y-3 text-xs">
                  <div className="bg-[#161616] p-3 rounded-xl border border-[#262626] flex items-center justify-between">
                    <span className="text-[#888888]">Current Register Cart:</span>
                    <span className="font-bold text-[#F5F5F5] font-mono">{currentCartItems.length} items</span>
                  </div>

                  <div>
                    <label className="block text-[#A3A3A3] font-bold uppercase tracking-wider mb-1">
                      Customer Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                      placeholder="e.g. John Smith"
                      className="w-full bg-[#181818] border border-[#262626] rounded-lg p-2 text-[#E5E5E5] focus:outline-hidden focus:border-[#C5A059]"
                    />
                  </div>

                  <div>
                    <label className="block text-[#A3A3A3] font-bold uppercase tracking-wider mb-1">
                      Customer Phone (Optional)
                    </label>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={e => setCustomerPhone(e.target.value)}
                      placeholder="e.g. (555) 234-5678"
                      className="w-full bg-[#181818] border border-[#262626] rounded-lg p-2 text-[#E5E5E5] focus:outline-hidden focus:border-[#C5A059]"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleGenerateCode}
                    disabled={loading || currentCartItems.length === 0}
                    className="w-full py-3 rounded-xl bg-[#C5A059] hover:bg-[#D4AF65] text-black font-bold uppercase tracking-wider text-xs flex items-center justify-center space-x-2 transition-transform active:scale-98 disabled:opacity-50 cursor-pointer shadow-md mt-2"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
                    <span>Generate Transfer Code</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
