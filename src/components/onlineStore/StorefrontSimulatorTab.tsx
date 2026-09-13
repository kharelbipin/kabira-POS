import React, { useState, useEffect } from 'react';
import {
  Globe,
  ShoppingBag,
  Truck,
  ShieldCheck,
  Search,
  CheckCircle2,
  X,
  Plus,
  Minus,
  Trash2,
  Sparkles,
  Clock,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  AlertTriangle,
  Tag,
  Package,
} from 'lucide-react';
import { OnlineStoreConfig } from '../../types';
import { api } from '../../utils/api';
import { playBeep } from '../../utils/audio';

interface StorefrontSimulatorTabProps {
  config: OnlineStoreConfig;
  onOrderPlaced: () => void;
}

export const StorefrontSimulatorTab: React.FC<StorefrontSimulatorTabProps> = ({
  config,
  onOrderPlaced,
}) => {
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Texas 21+ Age Gate State
  const [isAgeVerified, setIsAgeVerified] = useState<boolean>(() => {
    return localStorage.getItem('storefront_age_verified') === 'true';
  });
  const [birthYear, setBirthYear] = useState('');
  const [ageError, setAgeError] = useState<string | null>(null);

  // Cart & Checkout State
  const [cart, setCart] = useState<
    Array<{
      product: any;
      quantity: number;
    }>
  >([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [fulfillmentType, setFulfillmentType] = useState<'pickup' | 'delivery'>('pickup');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  // Customer Checkout Form
  const [customerName, setCustomerName] = useState('Sarah Jenkins');
  const [customerPhone, setCustomerPhone] = useState('(817) 555-0199');
  const [customerEmail, setCustomerEmail] = useState('sarah.jenkins@example.com');
  const [deliveryStreet, setDeliveryStreet] = useState('210 Pearl St');
  const [deliveryZip, setDeliveryZip] = useState('76048');
  const [pickupSlot, setPickupSlot] = useState('Today: 4:30 PM - 5:00 PM');
  const [orderNotes, setOrderNotes] = useState('Please leave in trunk of silver Honda CR-V');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [placedOrderResult, setPlacedOrderResult] = useState<any | null>(null);

  useEffect(() => {
    loadStoreProducts();
  }, []);

  const loadStoreProducts = async () => {
    setIsLoading(true);
    try {
      const res = await api.getOnlineProducts();
      // Filter only sellOnline items for customer view
      const onlineOnly = (res.products || []).filter(
        p => p.onlineSettings?.sellOnline !== false
      );
      setProducts(onlineOnly);
    } catch (err) {
      console.error('Failed to load storefront products', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyAge = (e: React.FormEvent) => {
    e.preventDefault();
    const currentYear = new Date().getFullYear();
    const yearNum = parseInt(birthYear);
    if (!yearNum || currentYear - yearNum < 21) {
      setAgeError('You must be at least 21 years old to enter this website under Texas TABC law.');
      return;
    }
    setIsAgeVerified(true);
    localStorage.setItem('storefront_age_verified', 'true');
    setAgeError(null);
    playBeep('success');
  };

  const handleAddToCart = (product: any) => {
    const safety = product.onlineSettings?.safetyStock ?? 1;
    const available = Math.max(0, product.stockQuantity - safety);
    const existing = cart.find(item => item.product.id === product.id);
    const currentQty = existing ? existing.quantity : 0;

    if (currentQty >= available) {
      alert(`Sorry, maximum available quantity for online purchase is ${available}.`);
      return;
    }

    setCart(prev => {
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    playBeep('beep');
  };

  const handleUpdateQty = (productId: string, delta: number) => {
    setCart(prev =>
      prev
        .map(item => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as any
    );
  };

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    setCouponError(null);

    try {
      const res = await api.validateCoupon(couponCode.trim(), cartSubtotal);
      if (res.valid) {
        setAppliedCoupon(res.coupon);
        playBeep('success');
      } else {
        setCouponError(res.message || 'Invalid promo code');
        playBeep('error');
      }
    } catch (err: any) {
      setCouponError(err.message || 'Coupon check failed');
      playBeep('error');
    }
  };

  const cartSubtotal = cart.reduce((sum, item) => {
    const price = item.product.onlineSettings?.onlinePrice ?? item.product.price;
    return sum + price * item.quantity;
  }, 0);

  let discountAmount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.discountType === 'percentage') {
      discountAmount = (cartSubtotal * appliedCoupon.discountValue) / 100;
    } else {
      discountAmount = Math.min(cartSubtotal, appliedCoupon.discountValue);
    }
  }

  const deliveryFee =
    fulfillmentType === 'delivery'
      ? cartSubtotal >= (config.freeDeliveryThreshold || 75)
        ? 0
        : config.deliveryFee || 5.99
      : 0;

  const taxAmount = (cartSubtotal - discountAmount) * 0.0825;
  const grandTotal = Math.max(0, cartSubtotal - discountAmount + deliveryFee + taxAmount);

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    setIsSubmitting(true);

    try {
      const orderPayload = {
        customerName,
        customerEmail,
        customerPhone,
        fulfillmentType,
        deliveryAddress:
          fulfillmentType === 'delivery'
            ? {
                street: deliveryStreet,
                city: 'Granbury',
                state: 'TX',
                zip: deliveryZip,
              }
            : undefined,
        pickupTimeSlot: fulfillmentType === 'pickup' ? pickupSlot : undefined,
        notes: orderNotes,
        items: cart.map(item => ({
          productId: item.product.id,
          productName: item.product.name,
          sku: item.product.sku,
          size: item.product.size,
          quantity: item.quantity,
          unitPrice: item.product.onlineSettings?.onlinePrice ?? item.product.price,
          totalPrice:
            (item.product.onlineSettings?.onlinePrice ?? item.product.price) * item.quantity,
        })),
        subtotal: cartSubtotal,
        discountAmount,
        couponCode: appliedCoupon?.code,
        deliveryFee,
        taxAmount,
        totalAmount: grandTotal,
        paymentMethod: 'Credit Card (Stripe Online)',
      };

      const res = await api.createOnlineStoreOrder(orderPayload);
      setPlacedOrderResult(res.order);
      setCart([]);
      setIsCartOpen(false);
      playBeep('success');
      onOrderPlaced();
    } catch (err: any) {
      alert('Order submission failed: ' + err.message);
      playBeep('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = ['All', ...Array.from(new Set(products.map(p => p.categoryName || 'Spirits')))];

  const filteredProducts = products.filter(p => {
    if (selectedCategory !== 'All' && p.categoryName !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.brand?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Simulator Device Shell / Browser Frame */}
      <div className="bg-[#0A0A0A] border border-[#262626] rounded-3xl overflow-hidden shadow-2xl">
        {/* Browser Top Bar */}
        <div className="bg-[#141414] border-b border-[#262626] px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-red-500/80" />
            <span className="w-3 h-3 rounded-full bg-amber-500/80" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
          </div>

          <div className="flex items-center space-x-2 bg-[#0D0D0D] border border-[#2B2B2B] rounded-xl px-4 py-1 text-xs text-[#888888] font-mono w-full max-w-md mx-4">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-[#AAAAAA]">https://</span>
            <span className="text-white font-bold truncate">
              {config.customDomain || config.subdomain}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 rounded-xl bg-[#222222] hover:bg-[#2A2A2A] text-white cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4 text-[#C5A059]" />
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#C5A059] text-black font-black text-[10px] flex items-center justify-center">
                  {cart.reduce((s, i) => s + i.quantity, 0)}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Storefront Customer View Canvas */}
        <div className="bg-[#111111] text-[#E5E5E5] min-h-[600px] flex flex-col relative">
          {/* Texas 21+ Age Gate Modal (TABC Compliance WEB-022) */}
          {config.ageGateRequired && !isAgeVerified && (
            <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-6">
              <div className="max-w-md w-full bg-[#181818] border border-[#333333] rounded-3xl p-8 text-center space-y-5 shadow-2xl">
                <div className="w-16 h-16 rounded-full bg-[#C5A059]/20 text-[#C5A059] flex items-center justify-center mx-auto border border-[#C5A059]/40">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white tracking-wide">
                    Age Verification Required
                  </h3>
                  <p className="text-xs text-[#888888] mt-1.5 leading-relaxed">
                    You must be at least 21 years of age to purchase or view alcoholic beverages in
                    the State of Texas (TABC Regulated).
                  </p>
                </div>

                <form onSubmit={handleVerifyAge} className="space-y-4">
                  <div>
                    <label className="text-xs text-[#AAAAAA] uppercase font-bold tracking-wider block mb-1">
                      Enter Your Birth Year
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 1994"
                      value={birthYear}
                      onChange={e => setBirthYear(e.target.value)}
                      className="w-40 mx-auto text-center bg-[#222222] border border-[#444444] rounded-xl py-2.5 text-lg font-mono font-bold text-white outline-none focus:border-[#C5A059]"
                      autoFocus
                    />
                  </div>

                  {ageError && (
                    <div className="text-xs text-red-400 bg-red-950/60 p-2.5 rounded-xl border border-red-800/60">
                      {ageError}
                    </div>
                  )}

                  <div className="flex gap-3 justify-center pt-2">
                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-xl bg-[#C5A059] hover:bg-[#D4AF37] text-black text-xs font-black uppercase tracking-wider shadow-lg cursor-pointer"
                    >
                      I Am 21 or Older
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Announcement Bar */}
          {config.showAnnouncement && config.announcementBar && (
            <div className="bg-[#C5A059] text-black text-xs font-bold py-2 px-4 text-center tracking-wide shadow-sm">
              {config.announcementBar}
            </div>
          )}

          {/* Storefront Hero Header */}
          <div className="relative py-12 px-6 sm:px-12 bg-gradient-to-b from-[#1C1810] to-[#111111] border-b border-[#222222]">
            <div className="max-w-4xl mx-auto text-center space-y-3">
              <span className="text-xs font-mono uppercase tracking-widest text-[#C5A059] font-bold">
                Granbury, Texas • Fine Wine & Craft Spirits
              </span>
              <h1 className="text-3xl sm:text-5xl font-serif italic font-bold text-white tracking-wide">
                {config.storeName || '377 Spirits'}
              </h1>
              <p className="text-sm text-[#888888] max-w-xl mx-auto">
                {config.tagline || 'Granbury’s Premier Destination for Fine Spirits, Craft Wine & Curbside Pickup'}
              </p>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
                {config.enableInStorePickup && (
                  <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#222222] text-[#E5E5E5] border border-[#333333]">
                    <ShoppingBag className="w-3.5 h-3.5 text-[#C5A059]" />
                    <span>Curbside in {config.pickupPrepTimeMinutes || 20}m</span>
                  </span>
                )}
                {config.enableLocalDelivery && (
                  <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#222222] text-[#E5E5E5] border border-[#333333]">
                    <Truck className="w-3.5 h-3.5 text-sky-400" />
                    <span>Local Delivery (${config.deliveryFee} / Free over ${config.freeDeliveryThreshold})</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Search & Category Filter */}
          <div className="px-6 py-4 border-b border-[#222222] bg-[#141414] flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${
                    selectedCategory === cat
                      ? 'bg-[#C5A059] text-black shadow-md'
                      : 'bg-[#1E1E1E] text-[#888888] hover:text-white hover:bg-[#282828]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="relative min-w-[220px]">
              <Search className="w-3.5 h-3.5 text-[#666666] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search spirits..."
                className="w-full bg-[#1A1A1A] border border-[#333333] rounded-xl pl-9 pr-3 py-1.5 text-xs text-white outline-none focus:border-[#C5A059]"
              />
            </div>
          </div>

          {/* Product Grid */}
          <div className="p-6 flex-1">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-16 space-y-2">
                <Package className="w-10 h-10 text-[#444444] mx-auto" />
                <p className="text-sm font-bold text-white">No products found</p>
                <p className="text-xs text-[#777777]">
                  Publish products in the &quot;Product Catalog&quot; tab to show them online.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredProducts.map(p => {
                  const safety = p.onlineSettings?.safetyStock ?? 1;
                  const availableUnits = Math.max(0, p.stockQuantity - safety);
                  const price = p.onlineSettings?.onlinePrice ?? p.price;

                  return (
                    <div
                      key={p.id}
                      className="bg-[#161616] border border-[#262626] rounded-2xl p-4 flex flex-col justify-between hover:border-[#383838] transition-all group shadow-sm"
                    >
                      <div className="space-y-3">
                        <div className="w-full h-32 rounded-xl bg-[#202020] flex items-center justify-center overflow-hidden relative">
                          {p.imageUrl ? (
                            <img
                              src={p.imageUrl}
                              alt={p.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <Package className="w-8 h-8 text-[#555555]" />
                          )}
                          {availableUnits > 0 && availableUnits <= 3 && (
                            <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/80 text-amber-300 border border-amber-800/50">
                              Only {availableUnits} left
                            </span>
                          )}
                        </div>

                        <div>
                          <div className="text-[10px] font-mono text-[#888888] uppercase">
                            {p.brand || p.categoryName || 'Spirit'} • {p.size || '750ml'}
                          </div>
                          <h4 className="font-bold text-sm text-white line-clamp-1 group-hover:text-[#C5A059] transition-colors">
                            {p.name}
                          </h4>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-[#222222] mt-3 flex items-center justify-between">
                        <div>
                          <span className="text-base font-black text-white font-mono">
                            ${price.toFixed(2)}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleAddToCart(p)}
                          disabled={availableUnits <= 0}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center space-x-1 cursor-pointer transition-all ${
                            availableUnits > 0
                              ? 'bg-[#C5A059] hover:bg-[#D4AF37] text-black shadow-sm'
                              : 'bg-[#222222] text-[#666666] cursor-not-allowed'
                          }`}
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cart Drawer / Slide-over Modal */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-md bg-[#161616] border-l border-[#2B2B2B] h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            {/* Cart Header */}
            <div className="p-5 border-b border-[#262626] flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShoppingBag className="w-5 h-5 text-[#C5A059]" />
                <h3 className="font-bold text-base text-white">Your Online Order</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 rounded-lg text-[#888888] hover:text-white hover:bg-[#222222] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {cart.length === 0 ? (
                <div className="text-center py-16 space-y-2">
                  <ShoppingBag className="w-12 h-12 text-[#444444] mx-auto" />
                  <p className="text-sm font-bold text-white">Your cart is empty</p>
                  <p className="text-xs text-[#777777]">Browse the spirits above and add bottles.</p>
                </div>
              ) : (
                cart.map(item => {
                  const price =
                    item.product.onlineSettings?.onlinePrice ?? item.product.price;
                  return (
                    <div
                      key={item.product.id}
                      className="p-3 bg-[#1A1A1A] border border-[#2B2B2B] rounded-xl flex items-center justify-between"
                    >
                      <div>
                        <h5 className="text-xs font-bold text-white">{item.product.name}</h5>
                        <span className="text-[10px] text-[#777777] font-mono">
                          ${price.toFixed(2)} ea
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-1 bg-[#222222] rounded-lg border border-[#333333] p-0.5">
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(item.product.id, -1)}
                            className="w-6 h-6 rounded flex items-center justify-center text-white hover:bg-[#333333] cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-6 text-center text-xs font-mono font-bold text-white">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(item.product.id, 1)}
                            className="w-6 h-6 rounded flex items-center justify-center text-white hover:bg-[#333333] cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="text-xs font-bold font-mono text-white w-14 text-right">
                          ${(price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Checkout Options & Form */}
            {cart.length > 0 && (
              <form onSubmit={handlePlaceOrder} className="p-5 border-t border-[#262626] bg-[#121212] space-y-4">
                {/* Fulfillment Selection */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFulfillmentType('pickup')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 border transition-all cursor-pointer ${
                      fulfillmentType === 'pickup'
                        ? 'bg-[#C5A059] text-black border-[#C5A059]'
                        : 'bg-[#1C1C1C] text-[#888888] border-[#2E2E2E]'
                    }`}
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Curbside Pickup</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFulfillmentType('delivery')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 border transition-all cursor-pointer ${
                      fulfillmentType === 'delivery'
                        ? 'bg-[#C5A059] text-black border-[#C5A059]'
                        : 'bg-[#1C1C1C] text-[#888888] border-[#2E2E2E]'
                    }`}
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>Local Delivery</span>
                  </button>
                </div>

                {/* Promo Code Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={e => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="Promo Code (WELCOME10)"
                    className="flex-1 bg-[#1C1C1C] border border-[#333333] rounded-lg px-3 py-1.5 text-xs text-white font-mono uppercase outline-none focus:border-[#C5A059]"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    className="px-3 py-1.5 rounded-lg bg-[#262626] hover:bg-[#333333] text-white text-xs font-bold cursor-pointer"
                  >
                    Apply
                  </button>
                </div>
                {appliedCoupon && (
                  <div className="text-[11px] text-emerald-400 flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Applied {appliedCoupon.code} (-${discountAmount.toFixed(2)})</span>
                  </div>
                )}
                {couponError && (
                  <div className="text-[11px] text-red-400">{couponError}</div>
                )}

                {/* Customer Details */}
                <div className="space-y-2 text-xs">
                  <input
                    type="text"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    placeholder="Full Name"
                    required
                    className="w-full bg-[#1C1C1C] border border-[#333333] rounded-lg px-3 py-1.5 text-white outline-none"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={e => setCustomerPhone(e.target.value)}
                      placeholder="Phone"
                      required
                      className="bg-[#1C1C1C] border border-[#333333] rounded-lg px-3 py-1.5 text-white outline-none"
                    />
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={e => setCustomerEmail(e.target.value)}
                      placeholder="Email"
                      required
                      className="bg-[#1C1C1C] border border-[#333333] rounded-lg px-3 py-1.5 text-white outline-none"
                    />
                  </div>

                  {fulfillmentType === 'delivery' ? (
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={deliveryStreet}
                        onChange={e => setDeliveryStreet(e.target.value)}
                        placeholder="Street Address"
                        required
                        className="col-span-2 bg-[#1C1C1C] border border-[#333333] rounded-lg px-3 py-1.5 text-white outline-none"
                      />
                      <input
                        type="text"
                        value={deliveryZip}
                        onChange={e => setDeliveryZip(e.target.value)}
                        placeholder="Zip"
                        required
                        className="bg-[#1C1C1C] border border-[#333333] rounded-lg px-3 py-1.5 text-white outline-none"
                      />
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={pickupSlot}
                      onChange={e => setPickupSlot(e.target.value)}
                      placeholder="Pickup Time Slot"
                      className="w-full bg-[#1C1C1C] border border-[#333333] rounded-lg px-3 py-1.5 text-white outline-none"
                    />
                  )}
                </div>

                {/* Price Summary */}
                <div className="pt-2 border-t border-[#262626] space-y-1 text-xs text-[#888888]">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span className="font-mono text-white">${cartSubtotal.toFixed(2)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-400">
                      <span>Discount ({appliedCoupon?.code}):</span>
                      <span className="font-mono">-${discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  {deliveryFee > 0 && (
                    <div className="flex justify-between">
                      <span>Delivery Fee:</span>
                      <span className="font-mono text-white">${deliveryFee.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Texas Sales Tax (8.25%):</span>
                    <span className="font-mono text-white">${taxAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-white pt-1 border-t border-[#262626]">
                    <span>Total:</span>
                    <span className="font-mono text-[#C5A059] text-base">
                      ${grandTotal.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#C5A059] to-[#D4AF37] hover:from-[#D4AF37] hover:to-[#C5A059] text-black font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center space-x-2 transition-all cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>
                    {isSubmitting ? 'Processing Order...' : `Place Order ($${grandTotal.toFixed(2)})`}
                  </span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Order Placed Success Modal */}
      {placedOrderResult && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#181818] border border-[#333333] rounded-3xl p-8 text-center space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-950/60 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-800/60">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white tracking-wide">
                Order #{placedOrderResult.orderNumber} Confirmed!
              </h3>
              <p className="text-xs text-[#888888] mt-1">
                Total: ${placedOrderResult.totalAmount?.toFixed(2)} • {placedOrderResult.fulfillmentType === 'delivery' ? 'Local Delivery' : 'Curbside Pickup'}
              </p>
            </div>

            <div className="p-4 bg-[#141414] rounded-2xl border border-[#2B2B2B] text-xs text-left space-y-2">
              <div className="flex justify-between">
                <span className="text-[#888888]">Customer:</span>
                <span className="text-white font-bold">{placedOrderResult.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#888888]">Status:</span>
                <span className="text-amber-400 font-bold uppercase">New Order (In POS Queue)</span>
              </div>
              <div className="text-[11px] text-[#C5A059] pt-1">
                Notice: Valid Govt ID showing age 21+ is strictly required at curbside pickup or delivery handoff per Texas TABC regulations.
              </div>
            </div>

            <button
              type="button"
              onClick={() => setPlacedOrderResult(null)}
              className="w-full py-3 rounded-xl bg-[#C5A059] hover:bg-[#D4AF37] text-black font-bold text-xs uppercase tracking-wider cursor-pointer"
            >
              Close & View in POS Orders
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
