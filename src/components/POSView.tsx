import React, { useState, useMemo, useEffect } from 'react';
import { Product, Category, CartItem, Customer, StoreSettings, User } from '../types';
import { playBeep } from '../utils/audio';
import { posBridge } from '../services/posBridge';
import { CartPanel } from './CartPanel';
import { AddManualItemModal } from './AddManualItemModal';
import { LottoSaleModal } from './pos/LottoSaleModal';
import { LottoPayoutModal } from './pos/LottoPayoutModal';
import { ManualDrawerModal } from './pos/ManualDrawerModal';
import { CartTransferModal } from './pos/CartTransferModal';
import { BottleImage } from './BottleImage';
import {
  Search,
  ScanBarcode,
  Sparkles,
  AlertTriangle,
  XCircle,
  Tag,
  Filter,
  Check,
  ShoppingBag,
  Plus,
  Ticket,
  DollarSign,
  UserCheck,
  Wine,
  Beer,
  CupSoda,
  Package,
  Star,
  Flame,
  GlassWater,
  LayoutGrid,
  List,
  ChevronDown,
  Info,
  MapPin,
  Sun,
  ShieldCheck,
  Landmark,
  Heart,
} from 'lucide-react';

interface POSViewProps {
  products: Product[];
  categories: Category[];
  cartItems: CartItem[];
  onAddToCart: (product: Product) => void;
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
  currentUser: User | null;
  onProductCreated?: (newProduct: Product) => void;
  onOpenScannerModal?: () => void;
}

