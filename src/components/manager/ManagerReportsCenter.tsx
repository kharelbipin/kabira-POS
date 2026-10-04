import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  CalendarDays,
  ChevronDown,
  Download,
  Printer,
  Search,
} from 'lucide-react';
import { Order, Product, SalesReport, Shift } from '../../types';
import { api } from '../../utils/api';

type ReportType =
  | 'summary'
  | 'tender'
  | 'sales'
  | 'day'
  | 'expenses'
  | 'compare'
  | 'current_stock'
  | 'dead_stock'
  | 'over_stock'
  | 'tax'
  | 'receive'
  | 'transfer'
  | 'items_not_found'
  | 'notes'
  | 'payroll'
  | 'modification'
  | 'variance'
  | 'house_account'
  | 'customer_history';

interface ManagerReportsCenterProps {
  orders: Order[];
  products: Product[];
}

const money = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value || 0));

const REPORT_OPTIONS: { id: ReportType; label: string }[] = [
  { id: 'summary', label: 'Summary' },
  { id: 'tender', label: 'Tender Report' },
  { id: 'sales', label: 'Sales Report' },
  { id: 'day', label: 'Day Report' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'compare', label: 'Compare Period' },
  { id: 'current_stock', label: 'Current Stock' },
  { id: 'dead_stock', label: 'Dead Stock' },
  { id: 'over_stock', label: 'Over Stock' },
  { id: 'tax', label: 'Tax Breakdown' },
  { id: 'receive', label: 'Receive Report' },
  { id: 'transfer', label: 'Transfer Report' },
  { id: 'items_not_found', label: 'Items Not Found' },
  { id: 'notes', label: 'Notes Report' },
  { id: 'payroll', label: 'Payroll Report' },
  { id: 'modification', label: 'Modification Report' },
  { id: 'variance', label: 'Variance Report' },
  { id: 'house_account', label: 'House Account Report' },
  { id: 'customer_history', label: 'Customer History' },
];

