import React from 'react';
import {
  LayoutDashboard,
  Store,
  MonitorCog,
  Users,
  BarChart3,
  Activity,
  Settings,
  Palette,
  ShoppingCart,
  LogOut,
  ShieldCheck,
  Cpu,
} from 'lucide-react';
import { StoreSettings, User } from '../../types';

interface AdminPortalNavProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  currentUser: User;
  settings: StoreSettings | null;
  onOpenDesigner: () => void;
  onLogout: () => void;
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'pos', label: 'POS Register', icon: ShoppingCart },
  { id: 'users', label: 'Users & Roles', icon: Users },
  { id: 'hardware-manager', label: 'Hardware', icon: Cpu },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'user-activity', label: 'Audit & Activity', icon: Activity },
  { id: 'settings', label: 'System Settings', icon: Settings },
];

export const AdminPortalNav: React.FC<AdminPortalNavProps> = ({
  currentTab,
  setCurrentTab,
  currentUser,
  settings,
  onOpenDesigner,
  onLogout,
}) => {
  return (
    <aside className="w-[240px] shrink-0 h-screen bg-slate-950 border-r border-slate-800 flex flex-col text-slate-100">
      <div className="px-4 py-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-amber-400" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-black tracking-wide">KaBiRa Admin</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Control Center</div>
          </div>
        </div>
      </div>

      <div className="px-3 py-3 border-b border-slate-800">
        <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Current Store</div>
        <div className="mt-1 text-xs font-bold text-slate-200 truncate">
          {settings?.storeName || 'KaBiRa POS Store'}
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-[10px] text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          Store connected
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-2.5 space-y-1">
        <div className="px-2 pt-1 pb-1 text-[10px] uppercase tracking-wider text-slate-600 font-bold">
          Administration
        </div>

        {navItems.map(item => {
          const Icon = item.icon;
          const active = currentTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setCurrentTab(item.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-xs font-bold transition-colors cursor-pointer ${
                active
                  ? 'bg-amber-400 text-slate-950'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={onOpenDesigner}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-900 transition-colors cursor-pointer"
        >
          <Palette className="w-4 h-4 shrink-0" />
          <span>POS Designer</span>
        </button>

      </nav>

      <div className="p-3 border-t border-slate-800">
        <div className="px-3 py-2 mb-2 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-xs font-bold text-slate-200 truncate">{currentUser.name}</div>
          <div className="text-[10px] uppercase tracking-wider text-amber-400">Administrator</div>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-rose-300 hover:bg-rose-950/30 border border-rose-900/40 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
};
