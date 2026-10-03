import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  User,
  Product,
  Category,
  CartItem,
  Customer,
  Order,
  HeldOrder,
  StoreSettings,
} from './types';
import { api } from './utils/api';
import { playBeep } from './utils/audio';

import { Navbar } from './components/Navbar';
import { POSView } from './components/POSView';
import { OrdersView } from './components/OrdersView';
import { InventoryView } from './components/InventoryView';
import { CustomersView } from './components/CustomersView';
import { ReportsView } from './components/ReportsView';
import { DashboardView } from './components/DashboardView';
import { UsersView } from './components/UsersView';
import { SettingsView } from './components/SettingsView';
import { AuditLogsView } from './components/AuditLogsView';
import { UserActivityTrackerView } from './components/UserActivityTrackerView';
import { ShiftsView } from './components/shifts/ShiftsView';
import { ChecksView } from './components/checks/ChecksView';
import { OnlineStoreView } from './components/onlineStore/OnlineStoreView';
import { ManagerSettingsCenter } from './components/settings/ManagerSettingsCenter';
import { CheckUploadDirectView } from './components/checks/CheckUploadDirectView';
import { MobileFastCameraView } from './components/mobile/MobileFastCameraView';
import { MobileQueueBusterView } from './components/mobile/MobileQueueBusterView';
import { PosBridgeHubModal } from './components/bridge/PosBridgeHubModal';
import { CustomerDisplayView } from './components/display/CustomerDisplayView';
import { hardwareStore, bridgeClient } from './hardware';
import { IdentifyDisplaysOverlay } from './components/display/IdentifyDisplaysOverlay';
import { StartupHealthModal } from './components/startup/StartupHealthModal';
import { OfflineIndicator } from './components/pwa/OfflineIndicator';
import { Landmark, Boxes, BarChart3, Settings, ShieldAlert } from 'lucide-react';

import { LoginModal } from './components/LoginModal';
import { CheckoutModal } from './components/CheckoutModal';
import { ReceiptModal } from './components/ReceiptModal';
import { HeldOrdersModal } from './components/HeldOrdersModal';
import { BarcodeScannerModal } from './components/BarcodeScannerModal';
import { CustomerSelectModal } from './components/CustomerSelectModal';
import { ItemDiscountModal } from './components/ItemDiscountModal';
import { PrintLabelModal } from './components/PrintLabelModal';
import { MobileInvoiceCaptureView } from './components/invoice/MobileInvoiceCaptureView';
import { StandalonePaymentFallbackModal } from './components/payment/StandalonePaymentFallbackModal';
import { AllFunctionsMenuModal } from './components/AllFunctionsMenuModal';
import { CustomerDisplayAutoBanner } from './components/display/CustomerDisplayAutoBanner';
import { ProducePluScaleModal } from './components/grocery/ProducePluScaleModal';
import { KitchenKdsModal } from './components/restaurant/KitchenKdsModal';
import { RestaurantTablesView } from './components/restaurant/RestaurantTablesView';
import { AdminPosDesigner } from './components/admin/AdminPosDesigner';
import { StoreFeatureManagementModal } from './components/admin/StoreFeatureManagementModal';
import { HardwareDeviceManager } from './components/admin/HardwareDeviceManager';
import { AdminPortalNav } from './components/admin/AdminPortalNav';
import { AdminHealthDashboard } from './components/admin/AdminHealthDashboard';

const HELD_ORDERS_STORAGE_KEY = 'kabira_pos_held_orders_v1';

