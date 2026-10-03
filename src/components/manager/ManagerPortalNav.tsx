import React from 'react';
import {
  Activity,
  BarChart3,
  Boxes,
  ClipboardList,
  Gauge,
  HardDrive,
  LogOut,
  Settings,
  ShoppingCart,
  UserRoundCog,
  WalletCards,
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
  { id: 'manager-dashboard', label: 'Dashboard', icon: Gauge },
  { id: 'pos', label: 'POS Register', icon: ShoppingCart },
  { id: 'orders', label: 'Transactions', icon: ClipboardList },
  { id: 'shifts', label: 'Shifts & Cash', icon: WalletCards },
  { id: 'inventory', label: 'Inventory', icon: Boxes },
  { id: 'users', label: 'Employees', icon: UserRoundCog },
  { id: 'hardware-manager', label: 'Hardware', icon: HardDrive },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'audit-log', label: 'Activity', icon: Activity },
  { id: 'settings', label: 'Store Settings', icon: Settings },
];

export const ManagerPortalNav: React.FC<ManagerPortalNavProps> = ({
  currentTab,
  setCurrentTab,
  currentUser,
  settings,
  onLogout,
}) => {
  return (
    <aside className="w-64 shrink-0 h-full bg-slate-950 border-r border-slate-800 flex flex-col text-slate-200">
      <div className="px-4 py-4 border-b border-slate-800">
        <div className="text-[10px] uppercase tracking-[0.2em] font-black text-amber-400">KaBiRa POS</div>
        <div className="text-lg font-black text-white mt-1">Manager Portal</div>
        <div className="text-[11px] text-slate-400 mt-1 truncate">
          {settings?.storeName || 'Store Operations'}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {navItems.map(item => {
          const Icon = item.icon;
          const active = currentTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setCurrentTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-xs font-bold transition-colors cursor-pointer ${
                active
                  ? 'bg-amber-400 text-slate-950'
                  : 'text-slate-300 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-slate-800 space-y-2">
        <div className="rounded-xl bg-slate-900 border border-slate-800 px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-black">Signed in</div>
          <div className="text-xs font-black text-white mt-1 truncate">{currentUser.name}</div>
          <div className="text-[10px] text-slate-400">Manager</div>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-slate-700 text-xs font-black text-slate-300 hover:bg-slate-900 hover:text-white cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
};
