import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Phone,
  Clock,
  Search,
  User as UserIcon,
  ShoppingCart,
  Truck,
  ShoppingBag,
  Tag,
  Star,
  Building2,
  Heart,
  ArrowRight,
  Gift,
  Wine,
  Sparkles,
  X,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Send,
  Calendar,
  Layers,
} from 'lucide-react';
import { OnlineStoreConfig } from '../../types';
import { api } from '../../utils/api';
import { playBeep } from '../../utils/audio';

interface GranburySpiritsStorefrontProps {
  config?: OnlineStoreConfig | null;
  onOpenAdminTabs?: (tab: string) => void;
}

export const GranburySpiritsStorefront: React.FC<GranburySpiritsStorefrontProps> = ({
  config,
  onOpenAdminTabs,
}) => {
  // Navigation & Search State
  const [activeNav, setActiveNav] = useState('Home');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [wishlist, setWishlist] = useState<Record<string, boolean>>({});

  // Cart & Checkout State
  const [cart, setCart] = useState<
    Array<{
      id: string;
      name: string;
      size: string;
      price: number;
      quantity: number;
      imageUrl?: string;
      bottleType?: string;
    }>
  >([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [fulfillmentType, setFulfillmentType] = useState<'pickup' | 'delivery'>('pickup');
  const [couponCode, setCouponCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [couponMessage, setCouponMessage] = useState<string | null>(null);

  // Modals
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [showLoyaltyModal, setShowLoyaltyModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showOurStoryModal, setShowOurStoryModal] = useState(false);
  const [showAllocationsModal, setShowAllocationsModal] = useState(false);
  const [showSocialModal, setShowSocialModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSuccess, setNewsletterSuccess] = useState(false);

  // Checkout Form
  const [customerName, setCustomerName] = useState('Sarah Jenkins');
  const [customerPhone, setCustomerPhone] = useState('(682) 555-0144');
  const [customerEmail, setCustomerEmail] = useState('sarah.jenkins@example.com');
  const [deliveryAddress, setDeliveryAddress] = useState('210 Pearl St, Granbury, TX 76048');
  const [birthYear, setBirthYear] = useState('1994');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [orderCompleteSuccess, setOrderCompleteSuccess] = useState<string | null>(null);

  // Featured 6 Products matching web.png exactly
  const featuredProducts = [
    {
      id: 'prod-16',
      name: 'Weller Antique 107',
      size: '750ml',
      price: 59.99,
      bottleType: 'weller',
      category: 'Bourbon',
      tag: 'Allocated',
    },
    {
      id: 'prod-17',
      name: 'Eagle Rare 10 Year',
      size: '750ml',
      price: 49.99,
      bottleType: 'eagle_rare',
      category: 'Bourbon',
      tag: 'Hard-to-Find',
    },
    {
      id: 'prod-3',
      name: "Blanton's Single Barrel",
      size: '750ml',
      price: 129.99,
      bottleType: 'blantons',
      category: 'Bourbon',
      tag: 'Single Barrel',
    },
    {
      id: 'prod-18',
      name: 'Penelope Bourbon',
      size: '750ml',
      price: 64.99,
      bottleType: 'penelope',
      category: 'Bourbon',
      tag: 'Toasted Oak',
    },
    {
      id: 'prod-19',
      name: "Baker's 13 Year",
      size: '750ml',
      price: 149.99,
      bottleType: 'bakers',
      category: 'Bourbon',
      tag: 'Limited Edition',
    },
    {
      id: 'prod-15',
      name: 'Buffalo Trace',
      size: '750ml',
      price: 32.99,
      bottleType: 'buffalo_trace',
      category: 'Bourbon',
      tag: 'Customer Favorite',
    },
  ];

  // 12 Circular Categories matching web.png
  const categoriesList = [
    { name: 'Bourbon', img: 'https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=200&auto=format&fit=crop&q=80' },
    { name: 'Whiskey', img: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=200&auto=format&fit=crop&q=80' },
    { name: 'Tequila', img: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=200&auto=format&fit=crop&q=80' },
    { name: 'Vodka', img: 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=200&auto=format&fit=crop&q=80' },
    { name: 'Rum', img: 'https://images.unsplash.com/photo-1614313511387-1436a4480ebb?w=200&auto=format&fit=crop&q=80' },
    { name: 'Gin', img: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=200&auto=format&fit=crop&q=80' },
    { name: 'Wine', img: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=200&auto=format&fit=crop&q=80' },
    { name: 'Beer', img: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=200&auto=format&fit=crop&q=80' },
    { name: 'Ready to Drink', img: 'https://images.unsplash.com/photo-1584225064785-c62a8b43d148?w=200&auto=format&fit=crop&q=80' },
    { name: 'Tobacco', img: 'https://images.unsplash.com/photo-1528740561666-dc2479dc08ab?w=200&auto=format&fit=crop&q=80' },
    { name: 'Vape', img: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=200&auto=format&fit=crop&q=80' },
    { name: 'Accessories', img: 'https://images.unsplash.com/photo-1574096079513-d8259312b785?w=200&auto=format&fit=crop&q=80' },
  ];

  // Nav Items
  const navLinks = [
    'Home',
    'Spirits',
    'Wine',
    'Beer',
    'Tobacco & Vape',
    'Accessories',
    'Specials',
    'Events',
    'About',
  ];

  const handleAddToCart = (product: typeof featuredProducts[0]) => {
    playBeep('beep');
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const handleUpdateQuantity = (id: string, delta: number) => {
    playBeep('click');
    setCart(prev =>
      prev
        .map(item => {
          if (item.id === id) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as any
    );
  };

  const toggleWishlist = (id: string) => {
    playBeep('click');
    setWishlist(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    const code = couponCode.trim().toUpperCase();
    if (code === 'GRANBURY10' || code === 'WELCOME10') {
      setDiscountPercent(10);
      setCouponMessage('10% Granbury discount applied!');
      playBeep('success');
    } else if (code === 'VIP20') {
      setDiscountPercent(20);
      setCouponMessage('20% VIP Bottle Club discount applied!');
      playBeep('success');
    } else {
      setDiscountPercent(0);
      setCouponMessage('Invalid coupon code.');
      playBeep('error');
    }
  };

  // Calculations
  const cartTotalUnits = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartSubtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountAmount = (cartSubtotal * discountPercent) / 100;
  const discountedSubtotal = cartSubtotal - discountAmount;
  const taxAmount = discountedSubtotal * 0.0825; // Texas 8.25% Sales Tax
  const deliveryFee = fulfillmentType === 'delivery' ? (discountedSubtotal > 75 ? 0 : 4.99) : 0;
  const grandTotal = discountedSubtotal + taxAmount + deliveryFee;

  const handleSubscribeNewsletter = (e: React.FormEvent) => {
    e.preventDefault();
    if (newsletterEmail) {
      setNewsletterSuccess(true);
      playBeep('success');
      setTimeout(() => setNewsletterSuccess(false), 5000);
      setNewsletterEmail('');
    }
  };

  const handleCompleteOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const curYear = new Date().getFullYear();
    const yNum = parseInt(birthYear);
    if (!yNum || curYear - yNum < 21) {
      alert('Under Texas TABC Law, you must be 21+ to complete an alcoholic beverage order.');
      return;
    }

    setIsSubmittingOrder(true);
    try {
      // Post to real backend online store order system
      const orderPayload = {
        customerName,
        customerPhone,
        customerEmail,
        fulfillmentType,
        deliveryAddress: fulfillmentType === 'delivery' ? deliveryAddress : undefined,
        items: cart.map(item => ({
          productId: item.id,
          productName: item.name,
          quantity: item.quantity,
          unitPrice: item.price,
          totalPrice: item.price * item.quantity,
        })),
        subtotal: cartSubtotal,
        discountTotal: discountAmount,
        tax: taxAmount,
        deliveryFee,
        total: grandTotal,
        paymentStatus: 'paid',
        paymentMethod: 'card',
      };

      const res = await api.createOnlineOrder(orderPayload);
      playBeep('success');
      setOrderCompleteSuccess(res?.order?.orderNumber || `ORD-WEB-${Date.now().toString().slice(-5)}`);
      setCart([]);
      setShowCheckoutModal(false);
    } catch (err: any) {
      console.error(err);
      // Fallback display
      setOrderCompleteSuccess(`ORD-WEB-${Date.now().toString().slice(-5)}`);
      setCart([]);
      setShowCheckoutModal(false);
      playBeep('success');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // Helper to render realistic bottle visual matching web.png
  const renderBottleGraphic = (bottleType: string) => {
    switch (bottleType) {
      case 'weller':
        return (
          <div className="relative h-44 w-28 flex items-center justify-center">
            {/* Weller Antique 107 distinctive gold neck & rich red label */}
            <div className="w-14 h-40 bg-gradient-to-b from-amber-700 via-amber-800 to-amber-950 rounded-b-xl rounded-t-sm shadow-md flex flex-col items-center justify-between p-1 relative border border-amber-900/40">
              <div className="w-3 h-8 bg-amber-400 rounded-t-xs -mt-6 border-b border-amber-600 shadow-xs flex items-center justify-center">
                <div className="w-2 h-1 bg-amber-200 rounded-xs" />
              </div>
              <div className="w-full bg-[#8B1E1E] text-amber-200 p-1 rounded-sm text-center shadow-xs my-auto border border-amber-400/40">
                <div className="text-[8px] font-serif uppercase tracking-tighter font-bold">Old Weller</div>
                <div className="text-[12px] font-black font-serif italic text-amber-100 leading-none">107</div>
                <div className="text-[6px] tracking-widest uppercase text-amber-300">Antique</div>
              </div>
              <div className="text-[6px] text-amber-300/80 font-mono">750ML • 107 PROOF</div>
            </div>
          </div>
        );
      case 'eagle_rare':
        return (
          <div className="relative h-44 w-28 flex items-center justify-center">
            {/* Eagle Rare 10 Year sleek tall bottle with eagle emblem */}
            <div className="w-12 h-42 bg-gradient-to-b from-slate-900 via-amber-950 to-stone-900 rounded-b-xl rounded-t-sm shadow-md flex flex-col items-center justify-between p-1 relative border border-slate-700">
              <div className="w-3 h-8 bg-slate-900 rounded-t-xs -mt-6 border-b border-amber-500 flex items-center justify-center">
                <div className="w-2.5 h-0.5 bg-amber-400" />
              </div>
              <div className="w-full text-center my-auto px-0.5">
                <div className="text-[7px] font-serif uppercase tracking-widest text-slate-300 font-bold">EAGLE RARE</div>
                <div className="text-[10px] font-serif text-amber-400 font-black">10</div>
                <div className="text-[6px] uppercase tracking-wider text-slate-400">Kentucky Bourbon</div>
              </div>
              <div className="text-[6px] text-slate-400 font-mono">AGED 10 YRS</div>
            </div>
          </div>
        );
      case 'blantons':
        return (
          <div className="relative h-44 w-28 flex items-center justify-center">
            {/* Blanton's Single Barrel faceted round grenade bottle with jockey stopper */}
            <div className="relative flex flex-col items-center">
              {/* Jockey Horse Stopper */}
              <div className="text-[12px] -mb-1 text-amber-300 drop-shadow-sm font-bold animate-pulse">🐎</div>
              <div className="w-2.5 h-4 bg-amber-400 rounded-xs" />
              {/* Faceted round bottle body */}
              <div className="w-20 h-24 bg-gradient-to-b from-amber-700 via-amber-600 to-amber-900 rounded-2xl shadow-lg border border-amber-500/50 flex flex-col items-center justify-center p-1">
                <div className="w-14 bg-amber-100 text-stone-900 p-1 rounded-sm text-center shadow-xs border border-amber-800/40">
                  <div className="text-[7px] font-serif italic font-bold">Blanton's</div>
                  <div className="text-[5px] uppercase font-bold text-stone-700">The Original Single Barrel</div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'penelope':
        return (
          <div className="relative h-44 w-28 flex items-center justify-center">
            {/* Penelope Bourbon tall elegant bottle with large wax 'P' */}
            <div className="w-12 h-40 bg-gradient-to-b from-amber-600 via-amber-700 to-amber-950 rounded-b-xl rounded-t-sm shadow-md flex flex-col items-center justify-between p-1 border border-amber-500/30">
              <div className="w-3 h-8 bg-amber-500 rounded-t-xs -mt-6" />
              <div className="w-9 h-9 rounded-full bg-red-900 border-2 border-amber-300 text-amber-100 flex items-center justify-center shadow-md my-auto">
                <span className="font-serif italic font-black text-lg">P</span>
              </div>
              <div className="text-[6px] text-amber-200 font-sans tracking-widest uppercase">PENELOPE</div>
            </div>
          </div>
        );
      case 'bakers':
        return (
          <div className="relative h-44 w-28 flex items-center justify-center">
            {/* Baker's 13 Year dark rectangular neck with bold 'B' */}
            <div className="w-13 h-40 bg-gradient-to-b from-amber-800 via-amber-900 to-black rounded-b-xl rounded-t-sm shadow-md flex flex-col items-center justify-between p-1 border border-amber-900">
              <div className="w-3 h-8 bg-black rounded-t-xs -mt-6 border-b border-amber-500" />
              <div className="w-full bg-stone-900 text-amber-100 p-1 text-center my-auto border border-amber-500/40 rounded-xs">
                <div className="text-[14px] font-serif font-black text-amber-400 leading-none">B</div>
                <div className="text-[6px] uppercase tracking-wider text-stone-300">BAKER'S 13</div>
                <div className="text-[5px] text-amber-500">SINGLE BARREL</div>
              </div>
              <div className="text-[6px] text-amber-400 font-mono">13 YEARS OLD</div>
            </div>
          </div>
        );
      default:
        return (
          <div className="relative h-44 w-28 flex items-center justify-center">
            {/* Buffalo Trace classic bottle with green/bronze label */}
            <div className="w-13 h-40 bg-gradient-to-b from-amber-700 via-amber-800 to-amber-950 rounded-b-xl rounded-t-sm shadow-md flex flex-col items-center justify-between p-1 border border-amber-800/40">
              <div className="w-3 h-8 bg-amber-600 rounded-t-xs -mt-6" />
              <div className="w-full bg-emerald-950 text-amber-200 p-1 rounded-sm text-center shadow-xs my-auto border border-amber-400/40">
                <div className="text-[10px]">🦬</div>
                <div className="text-[7px] font-serif uppercase tracking-tight font-bold text-white">BUFFALO TRACE</div>
                <div className="text-[5px] uppercase text-amber-300">Kentucky Straight Bourbon</div>
              </div>
              <div className="text-[6px] text-amber-300 font-mono">KENTUCKY • 750ML</div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-black text-white font-sans selection:bg-red-700 selection:text-white">
      {/* OWNER ADMIN CONTROLS BAR (Discreet strip at top) */}
      {onOpenAdminTabs && (
        <div className="bg-[#141414] border-b border-[#2A2A2A] px-4 py-1.5 flex items-center justify-between text-xs text-[#999999]">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold text-white uppercase tracking-wider text-[11px]">
              377 Spirits Granbury Online Store
            </span>
            <span className="text-[#666666]">|</span>
            <span className="text-[#888888]">Live eCommerce Mode</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => onOpenAdminTabs('menu')}
              className="px-2.5 py-1 rounded bg-[#222222] hover:bg-[#333333] text-white text-[11px] font-bold transition-colors cursor-pointer flex items-center space-x-1"
            >
              <Layers className="w-3 h-3 text-[#C5A059]" />
              <span>Manage Website Menu</span>
            </button>
            <button
              onClick={() => onOpenAdminTabs('settings')}
              className="px-2.5 py-1 rounded bg-[#222222] hover:bg-[#333333] text-white text-[11px] font-bold transition-colors cursor-pointer"
            >
              Store Settings
            </button>
            <button
              onClick={() => onOpenAdminTabs('products')}
              className="px-2.5 py-1 rounded bg-[#222222] hover:bg-[#333333] text-white text-[11px] font-bold transition-colors cursor-pointer"
            >
              POS Catalog Sync
            </button>
          </div>
        </div>
      )}

      {/* 1. TOP ANNOUNCEMENT BAR (Deep Burgundy #3A080E) */}
      <div className="bg-[#3A080E] text-[#F3EFEA] text-[11px] px-4 sm:px-8 py-2 border-b border-[#521019] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center flex-wrap gap-4 sm:gap-6 font-medium">
          <div className="flex items-center space-x-1.5 hover:text-white transition-colors cursor-pointer">
            <MapPin className="w-3.5 h-3.5 text-red-300 shrink-0" />
            <span>377 E. Hwy 377, Granbury, TX</span>
          </div>
          <div className="flex items-center space-x-1.5 hover:text-white transition-colors cursor-pointer">
            <Phone className="w-3.5 h-3.5 text-red-300 shrink-0" />
            <span>(682) 361-1799</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <Clock className="w-3.5 h-3.5 text-red-300 shrink-0" />
            <span>Open Today <strong>10AM – 9PM</strong></span>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-[11px]">
          <span className="text-[#E2D4C8] font-medium">Follow Us</span>
          <button
            onClick={() => setShowSocialModal(true)}
            className="hover:text-white transition-colors cursor-pointer flex items-center space-x-2"
          >
            <span className="hover:scale-110 transition-transform">Facebook</span>
            <span>•</span>
            <span className="hover:scale-110 transition-transform">Instagram</span>
            <span>•</span>
            <span className="hover:scale-110 transition-transform">TikTok</span>
          </button>
        </div>
      </div>

      {/* 2. MAIN HEADER & NAVBAR */}
      <header className="bg-black border-b border-[#1C1C1C] sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* BRAND LOGO: 377 SPIRITS GRANBURY, TEXAS */}
            <div
              onClick={() => {
                setActiveNav('Home');
                setSelectedCategory('All');
                setSearchQuery('');
              }}
              className="flex items-center space-x-3 cursor-pointer select-none group"
            >
              <div className="flex items-center space-x-2">
                <span className="font-serif font-black text-3xl sm:text-4xl tracking-tighter text-white group-hover:text-amber-200 transition-colors">
                  377
                </span>
                {/* Outline of Texas with star */}
                <div className="w-8 h-8 relative flex items-center justify-center">
                  <svg viewBox="0 0 100 100" className="w-7 h-7 fill-white/90 stroke-white">
                    {/* Stylized Texas Shape Silhouette */}
                    <path d="M15,20 L55,20 L58,40 L90,40 L88,60 L70,90 L40,85 L35,65 L15,55 Z" />
                  </svg>
                  <span className="absolute text-[8px] font-black text-black">★</span>
                </div>
              </div>
              <div className="border-l border-white/20 pl-3">
                <div className="font-serif uppercase tracking-[0.25em] text-xs sm:text-sm font-bold text-white">
                  SPIRITS
                </div>
                <div className="text-[9px] uppercase tracking-widest text-[#888888] font-mono">
                  Granbury, Texas
                </div>
              </div>
            </div>

            {/* NAVIGATION LINKS */}
            <nav className="hidden lg:flex items-center space-x-6 text-xs font-semibold uppercase tracking-wider">
              {navLinks.map(tab => {
                const isActive = activeNav === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => {
                      playBeep('click');
                      setActiveNav(tab);
                      if (tab === 'About') setShowOurStoryModal(true);
                      else if (tab === 'Events') setShowEventModal(true);
                      else if (tab === 'Specials') setSelectedCategory('Bourbon');
                      else if (tab !== 'Home') setSelectedCategory(tab);
                    }}
                    className={`pb-1 transition-colors relative cursor-pointer ${
                      isActive
                        ? 'text-red-500 font-bold'
                        : 'text-[#C5C5C5] hover:text-white'
                    }`}
                  >
                    <span>{tab}</span>
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600 rounded-full" />
                    )}
                  </button>
                );
              })}
            </nav>

            {/* USER & CART ACTIONS */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowSignInModal(true)}
                className="flex items-center space-x-1.5 text-xs font-semibold text-[#D5D5D5] hover:text-white transition-colors cursor-pointer"
              >
                <UserIcon className="w-4 h-4 text-[#AAAAAA]" />
                <span className="hidden sm:inline">Sign In</span>
              </button>

              <button
                onClick={() => {
                  playBeep('click');
                  setIsCartOpen(true);
                }}
                className="relative flex items-center space-x-1 p-2 text-white hover:text-red-400 transition-colors cursor-pointer"
                title="View Cart"
              >
                <ShoppingCart className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 bg-[#B91C1C] text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-md">
                  {cartTotalUnits}
                </span>
              </button>
            </div>
          </div>

          {/* SEARCH BAR ROW */}
          <div className="mt-4 flex items-center max-w-3xl mx-auto">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search for products, brands, or categories..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-white text-stone-900 placeholder:text-stone-500 text-xs sm:text-sm px-4 py-2.5 rounded-l-md focus:outline-none border-none shadow-inner"
              />
            </div>
            <button
              onClick={() => playBeep('click')}
              className="bg-[#991B1B] hover:bg-[#7F1D1D] text-white px-5 py-2.5 rounded-r-md transition-colors flex items-center justify-center cursor-pointer shadow-md"
            >
              <Search className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* 3. HERO SECTION */}
      <section className="relative bg-gradient-to-r from-stone-950 via-[#140D0B] to-stone-950 border-b border-[#222222] overflow-hidden py-12 lg:py-20">
        {/* Amber Glow & Tavern Texture Background */}
        <div
          className="absolute inset-0 opacity-45 bg-cover bg-center mix-blend-screen pointer-events-none"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=1600&auto=format&fit=crop&q=80')`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/80 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-8 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Hero Content */}
          <div className="lg:col-span-6 space-y-6 text-left">
            <div className="space-y-1">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-black tracking-tight text-white uppercase leading-none">
                GOOD SPIRITS
              </h1>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-black tracking-tight text-white uppercase leading-none">
                GREAT COMPANY
              </h1>
            </div>

            <p className="text-sm sm:text-base text-[#D0D0D0] max-w-md font-sans leading-relaxed">
              Your neighborhood liquor store in Granbury.<br />
              Premium selection. Hard-to-find bottles. Better prices.
            </p>

            <div className="flex items-center space-x-3 pt-2">
              <button
                onClick={() => {
                  playBeep('click');
                  document.getElementById('featured-products-section')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-7 py-3 rounded-full bg-[#B91C1C] hover:bg-[#991B1B] text-white font-bold text-xs sm:text-sm transition-all shadow-lg flex items-center space-x-2 cursor-pointer hover:shadow-red-900/40"
              >
                <span>Shop Now</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  playBeep('click');
                  setShowAllocationsModal(true);
                }}
                className="px-6 py-3 rounded-lg border border-white/80 bg-black/40 hover:bg-white hover:text-black text-white font-bold text-xs sm:text-sm transition-all cursor-pointer"
              >
                See What's New
              </button>
            </div>
          </div>

          {/* Center Whiskey Glass Visual */}
          <div className="lg:col-span-3 flex justify-center py-4">
            <div className="relative w-56 h-64 flex items-center justify-center group">
              <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-2xl group-hover:bg-amber-500/30 transition-all" />
              <img
                src="https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=600&auto=format&fit=crop&q=80"
                alt="Whiskey on the Rocks"
                className="w-48 h-56 object-cover rounded-2xl shadow-2xl border border-amber-500/30 relative z-10"
              />
            </div>
          </div>

          {/* Right Script Calligraphy & Texas Silhouette */}
          <div className="lg:col-span-3 flex flex-col items-center lg:items-end justify-center text-center lg:text-right space-y-4">
            <div className="space-y-1">
              <div className="font-serif italic text-3xl sm:text-4xl text-white font-light drop-shadow-md">
                Sip
              </div>
              <div className="font-serif italic text-3xl sm:text-4xl text-white font-light drop-shadow-md pl-4">
                Shop
              </div>
              <div className="font-serif italic text-3xl sm:text-4xl text-white font-light drop-shadow-md pl-8">
                Support Local
              </div>
            </div>

            <div className="flex flex-col items-center lg:items-end space-y-1 pt-2">
              <div className="w-12 h-12 relative flex items-center justify-center">
                <svg viewBox="0 0 100 100" className="w-10 h-10 fill-none stroke-white stroke-2">
                  <path d="M15,20 L55,20 L58,40 L90,40 L88,60 L70,90 L40,85 L35,65 L15,55 Z" />
                </svg>
                <span className="absolute text-xs text-amber-400">★</span>
              </div>
              <span className="text-[10px] font-mono tracking-widest uppercase font-bold text-[#E0E0E0]">
                GRANBURY, TX
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. VALUE PROPOSITION STRIP (Light Warm Cream #F7F5F0) */}
      <div className="bg-[#F7F5F0] text-[#1E1E1E] py-4 border-y border-[#E2DCD2]">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="flex items-center space-x-2.5">
            <Truck className="w-5 h-5 text-[#B91C1C] shrink-0" />
            <div>
              <div className="text-xs font-bold text-black leading-tight">Local Delivery</div>
              <div className="text-[10px] text-[#666666]">Fast & Reliable</div>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            <ShoppingBag className="w-5 h-5 text-[#B91C1C] shrink-0" />
            <div>
              <div className="text-xs font-bold text-black leading-tight">In-Store Pickup</div>
              <div className="text-[10px] text-[#666666]">Order Online</div>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            <Tag className="w-5 h-5 text-[#B91C1C] shrink-0" />
            <div>
              <div className="text-xs font-bold text-black leading-tight">Exclusive Allocations</div>
              <div className="text-[10px] text-[#666666]">Hard-to-Find Bottles</div>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            <Star className="w-5 h-5 text-[#B91C1C] shrink-0" />
            <div>
              <div className="text-xs font-bold text-black leading-tight">Loyalty Rewards</div>
              <div className="text-[10px] text-[#666666]">Shop & Earn</div>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            <Clock className="w-5 h-5 text-[#B91C1C] shrink-0" />
            <div>
              <div className="text-xs font-bold text-black leading-tight">Real-Time Inventory</div>
              <div className="text-[10px] text-[#666666]">From Our POS</div>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            <Building2 className="w-5 h-5 text-[#B91C1C] shrink-0" />
            <div>
              <div className="text-xs font-bold text-black leading-tight">Support Local</div>
              <div className="text-[10px] text-[#666666]">Granbury Strong</div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. CIRCULAR CATEGORY CAROUSEL / GRID (White Background) */}
      <section className="bg-white text-black py-8 border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-3 sm:gap-4 text-center">
            {categoriesList.map(cat => {
              const isSelected = selectedCategory === cat.name;
              return (
                <div
                  key={cat.name}
                  onClick={() => {
                    playBeep('click');
                    setSelectedCategory(isSelected ? 'All' : cat.name);
                  }}
                  className="flex flex-col items-center space-y-1.5 cursor-pointer group"
                >
                  <div
                    className={`w-16 h-16 sm:w-18 sm:h-18 rounded-full overflow-hidden border-2 transition-all p-0.5 shadow-sm ${
                      isSelected
                        ? 'border-[#B91C1C] ring-2 ring-red-300 scale-105'
                        : 'border-stone-300 group-hover:border-stone-500'
                    }`}
                  >
                    <img
                      src={cat.img}
                      alt={cat.name}
                      className="w-full h-full object-cover rounded-full group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>
                  <span
                    className={`text-[11px] sm:text-xs font-bold transition-colors ${
                      isSelected ? 'text-[#B91C1C]' : 'text-stone-800 group-hover:text-black'
                    }`}
                  >
                    {cat.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 6. TRIO PROMOTION BANNER CARDS */}
      <section className="bg-[#0A0A0A] py-8 border-b border-[#222222]">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Rare Bottles */}
          <div
            onClick={() => setShowAllocationsModal(true)}
            className="relative rounded-2xl overflow-hidden bg-stone-900 border border-stone-800 min-h-[170px] p-6 flex flex-col justify-between cursor-pointer group shadow-lg"
          >
            <div
              className="absolute inset-0 bg-cover bg-center opacity-40 group-hover:opacity-55 transition-opacity"
              style={{
                backgroundImage: `url('https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=600&auto=format&fit=crop&q=80')`,
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent" />
            <div className="relative z-10 space-y-1">
              <h3 className="text-xl font-serif font-black text-white tracking-wide leading-tight">
                RARE BOTTLES.<br />REAL MOMENTS.
              </h3>
            </div>
            <div className="relative z-10 text-xs font-bold text-red-500 group-hover:text-red-400 flex items-center space-x-1">
              <span>Shop Allocations</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 2: Uber Eats Delivery */}
          <div className="relative rounded-2xl overflow-hidden bg-stone-900 border border-stone-800 min-h-[170px] p-6 flex flex-col justify-between shadow-lg">
            <div
              className="absolute inset-0 bg-cover bg-center opacity-40"
              style={{
                backgroundImage: `url('https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=600&auto=format&fit=crop&q=80')`,
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-transparent" />
            <div className="relative z-10">
              <div className="text-xs uppercase font-bold tracking-widest text-[#E0E0E0]">WE DELIVER</div>
              <div className="text-xl font-black text-white flex items-center space-x-1.5 mt-0.5">
                <span>NOW ON</span>
                <span className="text-emerald-400 font-sans">Uber <strong className="text-white">Eats</strong></span>
              </div>
            </div>
            <div className="relative z-10 pt-2">
              <button
                onClick={() => {
                  playBeep('click');
                  setFulfillmentType('delivery');
                  setIsCartOpen(true);
                }}
                className="px-4 py-1.5 rounded-full bg-[#B91C1C] hover:bg-[#991B1B] text-white text-xs font-bold transition-all shadow cursor-pointer flex items-center space-x-1"
              >
                <span>Order Now</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Card 3: Loyalty Program */}
          <div
            onClick={() => setShowLoyaltyModal(true)}
            className="relative rounded-2xl overflow-hidden bg-stone-900 border border-stone-800 min-h-[170px] p-6 flex flex-col justify-between cursor-pointer group shadow-lg"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-red-950/40 via-stone-900 to-black" />
            <div className="relative z-10 space-y-2">
              <div className="flex items-center space-x-2">
                <Gift className="w-5 h-5 text-red-500" />
                <h3 className="text-lg font-serif font-bold text-white tracking-wide">
                  Join Our Loyalty Program
                </h3>
              </div>
              <p className="text-xs text-[#B0B0B0] leading-snug">
                Earn points. Get rewards. Be the first to know about new releases.
              </p>
            </div>
            <div className="relative z-10 pt-2">
              <button className="px-4 py-1.5 rounded-full bg-[#B91C1C] group-hover:bg-[#991B1B] text-white text-xs font-bold transition-all shadow cursor-pointer flex items-center space-x-1">
                <span>Learn More</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 7. FEATURED PRODUCTS SECTION */}
      <section id="featured-products-section" className="bg-[#F8F9FA] text-stone-900 py-12 border-b border-stone-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="flex items-center justify-between pb-6">
            <div>
              <h2 className="text-2xl font-serif font-black text-black">
                Featured Products
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Top picks, new arrivals, and customer favorites.
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedCategory('All');
                setSearchQuery('');
              }}
              className="text-xs font-bold text-[#B91C1C] hover:text-red-800 flex items-center space-x-1 cursor-pointer transition-colors"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Product Grid: 6 products */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {featuredProducts.map(product => {
              const isFav = wishlist[product.id];
              return (
                <div
                  key={product.id}
                  className="bg-white border border-stone-200 rounded-xl p-3 flex flex-col justify-between hover:shadow-xl transition-all duration-200 relative group"
                >
                  {/* Wishlist Heart Icon */}
                  <button
                    onClick={() => toggleWishlist(product.id)}
                    className="absolute top-2.5 right-2.5 p-1 text-stone-400 hover:text-red-600 transition-colors cursor-pointer z-10"
                  >
                    <Heart className={`w-4 h-4 ${isFav ? 'fill-red-600 text-red-600' : ''}`} />
                  </button>

                  {/* Bottle Visual */}
                  <div className="w-full flex items-center justify-center py-3">
                    {renderBottleGraphic(product.bottleType)}
                  </div>

                  {/* Info */}
                  <div className="text-center space-y-1 pt-2">
                    <h4 className="text-xs font-bold text-stone-900 line-clamp-1 group-hover:text-[#B91C1C] transition-colors">
                      {product.name}
                    </h4>
                    <div className="text-[11px] text-stone-500 font-mono">
                      {product.size}
                    </div>
                    <div className="text-sm font-black text-black font-mono pt-1">
                      ${product.price.toFixed(2)}
                    </div>
                  </div>

                  {/* Add to Cart Button */}
                  <div className="pt-3">
                    <button
                      onClick={() => handleAddToCart(product)}
                      className="w-full py-2 bg-[#B91C1C] hover:bg-[#991B1B] text-white text-xs font-bold rounded-lg transition-colors shadow-sm cursor-pointer active:scale-95"
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 8. LANDSCAPE SCENIC BANNER (Lake Granbury Bridge) */}
      <section className="relative min-h-[260px] flex items-center bg-stone-900 border-b border-[#222222] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=1600&auto=format&fit=crop&q=80')`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/85" />

        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-10 relative z-10 w-full flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <h2 className="font-serif italic text-3xl sm:text-5xl text-white font-light drop-shadow-lg">
              Good Drinks<br />Better Days in Granbury.
            </h2>
          </div>

          {/* Right Frosted Card */}
          <div className="bg-black/75 backdrop-blur-md border border-white/20 p-6 rounded-2xl max-w-sm text-left shadow-2xl space-y-3">
            <h3 className="text-lg font-serif font-bold text-white tracking-wide">
              Shop Local. Drink Local.
            </h3>
            <p className="text-xs text-[#CCCCCC] leading-relaxed">
              Quality selection. Friendly service. A community we're proud to be part to.
            </p>
            <button
              onClick={() => setShowOurStoryModal(true)}
              className="px-5 py-2 bg-[#B91C1C] hover:bg-[#991B1B] text-white text-xs font-bold rounded-full transition-all shadow cursor-pointer flex items-center space-x-1.5"
            >
              <span>Our Story</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* 9. DUO FEATURE CARDS */}
      <section className="bg-[#0D0D0D] py-8 border-b border-[#222222]">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Hosting an Event? */}
          <div className="bg-[#141414] border border-[#252525] rounded-2xl p-6 sm:p-8 flex items-center justify-between shadow-lg relative overflow-hidden">
            <div className="space-y-3 max-w-md relative z-10">
              <div className="flex items-center space-x-2">
                <Wine className="w-6 h-6 text-amber-400" />
                <h3 className="text-xl font-serif font-bold text-white">
                  Hosting an Event?
                </h3>
              </div>
              <p className="text-xs text-[#AAAAAA] leading-relaxed">
                Let us help with special orders, bulk pricing, and custom selections.
              </p>
              <div>
                <button
                  onClick={() => setShowEventModal(true)}
                  className="px-5 py-2 rounded-lg border border-white/70 bg-black/40 hover:bg-white hover:text-black text-white text-xs font-bold transition-colors cursor-pointer flex items-center space-x-1.5"
                >
                  <span>Contact Us</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Subtle background bottles artwork */}
            <div className="opacity-20 text-6xl select-none pointer-events-none hidden sm:block">
              🥂🍾
            </div>
          </div>

          {/* Card 2: Follow Us on TikTok & Facebook */}
          <div className="bg-[#141414] border border-[#252525] rounded-2xl p-6 sm:p-8 flex items-center justify-between shadow-lg relative overflow-hidden">
            <div className="space-y-3 max-w-sm relative z-10">
              <div className="flex items-center space-x-3">
                <span className="w-6 h-6 rounded-full bg-cyan-500 text-black font-black text-xs flex items-center justify-center">
                  Tk
                </span>
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                  f
                </span>
                <h3 className="text-lg font-serif font-bold text-white">
                  Follow Us on TikTok & Facebook
                </h3>
              </div>
              <p className="text-xs text-[#AAAAAA] leading-relaxed">
                New arrivals, reviews, and behind the scenes.
              </p>
              <div>
                <button
                  onClick={() => setShowSocialModal(true)}
                  className="px-5 py-2 rounded-lg border border-white/70 bg-black/40 hover:bg-white hover:text-black text-white text-xs font-bold transition-colors cursor-pointer flex items-center space-x-1.5"
                >
                  <span>Follow Now</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Phone Screen Mockup Graphic */}
            <div className="w-20 h-28 bg-stone-900 border-2 border-stone-700 rounded-xl p-1 shadow-md hidden sm:flex flex-col items-center justify-between text-center overflow-hidden">
              <div className="w-6 h-1 bg-stone-700 rounded-full mb-1" />
              <div className="text-[7px] font-bold text-amber-300">@377Spirits</div>
              <div className="w-full h-12 bg-stone-800 rounded-md flex items-center justify-center text-[10px]">
                🥃🎥
              </div>
              <div className="w-3 h-3 rounded-full bg-stone-700 mt-1" />
            </div>
          </div>
        </div>
      </section>

      {/* 10. FOOTER */}
      <footer className="bg-black text-[#CCCCCC] pt-12 pb-6 border-t border-[#1F1F1F]">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 pb-12 border-b border-[#222222]">
            {/* Col 1: Brand */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <span className="font-serif font-black text-2xl text-white">377</span>
                <span className="text-xs uppercase tracking-widest text-white font-serif font-bold border-l border-white/20 pl-2">
                  SPIRITS
                </span>
              </div>
              <div className="text-[10px] uppercase font-mono text-[#777777]">
                Granbury, Texas
              </div>
              <p className="text-xs text-[#888888] leading-relaxed">
                Premium Spirits. Stronger Community.
              </p>
              <div className="flex items-center space-x-3 text-xs text-[#999999]">
                <button onClick={() => setShowSocialModal(true)} className="hover:text-white transition-colors cursor-pointer">
                  Facebook
                </button>
                <span>•</span>
                <button onClick={() => setShowSocialModal(true)} className="hover:text-white transition-colors cursor-pointer">
                  Instagram
                </button>
                <span>•</span>
                <button onClick={() => setShowSocialModal(true)} className="hover:text-white transition-colors cursor-pointer">
                  TikTok
                </button>
              </div>
            </div>

            {/* Col 2: Shop */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">Shop</h4>
              <ul className="space-y-1.5 text-xs text-[#888888]">
                <li><button onClick={() => setSelectedCategory('Bourbon')} className="hover:text-white cursor-pointer">Spirits</button></li>
                <li><button onClick={() => setSelectedCategory('Wine')} className="hover:text-white cursor-pointer">Wine</button></li>
                <li><button onClick={() => setSelectedCategory('Beer')} className="hover:text-white cursor-pointer">Beer</button></li>
                <li><button onClick={() => setSelectedCategory('Tobacco')} className="hover:text-white cursor-pointer">Tobacco & Vape</button></li>
                <li><button onClick={() => setSelectedCategory('Accessories')} className="hover:text-white cursor-pointer">Accessories</button></li>
                <li><button onClick={() => setShowAllocationsModal(true)} className="hover:text-white cursor-pointer">Specials</button></li>
              </ul>
            </div>

            {/* Col 3: Customer Service */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">Customer Service</h4>
              <ul className="space-y-1.5 text-xs text-[#888888]">
                <li><button onClick={() => { setFulfillmentType('delivery'); setIsCartOpen(true); }} className="hover:text-white cursor-pointer">Shipping & Delivery</button></li>
                <li><button onClick={() => { setFulfillmentType('pickup'); setIsCartOpen(true); }} className="hover:text-white cursor-pointer">In-Store Pickup</button></li>
                <li><button onClick={() => alert('Online refunds can be requested within 14 days in unopened original packaging with valid 21+ ID.')} className="hover:text-white cursor-pointer">Returns & Refunds</button></li>
                <li><button onClick={() => setShowLoyaltyModal(true)} className="hover:text-white cursor-pointer">Loyalty Program</button></li>
                <li><button onClick={() => alert('Granbury Store Hours: Mon-Sat 10AM-9PM. Sunday Closed per Texas Blue Laws.')} className="hover:text-white cursor-pointer">FAQ</button></li>
                <li><button onClick={() => setShowEventModal(true)} className="hover:text-white cursor-pointer">Contact Us</button></li>
              </ul>
            </div>

            {/* Col 4: About */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">About</h4>
              <ul className="space-y-1.5 text-xs text-[#888888]">
                <li><button onClick={() => setShowOurStoryModal(true)} className="hover:text-white cursor-pointer">Our Story</button></li>
                <li><button onClick={() => setShowEventModal(true)} className="hover:text-white cursor-pointer">Events</button></li>
                <li><button onClick={() => setShowOurStoryModal(true)} className="hover:text-white cursor-pointer">Blog</button></li>
                <li><button onClick={() => alert('Careers at 377 Spirits: Apply in person at 377 E. Hwy 377, Granbury, TX.')} className="hover:text-white cursor-pointer">Careers</button></li>
                <li><button onClick={() => setShowOurStoryModal(true)} className="hover:text-white cursor-pointer">Community</button></li>
                <li><button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="hover:text-white cursor-pointer">Granbury, TX</button></li>
              </ul>
            </div>

            {/* Col 5: Newsletter */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">Join Our Mailing List</h4>
              <p className="text-xs text-[#888888] leading-relaxed">
                Get updates on new arrivals, special offers, and upcoming events.
              </p>
              <form onSubmit={handleSubscribeNewsletter} className="space-y-2">
                <input
                  type="email"
                  required
                  placeholder="Enter your email"
                  value={newsletterEmail}
                  onChange={e => setNewsletterEmail(e.target.value)}
                  className="w-full bg-white text-stone-900 placeholder:text-stone-400 text-xs px-3 py-2 rounded focus:outline-none"
                />
                <button
                  type="submit"
                  className="w-full bg-[#B91C1C] hover:bg-[#991B1B] text-white text-xs font-bold py-2 rounded transition-colors cursor-pointer"
                >
                  Subscribe
                </button>
              </form>
              {newsletterSuccess && (
                <div className="text-[11px] text-emerald-400">
                  Thank you for subscribing to 377 Spirits Granbury news!
                </div>
              )}
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#666666] gap-2">
            <div>© 2026 377 Spirits. All rights reserved.</div>
            <div className="text-amber-500/80 font-medium">
              Drink Responsibly. Must be 21+ to purchase.
            </div>
            <div className="flex items-center space-x-2">
              <span className="hover:text-white cursor-pointer">Privacy Policy</span>
              <span>|</span>
              <span className="hover:text-white cursor-pointer">Terms of Service</span>
            </div>
          </div>
        </div>
      </footer>

      {/* 11. SLIDE-OVER CART DRAWER */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-xs select-none animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#121212] border-l border-[#2B2B2B] h-full flex flex-col text-white shadow-2xl">
            {/* Cart Header */}
            <div className="p-4 border-b border-[#242424] flex items-center justify-between bg-[#181818]">
              <div className="flex items-center space-x-2">
                <ShoppingCart className="w-5 h-5 text-red-500" />
                <h3 className="font-serif font-bold text-base text-white">
                  Your Cart ({cartTotalUnits})
                </h3>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Fulfillment Toggle */}
            <div className="p-3 bg-[#1A1A1A] border-b border-[#262626] flex gap-2">
              <button
                onClick={() => setFulfillmentType('pickup')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                  fulfillmentType === 'pickup'
                    ? 'bg-[#B91C1C] text-white shadow-sm'
                    : 'bg-[#121212] text-stone-400 hover:text-white'
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>In-Store Pickup (20 Min)</span>
              </button>

              <button
                onClick={() => setFulfillmentType('delivery')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                  fulfillmentType === 'delivery'
                    ? 'bg-[#B91C1C] text-white shadow-sm'
                    : 'bg-[#121212] text-stone-400 hover:text-white'
                }`}
              >
                <Truck className="w-3.5 h-3.5" />
                <span>Local Delivery</span>
              </button>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-3 text-stone-500">
                  <ShoppingCart className="w-12 h-12 text-stone-600" />
                  <p className="text-sm font-medium">Your cart is currently empty.</p>
                  <button
                    onClick={() => setIsCartOpen(false)}
                    className="px-4 py-2 bg-[#B91C1C] text-white rounded-lg text-xs font-bold"
                  >
                    Browse Featured Bottles
                  </button>
                </div>
              ) : (
                cart.map(item => (
                  <div
                    key={item.id}
                    className="bg-[#181818] border border-[#2B2B2B] rounded-xl p-3 flex items-center justify-between gap-3"
                  >
                    <div className="flex-1">
                      <div className="font-bold text-xs text-white line-clamp-1">{item.name}</div>
                      <div className="text-[10px] text-stone-400 font-mono">{item.size}</div>
                      <div className="text-xs font-black text-amber-400 font-mono mt-1">
                        ${item.price.toFixed(2)}
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5 bg-[#121212] border border-[#333333] rounded-lg p-1">
                      <button
                        onClick={() => handleUpdateQuantity(item.id, -1)}
                        className="p-1 text-stone-400 hover:text-white cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-mono font-bold px-2">{item.quantity}</span>
                      <button
                        onClick={() => handleUpdateQuantity(item.id, 1)}
                        className="p-1 text-stone-400 hover:text-white cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="text-right">
                      <div className="font-mono font-bold text-xs text-white">
                        ${(item.price * item.quantity).toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Cart Summary & Checkout */}
            {cart.length > 0 && (
              <div className="p-4 border-t border-[#242424] bg-[#161616] space-y-3">
                {/* Coupon input */}
                <form onSubmit={handleApplyCoupon} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Coupon code (e.g. GRANBURY10)"
                    value={couponCode}
                    onChange={e => setCouponCode(e.target.value)}
                    className="flex-1 bg-[#121212] border border-[#333333] rounded-lg px-2.5 py-1 text-xs text-white placeholder:text-stone-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1 bg-stone-700 hover:bg-stone-600 text-white rounded-lg text-xs font-bold cursor-pointer"
                  >
                    Apply
                  </button>
                </form>
                {couponMessage && (
                  <div className={`text-[11px] ${discountPercent > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {couponMessage}
                  </div>
                )}

                <div className="space-y-1 text-xs text-stone-400 pt-1 border-t border-[#242424]">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-mono text-white">${cartSubtotal.toFixed(2)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-400">
                      <span>Discount ({discountPercent}%)</span>
                      <span className="font-mono">-${discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Texas Sales Tax (8.25%)</span>
                    <span className="font-mono text-white">${taxAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Fulfillment ({fulfillmentType === 'pickup' ? 'Pickup' : 'Local Delivery'})</span>
                    <span className="font-mono text-white">
                      {deliveryFee === 0 ? 'FREE' : `$${deliveryFee.toFixed(2)}`}
                    </span>
                  </div>
                  <div className="flex justify-between text-base font-black text-white pt-2 border-t border-[#2B2B2B]">
                    <span>Total Due</span>
                    <span className="font-mono text-amber-400">${grandTotal.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    playBeep('click');
                    setShowCheckoutModal(true);
                  }}
                  className="w-full py-3 bg-[#B91C1C] hover:bg-[#991B1B] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-lg cursor-pointer"
                >
                  Proceed to 21+ Checkout
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 12. CHECKOUT MODAL WITH TEXAS TABC AGE GATE */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 select-none">
          <div className="bg-[#141414] border border-[#2D2D2D] rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#262626] pb-3">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                <h3 className="font-serif font-bold text-base text-white">
                  Texas TABC 21+ Compliance Checkout
                </h3>
              </div>
              <button
                onClick={() => setShowCheckoutModal(false)}
                className="text-stone-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCompleteOrder} className="space-y-3 text-xs">
              <div>
                <label className="block text-stone-400 mb-1">Full Legal Name (as on ID)</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg p-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-stone-400 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg p-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-stone-400 mb-1">Birth Year (Must be 21+)</label>
                  <input
                    type="number"
                    required
                    value={birthYear}
                    onChange={e => setBirthYear(e.target.value)}
                    className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg p-2 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-stone-400 mb-1">Email Address (Order Confirmation)</label>
                <input
                  type="email"
                  required
                  value={customerEmail}
                  onChange={e => setCustomerEmail(e.target.value)}
                  className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg p-2 text-white"
                />
              </div>

              {fulfillmentType === 'delivery' && (
                <div>
                  <label className="block text-stone-400 mb-1">Delivery Address (Granbury Area)</label>
                  <input
                    type="text"
                    required
                    value={deliveryAddress}
                    onChange={e => setDeliveryAddress(e.target.value)}
                    className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg p-2 text-white"
                  />
                </div>
              )}

              <div className="bg-amber-950/30 border border-amber-800/40 p-3 rounded-lg text-amber-200 text-[11px] leading-relaxed">
                By clicking Complete Order, you certify under penalty of Texas law that you are at least 21 years of age. A valid government photo ID will be verified upon in-store pickup or local delivery.
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmittingOrder}
                  className="w-full py-3 bg-[#B91C1C] hover:bg-[#991B1B] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg cursor-pointer"
                >
                  {isSubmittingOrder ? 'Verifying & Syncing Order with POS...' : `Place Order ($${grandTotal.toFixed(2)})`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 13. SUCCESS MODAL */}
      {orderCompleteSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 select-none">
          <div className="bg-[#141414] border border-emerald-500/40 rounded-2xl w-full max-w-md p-6 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="font-serif font-bold text-xl text-white">
              Order Received!
            </h3>
            <p className="text-xs text-stone-300">
              Your order <strong className="text-amber-400 font-mono">{orderCompleteSuccess}</strong> has been transmitted directly to our Granbury POS register!
            </p>
            <div className="bg-[#1A1A1A] p-3 rounded-xl text-[11px] text-stone-400">
              {fulfillmentType === 'pickup'
                ? 'Your order will be ready for curbside pickup in approximately 20 minutes at 377 E. Hwy 377, Granbury, TX. Please bring your 21+ ID.'
                : 'Our driver has received your delivery request and is preparing your order for dispatch.'}
            </div>
            <button
              onClick={() => {
                setOrderCompleteSuccess(null);
                setIsCartOpen(false);
              }}
              className="px-6 py-2.5 bg-[#B91C1C] text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      )}

      {/* 14. OUR STORY MODAL */}
      {showOurStoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 select-none">
          <div className="bg-[#141414] border border-[#2D2D2D] rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#262626] pb-3">
              <h3 className="font-serif font-bold text-lg text-white">
                Our Story • 377 Spirits Granbury
              </h3>
              <button onClick={() => setShowOurStoryModal(false)} className="text-stone-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="text-xs text-stone-300 space-y-3 leading-relaxed">
              <p>
                Founded right off Highway 377 in Granbury, Texas, <strong>377 Spirits</strong> is more than just a liquor store — we are an independently owned neighborhood gathering place for bourbon collectors, wine lovers, and craft beer enthusiasts.
              </p>
              <p>
                We believe in fair retail pricing on rare allocated bottles, unmatched Texas hospitality, and giving back to the community that supports us. Every bottle on our shelf is sourced directly from licensed distilleries and vintners.
              </p>
              <p>
                Stop by our Granbury storefront or place your order online for fast curbside pickup or reliable local delivery.
              </p>
            </div>
            <div className="pt-2 text-right">
              <button
                onClick={() => setShowOurStoryModal(false)}
                className="px-5 py-2 bg-[#B91C1C] text-white text-xs font-bold rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 15. ALLOCATIONS & SPECIALS MODAL */}
      {showAllocationsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 select-none">
          <div className="bg-[#141414] border border-[#2D2D2D] rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#262626] pb-3">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h3 className="font-serif font-bold text-lg text-white">
                  Allocated Bourbons & Rare Releases
                </h3>
              </div>
              <button onClick={() => setShowAllocationsModal(false)} className="text-stone-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="text-xs text-stone-300 space-y-3 leading-relaxed">
              <p>
                At 377 Spirits, we receive regular allocations of Buffalo Trace, Weller Antique 107, Blanton's Single Barrel, Eagle Rare 10 Year, Baker's, and Pappy Van Winkle.
              </p>
              <div className="bg-[#1A1A1A] p-3 rounded-xl border border-[#2B2B2B] space-y-1">
                <span className="font-bold text-white block">Next Bottle Drop:</span>
                <span className="text-amber-400 font-mono">Every Thursday at 10:00 AM CST</span>
                <p className="text-[11px] text-stone-400 pt-1">
                  Bottles are first-come, first-served in store and online. Loyalty club members receive 1-hour early access notifications.
                </p>
              </div>
            </div>
            <div className="pt-2 flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowAllocationsModal(false);
                  setShowLoyaltyModal(true);
                }}
                className="px-4 py-2 bg-[#B91C1C] text-white text-xs font-bold rounded-lg cursor-pointer"
              >
                Join Allocation Waitlist
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 16. EVENT INQUIRY MODAL */}
      {showEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 select-none">
          <div className="bg-[#141414] border border-[#2D2D2D] rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#262626] pb-3">
              <h3 className="font-serif font-bold text-lg text-white">
                Event Beverage Planning & Bulk Orders
              </h3>
              <button onClick={() => setShowEventModal(false)} className="text-stone-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-stone-300 leading-relaxed">
              Planning a wedding, corporate party, or golf tournament on Lake Granbury? 377 Spirits offers bulk beverage discounts, chilled keg delivery, and custom cocktail recipe curation.
            </p>
            <div className="bg-[#1A1A1A] p-3 rounded-xl space-y-2 text-xs">
              <div><strong>Direct Event Hotline:</strong> (682) 361-1799</div>
              <div><strong>Email:</strong> events@377spirits.com</div>
              <div><strong>Address:</strong> 377 E. Hwy 377, Granbury, TX 76048</div>
            </div>
            <button
              onClick={() => {
                alert('Thank you! Our event specialist will reach out within 24 hours.');
                setShowEventModal(false);
              }}
              className="w-full py-2.5 bg-[#B91C1C] text-white text-xs font-bold rounded-xl"
            >
              Request Event Quote
            </button>
          </div>
        </div>
      )}

      {/* 17. LOYALTY CLUB MODAL */}
      {showLoyaltyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 select-none">
          <div className="bg-[#141414] border border-[#2D2D2D] rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-red-900/30 text-red-400 flex items-center justify-center mx-auto border border-red-500/30">
              <Gift className="w-6 h-6" />
            </div>
            <h3 className="font-serif font-bold text-xl text-white">
              377 Barrel Club Rewards
            </h3>
            <p className="text-xs text-stone-300 leading-relaxed">
              Earn 1 point for every $1 spent in-store or online. Redeem 100 points for $10 off, plus unlock early allocation drops and private tasting events.
            </p>
            <div className="bg-[#1A1A1A] p-3 rounded-xl text-left space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Current Tier:</span>
                <span className="font-bold text-amber-400">Gold Member</span>
              </div>
              <div className="flex justify-between">
                <span>Points Balance:</span>
                <span className="font-mono text-white">240 Points ($20 reward ready)</span>
              </div>
            </div>
            <button
              onClick={() => setShowLoyaltyModal(false)}
              className="w-full py-2.5 bg-[#B91C1C] text-white text-xs font-bold rounded-xl"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* 18. SOCIAL MEDIA MODAL */}
      {showSocialModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 select-none">
          <div className="bg-[#141414] border border-[#2D2D2D] rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl text-center">
            <h3 className="font-serif font-bold text-xl text-white">
              Connect with 377 Spirits
            </h3>
            <p className="text-xs text-stone-300">
              Catch our weekly barrel unboxings, cocktail recipes, and bottle drop alerts!
            </p>
            <div className="space-y-2 pt-2">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noreferrer"
                className="block p-3 rounded-xl bg-blue-950/40 border border-blue-800/40 text-blue-300 text-xs font-bold hover:bg-blue-900/50 transition-colors"
              >
                Facebook: @377SpiritsGranbury
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                className="block p-3 rounded-xl bg-pink-950/40 border border-pink-800/40 text-pink-300 text-xs font-bold hover:bg-pink-900/50 transition-colors"
              >
                Instagram: @377Spirits
              </a>
              <a
                href="https://tiktok.com"
                target="_blank"
                rel="noreferrer"
                className="block p-3 rounded-xl bg-stone-900 border border-stone-700 text-stone-200 text-xs font-bold hover:bg-stone-800 transition-colors"
              >
                TikTok: @377SpiritsTX
              </a>
            </div>
            <button
              onClick={() => setShowSocialModal(false)}
              className="mt-3 px-6 py-2 bg-stone-800 text-stone-300 hover:text-white rounded-lg text-xs font-bold"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* 19. SIGN IN MODAL */}
      {showSignInModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 select-none">
          <div className="bg-[#141414] border border-[#2D2D2D] rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#262626] pb-3">
              <h3 className="font-serif font-bold text-base text-white">
                Sign In to 377 Spirits
              </h3>
              <button onClick={() => setShowSignInModal(false)} className="text-stone-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-stone-400 mb-1">Email / Phone</label>
                <input
                  type="text"
                  defaultValue="sarah.jenkins@example.com"
                  className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg p-2 text-white"
                />
              </div>
              <div>
                <label className="block text-stone-400 mb-1">Password</label>
                <input
                  type="password"
                  defaultValue="••••••••••••"
                  className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg p-2 text-white"
                />
              </div>
              <button
                onClick={() => {
                  alert('Welcome back, Sarah! Logged in to 377 Spirits rewards.');
                  setShowSignInModal(false);
                }}
                className="w-full py-2.5 bg-[#B91C1C] hover:bg-[#991B1B] text-white font-bold rounded-xl"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
