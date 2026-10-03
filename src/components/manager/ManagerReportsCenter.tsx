import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Banknote,
  Boxes,
  Calendar,
  CreditCard,
  Download,
  Package,
  ReceiptText,
  RefreshCw,
  Ticket,
  Users,
} from 'lucide-react';
import { Order, Product, SalesReport, Shift } from '../../types';
import { api } from '../../utils/api';

type ReportTab = 'sales' | 'payment' | 'product' | 'inventory' | 'cashier' | 'shift' | 'tax' | 'lotto';

interface ManagerReportsCenterProps {
  orders: Order[];
  products: Product[];
}

const money = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);

export const ManagerReportsCenter: React.FC<ManagerReportsCenterProps> = ({ orders, products }) => {
  const [tab, setTab] = useState<ReportTab>('sales');
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'custom' | 'all'>('today');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [report, setReport] = useState<SalesReport | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [sales, shiftRows] = await Promise.all([
        api.getSalesReport(
          period,
          period === 'custom' ? startDate : undefined,
          period === 'custom' ? endDate : undefined
        ),
        api.getShifts(),
      ]);
      setReport(sales);
      setShifts(shiftRows);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [period]);

  const filteredOrders = useMemo(() => {
    const now = new Date();
    return orders.filter(order => {
      if (order.status !== 'completed' && order.status !== 'refunded') return false;
      const created = new Date(order.createdAt);
      if (period === 'all') return true;
      if (period === 'today') return created.toDateString() === now.toDateString();
      if (period === 'week') return created >= new Date(now.getTime() - 7 * 86400000);
      if (period === 'month') return created >= new Date(now.getFullYear(), now.getMonth(), 1);
      if (period === 'custom') {
        const from = new Date(startDate + 'T00:00:00');
        const to = new Date(endDate + 'T23:59:59');
        return created >= from && created <= to;
      }
      return true;
    });
  }, [orders, period, startDate, endDate]);

  const lotto = useMemo(() => {
    let sales = 0;
    let payouts = 0;
    let saleCount = 0;
    let payoutCount = 0;
    filteredOrders.forEach(order => {
      order.items.forEach(item => {
        const sku = String(item.product?.sku || '').toUpperCase();
        const id = String(item.product?.id || '').toLowerCase();
        const amount = Number(item.lineTotal ?? item.unitPrice * item.quantity ?? 0);
        if (sku === 'LOTTO-PAYOUT' || id.startsWith('lotto-payout-')) {
          payouts += Math.abs(amount);
          payoutCount += 1;
        } else if (sku.includes('LOTTO') || item.product?.categoryName?.toLowerCase() === 'lotto') {
          sales += Math.abs(amount);
          saleCount += 1;
        }
      });
    });
    return { sales, payouts, saleCount, payoutCount, net: sales - payouts };
  }, [filteredOrders]);

  const inventoryRows = useMemo(
    () =>
      [...products]
        .filter(p => p.active)
        .sort((a, b) => Number(b.stockQuantity || 0) * Number(b.price || 0) - Number(a.stockQuantity || 0) * Number(a.price || 0)),
    [products]
  );

  const salesByCategory = useMemo(() => {
    const totals: Record<string, { sales: number; units: number }> = {};
    filteredOrders.forEach(order => {
      order.items.forEach(item => {
        const category = item.product?.categoryName || 'Uncategorized';
        const lineAmount = Number(item.lineTotal ?? item.unitPrice * item.quantity ?? 0);
        if (!totals[category]) totals[category] = { sales: 0, units: 0 };
        totals[category].sales += Math.max(0, lineAmount);
        totals[category].units += Math.max(0, Number(item.quantity || 0));
      });
    });
    return Object.entries(totals)
      .map(([name, value]) => ({ name, ...value }))
      .sort((a, b) => b.sales - a.sales);
  }, [filteredOrders]);

  const salesByHour = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, hour) => ({ hour, sales: 0, transactions: 0 }));
    filteredOrders.forEach(order => {
      const hour = new Date(order.createdAt).getHours();
      hours[hour].sales += Math.max(0, Number(order.grandTotal || 0));
      hours[hour].transactions += 1;
    });
    return hours.filter(row => row.transactions > 0);
  }, [filteredOrders]);

  const recentSales = useMemo(
    () => [...filteredOrders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 12),
    [filteredOrders]
  );

  const maxCategorySales = Math.max(1, ...salesByCategory.map(row => row.sales));
  const maxHourlySales = Math.max(1, ...salesByHour.map(row => row.sales));

  const reportTabs = [
    { id: 'sales' as const, label: 'Sales Report', icon: BarChart3 },
    { id: 'payment' as const, label: 'Payment Report', icon: CreditCard },
    { id: 'product' as const, label: 'Product Report', icon: Package },
    { id: 'inventory' as const, label: 'Inventory Report', icon: Boxes },
    { id: 'cashier' as const, label: 'Cashier Report', icon: Users },
    { id: 'shift' as const, label: 'Shift Report', icon: ReceiptText },
    { id: 'tax' as const, label: 'Tax Report', icon: Banknote },
    { id: 'lotto' as const, label: 'Lotto Report', icon: Ticket },
  ];

  const downloadCsv = () => {
    const rows: string[][] = [];
    const title = reportTabs.find(item => item.id === tab)?.label || 'Report';

    if (tab === 'sales' && report) {
      rows.push(['Metric', 'Value']);
      rows.push(['Total Sales', report.totalSales.toFixed(2)]);
      rows.push(['Transactions', String(report.completedOrdersCount)]);
      rows.push(['Average Ticket', report.averageOrderValue.toFixed(2)]);
      rows.push(['Discounts', report.discountsTotal.toFixed(2)]);
      rows.push(['Refunds', report.refundsTotal.toFixed(2)]);
    } else if (tab === 'payment' && report) {
      rows.push(['Payment Method', 'Amount']);
      Object.entries(report.salesByPaymentMethod || {}).forEach(([method, amount]) =>
        rows.push([method, Number(amount || 0).toFixed(2)])
      );
    } else if (tab === 'product' && report) {
      rows.push(['Product', 'Units Sold', 'Revenue']);
      report.topSellingProducts.forEach(item =>
        rows.push([item.name, String(item.quantitySold), item.revenue.toFixed(2)])
      );
    } else if (tab === 'inventory') {
      rows.push(['Product', 'SKU', 'On Hand', 'Cost', 'Price', 'Retail Value']);
      inventoryRows.forEach(item =>
        rows.push([
          item.name,
          item.sku,
          String(item.stockQuantity),
          Number(item.cost ?? item.costPrice ?? 0).toFixed(2),
          Number(item.price || 0).toFixed(2),
          (Number(item.stockQuantity || 0) * Number(item.price || 0)).toFixed(2),
        ])
      );
    } else if (tab === 'cashier' && report) {
      rows.push(['Cashier', 'Transactions', 'Sales', 'Average Ticket']);
      report.cashierPerformance.forEach(item =>
        rows.push([item.cashierName, String(item.orderCount), item.totalSales.toFixed(2), item.averageTicket.toFixed(2)])
      );
    } else if (tab === 'shift') {
      rows.push(['Shift', 'Cashier', 'Register', 'Status', 'Net Sales', 'Expected Cash', 'Actual Cash', 'Variance']);
      shifts.forEach(shift =>
        rows.push([
          shift.shiftNumber,
          shift.cashierName,
          shift.registerName,
          shift.status,
          Number(shift.summary?.netSales || shift.currentSales || 0).toFixed(2),
          Number(shift.reconciliation?.expectedCash || shift.summary?.expectedCash || 0).toFixed(2),
          Number(shift.reconciliation?.actualCash || shift.summary?.actualCash || 0).toFixed(2),
          Number(shift.reconciliation?.variance || shift.summary?.variance || 0).toFixed(2),
        ])
      );
    } else if (tab === 'tax' && report) {
      rows.push(['Metric', 'Value']);
      rows.push(['Sales', report.totalSales.toFixed(2)]);
      rows.push(['Tax Collected', report.taxTotal.toFixed(2)]);
    } else if (tab === 'lotto') {
      rows.push(['Metric', 'Value']);
      rows.push(['Lotto Sales', lotto.sales.toFixed(2)]);
      rows.push(['Lotto Payouts', lotto.payouts.toFixed(2)]);
      rows.push(['Net Lotto', lotto.net.toFixed(2)]);
      rows.push(['Sale Transactions', String(lotto.saleCount)]);
      rows.push(['Payout Transactions', String(lotto.payoutCount)]);
    }

    const csv = rows.map(row => row.map(cell => '"' + String(cell).replace(/"/g, '""') + '"').join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = title.toLowerCase().replace(/\s+/g, '-') + '-' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const empty = <div className="py-10 text-center text-sm text-slate-400">No report data for this period.</div>;

  return (
    <div className="h-full overflow-y-auto bg-[#eef3f8] text-[#10234a]">
      <div className="px-4 md:px-5 py-4 space-y-4">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div>
            <div className="text-[10px] text-slate-500 mb-1">Manager Portal › Reports</div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">Report Center</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Sales, payments, products, inventory, cashiers, shifts, tax, and lotto reporting.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={downloadCsv} className="h-10 px-4 rounded-lg bg-[#08274d] text-white text-xs font-black flex items-center gap-2 cursor-pointer">
              <Download className="w-4 h-4" />
              Download Report
            </button>
            <button onClick={load} className="h-10 px-3 rounded-lg bg-white border border-slate-300 text-[#10234a] cursor-pointer">
              <RefreshCw className={'w-4 h-4 ' + (loading ? 'animate-spin' : '')} />
            </button>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-3 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {(['today', 'week', 'month', 'all'] as const).map(value => (
              <button
                key={value}
                onClick={() => setPeriod(value)}
                className={'h-9 px-4 rounded-lg text-xs font-black cursor-pointer ' + (period === value ? 'bg-[#08274d] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}
              >
                {value === 'all' ? 'All Time' : value === 'week' ? '7 Days' : value === 'month' ? 'This Month' : 'Today'}
              </button>
            ))}
            <button
              onClick={() => setPeriod('custom')}
              className={'h-9 px-4 rounded-lg text-xs font-black flex items-center gap-2 cursor-pointer ' + (period === 'custom' ? 'bg-[#c78d20] text-white' : 'bg-slate-100 text-slate-600')}
            >
              <Calendar className="w-4 h-4" />
              Date Range
            </button>
          </div>

          {period === 'custom' && (
            <div className="flex flex-wrap items-center gap-2">
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-9 rounded-lg border border-slate-300 px-2 text-xs" />
              <span className="text-xs text-slate-400">to</span>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-9 rounded-lg border border-slate-300 px-2 text-xs" />
              <button onClick={load} className="h-9 px-4 rounded-lg bg-[#08274d] text-white text-xs font-black cursor-pointer">Apply</button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-2">
          {reportTabs.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={'h-20 rounded-xl border flex flex-col items-center justify-center gap-2 text-[11px] font-black cursor-pointer ' + (tab === item.id ? 'bg-[#08274d] text-white border-[#08274d]' : 'bg-white text-[#10234a] border-slate-200 hover:border-[#c78d20]')}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 py-20 text-center text-sm text-slate-400">Loading report...</div>
        ) : (
          <div className="space-y-4">
            {tab === 'sales' && report && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                  {[
                    ['Net Sales', money(report.totalSales)],
                    ['Transactions', String(report.completedOrdersCount)],
                    ['Average Ticket', money(report.averageOrderValue)],
                    ['Tax Collected', money(report.taxTotal)],
                    ['Discounts', money(report.discountsTotal)],
                    ['Refunds', money(report.refundsTotal)],
                  ].map(([label, value]) => (
                    <div key={label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                      <div className="text-[10px] uppercase font-black text-slate-500">{label}</div>
                      <div className="text-xl font-black mt-2">{value}</div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="font-black">Sales by Category</div>
                        <div className="text-[10px] text-slate-500">Revenue and units sold from completed transactions</div>
                      </div>
                    </div>
                    {salesByCategory.length === 0 ? empty : (
                      <div className="space-y-3">
                        {salesByCategory.slice(0, 10).map(row => (
                          <div key={row.name}>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="font-bold">{row.name}</span>
                              <span className="font-black">{money(row.sales)} <span className="text-slate-400 font-medium">· {row.units} units</span></span>
                            </div>
                            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                              <div className="h-full bg-[#c78d20]" style={{ width: Math.max(2, (row.sales / maxCategorySales) * 100) + '%' }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                    <div className="font-black">Sales by Hour</div>
                    <div className="text-[10px] text-slate-500 mb-4">See the busiest sales hours for the selected period</div>
                    {salesByHour.length === 0 ? empty : (
                      <div className="flex items-end gap-2 h-52 overflow-x-auto pb-2">
                        {salesByHour.map(row => (
                          <div key={row.hour} className="min-w-[42px] flex-1 h-full flex flex-col justify-end items-center">
                            <div className="text-[9px] font-black text-slate-500 mb-1">{money(row.sales)}</div>
                            <div
                              className="w-full max-w-[34px] rounded-t-md bg-[#08274d]"
                              style={{ height: Math.max(8, (row.sales / maxHourlySales) * 150) + 'px' }}
                              title={row.transactions + ' transactions'}
                            />
                            <div className="text-[9px] font-bold text-slate-500 mt-1">
                              {String(row.hour).padStart(2, '0')}:00
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="px-4 py-3 border-b border-slate-200 font-black">Top Selling Products</div>
                    {report.topSellingProducts.length === 0 ? empty : (
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500">
                          <tr><th className="px-4 py-2">Product</th><th className="px-4 py-2 text-right">Units</th><th className="px-4 py-2 text-right">Revenue</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {report.topSellingProducts.slice(0, 8).map(item => (
                            <tr key={item.name}>
                              <td className="px-4 py-3 font-bold">{item.name}</td>
                              <td className="px-4 py-3 text-right">{item.quantitySold}</td>
                              <td className="px-4 py-3 text-right font-black">{money(item.revenue)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="px-4 py-3 border-b border-slate-200 font-black">Recent Sales</div>
                    {recentSales.length === 0 ? empty : (
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500">
                          <tr><th className="px-4 py-2">Order</th><th className="px-4 py-2">Cashier</th><th className="px-4 py-2">Time</th><th className="px-4 py-2 text-right">Total</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {recentSales.map(order => (
                            <tr key={order.id}>
                              <td className="px-4 py-3 font-mono font-bold">{order.orderNumber}</td>
                              <td className="px-4 py-3">{order.cashierName}</td>
                              <td className="px-4 py-3 text-slate-500">{new Date(order.createdAt).toLocaleString()}</td>
                              <td className="px-4 py-3 text-right font-black">{money(order.grandTotal)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </>
            )}

            {tab === 'payment' && report && (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-slate-200 font-black">Payment Breakdown</div>
                {Object.keys(report.salesByPaymentMethod || {}).length === 0 ? empty : (
                  <div className="divide-y divide-slate-100">
                    {Object.entries(report.salesByPaymentMethod || {}).map(([method, amount]) => {
                      const pct = report.totalSales > 0 ? (Number(amount) / report.totalSales) * 100 : 0;
                      return (
                        <div key={method} className="px-4 py-3">
                          <div className="flex justify-between text-xs font-bold">
                            <span className="uppercase">{method}</span>
                            <span>{money(Number(amount))} · {pct.toFixed(1)}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-100 mt-2 overflow-hidden">
                            <div className="h-full bg-[#c78d20]" style={{ width: Math.min(100, pct) + '%' }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {tab === 'product' && report && (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-slate-200 font-black">Top Selling Products</div>
                {report.topSellingProducts.length === 0 ? empty : (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500"><tr><th className="px-4 py-2">Product</th><th className="px-4 py-2 text-right">Units</th><th className="px-4 py-2 text-right">Revenue</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {report.topSellingProducts.map(item => (
                        <tr key={item.name}><td className="px-4 py-3 font-bold">{item.name}</td><td className="px-4 py-3 text-right">{item.quantitySold}</td><td className="px-4 py-3 text-right font-black">{money(item.revenue)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {tab === 'inventory' && report && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-white rounded-xl border border-slate-200 p-4"><div className="text-[10px] uppercase font-black text-slate-500">Units On Hand</div><div className="text-xl font-black mt-2">{report.inventoryValuation.totalUnitsOnHand}</div></div>
                  <div className="bg-white rounded-xl border border-slate-200 p-4"><div className="text-[10px] uppercase font-black text-slate-500">Cost Value</div><div className="text-xl font-black mt-2">{money(report.inventoryValuation.inventoryCostValue)}</div></div>
                  <div className="bg-white rounded-xl border border-slate-200 p-4"><div className="text-[10px] uppercase font-black text-slate-500">Retail Value</div><div className="text-xl font-black mt-2">{money(report.inventoryValuation.inventoryRetailValue)}</div></div>
                  <div className="bg-white rounded-xl border border-slate-200 p-4"><div className="text-[10px] uppercase font-black text-slate-500">Low Stock</div><div className="text-xl font-black mt-2 text-amber-600">{report.inventoryValuation.lowStockItemCount}</div></div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="px-4 py-3 border-b border-slate-200 font-black">Highest Inventory Value</div>
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500"><tr><th className="px-4 py-2">Product</th><th className="px-4 py-2">SKU</th><th className="px-4 py-2 text-right">On Hand</th><th className="px-4 py-2 text-right">Retail Value</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {inventoryRows.slice(0, 10).map(item => (
                        <tr key={item.id}><td className="px-4 py-3 font-bold">{item.name}</td><td className="px-4 py-3 font-mono text-slate-500">{item.sku}</td><td className="px-4 py-3 text-right">{item.stockQuantity}</td><td className="px-4 py-3 text-right font-black">{money(Number(item.stockQuantity || 0) * Number(item.price || 0))}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {tab === 'cashier' && report && (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-slate-200 font-black">Cashier Performance</div>
                {report.cashierPerformance.length === 0 ? empty : (
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500"><tr><th className="px-4 py-2">Cashier</th><th className="px-4 py-2 text-right">Transactions</th><th className="px-4 py-2 text-right">Sales</th><th className="px-4 py-2 text-right">Avg Ticket</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {report.cashierPerformance.map(item => (
                        <tr key={item.cashierName}><td className="px-4 py-3 font-bold">{item.cashierName}</td><td className="px-4 py-3 text-right">{item.orderCount}</td><td className="px-4 py-3 text-right font-black">{money(item.totalSales)}</td><td className="px-4 py-3 text-right">{money(item.averageTicket)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {tab === 'shift' && (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-slate-200 font-black">Shift Summary</div>
                {shifts.length === 0 ? empty : (
                  <table className="w-full text-left text-xs min-w-[900px]">
                    <thead className="bg-slate-50 text-slate-500"><tr><th className="px-4 py-2">Shift</th><th className="px-4 py-2">Cashier</th><th className="px-4 py-2">Register</th><th className="px-4 py-2">Status</th><th className="px-4 py-2 text-right">Net Sales</th><th className="px-4 py-2 text-right">Expected Cash</th><th className="px-4 py-2 text-right">Actual Cash</th><th className="px-4 py-2 text-right">Variance</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {shifts.slice(0, 20).map(shift => {
                        const variance = Number(shift.reconciliation?.variance ?? shift.summary?.variance ?? 0);
                        return (
                          <tr key={shift.id}><td className="px-4 py-3 font-bold">{shift.shiftNumber}</td><td className="px-4 py-3">{shift.cashierName}</td><td className="px-4 py-3">{shift.registerName}</td><td className="px-4 py-3 capitalize">{shift.status}</td><td className="px-4 py-3 text-right font-black">{money(Number(shift.summary?.netSales || shift.currentSales || 0))}</td><td className="px-4 py-3 text-right">{money(Number(shift.reconciliation?.expectedCash || shift.summary?.expectedCash || 0))}</td><td className="px-4 py-3 text-right">{money(Number(shift.reconciliation?.actualCash || shift.summary?.actualCash || 0))}</td><td className={'px-4 py-3 text-right font-black ' + (variance < 0 ? 'text-rose-600' : variance > 0 ? 'text-amber-600' : 'text-emerald-600')}>{money(variance)}</td></tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {tab === 'tax' && report && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-white rounded-xl border border-slate-200 p-5"><div className="text-[10px] uppercase font-black text-slate-500">Sales</div><div className="text-2xl font-black mt-2">{money(report.totalSales)}</div></div>
                <div className="bg-white rounded-xl border border-slate-200 p-5"><div className="text-[10px] uppercase font-black text-slate-500">Tax Collected</div><div className="text-2xl font-black mt-2">{money(report.taxTotal)}</div></div>
                <div className="bg-white rounded-xl border border-slate-200 p-5"><div className="text-[10px] uppercase font-black text-slate-500">Effective Tax %</div><div className="text-2xl font-black mt-2">{report.totalSales > 0 ? ((report.taxTotal / report.totalSales) * 100).toFixed(2) : '0.00'}%</div></div>
              </div>
            )}

            {tab === 'lotto' && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="bg-white rounded-xl border border-slate-200 p-4"><div className="text-[10px] uppercase font-black text-slate-500">Lotto Sales</div><div className="text-xl font-black mt-2 text-emerald-600">{money(lotto.sales)}</div></div>
                <div className="bg-white rounded-xl border border-slate-200 p-4"><div className="text-[10px] uppercase font-black text-slate-500">Payouts</div><div className="text-xl font-black mt-2 text-rose-600">{money(lotto.payouts)}</div></div>
                <div className="bg-white rounded-xl border border-slate-200 p-4"><div className="text-[10px] uppercase font-black text-slate-500">Net Lotto</div><div className="text-xl font-black mt-2">{money(lotto.net)}</div></div>
                <div className="bg-white rounded-xl border border-slate-200 p-4"><div className="text-[10px] uppercase font-black text-slate-500">Sale Lines</div><div className="text-xl font-black mt-2">{lotto.saleCount}</div></div>
                <div className="bg-white rounded-xl border border-slate-200 p-4"><div className="text-[10px] uppercase font-black text-slate-500">Payout Lines</div><div className="text-xl font-black mt-2">{lotto.payoutCount}</div></div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
