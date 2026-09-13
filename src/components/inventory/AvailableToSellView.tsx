import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { ShieldCheck, RefreshCw, Layers, Lock, ShieldAlert, Sparkles, AlertTriangle } from 'lucide-react';

export const AvailableToSellView: React.FC = () => {
  const [atsList, setAtsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadATS = async () => {
    setLoading(true);
    try {
      const res = await api.getAllProductsATS();
      setAtsList(res.atsList || []);
    } catch (err) {
      console.error('Failed to load ATS', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadATS();
  }, []);

  const filtered = atsList.filter(item => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      item.productName?.toLowerCase().includes(q) ||
      item.sku?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0A0A0A] overflow-hidden text-[#E5E5E5] p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#262626] pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="font-serif italic font-bold text-xl text-[#F5F5F5]">
              Available-To-Sell (ATS) Engine
            </h2>
            <span className="flex items-center space-x-1 text-[11px] bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 px-2 py-0.5 rounded-full font-medium">
              <ShieldCheck className="w-3 h-3" />
              <span>US-005 & US-007: Real-Time Protection</span>
            </span>
          </div>
          <p className="text-xs text-[#888888] mt-1 max-w-2xl">
            Mathematical formula: <span className="text-[#C5A059] font-mono font-bold">ATS = OnHand Physical Stock − Active Web/BOPIS Reservations − Store Safety Stock Threshold</span>. Prevents overselling across channels when in-store customers buy physical stock.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={loadATS}
            disabled={loading}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#161616] hover:bg-[#202020] border border-[#262626] text-xs font-bold uppercase tracking-wider text-[#A3A3A3] hover:text-[#F5F5F5] transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Recalculate ATS</span>
          </button>
        </div>
      </div>

      {/* Formula Explainer Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
        <div className="bg-[#111111] p-3.5 rounded-xl border border-[#222222]">
          <div className="text-[#737373] text-[10px] uppercase font-bold tracking-wider mb-1">Total On-Hand</div>
          <div className="text-xl font-bold font-mono text-[#F5F5F5]">
            {atsList.reduce((acc, curr) => acc + (curr.onHand || 0), 0)} units
          </div>
          <p className="text-[11px] text-[#888888] mt-1">Physical inventory in store</p>
        </div>

        <div className="bg-[#111111] p-3.5 rounded-xl border border-[#222222]">
          <div className="text-[#737373] text-[10px] uppercase font-bold tracking-wider mb-1">Active Reservations</div>
          <div className="text-xl font-bold font-mono text-amber-400">
            {atsList.reduce((acc, curr) => acc + (curr.reserved || 0), 0)} units
          </div>
          <p className="text-[11px] text-[#888888] mt-1">Pending BOPIS & web pick orders</p>
        </div>

        <div className="bg-[#111111] p-3.5 rounded-xl border border-[#222222]">
          <div className="text-[#737373] text-[10px] uppercase font-bold tracking-wider mb-1">Safety Buffer</div>
          <div className="text-xl font-bold font-mono text-purple-400">
            {atsList.reduce((acc, curr) => acc + (curr.safetyStock || 0), 0)} units
          </div>
          <p className="text-[11px] text-[#888888] mt-1">Walk-in customer protection</p>
        </div>

        <div className="bg-[#111111] p-3.5 rounded-xl border border-[#222222]">
          <div className="text-[#737373] text-[10px] uppercase font-bold tracking-wider mb-1">Net ATS to Website</div>
          <div className="text-xl font-bold font-mono text-emerald-400">
            {atsList.reduce((acc, curr) => acc + (curr.availableToSell || 0), 0)} units
          </div>
          <p className="text-[11px] text-[#888888] mt-1">Quantity published online</p>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto rounded-xl border border-[#262626] bg-[#0E0E0E]">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#141414] border-b border-[#262626] text-[#737373] uppercase tracking-wider font-semibold sticky top-0 z-10">
              <th className="px-4 py-3">Product Name & SKU</th>
              <th className="px-4 py-3 text-right">Physical On Hand</th>
              <th className="px-4 py-3 text-right">Reserved (BOPIS/Web)</th>
              <th className="px-4 py-3 text-right">Safety Buffer</th>
              <th className="px-4 py-3 text-right text-emerald-400">Net ATS (Available To Sell)</th>
              <th className="px-4 py-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1D1D1D] font-sans">
            {filtered.map(item => (
              <tr key={item.productId} className="hover:bg-[#141414] transition-colors">
                <td className="px-4 py-3">
                  <div className="font-medium text-[#F5F5F5]">{item.productName}</div>
                  <div className="font-mono text-[10px] text-[#666666]">SKU: {item.sku}</div>
                </td>

                <td className="px-4 py-3 text-right font-mono text-[#A3A3A3]">
                  {item.onHand} units
                </td>

                <td className="px-4 py-3 text-right font-mono">
                  {item.reserved > 0 ? (
                    <span className="text-amber-400 font-bold bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40">
                      {item.reserved} units
                    </span>
                  ) : (
                    <span className="text-[#666666]">0</span>
                  )}
                </td>

                <td className="px-4 py-3 text-right font-mono text-purple-300">
                  {item.safetyStock} units
                </td>

                <td className="px-4 py-3 text-right font-mono font-bold text-sm text-emerald-400">
                  {item.availableToSell} units
                </td>

                <td className="px-4 py-3 text-center">
                  {item.availableToSell === 0 ? (
                    <span className="bg-red-950/40 text-red-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-red-800/40">
                      Sold Out Online
                    </span>
                  ) : item.availableToSell <= 3 ? (
                    <span className="bg-[#C5A059]/20 text-[#C5A059] px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-[#C5A059]/40">
                      Low ATS
                    </span>
                  ) : (
                    <span className="bg-emerald-950/40 text-emerald-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-emerald-800/40">
                      In Stock
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
