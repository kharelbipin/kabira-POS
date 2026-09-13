import React, { useState, useEffect } from 'react';
import { Vendor, VendorPurchaseStats } from '../../types';
import { api } from '../../utils/api';
import {
  Building2,
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  TrendingUp,
  FileText,
  Calendar,
  DollarSign,
  X,
  Edit2,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';

export const VendorDirectoryView: React.FC = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Vendor Stats / Profile Modal state (IN-SC-17)
  const [selectedVendorStats, setSelectedVendorStats] = useState<VendorPurchaseStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Add / Edit Vendor Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Partial<Vendor> | null>(null);

  const loadVendors = async () => {
    setLoading(true);
    try {
      const list = await api.getVendors(searchTerm);
      setVendors(list);
    } catch (err) {
      console.error('Failed to load vendors', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVendors();
  }, []);

  const handleOpenStats = async (vendor: Vendor) => {
    setStatsLoading(true);
    try {
      const stats = await api.getVendorStats(vendor.id);
      setSelectedVendorStats(stats);
    } catch (err) {
      console.error('Failed to get vendor stats', err);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleSaveVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVendor?.name) return;

    try {
      if (editingVendor.id) {
        await api.updateVendor(editingVendor.id, editingVendor);
      } else {
        await api.createVendor(editingVendor);
      }
      setIsEditModalOpen(false);
      setEditingVendor(null);
      loadVendors();
    } catch (err) {
      console.error('Failed to save vendor', err);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#141414] p-4 rounded-xl border border-[#262626]">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-[#C5A059]/20 text-[#C5A059] flex items-center justify-center border border-[#C5A059]/30">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Vendor Directory & Purchase History (IN-SC-17)
            </h2>
            <p className="text-xs text-[#888888]">
              Manage beverage distributors, purchase frequency, aliases, and contract pricing
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingVendor({
              name: '',
              accountNumber: '',
              phone: '',
              email: '',
              address: '',
              website: '',
              taxId: '',
              aliases: [],
            });
            setIsEditModalOpen(true);
          }}
          className="flex items-center space-x-2 px-4 py-2 bg-[#C5A059] hover:bg-[#D4AF37] text-black font-bold text-xs uppercase tracking-wider rounded-lg transition-colors shadow-md cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Distributor</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-[#888888] absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={e => {
            setSearchTerm(e.target.value);
            api.getVendors(e.target.value).then(setVendors);
          }}
          placeholder="Search by vendor name, account #, or aliases..."
          className="w-full bg-[#141414] border border-[#262626] rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-[#666666] focus:outline-hidden focus:border-[#C5A059]"
        />
      </div>

      {/* Vendor Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {vendors.map(vendor => (
          <div
            key={vendor.id}
            className="bg-[#141414] border border-[#262626] rounded-xl p-5 space-y-3 hover:border-[#C5A059]/40 transition-colors flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-sm text-white">{vendor.name}</h3>
                  {vendor.accountNumber && (
                    <div className="text-[11px] font-mono text-[#C5A059]">
                      Acct: #{vendor.accountNumber}
                    </div>
                  )}
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    vendor.source === 'Scan'
                      ? 'bg-purple-950/40 text-purple-400 border border-purple-800/40'
                      : 'bg-[#262626] text-[#888888]'
                  }`}
                >
                  {vendor.source === 'Scan' ? 'Auto-Extracted' : 'Manual'}
                </span>
              </div>

              {/* Contact info snippets */}
              <div className="text-xs text-[#888888] space-y-1 pt-1">
                {vendor.phone && (
                  <div className="flex items-center space-x-1.5">
                    <Phone className="w-3 h-3 text-[#666666]" />
                    <span>{vendor.phone}</span>
                  </div>
                )}
                {vendor.email && (
                  <div className="flex items-center space-x-1.5 truncate">
                    <Mail className="w-3 h-3 text-[#666666]" />
                    <span className="truncate">{vendor.email}</span>
                  </div>
                )}
                {vendor.address && (
                  <div className="flex items-center space-x-1.5 truncate">
                    <MapPin className="w-3 h-3 text-[#666666]" />
                    <span className="truncate">{vendor.address}</span>
                  </div>
                )}
              </div>

              {/* Aliases */}
              {vendor.aliases && vendor.aliases.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {vendor.aliases.map((alias, i) => (
                    <span
                      key={i}
                      className="px-1.5 py-0.5 rounded bg-[#1A1A1A] border border-[#333333] text-[10px] text-[#AAAAAA]"
                    >
                      {alias}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-[#262626] flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setEditingVendor(vendor);
                  setIsEditModalOpen(true);
                }}
                className="p-1 text-[#888888] hover:text-white rounded hover:bg-[#262626] cursor-pointer"
                title="Edit vendor"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => handleOpenStats(vendor)}
                className="flex items-center space-x-1 px-3 py-1.5 bg-[#1A1A1A] hover:bg-[#262626] border border-[#262626] text-xs font-semibold text-[#C5A059] rounded-lg transition-colors cursor-pointer"
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Purchase History (IN-SC-17)</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Vendor Stats & Analytics Modal (IN-SC-17) */}
      {selectedVendorStats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="bg-[#141414] border border-[#262626] rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#262626] bg-[#1A1A1A]">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  {selectedVendorStats.vendor.name} — Purchase History
                </h3>
                <p className="text-xs text-[#888888]">
                  Account #{selectedVendorStats.vendor.accountNumber || 'N/A'} • Frequency:{' '}
                  <span className="text-[#C5A059] font-bold">{selectedVendorStats.purchaseFrequency}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedVendorStats(null)}
                className="p-1.5 text-[#888888] hover:text-white rounded-lg hover:bg-[#262626] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              {/* Metric Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-[#1A1A1A] border border-[#262626] p-3 rounded-xl space-y-1">
                  <span className="text-[10px] text-[#888888] uppercase block">Total Purchases</span>
                  <span className="text-base font-bold font-mono text-[#C5A059]">
                    ${selectedVendorStats.totalPurchases.toFixed(2)}
                  </span>
                </div>

                <div className="bg-[#1A1A1A] border border-[#262626] p-3 rounded-xl space-y-1">
                  <span className="text-[10px] text-[#888888] uppercase block">Invoices Received</span>
                  <span className="text-base font-bold font-mono text-white">
                    {selectedVendorStats.totalInvoicesCount}
                  </span>
                </div>

                <div className="bg-[#1A1A1A] border border-[#262626] p-3 rounded-xl space-y-1">
                  <span className="text-[10px] text-[#888888] uppercase block">Unique Products</span>
                  <span className="text-base font-bold font-mono text-white">
                    {selectedVendorStats.productsPurchasedCount}
                  </span>
                </div>

                <div className="bg-[#1A1A1A] border border-[#262626] p-3 rounded-xl space-y-1">
                  <span className="text-[10px] text-[#888888] uppercase block">Last Purchase</span>
                  <span className="text-xs font-bold font-mono text-white">
                    {selectedVendorStats.lastPurchaseDate || 'N/A'}
                  </span>
                </div>
              </div>

              {/* Historical Invoices */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Associated Received Invoices
                </h4>
                {selectedVendorStats.invoices.length === 0 ? (
                  <p className="text-xs text-[#666666]">No confirmed invoices recorded for this vendor yet.</p>
                ) : (
                  <div className="border border-[#262626] rounded-xl overflow-hidden divide-y divide-[#1F1F1F]">
                    {selectedVendorStats.invoices.map(inv => (
                      <div key={inv.id} className="p-3 bg-[#1A1A1A] flex items-center justify-between text-xs">
                        <div className="space-y-0.5">
                          <div className="font-bold text-white font-mono">Invoice #{inv.invoiceNumber}</div>
                          <div className="text-[11px] text-[#888888]">
                            Date: {inv.invoiceDate} • {inv.lineItems.length} lines received
                          </div>
                        </div>
                        <div className="text-right font-mono font-bold text-[#C5A059]">
                          ${inv.totalAmount.toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-3 border-t border-[#262626] bg-[#1A1A1A] flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedVendorStats(null)}
                className="px-4 py-1.5 bg-[#262626] hover:bg-[#333333] text-xs text-white rounded-lg cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Vendor Modal */}
      {isEditModalOpen && editingVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="bg-[#141414] border border-[#262626] rounded-xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#262626] bg-[#1A1A1A]">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                {editingVendor.id ? 'Edit Vendor Profile' : 'Add New Beverage Distributor'}
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 text-[#888888] hover:text-white rounded-lg hover:bg-[#262626]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveVendor} className="p-6 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#AAAAAA] uppercase tracking-wider mb-1">
                  Vendor Name *
                </label>
                <input
                  type="text"
                  required
                  value={editingVendor.name || ''}
                  onChange={e => setEditingVendor({ ...editingVendor, name: e.target.value })}
                  placeholder="e.g. Southern Glazer's Wine & Spirits"
                  className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#C5A059]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#AAAAAA] uppercase tracking-wider mb-1">
                    Store Account #
                  </label>
                  <input
                    type="text"
                    value={editingVendor.accountNumber || ''}
                    onChange={e => setEditingVendor({ ...editingVendor, accountNumber: e.target.value })}
                    placeholder="e.g. SG-984210"
                    className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-hidden focus:border-[#C5A059]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#AAAAAA] uppercase tracking-wider mb-1">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={editingVendor.phone || ''}
                    onChange={e => setEditingVendor({ ...editingVendor, phone: e.target.value })}
                    placeholder="(800) 555-0199"
                    className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#C5A059]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#AAAAAA] uppercase tracking-wider mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={editingVendor.email || ''}
                  onChange={e => setEditingVendor({ ...editingVendor, email: e.target.value })}
                  placeholder="orders@southernglazers.com"
                  className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#C5A059]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#AAAAAA] uppercase tracking-wider mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={editingVendor.address || ''}
                  onChange={e => setEditingVendor({ ...editingVendor, address: e.target.value })}
                  placeholder="Dallas, TX"
                  className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#C5A059]"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-[#262626]">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-xs text-[#888888] hover:text-white rounded-lg hover:bg-[#262626]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#C5A059] hover:bg-[#D4AF37] text-black font-bold text-xs uppercase tracking-wider rounded-lg shadow-md cursor-pointer"
                >
                  Save Vendor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