export const ManagerReportsCenter: React.FC<ManagerReportsCenterProps> = ({ orders, products }) => {
  const [reportType, setReportType] = useState<ReportType>('summary');
  const [shiftFilter, setShiftFilter] = useState('all');
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'custom' | 'all'>('today');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [report, setReport] = useState<SalesReport | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [resultSearch, setResultSearch] = useState('');
  const [entries, setEntries] = useState(100);
  const [showAdvanced, setShowAdvanced] = useState(false);

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

      if (shiftFilter !== 'all') {
        const selectedShift = shifts.find(shift => shift.id === shiftFilter);
        if (selectedShift?.cashierId && order.cashierId !== selectedShift.cashierId) return false;
      }

      if (period === 'all') return true;
      if (period === 'today') return created.toDateString() === now.toDateString();
      if (period === 'week') return created >= new Date(now.getTime() - 7 * 86400000);
      if (period === 'month') return created >= new Date(now.getFullYear(), now.getMonth(), 1);

      const from = new Date(startDate + 'T00:00:00');
      const to = new Date(endDate + 'T23:59:59');
      return created >= from && created <= to;
    });
  }, [orders, period, startDate, endDate, shiftFilter, shifts]);

  const salesByCategory = useMemo(() => {
    const totals: Record<string, { salesCount: number; total: number }> = {};

    filteredOrders.forEach(order => {
      order.items.forEach(item => {
        const category = item.product?.categoryName || 'Other';
        if (!totals[category]) totals[category] = { salesCount: 0, total: 0 };
        totals[category].salesCount += Math.max(0, Number(item.quantity || 0));
        totals[category].total += Math.max(
          0,
          Number(item.lineTotal ?? Number(item.unitPrice || 0) * Number(item.quantity || 0))
        );
      });
    });

    return Object.entries(totals)
      .map(([category, values]) => ({ category, ...values }))
      .sort((a, b) => b.total - a.total);
  }, [filteredOrders]);

  const currentStockRows = useMemo(
    () =>
      products
        .filter(product => product.active)
        .map(product => ({
          category: product.name,
          salesCount: Number(product.stockQuantity || 0),
          total: Number(product.stockQuantity || 0) * Number(product.price || 0),
        }))
        .sort((a, b) => b.total - a.total),
    [products]
  );

  const tenderRows = useMemo(() => {
    if (!report) return [];
    return Object.entries(report.salesByPaymentMethod || {}).map(([method, total]) => ({
      category: method.toUpperCase(),
      salesCount: filteredOrders.filter(
        order => String(order.payment?.method || '').toLowerCase() === method.toLowerCase()
      ).length,
      total: Number(total || 0),
    }));
  }, [report, filteredOrders]);

  const taxRows = useMemo(
    () => [
      {
        category: 'Taxable Sales',
        salesCount: filteredOrders.length,
        total: Number(report?.totalSales || 0),
      },
      {
        category: 'Sales Tax Collected',
        salesCount: filteredOrders.length,
        total: Number(report?.taxTotal || 0),
      },
    ],
    [filteredOrders, report]
  );

  const baseRows = useMemo(() => {
    if (reportType === 'tender') return tenderRows;
    if (reportType === 'current_stock') return currentStockRows;
    if (reportType === 'tax') return taxRows;
    return salesByCategory;
  }, [reportType, tenderRows, currentStockRows, taxRows, salesByCategory]);

  const visibleRows = useMemo(() => {
    const q = resultSearch.trim().toLowerCase();
    const rows = q ? baseRows.filter(row => row.category.toLowerCase().includes(q)) : baseRows;
    return rows.slice(0, entries);
  }, [baseRows, resultSearch, entries]);

  const totalSalesCount = visibleRows.reduce((sum, row) => sum + Number(row.salesCount || 0), 0);
  const totalAmount = visibleRows.reduce((sum, row) => sum + Number(row.total || 0), 0);

  const selectedReportLabel = REPORT_OPTIONS.find(option => option.id === reportType)?.label || 'Summary';

  const rangeText = useMemo(() => {
    if (period === 'today') {
      const date = new Date();
      const d = date.toLocaleDateString();
      return `${d} 12:00 AM - ${d} 11:59 PM`;
    }
    if (period === 'week') return 'Last 7 Days';
    if (period === 'month') return 'This Month';
    if (period === 'all') return 'All Time';
    return `${startDate} 12:00 AM - ${endDate} 11:59 PM`;
  }, [period, startDate, endDate]);

  const downloadCsv = () => {
    const rows = [['Department / Category', '# Sales', 'Total']];
    visibleRows.forEach(row =>
      rows.push([row.category, String(row.salesCount), Number(row.total).toFixed(2)])
    );
    rows.push(['Total', String(totalSalesCount), totalAmount.toFixed(2)]);

    const csv = rows
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download =
      selectedReportLabel.toLowerCase().replace(/\s+/g, '-') +
      '-' +
      new Date().toISOString().slice(0, 10) +
      '.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full overflow-y-auto bg-[#07111f] text-slate-100">
      <div className="p-5 md:p-6 space-y-4 max-w-[1600px] mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl border border-amber-500/60 bg-amber-500/10 flex items-center justify-center">
              <BarChart3 className="w-7 h-7 text-amber-400" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight">Reports</h1>
              <p className="text-sm text-slate-400 mt-0.5">
                View detailed reports on sales, inventory, customers and more.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={downloadCsv}
              className="h-12 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-5 h-5" />
              Export CSV
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="h-12 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-sm flex items-center gap-2 cursor-pointer"
            >
              <Printer className="w-5 h-5" />
              Print
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-700/60 bg-[#0b1828] p-4 shadow-xl">
          <div className="grid grid-cols-1 xl:grid-cols-[1.05fr_0.8fr_1.8fr_auto] gap-4 items-end">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-2">Report Type</label>
              <div className="relative">
                <select
                  value={reportType}
                  onChange={e => setReportType(e.target.value as ReportType)}
                  className="w-full h-12 appearance-none rounded-xl border border-amber-500 bg-[#0d1b2d] px-4 pr-10 text-sm font-bold text-white outline-none cursor-pointer"
                >
                  {REPORT_OPTIONS.map(option => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 absolute right-3 top-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-2">Shift</label>
              <div className="relative">
                <select
                  value={shiftFilter}
                  onChange={e => setShiftFilter(e.target.value)}
                  className="w-full h-12 appearance-none rounded-xl border border-slate-600 bg-[#0d1b2d] px-4 pr-10 text-sm text-white outline-none cursor-pointer"
                >
                  <option value="all">All Shifts</option>
                  {shifts.map(shift => (
                    <option key={shift.id} value={shift.id}>
                      {shift.shiftNumber} · {shift.cashierName}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 absolute right-3 top-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-2">Range:</label>
              <div className="h-12 rounded-xl border border-slate-600 bg-[#0d1b2d] flex items-center">
                <div className="h-full w-12 flex items-center justify-center border-r border-slate-600">
                  <CalendarDays className="w-5 h-5 text-slate-300" />
                </div>
                <div className="flex-1 px-4 text-sm font-medium text-slate-200 truncate">{rangeText}</div>
                <button
                  type="button"
                  onClick={() => setShowAdvanced(prev => !prev)}
                  className="h-full w-12 flex items-center justify-center border-l border-slate-600 hover:bg-white/5 cursor-pointer"
                >
                  <ChevronDown className="w-4 h-4 text-slate-300" />
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowAdvanced(prev => !prev)}
              className="h-12 px-5 rounded-xl border border-amber-500 text-white bg-transparent hover:bg-amber-500/10 font-bold text-sm flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <Search className="w-5 h-5 text-amber-400" />
              Advance Search
            </button>
          </div>

          {showAdvanced && (
            <div className="mt-4 pt-4 border-t border-slate-700 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
              {[
                ['today', 'Today'],
                ['week', '7 Days'],
                ['month', 'This Month'],
                ['all', 'All Time'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPeriod(value as typeof period)}
                  className={
                    'h-10 rounded-lg border text-xs font-black cursor-pointer ' +
                    (period === value
                      ? 'bg-amber-500 text-slate-950 border-amber-500'
                      : 'bg-[#0d1b2d] text-slate-300 border-slate-600')
                  }
                >
                  {label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPeriod('custom')}
                className={
                  'h-10 rounded-lg border text-xs font-black cursor-pointer ' +
                  (period === 'custom'
                    ? 'bg-amber-500 text-slate-950 border-amber-500'
                    : 'bg-[#0d1b2d] text-slate-300 border-slate-600')
                }
              >
                Custom Range
              </button>

              {period === 'custom' && (
                <div className="md:col-span-2 xl:col-span-5 flex flex-wrap items-center gap-3 pt-1">
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="h-10 rounded-lg border border-slate-600 bg-[#0d1b2d] px-3 text-xs text-white"
                  />
                  <span className="text-xs text-slate-500">to</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="h-10 rounded-lg border border-slate-600 bg-[#0d1b2d] px-3 text-xs text-white"
                  />
                  <button
                    type="button"
                    onClick={load}
                    className="h-10 px-5 rounded-lg bg-amber-500 text-slate-950 text-xs font-black cursor-pointer"
                  >
                    Apply Range
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-700/60 bg-[#0b1828] px-6 py-6 text-center shadow-xl">
          <h2 className="text-3xl font-black text-white">
            {selectedReportLabel} - {shiftFilter === 'all' ? 'All' : 'Selected Shift'} - All
          </h2>
          <p className="text-sm text-slate-300 mt-2">Range: {rangeText}</p>
        </div>

        <div className="rounded-2xl border border-slate-700/60 bg-[#0b1828] p-4 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
            <div className="relative w-full md:max-w-sm">
              <Search className="w-5 h-5 absolute left-3 top-3 text-slate-400" />
              <input
                value={resultSearch}
                onChange={e => setResultSearch(e.target.value)}
                placeholder="Search within results..."
                className="w-full h-11 rounded-xl border border-slate-600 bg-[#0d1b2d] pl-11 pr-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 text-sm text-slate-300">
              <span>Show</span>
              <select
                value={entries}
                onChange={e => setEntries(Number(e.target.value))}
                className="h-11 rounded-xl border border-slate-600 bg-[#0d1b2d] px-3 text-white"
              >
                {[25, 50, 100, 250].map(value => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
              <span>Entries</span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-700">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="bg-[#142238] text-left text-slate-100">
                  <th className="px-5 py-4 font-black border-r border-slate-700" rowSpan={2}>
                    Department / Category
                  </th>
                  <th className="px-5 py-3 font-black text-center border-b border-slate-700" colSpan={2}>
                    This
                  </th>
                </tr>
                <tr className="bg-[#16263d] text-slate-200">
                  <th className="px-5 py-3 font-black text-center border-r border-slate-700"># Sales</th>
                  <th className="px-5 py-3 font-black text-left">Total</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={3} className="px-5 py-16 text-center text-slate-400">
                      Loading report...
                    </td>
                  </tr>
                ) : visibleRows.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-5 py-16 text-center text-slate-400">
                      No report data found for this selection.
                    </td>
                  </tr>
                ) : (
                  visibleRows.map((row, index) => (
                    <tr
                      key={row.category}
                      className={index % 2 === 0 ? 'bg-[#081526]' : 'bg-[#0e1c2f]'}
                    >
                      <td className="px-5 py-3 border-r border-slate-800 font-medium text-slate-100">
                        {row.category}
                      </td>
                      <td className="px-5 py-3 border-r border-slate-800 text-center">
                        <span className="text-sky-400 underline underline-offset-2 font-bold">
                          {row.salesCount}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-medium text-slate-100">{money(row.total)}</td>
                    </tr>
                  ))
                )}
              </tbody>

              {!loading && visibleRows.length > 0 && (
                <tfoot>
                  <tr className="bg-amber-500/20 border-t border-amber-500/40">
                    <td className="px-5 py-4 font-black text-amber-300 border-r border-amber-500/20">
                      Total
                    </td>
                    <td className="px-5 py-4 font-black text-center text-amber-300 border-r border-amber-500/20">
                      {totalSalesCount}
                    </td>
                    <td className="px-5 py-4 font-black text-amber-300">{money(totalAmount)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
