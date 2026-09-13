import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { Order } from '../types';
import { playBeep } from '../utils/audio';
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Percent,
  Users,
  AlertTriangle,
  Calendar,
  CreditCard,
  Eye,
  ArrowUpRight,
  PackageX,
  PackageCheck,
  RefreshCw,
} from 'lucide-react';

interface DashboardViewProps {
  onNavigateToInventory?: () => void;
  onNavigateToOrders?: () => void;
  onViewOrderDetails?: (order: Order) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigateToInventory,
  onNavigateToOrders,
  onViewOrderDetails,
}) => {
  const [period, setPeriod] = useState<'today' | 'yesterday' | 'week' | 'month' | 'custom'>('week');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  const [data, setData] = useState<{
    kpis: {
      grossSales: number;
      netSales: number;
      discountTotal: number;
      taxTotal: number;
      grossProfit: number;
      grossProfitMargin: number;
      orderCount: number;
      averageOrderValue: number;
      totalCustomers: number;
      activeStaffCount: number;
      lowStockCount: number;
      outOfStockCount: number;
    };
    trendPoints: Array<{ label: string; sales: number; orders: number }>;
    paymentBreakdown: Record<string, number>;
    lowStockItems: Array<{
      id: string;
      name: string;
      sku: string;
      barcode: string;
      stockQuantity: number;
      lowStockThreshold: number;
      categoryName?: string;
      price: number;
      cost: number;
    }>;
    recentOrders: Order[];
  } | null>(null);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await api.getDashboardOverview({
        period: period !== 'custom' ? period : undefined,
        startDate: period === 'custom' ? startDate : undefined,
        endDate: period === 'custom' ? endDate : undefined,
      });
      setData(res);
    } catch (err: any) {
      console.error('Failed to load dashboard', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (period !== 'custom' || (startDate && endDate)) {
      fetchDashboard();
    }
  }, [period, startDate, endDate]);

  const maxSales = data?.trendPoints ? Math.max(...data.trendPoints.map(p => p.sales), 1) : 1;

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-84px)] overflow-hidden bg-[#0A0A0A] text-[#E5E5E5] p-4 md:p-6 select-none space-y-4">
      {/* Top Filter & Refresh Bar (AP-DB-02) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-[#0D0D0D] p-3.5 md:p-4 rounded-xl border border-[#262626] gap-3 shrink-0">
        <div>
          <h2 className="text-xl font-serif italic font-bold text-[#F5F5F5] flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-[#C5A059]" />
            <span>Executive Dashboard</span>
          </h2>
          <p className="text-xs text-[#737373] mt-0.5">
            Real-time sales performance, margin health, and inventory telemetry
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Preset Period Buttons */}
          <div className="bg-[#141414] p-1 rounded-lg border border-[#262626] flex items-center space-x-1">
            {(['today', 'yesterday', 'week', 'month'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                  period === p ? 'bg-[#C5A059] text-black shadow-sm' : 'text-[#A3A3A3] hover:text-white'
                }`}
              >
                {p === 'today' ? 'Today' : p === 'yesterday' ? 'Yesterday' : p === 'week' ? 'This Week' : 'This Month'}
              </button>
            ))}
            <button
              onClick={() => setPeriod('custom')}
              className={`px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                period === 'custom' ? 'bg-[#C5A059] text-black shadow-sm' : 'text-[#A3A3A3] hover:text-white'
              }`}
            >
              Custom
            </button>
          </div>

          {/* Custom Date Pickers */}
          {period === 'custom' && (
            <div className="flex items-center space-x-2 bg-[#141414] px-2.5 py-1 rounded-lg border border-[#262626] text-xs">
              <Calendar className="w-3.5 h-3.5 text-[#C5A059]" />
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="bg-transparent text-[#E5E5E5] focus:outline-hidden"
              />
              <span className="text-[#737373]">to</span>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="bg-transparent text-[#E5E5E5] focus:outline-hidden"
              />
            </div>
          )}

          <button
            onClick={() => {
              playBeep('click');
              fetchDashboard();
            }}
            title="Refresh Metrics"
            className="p-2 rounded-lg bg-[#141414] hover:bg-[#1F1F1F] border border-[#262626] text-[#A3A3A3] hover:text-white cursor-pointer transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#C5A059]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Scrollable Content */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {/* KPI Cards Grid (AP-DB-01) */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Gross Sales */}
          <div className="bg-[#0D0D0D] p-3.5 rounded-xl border border-[#262626] hover:border-[#C5A059]/40 transition-colors">
            <div className="flex items-center justify-between text-[#737373]">
              <span className="text-[10px] font-bold uppercase tracking-wider">Gross Sales</span>
              <DollarSign className="w-3.5 h-3.5 text-[#C5A059]" />
            </div>
            <div className="text-lg md:text-xl font-mono font-bold text-[#F5F5F5] mt-1">
              ${(data?.kpis?.grossSales ?? 0).toFixed(2)}
            </div>
            <div className="text-[10px] text-[#A3A3A3] mt-0.5 font-mono">
              Net: ${(data?.kpis?.netSales ?? 0).toFixed(2)}
            </div>
          </div>

          {/* Orders Completed */}
          <div className="bg-[#0D0D0D] p-3.5 rounded-xl border border-[#262626] hover:border-[#C5A059]/40 transition-colors">
            <div className="flex items-center justify-between text-[#737373]">
              <span className="text-[10px] font-bold uppercase tracking-wider">Completed Orders</span>
              <ShoppingCart className="w-3.5 h-3.5 text-[#C5A059]" />
            </div>
            <div className="text-lg md:text-xl font-mono font-bold text-[#F5F5F5] mt-1">
              {data?.kpis?.orderCount ?? 0}
            </div>
            <div className="text-[10px] text-[#A3A3A3] mt-0.5 font-mono">
              AOV: ${(data?.kpis?.averageOrderValue ?? 0).toFixed(2)}
            </div>
          </div>

          {/* Gross Profit & Margin */}
          <div className="bg-[#0D0D0D] p-3.5 rounded-xl border border-[#262626] hover:border-[#C5A059]/40 transition-colors">
            <div className="flex items-center justify-between text-[#737373]">
              <span className="text-[10px] font-bold uppercase tracking-wider">Gross Profit</span>
              <Percent className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-lg md:text-xl font-mono font-bold text-emerald-400 mt-1">
              ${(data?.kpis?.grossProfit ?? 0).toFixed(2)}
            </div>
            <div className="text-[10px] text-emerald-500/80 mt-0.5 font-mono">
              {(data?.kpis?.grossProfitMargin ?? 0).toFixed(1)}% Margin
            </div>
          </div>

          {/* Tax Collected */}
          <div className="bg-[#0D0D0D] p-3.5 rounded-xl border border-[#262626] hover:border-[#C5A059]/40 transition-colors">
            <div className="flex items-center justify-between text-[#737373]">
              <span className="text-[10px] font-bold uppercase tracking-wider">Tax Collected</span>
              <span className="text-[10px] font-mono text-[#737373]">8.25%</span>
            </div>
            <div className="text-lg md:text-xl font-mono font-bold text-[#F5F5F5] mt-1">
              ${(data?.kpis?.taxTotal ?? 0).toFixed(2)}
            </div>
            <div className="text-[10px] text-[#A3A3A3] mt-0.5 font-mono">
              Discounts: ${(data?.kpis?.discountTotal ?? 0).toFixed(2)}
            </div>
          </div>

          {/* Active Customers */}
          <div className="bg-[#0D0D0D] p-3.5 rounded-xl border border-[#262626] hover:border-[#C5A059]/40 transition-colors">
            <div className="flex items-center justify-between text-[#737373]">
              <span className="text-[10px] font-bold uppercase tracking-wider">Customer Base</span>
              <Users className="w-3.5 h-3.5 text-[#C5A059]" />
            </div>
            <div className="text-lg md:text-xl font-mono font-bold text-[#F5F5F5] mt-1">
              {data?.kpis.totalCustomers || 0}
            </div>
            <div className="text-[10px] text-[#A3A3A3] mt-0.5">
              Staff active: {data?.kpis.activeStaffCount || 0}
            </div>
          </div>

          {/* Low Stock Alerts (AP-DB-04) */}
          <div
            onClick={onNavigateToInventory}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
              (data?.kpis.lowStockCount || 0) > 0
                ? 'bg-amber-950/20 border-amber-500/40 hover:border-amber-400'
                : 'bg-[#0D0D0D] border-[#262626] hover:border-[#C5A059]/40'
            }`}
          >
            <div className="flex items-center justify-between text-[#737373]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Stock Alerts</span>
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-lg md:text-xl font-mono font-bold text-amber-400 mt-1">
              {data?.kpis.lowStockCount || 0} Low
            </div>
            <div className="text-[10px] text-red-400/80 mt-0.5 font-mono flex items-center justify-between">
              <span>{data?.kpis.outOfStockCount || 0} Out of Stock</span>
              <ArrowUpRight className="w-3 h-3 text-amber-400" />
            </div>
          </div>
        </div>

        {/* Middle Section: Sales Trend Chart & Payment Breakdown (AP-DB-03) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Sales Trends Chart (AP-DB-03) */}
          <div className="lg:col-span-2 bg-[#0D0D0D] p-4 rounded-xl border border-[#262626] space-y-3">
            <div className="flex items-center justify-between border-b border-[#262626] pb-2.5">
              <h3 className="text-sm font-serif italic font-bold text-[#F5F5F5] flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-[#C5A059]" />
                <span>Revenue & Order Velocity Trends</span>
              </h3>
              <span className="text-[11px] text-[#737373] font-mono">
                {period.toUpperCase()} METRICS
              </span>
            </div>

            {/* Custom SVG Bar Chart */}
            <div className="h-44 w-full flex items-end justify-between gap-2 pt-4 px-2">
              {data?.trendPoints.map((pt, idx) => {
                const heightPercent = maxSales > 0 ? (pt.sales / maxSales) * 100 : 0;
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                    {/* Tooltip on Hover */}
                    <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-black border border-[#C5A059] px-2 py-1 rounded text-[10px] font-mono whitespace-nowrap z-20 pointer-events-none shadow-lg">
                      <div className="text-[#C5A059] font-bold">${(pt.sales ?? 0).toFixed(2)}</div>
                      <div className="text-[#A3A3A3]">{pt.orders ?? 0} orders</div>
                    </div>

                    {/* Bar */}
                    <div
                      className="w-full max-w-[42px] bg-gradient-to-t from-[#C5A059]/30 to-[#C5A059] hover:brightness-125 transition-all rounded-t-sm"
                      style={{ height: `${Math.max(heightPercent, 4)}%` }}
                    />

                    {/* Label */}
                    <div className="text-[10px] font-mono text-[#737373] group-hover:text-white mt-2 truncate max-w-[50px] text-center">
                      {pt.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Payment Methods Breakdown */}
          <div className="bg-[#0D0D0D] p-4 rounded-xl border border-[#262626] space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-[#262626] pb-2.5">
                <h3 className="text-sm font-serif italic font-bold text-[#F5F5F5] flex items-center space-x-2">
                  <CreditCard className="w-4 h-4 text-[#C5A059]" />
                  <span>Tender Mix</span>
                </h3>
                <span className="text-[11px] text-[#737373] font-mono">TOTAL REVENUE</span>
              </div>

              <div className="space-y-2.5 mt-3">
                {Object.entries(data?.paymentBreakdown || {}).map(([method, val]) => {
                  const amount = Number(val || 0);
                  const total = data?.kpis?.grossSales || 1;
                  const pct = total > 0 ? (amount / total) * 100 : 0;
                  return (
                    <div key={method} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="uppercase text-[#A3A3A3] font-bold tracking-wider">{method}</span>
                        <span className="text-[#F5F5F5]">${amount.toFixed(2)} ({pct.toFixed(1)}%)</span>
                      </div>
                      <div className="w-full bg-[#1A1A1A] h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-[#C5A059] h-full rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              onClick={onNavigateToOrders}
              className="w-full py-2 bg-[#141414] hover:bg-[#1A1A1A] border border-[#262626] hover:border-[#C5A059]/40 text-[#E5E5E5] text-xs font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center space-x-1.5 cursor-pointer mt-3"
            >
              <span>View All Order Receipts</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Bottom Section: Low Stock Warning & Recent Orders (AP-DB-04 & AP-DB-01) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Low Stock Items Summary (AP-DB-04) */}
          <div className="bg-[#0D0D0D] p-4 rounded-xl border border-[#262626] space-y-3">
            <div className="flex items-center justify-between border-b border-[#262626] pb-2.5">
              <h3 className="text-sm font-serif italic font-bold text-[#F5F5F5] flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Inventory Depletion Telemetry</span>
              </h3>
              <button
                onClick={onNavigateToInventory}
                className="text-xs text-[#C5A059] hover:underline font-bold uppercase tracking-wider flex items-center space-x-1"
              >
                <span>Stock Console</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>

            {(!data?.lowStockItems || data.lowStockItems.length === 0) ? (
              <div className="py-8 text-center text-[#737373] text-xs flex flex-col items-center justify-center space-y-1">
                <PackageCheck className="w-6 h-6 text-emerald-400" />
                <span className="text-[#A3A3A3]">All inventory levels are healthy above safety thresholds</span>
              </div>
            ) : (
              <div className="divide-y divide-[#1F1F1F] max-h-56 overflow-y-auto">
                {data.lowStockItems.map(item => (
                  <div key={item.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-[#F5F5F5] font-sans">{item.name}</div>
                      <div className="text-[10px] text-[#737373] font-mono">
                        SKU: {item.sku} | UPC: {item.barcode} | {item.categoryName}
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <span className={`font-mono font-bold text-xs ${item.stockQuantity === 0 ? 'text-red-400' : 'text-amber-400'}`}>
                          {item.stockQuantity} Left
                        </span>
                        <div className="text-[10px] text-[#737373] font-mono">
                          Min: {item.lowStockThreshold}
                        </div>
                      </div>

                      <button
                        onClick={onNavigateToInventory}
                        className="px-2.5 py-1 rounded bg-[#1A1A1A] hover:bg-[#C5A059] hover:text-black text-[#E5E5E5] text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer border border-[#262626]"
                      >
                        Adjust
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Orders Live Activity (AP-DB-01) */}
          <div className="bg-[#0D0D0D] p-4 rounded-xl border border-[#262626] space-y-3">
            <div className="flex items-center justify-between border-b border-[#262626] pb-2.5">
              <h3 className="text-sm font-serif italic font-bold text-[#F5F5F5] flex items-center space-x-2">
                <ShoppingCart className="w-4 h-4 text-[#C5A059]" />
                <span>Recent Register Transactions</span>
              </h3>
              <button
                onClick={onNavigateToOrders}
                className="text-xs text-[#C5A059] hover:underline font-bold uppercase tracking-wider flex items-center space-x-1"
              >
                <span>Full Ledger</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>

            <div className="divide-y divide-[#1F1F1F] max-h-56 overflow-y-auto">
              {data?.recentOrders.map(o => (
                <div key={o.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-[#F5F5F5]">{o.orderNumber}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider ${
                          o.status === 'completed'
                            ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                            : o.status === 'voided'
                            ? 'bg-red-950/60 text-red-400 border border-red-800/40'
                            : 'bg-amber-950/60 text-amber-400 border border-amber-800/40'
                        }`}
                      >
                        {o.status}
                      </span>
                    </div>
                    <div className="text-[10px] text-[#737373] font-mono mt-0.5">
                      {new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {o.cashierName} • {o.customerName || 'Walk-in Guest'}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2.5">
                    <div className="text-right font-mono">
                      <div className="font-bold text-[#F5F5F5]">${(o.grandTotal ?? 0).toFixed(2)}</div>
                      <div className="text-[10px] text-[#737373] uppercase">{o.payment?.method || 'CASH'}</div>
                    </div>

                    <button
                      onClick={() => onViewOrderDetails && onViewOrderDetails(o)}
                      className="p-1.5 text-[#737373] hover:text-[#C5A059] hover:bg-[#1A1A1A] rounded cursor-pointer transition-colors"
                      title="Inspect Receipt"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
