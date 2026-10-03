import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Boxes,
  CheckCircle2,
  ClipboardList,
  DollarSign,
  HardDrive,
  Monitor,
  Printer,
  RefreshCw,
  ScanBarcode,
  ShoppingCart,
  Store,
  UserRound,
  Users,
  WalletCards,
} from 'lucide-react';
import { AuditLog, Shift, StoreSettings, User } from '../../types';
import { api } from '../../utils/api';
import { hardwareStore } from '../../hardware';

interface ManagerOperationsDashboardProps {
  settings: StoreSettings | null;
  currentUser: User;
  heldOrdersCount: number;
  onNavigate: (tab: string) => void;
  onOpenHeldOrders: () => void;
}

export const ManagerOperationsDashboard: React.FC<ManagerOperationsDashboardProps> = ({
  settings,
  currentUser,
  heldOrdersCount,
  onNavigate,
  onOpenHeldOrders,
}) => {
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<any>(null);
  const [openShifts, setOpenShifts] = useState<Shift[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [bridgeHealth, setBridgeHealth] = useState(hardwareStore.getHealth());
  const [configuredHardware, setConfiguredHardware] = useState(hardwareStore.getConfiguredHardware());
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
      setBridgeHealth(hardwareStore.getHealth());
      setConfiguredHardware(hardwareStore.getConfiguredHardware());
      setLastUpdated(new Date().toLocaleTimeString());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();

    const unsubscribe = hardwareStore.subscribe(() => {
      setBridgeHealth(hardwareStore.getHealth());
      setConfiguredHardware(hardwareStore.getConfiguredHardware());
    });

    const timer = window.setInterval(() => void refresh(), 30000);
    return () => {
      unsubscribe();
      window.clearInterval(timer);
    };
  }, [refresh]);

  const bridgeOnline = bridgeHealth.status === 'running';
  const printerReady = Boolean(configuredHardware.receipt_printer?.deviceId);
  const drawerReady = Boolean(
    configuredHardware.cash_drawer?.deviceId ||
      configuredHardware.cash_drawer?.hostPrinterId
  );
  const scannerReady = Boolean(configuredHardware.barcode_scanner?.deviceId);
  const displayReady = Boolean(
    configuredHardware.customer_display?.deviceId ||
      configuredHardware.customer_display?.displayId
  );

  const lowStock = dashboard?.kpis?.lowStockCount ?? 0;
  const outOfStock = dashboard?.kpis?.outOfStockCount ?? 0;
  const orderCount = dashboard?.kpis?.orderCount ?? 0;
  const netSales = dashboard?.kpis?.netSales ?? 0;
  const lowStockItems = dashboard?.lowStockItems ?? [];

  const operationalIssues =
    (bridgeOnline ? 0 : 1) +
    (printerReady ? 0 : 1) +
    (drawerReady ? 0 : 1) +
    (scannerReady ? 0 : 1) +
    (displayReady ? 0 : 1);

  const attentionCount =
    lowStock + outOfStock + heldOrdersCount + operationalIssues;

  const attentionItems = useMemo(() => {
    const items: Array<{
      label: string;
      detail: string;
      tab: string;
      severity: 'critical' | 'warning' | 'info';
    }> = [];

    if (!bridgeOnline) {
      items.push({
        label: 'Hardware Bridge Offline',
        detail: 'Printer, drawer, scanner, and customer display access may be affected.',
        tab: 'hardware-manager',
        severity: 'critical',
      });
    }
    if (!printerReady) {
      items.push({
        label: 'Receipt Printer Needs Setup',
        detail: 'No receipt printer is assigned to this register.',
        tab: 'hardware-manager',
        severity: 'critical',
      });
    }
    if (outOfStock > 0) {
      items.push({
        label: `${outOfStock} Out of Stock`,
        detail: 'Review unavailable products and receiving status.',
        tab: 'inventory',
        severity: 'critical',
      });
    }
    if (lowStock > 0) {
      items.push({
        label: `${lowStock} Low Stock`,
        detail: 'Products are at or below their reorder threshold.',
        tab: 'inventory',
        severity: 'warning',
      });
    }
    if (!drawerReady || !scannerReady || !displayReady) {
      const missing = [
        !drawerReady ? 'drawer' : '',
        !scannerReady ? 'scanner' : '',
        !displayReady ? 'customer display' : '',
      ].filter(Boolean);
      items.push({
        label: 'Peripheral Setup Needed',
        detail: `Check ${missing.join(', ')} configuration.`,
        tab: 'hardware-manager',
        severity: 'warning',
      });
    }
    if (heldOrdersCount > 0) {
      items.push({
        label: `${heldOrdersCount} Held Order${heldOrdersCount === 1 ? '' : 's'}`,
        detail: 'Parked transactions are waiting at the register.',
        tab: 'pos',
        severity: 'info',
      });
    }

    return items;
  }, [
    bridgeOnline,
    printerReady,
    drawerReady,
    scannerReady,
    displayReady,
    outOfStock,
    lowStock,
    heldOrdersCount,
  ]);

  const summaryCards = [
    {
      label: "Today's Sales",
      value: `$${Number(netSales).toFixed(2)}`,
      detail: `${orderCount} completed transaction${orderCount === 1 ? '' : 's'}`,
      icon: DollarSign,
      tab: 'orders',
    },
    {
      label: 'Open Shifts',
      value: String(openShifts.length),
      detail: openShifts.length ? 'Cashiers currently active' : 'No active shifts',
      icon: WalletCards,
      tab: 'shifts',
    },
    {
      label: 'Low Stock Alerts',
      value: String(lowStock + outOfStock),
      detail: `${lowStock} low · ${outOfStock} out`,
      icon: Boxes,
      tab: 'inventory',
    },
    {
      label: 'Held Orders',
      value: String(heldOrdersCount),
      detail: 'Waiting at register',
      icon: ClipboardList,
      action: onOpenHeldOrders,
    },
    {
      label: 'Bridge Status',
      value: bridgeOnline ? 'ONLINE' : 'OFFLINE',
      detail: bridgeHealth.port ? `Port ${bridgeHealth.port}` : 'Local hardware service',
      icon: HardDrive,
      tab: 'hardware-manager',
    },
    {
      label: 'Needs Attention',
      value: String(attentionCount),
      detail: attentionCount ? 'Review store issues' : 'No immediate issues',
      icon: AlertTriangle,
      tab: attentionItems[0]?.tab || 'manager-dashboard',
    },
  ];

  const healthItems = [
    {
      label: 'POS Register',
      ok: bridgeOnline,
      detail: bridgeOnline ? 'Register connected' : 'Connection needs attention',
      icon: Monitor,
    },
    {
      label: 'Receipt Printer',
      ok: printerReady,
      detail: configuredHardware.receipt_printer?.deviceName || 'Not configured',
      icon: Printer,
    },
    {
      label: 'Hardware Bridge',
      ok: bridgeOnline,
      detail: bridgeOnline ? 'Online' : 'Offline',
      icon: HardDrive,
    },
    {
      label: 'Barcode Scanner',
      ok: scannerReady,
      detail: configuredHardware.barcode_scanner?.deviceName || 'Not configured',
      icon: ScanBarcode,
    },
    {
      label: 'Customer Display',
      ok: displayReady,
      detail: configuredHardware.customer_display?.deviceName || 'Not configured',
      icon: Monitor,
    },
  ];

  const quickActions = [
    { label: 'Transactions', sub: 'Search, refund, reprint', icon: ShoppingCart, tab: 'orders' },
    { label: 'Employees', sub: 'Staff and cashier access', icon: Users, tab: 'users' },
    { label: 'Open Reports', sub: 'Sales and operational reports', icon: BarChart3, tab: 'reports' },
    { label: 'Inventory Control', sub: 'Stock, receiving and counts', icon: Boxes, tab: 'inventory' },
    { label: 'Shifts & Cash', sub: 'Drawer and reconciliation', icon: WalletCards, tab: 'shifts' },
    { label: 'Hardware Diagnostics', sub: 'Bridge and peripherals', icon: HardDrive, tab: 'hardware-manager' },
  ];

  return (
    <div className="h-full overflow-y-auto bg-slate-100 text-slate-900">
      <div className="sticky top-0 z-20 bg-slate-950 border-b border-slate-800 px-5 py-3 flex items-center justify-between text-white">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-sky-950 border border-sky-800 flex items-center justify-center">
            <Store className="w-5 h-5 text-sky-400" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-black truncate">{settings?.storeName || 'KaBiRa POS Store'}</div>
            <div className="text-[10px] text-emerald-400 font-bold">
              {bridgeOnline ? 'Store systems connected' : 'Store system needs attention'}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs font-black">{currentUser.name}</div>
          <div className="text-[10px] text-slate-400">Manager</div>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] font-black text-amber-600">Store Operations</div>
            <h1 className="text-2xl font-black tracking-tight mt-1">Manager Control Center</h1>
            <p className="text-xs text-slate-500 mt-1">
              Daily sales, shifts, inventory, hardware, staff, and store activity · Updated {lastUpdated || '—'}
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
          {summaryCards.map((card: any) => {
            const Icon = card.icon;
            return (
              <button
                key={card.label}
                type="button"
                onClick={() => (card.action ? card.action() : onNavigate(card.tab))}
                className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm text-left hover:border-amber-300 hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-[10px] uppercase tracking-wider font-black">{card.label}</span>
                  <Icon className="w-4 h-4" />
                </div>
                <div className={`text-xl font-black mt-2 ${card.label === 'Bridge Status' && !bridgeOnline ? 'text-rose-600' : ''}`}>
                  {card.value}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">{card.detail}</div>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-black">Store & Register Health</h2>
                <p className="text-[11px] text-slate-500">Current configuration and local hardware readiness.</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('hardware-manager')}
                className="text-[10px] font-black uppercase tracking-wider text-sky-700 cursor-pointer"
              >
                Run Diagnostics
              </button>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 p-3">
              {healthItems.map(item => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => onNavigate('hardware-manager')}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-left hover:bg-white cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <Icon className="w-4 h-4 text-slate-600" />
                      <span className={`w-2 h-2 rounded-full ${item.ok ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    </div>
                    <div className="text-[11px] font-black mt-2">{item.label}</div>
                    <div className={`text-[10px] font-bold mt-1 ${item.ok ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {item.ok ? 'READY' : 'ATTENTION'}
                    </div>
                    <div className="text-[9px] text-slate-500 mt-1 truncate">{item.detail}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200">
              <h2 className="text-sm font-black">Quick Actions</h2>
              <p className="text-[11px] text-slate-500">Common manager tools.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 p-3">
              {quickActions.map(action => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.label}
                    type="button"
                    onClick={() => onNavigate(action.tab)}
                    className="rounded-xl border border-slate-200 bg-slate-50 hover:bg-amber-50 hover:border-amber-200 p-3 text-left cursor-pointer"
                  >
                    <Icon className="w-4 h-4 text-slate-700" />
                    <div className="text-[11px] font-black mt-2">{action.label}</div>
                    <div className="text-[9px] text-slate-500 mt-1">{action.sub}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-black">Open Shifts & Cash Overview</h2>
                <p className="text-[11px] text-slate-500">Current cashier shifts and drawer starting cash.</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('shifts')}
                className="text-[10px] font-black uppercase tracking-wider text-sky-700 cursor-pointer"
              >
                View All Shifts
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[9px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-2.5">Cashier</th>
                    <th className="px-4 py-2.5">Register</th>
                    <th className="px-4 py-2.5">Shift Start</th>
                    <th className="px-4 py-2.5">Opening Cash</th>
                    <th className="px-4 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {openShifts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-5 text-xs text-slate-500">No open shifts.</td>
                    </tr>
                  ) : (
                    openShifts.slice(0, 5).map(shift => (
                      <tr key={shift.id} className="text-xs">
                        <td className="px-4 py-3 font-black">{shift.cashierName}</td>
                        <td className="px-4 py-3 text-slate-600">{shift.registerName}</td>
                        <td className="px-4 py-3 text-slate-600">{new Date(shift.startTime).toLocaleTimeString()}</td>
                        <td className="px-4 py-3 font-mono font-bold">${Number(shift.startingCash || 0).toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-black uppercase">
                            Open
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-black">Low Stock / Alerts</h2>
                <p className="text-[11px] text-slate-500">Items below minimum level.</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('inventory')}
                className="text-[10px] font-black uppercase tracking-wider text-sky-700 cursor-pointer"
              >
                Inventory
              </button>
            </div>
            <div className="p-3 space-y-2">
              {lowStockItems.length === 0 ? (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-bold">
                  No low-stock products reported.
                </div>
              ) : (
                lowStockItems.slice(0, 6).map((item: any) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onNavigate('inventory')}
                    className="w-full flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-left cursor-pointer"
                  >
                    <div className="min-w-0">
                      <div className="text-[11px] font-black truncate">{item.name}</div>
                      <div className="text-[9px] text-slate-500 mt-0.5">{item.sku || item.barcode || 'No SKU'}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`text-xs font-black ${item.stockQuantity <= 0 ? 'text-rose-600' : 'text-amber-600'}`}>
                        {item.stockQuantity}
                      </div>
                      <div className="text-[9px] text-slate-500">Min {item.lowStockThreshold}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-black">Recent Activity</h2>
                <p className="text-[11px] text-slate-500">Latest operational activity across the store.</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('audit-log')}
                className="text-[10px] font-black uppercase tracking-wider text-sky-700 cursor-pointer"
              >
                View All Activity
              </button>
            </div>
            <div className="divide-y divide-slate-100">
              {auditLogs.length === 0 ? (
                <div className="p-4 text-xs text-slate-500">No recent activity recorded.</div>
              ) : (
                auditLogs.map(log => (
                  <div key={log.id} className="px-4 py-3 grid grid-cols-[80px_120px_1fr] gap-3 items-start text-[10px]">
                    <div className="text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</div>
                    <div className="font-black truncate">{log.userName}</div>
                    <div className="min-w-0">
                      <div className="font-black text-slate-800">{log.action.replace(/_/g, ' ')}</div>
                      <div className="text-slate-500 mt-0.5 truncate">{log.details}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200">
              <h2 className="text-sm font-black flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Needs Attention
              </h2>
              <p className="text-[11px] text-slate-500">Only issues requiring manager review.</p>
            </div>
            <div className="p-3 space-y-2">
              {attentionItems.length === 0 ? (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <div className="text-xs font-black text-emerald-800">No immediate store issues</div>
                    <div className="text-[10px] text-emerald-700 mt-1">Operations are clear.</div>
                  </div>
                </div>
              ) : (
                attentionItems.slice(0, 5).map(item => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => item.tab === 'pos' && heldOrdersCount ? onOpenHeldOrders() : onNavigate(item.tab)}
                    className={`w-full p-3 rounded-xl border text-left cursor-pointer ${
                      item.severity === 'critical'
                        ? 'bg-rose-50 border-rose-200'
                        : item.severity === 'warning'
                        ? 'bg-amber-50 border-amber-200'
                        : 'bg-sky-50 border-sky-200'
                    }`}
                  >
                    <div className="text-[11px] font-black">{item.label}</div>
                    <div className="text-[10px] text-slate-600 mt-1">{item.detail}</div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
