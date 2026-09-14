import React, { useState, useEffect, useRef } from 'react';
import { User, StoreSettings, PosBridgeStatus } from '../types';
import { posBridge } from '../services/posBridge';
import {
  Store,
  ShoppingCart,
  ReceiptText,
  Boxes,
  Users,
  BarChart3,
  TrendingUp,
  UserCheck,
  Settings,
  FileClock,
  LogOut,
  Wifi,
  WifiOff,
  PauseCircle,
  ScanBarcode,
  AlertTriangle,
  FileText,
  Coins,
  Landmark,
  Globe,
  Search,
  HelpCircle,
  MapPin,
  Clock,
  KeyRound,
  Cpu,
  Monitor,
  Bell,
  Wine,
  MoreHorizontal,
  ChevronDown,
  Smartphone,
  LayoutGrid,
  ShieldAlert,
} from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  currentUser: User | null;
  onOpenLogin: () => void;
  onLogout: () => void;
  heldOrdersCount: number;
  onOpenHeldOrders: () => void;
  onOpenScanner: () => void;
  lowStockCount: number;
  onOpenLowStock: () => void;
  isOffline: boolean;
  onToggleOffline: () => void;
  settings: StoreSettings | null;
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
  onOpenHelp?: () => void;
  onOpenBridgeHub?: () => void;
  onOpenCustomerDisplay?: () => void;
  onOpenAllFunctions?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  currentUser,
  onOpenLogin,
  onLogout,
  heldOrdersCount,
  onOpenHeldOrders,
  onOpenScanner,
  lowStockCount,
  onOpenLowStock,
  isOffline,
  onToggleOffline,
  settings,
  searchQuery = '',
  onSearchChange,
  onOpenHelp,
  onOpenBridgeHub,
  onOpenCustomerDisplay,
  onOpenAllFunctions,
}) => {
  const role = currentUser?.role || 'Cashier';
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Live POS Bridge Status (PB-004, PB-036)
  const [bridgeStatus, setBridgeStatus] = useState<PosBridgeStatus>(posBridge.getStatus());
  useEffect(() => {
    return posBridge.subscribeStatus(setBridgeStatus);
  }, []);

  // Live Clock
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentDateTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedDate = currentDateTime.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const formattedTime = currentDateTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <header className="bg-[#0B132B] text-white shrink-0 z-30 select-none shadow-sm">
      {/* Top Header Bar matching fin.png */}
      <div className="px-4 py-2 flex items-center justify-between gap-4 border-b border-slate-800">
        {/* Left: Store Brand & Terminal */}
        <div className="flex items-center space-x-3 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-amber-400/10 border border-amber-400/60 flex items-center justify-center text-amber-400 shadow-xs">
            <Wine className="w-5 h-5 text-[#F5BD47]" />
          </div>
          <div>
            <div className="flex items-baseline space-x-2">
              <span className="font-serif font-black text-white text-lg tracking-tight leading-none">
                {settings?.storeName || '377 Spirits'}
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                {settings?.city || 'Granbury'}, {settings?.state || 'TX'} {settings?.zip || '76049'}
              </span>
            </div>
            <span className="text-[10px] font-serif italic text-amber-300/90 font-medium leading-tight block mt-0.5">
              Good Spirits. Great People.
            </span>
          </div>

          <div className="hidden lg:flex items-center space-x-2 px-3 py-1 rounded-xl bg-[#1E293B] border border-slate-700/80 text-white ml-2">
            <Monitor className="w-4 h-4 text-slate-400" />
            <div className="leading-tight">
              <span className="text-xs font-bold text-white block">Terminal #01</span>
              <span className="text-[10px] text-slate-400 block font-medium">Main Register</span>
            </div>
          </div>
        </div>

        {/* Center: Search Bar */}
        <div className="flex-1 max-w-md mx-2">
          <div className="relative flex items-center bg-[#1E293B] border border-slate-700/80 rounded-xl px-3 py-1.5 focus-within:border-amber-400 focus-within:ring-1 focus-within:ring-amber-400/30 transition-all">
            <Search className="w-4 h-4 text-slate-400 shrink-0 mr-2" />
            <input
              type="text"
              placeholder="Search by name, SKU, or barcode..."
              value={searchQuery}
              onChange={e => onSearchChange && onSearchChange(e.target.value)}
              className="w-full bg-transparent border-none text-xs text-slate-100 placeholder:text-slate-400 focus:outline-none"
            />
            <button
              type="button"
              onClick={onOpenScanner}
              className="p-1 text-slate-400 hover:text-amber-400 transition-colors cursor-pointer"
              title="Barcode Scanner Gun Simulation"
            >
              <ScanBarcode className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right: Status, Quick actions, Help, Bell, User profile & Clock */}
        <div className="flex items-center space-x-3 shrink-0">
          {/* Held Orders Count */}
          {heldOrdersCount > 0 && (
            <button
              onClick={onOpenHeldOrders}
              className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-bold transition-all cursor-pointer"
              title="View Held Orders"
            >
              <PauseCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>Held ({heldOrdersCount})</span>
            </button>
          )}

          {/* Low Stock alerts */}
          {lowStockCount > 0 && (
            <button
              onClick={onOpenLowStock}
              className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold transition-all cursor-pointer"
              title="View Low Stock Items"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
              <span className="hidden sm:inline">Low Stock ({lowStockCount})</span>
            </button>
          )}

          {/* Online status indicator matching fin.png */}
          <button
            onClick={onToggleOffline}
            className="flex items-center space-x-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 cursor-pointer"
            title={isOffline ? 'Terminal Offline - Click to toggle' : 'Terminal Online - Click to toggle'}
          >
            <span className={`w-2 h-2 rounded-full ${isOffline ? 'bg-rose-500' : 'bg-emerald-400 animate-pulse'}`}></span>
            <span className="hidden sm:inline">{isOffline ? 'Offline' : 'Online'}</span>
          </button>

          {/* Settings shortcut - Managers and Admins only */}
          {role !== 'Cashier' && (
            <button
              onClick={() => setCurrentTab('settings')}
              className={`flex items-center space-x-1 text-xs font-semibold px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer ${
                currentTab === 'settings' ? 'text-amber-400 bg-slate-800' : 'text-slate-300 hover:text-white'
              }`}
              title="Settings (Manager/Admin)"
            >
              <Settings className="w-4 h-4 text-slate-300" />
              <span className="hidden md:inline">Settings</span>
            </button>
          )}

          {/* Help button matching fin.png */}
          <button
            onClick={onOpenHelp}
            className="flex items-center space-x-1 text-xs font-semibold text-slate-300 hover:text-white px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Help & Hotkey Shortcuts"
          >
            <HelpCircle className="w-4 h-4 text-slate-300" />
            <span className="hidden md:inline">Help</span>
          </button>

          {/* Bell with red badge 3 matching fin.png */}
          <div
            onClick={onOpenLowStock}
            className="relative p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
              3
            </span>
          </div>

          {/* User Profile avatar matching fin.png */}
          <div className="flex items-center space-x-2 pl-2 border-l border-slate-700/80">
            <button
              onClick={onOpenLogin}
              className="flex items-center space-x-2 text-left cursor-pointer group"
              title="Click to Switch User / Lock Terminal"
            >
              <div className="w-8 h-8 rounded-full bg-[#F5BD47] text-slate-950 font-black flex items-center justify-center text-xs shadow-xs group-hover:scale-105 transition-transform">
                {currentUser?.name.charAt(0) || 'E'}
              </div>
              <div className="hidden md:block leading-tight">
                <div className="text-xs font-bold text-white truncate max-w-[110px]">
                  {currentUser?.name || 'Elena Rostova'}
                </div>
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">
                  {currentUser?.role || 'CASHIER'}
                </div>
              </div>
            </button>
          </div>

          {/* Date & Time Clock matching fin.png */}
          <div className="hidden xl:block text-right pl-2 border-l border-slate-700/80 leading-tight">
            <div className="text-xs font-bold text-white">{formattedTime}</div>
            <div className="text-[10px] text-slate-400">{formattedDate}</div>
          </div>
        </div>
      </div>

      {/* Main Navigation Strip matching fin.png */}
      <div className="bg-white px-4 h-11 flex items-center justify-between border-b border-slate-200 text-slate-700 relative z-30 shrink-0">
        <nav className="flex items-center space-x-1 py-0.5">
          {/* POS REGISTER */}
          <button
            id="tab-pos"
            onClick={() => setCurrentTab('pos')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              currentTab === 'pos'
                ? 'bg-[#1E293B] text-[#F5BD47] shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ShoppingCart className={`w-3.5 h-3.5 ${currentTab === 'pos' ? 'text-[#F5BD47]' : 'text-slate-500'}`} />
            <span>POS Register</span>
          </button>

          {/* ORDERS */}
          <button
            id="tab-orders"
            onClick={() => setCurrentTab('orders')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              currentTab === 'orders'
                ? 'bg-[#1E293B] text-[#F5BD47] shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ReceiptText className={`w-3.5 h-3.5 ${currentTab === 'orders' ? 'text-[#F5BD47]' : 'text-slate-500'}`} />
            <span>Orders</span>
          </button>

          {/* SHIFTS & DRAWER */}
          <button
            id="tab-shifts"
            onClick={() => setCurrentTab('shifts')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              currentTab === 'shifts'
                ? 'bg-[#1E293B] text-[#F5BD47] shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Coins className={`w-3.5 h-3.5 ${currentTab === 'shifts' ? 'text-[#F5BD47]' : 'text-slate-500'}`} />
            <span>Shifts & Drawer</span>
          </button>

          {/* CUSTOMERS */}
          <button
            id="tab-customers"
            onClick={() => setCurrentTab('customers')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              currentTab === 'customers'
                ? 'bg-[#1E293B] text-[#F5BD47] shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Users className={`w-3.5 h-3.5 ${currentTab === 'customers' ? 'text-[#F5BD47]' : 'text-slate-500'}`} />
            <span>Customers</span>
          </button>

          {/* INVENTORY - Manager/Admin or permitted Cashier */}
          {(role === 'Admin' || role === 'Manager' || settings?.cashierPermissions?.allowInventory) && (
            <button
              id="tab-inventory"
              onClick={() => setCurrentTab('inventory')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                currentTab === 'inventory'
                  ? 'bg-[#1E293B] text-[#F5BD47] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Boxes className={`w-3.5 h-3.5 ${currentTab === 'inventory' ? 'text-[#F5BD47]' : 'text-slate-500'}`} />
              <span>Inventory</span>
            </button>
          )}

          {/* CHECK CASHING */}
          <button
            id="tab-checks"
            onClick={() => setCurrentTab('checks')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              currentTab === 'checks'
                ? 'bg-[#1E293B] text-[#F5BD47] shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Landmark className={`w-3.5 h-3.5 ${currentTab === 'checks' ? 'text-[#F5BD47]' : 'text-slate-500'}`} />
            <span>Check Cashing</span>
          </button>

          {/* REPORTS - Manager/Admin or permitted Cashier */}
          {(role === 'Admin' || role === 'Manager' || settings?.cashierPermissions?.allowReports) && (
            <button
              id="tab-reports"
              onClick={() => setCurrentTab('reports')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                currentTab === 'reports'
                  ? 'bg-[#1E293B] text-[#F5BD47] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <BarChart3 className={`w-3.5 h-3.5 ${currentTab === 'reports' ? 'text-[#F5BD47]' : 'text-slate-500'}`} />
              <span>Reports</span>
            </button>
          )}

          {/* MORE DROPDOWN - Manager and Admin portal only */}
          {(role === 'Admin' || role === 'Manager') && (
            <div className="relative shrink-0" ref={moreMenuRef}>
              <button
                id="tab-more"
                type="button"
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  ['online-store', 'audit-log', 'settings'].includes(currentTab)
                    ? 'bg-[#1E293B] text-[#F5BD47]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
                <span>More</span>
                <ChevronDown className="w-3 h-3 ml-0.5 text-slate-400" />
              </button>

              {showMoreMenu && (
                <div className="absolute left-0 top-full mt-1.5 w-52 bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                  {onOpenAllFunctions && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenAllFunctions();
                        setShowMoreMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-black text-amber-900 bg-amber-50 hover:bg-amber-100 flex items-center space-x-2 cursor-pointer border-b border-amber-100"
                    >
                      <LayoutGrid className="w-4 h-4 text-amber-600" />
                      <span>All System Functions</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setCurrentTab('online-store');
                      setShowMoreMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center space-x-2 cursor-pointer"
                  >
                    <Globe className="w-4 h-4 text-slate-500" />
                    <span>Online Storefront</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCurrentTab('audit-log');
                      setShowMoreMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center space-x-2 cursor-pointer"
                  >
                    <FileClock className="w-4 h-4 text-slate-500" />
                    <span>Audit Logs</span>
                  </button>

                  {onOpenBridgeHub && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenBridgeHub();
                        setShowMoreMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center space-x-2 cursor-pointer"
                    >
                      <Cpu className="w-4 h-4 text-slate-500" />
                      <span>POS Hardware Bridge</span>
                    </button>
                  )}

                  {onOpenCustomerDisplay && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenCustomerDisplay();
                        setShowMoreMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center space-x-2 cursor-pointer"
                    >
                      <Monitor className="w-4 h-4 text-slate-500" />
                      <span>Customer Facing Screen</span>
                    </button>
                  )}

                  <a
                    href="?view=queue-buster"
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setShowMoreMenu(false)}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center space-x-2 cursor-pointer"
                  >
                    <Smartphone className="w-4 h-4 text-amber-600" />
                    <span>Launch Mobile Queue Buster</span>
                  </a>

                  <div className="my-1 border-t border-slate-100" />

                  <button
                    type="button"
                    onClick={() => {
                      onLogout();
                      setShowMoreMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center space-x-2 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-rose-500" />
                    <span>Log Out</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ALL FUNCTIONS DIRECTORY BUTTON - Manager/Admin or permitted Cashier */}
          {onOpenAllFunctions && (role === 'Admin' || role === 'Manager' || settings?.cashierPermissions?.allowAllFunctions) && (
            <button
              id="btn-all-functions"
              type="button"
              onClick={onOpenAllFunctions}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer bg-[#C5A059] hover:bg-[#D4AF37] text-black shadow-xs ml-2 shrink-0"
              title="View & Search All System Functions"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>All Functions</span>
            </button>
          )}
        </nav>
      </div>
    </header>
  );
};