export default function App() {
  // Authentication & Current User (AU-01)
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(true);
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);

  // Standalone Customer Smartphone Check & ID Intake Form (Phase 2 CC-006, CC-036)
  const checkUploadSession = useMemo(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const sid = params.get('mobileCheck') || params.get('checkUpload') || params.get('check') || params.get('checkSession');
      const tok = params.get('token') || undefined;
      const view = params.get('view');
      if (sid || view === 'check-upload' || view === 'check' || window.location.hash.startsWith('#check-upload')) {
        return {
          sessionId: sid || tok || `chk-${Date.now()}`,
          token: tok || sid || `INTAKE-${Math.floor(1000 + Math.random() * 9000)}`,
        };
      }
    } catch (e) {}
    return null;
  }, []);

  // Standalone Mobile AI Shelf Camera Form (INV-02 to INV-18)
  const shelfCameraSession = useMemo(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const sid = params.get('mobileShelf') || params.get('shelfSession');
      const view = params.get('view');
      const loc = params.get('loc') || undefined;
      if (sid || view === 'shelf-camera' || view === 'shelf' || window.location.hash.startsWith('#shelf-camera')) {
        return {
          sessionId: sid || `shelf-${Date.now()}`,
          location: loc,
        };
      }
    } catch (e) {}
    return null;
  }, []);

  // Mobile QR Phone Camera Intake View (INV-02 to INV-18)
  const [mobileSessionParam, setMobileSessionParam] = useState<{ sessionId: string; token?: string } | null>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('mobileCheck') || params.get('mobileShelf')) return null;
      const sid = params.get('mobileUpload') || params.get('session');
      const tok = params.get('token') || undefined;
      if (sid) {
        return { sessionId: sid, token: tok };
      }
    } catch (e) {}
    return null;
  });

  // Active View Tab - Defaults to Cashier Register Route (WV-003)
  const [currentTab, setCurrentTab] = useState<string>(() => {
    try {
      const path = window.location.pathname;
      const params = new URLSearchParams(window.location.search);
      if (path === '/register' || path.endsWith('/register') || params.get('route') === 'register' || params.get('tab') === 'pos') {
        return 'pos';
      }
      if (path === '/settings' || params.get('tab') === 'settings') {
        return 'settings';
      }
      if (params.get('tab') === 'hardware-manager' || params.get('tab') === 'device-manager' || params.get('view') === 'hardware') {
        return 'hardware-manager';
      }
      if (path === '/inventory' || params.get('tab') === 'inventory') {
        return 'inventory';
      }
    } catch {}
    return 'pos';
  });

  // Core Data
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);

  // Cart & POS State (CA-01 to CA-05)
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [orderDiscountPercent, setOrderDiscountPercent] = useState<number>(0);
  const [orderDiscountAmount, setOrderDiscountAmount] = useState<number>(0);

  // Held Orders State (CA-09, CA-10)
  // Persist parked orders in the dedicated cashier browser profile so they
  // survive KaBiRa POS restarts on this register until resumed or discarded.
  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>(() => {
    try {
      const raw = window.localStorage.getItem(HELD_ORDERS_STORAGE_KEY);

      if (!raw) {
        return [];
      }

      const parsed = JSON.parse(raw);

      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed.filter(
        (held: HeldOrder) =>
          held &&
          typeof held.id === 'string' &&
          typeof held.holdNumber === 'string' &&
          typeof held.createdAt === 'string' &&
          Array.isArray(held.items)
      );
    } catch (error) {
      console.warn('[Held Orders] Could not restore held orders:', error);
      return [];
    }
  });

  const [showHeldOrdersModal, setShowHeldOrdersModal] = useState<boolean>(false);

  useEffect(() => {
    try {
      if (heldOrders.length === 0) {
        window.localStorage.removeItem(HELD_ORDERS_STORAGE_KEY);
        return;
      }

      window.localStorage.setItem(
        HELD_ORDERS_STORAGE_KEY,
        JSON.stringify(heldOrders)
      );
    } catch (error) {
      console.warn('[Held Orders] Could not persist held orders:', error);
    }
  }, [heldOrders]);

  // Modals & Overlays
  const [showCheckoutModal, setShowCheckoutModal] = useState<boolean>(false);
  const [showReceiptModal, setShowReceiptModal] = useState<boolean>(false);
  const [lastCompletedOrder, setLastCompletedOrder] = useState<Order | null>(null);
  const [showScannerModal, setShowScannerModal] = useState<boolean>(false);
  const [showCustomerSelectModal, setShowCustomerSelectModal] = useState<boolean>(false);
  const [itemDiscountTarget, setItemDiscountTarget] = useState<CartItem | null>(null);
  const [showBridgeHubModal, setShowBridgeHubModal] = useState<boolean>(false);
  const [showPrintLabelModal, setShowPrintLabelModal] = useState<boolean>(false);
  const [showCustomerDisplayModal, setShowCustomerDisplayModal] = useState<boolean>(false);
  const [showPaymentFallbackModal, setShowPaymentFallbackModal] = useState<boolean>(false);
  const [showAllFunctionsModal, setShowAllFunctionsModal] = useState<boolean>(false);
  const [showManagerPortalLogin, setShowManagerPortalLogin] = useState<boolean>(false);
  const [showStartupHealthModal, setShowStartupHealthModal] = useState<boolean>(false);
  const [showScaleModal, setShowScaleModal] = useState<boolean>(false);
  const [showKdsModal, setShowKdsModal] = useState<boolean>(false);
  const [showTablesModal, setShowTablesModal] = useState<boolean>(false);
  const [showDesignerModal, setShowDesignerModal] = useState<boolean>(false);
  const [showStoreFeatureModal, setShowStoreFeatureModal] = useState<boolean>(false);

  // Standalone Customer-Facing Display Detection (WV-012, PB-018, Requirement 8)
  const isCustomerDisplayMode = useMemo(() => {
    try {
      const path = window.location.pathname;
      const params = new URLSearchParams(window.location.search);
      return (
        path === '/customer-display' ||
        path.endsWith('/customer-display') ||
        params.get('mode') === 'customer-display' ||
        params.get('view') === 'customer-display' ||
        params.get('display') === 'customer' ||
        window.location.hash === '#customer-display'
      );
    } catch {
      return false;
    }
  }, []);

  // Standalone Mobile Queue Buster Detection (QB-001 to QB-018)
  const isQueueBusterMode = useMemo(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return (
        params.get('view') === 'queue-buster' ||
        params.get('mode') === 'mobile-cart' ||
        window.location.hash === '#queue-buster'
      );
    } catch {
      return false;
    }
  }, []);

  // Offline simulation (DV-06)
  const [isOffline, setIsOffline] = useState<boolean>(false);

  // Barcode Scanner Real-Time Notification & HUD state (User Story: Cashier Barcode Scanning)
  const [scanNotification, setScanNotification] = useState<{
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
  } | null>(null);

  // Auto-dismiss scan notification after 5 seconds
  useEffect(() => {
    if (!scanNotification) return;
    const t = setTimeout(() => {
      setScanNotification(null);
    }, 5000);
    return () => clearTimeout(t);
  }, [scanNotification]);

  // Initial Data Fetch
  // Load cashier-critical data first so the register becomes usable without
  // waiting for order history/customer history to finish loading.
  const loadAllData = useCallback(async () => {
    setIsAuthenticating(true);

    try {
      // Always establish the operator session first. Never select a default user.
      const u = await api.getCurrentUser().catch(() => null);

      if (!u) {
        setCurrentUser(null);
        setShowLoginModal(true);
        return;
      }

      setCurrentUser(u);

      const [prods, cats, usrs, setts] = await Promise.all([
        api.getProducts().catch(() => []),
        api.getCategories().catch(() => []),
        api.getUsers().catch(() => []),
        api.getSettings().catch(() => null),
      ]);

      setProducts(prods);
      setCategories(cats);
      setUsers(usrs);
      if (setts) setSettings(setts);

      // History is useful, but should not block the selling screen.
      void Promise.all([
        api.getOrders().catch(() => []),
        api.getCustomers().catch(() => []),
      ])
        .then(([ords, custs]) => {
          setOrders(ords);
          setCustomers(custs);
        })
        .catch(err => {
          console.error('Failed to load background POS data:', err);
        });
    } catch (err) {
      console.error('Failed to load critical POS data:', err);
      setCurrentUser(null);
      setShowLoginModal(true);
    } finally {
      setIsAuthenticating(false);
    }
  }, []);
  useEffect(() => {
    if (isCustomerDisplayMode || checkUploadSession || shelfCameraSession || mobileSessionParam) {
      setIsAuthenticating(false);
      return;
    }
    loadAllData();
  }, [loadAllData, isCustomerDisplayMode, checkUploadSession, shelfCameraSession, mobileSessionParam]);
  // Cart Operations (CA-01, CA-02, CA-03)
  const handleAddToCart = (product: Product) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        // Check stock availability
        if (existing.quantity >= product.stockQuantity) {
          playBeep('error', settings?.scannerSound);
          return prev;
        }
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [
          ...prev,
          {
            product,
            quantity: 1,
            unitPrice: product.price,
            discountAmount: 0,
          },
        ];
      }
    });
  };

  // Fast local barcode/SKU index.
  // The catalog is already loaded in memory, so known items should not wait
  // for a network/API round-trip before being added to the cart.
  const productLookupIndex = useMemo(() => {
    const index = new Map<string, Product>();

    for (const product of products) {
      const addKey = (value?: string | null) => {
        const key = value?.trim().toLowerCase();
        if (key) index.set(key, product);
      };

      addKey(product.barcode);
      addKey(product.sku);

      if (Array.isArray(product.barcodes)) {
        for (const entry of product.barcodes) {
          addKey(entry?.barcode);
        }
      }
    }

    return index;
  }, [products]);

  // Barcode Scanner Pipeline Handler (User Story: Cashier Barcode Scanning)
  // Flow: Scanner → POS Bridge → Barcode/UPC → Product API → Inventory Database → Cart
  const handleBarcodeScanned = useCallback(async (scannedBarcode: string, source: string = 'POS Bridge Hardware Scanner') => {
    const clean = scannedBarcode.trim();
    if (!clean) return;

    try {
      // 1. Resolve known catalog items locally first for instant scanning.
      // Only call the API when the barcode/SKU is not already in the loaded catalog.
      const cleanLower = clean.toLowerCase();
      let product: Product | null = productLookupIndex.get(cleanLower) || null;

      // Products already loaded in the POS use the regular/promotional fields.
      // `effectivePrice` exists only on the barcode lookup API response type,
      // not on the base Product interface.
      let effectivePrice: number | undefined = product
        ? (product.promotionalPrice ?? product.price)
        : undefined;

      if (!product) {
        try {
          const lookup = await api.lookupBarcode(clean);
          if (lookup && lookup.found && lookup.product) {
            product = lookup.product;
            effectivePrice = lookup.product.effectivePrice;
          }
        } catch {
          // Unknown/offline barcode remains unresolved; do not block the POS UI.
        }
      }

      if (product) {
        playBeep('scan', settings?.scannerSound);

        // 2. Add to active cart: If the same barcode is scanned again, increase the quantity to 2 instead of creating another line
        let newQtyInCart = 1;
        setCartItems(prev => {
          const existingIndex = prev.findIndex(item => item.product.id === product!.id);
          if (existingIndex >= 0) {
            const existing = prev[existingIndex];
            if (existing.quantity >= product!.stockQuantity) {
              playBeep('error', settings?.scannerSound);
              newQtyInCart = existing.quantity;
              return prev;
            }
            newQtyInCart = existing.quantity + 1;
            return prev.map((item, idx) =>
              idx === existingIndex
                ? { ...item, quantity: item.quantity + 1 }
                : item
            );
          } else {
            newQtyInCart = 1;
            return [
              ...prev,
              {
                product: product!,
                quantity: 1,
                unitPrice: product!.price,
                discountAmount: 0,
              },
            ];
          }
        });

        const remainingStock = Math.max(0, product.stockQuantity - newQtyInCart);

        // 3. Set Cashier HUD Notification (Product Name, Image, Size, Price, Tax, Inventory Availability, Age 21+)
        setScanNotification({
          id: `scan-${Date.now()}`,
          productName: product.name,
          barcode: clean,
          imageUrl: product.imageUrl,
          size: product.size,
          price: product.price,
          effectivePrice: effectivePrice ?? product.price,
          taxRate: product.taxRate ?? 0.0825,
          stockQuantity: product.stockQuantity,
          inventoryAvailable: remainingStock,
          quantityInCart: newQtyInCart,
          ageRestriction: product.ageRestriction ?? 21,
          pipeline: 'Scanner → POS Bridge → Barcode/UPC → Product API → Inventory Database → Cart',
          timestamp: new Date().toLocaleTimeString(),
        });

        // Customer Display synchronization is handled by the cart state effect below.
        // Avoid sending a second partial BroadcastChannel/localStorage update for every scan.

        // 4. Audit Log Event
        fetch('/api/user-activities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'BARCODE_SCAN',
            targetType: 'product',
            targetId: product.id,
            details: `Scanned UPC "${clean}" via ${source}: Automatically added 1x "${product.name}" ($${product.price.toFixed(2)}) to active cart (Total Qty: ${newQtyInCart}). Pipeline: Scanner → POS Bridge → Barcode/UPC → Product API → Inventory Database → Cart`,
          }),
        }).catch(() => {});
      } else {
        playBeep('error', settings?.scannerSound);
      }
    } catch (e) {
      playBeep('error', settings?.scannerSound);
    }
  }, [productLookupIndex, settings]);

  const handleUpdateQuantity = (productId: string, delta: number) => {
    playBeep('click', settings?.scannerSound);
    setCartItems(prev =>
      prev
        .map(item => {
          if (item.product.id === productId) {
            const nextQty = item.quantity + delta;
            if (nextQty <= 0) return null;
            if (nextQty > item.product.stockQuantity) {
              playBeep('error', settings?.scannerSound);
              return item;
            }
            return { ...item, quantity: nextQty };
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleSetQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveItem(productId);
      return;
    }
    setCartItems(prev =>
      prev.map(item => {
        if (item.product.id === productId) {
          const clamped = Math.min(quantity, item.product.stockQuantity);
          return { ...item, quantity: clamped };
        }
        return item;
      })
    );
  };

  const handleRemoveItem = (productId: string) => {
    playBeep('click', settings?.scannerSound);
    setCartItems(prev => prev.filter(item => item.product.id !== productId));
  };

  const handleClearCart = () => {
    playBeep('click', settings?.scannerSound);
    setCartItems([]);
    setOrderDiscountPercent(0);
    setOrderDiscountAmount(0);
    setSelectedCustomer(null);
  };

  // Discounts
  const handleApplyOrderDiscount = (percent: number, amount: number) => {
    playBeep('click', settings?.scannerSound);
    setOrderDiscountPercent(percent);
    setOrderDiscountAmount(amount);
  };

  const handleApplyItemDiscount = (productId: string, discountAmount: number) => {
    setCartItems(prev =>
      prev.map(item =>
        item.product.id === productId
          ? { ...item, discountAmount }
          : item
      )
    );
  };

  // Hold / Resume Order (CA-09 & CA-10)
  const handleHoldOrder = () => {
    if (cartItems.length === 0) return;

    if (!currentUser) {
      playBeep('error', settings?.scannerSound);
      setShowLoginModal(true);
      return;
    }

    playBeep('click', settings?.scannerSound);

    const newHold: HeldOrder = {
      id: `hold_${Date.now()}`,
      holdNumber: `HOLD-${Date.now().toString().slice(-6)}`,
      createdAt: new Date().toISOString(),
      cashierId: currentUser.id,
      cashierName: currentUser.name,
      customer: selectedCustomer || undefined,
      items: [...cartItems],
      orderDiscountPercent,
      orderDiscountAmount,
    };

    setHeldOrders(prev => [newHold, ...prev]);
    // Clear active cart for next sale
    setCartItems([]);
    setSelectedCustomer(null);
    setOrderDiscountPercent(0);
    setOrderDiscountAmount(0);
  };

  const handleResumeHeldOrder = (held: HeldOrder) => {
    // Never silently overwrite an active sale when resuming a parked order.
    // The cashier must hold, complete, or clear the current transaction first.
    if (cartItems.length > 0) {
      playBeep('error', settings?.scannerSound);
      window.alert(
        'Current Order already has items. Hold, complete, or clear the current order before resuming a held order.'
      );
      return;
    }

    setCartItems(held.items);
    setSelectedCustomer(held.customer || null);
    setOrderDiscountPercent(held.orderDiscountPercent);
    setOrderDiscountAmount(held.orderDiscountAmount);
    setHeldOrders(prev => prev.filter(h => h.id !== held.id));
    setShowHeldOrdersModal(false);
    setCurrentTab('pos');
    playBeep('success', settings?.scannerSound);
  };

  const handleDeleteHeldOrder = (id: string) => {
    setHeldOrders(prev => prev.filter(h => h.id !== id));
  };

  // Financial Calculations for Active Cart
  const rawSubtotal = cartItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const itemDiscountsTotal = cartItems.reduce((sum, item) => sum + item.discountAmount, 0);
  const adjustedSubtotal = rawSubtotal - itemDiscountsTotal;

  let calculatedOrderDiscount = 0;
  if (orderDiscountPercent > 0) {
    calculatedOrderDiscount = (adjustedSubtotal * orderDiscountPercent) / 100;
  } else if (orderDiscountAmount > 0) {
    calculatedOrderDiscount = Math.min(adjustedSubtotal, orderDiscountAmount);
  }

  const subtotalAfterDiscounts = adjustedSubtotal - calculatedOrderDiscount;
  const defaultTaxRate = settings?.defaultTaxRate ?? 0.0825;
  const orderDiscountFactor =
    adjustedSubtotal > 0 ? subtotalAfterDiscounts / adjustedSubtotal : 0;
  const taxTotal = cartItems.reduce((sum, item) => {
    const lineSubtotal = Math.max(
      0,
      item.unitPrice * item.quantity - (item.discountAmount || 0)
    );
    const lineTaxRate = item.product.taxRate ?? defaultTaxRate;
    return sum + lineSubtotal * orderDiscountFactor * lineTaxRate;
  }, 0);
  const grandTotal = subtotalAfterDiscounts + taxTotal;
  const discountTotalAll = itemDiscountsTotal + calculatedOrderDiscount;

  // Real-time synchronization of register cart to customer-facing display (WV-019 to WV-025)
  useEffect(() => {
    if (isCustomerDisplayMode) return;
    if (cartItems.length === 0) {
      if (!lastCompletedOrder) {
        hardwareStore.broadcastCustomerDisplay({
          screenState: 'welcome',
          items: [],
          subtotal: 0,
          discountTotal: 0,
          taxTotal: 0,
          grandTotal: 0,
        });
      }
    } else {
      const lastItem = cartItems[cartItems.length - 1];
      hardwareStore.broadcastCustomerDisplay({
        screenState: 'active_cart',
        items: cartItems.map(it => ({
          name: it.product.name,
          size: it.product.size || it.product.volume,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          lineTotal: (it.unitPrice * it.quantity) - (it.discountAmount || 0),
        })),
        subtotal: rawSubtotal,
        discountTotal: discountTotalAll,
        taxTotal: taxTotal,
        grandTotal: grandTotal,
        lastScannedItem: lastItem ? `${lastItem.product.name} (x${lastItem.quantity})` : undefined,
      });
    }
  }, [cartItems, rawSubtotal, discountTotalAll, taxTotal, grandTotal, lastCompletedOrder, isCustomerDisplayMode]);

  // Global Barcode Scanner Listeners (Hardware Keyboard Wedge + POS Bridge Pipeline)
  useEffect(() => {
    if (isCustomerDisplayMode) return;
    const unsubHardware = hardwareStore.subscribeBarcodeScan((scannedBarcode, source) => {
      handleBarcodeScanned(scannedBarcode, source || 'POS Bridge Scanner');
    });

    return unsubHardware;
  }, [handleBarcodeScanned, isCustomerDisplayMode]);

  // Customer Display Touch Action Listener (WV-050)
  useEffect(() => {
    if (isCustomerDisplayMode) return;
    const unregTouch = hardwareStore.subscribeCustomerTouchAction((event) => {
      if (event.type === 'LOYALTY_PHONE_ENTERED' && event.data?.phone) {
        const rawPhone = event.data.phone.replace(/\D/g, '');
        const foundCust = customers.find(c => c.phone.replace(/\D/g, '').includes(rawPhone));
        if (foundCust) {
          setSelectedCustomer(foundCust);
          playBeep('success');
        } else if (rawPhone.length >= 7) {
          const newCust: Customer = {
            id: `cust_${Date.now()}`,
            name: `VIP Customer (${rawPhone.slice(-4)})`,
            phone: event.data.phone,
            email: '',
            loyaltyPoints: 50,
            totalSpent: 0,
            orderCount: 0,
            active: true,
            createdAt: new Date().toISOString(),
          };
          api.createCustomer(newCust).then(saved => {
            setCustomers(prev => [...prev, saved]);
            setSelectedCustomer(saved);
            playBeep('success');
          }).catch(console.error);
        }
      }
    });
    return unregTouch;
  }, [customers, isCustomerDisplayMode]);

  // Checkout Completion (CA-06, CA-07, CA-08)
  const handleCompleteOrder = async (paymentDetails: any) => {
    if (!currentUser) throw new Error('No cashier session active');

    const pointsRedeemed = paymentDetails.pointsRedeemed || 0;
    const pointsDiscountAmount = paymentDetails.pointsDiscountAmount || 0;
    const finalGrandTotal = paymentDetails.amount !== undefined ? paymentDetails.amount : grandTotal;

    const orderPayload = {
      cashierId: currentUser.id,
      cashierName: currentUser.name,
      customerId: selectedCustomer?.id,
      customerName: selectedCustomer?.name,
      customerPhone: selectedCustomer?.phone,
      items: cartItems,
      subtotal: rawSubtotal,
      discountTotal: discountTotalAll + pointsDiscountAmount,
      taxTotal,
      grandTotal: finalGrandTotal,
      pointsRedeemed,
      pointsDiscountAmount,
      payment: paymentDetails,
      payments: paymentDetails.payments || undefined,
    };

    const completed = await api.createOrder(orderPayload);

    // Open the drawer exactly once, and only after the sale has been
    // successfully created. For split tenders, only open it when at least
    // one completed payment is actually cash.
    const completedPayments = Array.isArray(paymentDetails.payments)
      ? paymentDetails.payments
      : [];

    const hasCashTender =
      completedPayments.some(
        (payment: any) =>
          payment?.method === 'cash' &&
          payment?.status === 'completed' &&
          Number(payment?.cashTendered ?? 0) > 0
      ) ||
      (
        completedPayments.length === 0 &&
        paymentDetails.method === 'cash' &&
        Number(paymentDetails.cashTendered ?? 0) > 0
      );

    const hasLottoPayout = cartItems.some(
      item =>
        item.product?.sku === 'LOTTO-PAYOUT' ||
        String(item.product?.id || '').startsWith('lotto-payout-')
    );

    // Keep hardware I/O off the checkout UI path so Complete Sale feels fast.
    // Lotto payout drawer access happens only after the transaction is created.
    // Sequence drawer before receipt because both can share the receipt printer.
    void (async () => {
      if (hasCashTender || hasLottoPayout) {
        try {
          const drawerResult = await hardwareStore.openCashDrawer();

          if (!drawerResult.success) {
            console.warn(
              '[Cash Drawer] Sale completed, but drawer pulse failed:',
              drawerResult.message
            );
          }
        } catch (error) {
          console.error(
            '[Cash Drawer] Sale completed, but drawer pulse failed:',
            error
          );
        }
      }

      if (settings?.autoPrintReceipt ?? true) {
        try {
          const printResult = await hardwareStore.printReceipt(
            completed,
            settings
          );

          if (!printResult.success) {
            console.warn(
              '[Receipt Printer] Sale completed, but receipt printing failed:',
              printResult.message
            );
          }
        } catch (error) {
          console.error(
            '[Receipt Printer] Sale completed, but receipt printing failed:',
            error
          );
        }
      }
    })();

    hardwareStore.broadcastCustomerDisplay({
      screenState: 'thank_you',
      tenderedAmount: paymentDetails.amountPaid,
      changeDue: paymentDetails.changeGiven || 0,
      grandTotal: completed.grandTotal,
    });

    // Refresh state
    setOrders(prev => [completed, ...prev]);
    setLastCompletedOrder(completed);
    setShowCheckoutModal(false);
    setShowReceiptModal(true);

    // Clear register cart
    setCartItems([]);
    setSelectedCustomer(null);
    setOrderDiscountPercent(0);
    setOrderDiscountAmount(0);

    // Update the sold inventory locally immediately instead of downloading the
    // entire product/customer catalog while the receipt screen is opening.
    const soldQuantityByProduct = new Map<string, number>();

    for (const item of cartItems) {
      soldQuantityByProduct.set(
        item.product.id,
        (soldQuantityByProduct.get(item.product.id) || 0) + item.quantity
      );
    }

    setProducts(prev =>
      prev.map(product => {
        const soldQty = soldQuantityByProduct.get(product.id) || 0;

        if (soldQty <= 0) {
          return product;
        }

        return {
          ...product,
          stockQuantity: Math.max(0, product.stockQuantity - soldQty),
        };
      })
    );

    // Reconcile with the server only when the browser is idle. This preserves
    // server-authoritative inventory/loyalty values without competing with the
    // drawer, receipt printer, receipt modal, or the next cashier interaction.
    const reconcileAfterSale = () => {
      void api.getProducts()
        .then(setProducts)
        .catch(error => console.warn('[Post Sale] Product reconciliation failed:', error));

      if (selectedCustomer) {
        void api.getCustomers()
          .then(setCustomers)
          .catch(error => console.warn('[Post Sale] Customer reconciliation failed:', error));
      }
    };

    const browserWindow = window as Window & {
      requestIdleCallback?: (
        callback: () => void,
        options?: { timeout: number }
      ) => number;
    };

    if (typeof browserWindow.requestIdleCallback === 'function') {
      browserWindow.requestIdleCallback(reconcileAfterSale, { timeout: 3000 });
    } else {
      window.setTimeout(reconcileAfterSale, 1000);
    }
  };

  const handleStartNewSale = () => {
    setShowReceiptModal(false);
    setLastCompletedOrder(null);
    setCurrentTab('pos');
    hardwareStore.broadcastCustomerDisplay({
      screenState: 'welcome',
      items: [],
      subtotal: 0,
      discountTotal: 0,
      taxTotal: 0,
      grandTotal: 0,
      tenderedAmount: undefined,
      changeDue: undefined,
    });
  };

  const handleReprintReceipt = (order: Order) => {
    setLastCompletedOrder(order);
    setShowReceiptModal(true);
    hardwareStore.printReceipt(order, settings).catch(() => {});
  };

  const handleOpenLastReceipt = () => {
    // Prefer the order just completed in this register session.
    // After an app restart, select the newest COMPLETED order by timestamp
    // instead of assuming the API always returns orders in newest-first order.
    const latestCompletedOrder =
      lastCompletedOrder?.status === 'completed'
        ? lastCompletedOrder
        : orders
            .filter(order => order.status === 'completed')
            .reduce<Order | null>((latest, order) => {
              if (!latest) {
                return order;
              }

              const latestTime = Date.parse(latest.createdAt);
              const orderTime = Date.parse(order.createdAt);

              if (Number.isNaN(orderTime)) {
                return latest;
              }

              if (Number.isNaN(latestTime) || orderTime > latestTime) {
                return order;
              }

              return latest;
            }, null);

    if (!latestCompletedOrder) {
      playBeep('error');
      console.warn('[Receipt] No completed receipt is available yet.');
      return;
    }

    setLastCompletedOrder(latestCompletedOrder);
    setShowReceiptModal(true);
  };

  const handleToggleOffline = () => {
    const nextState = !isOffline;
    setIsOffline(nextState);
    api.setOfflineMode(nextState);
    playBeep('click');
  };

  const lowStockCount = products.filter(
    p => p.active && p.stockQuantity <= p.lowStockThreshold
  ).length;

  // Standalone Customer Check & ID Upload Form (opens directly on QR code scan)
  if (checkUploadSession) {
    return (
      <CheckUploadDirectView
        sessionId={checkUploadSession.sessionId}
        token={checkUploadSession.token}
        onExit={() => {
          window.location.search = '';
        }}
      />
    );
  }

  // Standalone Mobile AI Shelf Photo Camera Form (opens directly on shelf QR scan)
  if (shelfCameraSession) {
    return (
      <MobileFastCameraView
        mode="shelf"
        sessionId={shelfCameraSession.sessionId}
        onExit={() => {
          window.location.search = '';
        }}
      />
    );
  }

  // Standalone Mobile Invoice Capture View
  if (mobileSessionParam) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0E0E0E] flex flex-col">
        <MobileInvoiceCaptureView
          sessionId={mobileSessionParam.sessionId}
          token={mobileSessionParam.token}
          onComplete={() => {
            setMobileSessionParam(null);
            window.location.search = '';
          }}
        />
      </div>
    );
  }

  if (isCustomerDisplayMode) {
    return <CustomerDisplayView settings={settings} />;
  }

  if (isAuthenticating) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#0A0A0A] text-[#E5E5E5]">
        <div className="text-center">
          <div className="mx-auto mb-3 h-10 w-10 rounded-full border-2 border-[#333333] border-t-[#C5A059] animate-spin" />
          <p className="text-xs uppercase tracking-wider text-[#888888]">
            Starting KaBiRa POS...
          </p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#0A0A0A]">
        <LoginModal
          isOpen={true}
          onClose={() => {
            // A register cannot be used without an authenticated operator.
          }}
          onLoginSuccess={user => {
            setCurrentUser(user);
            setCurrentTab(user.role === 'Admin' ? 'dashboard' : 'pos');
            setShowLoginModal(false);
            void loadAllData();
          }}
        />
      </div>
    );
  }

  if (isQueueBusterMode) {
    return (
      <MobileQueueBusterView
        products={products}
        currentUser={currentUser}
        settings={settings}
        onExit={() => {
          window.location.search = '';
        }}
      />
    );
  }

  return (
    <div
      className={`flex ${currentUser.role === 'Admin' ? 'flex-row' : 'flex-col'} h-screen w-screen overflow-hidden bg-[#0A0A0A] font-sans text-[#E5E5E5] antialiased selection:bg-[#C5A059] selection:text-black`}
      style={{
        zoom: (settings?.windowZoomPercent ?? 100) / 100,
        fontSize: `${settings?.posScreenFontSizePx ?? 16}px`,
      }}
    >
      {currentUser.role === 'Admin' ? (
        <AdminPortalNav
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          currentUser={currentUser}
          settings={settings}
          onOpenDesigner={() => setShowDesignerModal(true)}
          onLogout={async () => {
            await api.logout();
            setCurrentUser(null);
            setCurrentTab('pos');
            setShowLoginModal(true);
          }}
        />
      ) : (
        <Navbar
                currentTab={currentTab}
                setCurrentTab={setCurrentTab}
                currentUser={currentUser}
                onOpenLogin={() => setShowLoginModal(true)}
                onLogout={async () => {
                  await api.logout();
                  setCurrentUser(null);
                  setShowLoginModal(true);
                }}
                heldOrdersCount={heldOrders.length}
                onOpenHeldOrders={() => setShowHeldOrdersModal(true)}
                onOpenScanner={() => setShowScannerModal(true)}
                lowStockCount={lowStockCount}
                onOpenLowStock={() => {
                  setCurrentTab('inventory');
                }}
                isOffline={isOffline}
                onToggleOffline={handleToggleOffline}
                settings={settings}
                onOpenBridgeHub={() => setShowBridgeHubModal(true)}
                onOpenManagerPortal={() => {
                  if (currentUser?.role === 'Manager' || currentUser?.role === 'Admin') {
                    setShowAllFunctionsModal(true);
                    return;
                  }
        
                  setShowManagerPortalLogin(true);
                }}
                onOpenPrintLabel={() => setShowPrintLabelModal(true)}
                onOpenCustomerDisplay={() => {
                  setShowCustomerDisplayModal(true);
                }}
                onOpenAllFunctions={() => setShowAllFunctionsModal(true)}
              />
      )}

      {/* Main Content Area */}
      <main className="flex-1 min-h-0 overflow-hidden relative">
        {currentTab === 'dashboard' && (
          currentUser.role === 'Admin' ? (
            <AdminHealthDashboard
              settings={settings}
              onOpenHardware={() => setCurrentTab('hardware-manager')}
              onOpenUsers={() => setCurrentTab('users')}
              onOpenInventory={() => setCurrentTab('inventory')}
            />
          ) : (
            <DashboardView
              onNavigateToInventory={() => setCurrentTab('inventory')}
              onNavigateToOrders={() => setCurrentTab('orders')}
              onViewOrderDetails={order => {
                setLastCompletedOrder(order);
                setShowReceiptModal(true);
              }}
            />
          )
        )}

        {currentTab === 'pos' && (
          <POSView
            products={products}
            categories={categories}
            cartItems={cartItems}
            onAddToCart={handleAddToCart}
            onUpdateQuantity={handleUpdateQuantity}
            onSetQuantity={handleSetQuantity}
            onRemoveItem={handleRemoveItem}
            onClearCart={handleClearCart}
            selectedCustomer={selectedCustomer}
            onOpenCustomerModal={() => setShowCustomerSelectModal(true)}
            onRemoveCustomer={() => setSelectedCustomer(null)}
            orderDiscountPercent={orderDiscountPercent}
            orderDiscountAmount={orderDiscountAmount}
            onApplyOrderDiscount={handleApplyOrderDiscount}
            onOpenItemDiscount={item => setItemDiscountTarget(item)}
            onHoldOrder={handleHoldOrder}
            onOpenHeldOrders={() => setShowHeldOrdersModal(true)}
            heldOrdersCount={heldOrders.length}
            onProceedToCheckout={() => setShowCheckoutModal(true)}
            settings={settings}
            currentUser={currentUser}
            onProductCreated={newProd => {
              setProducts(prev => [newProd, ...prev]);
            }}
            onOpenScannerModal={() => setShowScannerModal(true)}
            onOpenScaleModal={() => setShowScaleModal(true)}
            onOpenTablesView={() => setShowTablesModal(true)}
            onOpenKdsModal={() => setShowKdsModal(true)}
            onOpenDesigner={() => setShowDesignerModal(true)}
            onScanBarcode={handleBarcodeScanned}
            scanNotification={scanNotification}
            onDismissScanNotification={() => setScanNotification(null)}
            onPrintLastReceipt={handleOpenLastReceipt}
          />
        )}

        {currentTab === 'orders' && (
          <OrdersView
            orders={orders}
            currentUser={currentUser}
            settings={settings}
            onRefreshOrders={() => api.getOrders().then(setOrders)}
            onReprintReceipt={handleReprintReceipt}
          />
        )}

        {currentTab === 'shifts' && (
          <ShiftsView
            currentUser={currentUser}
            settings={settings}
            onRefreshData={loadAllData}
          />
        )}

        {currentTab === 'checks' && (
          <ChecksView
            currentUser={currentUser}
            settings={settings}
            onRefreshData={loadAllData}
          />
        )}

        {currentTab === 'inventory' && (
          currentUser?.role === 'Cashier' && !settings?.cashierPermissions?.allowInventory ? (
            <div className="h-full flex flex-col items-center justify-center bg-[#0D0D0D] text-[#E5E5E5] p-6">
              <div className="max-w-md w-full bg-[#141414] border border-[#262626] rounded-2xl p-8 text-center space-y-4 shadow-xl">
                <div className="w-16 h-16 rounded-full bg-amber-950/40 border border-amber-800/40 text-amber-400 mx-auto flex items-center justify-center">
                  <Boxes className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-white uppercase tracking-wider">Inventory Restricted</h2>
                <p className="text-sm text-[#888888] leading-relaxed">
                  Inventory catalog management and stock audits are restricted to <strong>Manager</strong> and <strong>Admin</strong> accounts, unless explicitly granted by management in Settings.
                </p>
                <div className="pt-2 flex justify-center">
                  <button
                    onClick={() => setCurrentTab('pos')}
                    className="px-5 py-2.5 rounded-xl bg-[#C5A059] hover:bg-[#B38F46] text-black text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Return to POS Register
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <InventoryView
              products={products}
              categories={categories}
              currentUser={currentUser}
              settings={settings}
              onRefresh={() => api.getProducts().then(setProducts)}
              initialSubTab="catalog"
              onOpenMobileCaptureSimulator={(sid, tok) => setMobileSessionParam({ sessionId: sid, token: tok })}
            />
          )
        )}

        {currentTab === 'receiving' && (
          <InventoryView
            products={products}
            categories={categories}
            currentUser={currentUser}
            settings={settings}
            onRefresh={() => api.getProducts().then(setProducts)}
            initialSubTab="invoices"
            onOpenMobileCaptureSimulator={(sid, tok) => setMobileSessionParam({ sessionId: sid, token: tok })}
          />
        )}

        {currentTab === 'customers' && (
          <CustomersView
            customers={customers}
            orders={orders}
            onRefresh={() => api.getCustomers().then(setCustomers)}
            onSelectForCart={cust => {
              setSelectedCustomer(cust);
              setCurrentTab('pos');
              playBeep('success');
            }}
          />
        )}

        {currentTab === 'reports' && (
          currentUser?.role === 'Cashier' && !settings?.cashierPermissions?.allowReports ? (
            <div className="h-full flex flex-col items-center justify-center bg-[#0D0D0D] text-[#E5E5E5] p-6">
              <div className="max-w-md w-full bg-[#141414] border border-[#262626] rounded-2xl p-8 text-center space-y-4 shadow-xl">
                <div className="w-16 h-16 rounded-full bg-amber-950/40 border border-amber-800/40 text-amber-400 mx-auto flex items-center justify-center">
                  <BarChart3 className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-white uppercase tracking-wider">Reports Restricted</h2>
                <p className="text-sm text-[#888888] leading-relaxed">
                  Financial and operational reporting is restricted to <strong>Manager</strong> and <strong>Admin</strong> accounts, unless granted by an administrator.
                </p>
                <div className="pt-2 flex justify-center">
                  <button
                    onClick={() => setCurrentTab('pos')}
                    className="px-5 py-2.5 rounded-xl bg-[#C5A059] hover:bg-[#B38F46] text-black text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Return to POS Register
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <ReportsView />
          )
        )}

        {currentTab === 'users' && (
          <UsersView
            users={users}
            currentUser={currentUser}
            onRefresh={() => api.getUsers().then(setUsers)}
          />
        )}

        {currentTab === 'settings' && (
          currentUser?.role === 'Cashier' ? (
            <div className="h-full flex flex-col items-center justify-center bg-[#0D0D0D] text-[#E5E5E5] p-6">
              <div className="max-w-md w-full bg-[#141414] border border-[#262626] rounded-2xl p-8 text-center space-y-4 shadow-xl">
                <div className="w-16 h-16 rounded-full bg-red-950/40 border border-red-800/40 text-red-400 mx-auto flex items-center justify-center">
                  <Settings className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-white uppercase tracking-wider">Settings Restricted</h2>
                <p className="text-sm text-[#888888] leading-relaxed">
                  POS configuration, payment gateways, and system settings are strictly reserved for <strong>Manager</strong> and <strong>Admin</strong> staff.
                </p>
                <div className="pt-2 flex justify-center">
                  <button
                    onClick={() => setCurrentTab('pos')}
                    className="px-5 py-2.5 rounded-xl bg-[#C5A059] hover:bg-[#B38F46] text-black text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Return to POS Register
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <ManagerSettingsCenter
              settings={settings}
              currentUser={currentUser}
              onRefresh={() => api.getSettings().then(setSettings)}
            />
          )
        )}

        {(currentTab === 'audit' || currentTab === 'audit-log') && <AuditLogsView />}
        {currentTab === 'user-activity' && (
          currentUser ? (
            <UserActivityTrackerView currentUser={currentUser} />
          ) : (
            <div className="flex h-full items-center justify-center p-6 text-sm text-slate-500">
              Sign in to view user activity.
            </div>
          )
        )}

        {currentTab === 'online-store' && (
          <OnlineStoreView
            currentUser={currentUser}
            settings={settings}
          />
        )}

        {(currentTab === 'hardware-manager' || currentTab === 'device-manager') && (
          <div className="h-full overflow-y-auto p-4 md:p-6 bg-[#0A0A0A]">
            <div className="max-w-7xl mx-auto">
              <HardwareDeviceManager
                onOpenCustomerDisplay={() => {
                  setShowCustomerDisplayModal(true);
                }}
              />
            </div>
          </div>
        )}
      </main>

      {/* Global Modals */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={user => {
          setCurrentUser(user);
          setCurrentTab(user.role === 'Admin' ? 'dashboard' : 'pos');
          setShowLoginModal(false);
          void loadAllData();
        }}
        currentUserId={currentUser?.id}
      />

      <LoginModal
        isOpen={showManagerPortalLogin}
        onClose={() => setShowManagerPortalLogin(false)}
        onLoginSuccess={user => {
          setCurrentUser(user);
          setShowManagerPortalLogin(false);
          if (user.role === 'Admin') {
            setCurrentTab('dashboard');
          } else {
            setShowAllFunctionsModal(true);
          }
          void loadAllData();
        }}
        currentUserId={currentUser?.id}
        managerOnly={true}
        title="Manager Portal Login"
        subtitle="Enter Manager/Admin credentials to access POS backend functions"
      />

      <PrintLabelModal
        isOpen={showPrintLabelModal}
        onClose={() => setShowPrintLabelModal(false)}
        products={products}
      />

      <CheckoutModal
        isOpen={showCheckoutModal}
        onClose={() => setShowCheckoutModal(false)}
        items={cartItems}
        subtotal={rawSubtotal}
        discountTotal={discountTotalAll}
        discountPercent={orderDiscountPercent}
        taxTotal={taxTotal}
        grandTotal={grandTotal}
        customer={selectedCustomer}
        currentUser={currentUser}
        settings={settings}
        onCompleteOrder={handleCompleteOrder}
      />

      <ReceiptModal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        order={lastCompletedOrder}
        settings={settings}
        onStartNewSale={handleStartNewSale}
      />

      <HeldOrdersModal
        isOpen={showHeldOrdersModal}
        onClose={() => setShowHeldOrdersModal(false)}
        heldOrders={heldOrders}
        onResumeOrder={handleResumeHeldOrder}
        onDeleteHeldOrder={handleDeleteHeldOrder}
      />

      <BarcodeScannerModal
        isOpen={showScannerModal}
        onClose={() => setShowScannerModal(false)}
        products={products}
        cartCount={cartItems.reduce((sum, item) => sum + item.quantity, 0)}
        cartTotal={cartItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity - (item.discountAmount || 0)), 0)}
        onScanBarcode={code => {
          handleBarcodeScanned(code, 'Barcode Scanner Terminal Modal');
        }}
      />

      <CustomerSelectModal
        isOpen={showCustomerSelectModal}
        onClose={() => setShowCustomerSelectModal(false)}
        customers={customers}
        onSelectCustomer={cust => setSelectedCustomer(cust)}
        onRefreshCustomers={() => api.getCustomers().then(setCustomers)}
      />

      <ItemDiscountModal
        isOpen={!!itemDiscountTarget}
        onClose={() => setItemDiscountTarget(null)}
        item={itemDiscountTarget}
        onApplyDiscount={handleApplyItemDiscount}
      />

      {/* POS Bridge Local Hardware Hub Modal (PB-001 to PB-040) */}
      <PosBridgeHubModal
        isOpen={showBridgeHubModal}
        onClose={() => setShowBridgeHubModal(false)}
        onOpenHardwareManager={() => setCurrentTab('hardware-manager')}
      />

      {/* Secondary Customer Display In-App Window (PB-018) */}
      {showCustomerDisplayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          <div className="bg-[#0B0F17] border border-slate-700 w-full max-w-5xl h-[85vh] rounded-2xl overflow-hidden flex flex-col shadow-2xl">
            <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">Customer Display Preview Window (Counter Secondary Monitor)</span>
              <button
                onClick={() => setShowCustomerDisplayModal(false)}
                className="text-xs font-bold px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg"
              >
                Close Preview
              </button>
            </div>
            <div className="flex-1 overflow-hidden relative">
              <CustomerDisplayView settings={settings} />
            </div>
          </div>
        </div>
      )}

      {/* Standalone Emergency Payment Fallback Modal (Separate Menu) */}
      <StandalonePaymentFallbackModal
        isOpen={showPaymentFallbackModal}
        onClose={() => setShowPaymentFallbackModal(false)}
        cartGrandTotal={grandTotal}
        cartItemCount={cartItems.length}
        settings={settings}
        currentUser={currentUser}
        onPaymentSuccess={async details => {
          playBeep('success');
          if (cartItems.length > 0) {
            // Finalize active cart order with fallback payment tender
            await handleCompleteOrder({
              method: details.method,
              cardBrand: details.cardBrand,
              cardLast4: details.cardLast4,
              authCode: details.authCode,
              processorTxId: details.processorTxId,
              paymentSessionId: details.paymentSessionId,
              fallbackMethod: details.fallbackMethod,
              isFallback: true,
            });
          } else {
            // Standalone emergency fallback charge: log order & show receipt
            try {
              const fallbackOrder = await api.createOrder({
                items: [
                  {
                    product: {
                      id: 'fallback-custom-charge',
                      name: `Emergency Charge (${details.fallbackMethod.replace(/_/g, ' ')})`,
                      sku: 'FALLBACK-PAY',
                      price: details.amountPaid,
                      category: 'Other',
                      stockQuantity: 999,
                      barcode: '00000000',
                      costPrice: 0,
                    },
                    quantity: 1,
                    price: details.amountPaid,
                    taxable: false,
                  },
                ],
                subtotal: details.amountPaid,
                discountTotal: 0,
                taxTotal: 0,
                grandTotal: details.amountPaid,
                payment: {
                  method: details.method,
                  cardBrand: details.cardBrand,
                  cardLast4: details.cardLast4,
                  authCode: details.authCode,
                  processorTxId: details.processorTxId,
                  fallbackMethod: details.fallbackMethod,
                  isFallback: true,
                },
              });
              setLastCompletedOrder(fallbackOrder);
              setShowReceiptModal(true);
              loadAllData();
            } catch (err) {
              console.error('Failed to log standalone fallback payment:', err);
            }
          }
        }}
      />

      {/* Global All System Functions Directory Modal */}
      <AllFunctionsMenuModal
        isOpen={showAllFunctionsModal}
        onClose={() => setShowAllFunctionsModal(false)}
        onNavigateTab={tab => setCurrentTab(tab as any)}
        currentUser={currentUser}
        settings={settings}
        onOpenModal={modalName => {
          if (modalName === 'checkout-fallback') {
            setShowPaymentFallbackModal(true);
          } else if (modalName === 'held-orders') {
            setShowHeldOrdersModal(true);
          } else if (modalName === 'scanner') {
            setShowScannerModal(true);
          } else if (modalName === 'customer-display') {
            setShowCustomerDisplayModal(true);
          } else if (modalName === 'bridge-hub') {
            setShowBridgeHubModal(true);
          } else if (modalName === 'health-check') {
            setShowStartupHealthModal(true);
          } else if (modalName === 'scale-plu') {
            setShowScaleModal(true);
          } else if (modalName === 'restaurant-tables') {
            setShowTablesModal(true);
          } else if (modalName === 'kitchen-kds') {
            setShowKdsModal(true);
          } else if (modalName === 'pos-designer') {
            setShowDesignerModal(true);
          } else if (modalName === 'store-features') {
            setShowStoreFeatureModal(true);
          }
        }}
      />

      {/* Identify Displays Overlay for Display 1 (WV-015) */}
      <IdentifyDisplaysOverlay currentDisplayNumber={1} />

      {/* Startup Health Check & Peripheral Readiness Modal (WV-006, WV-007, WV-008) */}
      <StartupHealthModal
        isOpen={showStartupHealthModal}
        onClose={() => setShowStartupHealthModal(false)}
        onProceedToRegister={() => {
          setShowStartupHealthModal(false);
          setCurrentTab('pos');
        }}
      />

      {/* PWA Offline Mode Status Indicator */}
      <OfflineIndicator />

      {/* Produce Scale & PLU Quick Code Modal */}
      <ProducePluScaleModal
        isOpen={showScaleModal}
        onClose={() => setShowScaleModal(false)}
        onAddProduceToCart={(product, weightInLbs, totalPrice) => {
          setCartItems(prev => {
            const existing = prev.find(item => item.product.id === product.id);
            if (existing) {
              return prev.map(item =>
                item.product.id === product.id
                  ? { ...item, quantity: parseFloat((item.quantity + weightInLbs).toFixed(2)) }
                  : item
              );
            }
            return [
              ...prev,
              {
                product: {
                  ...product,
                  price: parseFloat((totalPrice / weightInLbs).toFixed(2)),
                },
                quantity: weightInLbs,
              },
            ];
          });
          playBeep('success');
          setShowScaleModal(false);
        }}
      />

      {/* Kitchen Display System (KDS) Modal */}
      <KitchenKdsModal
        isOpen={showKdsModal}
        onClose={() => setShowKdsModal(false)}
      />

      {/* Restaurant Dining Room & Table Floor Map Modal */}
      {showTablesModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-6xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
              <div className="flex items-center space-x-2">
                <span className="text-xl">🍽️</span>
                <div>
                  <h2 className="text-lg font-bold text-white">Restaurant Dining Room & Table Floor Map</h2>
                  <p className="text-xs text-slate-400">Manage floor seating, live table timers, and guest orders</p>
                </div>
              </div>
              <button
                type="button"
                id="btn-close-tables-modal"
                onClick={() => setShowTablesModal(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <RestaurantTablesView
                onSelectTableForOrder={_table => {
                  setShowTablesModal(false);
                  setCurrentTab('pos');
                }}
                onOpenKds={() => {
                  setShowTablesModal(false);
                  setShowKdsModal(true);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* POS Modular Designer Modal */}
      {showDesignerModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-7xl h-[92vh] overflow-hidden flex flex-col shadow-2xl">
            <AdminPosDesigner
              onClose={() => setShowDesignerModal(false)}
              onApplyConfiguration={_cfg => {
                setShowDesignerModal(false);
              }}
            />
          </div>
        </div>
      )}

      {/* Store-Level POS Feature Management Modal */}
      <StoreFeatureManagementModal
        isOpen={showStoreFeatureModal}
        onClose={() => setShowStoreFeatureModal(false)}
        currentUser={currentUser}
        activeStoreId="store-1"
      />

      {/* Auto-Open Customer Display 2 Screen Banner & Floating Controller (Webform & Dual-Display) */}
      {(settings?.autoLaunchCustomerScreen ?? true) && !isCustomerDisplayMode && !checkUploadSession && !shelfCameraSession && !mobileSessionParam && (
        <CustomerDisplayAutoBanner
          onOpenCustomerDisplayModal={() => setShowCustomerDisplayModal(true)}
        />
      )}
    </div>
  );
}
