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
import { ShiftsView } from './components/shifts/ShiftsView';
import { ChecksView } from './components/checks/ChecksView';
import { OnlineStoreView } from './components/onlineStore/OnlineStoreView';
import { ManagerSettingsCenter } from './components/settings/ManagerSettingsCenter';
import { CheckUploadDirectView } from './components/checks/CheckUploadDirectView';
import { MobileFastCameraView } from './components/mobile/MobileFastCameraView';
import { MobileQueueBusterView } from './components/mobile/MobileQueueBusterView';
import { PosBridgeHubModal } from './components/bridge/PosBridgeHubModal';
import { CustomerDisplayView } from './components/display/CustomerDisplayView';
import { posBridge } from './services/posBridge';
import { Landmark, Boxes, BarChart3, Settings, ShieldAlert } from 'lucide-react';

import { LoginModal } from './components/LoginModal';
import { CheckoutModal } from './components/CheckoutModal';
import { ReceiptModal } from './components/ReceiptModal';
import { HeldOrdersModal } from './components/HeldOrdersModal';
import { BarcodeScannerModal } from './components/BarcodeScannerModal';
import { CustomerSelectModal } from './components/CustomerSelectModal';
import { ItemDiscountModal } from './components/ItemDiscountModal';
import { MobileInvoiceCaptureView } from './components/invoice/MobileInvoiceCaptureView';
import { StandalonePaymentFallbackModal } from './components/payment/StandalonePaymentFallbackModal';
import { AllFunctionsMenuModal } from './components/AllFunctionsMenuModal';

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

  // Active View Tab
  const [currentTab, setCurrentTab] = useState<string>('pos');

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
  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>([]);
  const [showHeldOrdersModal, setShowHeldOrdersModal] = useState<boolean>(false);

  // Modals & Overlays
  const [showCheckoutModal, setShowCheckoutModal] = useState<boolean>(false);
  const [showReceiptModal, setShowReceiptModal] = useState<boolean>(false);
  const [lastCompletedOrder, setLastCompletedOrder] = useState<Order | null>(null);
  const [showScannerModal, setShowScannerModal] = useState<boolean>(false);
  const [showCustomerSelectModal, setShowCustomerSelectModal] = useState<boolean>(false);
  const [itemDiscountTarget, setItemDiscountTarget] = useState<CartItem | null>(null);
  const [showBridgeHubModal, setShowBridgeHubModal] = useState<boolean>(false);
  const [showCustomerDisplayModal, setShowCustomerDisplayModal] = useState<boolean>(false);
  const [showPaymentFallbackModal, setShowPaymentFallbackModal] = useState<boolean>(false);
  const [showAllFunctionsModal, setShowAllFunctionsModal] = useState<boolean>(false);

  // Standalone Customer-Facing Display Detection (PB-018)
  const isCustomerDisplayMode = useMemo(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return (
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

  // Initial Data Fetch
  const loadAllData = useCallback(async () => {
    try {
      const [u, prods, cats, ords, custs, usrs, setts] = await Promise.all([
        api.getCurrentUser().catch(() => null),
        api.getProducts().catch(() => []),
        api.getCategories().catch(() => []),
        api.getOrders().catch(() => []),
        api.getCustomers().catch(() => []),
        api.getUsers().catch(() => []),
        api.getSettings().catch(() => null),
      ]);

      if (u) {
        setCurrentUser(u);
      } else if (usrs && usrs.length > 0) {
        // Default to first active user if session not established
        const defaultUser = usrs.find(usr => usr.role === 'Cashier' && usr.active) || usrs[0];
        setCurrentUser(defaultUser);
        api.setUserId(defaultUser.id);
      }

      setProducts(prods);
      setCategories(cats);
      setOrders(ords);
      setCustomers(custs);
      setUsers(usrs);
      if (setts) setSettings(setts);
    } catch (err) {
      console.error('Failed to load initial POS data:', err);
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
          alert(`Cannot add more: Only ${product.stockQuantity} units available in inventory.`);
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
              alert(`Maximum available stock reached (${item.product.stockQuantity})`);
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
    playBeep('click', settings?.scannerSound);

    const newHold: HeldOrder = {
      id: `hold_${Date.now()}`,
      holdNumber: `HOLD-${Math.floor(100 + Math.random() * 900)}`,
      createdAt: new Date().toISOString(),
      cashierId: currentUser?.id || 'cashier-1',
      cashierName: currentUser?.name || 'Cashier',
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
    setCartItems(held.items);
    setSelectedCustomer(held.customer || null);
    setOrderDiscountPercent(held.orderDiscountPercent);
    setOrderDiscountAmount(held.orderDiscountAmount);
    setHeldOrders(prev => prev.filter(h => h.id !== held.id));
    setCurrentTab('pos');
  };

  const handleDeleteHeldOrder = (id: string) => {
    setHeldOrders(prev => prev.filter(h => h.id !== id));
  };

  // Financial Calculations for Active Cart
  const rawSubtotal = cartItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const itemDiscountsTotal = cartItems.reduce((sum, item) => sum + item.discountAmount, 0);
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
  const discountTotalAll = itemDiscountsTotal + calculatedOrderDiscount;

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
    };

    const completed = await api.createOrder(orderPayload);

    // POS Bridge Hardware Integration (PB-009, PB-014, PB-018)
    if (paymentDetails.method === 'cash' || paymentDetails.method === 'split') {
      posBridge.kickCashDrawer({
        type: paymentDetails.method === 'cash' ? 'sale_cash' : 'sale_split',
        reason: 'Cash sale transaction tender',
        orderNumber: completed.orderNumber,
        amount: paymentDetails.amountPaid,
        user: currentUser || undefined,
      });
    }

    if (settings?.autoPrintReceipt ?? true) {
      posBridge.printReceipt(completed, settings);
    }

    posBridge.broadcastCustomerDisplay({
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

    // Refresh products to update inventory counts
    api.getProducts().then(setProducts).catch(console.error);
    api.getCustomers().then(setCustomers).catch(console.error);
  };

  const handleStartNewSale = () => {
    setShowReceiptModal(false);
    setLastCompletedOrder(null);
    setCurrentTab('pos');
    posBridge.broadcastCustomerDisplay({
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
    posBridge.printReceipt(order, settings);
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
    return <CustomerDisplayView />;
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
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0A0A0A] font-sans text-[#E5E5E5] antialiased selection:bg-[#C5A059] selection:text-black">
      {/* Top Navbar */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        currentUser={currentUser}
        onOpenLogin={() => setShowLoginModal(true)}
        onLogout={() => {
          api.logout();
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
        onOpenCustomerDisplay={() => {
          try {
            const w = window.open(
              `${window.location.origin}${window.location.pathname}?view=customer-display`,
              'CustomerDisplayWindow',
              'width=1024,height=768,menubar=no,toolbar=no,location=no,status=no'
            );
            if (!w || w.closed || typeof w.closed === 'undefined') {
              setShowCustomerDisplayModal(true);
            }
          } catch {
            setShowCustomerDisplayModal(true);
          }
        }}
        onOpenAllFunctions={() => setShowAllFunctionsModal(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 min-h-0 overflow-hidden relative">
        {currentTab === 'dashboard' && (
          <DashboardView
            onNavigateToInventory={() => setCurrentTab('inventory')}
            onNavigateToOrders={() => setCurrentTab('orders')}
            onViewOrderDetails={order => {
              setLastCompletedOrder(order);
              setShowReceiptModal(true);
            }}
          />
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

        {currentTab === 'audit' && <AuditLogsView />}

        {currentTab === 'online-store' && (
          <OnlineStoreView
            currentUser={currentUser}
            settings={settings}
          />
        )}
      </main>

      {/* Global Modals */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={user => {
          setCurrentUser(user);
        }}
        currentUserId={currentUser?.id}
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
        onScanBarcode={code => {
          const found = products.find(
            p => p.barcode === code || p.sku.toLowerCase() === code.toLowerCase()
          );
          if (found) {
            handleAddToCart(found);
          }
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
              <CustomerDisplayView />
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
          }
        }}
      />
    </div>
  );
}
