import React, { useState, useEffect } from 'react';
import { SalesReport } from '../types';
import { api } from '../utils/api';
import { playBeep } from '../utils/audio';
import {
  BarChart3,
  TrendingUp,
  CreditCard,
  Banknote,
  RotateCcw,
  Tag,
  Download,
  Calendar,
  Users,
  Award,
  Package,
  Boxes,
  RefreshCw,
} from 'lucide-react';

export const ReportsView: React.FC = () => {
  const [report, setReport] = useState<SalesReport | null>(null);
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'all'>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchReport = async () => {
    setIsLoading(true);
    try {
      const data = await api.getSalesReport(period);
      setReport(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [period]);

  const handleExportCSV = () => {
    if (!report) return;
    playBeep('click');

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Metric,Value\n';
    csvContent += `Period,${report.period || 'all'}\n`;
    csvContent += `Total Sales,$${(report.totalSales ?? 0).toFixed(2)}\n`;
    csvContent += `Completed Orders,${report.completedOrdersCount ?? 0}\n`;
    csvContent += `Average Order Value,$${(report.averageOrderValue ?? 0).toFixed(2)}\n`;
    csvContent += `Total Discounts,$${(report.discountsTotal ?? 0).toFixed(2)}\n`;
    csvContent += `Total Tax Collected,$${(report.taxTotal ?? 0).toFixed(2)}\n`;
    csvContent += `Total Refunds,$${(report.refundsTotal ?? 0).toFixed(2)}\n\n`;

    csvContent += 'Top Selling Products\nProduct,Units Sold,Revenue\n';
    (report.topSellingProducts || []).forEach(p => {
      csvContent += `"${p.name}",${p.quantitySold ?? 0},$${(p.revenue ?? 0).toFixed(2)}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `sales-report-${period}-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-84px)] overflow-y-auto bg-[#0A0A0A] text-[#E5E5E5] p-4 md:p-6 select-none space-y-6">
      {/* Top Header & Period Selector (RE-02) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0D0D0D] p-4 rounded-xl border border-[#262626]">
        <div>
          <h2 className="text-xl font-serif italic font-bold text-[#F5F5F5] flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-[#C5A059]" />
            <span>Executive Sales & Inventory Analytics</span>
          </h2>
          <p className="text-xs text-[#737373] mt-0.5 font-sans">Real-time revenue, register metrics, and staff performance</p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Period Pills */}
          <div className="flex bg-[#141414] p-1 rounded-lg border border-[#262626] text-xs">
            {(['today', 'week', 'month', 'all'] as const).map(p => (
              <button
                key={p}
                id={`report-period-${p}`}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 font-bold text-xs uppercase tracking-wider rounded capitalize transition-all cursor-pointer ${
                  period === p ? 'bg-[#C5A059] text-black shadow-sm' : 'text-[#737373] hover:text-white'
                }`}
              >
                {p === 'all' ? 'All Time' : p}
              </button>
            ))}
          </div>

          <button
            id="report-export-btn"
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#141414] hover:bg-[#1A1A1A] text-[#A3A3A3] hover:text-white text-xs font-bold uppercase tracking-wider border border-[#262626] transition-colors cursor-pointer"
            title="Download CSV report (RE-06)"
          >
            <Download className="w-3.5 h-3.5 text-[#C5A059]" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={fetchReport}
            className="p-1.5 text-[#737373] hover:text-white rounded hover:bg-[#141414] cursor-pointer transition-colors"
            title="Refresh analytics"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {report && (
        <>
          {/* High Level Key Metric Cards (RE-01) */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-[#0D0D0D] p-4 rounded-xl border border-[#262626] shadow-sm">
              <div className="text-[10px] uppercase tracking-widest font-bold text-[#737373]">Total Net Sales</div>
              <div className="text-xl lg:text-2xl font-black text-[#C5A059] font-mono mt-1">
                ${(report.totalSales ?? 0).toFixed(2)}
              </div>
              <div className="text-[10px] text-[#525252] mt-1 font-mono">Gross revenue</div>
            </div>

            <div className="bg-[#0D0D0D] p-4 rounded-xl border border-[#262626] shadow-sm">
              <div className="text-[10px] uppercase tracking-widest font-bold text-[#737373]">Orders Processed</div>
              <div className="text-xl lg:text-2xl font-black text-[#F5F5F5] font-mono mt-1">
                {report.completedOrdersCount ?? 0}
              </div>
              <div className="text-[10px] text-[#525252] mt-1 font-mono">Completed sales</div>
            </div>

            <div className="bg-[#0D0D0D] p-4 rounded-xl border border-[#262626] shadow-sm">
              <div className="text-[10px] uppercase tracking-widest font-bold text-[#737373]">Avg Order Value</div>
              <div className="text-xl lg:text-2xl font-black text-green-400 font-mono mt-1">
                ${(report.averageOrderValue ?? 0).toFixed(2)}
              </div>
              <div className="text-[10px] text-[#525252] mt-1 font-mono">Per customer ticket</div>
            </div>

            <div className="bg-[#0D0D0D] p-4 rounded-xl border border-[#262626] shadow-sm">
              <div className="text-[10px] uppercase tracking-widest font-bold text-[#737373]">Tax Collected</div>
              <div className="text-xl lg:text-2xl font-black text-[#D4D4D4] font-mono mt-1">
                ${(report.taxTotal ?? 0).toFixed(2)}
              </div>
              <div className="text-[10px] text-[#525252] mt-1 font-mono">State & local sales tax</div>
            </div>

            <div className="bg-[#0D0D0D] p-4 rounded-xl border border-[#262626] shadow-sm">
              <div className="text-[10px] uppercase tracking-widest font-bold text-[#737373]">Discounts Given</div>
              <div className="text-xl lg:text-2xl font-black text-[#C5A059] font-mono mt-1">
                ${(report.discountsTotal ?? 0).toFixed(2)}
              </div>
              <div className="text-[10px] text-[#525252] mt-1 font-mono">Promotions & staff</div>
            </div>

            <div className="bg-[#0D0D0D] p-4 rounded-xl border border-[#262626] shadow-sm">
              <div className="text-[10px] uppercase tracking-widest font-bold text-[#737373]">Total Refunds</div>
              <div className="text-xl lg:text-2xl font-black text-red-400 font-mono mt-1">
                ${(report.refundsTotal ?? 0).toFixed(2)}
              </div>
              <div className="text-[10px] text-[#525252] mt-1 font-mono">Returns & credits</div>
            </div>
          </div>

          {/* Payment Methods & Inventory Health Split */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Payment Method Distribution */}
            <div className="bg-[#0D0D0D] p-5 rounded-xl border border-[#262626] shadow-sm space-y-4">
              <h3 className="font-serif italic font-bold text-base flex items-center space-x-2 text-[#F5F5F5]">
                <CreditCard className="w-4 h-4 text-[#C5A059]" />
                <span>Tender Breakdown by Payment Method</span>
              </h3>
              <div className="space-y-2.5 text-xs">
                {Object.entries(report.salesByPaymentMethod || {}).map(([pm, rawAmt]) => {
                  const amt = Number(rawAmt) || 0;
                  const total = report.totalSales ?? 0;
                  const pct = total > 0 ? ((amt / total) * 100).toFixed(1) : '0';
                  return (
                    <div key={pm} className="space-y-1">
                      <div className="flex justify-between font-mono">
                        <span className="uppercase font-bold tracking-wider text-[#A3A3A3]">{pm}</span>
                        <span className="text-[#F5F5F5] font-bold">${amt.toFixed(2)} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-[#141414] rounded-full h-2 overflow-hidden border border-[#262626]">
                        <div
                          className="bg-[#C5A059] h-full rounded-full"
                          style={{ width: `${Math.min(100, Math.max(0, parseFloat(pct)))}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Inventory Valuation & Health (RE-05) */}
            <div className="bg-[#0D0D0D] p-5 rounded-xl border border-[#262626] shadow-sm space-y-4">
              <h3 className="font-serif italic font-bold text-base flex items-center space-x-2 text-[#F5F5F5]">
                <Boxes className="w-4 h-4 text-[#C5A059]" />
                <span>Inventory Valuation & Health (RE-05)</span>
              </h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-[#141414] p-3 rounded-lg border border-[#262626]">
                  <div className="text-[#737373] uppercase tracking-wider font-bold text-[10px]">Total Stock on Hand</div>
                  <div className="text-xl font-bold font-mono text-[#F5F5F5] mt-1">
                    {report.inventoryValuation?.totalUnitsOnHand ?? 0} bottles
                  </div>
                </div>
                <div className="bg-[#141414] p-3 rounded-lg border border-[#262626]">
                  <div className="text-[#737373] uppercase tracking-wider font-bold text-[10px]">Inventory Cost Value</div>
                  <div className="text-xl font-bold font-mono text-[#C5A059] mt-1">
                    ${(report.inventoryValuation?.inventoryCostValue ?? 0).toFixed(2)}
                  </div>
                </div>
                <div className="bg-[#141414] p-3 rounded-lg border border-[#262626]">
                  <div className="text-[#737373] uppercase tracking-wider font-bold text-[10px]">Inventory Retail Value</div>
                  <div className="text-xl font-bold font-mono text-green-400 mt-1">
                    ${(report.inventoryValuation?.inventoryRetailValue ?? 0).toFixed(2)}
                  </div>
                </div>
                <div className="bg-[#141414] p-3 rounded-lg border border-[#262626]">
                  <div className="text-[#737373] uppercase tracking-wider font-bold text-[10px]">Low Stock SKUs</div>
                  <div className="text-xl font-bold font-mono text-red-400 mt-1">
                    {report.inventoryValuation?.lowStockItemCount ?? 0} items
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Top Selling Products & Cashier Performance (RE-03 & RE-04) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top Selling Products (RE-03) */}
            <div className="bg-[#0D0D0D] rounded-xl border border-[#262626] overflow-hidden shadow-sm">
              <div className="p-4 border-b border-[#262626] flex items-center justify-between">
                <h3 className="font-serif italic font-bold text-base flex items-center space-x-2 text-[#F5F5F5]">
                  <Award className="w-4 h-4 text-[#C5A059]" />
                  <span>Top-Selling Products (RE-03)</span>
                </h3>
              </div>
              <table className="w-full text-left text-xs text-[#D4D4D4]">
                <thead className="bg-[#0A0A0A] text-[#737373] uppercase text-[10px] tracking-widest border-b border-[#262626] font-bold">
                  <tr>
                    <th className="px-4 py-3">Product Title</th>
                    <th className="px-4 py-3 text-center">Units Sold</th>
                    <th className="px-4 py-3 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F1F1F] font-mono">
                  {(!report.topSellingProducts || report.topSellingProducts.length === 0) ? (
                    <tr>
                      <td colSpan={3} className="text-center py-6 text-[#737373] font-sans">
                        No sales activity in this period.
                      </td>
                    </tr>
                  ) : (
                    (report.topSellingProducts || []).slice(0, 7).map((p, idx) => (
                      <tr key={idx} className="hover:bg-[#161616]">
                        <td className="px-4 py-2.5 font-sans font-medium text-[#F5F5F5] truncate max-w-xs">
                          {p.name}
                        </td>
                        <td className="px-4 py-2.5 text-center font-bold text-[#C5A059]">
                          {p.quantitySold ?? 0}
                        </td>
                        <td className="px-4 py-2.5 text-right font-bold text-[#F5F5F5]">
                          ${(p.revenue ?? 0).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Sales by Cashier / Staff (RE-04) */}
            <div className="bg-[#0D0D0D] rounded-xl border border-[#262626] overflow-hidden shadow-sm">
              <div className="p-4 border-b border-[#262626] flex items-center justify-between">
                <h3 className="font-serif italic font-bold text-base flex items-center space-x-2 text-[#F5F5F5]">
                  <Users className="w-4 h-4 text-[#C5A059]" />
                  <span>Cashier & Staff Performance (RE-04)</span>
                </h3>
              </div>
              <table className="w-full text-left text-xs text-[#D4D4D4]">
                <thead className="bg-[#0A0A0A] text-[#737373] uppercase text-[10px] tracking-widest border-b border-[#262626] font-bold">
                  <tr>
                    <th className="px-4 py-3">Staff Member</th>
                    <th className="px-4 py-3 text-center">Tickets</th>
                    <th className="px-4 py-3 text-right">Total Ring</th>
                    <th className="px-4 py-3 text-right">AOV</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F1F1F] font-mono">
                  {(!report.cashierPerformance || report.cashierPerformance.length === 0) ? (
                    <tr>
                      <td colSpan={4} className="text-center py-6 text-[#737373] font-sans">
                        No cashier tickets recorded.
                      </td>
                    </tr>
                  ) : (
                    (report.cashierPerformance || []).map((c, idx) => (
                      <tr key={idx} className="hover:bg-[#161616]">
                        <td className="px-4 py-2.5 font-sans font-medium text-[#F5F5F5]">
                          {c.cashierName}
                        </td>
                        <td className="px-4 py-2.5 text-center text-[#A3A3A3]">
                          {c.orderCount ?? 0}
                        </td>
                        <td className="px-4 py-2.5 text-right font-bold text-[#C5A059]">
                          ${(c.totalSales ?? 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-2.5 text-right text-green-400">
                          ${(c.averageTicket ?? 0).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
