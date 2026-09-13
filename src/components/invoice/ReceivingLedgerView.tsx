import React, { useState, useEffect } from 'react';
import { InventoryReceivingTransaction } from '../../types';
import { api } from '../../utils/api';
import {
  Layers,
  Search,
  MapPin,
  Calendar,
  DollarSign,
  UserCheck,
  CheckCircle2,
  FileText,
  Filter,
} from 'lucide-react';

export const ReceivingLedgerView: React.FC = () => {
  const [transactions, setTransactions] = useState<InventoryReceivingTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('all');

  useEffect(() => {
    const loadTransactions = async () => {
      setLoading(true);
      try {
        const list = await api.getReceivingHistory();
        setTransactions(list);
      } catch (err) {
        console.error('Failed to load receiving history', err);
      } finally {
        setLoading(false);
      }
    };
    loadTransactions();
  }, []);

  const filtered = transactions.filter(t => {
    const matchesSearch =
      !searchTerm ||
      t.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.invoiceNumber && t.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      t.receivedByUserName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesLoc =
      locationFilter === 'all' ||
      (t.location && t.location.toLowerCase() === locationFilter.toLowerCase());

    return matchesSearch && matchesLoc;
  });

  const totalUnitsReceived = filtered.reduce((s, t) => s + t.quantityReceived, 0);
  const totalCostReceived = filtered.reduce((s, t) => s + t.totalCost, 0);

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#141414] p-4 rounded-xl border border-[#262626]">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-[#C5A059]/20 text-[#C5A059] flex items-center justify-center border border-[#C5A059]/30">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Stock Receiving Ledger (IN-SC-15)
            </h2>
            <p className="text-xs text-[#888888]">
              Audit trail of every unit received from scanned distributor invoices
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <div className="bg-[#1A1A1A] px-3 py-1.5 rounded-lg border border-[#262626] font-mono">
            <span className="text-[#888888]">Received: </span>
            <span className="text-[#C5A059] font-bold">{totalUnitsReceived} units</span>
          </div>
          <div className="bg-[#1A1A1A] px-3 py-1.5 rounded-lg border border-[#262626] font-mono">
            <span className="text-[#888888]">Cost: </span>
            <span className="text-white font-bold">${totalCostReceived.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative grow">
          <Search className="w-4 h-4 text-[#888888] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by product name, SKU, invoice #, or clerk..."
            className="w-full bg-[#141414] border border-[#262626] rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-[#666666] focus:outline-hidden focus:border-[#C5A059]"
          />
        </div>

        <select
          value={locationFilter}
          onChange={e => setLocationFilter(e.target.value)}
          className="bg-[#141414] border border-[#262626] rounded-xl px-3 py-2 text-xs text-[#CCCCCC] focus:outline-hidden focus:border-[#C5A059]"
        >
          <option value="all">All Locations</option>
          <option value="Main Liquor Storage">Main Liquor Storage</option>
          <option value="Front Sales Floor">Front Sales Floor</option>
          <option value="Backroom Wine Vault">Backroom Wine Vault</option>
          <option value="Cold Beer Walk-in">Cold Beer Walk-in</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-[#141414] border border-[#262626] rounded-xl overflow-x-auto">
        <table className="w-full text-left text-xs text-[#CCCCCC] divide-y divide-[#262626]">
          <thead className="bg-[#1A1A1A] text-[#888888] font-bold uppercase tracking-wider text-[10px]">
            <tr>
              <th className="px-4 py-3">Timestamp</th>
              <th className="px-4 py-3">Product / SKU</th>
              <th className="px-4 py-3">Invoice #</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3 text-center">Qty Received</th>
              <th className="px-4 py-3 text-right">Unit Cost</th>
              <th className="px-4 py-3 text-right">Total Cost</th>
              <th className="px-4 py-3">Received By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1F1F1F]">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-xs text-[#888888]">
                  Loading receiving transactions...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-xs text-[#666666]">
                  No receiving transactions found.
                </td>
              </tr>
            ) : (
              filtered.map(t => (
                <tr key={t.id} className="hover:bg-[#1A1A1A]/80 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap text-[11px] font-mono text-[#888888]">
                    {new Date(t.createdAt).toLocaleDateString()}{' '}
                    {new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-white truncate max-w-[200px]">
                      {t.productName}
                    </div>
                    <div className="text-[11px] text-[#777777] font-mono">SKU: {t.sku}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-white whitespace-nowrap">
                    {t.invoiceNumber ? `#${t.invoiceNumber}` : 'Manual PO'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="flex items-center space-x-1 text-[#C5A059] text-[11px]">
                      <MapPin className="w-3 h-3" />
                      <span>{t.location || 'Main Storage'}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center font-mono font-bold text-green-400 whitespace-nowrap">
                    +{t.quantityReceived}
                  </td>
                  <td className="px-4 py-3 text-right font-mono whitespace-nowrap">
                    ${t.unitCost.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-white whitespace-nowrap">
                    ${t.totalCost.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-[11px] text-[#AAAAAA]">
                    {t.receivedByUserName}
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
