import React, { useState, useMemo } from 'react';
import {
  Smartphone,
  Scan,
  Search,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  ArrowLeft,
  ShoppingBag,
  UserCheck,
  ShieldCheck,
  Package,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Product, CartItem, User, StoreSettings } from '../../types';
import { api } from '../../utils/api';
import { playBeep } from '../../utils/audio';

interface MobileQueueBusterViewProps {
  products: Product[];
  currentUser: User | null;
  settings: StoreSettings | null;
  onExit?: () => void;
}

export const MobileQueueBusterView: React.FC<MobileQueueBusterViewProps> = ({
  products,
  currentUser,
  settings,
  onExit,
}) => {
  // Session setup
  const [employeePin, setEmployeePin] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(!!currentUser);
  const [selectedRegister, setSelectedRegister] = useState('Register #1 (Front Counter)');
  
  // Cart state
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  
  // Simulated barcode scanner input
  const [barcodeInput, setBarcodeInput] = useState('');
  const [transferResult, setTransferResult] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Quick categories
  const categories = useMemo(() => {
    return Array.from(new Set(products.map(p => p.categoryName || 'Other'))).filter(Boolean);
  }, [products]);

  // Filtered products for quick mobile tap
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (!p.active) return false;
      if (categoryFilter !== 'all' && p.categoryName !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.barcode.toLowerCase().includes(q) ||
          (p.brand && p.brand.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [products, categoryFilter, searchQuery]);

  // Handle Add to Mobile Cart
  const handleAddToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stockQuantity) {
          playBeep('error');
          alert(`Only ${product.stockQuantity} units available.`);
          return prev;
        }
        playBeep('click');
        return prev.map(item =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      } else {
        playBeep('scan');
        return [...prev, { product, quantity: 1 }];
      }
    });
  };

  const handleUpdateQty = (productId: string, delta: number) => {
    setCart(prev =>
      prev
        .map(item => {
          if (item.product.id === productId) {
            const next = item.quantity + delta;
            return next > 0 ? { ...item, quantity: next } : null;
          }
          return item;
        })
        .filter(Boolean) as { product: Product; quantity: number }[]
    );
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;
    const code = barcodeInput.trim().toLowerCase();
    const match = products.find(
      p =>
        p.barcode.toLowerCase() === code ||
        p.sku.toLowerCase() === code ||
        (p.barcodes && p.barcodes.some(b => b.barcode.toLowerCase() === code))
    );
    if (match) {
      handleAddToCart(match);
      setBarcodeInput('');
    } else {
      playBeep('error');
      setErrorMessage(`No product found for barcode "${barcodeInput}"`);
      setTimeout(() => setErrorMessage(null), 3500);
    }
  };

  const subtotal = cart.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  const totalTax = subtotal * (settings?.taxRate ?? 0.0825);
  const grandTotal = subtotal + totalTax;

  // Complete and generate QR code / transfer voucher
  const handleCompletePreparedCart = async () => {
    if (cart.length === 0) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const itemsPayload = cart.map(i => ({
        productId: i.product.id,
        productName: i.product.name,
        sku: i.product.sku,
        quantity: i.quantity,
        unitPrice: i.product.price,
        lineTotal: i.product.price * i.quantity,
      }));

      const res = await api.createCartTransfer({
        items: itemsPayload,
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        sourceChannel: 'mobile_queue',
        destinationRegisterId: selectedRegister,
      });

      playBeep('success');
      setTransferResult(res.transfer);
    } catch (err: any) {
      playBeep('error');
      setErrorMessage(err.message || 'Failed to submit prepared cart');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartNextCustomer = () => {
    setCart([]);
    setCustomerName('');
    setCustomerPhone('');
    setTransferResult(null);
    setSearchQuery('');
  };

  return (
    <div className="h-full flex flex-col bg-[#0C0C0C] text-[#E5E5E5] select-none font-sans overflow-hidden">
      {/* Mobile Top App Bar */}
      <header className="bg-[#141414] border-b border-[#242424] px-4 py-3 shrink-0 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          {onExit && (
            <button
              onClick={onExit}
              className="p-1.5 rounded-lg bg-[#202020] text-[#A3A3A3] hover:text-white mr-1 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center shadow-xs">
            <Smartphone className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-wide">Queue Buster Mobile</h1>
            <p className="text-[10px] text-amber-300/90 font-mono">
              {currentUser?.name || 'Associate'} • {selectedRegister}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
            QB Active
          </span>
        </div>
      </header>

      {/* Main Area: Transfer Completion Screen vs. Cart Builder */}
      {transferResult ? (
        <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center text-center space-y-5 animate-in fade-in">
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shadow-xl">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-mono uppercase tracking-widest text-emerald-400 font-bold">
              Cart Prepared & Suspended
            </span>
            <h2 className="text-2xl font-serif font-black text-white">
              Transfer Code Ready
            </h2>
            <p className="text-xs text-[#888888] max-w-xs mx-auto">
              Show this code to the customer or send them directly to {selectedRegister}.
            </p>
          </div>

          {/* Large scannable code ticket */}
          <div className="bg-[#161616] border-2 border-dashed border-[#C5A059] rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <div className="flex items-center justify-center space-x-2 text-[#C5A059] font-bold text-xs uppercase tracking-wider">
              <QrCode className="w-4 h-4" />
              <span>Checkout Voucher</span>
            </div>

            <div className="bg-[#0A0A0A] py-4 px-2 rounded-2xl border border-[#2B2B2B]">
              <div className="text-3xl font-mono font-black text-[#F5BD47] tracking-widest">
                {transferResult.transferCode}
              </div>
              <div className="text-[10px] text-[#737373] font-mono mt-1">
                Expires in 60 min • Single Use
              </div>
            </div>

            <div className="text-left text-xs space-y-1.5 pt-2 border-t border-[#262626]">
              <div className="flex justify-between text-[#888888]">
                <span>Customer:</span>
                <span className="text-white font-medium">{transferResult.customerName || 'Walk-in'}</span>
              </div>
              <div className="flex justify-between text-[#888888]">
                <span>Total Items:</span>
                <span className="text-white font-mono font-bold">{transferResult.items.length} units</span>
              </div>
              <div className="flex justify-between text-[#888888]">
                <span>Estimated Total:</span>
                <span className="text-emerald-400 font-mono font-bold">${(transferResult.subtotal * 1.0825).toFixed(2)}</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleStartNextCustomer}
            className="w-full max-w-sm py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg transition-transform active:scale-98 cursor-pointer"
          >
            Start Next Customer in Line
          </button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left / Top: Barcode Scan & Search and Product Catalog */}
          <div className="flex-1 flex flex-col overflow-hidden border-b md:border-b-0 md:border-r border-[#242424]">
            {/* Quick Barcode Gun / Camera Bar */}
            <div className="p-3 bg-[#111111] border-b border-[#242424] space-y-2">
              <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
                <div className="relative flex-1">
                  <Scan className="w-4 h-4 text-amber-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={barcodeInput}
                    onChange={e => setBarcodeInput(e.target.value)}
                    placeholder="Scan bottle barcode..."
                    autoFocus
                    className="w-full bg-[#1A1A1A] border border-[#333333] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-[#666666] focus:border-amber-400 focus:outline-hidden"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs uppercase rounded-xl cursor-pointer shrink-0 shadow-xs"
                >
                  Add
                </button>
              </form>

              {/* Text Search & Category Filter */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-[#737373] absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search name, brand, SKU..."
                    className="w-full bg-[#161616] border border-[#2B2B2B] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-[#555555] focus:outline-hidden focus:border-amber-400"
                  />
                </div>
                <select
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value)}
                  className="bg-[#161616] border border-[#2B2B2B] rounded-lg px-2.5 py-1.5 text-xs text-[#E5E5E5] outline-none"
                >
                  <option value="all">All Spirits</option>
                  {categories.map(c => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {errorMessage && (
                <div className="p-2 bg-red-950/50 border border-red-800/60 rounded-lg text-red-300 text-[11px] flex items-center space-x-1.5 animate-in fade-in">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-red-400" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>

            {/* Tap Catalog Grid */}
            <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
              {filteredProducts.slice(0, 36).map(prod => {
                const inCart = cart.find(c => c.product.id === prod.id);
                return (
                  <div
                    key={prod.id}
                    onClick={() => handleAddToCart(prod)}
                    className={`bg-[#161616] border rounded-xl p-2.5 flex flex-col justify-between hover:border-amber-400/80 transition-all cursor-pointer relative ${
                      inCart ? 'border-amber-400 bg-[#1C1810]' : 'border-[#262626]'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] text-[#888888] font-mono">{prod.size}</span>
                        {inCart && (
                          <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] flex items-center justify-center">
                            {inCart.quantity}
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-white line-clamp-2 mt-1 leading-snug">
                        {prod.name}
                      </h4>
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-[#222222]">
                      <span className="font-mono text-xs font-bold text-amber-300">
                        ${prod.price.toFixed(2)}
                      </span>
                      <span className="text-[9px] text-emerald-400 font-bold">
                        {prod.stockQuantity} in stock
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right / Bottom: Customer's Active Mobile Cart */}
          <div className="w-full md:w-80 lg:w-96 bg-[#111111] flex flex-col shrink-0">
            {/* Customer Details Box */}
            <div className="p-3 border-b border-[#242424] space-y-2 bg-[#141414]">
              <div className="flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-[#A3A3A3]">
                <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Customer in Queue</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="Customer Name"
                  className="bg-[#1C1C1C] border border-[#2B2B2B] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-[#555555] focus:outline-hidden focus:border-amber-400"
                />
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  placeholder="Cell Phone (Opt)"
                  className="bg-[#1C1C1C] border border-[#2B2B2B] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-[#555555] focus:outline-hidden focus:border-amber-400"
                />
              </div>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#666666]">
                  <ShoppingBag className="w-8 h-8 mb-2 stroke-[1.5]" />
                  <p className="text-xs font-bold text-[#888888]">Mobile cart is empty</p>
                  <p className="text-[11px] text-[#555555] mt-0.5">
                    Scan or tap bottles while customer waits in line
                  </p>
                </div>
              ) : (
                cart.map(item => (
                  <div
                    key={item.product.id}
                    className="bg-[#181818] border border-[#262626] rounded-xl p-2.5 flex items-center justify-between"
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <h5 className="text-xs font-bold text-white truncate">{item.product.name}</h5>
                      <div className="text-[10px] text-[#888888] font-mono mt-0.5">
                        ${item.product.price.toFixed(2)} ea • {item.product.sku}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <button
                        onClick={() => handleUpdateQty(item.product.id, -1)}
                        className="w-6 h-6 rounded bg-[#242424] hover:bg-[#303030] text-white flex items-center justify-center cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-mono text-xs font-bold text-amber-300 w-4 text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => handleUpdateQty(item.product.id, 1)}
                        className="w-6 h-6 rounded bg-[#242424] hover:bg-[#303030] text-white flex items-center justify-center cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Cart Summary & Action */}
            <div className="p-4 bg-[#141414] border-t border-[#242424] space-y-3">
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-[#888888]">
                  <span>Subtotal ({cart.reduce((s, i) => s + i.quantity, 0)} items):</span>
                  <span className="font-mono font-bold text-white">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[#888888]">
                  <span>Estimated Tax (8.25%):</span>
                  <span className="font-mono text-white">${totalTax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-black text-amber-400 pt-1 border-t border-[#262626]">
                  <span>Est. Total:</span>
                  <span className="font-mono font-black">${grandTotal.toFixed(2)}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCompletePreparedCart}
                disabled={isSubmitting || cart.length === 0}
                className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shadow-lg transition-transform active:scale-98 disabled:opacity-50 cursor-pointer"
              >
                <QrCode className="w-4 h-4" />
                <span>{isSubmitting ? 'Creating Voucher...' : 'Complete Prepared Cart'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
