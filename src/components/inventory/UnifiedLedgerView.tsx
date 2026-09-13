import React, { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { Layers, ShieldCheck, RefreshCw, Filter, ArrowUpRight, ArrowDownLeft, AlertCircle, ShoppingCart, Globe, Smartphone, Store } from 'lucide-react';

export const UnifiedLedgerView: React.FC = () => {
  const [ledger, setLedger] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [reasonFilter, setReasonFilter] = useState<string>('all');

  const loadLedger = async () => {
    setLoading(true);
    try {
      const res = await api.getInventoryLedger({
        channel: channelFilter !== 'all' ? channelFilter : undefined,
        reason: reasonFilter !== 'all' ? reasonFilter : undefined,
        limit: 150,
      });
      setLedger(res.ledger || []);
    } catch (err) {
      console.error('Failed to load ledger', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLedger();
  }, [channelFilter, reasonFilter]);

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'pos':
        return <Store className="w-3.5 h-3.5 text-amber-400" />;
      case 'web':
        return <Globe className="w-3.5 h-3.5 text-blue-400" />;
      case 'mobile_queue':
        return <Smartphone className="w-3.5 h-3.5 text-purple-400" />;
      default:
        return <ShoppingCart className="w-3.5 h-3.5 text-zinc-400" />;
    }
  };

  const getMovementBadge = (qty: number, reason: string) => {
    const isPositive = qty > 0;
    return (
      <span
        className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded font-mono font-bold text-xs ${
          isPositive
            ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/40'
            : 'bg-red-950/60 text-red-300 border border-red-800/40'
        }`}
      >
        {isPositive ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
        <span>{isPositive ? `+${qty}` : qty}</span>
      </span>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0A0A0A] overflow-hidden text-[#E5E5E5] p-6 space-y-5">
      {/* Header with audit badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#262626] pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="font-serif italic font-bold text-xl text-[#F5F5F5]">
              Unified Inventory Ledger
            </h2>
            <span className="flex items-center space-x-1 text-[11px] bg-[#C5A059]/10 text-[#C5A059] border border-[#C5A059]/30 px-2 py-0.5 rounded-full font-medium">
              <ShieldCheck className="w-3 h-3" />
              <span>US-004: Immutable Audit Trail</span>
            </span>
          </div>
          <p className="text-xs text-[#888888] mt-1 max-w-2xl">
            Single central ledger for POS registers, online web orders, mobile queue-busting carts, vendor receiving, and physical recounts. Entries are permanent and cannot be modified or deleted.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={loadLedger}
            disabled={loading}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#161616] hover:bg-[#202020] border border-[#262626] text-xs font-bold uppercase tracking-wider text-[#A3A3A3] hover:text-[#F5F5F5] transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Ledger</span>
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 bg-[#111111] p-3 rounded-xl border border-[#222222]">
        <div className="flex items-center space-x-2 text-xs text-[#888888]">
          <Filter className="w-3.5 h-3.5 text-[#C5A059]" />
          <span>Filter Channel:</span>
        </div>
        <div className="flex items-center space-x-1.5">
          {['all', 'pos', 'web', 'mobile_queue', 'backoffice'].map(ch => (
            <button
              key={ch}
              onClick={() => setChannelFilter(ch)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                channelFilter === ch
                  ? 'bg-[#C5A059] text-black font-bold'
                  : 'bg-[#181818] text-[#888888] hover:text-white border border-[#262626]'
              }`}
            >
              {ch.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="h-4 w-px bg-[#262626] mx-2 hidden sm:block" />

        <div className="flex items-center space-x-2 text-xs text-[#888888]">
          <span>Reason:</span>
          <select
            value={reasonFilter}
            onChange={e => setReasonFilter(e.target.value)}
            className="bg-[#181818] border border-[#262626] rounded-lg px-2 py-1 text-xs text-[#E5E5E5] focus:outline-hidden"
          >
            <option value="all">All Reasons</option>
            <option value="pos_sale">POS Sales</option>
            <option value="web_order_fulfill">Web Order Fulfillment</option>
            <option value="vendor_receive">Vendor Receiving</option>
            <option value="physical_recount">Physical Shelf Recount</option>
            <option value="web_order_cancel_release">Cancel Restores</option>
            <option value="manual_adjustment">Manual Corrections</option>
          </select>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="flex-1 overflow-auto rounded-xl border border-[#262626] bg-[#0E0E0E]">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#141414] border-b border-[#262626] text-[#737373] uppercase tracking-wider font-semibold sticky top-0 z-10">
              <th className="px-4 py-3">Timestamp / ID</th>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Channel</th>
              <th className="px-4 py-3 text-center">Delta</th>
              <th className="px-4 py-3 text-right">Balance After</th>
              <th className="px-4 py-3">Reason / Context</th>
              <th className="px-4 py-3">Reference / Order #</th>
              <th className="px-4 py-3">Author</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1D1D1D] font-sans">
            {loading ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-[#737373]">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#C5A059]" />
                  Loading immutable inventory ledger...
                </td>
              </tr>
            ) : ledger.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-[#737373]">
                  <AlertCircle className="w-6 h-6 mx-auto mb-2 text-[#888888]" />
                  No ledger entries match the selected filters.
                </td>
              </tr>
            ) : (
              ledger.map((entry: any) => (
                <tr key={entry.id} className="hover:bg-[#141414] transition-colors">
                  <td className="px-4 py-3 font-mono text-[11px] text-[#888888]">
                    <div>{new Date(entry.timestamp).toLocaleDateString()}</div>
                    <div className="text-[#555555]">{new Date(entry.timestamp).toLocaleTimeString()}</div>
                  </td>

                  <td className="px-4 py-3">
                    <div className="font-medium text-[#F5F5F5]">{entry.productName}</div>
                    <div className="font-mono text-[10px] text-[#666666]">SKU: {entry.sku}</div>
                  </td>

                  <td className="px-4 py-3">
                    <div className="inline-flex items-center space-x-1.5 bg-[#161616] px-2 py-0.5 rounded border border-[#262626] text-[11px]">
                      {getChannelIcon(entry.channel)}
                      <span className="capitalize">{entry.channel.replace('_', ' ')}</span>
                    </div>
                  </td>

                  <td className="px-4 py-3 text-center">
                    {getMovementBadge(entry.quantityChanged, entry.reason)}
                  </td>

                  <td className="px-4 py-3 text-right font-mono font-bold text-[#E5E5E5]">
                    {entry.quantityAfter} units
                  </td>

                  <td className="px-4 py-3">
                    <span className="inline-block bg-[#1a1a1a] text-[#C5A059] px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider mb-0.5">
                      {entry.reason.replace(/_/g, ' ')}
                    </span>
                    <div className="text-[11px] text-[#888888] truncate max-w-xs">{entry.notes}</div>
                  </td>

                  <td className="px-4 py-3 font-mono text-[11px] text-[#A3A3A3]">
                    {entry.referenceId || '—'}
                  </td>

                  <td className="px-4 py-3 text-[11px] text-[#888888]">
                    {entry.userName}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
