import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  CircleDollarSign,
  DollarSign,
  Lightbulb,
  RefreshCw,
  RotateCcw,
  ShoppingCart,
  Star,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { Order, Product, StoreSettings, User } from '../../types';
import { api } from '../../utils/api';

interface ManagerOperationsDashboardProps {
  settings: StoreSettings | null;
  currentUser: User;
  orders: Order[];
  products: Product[];
  onNavigate: (tab: string) => void;
}

type GraphPeriod = '7days' | 'month';

const money = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value || 0));

export const ManagerOperationsDashboard: React.FC<ManagerOperationsDashboardProps> = ({
  settings,
  currentUser,
  orders,
  products,
  onNavigate,
}) => {
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<any>(null);
  const [graphPeriod, setGraphPeriod] = useState<GraphPeriod>('7days');
  const [rankBy, setRankBy] = useState<'value' | 'qty'>('value');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.getDashboardOverview({
        period: graphPeriod === 'month' ? 'month' : 'week',
      });
      setDashboard(result);
    } catch (error) {
      console.error('Failed to refresh manager dashboard', error);
    } finally {
      setLoading(false);
    }
  }, [graphPeriod]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const today = useMemo(() => {
    const now = new Date();
    const todayOrders = orders.filter(order => {
      const d = new Date(order.createdAt);
      return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate()
      );
    });

    const completed = todayOrders.filter(order => order.status === 'completed');
    const refunded = todayOrders.filter(order => order.status === 'refunded');
    const voided = todayOrders.filter(order => order.status === 'voided');

    let sales = 0;
    let refunds = 0;
    let voids = 0;
    let cost = 0;

    completed.forEach(order => {
      sales += Number(order.grandTotal || 0);
      order.items.forEach(item => {
        cost +=
          Number(item.product?.cost ?? item.product?.costPrice ?? 0) *
          Number(item.quantity || 0);
      });
    });

    refunded.forEach(order => {
      refunds += Math.abs(Number(order.grandTotal || 0));
    });

    voided.forEach(order => {
      voids += Math.abs(Number(order.grandTotal || 0));
    });

    const netSales = Math.max(0, sales - refunds);
    const profit = Math.max(0, netSales - cost);

    return {
      sales,
      refunds,
      voids,
      netSales,
      cost,
      profit,
      salesCount: completed.length,
      refundCount: refunded.length,
      voidCount: voided.length,
      averageTicket: completed.length ? netSales / completed.length : 0,
      margin: netSales > 0 ? (profit / netSales) * 100 : 0,
    };
  }, [orders]);

  const topItems = useMemo(() => {
    const map = new Map<string, { id: string; name: string; qty: number; value: number }>();

    orders
      .filter(order => order.status === 'completed')
      .forEach(order => {
        order.items.forEach(item => {
          const id = item.product?.id || item.id;
          const existing = map.get(id) || {
            id,
            name: item.product?.name || item.name || 'Item',
            qty: 0,
            value: 0,
          };

          existing.qty += Number(item.quantity || 0);
          existing.value += Math.max(
            0,
            Number(item.lineTotal ?? Number(item.unitPrice || 0) * Number(item.quantity || 0))
          );
          map.set(id, existing);
        });
      });

    return [...map.values()]
      .sort((a, b) => (rankBy === 'value' ? b.value - a.value : b.qty - a.qty))
      .slice(0, 8);
  }, [orders, rankBy]);

  const inventoryStats = useMemo(() => {
    const active = products.filter(product => product.active);
    const totalCost = active.reduce(
      (sum, product) =>
        sum +
        Number(product.stockQuantity || 0) *
          Number(product.cost ?? product.costPrice ?? 0),
      0
    );
    const retailValue = active.reduce(
      (sum, product) => sum + Number(product.stockQuantity || 0) * Number(product.price || 0),
      0
    );
    const lowStock = active.filter(
      product => Number(product.stockQuantity || 0) <= Number(product.lowStockThreshold || 0)
    ).length;

    return {
      totalCost,
      retailValue,
      averageMargin:
        retailValue > 0 ? ((retailValue - totalCost) / retailValue) * 100 : 0,
      inventoryGrade: active.length
        ? ((active.length - lowStock) / active.length) * 100
        : 100,
    };
  }, [products]);

  const projectedMonthlySales = useMemo(() => {
    const now = new Date();
    const thisMonth = orders.filter(order => {
      if (order.status !== 'completed') return false;
      const d = new Date(order.createdAt);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    });
    const salesToDate = thisMonth.reduce((sum, order) => sum + Number(order.grandTotal || 0), 0);
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return (salesToDate / Math.max(1, now.getDate())) * daysInMonth;
  }, [orders]);

  const graphRows = useMemo(() => {
    const days = graphPeriod === 'month' ? 30 : 7;
    const now = new Date();

    return Array.from({ length: days }, (_, index) => {
      const date = new Date(now);
      date.setDate(now.getDate() - (days - 1 - index));
      date.setHours(0, 0, 0, 0);
      const next = new Date(date);
      next.setDate(date.getDate() + 1);

      const dayOrders = orders.filter(order => {
        const created = new Date(order.createdAt);
        return created >= date && created < next;
      });

      const completed = dayOrders.filter(order => order.status === 'completed');
      const refunded = dayOrders.filter(order => order.status === 'refunded');

      let sales = 0;
      let refunds = 0;
      let cost = 0;

      completed.forEach(order => {
        sales += Number(order.grandTotal || 0);
        order.items.forEach(item => {
          cost +=
            Number(item.product?.cost ?? item.product?.costPrice ?? 0) *
            Number(item.quantity || 0);
        });
      });
      refunded.forEach(order => {
        refunds += Math.abs(Number(order.grandTotal || 0));
      });

      const netSales = Math.max(0, sales - refunds);
      return {
        label: date.toLocaleDateString([], { month: '2-digit', day: '2-digit' }),
        sales,
        refunds,
        cost,
        profit: Math.max(0, netSales - cost),
        netSales,
      };
    });
  }, [orders, graphPeriod]);

  const graphMax = Math.max(
    1,
    ...graphRows.flatMap(row => [row.sales, row.cost, row.profit, row.refunds, row.netSales])
  );

  const pointsFor = (key: 'sales' | 'refunds' | 'cost' | 'profit' | 'netSales') =>
    graphRows
      .map((row, index) => {
        const x = graphRows.length <= 1 ? 50 : (index / (graphRows.length - 1)) * 100;
        const y = 94 - (Number(row[key] || 0) / graphMax) * 84;
        return `${x},${y}`;
      })
      .join(' ');

  const stats = [
    {
      label: 'Inventory Grade',
      value: `${inventoryStats.inventoryGrade.toFixed(1)}%`,
      icon: Lightbulb,
      tone: 'text-amber-300',
    },
    {
      label: 'Monthly Projected Sales',
      value: money(projectedMonthlySales),
      icon: DollarSign,
      tone: 'text-sky-400',
    },
    {
      label: 'Average Margin',
      value: `${inventoryStats.averageMargin.toFixed(2)}%`,
      icon: CircleDollarSign,
      tone: 'text-sky-400',
    },
    {
      label: 'Average Ticket Amount',
      value: money(today.averageTicket),
      icon: CircleDollarSign,
      tone: 'text-sky-400',
    },
    {
      label: 'Inventory Cost',
      value: money(inventoryStats.totalCost),
      icon: ShoppingCart,
      tone: 'text-emerald-400',
    },
    {
      label: 'Retail Inventory Value',
      value: money(inventoryStats.retailValue),
      icon: Star,
      tone: 'text-violet-300',
    },
  ];

  return (
    <div className="h-full overflow-y-auto bg-[#07111f] text-slate-100">
      <div className="p-5 md:p-6 space-y-4 max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-black text-white">Dashboard</h1>
              <span className="text-slate-500 text-sm">› overview & stats</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {settings?.storeName || 'KaBiRa POS'} · Manager: {currentUser.name}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refresh()}
            className="w-10 h-10 rounded-xl border border-slate-700 bg-[#0b1828] hover:bg-[#102036] flex items-center justify-center cursor-pointer"
            title="Refresh dashboard"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : 'text-slate-300'}`} />
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <section className="rounded-xl border border-slate-700 bg-[#0b1828] overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-700 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-black">Today's Takings</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:[&>*:nth-child(odd)]:border-r divide-slate-700 md:[&>*]:border-slate-700">
              {[
                { label: 'Sales', count: today.salesCount, value: today.sales, icon: ShoppingCart, tone: 'text-lime-400', bg: 'bg-lime-500/20' },
                { label: 'Refunds', count: today.refundCount, value: today.refunds, icon: RotateCcw, tone: 'text-amber-300', bg: 'bg-amber-500/20' },
                { label: 'Voids', count: today.voidCount, value: today.voids, icon: TrendingDown, tone: 'text-rose-400', bg: 'bg-rose-500/20' },
                { label: 'Net Sales', count: null, value: today.netSales, icon: CircleDollarSign, tone: 'text-sky-400', bg: 'bg-sky-500/20' },
                { label: 'Cost', count: null, value: today.cost, icon: DollarSign, tone: 'text-amber-300', bg: 'bg-amber-500/20' },
                { label: 'Profit', count: null, value: today.profit, icon: DollarSign, tone: 'text-lime-400', bg: 'bg-lime-500/20' },
              ].map((item, index) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className={`p-4 flex items-center gap-4 ${index < 4 ? 'border-b border-slate-700' : ''}`}>
                    <div className={`w-12 h-12 rounded-full ${item.bg} flex items-center justify-center shrink-0`}>
                      <Icon className={`w-6 h-6 ${item.tone}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-2">
                        {item.count !== null && <span className={`text-2xl font-black ${item.tone}`}>{item.count}</span>}
                        <span className={`text-xl font-black ${item.tone}`}>{money(item.value)}</span>
                      </div>
                      <div className="text-sm text-slate-200 mt-1">{item.label}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-xl border border-slate-700 bg-[#0b1828] overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-amber-400" />
                <h2 className="text-lg font-black">Sales Graph</h2>
              </div>
              <select
                value={graphPeriod}
                onChange={e => setGraphPeriod(e.target.value as GraphPeriod)}
                className="h-8 rounded-lg border border-slate-600 bg-[#102036] px-2 text-xs text-white"
              >
                <option value="7days">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
              </select>
            </div>

            <div className="p-4">
              <div className="flex justify-end flex-wrap gap-3 text-[10px] mb-2">
                {[
                  ['Profit', '#22c55e'],
                  ['Cost', '#fb7185'],
                  ['Sales', '#a3e635'],
                  ['Refunds', '#fbbf24'],
                  ['Net Sales', '#38bdf8'],
                ].map(([label, color]) => (
                  <span key={label} className="flex items-center gap-1.5 text-slate-300">
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
                    {label}
                  </span>
                ))}
              </div>

              <div className="relative h-64">
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                  {[1, .75, .5, .25, 0].map(v => (
                    <div key={v} className="border-t border-slate-800 text-[9px] text-slate-600">
                      {money(graphMax * v)}
                    </div>
                  ))}
                </div>
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full overflow-visible">
                  <polyline points={pointsFor('profit')} fill="none" stroke="#22c55e" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
                  <polyline points={pointsFor('cost')} fill="none" stroke="#fb7185" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
                  <polyline points={pointsFor('sales')} fill="none" stroke="#a3e635" strokeWidth="1.8" vectorEffect="non-scaling-stroke" />
                  <polyline points={pointsFor('refunds')} fill="none" stroke="#fbbf24" strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
                  <polyline points={pointsFor('netSales')} fill="none" stroke="#38bdf8" strokeWidth="1.8" vectorEffect="non-scaling-stroke" />
                </svg>
                <div className="absolute left-0 right-0 bottom-0 grid" style={{ gridTemplateColumns: `repeat(${graphRows.length}, minmax(0,1fr))` }}>
                  {graphRows.map(row => (
                    <span key={row.label} className="text-[9px] text-slate-500 text-center translate-y-5">{row.label}</span>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-700 bg-[#0b1828] overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-400" />
                <h2 className="text-lg font-black">Top Rank Items</h2>
              </div>
              <select
                value={rankBy}
                onChange={e => setRankBy(e.target.value as 'value' | 'qty')}
                className="h-8 rounded-lg border border-slate-600 bg-[#102036] px-2 text-xs text-white"
              >
                <option value="value">Rank by Value</option>
                <option value="qty">Rank by Qty</option>
              </select>
            </div>
            <div className="overflow-auto max-h-[315px]">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-[#142238] text-slate-300">
                  <tr>
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-right">Qty</th>
                    <th className="px-4 py-3 text-right">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {topItems.length === 0 ? (
                    <tr><td colSpan={3} className="px-4 py-12 text-center text-slate-500">No sales yet.</td></tr>
                  ) : topItems.map(item => (
                    <tr key={item.id} className="hover:bg-white/5">
                      <td className="px-4 py-3 font-bold">{item.name}</td>
                      <td className="px-4 py-3 text-right text-sky-400 font-black">{item.qty}</td>
                      <td className="px-4 py-3 text-right text-lime-400 font-black">{money(item.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-xl border border-slate-700 bg-[#0b1828] overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-700 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-black">Stats</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2">
              {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className={`p-5 flex items-center gap-4 ${index % 2 === 0 ? 'md:border-r border-slate-700' : ''} ${index < stats.length - 2 ? 'border-b border-slate-700' : ''}`}>
                    <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
                      <Icon className={`w-6 h-6 ${stat.tone}`} />
                    </div>
                    <div className="min-w-0">
                      <div className={`text-2xl font-black ${stat.tone}`}>{stat.value}</div>
                      <div className="text-sm text-slate-200 mt-1">{stat.label}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => onNavigate('reports')}
            className="text-xs font-black text-amber-400 hover:text-amber-300 cursor-pointer"
          >
            Open Detailed Reports →
          </button>
        </div>
      </div>
    </div>
  );
};
