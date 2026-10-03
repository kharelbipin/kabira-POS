import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Boxes,
  CheckCircle2,
  ClipboardList,
  DollarSign,
  HardDrive,
  RefreshCw,
  ShoppingCart,
  UserRound,
  WalletCards,
} from 'lucide-react';
import { AuditLog, Shift, StoreSettings } from '../../types';
import { api } from '../../utils/api';
import { hardwareStore } from '../../hardware';

interface ManagerOperationsDashboardProps {
  settings: StoreSettings | null;
  heldOrdersCount: number;
  onNavigate: (tab: string) => void;
}

export const ManagerOperationsDashboard: React.FC<ManagerOperationsDashboardProps> = ({
  settings,
  heldOrdersCount,
  onNavigate,
}) => {
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<any>(null);
  const [openShifts, setOpenShifts] = useState<Shift[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [bridgeOnline, setBridgeOnline] = useState(hardwareStore.getHealth().status === 'running');
  const [lastUpdated, setLastUpdated] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [dashboardResult, shiftsResult, auditResult] = await Promise.all([
        api.getDashboardOverview({ period: 'today' }).catch(() => null),
        api.getShifts({ status: 'open' }).catch(() => []),
        api.getAuditLogs().catch(() => []),
        hardwareStore.refreshHealth().catch(() => hardwareStore.getHealth()),
      ]);

      setDashboard(dashboardResult);
      setOpenShifts(shiftsResult);
      setAuditLogs(
        [...auditResult]
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 6)
      );
      setBridgeOnline(hardwareStore.getHealth().status === 'running');
      setLastUpdated(new Date().toLocaleTimeString());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 30000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const lowStock = dashboard?.kpis?.lowStockCount ?? 0;
  const outOfStock = dashboard?.kpis?.outOfStockCount ?? 0;
  const orderCount = dashboard?.kpis?.orderCount ?? 0;
  const netSales = dashboard?.kpis?.netSales ?? 0;
  const attentionCount = lowStock + outOfStock + heldOrdersCount + (bridgeOnline ? 0 : 1);

  const attentionItems = useMemo(() => {
    const items: Array<{ label: string; detail: string; tab: string; severity: 'critical' | 'warning' | 'info' }> = [];
    if (!bridgeOnline) {
      items.push({ label: 'Hardware Bridge Offline', detail: 'Printer, drawer, scanner, and display access may be affected.', tab: 'hardware-manager', severity: 'critical' });
    }
    if (outOfStock > 0) {
      items.push({ label: `${outOfStock} Out of Stock`, detail: 'Review unavailable products and receiving status.', tab: 'inventory', severity: 'critical' });
    }
    if (lowStock > 0) {
      items.push({ label: `${lowStock} Low Stock`, detail: 'Products are at or below their reorder threshold.', tab: 'inventory', severity: 'warning' });
    }
    if (heldOrdersCount > 0) {
      items.push({ label: `${heldOrdersCount} Held Order${heldOrdersCount === 1 ? '' : 's'}`, detail: 'Parked transactions are still waiting at the register.', tab: 'pos', severity: 'info' });
    }
    return items;
  }, [bridgeOnline, outOfStock, lowStock, heldOrdersCount]);

  const cards = [
    { label: 'Today Sales', value: `$${Number(netSales).toFixed(2)}`, detail: `${orderCount} completed transactions`, icon: DollarSign, tab: 'orders' },
    { label: 'Open Shifts', value: String(openShifts.length), detail: openShifts.length ? openShifts.map(s => s.cashierName).slice(0, 2).join(', ') : 'No active shifts', icon: WalletCards, tab: 'shifts' },
    { label: 'Stock Alerts', value: String(lowStock + outOfStock), detail: `${lowStock} low · ${outOfStock} out`, icon: Boxes, tab: 'inventory' },
    { label: 'Held Orders', value: String(heldOrdersCount), detail: 'Waiting at register', icon: ClipboardList, tab: 'pos' },
    { label: 'Bridge', value: bridgeOnline ? 'ONLINE' : 'OFFLINE', detail: 'Local hardware service', icon: HardDrive, tab: 'hardware-manager' },
    { label: 'Needs Attention', value: String(attentionCount), detail: attentionCount ? 'Review store issues' : 'Store operations look clear', icon: AlertTriangle, tab: attentionItems[0]?.tab || 'manager-dashboard' },
  ];

  return (
    <div className="h-full overflow-y-auto bg-slate-100 text-slate-900 p-4 md:p-6 space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] font-black text-amber-600">Store Operations</div>
          <h1 className="text-2xl font-black tracking-tight mt-1">Manager Dashboard</h1>
          <p className="text-xs text-slate-500 mt-1">
            Daily operations for {settings?.storeName || 'this store'} · Updated {lastUpdated || '—'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onNavigate('pos')}
            className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-black hover:bg-slate-800 cursor-pointer"
          >
            Open POS Register
          </button>
          <button
            type="button"
            onClick={() => void refresh()}
            className="px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-black flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-6 gap-3">
        {cards.map(card => {
          const Icon = card.icon;
          return (
            <button
              key={card.label}
              type="button"
              onClick={() => onNavigate(card.tab)}
              className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm text-left hover:border-amber-300 cursor-pointer"
            >
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[10px] uppercase tracking-wider font-black">{card.label}</span>
                <Icon className="w-4 h-4" />
              </div>
              <div className="text-xl font-black mt-2">{card.value}</div>
              <div className="text-[10px] text-slate-500 mt-1">{card.detail}</div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200">
            <h2 className="text-sm font-black">Needs Attention</h2>
            <p className="text-[11px] text-slate-500">Only items that may need manager action now.</p>
          </div>
          <div className="p-3 space-y-2">
            {attentionItems.length === 0 ? (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <div>
                  <div className="text-xs font-black text-emerald-800">No immediate store issues</div>
                  <div className="text-[11px] text-emerald-700">Shifts, inventory alerts, held orders, and bridge status look clear.</div>
                </div>
              </div>
            ) : (
              attentionItems.map(item => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => onNavigate(item.tab)}
                  className={`w-full p-3 rounded-xl border text-left cursor-pointer ${
                    item.severity === 'critical'
                      ? 'bg-rose-50 border-rose-200'
                      : item.severity === 'warning'
                      ? 'bg-amber-50 border-amber-200'
                      : 'bg-sky-50 border-sky-200'
                  }`}
                >
                  <div className="text-xs font-black">{item.label}</div>
                  <div className="text-[11px] text-slate-600 mt-1">{item.detail}</div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200">
            <h2 className="text-sm font-black">Open Shifts</h2>
            <p className="text-[11px] text-slate-500">Cashiers currently running the store.</p>
          </div>
          <div className="p-3 space-y-2">
            {openShifts.length === 0 ? (
              <div className="text-xs text-slate-500 p-2">No open shifts.</div>
            ) : (
              openShifts.slice(0, 5).map(shift => (
                <button
                  key={shift.id}
                  type="button"
                  onClick={() => onNavigate('shifts')}
                  className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <UserRound className="w-4 h-4 text-sky-600" />
                    <div className="text-xs font-black">{shift.cashierName}</div>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    {shift.registerName} · Since {new Date(shift.startTime).toLocaleTimeString()}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-black">Latest Store Activity</h2>
            <p className="text-[11px] text-slate-500">Recent operational actions, not a full audit timeline.</p>
          </div>
          <button type="button" onClick={() => onNavigate('audit-log')} className="text-[10px] font-black uppercase tracking-wider text-sky-700 cursor-pointer">
            View Activity
          </button>
        </div>
        <div className="divide-y divide-slate-100">
          {auditLogs.length === 0 ? (
            <div className="p-4 text-xs text-slate-500">No recent activity recorded.</div>
          ) : (
            auditLogs.map(log => (
              <div key={log.id} className="px-4 py-3 flex items-start gap-3">
                <Activity className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-black truncate">{log.details || log.action}</div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    {log.userName} · {new Date(log.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ['Transactions', 'orders', ShoppingCart],
          ['Shifts & Cash', 'shifts', WalletCards],
          ['Inventory', 'inventory', Boxes],
          ['Hardware', 'hardware-manager', HardDrive],
        ].map(([label, tab, Icon]: any) => (
          <button
            key={tab}
            type="button"
            onClick={() => onNavigate(tab)}
            className="p-4 rounded-2xl bg-slate-900 text-white text-left hover:bg-slate-800 cursor-pointer"
          >
            <Icon className="w-5 h-5 text-amber-400 mb-2" />
            <div className="text-xs font-black">{label}</div>
          </button>
        ))}
      </div>
    </div>
  );
};
