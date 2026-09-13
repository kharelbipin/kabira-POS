import React, { useState, useEffect } from 'react';
import {
  History,
  Sparkles,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Calendar,
  UserCheck,
  Package,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
} from 'lucide-react';
import { InventoryAdjustment } from '../../types';
import { api } from '../../utils/api';

interface InventoryUpdatesHistoryViewProps {
  onOpenAiCounter: () => void;
}

export const InventoryUpdatesHistoryView: React.FC<InventoryUpdatesHistoryViewProps> = ({
  onOpenAiCounter,
}) => {
  const [adjustments, setAdjustments] = useState<InventoryAdjustment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const data = await api.getInventoryAdjustments();
      setAdjustments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load inventory adjustment history', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const filteredAdjustments = adjustments.filter(adj => {
    if (typeFilter !== 'all') {
      if (typeFilter === 'ai' && adj.type !== 'ai_shelf_count') return false;
      if (typeFilter === 'manual' && (adj.type === 'ai_shelf_count' || adj.type === 'receive' || adj.type === 'sale')) return false;
      if (typeFilter === 'receive' && adj.type !== 'receive') return false;
      if (typeFilter === 'damaged' && adj.type !== 'damaged') return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        adj.productName?.toLowerCase().includes(q) ||
        adj.sku?.toLowerCase().includes(q) ||
        adj.userName?.toLowerCase().includes(q) ||
        adj.reason?.toLowerCase().includes(q) ||
        adj.shelfLocation?.toLowerCase().includes(q)
      );
    }

    return true;
  });

  const totalAdjustments = adjustments.length;
  const aiAdjustmentsCount = adjustments.filter(a => a.type === 'ai_shelf_count').length;
  const netUnitsAdjusted = adjustments.reduce((sum, a) => sum + (a.changeAmount || 0), 0);

  const getTypeBadge = (adj: InventoryAdjustment) => {
    switch (adj.type) {
      case 'ai_shelf_count':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#C5A059]/15 text-[#C5A059] border border-[#C5A059]/30">
            <Sparkles className="w-3 h-3" />
            <span>AI Shelf Recount</span>
          </span>
        );
      case 'receive':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
            <ArrowUpRight className="w-3 h-3" />
            <span>Stock Received</span>
          </span>
        );
      case 'damaged':
      case 'missing':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-950/60 text-rose-400 border border-rose-800/40">
            <AlertTriangle className="w-3 h-3" />
            <span>{adj.type === 'damaged' ? 'Damaged / Breakage' : 'Missing'}</span>
          </span>
        );
      case 'sale':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-950/60 text-sky-400 border border-sky-800/40">
            <Package className="w-3 h-3" />
            <span>Customer Sale</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#262626] text-[#CCCCCC]">
            <span>Manual Adjustment</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#141414] p-5 rounded-2xl border border-[#262626]">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#C5A059]/15 text-[#C5A059] flex items-center justify-center border border-[#C5A059]/30">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                Inventory Updates & Recount Audit Log
              </h3>
              <p className="text-xs text-[#888888]">
                Complete chronological history of AI vision bottle counts, cycle recounts, deliveries, and adjustments
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={loadHistory}
            className="p-2.5 rounded-xl bg-[#1F1F1F] hover:bg-[#282828] text-[#888888] hover:text-white border border-[#333333] transition-colors cursor-pointer"
            title="Refresh History"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={onOpenAiCounter}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#C5A059] to-[#D4AF37] hover:from-[#D4AF37] hover:to-[#C5A059] text-black font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shadow-lg transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Launch AI Visual Shelf Counter</span>
          </button>
        </div>
      </div>

      {/* Metrics Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-4">
          <span className="text-[10px] uppercase font-bold text-[#888888] tracking-wider block">
            Total Updates Recorded
          </span>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-2xl font-black text-white font-mono">{totalAdjustments}</span>
            <span className="text-xs text-[#666666]">ledger adjustments</span>
          </div>
        </div>

        <div className="bg-[#141414] border border-[#262626] rounded-xl p-4">
          <span className="text-[10px] uppercase font-bold text-[#888888] tracking-wider block">
            AI Vision Recounts
          </span>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-2xl font-black text-[#C5A059] font-mono">{aiAdjustmentsCount}</span>
            <span className="text-xs text-[#888888]">camera audited sessions</span>
          </div>
        </div>

        <div className="bg-[#141414] border border-[#262626] rounded-xl p-4">
          <span className="text-[10px] uppercase font-bold text-[#888888] tracking-wider block">
            Net Units Adjusted
          </span>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-2xl font-black text-emerald-400 font-mono">
              {netUnitsAdjusted > 0 ? `+${netUnitsAdjusted}` : netUnitsAdjusted}
            </span>
            <span className="text-xs text-[#666666]">physical count delta</span>
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#141414] p-3 rounded-xl border border-[#262626]">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#666666] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by product, SKU, cashier, or shelf..."
            className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-[#666666] focus:border-[#C5A059] outline-none"
          />
        </div>

        <div className="flex items-center space-x-2 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-[11px] font-bold text-[#777777] uppercase shrink-0">Filter:</span>
          {[
            { id: 'all', label: 'All' },
            { id: 'ai', label: 'AI Recounts' },
            { id: 'receive', label: 'Inbound Shipments' },
            { id: 'damaged', label: 'Damage / Loss' },
            { id: 'manual', label: 'Manual' },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTypeFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                typeFilter === tab.id
                  ? 'bg-[#C5A059] text-black'
                  : 'bg-[#1C1C1C] text-[#888888] hover:text-white hover:bg-[#252525]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* History Table */}
      <div className="bg-[#141414] border border-[#262626] rounded-2xl overflow-hidden shadow-lg">
        {isLoading ? (
          <div className="py-16 text-center space-y-3">
            <RefreshCw className="w-6 h-6 text-[#C5A059] animate-spin mx-auto" />
            <p className="text-xs text-[#888888]">Loading inventory history logs...</p>
          </div>
        ) : filteredAdjustments.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Package className="w-10 h-10 text-[#444444] mx-auto" />
            <p className="text-sm font-bold text-white">No inventory updates found</p>
            <p className="text-xs text-[#777777]">
              {searchQuery ? 'Try adjusting your search query' : 'Use the AI Shelf Counter to record your first recount!'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#181818] text-[#888888] uppercase tracking-wider text-[10px] border-b border-[#262626]">
                <tr>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Product Name & SKU</th>
                  <th className="py-3 px-3">Update Type</th>
                  <th className="py-3 px-3 text-center">Previous</th>
                  <th className="py-3 px-3 text-center">New Count</th>
                  <th className="py-3 px-3 text-center">Net Delta</th>
                  <th className="py-3 px-4">Reason / Shelf Location</th>
                  <th className="py-3 px-4">Audited By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#202020]">
                {filteredAdjustments.map((adj) => {
                  const isPositive = (adj.changeAmount || 0) > 0;
                  const isZero = (adj.changeAmount || 0) === 0;

                  return (
                    <tr key={adj.id} className="hover:bg-[#1A1A1A] transition-colors">
                      <td className="py-3.5 px-4 text-[#888888] whitespace-nowrap font-mono text-[11px]">
                        {new Date(adj.createdAt).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white">{adj.productName}</div>
                        <div className="text-[10px] text-[#777777] font-mono">{adj.sku}</div>
                      </td>

                      <td className="py-3.5 px-3 whitespace-nowrap">
                        {getTypeBadge(adj)}
                      </td>

                      <td className="py-3.5 px-3 text-center font-mono text-[#888888]">
                        {adj.oldQuantity}
                      </td>

                      <td className="py-3.5 px-3 text-center font-mono font-bold text-white">
                        {adj.newQuantity}
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded font-mono font-bold text-xs ${
                            isZero
                              ? 'bg-neutral-800 text-neutral-400'
                              : isPositive
                              ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                              : 'bg-rose-950/60 text-rose-400 border border-rose-800/40'
                          }`}
                        >
                          {isPositive ? `+${adj.changeAmount}` : adj.changeAmount}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="text-white text-xs">{adj.reason}</div>
                        {adj.shelfLocation && (
                          <div className="text-[10px] text-[#C5A059] font-medium mt-0.5">
                            📍 {adj.shelfLocation}
                          </div>
                        )}
                        {adj.notes && (
                          <div className="text-[10px] text-[#777777] mt-0.5 italic">
                            {adj.notes}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="text-xs text-[#AAAAAA]">{adj.userName || 'System'}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