export const POSView: React.FC<POSViewProps> = ({
  products,
  categories,
  cartItems,
  onAddToCart,
  onUpdateQuantity,
  onSetQuantity,
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
  currentUser,
  onProductCreated,
  onOpenScannerModal,
}) => {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [barcodeInput, setBarcodeInput] = useState<string>('');
  const [mobileCartOpen, setMobileCartOpen] = useState<boolean>(false);
  const [showAddManualModal, setShowAddManualModal] = useState<boolean>(false);
  const [showLottoSaleModal, setShowLottoSaleModal] = useState<boolean>(false);
  const [showLottoPayoutModal, setShowLottoPayoutModal] = useState<boolean>(false);
  const [showManualDrawerModal, setShowManualDrawerModal] = useState<boolean>(false);
  const [showCartTransferModal, setShowCartTransferModal] = useState<boolean>(false);
  const [priceCheckModal, setPriceCheckModal] = useState<boolean>(false);
  const [priceCheckQuery, setPriceCheckQuery] = useState<string>('');
  const [priceCheckResult, setPriceCheckResult] = useState<Product | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'price-asc' | 'price-desc' | 'stock'>('name');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Real-time synchronization to Customer Display (PB-018, PB-019)
  useEffect(() => {
    const rawSubtotal = cartItems.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    );
    const itemDiscounts = cartItems.reduce(
      (sum, item) => sum + (item.discountAmount || 0),
      0
    );
    const orderDiscountAmt =
      orderDiscountAmount + (rawSubtotal * orderDiscountPercent) / 100;
    const discountTotalAll = itemDiscounts + orderDiscountAmt;
    const discountedSubtotal = Math.max(0, rawSubtotal - discountTotalAll);
    const defaultTaxRate = settings?.taxRate ?? 0.0825;
    const taxableAmount = cartItems.reduce((sum, item) => {
      const lineTaxRate = item.product.taxRate !== undefined ? item.product.taxRate : defaultTaxRate;
      const lineSubtotal = Math.max(0, item.unitPrice * item.quantity - (item.discountAmount || 0));
      return sum + lineSubtotal * lineTaxRate;
    }, 0);
    const grandTotal = Math.max(0, discountedSubtotal + taxableAmount);

    posBridge.syncCartToCustomerDisplay(
      cartItems,
      {
        subtotal: rawSubtotal,
        discountTotal: discountTotalAll,
        taxTotal: taxableAmount,
        grandTotal,
      },
      {
        storeName: settings?.storeName || '377 Spirits',
        tagline: settings?.tagline || 'Fine Liquors, Craft Spirits, Wine & Beer',
      }
    );
  }, [cartItems, orderDiscountPercent, orderDiscountAmount, settings]);

  // Global physical barcode scanner keypress listener (DV-04)
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      // Hotkeys from mockup: F3 = Scan, F4 = Add Item, F6 = Lotto Sale, F7 = Lotto Payout, F8 = Open Drawer, F9 = Checkout
      if (e.key === 'F3') {
        e.preventDefault();
        if (onOpenScannerModal) onOpenScannerModal();
        return;
      }
      if (e.key === 'F4') {
        e.preventDefault();
        setShowAddManualModal(true);
        return;
      }
      if (e.key === 'F6') {
        e.preventDefault();
        setShowLottoSaleModal(true);
        return;
      }
      if (e.key === 'F7') {
        e.preventDefault();
        setShowLottoPayoutModal(true);
        return;
      }
      if (e.key === 'F8') {
        e.preventDefault();
        setShowManualDrawerModal(true);
        return;
      }
      if (e.key === 'F9') {
        e.preventDefault();
        if (cartItems.length > 0) onProceedToCheckout();
        return;
      }

      // Ignore if user is currently typing in an input element
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      const currentTime = Date.now();
      if (currentTime - lastKeyTime > 150) {
        buffer = '';
      }
      lastKeyTime = currentTime;

      if (e.key === 'Enter') {
        if (buffer.length >= 4) {
          e.preventDefault();
          handleDirectBarcodeScan(buffer);
          buffer = '';
        }
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [products, cartItems]);

  const handleDirectBarcodeScan = (code: string) => {
    const trimmed = code.trim().toLowerCase();
    const product = products.find(p => {
      if (p.barcode.toLowerCase() === trimmed || p.sku.toLowerCase() === trimmed) return true;
      if (p.barcodes && p.barcodes.some(b => b.barcode.toLowerCase() === trimmed)) return true;
      return false;
    });
    if (product) {
      playBeep('scan', settings?.scannerSound);
      onAddToCart(product);
    } else {
      playBeep('error', settings?.scannerSound);
    }
  };

  // Quick Lotto Sale modal trigger
  const handleLottoSale = () => {
    playBeep('click');
    setShowLottoSaleModal(true);
  };

  // Quick Lotto Payout modal trigger
  const handleLottoPayout = () => {
    playBeep('click');
    setShowLottoPayoutModal(true);
  };

  // Filtered and Sorted Products
  const filteredProducts = useMemo(() => {
    let list = products.filter(p => p.active);

    if (selectedCategoryId === 'favorites') {
      list = list.filter(p => p.stockQuantity > 10);
    } else if (selectedCategoryId !== 'all') {
      list = list.filter(p => p.categoryId === selectedCategoryId);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        p =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.barcode.toLowerCase().includes(q) ||
          (p.barcodes && p.barcodes.some(b => b.barcode.toLowerCase().includes(q))) ||
          (p.categoryName && p.categoryName.toLowerCase().includes(q)) ||
          (p.brandName && p.brandName.toLowerCase().includes(q)) ||
          (p.brand && p.brand.toLowerCase().includes(q)) ||
          (p.vendor && p.vendor.toLowerCase().includes(q)) ||
          (p.aisle && p.aisle.toLowerCase().includes(q))
      );
    }

    // Sorting
    list.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      if (sortBy === 'stock') return b.stockQuantity - a.stockQuantity;
      return 0;
    });

    return list;
  }, [products, selectedCategoryId, searchQuery, sortBy]);

  const cartTotalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // Category Icon Resolver
  const getCategoryIcon = (slugOrName: string) => {
    const s = slugOrName.toLowerCase();
    if (s.includes('whiskey') || s.includes('bourbon')) return Flame;
    if (s.includes('tequila') || s.includes('mezcal')) return Sparkles;
    if (s.includes('vodka') || s.includes('gin')) return GlassWater;
    if (s.includes('wine') || s.includes('champagne')) return Wine;
    if (s.includes('beer') || s.includes('seltzer')) return Beer;
    if (s.includes('craft') || s.includes('local')) return Sparkles;
    if (s.includes('mixer')) return CupSoda;
    if (s.includes('accessories')) return Package;
    if (s.includes('lotto')) return Ticket;
    return Wine;
  };

  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [selectedSize, setSelectedSize] = useState<string>('all');
  const [showMoreMenu, setShowMoreMenu] = useState<boolean>(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set(['prod-1', 'prod-3', 'prod-4']));

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    playBeep('click');
  };

  const activeCategoryTitle = useMemo(() => {
    if (selectedCategoryId === 'all') return 'All Products';
    if (selectedCategoryId === 'favorites') return 'Favorites';
    const found = categories.find(c => c.id === selectedCategoryId);
    return found ? found.name : 'Products';
  }, [selectedCategoryId, categories]);

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-84px)] overflow-hidden bg-[#F8FAFC] text-slate-800 select-none">
      {/* Action Keys Bar directly under navigation matching mockup */}
      <div className="bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-between gap-2 overflow-x-auto shrink-0 shadow-2xs">
        <div className="flex items-center space-x-2">
          {/* [+ Add Item (F4)] in Warm Golden Amber with bold Plus Icon */}
          <button
            type="button"
            onClick={() => {
              playBeep('click');
              setShowAddManualModal(true);
            }}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-[#F3C067] hover:bg-[#F59E0B] text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-xs transition-transform active:scale-98 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 text-slate-950 stroke-[3]" />
            <span>Add Item (F4)</span>
          </button>

          {/* [||| Scan (F3)] in Dark Navy */}
          <button
            type="button"
            onClick={() => {
              playBeep('click');
              if (onOpenScannerModal) onOpenScannerModal();
            }}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-[#1E293B] hover:bg-[#0F172A] text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-xs transition-transform active:scale-98 cursor-pointer shrink-0"
          >
            <ScanBarcode className="w-4 h-4" />
            <span>Scan (F3)</span>
          </button>

          {/* [🎫 Lotto Sale (F6)] in Emerald Green */}
          <button
            type="button"
            onClick={handleLottoSale}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-[#059669] hover:bg-[#047857] text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-xs transition-transform active:scale-98 cursor-pointer shrink-0"
          >
            <Ticket className="w-4 h-4" />
            <span>Lotto Sale (F6)</span>
          </button>

          {/* [💵 Lotto Payout (F7)] in Crimson Red */}
          <button
            type="button"
            onClick={handleLottoPayout}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-[#E11D48] hover:bg-[#BE123C] text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-xs transition-transform active:scale-98 cursor-pointer shrink-0"
          >
            <DollarSign className="w-4 h-4" />
            <span>Lotto Payout (F7)</span>
          </button>

          {/* [👤 Customer (F8)] in Crisp White */}
          <button
            type="button"
            onClick={() => {
              playBeep('click');
              onOpenCustomerModal();
            }}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-bold text-xs uppercase tracking-wider rounded-xl shadow-2xs transition-colors cursor-pointer shrink-0"
          >
            <UserCheck className="w-4 h-4 text-slate-600" />
            <span>Customer (F8)</span>
          </button>

          {/* [🔍 Price Check] */}
          <button
            type="button"
            onClick={() => {
              playBeep('click');
              setPriceCheckModal(true);
            }}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-bold text-xs uppercase tracking-wider rounded-xl shadow-2xs transition-colors cursor-pointer shrink-0"
          >
            <Search className="w-4 h-4 text-slate-600" />
            <span>Price Check</span>
          </button>

          {/* [📱 Cart Transfer (US-013/014)] */}
          <button
            type="button"
            id="pos-btn-cart-transfer"
            onClick={() => {
              playBeep('click');
              setShowCartTransferModal(true);
            }}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 font-bold text-xs uppercase tracking-wider rounded-xl shadow-2xs transition-colors cursor-pointer shrink-0"
            title="Import or Export queue-busting carts via QR/code (US-013 & US-014)"
          >
            <ScanBarcode className="w-4 h-4 text-amber-700" />
            <span>Mobile Cart</span>
          </button>

          {/* [••• More ▾] Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMoreMenu(prev => !prev)}
              className="flex items-center space-x-1 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-bold text-xs uppercase tracking-wider rounded-xl shadow-2xs transition-colors cursor-pointer shrink-0"
            >
              <span>More</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            </button>

            {showMoreMenu && (
              <div className="absolute left-0 mt-1 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1.5 text-xs text-slate-700 animate-in fade-in zoom-in-95">
                <button
                  onClick={() => {
                    setShowMoreMenu(false);
                    setShowManualDrawerModal(true);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-100 flex items-center space-x-2 font-medium"
                >
                  <Landmark className="w-4 h-4 text-amber-600" />
                  <span>Open Drawer (F10)</span>
                </button>
                <a
                  href="?view=check-upload"
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setShowMoreMenu(false)}
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-100 flex items-center space-x-2 font-medium text-slate-700"
                >
                  <Ticket className="w-4 h-4 text-emerald-600" />
                  <span>Launch Check Intake Form</span>
                </a>
                <a
                  href="?view=shelf-counter"
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setShowMoreMenu(false)}
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-100 flex items-center space-x-2 font-medium text-slate-700"
                >
                  <Sparkles className="w-4 h-4 text-sky-600" />
                  <span>Launch AI Shelf Counter</span>
                </a>
                <div className="border-t border-slate-100 my-1"></div>
                <button
                  onClick={() => {
                    setShowMoreMenu(false);
                    onClearCart();
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-rose-50 text-rose-600 flex items-center space-x-2 font-medium"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Clear Cart (Cancel Sale)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3-Column Layout matching Mockup */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT COLUMN: Categories Sidebar (Width ~230px) */}
        <div className="w-56 xl:w-60 bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-y-auto p-3 space-y-1">
          <div className="px-2 py-1 text-[11px] font-black uppercase tracking-wider text-slate-400">
            CATEGORIES
          </div>

          {/* All Products */}
          <button
            onClick={() => setSelectedCategoryId('all')}
            className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs transition-all cursor-pointer ${
              selectedCategoryId === 'all'
                ? 'bg-amber-100 text-amber-950 font-black border border-amber-300 shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent font-semibold'
            }`}
          >
            <LayoutGrid className="w-4 h-4 text-amber-700 shrink-0" />
            <span className="truncate">All Products</span>
          </button>

          {/* Individual Categories with custom icons */}
          {categories.map(cat => {
            const Icon = getCategoryIcon(cat.name);
            const isSelected = selectedCategoryId === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoryId(cat.id)}
                className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-amber-100 text-amber-950 font-black border border-amber-300 shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent font-semibold'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isSelected ? 'text-amber-700' : 'text-slate-400'
                  }`}
                />
                <span className="truncate">{cat.name}</span>
              </button>
            );
          })}

          {/* Favorites Filter */}
          <button
            onClick={() => setSelectedCategoryId('favorites')}
            className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs transition-all cursor-pointer ${
              selectedCategoryId === 'favorites'
                ? 'bg-amber-100 text-amber-950 font-black border border-amber-300 shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent font-semibold'
            }`}
          >
            <Star className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
            <span>Staff Picks & Favorites</span>
          </button>

          {/* Bottom Sidebar Promo Card matching Mockup */}
          <div className="mt-auto pt-3">
            <div className="relative rounded-2xl overflow-hidden shadow-xs border border-amber-900/40 bg-gradient-to-br from-[#0F172A] via-[#1E1B4B] to-[#1E293B] text-white p-3.5">
              <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-amber-500/10 rounded-full blur-xl pointer-events-none"></div>
              <div className="relative z-10 space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#F3C067] block">
                  GRANBURY, TEXAS
                </span>
                <h4 className="text-xs font-black tracking-tight text-white uppercase leading-tight">
                  GOOD SPIRITS
                </h4>
                <p className="text-[11px] font-serif italic text-amber-200/90 leading-tight">
                  Great Company.
                </p>
                <span className="text-[9px] text-slate-400 block pt-1 font-mono">
                  Fine Liquor & Craft Provisions
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* MIDDLE COLUMN: Product Catalog Grid */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#F8FAFC]">
          {/* Header Row: Category Title, Count & Sort Controls */}
          <div className="px-5 py-3 flex items-center justify-between border-b border-slate-200 bg-white shrink-0">
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-black text-slate-900 tracking-tight">
                {activeCategoryTitle}
              </h2>
              <span className="text-xs text-slate-400 font-semibold">
                ({filteredProducts.length})
              </span>
            </div>

            <div className="flex items-center space-x-2">
              {/* Sort Selector */}
              <div className="flex items-center space-x-1 text-xs text-slate-500">
                <span className="font-semibold text-[11px] text-slate-400">Sort:</span>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                  className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:border-amber-400 cursor-pointer"
                >
                  <option value="name">Name A-Z</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="stock">Highest Stock</option>
                </select>
              </div>

              {/* View Toggle */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`p-1 rounded-md cursor-pointer ${
                    viewMode === 'grid' ? 'bg-amber-400 text-slate-950 shadow-2xs' : 'text-slate-500'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`p-1 rounded-md cursor-pointer ${
                    viewMode === 'list' ? 'bg-amber-400 text-slate-950 shadow-2xs' : 'text-slate-500'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Product Cards Grid matching user mockup */}
          <div className="flex-1 p-4 overflow-y-auto">
            {filteredProducts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
                <ShoppingBag className="w-12 h-12 text-slate-300 mb-2" />
                <p className="text-sm font-bold text-slate-700">No products match your filter</p>
                <p className="text-xs text-slate-400 mt-1">
                  Try selecting "All Products" or add the item manually.
                </p>
                <button
                  onClick={() => {
                    playBeep('click');
                    setShowAddManualModal(true);
                  }}
                  className="mt-4 px-4 py-2 bg-amber-400 hover:bg-amber-500 text-slate-950 text-xs font-bold uppercase rounded-xl flex items-center space-x-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Item Manually</span>
                </button>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3.5">
                {filteredProducts.map(prod => {
                  const isOutOfStock = prod.stockQuantity <= 0;
                  const isLowStock = prod.stockQuantity > 0 && prod.stockQuantity <= prod.lowStockThreshold;
                  const isFav = favorites.has(prod.id);

                  return (
                    <div
                      key={prod.id}
                      id={`pos-product-${prod.id}`}
                      onClick={() => {
                        if (!isOutOfStock) {
                          playBeep('scan', settings?.scannerSound);
                          onAddToCart(prod);
                        } else {
                          playBeep('error', settings?.scannerSound);
                        }
                      }}
                      className={`bg-white border border-slate-200/90 rounded-2xl p-3 flex flex-col justify-between hover:shadow-md hover:border-amber-300 transition-all cursor-pointer relative group ${
                        isOutOfStock ? 'opacity-40 cursor-not-allowed' : ''
                      }`}
                    >
                      {/* Top Badges Row matching final ui.png */}
                      <div className="flex items-center justify-between w-full mb-1 z-10">
                        {/* Top Left Stock Badge */}
                        <div>
                          {isOutOfStock ? (
                            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold border border-rose-200">
                              Out of Stock
                            </span>
                          ) : isLowStock ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black shadow-2xs">
                              Low Stock {prod.stockQuantity}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-black shadow-2xs">
                              In Stock {prod.stockQuantity}
                            </span>
                          )}
                        </div>

                        {/* Top Right Heart Favorite Button */}
                        <button
                          type="button"
                          onClick={(e) => toggleFavorite(prod.id, e)}
                          className="p-1 rounded-full text-slate-300 hover:text-rose-500 hover:bg-slate-50 transition-colors cursor-pointer"
                          title={isFav ? 'Remove Favorite' : 'Save Favorite'}
                        >
                          <Heart
                            className={`w-4 h-4 ${
                              isFav ? 'fill-rose-500 text-rose-500' : 'text-slate-300'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Bottle Graphic Image matching fin.png */}
                      <div className="h-32 w-full flex items-center justify-center p-2 mb-1 overflow-hidden group-hover:scale-105 transition-transform duration-200">
                        <BottleImage
                          name={prod.name}
                          imageUrl={prod.imageUrl}
                          size={prod.size}
                        />
                      </div>

                      {/* Details */}
                      <div>
                        <span className="text-[11px] text-slate-400 font-semibold block">
                          {prod.size}
                        </span>
                        <h3 className="text-xs font-black text-slate-900 line-clamp-2 leading-snug mt-0.5">
                          {prod.name}
                        </h3>
                      </div>

                      {/* Bottom Price & Square Add Cart Button matching final ui.png */}
                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-base font-black text-slate-950 font-mono">
                          ${(prod.price ?? 0).toFixed(2)}
                        </span>
                        <button
                          type="button"
                          className="w-8 h-8 rounded-xl bg-[#F3C067] hover:bg-[#F59E0B] text-slate-950 flex items-center justify-center shadow-xs transition-colors cursor-pointer"
                          title="Add to order"
                        >
                          <ShoppingBag className="w-4 h-4 text-slate-950 stroke-[2.5]" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* List View Mode */
              <div className="space-y-2">
                {filteredProducts.map(prod => (
                  <div
                    key={prod.id}
                    onClick={() => {
                      playBeep('scan', settings?.scannerSound);
                      onAddToCart(prod);
                    }}
                    className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between hover:border-amber-300 hover:shadow-2xs transition-all cursor-pointer"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-10 h-10 flex items-center justify-center shrink-0">
                        <BottleImage name={prod.name} imageUrl={prod.imageUrl} className="h-10 w-auto object-contain" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 truncate">{prod.name}</h4>
                        <span className="text-[11px] text-slate-400 font-mono">{prod.size} • SKU: {prod.sku}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        {prod.stockQuantity} in stock
                      </span>
                      <span className="text-sm font-black text-slate-950 font-mono">${(prod.price ?? 0).toFixed(2)}</span>
                      <button className="p-1.5 rounded-lg bg-amber-400 text-slate-950 font-bold">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Current Order Panel (Width ~360px on desktop) */}
        <div
          className={`w-full lg:w-88 xl:w-96 shrink-0 h-full ${
            mobileCartOpen ? 'fixed inset-0 z-40 block' : 'hidden lg:flex'
          }`}
        >
          <div className="relative h-full w-full flex flex-col">
            {mobileCartOpen && (
              <button
                onClick={() => setMobileCartOpen(false)}
                className="lg:hidden absolute top-2 right-2 z-50 p-2 text-slate-400 hover:text-slate-800"
              >
                <XCircle className="w-6 h-6" />
              </button>
            )}

            <CartPanel
              items={cartItems}
              onUpdateQuantity={onUpdateQuantity}
              onSetQuantity={onSetQuantity}
              onRemoveItem={onRemoveItem}
              onClearCart={onClearCart}
              selectedCustomer={selectedCustomer}
              onOpenCustomerModal={onOpenCustomerModal}
              onRemoveCustomer={onRemoveCustomer}
              orderDiscountPercent={orderDiscountPercent}
              orderDiscountAmount={orderDiscountAmount}
              onApplyOrderDiscount={onApplyOrderDiscount}
              onOpenItemDiscount={onOpenItemDiscount}
              onHoldOrder={onHoldOrder}
              onOpenHeldOrders={onOpenHeldOrders}
              heldOrdersCount={heldOrdersCount}
              onProceedToCheckout={onProceedToCheckout}
              settings={settings}
            />
          </div>
        </div>
      </div>

      {/* Full-width Footer Status Bar matching final ui.png */}
      <div className="bg-white border-t border-slate-200 px-5 py-1.5 text-xs text-slate-500 flex items-center justify-between shrink-0 shadow-2xs z-10">
        <div className="flex items-center space-x-3">
          <span className="flex items-center space-x-1.5">
            <Sun className="w-3.5 h-3.5 text-amber-500" />
            <span className="font-semibold text-slate-700">68°F Sunny</span>
          </span>
          <span className="text-slate-300">•</span>
          <span className="flex items-center space-x-1">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold text-slate-700">Granbury, TX</span>
          </span>
        </div>

        {/* Center Slogan matching final ui.png */}
        <div className="hidden md:flex items-center space-x-2">
          <span className="font-serif italic text-sm text-sky-700 tracking-wide font-medium">
            Good Spirits. Great Company.
          </span>
        </div>

        <div className="flex items-center space-x-3">
          <span className="flex items-center space-x-1.5 font-semibold text-emerald-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
            <span>All Systems Operational</span>
          </span>
          <span className="text-slate-300">•</span>
          <span className="text-[11px] text-slate-400 font-mono">Version 1.0.0</span>
        </div>
      </div>

      {/* Cashier Add Manual Item Modal */}
      <AddManualItemModal
        isOpen={showAddManualModal}
        onClose={() => setShowAddManualModal(false)}
        categories={categories}
        settings={settings}
        onAddCustomItemToCart={(customProduct, qty) => {
          onAddToCart(customProduct);
          if (qty > 1) {
            onSetQuantity(customProduct.id, qty);
          }
        }}
        onProductCreated={newProd => {
          if (onProductCreated) {
            onProductCreated(newProd);
          }
        }}
      />

      {/* Price Check Modal */}
      {priceCheckModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Search className="w-4 h-4 text-amber-600" />
                <h3 className="font-black text-sm text-slate-900">Rapid Price & Stock Verification</h3>
              </div>
              <button
                onClick={() => {
                  setPriceCheckModal(false);
                  setPriceCheckResult(null);
                  setPriceCheckQuery('');
                }}
                className="text-slate-400 hover:text-slate-700"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <input
                type="text"
                autoFocus
                placeholder="Scan barcode or type name..."
                value={priceCheckQuery}
                onChange={e => {
                  const val = e.target.value;
                  setPriceCheckQuery(val);
                  if (val.trim()) {
                    const q = val.toLowerCase().trim();
                    const match = products.find(
                      p => p.barcode === q || p.sku.toLowerCase() === q || p.name.toLowerCase().includes(q)
                    );
                    setPriceCheckResult(match || null);
                  } else {
                    setPriceCheckResult(null);
                  }
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-amber-400 focus:outline-none"
              />

              {priceCheckResult ? (
                <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl space-y-2">
                  <div className="flex items-center space-x-3">
                    <img src={priceCheckResult.imageUrl} alt="" className="w-12 h-12 object-contain" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{priceCheckResult.name}</h4>
                      <span className="text-[11px] text-slate-500">{priceCheckResult.size} • Stock: {priceCheckResult.stockQuantity}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-amber-200/60">
                    <span className="text-xl font-black text-slate-950 font-mono">${priceCheckResult.price.toFixed(2)}</span>
                    <button
                      onClick={() => {
                        onAddToCart(priceCheckResult);
                        setPriceCheckModal(false);
                        setPriceCheckResult(null);
                      }}
                      className="px-3 py-1.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-lg"
                    >
                      Add to Order
                    </button>
                  </div>
                </div>
              ) : priceCheckQuery ? (
                <p className="text-xs text-slate-400 text-center py-2">No product found matching "{priceCheckQuery}"</p>
              ) : (
                <p className="text-xs text-slate-400 text-center py-2">Scan barcode with handheld gun or type item</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Texas Lottery Sale Modal (F6) */}
      <LottoSaleModal
        isOpen={showLottoSaleModal}
        onClose={() => setShowLottoSaleModal(false)}
        onAddLottoProduct={(prod, qty = 1) => {
          for (let i = 0; i < qty; i++) {
            onAddToCart(prod);
          }
        }}
      />

      {/* Texas Lottery Payout Modal (F7) */}
      <LottoPayoutModal
        isOpen={showLottoPayoutModal}
        onClose={() => setShowLottoPayoutModal(false)}
        currentUser={currentUser}
        onAddLottoPayout={payoutProd => {
          onAddToCart(payoutProd);
        }}
      />

      {/* Manual Cash Drawer Access Modal (F8 / PB-015) */}
      <ManualDrawerModal
        isOpen={showManualDrawerModal}
        onClose={() => setShowManualDrawerModal(false)}
        currentUser={currentUser}
      />

      {/* Omnichannel Cart Transfer Modal (US-013 & US-014) */}
      {showCartTransferModal && (
        <CartTransferModal
          onClose={() => setShowCartTransferModal(false)}
          products={products}
          currentCartItems={cartItems}
          onImportCart={(items, customerInfo) => {
            onClearCart();
            items.forEach(it => {
              for (let i = 0; i < it.quantity; i++) {
                onAddToCart(it.product);
              }
            });
            setShowCartTransferModal(false);
          }}
        />
      )}
    </div>
  );
};
