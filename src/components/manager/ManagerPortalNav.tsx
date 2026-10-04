import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  Boxes,
  Clock3,
  LayoutDashboard,
  LogOut,
  Settings,
  ShoppingCart,
  Tag,
  Users,
  ChevronDown,
  Package,
  Layers,
  Truck,
  History,
  ClipboardList,
  BookOpen,
} from 'lucide-react';
import { StoreSettings, User } from '../../types';

interface ManagerPortalNavProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  currentUser: User;
  settings: StoreSettings | null;
  onLogout: () => void;
}

const navItems = [
  { id: 'manager-dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'orders', label: 'Sales', icon: BarChart3 },
  { id: 'inventory', label: 'Inventory', icon: Boxes },
  { id: 'manager-promotions', label: 'Promotions & Scan Data', icon: Tag },
  { id: 'shifts', label: 'Cash Reconcile', icon: Clock3 },
  { id: 'reports', label: 'Reports', icon: ShoppingCart },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const inventoryTabs = [
  { id: 'inventory', label: 'Items', icon: Package },
  { id: 'inventory-categories', label: 'Categories', icon: Layers },
  { id: 'inventory-vendors', label: 'Vendors / Suppliers', icon: Users },
  { id: 'receiving', label: 'Receive / Invoice Intake', icon: Truck },
  { id: 'inventory-receiving-ledger', label: 'Receiving Ledger', icon: History },
  { id: 'inventory-updates', label: 'Updates & Recounts', icon: ClipboardList },
  { id: 'inventory-count', label: 'ATS / Online Stock', icon: Boxes },
  { id: 'inventory-ledger', label: 'Omnichannel Ledger', icon: BookOpen },
];

export const ManagerPortalNav: React.FC<ManagerPortalNavProps> = ({
  currentTab,
  setCurrentTab,
  currentUser,
  settings,
  onLogout,
}) => {
  const inventoryRouteActive = inventoryTabs.some(item => item.id === currentTab) ||
    ['inventory-add', 'inventory-import'].includes(currentTab);
  const [inventoryOpen, setInventoryOpen] = useState(inventoryRouteActive);

  useEffect(() => {
    if (inventoryRouteActive) setInventoryOpen(true);
  }, [inventoryRouteActive]);

  return (
    <aside className="w-[238px] shrink-0 h-full bg-[#061326] border-r border-slate-800 flex flex-col text-slate-200">
      <div className="px-5 py-5 border-b border-slate-800">
        <div className="text-xl font-black text-amber-300">KaBiRa <span className="text-white font-semibold">POS</span></div>
        <div className="text-[10px] uppercase tracking-[0.22em] text-amber-400 mt-1">
          {settings?.storeName || '377 Spirits'}
        </div>
        <div className="text-[9px] text-slate-500 mt-0.5">Fine Liquors & Wine</div>
      </div>

      <nav className="flex-1 py-4 px-2 space-y-1">
        {navItems.map(item => {
          const Icon = item.icon;

          if (item.id === 'inventory') {
            return (
              <div key={item.id} className="space-y-1">
                <button
                  type="button"
                  onClick={() => setInventoryOpen(open => !open)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm font-semibold transition-all cursor-pointer ${
                    inventoryRouteActive
                      ? 'bg-sky-950/80 text-white border border-sky-700 shadow-lg shadow-sky-950/30'
                      : 'text-slate-300 hover:bg-slate-900 hover:text-white border border-transparent'
                  }`}
                >
                  <Boxes className={`w-5 h-5 ${inventoryRouteActive ? 'text-sky-300' : 'text-slate-400'}`} />
                  <span className="flex-1">Inventory</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${inventoryOpen ? 'rotate-180' : ''}`} />
                </button>

                {inventoryOpen && (
                  <div className="ml-4 pl-3 border-l border-slate-700/70 space-y-0.5 py-1">
                    {inventoryTabs.map(sub => {
                      const SubIcon = sub.icon;
                      const active =
                        currentTab === sub.id ||
                        (sub.id === 'inventory' && ['inventory-add', 'inventory-import'].includes(currentTab));

                      return (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => setCurrentTab(sub.id)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-[12px] font-medium transition-colors cursor-pointer ${
                            active
                              ? 'bg-amber-500/15 text-amber-300'
                              : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                          }`}
                        >
                          <SubIcon className={`w-4 h-4 ${active ? 'text-amber-300' : 'text-slate-500'}`} />
                          <span>{sub.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          const active = currentTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setCurrentTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm font-semibold transition-all cursor-pointer ${
                active
                  ? 'bg-sky-950/80 text-white border border-sky-700 shadow-lg shadow-sky-950/30'
                  : 'text-slate-300 hover:bg-slate-900 hover:text-white border border-transparent'
              }`}
            >
              <Icon className={`w-5 h-5 ${active ? 'text-sky-300' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-slate-800">
        <div className="rounded-xl bg-slate-950/60 border border-slate-800 px-3 py-3 mb-2">
          <div className="text-[9px] uppercase tracking-wider text-slate-500 font-black">Manager</div>
          <div className="text-xs font-black text-white mt-1 truncate">{currentUser.name}</div>
        </div>
        <button
          type="button"
          onClick={() => setCurrentTab('pos')}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-900 cursor-pointer"
        >
          <ShoppingCart className="w-4 h-4" />
          Open POS Register
        </button>
        <button
          type="button"
          onClick={onLogout}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-900 hover:text-white cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
};
