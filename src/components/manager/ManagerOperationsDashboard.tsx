import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  CreditCard,
  DollarSign,
  Monitor,
  Printer,
  RefreshCw,
  ShoppingCart,
  Tag,
} from 'lucide-react';
import { Order, Product, StoreSettings, User } from '../../types';
import { api } from '../../utils/api';
import { hardwareStore } from '../../hardware';

interface ManagerOperationsDashboardProps {
  settings: StoreSettings | null;
  currentUser: User;
  orders: Order[];
  products: Product[];
  onNavigate: (tab: string) => void;
}

type Period = 'today' | 'week' | 'month';

const money = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);

const shortMoney = (value: number) => {
  if (value >= 1000) return `$${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  return money(value);
};

export const ManagerOperationsDashboard: React.FC<ManagerOperationsDashboardProps> = ({
  settings,
  currentUser,
  orders,
  products,
  onNavigate,
}) => {
  const [period, setPeriod] = useState<Period>('week');
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<any>(null);
  const [bridgeHealth, setBridgeHealth] = useState(hardwareStore.getHealth());
  const [configuredHardware, setConfiguredHardware] = useState(hardwareStore.getConfiguredHardware());

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.getDashboardOverview({
        period: period === 'today' ? 'today' : period === 'month' ? 'month' : 'week',
      });
      setDashboard(result);
      await hardwareStore.refreshHealth().catch(() => hardwareStore.getHealth());
      setBridgeHealth(hardwareStore.getHealth());
      setConfiguredHardware(hardwareStore.getConfiguredHardware());
    } catch (error) {
      console.error('Failed to refresh manager dashboard', error);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    return hardwareStore.subscribe(() => {
      setBridgeHealth(hardwareStore.getHealth());
      setConfiguredHardware(hardwareStore.getConfiguredHardware());
    });
  }, []);

  const completedOrders = useMemo(
    () => orders.filter(order => order.status === 'completed'),
    [orders]
  );

  const todayOrders = useMemo(() => {
    const now = new Date();
    return completedOrders.filter(order => {
      const d = new Date(order.createdAt);
      return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate()
      );
    });
  }, [completedOrders]);

  const todaySales = todayOrders.reduce((sum, order) => sum + Number(order.grandTotal || 0), 0);
  const averageTicket = todayOrders.length ? todaySales / todayOrders.length : 0;
  const lowStockCount = products.filter(
    product => product.active && product.stockQuantity <= product.lowStockThreshold
  ).length;

  const categorySales = useMemo(() => {
    const map = new Map<string, number>();
    completedOrders.forEach(order => {
      order.items.forEach(item => {
        const category = item.product.categoryName || item.product.subcategory || 'Other';
        const total =
          Number(item.lineTotal ?? item.unitPrice * item.quantity - (item.discountAmount || 0)) || 0;
        map.set(category, (map.get(category) || 0) + total);
      });
    });
    return [...map.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [completedOrders]);

  const hourlySales = useMemo(() => {
    const values = Array.from({ length: 13 }, (_, index) => ({
      hour: index + 9,
      value: 0,
    }));
    todayOrders.forEach(order => {
      const hour = new Date(order.createdAt).getHours();
      const entry = values.find(item => item.hour === hour);
      if (entry) entry.value += Number(order.grandTotal || 0);
    });
    return values;
  }, [todayOrders]);

  const topProducts = useMemo(() => {
    const map = new Map<
      string,
      { id: string; name: string; imageUrl?: string; units: number; revenue: number }
    >();

    completedOrders.forEach(order => {
      order.items.forEach(item => {
        const existing = map.get(item.product.id) || {
          id: item.product.id,
          name: item.product.name,
          imageUrl: item.product.imageUrl,
          units: 0,
          revenue: 0,
        };
        existing.units += Number(item.quantity || 0);
        existing.revenue +=
          Number(item.lineTotal ?? item.unitPrice * item.quantity - (item.discountAmount || 0)) || 0;
        map.set(item.product.id, existing);
      });
    });

    return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [completedOrders]);

  const paymentMix = useMemo(() => {
    const source = dashboard?.paymentBreakdown || {};
    const entries = Object.entries(source).map(([method, raw]: [string, any]) => {
      const value = typeof raw === 'number' ? raw : Number(raw?.total || raw?.amount || 0);
      return { method, value };
    });
    const total = entries.reduce((sum, item) => sum + item.value, 0);
    return entries
      .sort((a, b) => b.value - a.value)
      .slice(0, 4)
      .map(item => ({
        ...item,
        percent: total > 0 ? (item.value / total) * 100 : 0,
      }));
  }, [dashboard]);

  const trendPoints = dashboard?.trendPoints || [];
  const maxTrend = Math.max(1, ...trendPoints.map((point: any) => Number(point.sales || 0)));
  const maxCategory = Math.max(1, ...categorySales.map(item => item.value));
  const maxHour = Math.max(1, ...hourlySales.map(item => item.value));

  const linePoints = trendPoints
    .map((point: any, index: number) => {
      const x = trendPoints.length <= 1 ? 50 : (index / (trendPoints.length - 1)) * 100;
      const y = 94 - (Number(point.sales || 0) / maxTrend) * 82;
      return `${x},${y}`;
    })
    .join(' ');

  const paymentGradient = (() => {
    if (!paymentMix.length) return 'conic-gradient(#334155 0 100%)';
    const colors = ['#38bdf8', '#fbbf24', '#8b5cf6', '#34d399'];
    let cursor = 0;
    const parts = paymentMix.map((item, index) => {
      const start = cursor;
      cursor += item.percent;
      return `${colors[index % colors.length]} ${start}% ${cursor}%`;
    });
    return `conic-gradient(${parts.join(', ')})`;
  })();

  const health = [
    {
      label: 'Registers',
      ok: bridgeHealth.status === 'running',
      icon: Monitor,
    },
    {
      label: 'Printer',
      ok: Boolean(configuredHardware.receipt_printer?.deviceId),
      icon: Printer,
    },
    {
      label: 'Bridge',
      ok: bridgeHealth.status === 'running',
      icon: BarChart3,
    },
    {
      label: 'Customer Display',
      ok: Boolean(
        configuredHardware.customer_display?.deviceId ||
          configuredHardware.customer_display?.displayId
      ),
      icon: Monitor,
    },
  ];

  return (
    <div className="h-full overflow-y-auto bg-[#07111f] text-slate-100">
      <div className="px-5 md:px-7 py-5 space-y-4">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] font-black text-amber-400">
              Manager Portal
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight mt-1">
              Sales & Store Performance Dashboard
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Clean overview of store performance, revenue, inventory, and staff activity.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="px-3 py-2 rounded-xl border border-slate-700 bg-slate-900/70">
              <div className="text-[10px] text-slate-500">Store</div>
              <div className="text-xs font-black">{settings?.storeName || '377 Spirits'}</div>
            </div>
            <div className="px-3 py-2 rounded-xl border border-slate-700 bg-slate-900/70">
              <div className="text-[10px] text-slate-500">Manager</div>
              <div className="text-xs font-black">{currentUser.name}</div>
            </div>
            <button
              type="button"
              onClick={() => void refresh()}
              className="p-3 rounded-xl border border-slate-700 bg-slate-900/70 hover:bg-slate-800 cursor-pointer"
              title="Refresh dashboard"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          {[
            {
              label: "Today's Sales",
              value: money(todaySales),
              detail: 'Live completed sales',
              icon: DollarSign,
              accent: 'text-sky-400',
            },
            {
              label: 'Transactions',
              value: String(todayOrders.length),
              detail: 'Completed today',
              icon: ShoppingCart,
              accent: 'text-sky-400',
            },
            {
              label: 'Average Ticket',
              value: money(averageTicket),
              detail: 'Average completed sale',
              icon: Tag,
              accent: 'text-amber-400',
            },
            {
              label: 'Low Stock Alerts',
              value: String(lowStockCount),
              detail: 'At or below threshold',
              icon: AlertTriangle,
              accent: 'text-amber-400',
            },
          ].map(card => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className="rounded-2xl border border-slate-700/80 bg-[#0b1a2d] p-4 shadow-lg shadow-black/10"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full border border-slate-600 bg-slate-900 flex items-center justify-center">
                    <Icon className={`w-5 h-5 ${card.accent}`} />
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400 font-bold">{card.label}</div>
                    <div className="text-2xl font-black mt-0.5">{card.value}</div>
                  </div>
                </div>
                <div className="text-[10px] text-emerald-400 mt-3">{card.detail}</div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 rounded-2xl border border-slate-700/80 bg-[#0b1a2d] p-4">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-base font-black">Sales Trend</h2>
                <p className="text-[11px] text-slate-400 mt-0.5">Total sales over time</p>
              </div>
              <div className="flex rounded-lg overflow-hidden border border-slate-700">
                {(['today', 'week', 'month'] as Period[]).map(item => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setPeriod(item)}
                    className={`px-4 py-2 text-[10px] font-black capitalize cursor-pointer ${
                      period === item
                        ? 'bg-sky-500 text-white'
                        : 'bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    {item === 'today' ? 'Day' : item === 'week' ? 'Week' : 'Month'}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative h-64">
              <div className="absolute inset-0 flex flex-col justify-between text-[9px] text-slate-600 pointer-events-none">
                {[maxTrend, maxTrend * 0.66, maxTrend * 0.33, 0].map((value, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="w-12 text-right">{shortMoney(value)}</span>
                    <span className="h-px flex-1 bg-slate-800" />
                  </div>
                ))}
              </div>

              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute left-14 right-0 top-2 bottom-7 w-[calc(100%-3.5rem)] h-[calc(100%-2.25rem)] overflow-visible">
                <defs>
                  <linearGradient id="managerSalesFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.02" />
                  </linearGradient>
                </defs>
                {linePoints && (
                  <>
                    <polygon
                      points={`0,100 ${linePoints} 100,100`}
                      fill="url(#managerSalesFill)"
                    />
                    <polyline
                      points={linePoints}
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="2.4"
                      vectorEffect="non-scaling-stroke"
                    />
                    {trendPoints.map((point: any, index: number) => {
                      const x = trendPoints.length <= 1 ? 50 : (index / (trendPoints.length - 1)) * 100;
                      const y = 94 - (Number(point.sales || 0) / maxTrend) * 82;
                      return <circle key={index} cx={x} cy={y} r="1.3" fill="#7dd3fc" />;
                    })}
                  </>
                )}
              </svg>

              <div className="absolute left-14 right-0 bottom-0 grid text-[9px] text-slate-500" style={{ gridTemplateColumns: `repeat(${Math.max(trendPoints.length, 1)}, minmax(0, 1fr))` }}>
                {trendPoints.map((point: any, index: number) => (
                  <span key={index} className="text-center truncate px-1">{point.label}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-700/80 bg-[#0b1a2d] p-4">
            <div className="mb-4">
              <h2 className="text-base font-black">Sales by Category</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">Top categories by sales</p>
            </div>
            <div className="space-y-4 mt-6">
              {categorySales.length === 0 ? (
                <div className="text-xs text-slate-500">No category sales yet.</div>
              ) : (
                categorySales.map(item => (
                  <div key={item.label}>
                    <div className="flex items-center justify-between text-[11px] mb-1.5">
                      <span className="font-bold text-slate-300 truncate pr-3">{item.label}</span>
                      <span className="font-black text-slate-200">{shortMoney(item.value)}</span>
                    </div>
                    <div className="h-3 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-sky-600 to-sky-400"
                        style={{ width: `${Math.max(4, (item.value / maxCategory) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-slate-700/80 bg-[#0b1a2d] p-4">
            <h2 className="text-base font-black">Payment Mix</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">Share of sales by payment method</p>

            <div className="flex items-center gap-5 mt-5">
              <div
                className="w-36 h-36 rounded-full relative shrink-0"
                style={{ background: paymentGradient }}
              >
                <div className="absolute inset-[24px] rounded-full bg-[#0b1a2d] flex flex-col items-center justify-center">
                  <div className="text-base font-black">{money(todaySales)}</div>
                  <div className="text-[9px] text-slate-500">Total Sales</div>
                </div>
              </div>

              <div className="flex-1 space-y-3 min-w-0">
                {paymentMix.length === 0 ? (
                  <div className="text-xs text-slate-500">No payment data.</div>
                ) : (
                  paymentMix.map((item, index) => (
                    <div key={item.method} className="flex items-center justify-between gap-2 text-[10px]">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: ['#38bdf8', '#fbbf24', '#8b5cf6', '#34d399'][index % 4] }}
                        />
                        <span className="capitalize truncate">{item.method.replace(/_/g, ' ')}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-black">{item.percent.toFixed(0)}%</span>
                        <span className="text-slate-500 ml-2">{shortMoney(item.value)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-700/80 bg-[#0b1a2d] p-4">
            <h2 className="text-base font-black">Sales by Hour</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">Today's sales distribution</p>
            <div className="h-44 flex items-end gap-1.5 mt-7 border-b border-slate-700">
              {hourlySales.map(item => (
                <div key={item.hour} className="flex-1 h-full flex flex-col justify-end items-center gap-1">
                  <div
                    title={money(item.value)}
                    className="w-full max-w-6 rounded-t bg-gradient-to-t from-sky-700 to-sky-400 min-h-[2px]"
                    style={{ height: `${Math.max(2, (item.value / maxHour) * 90)}%` }}
                  />
                  <span className="text-[8px] text-slate-500">
                    {item.hour > 12 ? item.hour - 12 : item.hour}{item.hour >= 12 ? 'p' : 'a'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-700/80 bg-[#0b1a2d] overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
              <div>
                <h2 className="text-base font-black">Top Selling Products</h2>
                <p className="text-[11px] text-slate-400 mt-0.5">Highest revenue products</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('inventory')}
                className="text-[10px] font-black text-sky-400 cursor-pointer"
              >
                Inventory
              </button>
            </div>
            <div className="divide-y divide-slate-800">
              {topProducts.length === 0 ? (
                <div className="p-4 text-xs text-slate-500">No product sales yet.</div>
              ) : (
                topProducts.map((product, index) => (
                  <div key={product.id} className="px-4 py-2.5 grid grid-cols-[24px_1fr_50px_72px] gap-2 items-center text-[10px]">
                    <span className="text-slate-500">{index + 1}</span>
                    <div className="flex items-center gap-2 min-w-0">
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt="" className="w-6 h-8 object-contain rounded bg-slate-900" />
                      ) : (
                        <div className="w-6 h-8 rounded bg-slate-800" />
                      )}
                      <span className="font-bold truncate">{product.name}</span>
                    </div>
                    <span className="text-right text-slate-400">{product.units}</span>
                    <span className="text-right font-black">{money(product.revenue)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-700/80 bg-[#0b1a2d] px-4 py-3 flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="lg:w-48">
            <div className="text-sm font-black">Store Health</div>
            <div className="text-[10px] text-slate-500">
              {health.every(item => item.ok) ? 'All systems operational' : 'Some systems need attention'}
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 flex-1">
            {health.map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => onNavigate('hardware-manager')}
                  className="flex items-center gap-3 px-4 py-2 border-t lg:border-t-0 lg:border-l border-slate-800 text-left cursor-pointer hover:bg-slate-900/50"
                >
                  <Icon className="w-5 h-5 text-slate-300" />
                  <div>
                    <div className="text-[10px] text-slate-400">{item.label}</div>
                    <div className={`text-[11px] font-black ${item.ok ? 'text-emerald-400' : 'text-rose-400'}`}>
                      ● {item.ok ? 'Online' : 'Attention'}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
