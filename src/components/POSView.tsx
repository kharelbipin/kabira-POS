import React, { useState, useMemo, useEffect } from 'react';
import { Product, Category, CartItem, Customer, StoreSettings, User } from '../types';
import { playBeep } from '../utils/audio';
import { hardwareStore } from '../hardware';
import { CartPanel } from './CartPanel';
import { AddManualItemModal } from './AddManualItemModal';
import { LottoSaleModal } from './pos/LottoSaleModal';
import { LottoPayoutModal } from './pos/LottoPayoutModal';
import { ManualDrawerModal } from './pos/ManualDrawerModal';
import { CartTransferModal } from './pos/CartTransferModal';
import { BottleImage } from './BottleImage';
import { MenuModifiersModal } from './restaurant/MenuModifiersModal';
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
  Scale,
  Utensils,
  Sliders,
  ChefHat,
  X,
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
  onOpenScaleModal?: () => void;
  onOpenTablesView?: () => void;
  onOpenKdsModal?: () => void;
  onOpenDesigner?: () => void;
  onScanBarcode?: (barcode: string, source?: string) => void;
  scanNotification?: {
    id: string;
    productName: string;
    barcode: string;
    imageUrl?: string;
    size?: string;
    price: number;
    effectivePrice?: number;
    taxRate: number;
    stockQuantity: number;
    inventoryAvailable: number;
    quantityInCart: number;
    ageRestriction?: number;
    pipeline: string;
    timestamp: string;
  } | null;
  onDismissScanNotification?: () => void;
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
  onOpenScaleModal,
  onOpenTablesView,
  onOpenKdsModal,
  onOpenDesigner,
  onScanBarcode,
  scanNotification,
  onDismissScanNotification,
}) => {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [unrecognizedBarcode, setUnrecognizedBarcode] = useState<string | undefined>(undefined);
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
  const [productBrowserOpen, setProductBrowserOpen] = useState<boolean>(false);

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

    hardwareStore.syncCartToCustomerDisplay(
      cartItems,
      {
        subtotal: rawSubtotal,
        discountTotal: discountTotalAll,
        taxTotal: taxableAmount,
        grandTotal,
      },
      {
        storeName: settings?.storeName || 'KABIRA POS • 377 SPIRITS',
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
    if (onScanBarcode) {
      onScanBarcode(code.trim(), 'Physical USB Barcode Scanner (Zebra DS2208)');
      return;
    }
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
      setUnrecognizedBarcode(code.trim());
      setShowAddManualModal(true);
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

  // Tobacco & Alcohol Cutoff Age for Cashier / Manager register (not Admin)
  const isCashierOrManagerRegister = currentUser?.role === 'Cashier' || currentUser?.role === 'Manager';
  const isAdmin = currentUser?.role === 'Admin';
  const isManager = currentUser?.role === 'Manager';
  const isCashier = currentUser?.role === 'Cashier';

  // Role-Based Button Visibility:
  // scale/plu, table, kds, designer button should NOT be shown in cashier and manager side.
  // This is an admin-governed function displayed only in admin side (unless admin explicitly delegates access).
  const canShowScale = isAdmin ||
    (isManager && !!settings?.adminAllowedPosButtons?.allowScaleForManager) ||
    (isCashier && !!settings?.adminAllowedPosButtons?.allowScaleForCashier);

  const canShowTables = isAdmin ||
    (isManager && !!settings?.adminAllowedPosButtons?.allowTablesForManager) ||
    (isCashier && !!settings?.adminAllowedPosButtons?.allowTablesForCashier);

  const canShowKds = isAdmin ||
    (isManager && !!settings?.adminAllowedPosButtons?.allowKdsForManager) ||
    (isCashier && !!settings?.adminAllowedPosButtons?.allowKdsForCashier);

  const canShowDesigner = isAdmin ||
    (isManager && !!settings?.adminAllowedPosButtons?.allowDesignerForManager) ||
    (isCashier && !!settings?.adminAllowedPosButtons?.allowDesignerForCashier);
  const cutoffDate = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 21);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, []);

  const activeCategoryTitle = useMemo(() => {
    if (selectedCategoryId === 'all') return 'All Products';
    if (selectedCategoryId === 'favorites') return 'Favorites';
    const found = categories.find(c => c.id === selectedCategoryId);
    return found ? found.name : 'Products';
  }, [selectedCategoryId, categories]);

  return (
    <div className="h-full flex-1 min-h-0 flex flex-col overflow-hidden bg-[#F8FAFC] text-slate-800 select-none">
      {/* Action Keys Bar directly under navigation matching mockup */}
      <div className="bg-white border-b border-slate-200 px-4 py-1.5 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar shrink-0 shadow-2xs">
        <div className="flex items-center space-x-2 shrink-0 flex-nowrap">
          {/* [+ Add Item (F4)] in Warm Golden Amber with bold Plus Icon */}
          <button
            type="button"
            onClick={() => {
              playBeep('click');
              setShowAddManualModal(true);
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#F3C067] hover:bg-[#F59E0B] text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-xs transition-transform active:scale-98 cursor-pointer shrink-0"
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
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#1E293B] hover:bg-[#0F172A] text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-xs transition-transform active:scale-98 cursor-pointer shrink-0"
          >
            <ScanBarcode className="w-4 h-4" />
            <span>Scan (F3)</span>
          </button>

          {/* [🎫 Lotto Sale (F6)] in Emerald Green */}
          <button
            type="button"
            onClick={handleLottoSale}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#059669] hover:bg-[#047857] text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-xs transition-transform active:scale-98 cursor-pointer shrink-0"
          >
            <Ticket className="w-4 h-4" />
            <span>Lotto Sale (F6)</span>
          </button>

          {/* [💵 Lotto Payout (F7)] in Crimson Red */}
          <button
            type="button"
            onClick={handleLottoPayout}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#E11D48] hover:bg-[#BE123C] text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-xs transition-transform active:scale-98 cursor-pointer shrink-0"
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
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-bold text-xs uppercase tracking-wider rounded-xl shadow-2xs transition-colors cursor-pointer shrink-0"
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
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-bold text-xs uppercase tracking-wider rounded-xl shadow-2xs transition-colors cursor-pointer shrink-0"
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
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 font-bold text-xs uppercase tracking-wider rounded-xl shadow-2xs transition-colors cursor-pointer shrink-0"
            title="Import or Export queue-busting carts via QR/code (US-013 & US-014)"
          >
            <ScanBarcode className="w-4 h-4 text-amber-700" />
            <span>Mobile Cart</span>
          </button>

          {/* [⚖️ Scale / PLU (Produce & Deli)] - Admin only by default */}
          {canShowScale && onOpenScaleModal && (
            <button
              type="button"
              id="pos-btn-scale"
              onClick={() => {
                playBeep('click');
                onOpenScaleModal();
              }}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 font-bold text-xs uppercase tracking-wider rounded-xl shadow-2xs transition-colors cursor-pointer shrink-0"
              title="Open Produce Scale & PLU Quick Code Lookup (Admin Controlled)"
            >
              <Scale className="w-4 h-4 text-emerald-700" />
              <span>Scale / PLU</span>
            </button>
          )}

          {/* [🍽️ Tables & Floor Map (Restaurant / Bar)] - Admin only by default */}
          {canShowTables && onOpenTablesView && (
            <button
              type="button"
              id="pos-btn-tables"
              onClick={() => {
                playBeep('click');
                onOpenTablesView();
              }}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-sky-50 hover:bg-sky-100 border border-sky-300 text-sky-900 font-bold text-xs uppercase tracking-wider rounded-xl shadow-2xs transition-colors cursor-pointer shrink-0"
              title="Open Restaurant Table Floor Map & Guest Checks (Admin Controlled)"
            >
              <Utensils className="w-4 h-4 text-sky-700" />
              <span>Tables</span>
            </button>
          )}

          {/* [👨‍🍳 Kitchen KDS] - Admin only by default */}
          {canShowKds && onOpenKdsModal && (
            <button
              type="button"
              id="pos-btn-kds"
              onClick={() => {
                playBeep('click');
                onOpenKdsModal();
              }}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-orange-50 hover:bg-orange-100 border border-orange-300 text-orange-900 font-bold text-xs uppercase tracking-wider rounded-xl shadow-2xs transition-colors cursor-pointer shrink-0"
              title="Open Kitchen Display System (KDS) (Admin Controlled)"
            >
              <ChefHat className="w-4 h-4 text-orange-700" />
              <span>KDS</span>
            </button>
          )}

          {/* [⚙️ POS Designer] - Admin only by default */}
          {canShowDesigner && onOpenDesigner && (
            <button
              type="button"
              id="pos-btn-designer"
              onClick={() => {
                playBeep('click');
                onOpenDesigner();
              }}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-300 text-indigo-900 font-bold text-xs uppercase tracking-wider rounded-xl shadow-2xs transition-colors cursor-pointer shrink-0"
              title="Open Modular POS Designer & Industry Presets (Admin Controlled)"
            >
              <Sliders className="w-4 h-4 text-indigo-700" />
              <span>Designer</span>
            </button>
          )}
        </div>

        {/* Tobacco & Alcohol Cutoff Age Compliance Bar (Cashier & Manager register only, not Admin) */}
        {isCashierOrManagerRegister && (
          <div
            id="pos-age-cutoff-display"
            className="flex items-center space-x-2 shrink-0 bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 text-white shadow-2xs whitespace-nowrap ml-auto"
            title="Legal sale compliance: Customers must be born on or before this date to purchase tobacco or alcohol (21+)"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <div className="flex items-center space-x-1.5 text-[11px] font-mono whitespace-nowrap">
              <span className="text-slate-300 font-sans font-bold uppercase text-[10px] tracking-wide">
                Tobacco / Alcohol:
              </span>
              <span className="font-bold text-amber-300 font-mono tracking-tight bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
                {cutoffDate}
              </span>
              <span className="text-[9px] font-sans font-black text-amber-400/90 uppercase bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/30">
                21+
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 3-Column Layout matching Mockup */}
      <div className="flex-1 min-h-0 flex overflow-hidden bg-slate-100">
        {/* LEFT COLUMN: Categories Sidebar (Width ~230px) */}
        <div className="w-48 xl:w-52 bg-white border-r border-slate-200 flex flex-col shrink-0 h-full overflow-hidden p-2">
          <div className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 shrink-0">
            CATEGORIES
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto space-y-1 pr-1">
            {/* All Products */}
            <button
              onClick={() => {
                setSelectedCategoryId('all');
                setProductBrowserOpen(true);
              }}
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
                  onClick={() => {
                    setSelectedCategoryId(cat.id);
                    setProductBrowserOpen(true);
                  }}
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
              onClick={() => {
                setSelectedCategoryId('favorites');
                setProductBrowserOpen(true);
              }}
              className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs transition-all cursor-pointer ${
                selectedCategoryId === 'favorites'
                  ? 'bg-amber-100 text-amber-950 font-black border border-amber-300 shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent font-semibold'
              }`}
            >
              <Star className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
              <span>Staff Picks & Favorites</span>
            </button>
          </div>

          {/* Bottom Sidebar Promo Card matching Mockup */}
          <div className="mt-auto pt-2 shrink-0">
            <div className="relative rounded-2xl overflow-hidden shadow-xs border border-amber-900/40 bg-gradient-to-br from-[#0F172A] via-[#1E1B4B] to-[#1E293B] text-white p-3">
              <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-amber-500/10 rounded-full blur-xl pointer-events-none"></div>
              <div className="relative z-10 space-y-0.5">
                <span className="text-[9px] font-black uppercase tracking-widest text-[#F3C067] block">
                  GRANBURY, TEXAS
                </span>
                <h4 className="text-[11px] font-black tracking-tight text-white uppercase leading-tight">
                  GOOD SPIRITS
                </h4>
                <p className="text-[10px] font-serif italic text-amber-200/90 leading-tight">
                  Great Company.
                </p>
                <span className="text-[8.5px] text-slate-400 block pt-0.5 font-mono">
                  Fine Liquor & Craft Provisions
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* MIDDLE COLUMN: Order-first workspace */}
        <div className="flex-1 min-w-0 min-h-0 h-full overflow-hidden bg-[#F8FAFC] p-1.5 xl:p-2 flex flex-col gap-1.5 xl:gap-2">
          {/* Compact scan confirmation. Scanner hardware remains background-only. */}
          {scanNotification && (
            <div className="shrink-0 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                  <ScanBarcode className="w-4 h-4 text-emerald-700" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-black uppercase tracking-wider text-emerald-700">
                    Added to Current Order
                  </div>
                  <div className="text-xs font-bold text-slate-800 truncate">
                    {scanNotification.productName}
                    {scanNotification.size ? ` • ${scanNotification.size}` : ''}
                    <span className="ml-2 font-mono text-slate-500">
                      ${scanNotification.price.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
              {onDismissScanNotification && (
                <button
                  type="button"
                  onClick={onDismissScanNotification}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-white cursor-pointer"
                  title="Dismiss"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* Category/Product browser opens only when the cashier intentionally browses. */}
          {productBrowserOpen && (
            <section className="h-[34%] min-h-[170px] max-h-[240px] xl:h-[38%] xl:max-h-[300px] bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col shrink-0">
              <div className="px-3 py-2 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                    <ShoppingBag className="w-4 h-4 text-amber-700" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                      Product Browser
                    </div>
                    <div className="text-sm font-black text-slate-900 truncate">
                      {activeCategoryTitle}
                      <span className="ml-1.5 text-xs text-slate-400 font-semibold">
                        ({filteredProducts.length})
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative hidden md:block">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search products..."
                      className="w-48 xl:w-56 pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value as any)}
                    className="hidden xl:block bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:border-amber-400"
                  >
                    <option value="name">Name A-Z</option>
                    <option value="price-asc">Price ↑</option>
                    <option value="price-desc">Price ↓</option>
                    <option value="stock">Stock</option>
                  </select>

                  <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setViewMode('grid')}
                      className={`p-1.5 rounded-md cursor-pointer ${
                        viewMode === 'grid'
                          ? 'bg-amber-400 text-slate-950'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                      title="Grid view"
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('list')}
                      className={`p-1.5 rounded-md cursor-pointer ${
                        viewMode === 'list'
                          ? 'bg-amber-400 text-slate-950'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                      title="List view"
                    >
                      <List className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setProductBrowserOpen(false);
                      setSearchQuery('');
                    }}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 cursor-pointer"
                    title="Close product browser"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto p-2.5 bg-slate-50/60">
                {filteredProducts.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-slate-400">
                    <ShoppingBag className="w-8 h-8 text-slate-300 mb-1.5" />
                    <div className="text-xs font-bold text-slate-700">No matching products</div>
                    <div className="text-[11px] mt-0.5">Try another category or search.</div>
                  </div>
                ) : viewMode === 'grid' ? (
                  <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                    {filteredProducts.map(prod => {
                      const isOutOfStock = prod.stockQuantity <= 0;
                      const isLowStock =
                        prod.stockQuantity > 0 &&
                        prod.stockQuantity <= prod.lowStockThreshold;

                      return (
                        <button
                          key={prod.id}
                          id={`pos-product-${prod.id}`}
                          type="button"
                          disabled={isOutOfStock}
                          onClick={() => {
                            if (isOutOfStock) {
                              playBeep('error', settings?.scannerSound);
                              return;
                            }

                            playBeep('scan', settings?.scannerSound);
                            onAddToCart(prod);
                          }}
                          className="min-w-0 bg-white border border-slate-200 rounded-xl p-2 text-left hover:border-amber-400 hover:shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-11 h-11 rounded-lg bg-slate-50 flex items-center justify-center shrink-0 overflow-hidden">
                              <BottleImage
                                name={prod.name}
                                imageUrl={prod.imageUrl}
                                size={prod.size}
                                className="max-w-full max-h-10 object-contain"
                              />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="text-[11px] font-black text-slate-900 truncate">
                                {prod.name}
                              </div>
                              <div className="text-[10px] text-slate-400 truncate">
                                {prod.size || 'Standard'}
                              </div>
                              <div className="flex items-center justify-between gap-2 mt-1">
                                <span className="text-xs font-black font-mono text-slate-950">
                                  ${(prod.price ?? 0).toFixed(2)}
                                </span>
                                <span
                                  className={`text-[9px] font-bold ${
                                    isOutOfStock
                                      ? 'text-rose-600'
                                      : isLowStock
                                        ? 'text-amber-700'
                                        : 'text-emerald-700'
                                  }`}
                                >
                                  {isOutOfStock ? 'Out' : `${prod.stockQuantity} stock`}
                                </span>
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {filteredProducts.map(prod => {
                      const isOutOfStock = prod.stockQuantity <= 0;

                      return (
                        <button
                          key={prod.id}
                          type="button"
                          disabled={isOutOfStock}
                          onClick={() => {
                            if (isOutOfStock) {
                              playBeep('error', settings?.scannerSound);
                              return;
                            }

                            playBeep('scan', settings?.scannerSound);
                            onAddToCart(prod);
                          }}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 flex items-center justify-between gap-3 hover:border-amber-400 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-8 h-8 flex items-center justify-center shrink-0">
                              <BottleImage
                                name={prod.name}
                                imageUrl={prod.imageUrl}
                                size={prod.size}
                                className="max-w-full max-h-8 object-contain"
                              />
                            </div>
                            <div className="min-w-0 text-left">
                              <div className="text-[11px] font-black text-slate-900 truncate">
                                {prod.name}
                              </div>
                              <div className="text-[10px] text-slate-400 truncate">
                                {prod.size} • {prod.stockQuantity} in stock
                              </div>
                            </div>
                          </div>
                          <span className="text-xs font-black font-mono text-slate-950 shrink-0">
                            ${(prod.price ?? 0).toFixed(2)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Current Order owns the center workspace and remains visible while browsing. */}
          <section className="flex-1 min-h-0 flex flex-col">
            <div className="shrink-0 px-1 pb-1 flex items-center justify-between gap-3">
              <div className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                Current Order
              </div>
              <div className="hidden xl:block text-[10px] font-bold text-slate-400">
                Scan items or browse a category
              </div>
            </div>

            <div className="flex-1 min-h-0">
            <CartPanel
              mode="items"
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
          </section>
        </div>

        {/* RIGHT COLUMN: fixed Order Summary and actions */}
        <div
          className={`w-full lg:w-[290px] xl:w-[320px] shrink-0 h-full bg-white ${
            mobileCartOpen ? 'fixed inset-0 z-40 block' : 'hidden lg:flex'
          }`}
        >
          <div className="relative h-full w-full flex flex-col">
            {mobileCartOpen && (
              <button
                type="button"
                onClick={() => setMobileCartOpen(false)}
                className="lg:hidden absolute top-2 right-2 z-50 p-2 text-slate-400 hover:text-slate-800"
              >
                <XCircle className="w-6 h-6" />
              </button>
            )}

            <CartPanel
              mode="summary"
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
              onOpenDrawer={() => setShowManualDrawerModal(true)}
            />
          </div>
        </div>
      </div>

      {/* Full-width Footer Status Bar matching final ui.png */}
      <div className="bg-white border-t border-slate-200 px-3 h-7 text-[11px] text-slate-500 flex items-center justify-between shrink-0 shadow-2xs z-10">
        <div className="flex items-center space-x-3">
          <span className="flex items-center space-x-1.5">
            <Sun className="w-3.5 h-3.5 text-amber-500" />
            <span className="font-semibold text-slate-700">68°F Sunny</span>
          </span>
          <span className="text-slate-300">•</span>
          <span className="flex items-center space-x-1">
            <Wine className="w-3.5 h-3.5 text-amber-500" />
            <span className="font-semibold text-slate-700 tracking-wider">377 SPIRITS</span>
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
        initialBarcode={unrecognizedBarcode}
        onClose={() => {
          setShowAddManualModal(false);
          setUnrecognizedBarcode(undefined);
        }}
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
