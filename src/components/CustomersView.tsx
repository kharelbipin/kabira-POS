import React, { useState, useMemo, useEffect } from 'react';
import { Customer, Order, LoyaltyTransaction } from '../types';
import { api } from '../utils/api';
import { playBeep } from '../utils/audio';
import {
  Search,
  UserPlus,
  Users,
  Phone,
  Mail,
  Award,
  Calendar,
  ShoppingBag,
  DollarSign,
  Edit2,
  CheckCircle2,
  X,
  ExternalLink,
  ArrowUpRight,
  ArrowDownLeft,
  Gift,
  Sliders,
  Sparkles,
  TrendingUp,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

interface CustomersViewProps {
  customers: Customer[];
  orders: Order[];
  onRefresh: () => void;
  onSelectForCart: (customer: Customer) => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  customers,
  orders,
  onRefresh,
  onSelectForCart,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [tierFilter, setTierFilter] = useState<string>('ALL');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showAddEditModal, setShowAddEditModal] = useState<boolean>(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Profile Pane Tab State
  const [activeTab, setActiveTab] = useState<'loyalty' | 'orders'>('loyalty');
  const [loyaltyHistory, setLoyaltyHistory] = useState<LoyaltyTransaction[]>([]);
  const [loyaltySummary, setLoyaltySummary] = useState<any>(null);
  const [isLoadingLoyalty, setIsLoadingLoyalty] = useState<boolean>(false);

  // Manual Points Adjustment Modal State
  const [showAdjustModal, setShowAdjustModal] = useState<boolean>(false);
  const [adjustPoints, setAdjustPoints] = useState<number>(50);
  const [adjustReason, setAdjustReason] = useState<string>('Customer Appreciation Bonus');
  const [isAdjusting, setIsAdjusting] = useState<boolean>(false);

  // Form State for Add/Edit
  const [formData, setFormData] = useState<Partial<Customer>>({
    name: '',
    phone: '',
    email: '',
    notes: '',
    loyaltyPoints: 0,
  });

  // Fetch loyalty history when selectedCustomer changes
  useEffect(() => {
    if (selectedCustomer) {
      setIsLoadingLoyalty(true);
      api.getCustomerLoyaltyHistory(selectedCustomer.id)
        .then(res => {
          setLoyaltyHistory(res.history || []);
          setLoyaltySummary(res.summary || null);
        })
        .catch(err => {
          console.error('Failed to load loyalty history', err);
          setLoyaltyHistory([]);
          setLoyaltySummary(null);
        })
        .finally(() => {
          setIsLoadingLoyalty(false);
        });
    } else {
      setLoyaltyHistory([]);
      setLoyaltySummary(null);
    }
  }, [selectedCustomer?.id]);

  const filteredCustomers = useMemo(() => {
    let result = customers;

    if (tierFilter !== 'ALL') {
      result = result.filter(c => (c.loyaltyTier || 'Bronze') === tierFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        c =>
          c.name.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          (c.email && c.email.toLowerCase().includes(q))
      );
    }

    return result;
  }, [customers, searchQuery, tierFilter]);

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setFormData({
      name: '',
      phone: '',
      email: '',
      notes: '',
      loyaltyPoints: 50,
    });
    setShowAddEditModal(true);
  };

  const handleOpenEdit = (c: Customer) => {
    setEditingCustomer(c);
    setFormData({ ...c });
    setShowAddEditModal(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCustomer) {
        const updated = await api.updateCustomer(editingCustomer.id, formData);
        if (selectedCustomer?.id === updated.id) {
          setSelectedCustomer(updated);
        }
      } else {
        const created = await api.createCustomer(formData);
        setSelectedCustomer(created);
      }
      playBeep('success');
      setShowAddEditModal(false);
      onRefresh();
    } catch (err: any) {
      playBeep('error');
      alert(err.message || 'Failed to save customer');
    }
  };

  const handleAdjustPointsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || adjustPoints === 0) return;
    setIsAdjusting(true);
    try {
      const res = await api.adjustCustomerLoyalty(
        selectedCustomer.id,
        adjustPoints,
        adjustReason.trim() || 'Staff Adjustment'
      );
      playBeep('success');
      setSelectedCustomer(res.customer);

      // Refresh loyalty ledger
      const histRes = await api.getCustomerLoyaltyHistory(selectedCustomer.id);
      setLoyaltyHistory(histRes.history || []);
      setLoyaltySummary(histRes.summary || null);

      setShowAdjustModal(false);
      setAdjustPoints(50);
      setAdjustReason('Customer Appreciation Bonus');
      onRefresh();
    } catch (err: any) {
      playBeep('error');
      alert(err.message || 'Failed to adjust points');
    } finally {
      setIsAdjusting(false);
    }
  };

  // Get past orders for selected customer
  const customerOrders = useMemo(() => {
    if (!selectedCustomer) return [];
    return orders.filter(
      o => o.customerId === selectedCustomer.id || o.customerPhone === selectedCustomer.phone
    );
  }, [orders, selectedCustomer]);

  const getTierBadgeStyle = (tier?: string) => {
    switch (tier) {
      case 'Platinum':
        return 'bg-indigo-950/70 text-indigo-300 border-indigo-700/50 shadow-indigo-900/20';
      case 'Gold':
        return 'bg-[#C5A059]/20 text-[#C5A059] border-[#C5A059]/40 shadow-amber-900/20';
      case 'Silver':
        return 'bg-slate-800 text-slate-200 border-slate-600 shadow-slate-900/20';
      case 'Bronze':
      default:
        return 'bg-amber-950/60 text-amber-500 border-amber-800/40';
    }
  };

  // Tier thresholds helper
  const getNextTierInfo = (currentPoints: number, currentTier?: string) => {
    if (currentTier === 'Platinum' || currentPoints >= 3000) {
      return { nextTier: null, pointsNeeded: 0, progress: 100 };
    }
    if (currentTier === 'Gold' || currentPoints >= 1500) {
      const needed = 3000 - currentPoints;
      const progress = Math.min(100, Math.round(((currentPoints - 1500) / 1500) * 100));
      return { nextTier: 'Platinum', pointsNeeded: needed, progress };
    }
    if (currentTier === 'Silver' || currentPoints >= 500) {
      const needed = 1500 - currentPoints;
      const progress = Math.min(100, Math.round(((currentPoints - 500) / 1000) * 100));
      return { nextTier: 'Gold', pointsNeeded: needed, progress };
    }
    const needed = 500 - currentPoints;
    const progress = Math.min(100, Math.round((currentPoints / 500) * 100));
    return { nextTier: 'Silver', pointsNeeded: Math.max(0, needed), progress };
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-84px)] overflow-hidden bg-[#0A0A0A] text-[#E5E5E5] select-none">
      {/* Search & Action Toolbar (CU-02) */}
      <div className="p-4 bg-[#0D0D0D] border-b border-[#262626] flex flex-wrap gap-3 items-center justify-between shrink-0">
        <div className="flex items-center space-x-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#737373] absolute left-3 top-2.5" />
            <input
              id="customer-search-input"
              type="text"
              placeholder="Search by customer name, phone number, email... (CU-02)"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-[#141414] border border-[#262626] rounded-lg pl-9 pr-3 py-2 text-xs text-[#E5E5E5] placeholder:text-[#666666] focus:outline-hidden focus:border-[#C5A059]"
            />
          </div>

          {/* Tier Filter Pills */}
          <div className="hidden lg:flex items-center space-x-1 bg-[#141414] p-1 rounded-lg border border-[#262626] text-xs">
            {['ALL', 'Bronze', 'Silver', 'Gold', 'Platinum'].map(t => (
              <button
                key={t}
                onClick={() => setTierFilter(t)}
                className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                  tierFilter === t
                    ? 'bg-[#C5A059] text-black shadow-xs'
                    : 'text-[#888888] hover:text-[#E5E5E5]'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <button
          id="customer-add-btn"
          onClick={handleOpenAdd}
          className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-[#C5A059] hover:bg-[#D4B06A] text-black text-xs font-bold uppercase tracking-wider transition-all shadow-md cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>New Customer Profile</span>
        </button>
      </div>

      {/* Main Grid / Split layout */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Customer Directory Table */}
        <div className="flex-1 overflow-y-auto p-4 border-r border-[#262626]">
          <div className="bg-[#0F0F0F] border border-[#262626] rounded-xl overflow-hidden shadow-md">
            <table className="w-full text-left text-xs text-[#D4D4D4]">
              <thead className="bg-[#0A0A0A] text-[#737373] uppercase text-[10px] tracking-widest border-b border-[#262626] font-bold">
                <tr>
                  <th className="px-4 py-3.5">Customer Name</th>
                  <th className="px-4 py-3.5">Contact</th>
                  <th className="px-4 py-3.5 text-center">Loyalty Tier</th>
                  <th className="px-4 py-3.5 text-right">Points Balance</th>
                  <th className="px-4 py-3.5 text-right">Total Spent</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F1F1F]">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-[#737373]">
                      No customers found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map(c => {
                    const discountValue = ((c.loyaltyPoints || 0) / 20).toFixed(2);
                    return (
                      <tr
                        key={c.id}
                        onClick={() => setSelectedCustomer(c)}
                        className={`hover:bg-[#161616] transition-colors cursor-pointer ${
                          selectedCustomer?.id === c.id ? 'bg-[#1A1A1A]' : ''
                        }`}
                      >
                        <td className="px-4 py-3 font-medium text-[#F5F5F5] font-sans">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-7 h-7 rounded-full bg-[#C5A059]/15 text-[#C5A059] border border-[#C5A059]/30 flex items-center justify-center font-bold text-xs font-serif">
                              {c.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-semibold text-[#F5F5F5]">{c.name}</div>
                              {c.notes && (
                                <div className="text-[10px] text-[#737373] font-normal truncate max-w-[150px]">
                                  {c.notes}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3 font-mono text-[11px] text-[#A3A3A3] space-y-0.5">
                          <div className="flex items-center space-x-1.5">
                            <Phone className="w-3 h-3 text-[#737373]" />
                            <span>{c.phone}</span>
                          </div>
                          {c.email && (
                            <div className="flex items-center space-x-1.5 text-[#737373]">
                              <Mail className="w-3 h-3" />
                              <span className="truncate max-w-[130px]">{c.email}</span>
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${getTierBadgeStyle(
                              c.loyaltyTier
                            )}`}
                          >
                            {c.loyaltyTier || 'Bronze'}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-right font-mono">
                          <div className="font-bold text-[#C5A059] text-sm">
                            {c.loyaltyPoints.toLocaleString()} pts
                          </div>
                          <div className="text-[10px] text-[#737373]">
                            ≈ ${discountValue} discount
                          </div>
                        </td>

                        <td className="px-4 py-3 text-right font-mono text-[#F5F5F5]">
                          ${c.totalSpent.toFixed(2)}
                        </td>

                        <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              id={`customer-cart-attach-${c.id}`}
                              onClick={() => onSelectForCart(c)}
                              className="px-2.5 py-1 rounded bg-[#C5A059]/15 hover:bg-[#C5A059]/25 text-[#C5A059] border border-[#C5A059]/30 text-[11px] font-bold uppercase tracking-wider cursor-pointer transition-colors"
                              title="Attach customer to current POS sale"
                            >
                              + Attach
                            </button>
                            <button
                              onClick={() => handleOpenEdit(c)}
                              className="p-1.5 text-[#737373] hover:text-white rounded hover:bg-[#1A1A1A] transition-colors"
                              title="Edit Customer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Customer Profile Pane (CU-03 & Loyalty Hub) */}
        {selectedCustomer ? (
          <div className="w-full md:w-80 lg:w-96 bg-[#0D0D0D] border-l border-[#262626] p-5 overflow-y-auto flex flex-col space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-serif italic font-bold text-lg text-[#F5F5F5]">
                    {selectedCustomer.name}
                  </h3>
                  <span
                    className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${getTierBadgeStyle(
                      selectedCustomer.loyaltyTier
                    )}`}
                  >
                    {selectedCustomer.loyaltyTier || 'Bronze'}
                  </span>
                </div>
                <p className="text-xs text-[#737373] font-mono mt-0.5">{selectedCustomer.phone}</p>
                {selectedCustomer.email && (
                  <p className="text-xs text-[#737373] mt-0.5">{selectedCustomer.email}</p>
                )}
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="text-[#737373] hover:text-white md:hidden transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Loyalty Rewards Hero Card */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-[#1E1910] via-[#14120C] to-[#0D0D0D] border border-[#C5A059]/40 shadow-lg space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-[#C5A059] uppercase tracking-wider">
                  <Award className="w-4 h-4 text-[#C5A059]" />
                  <span>Loyalty Rewards Balance</span>
                </div>
                <button
                  onClick={() => setShowAdjustModal(true)}
                  className="px-2 py-0.5 rounded bg-[#C5A059]/20 hover:bg-[#C5A059]/30 text-[#C5A059] border border-[#C5A059]/30 text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                  title="Adjust or award points manually"
                >
                  Adjust Points
                </button>
              </div>

              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-2xl font-extrabold font-mono text-[#F5F5F5]">
                    {selectedCustomer.loyaltyPoints.toLocaleString()} <span className="text-sm font-sans text-[#C5A059]">pts</span>
                  </div>
                  <div className="text-xs text-[#A3A3A3] mt-0.5 font-mono">
                    Redemption Value: <span className="text-emerald-400 font-bold">${((selectedCustomer.loyaltyPoints || 0) / 20).toFixed(2)}</span>
                  </div>
                </div>

                <div className="text-right text-[11px] text-[#737373]">
                  <div>Rate: 20 pts = $1.00</div>
                  <div className="text-amber-300 font-mono">Min 50 pts to redeem</div>
                </div>
              </div>

              {/* Tier Progress Bar */}
              {(() => {
                const nextInfo = getNextTierInfo(selectedCustomer.loyaltyPoints, selectedCustomer.loyaltyTier);
                return (
                  <div className="pt-2 border-t border-[#C5A059]/20">
                    <div className="flex justify-between text-[10px] text-[#A3A3A3] mb-1 font-mono">
                      <span>{selectedCustomer.loyaltyTier || 'Bronze'} Member</span>
                      {nextInfo.nextTier ? (
                        <span className="text-[#C5A059]">
                          {nextInfo.pointsNeeded} pts to {nextInfo.nextTier}
                        </span>
                      ) : (
                        <span className="text-indigo-300 font-bold flex items-center space-x-1">
                          <Sparkles className="w-3 h-3 inline" />
                          <span>Top Tier Reached</span>
                        </span>
                      )}
                    </div>
                    <div className="w-full h-1.5 bg-[#262626] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#C5A059] to-amber-300 transition-all duration-300"
                        style={{ width: `${nextInfo.progress}%` }}
                      />
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Quick Lifetime Spend Metric */}
            <div className="bg-[#141414] p-3 rounded-xl border border-[#262626] flex items-center justify-between">
              <div>
                <div className="text-[10px] text-[#737373] uppercase font-bold tracking-wider">Lifetime Spend</div>
                <div className="text-base font-bold text-[#F5F5F5] font-mono mt-0.5">
                  ${selectedCustomer.totalSpent.toFixed(2)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-[#737373] uppercase font-bold tracking-wider">Completed Orders</div>
                <div className="text-base font-bold text-[#C5A059] font-mono mt-0.5">
                  {selectedCustomer.orderCount || customerOrders.length}
                </div>
              </div>
            </div>

            {selectedCustomer.notes && (
              <div className="bg-[#141414] p-3 rounded-xl border border-[#262626] text-xs">
                <div className="text-[10px] text-[#737373] uppercase font-bold tracking-wider mb-1">Customer Notes</div>
                <p className="text-[#D4D4D4] italic">{selectedCustomer.notes}</p>
              </div>
            )}

            {/* Attach to Register Action */}
            <button
              id="profile-attach-cart-btn"
              onClick={() => onSelectForCart(selectedCustomer)}
              className="w-full py-2.5 rounded-xl bg-[#C5A059] hover:bg-[#D4B06A] text-black font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-1.5 transition-colors cursor-pointer shadow-md"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Attach {selectedCustomer.name} to Sale</span>
            </button>

            {/* Sub Tabs: Loyalty Ledger vs Order History */}
            <div className="flex border-b border-[#262626] text-xs pt-2">
              <button
                onClick={() => setActiveTab('loyalty')}
                className={`flex-1 pb-2 font-bold uppercase tracking-wider border-b-2 transition-colors cursor-pointer text-center ${
                  activeTab === 'loyalty'
                    ? 'border-[#C5A059] text-[#C5A059]'
                    : 'border-transparent text-[#737373] hover:text-[#E5E5E5]'
                }`}
              >
                Points Ledger ({loyaltyHistory.length})
              </button>
              <button
                onClick={() => setActiveTab('orders')}
                className={`flex-1 pb-2 font-bold uppercase tracking-wider border-b-2 transition-colors cursor-pointer text-center ${
                  activeTab === 'orders'
                    ? 'border-[#C5A059] text-[#C5A059]'
                    : 'border-transparent text-[#737373] hover:text-[#E5E5E5]'
                }`}
              >
                Past Orders ({customerOrders.length})
              </button>
            </div>

            {/* Tab 1: Loyalty Ledger History */}
            {activeTab === 'loyalty' && (
              <div className="flex-1">
                {isLoadingLoyalty ? (
                  <div className="py-8 text-center text-xs text-[#737373] flex flex-col items-center justify-center space-y-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-[#C5A059]" />
                    <span>Loading points history...</span>
                  </div>
                ) : loyaltyHistory.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[#737373] italic">
                    No points transactions recorded yet. Points will be awarded when checkout completes.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {loyaltyHistory.map(tx => {
                      const isEarned = tx.type === 'earned' || tx.type === 'bonus';
                      const isRedeemed = tx.type === 'redeemed' || tx.type === 'refund_reversal';
                      return (
                        <div
                          key={tx.id}
                          className="bg-[#141414] p-2.5 rounded-lg border border-[#262626] text-xs flex items-center justify-between"
                        >
                          <div className="flex items-center space-x-2.5">
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center ${
                                tx.type === 'earned'
                                  ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                                  : tx.type === 'redeemed'
                                  ? 'bg-amber-950/60 text-amber-400 border border-amber-800/40'
                                  : tx.type === 'bonus'
                                  ? 'bg-purple-950/60 text-purple-400 border border-purple-800/40'
                                  : 'bg-blue-950/60 text-blue-400 border border-blue-800/40'
                              }`}
                            >
                              {tx.type === 'earned' && <ArrowUpRight className="w-3.5 h-3.5" />}
                              {tx.type === 'redeemed' && <ArrowDownLeft className="w-3.5 h-3.5" />}
                              {tx.type === 'bonus' && <Gift className="w-3.5 h-3.5" />}
                              {tx.type === 'adjustment' && <Sliders className="w-3.5 h-3.5" />}
                              {tx.type === 'refund_reversal' && <RefreshCw className="w-3.5 h-3.5" />}
                            </div>

                            <div>
                              <div className="font-semibold text-[#E5E5E5] text-[11px]">
                                {tx.reason || (tx.type === 'earned' ? 'Purchase Reward' : 'Points Redemption')}
                              </div>
                              <div className="text-[10px] text-[#737373] mt-0.5">
                                {new Date(tx.createdAt).toLocaleString([], {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                                {tx.orderNumber && ` • #${tx.orderNumber}`}
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <div
                              className={`font-mono font-bold text-xs ${
                                tx.points >= 0 ? 'text-emerald-400' : 'text-amber-400'
                              }`}
                            >
                              {tx.points >= 0 ? `+${tx.points}` : tx.points} pts
                            </div>
                            {tx.balanceAfter !== undefined && (
                              <div className="text-[10px] text-[#737373] font-mono">
                                Bal: {tx.balanceAfter}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Order History */}
            {activeTab === 'orders' && (
              <div className="flex-1">
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {customerOrders.length === 0 ? (
                    <p className="text-xs text-[#737373] italic py-6 text-center">
                      No past transactions recorded yet.
                    </p>
                  ) : (
                    customerOrders.map(o => (
                      <div
                        key={o.id}
                        className="bg-[#141414] p-2.5 rounded-lg border border-[#262626] text-xs"
                      >
                        <div className="flex justify-between font-mono font-bold text-[#F5F5F5]">
                          <span className="text-[#C5A059]">{o.orderNumber}</span>
                          <span>${o.grandTotal.toFixed(2)}</span>
                        </div>
                        <div className="text-[10px] text-[#737373] mt-1 flex justify-between items-center">
                          <span>{new Date(o.createdAt).toLocaleDateString()}</span>
                          <span className="uppercase tracking-wider font-semibold">{o.payment.method}</span>
                        </div>
                        {(o.pointsEarned || o.pointsRedeemed) && (
                          <div className="text-[10px] text-[#C5A059] font-mono mt-1 pt-1 border-t border-[#262626] flex justify-between">
                            {o.pointsEarned ? <span>+{o.pointsEarned} pts earned</span> : <span />}
                            {o.pointsRedeemed ? <span className="text-amber-400">-{o.pointsRedeemed} pts used (-${o.pointsDiscountAmount?.toFixed(2)})</span> : <span />}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="hidden md:flex w-80 lg:w-96 bg-[#0D0D0D] border-l border-[#262626] p-8 flex-col items-center justify-center text-center text-[#737373]">
            <Users className="w-10 h-10 text-[#404040] mb-2" />
            <p className="text-xs font-serif italic text-[#A3A3A3] mb-1">Customer Rewards Profile</p>
            <p className="text-xs">Select any customer row to inspect loyalty ledger, tier status, and past receipts.</p>
          </div>
        )}
      </div>

      {/* Points Manual Adjustment Modal */}
      {showAdjustModal && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 select-none">
          <div className="bg-[#0F0F0F] border border-[#262626] rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden text-[#E5E5E5] p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-[#262626] pb-3">
              <div className="flex items-center space-x-2">
                <Sliders className="w-4 h-4 text-[#C5A059]" />
                <h3 className="font-serif italic font-bold text-base text-[#F5F5F5]">
                  Adjust Loyalty Points
                </h3>
              </div>
              <button
                onClick={() => setShowAdjustModal(false)}
                className="text-[#737373] hover:text-white cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-[#141414] p-3 rounded-lg border border-[#262626] text-xs">
              <div className="text-[#888888]">Customer:</div>
              <div className="font-bold text-sm text-[#F5F5F5]">{selectedCustomer.name}</div>
              <div className="text-[#C5A059] font-mono mt-0.5">
                Current Balance: {selectedCustomer.loyaltyPoints} pts (${((selectedCustomer.loyaltyPoints || 0) / 20).toFixed(2)})
              </div>
            </div>

            <form onSubmit={handleAdjustPointsSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#A3A3A3] font-bold uppercase tracking-wider mb-1">
                  Point Change (+ to add, - to deduct)
                </label>
                <input
                  type="number"
                  required
                  value={adjustPoints}
                  onChange={e => setAdjustPoints(parseInt(e.target.value, 10) || 0)}
                  className="w-full bg-[#141414] border border-[#262626] rounded-lg p-2.5 text-[#E5E5E5] font-mono text-base focus:outline-hidden focus:border-[#C5A059]"
                />
              </div>

              {/* Quick Preset Buttons */}
              <div className="grid grid-cols-4 gap-1.5">
                {[25, 50, 100, 250].map(amt => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setAdjustPoints(amt)}
                    className="py-1.5 rounded bg-[#1A1A1A] hover:bg-[#262626] text-[#C5A059] text-[11px] font-mono font-bold border border-[#262626] cursor-pointer"
                  >
                    +{amt}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-[#A3A3A3] font-bold uppercase tracking-wider mb-1">
                  Reason for Adjustment *
                </label>
                <input
                  type="text"
                  required
                  value={adjustReason}
                  onChange={e => setAdjustReason(e.target.value)}
                  placeholder="e.g. VIP promotion bonus, courtesy adjustment"
                  className="w-full bg-[#141414] border border-[#262626] rounded-lg p-2 text-[#E5E5E5] focus:outline-hidden focus:border-[#C5A059]"
                />
              </div>

              {/* Result Preview */}
              <div className="p-2.5 rounded-lg bg-[#19160E] border border-[#C5A059]/30 text-xs flex justify-between items-center text-[#C5A059]">
                <span>New Balance Preview:</span>
                <span className="font-mono font-bold">
                  {Math.max(0, (selectedCustomer.loyaltyPoints || 0) + adjustPoints)} pts
                </span>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-[#262626]">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider text-[#737373] hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdjusting || adjustPoints === 0}
                  className="px-4 py-1.5 rounded-lg bg-[#C5A059] hover:bg-[#D4B06A] text-black font-bold uppercase tracking-wider text-xs transition-colors cursor-pointer shadow-md disabled:opacity-40"
                >
                  {isAdjusting ? 'Saving...' : 'Apply Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Customer Modal (CU-01) */}
      {showAddEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 select-none">
          <div className="bg-[#0F0F0F] border border-[#262626] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden text-[#E5E5E5] p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-[#262626] pb-3">
              <h3 className="font-serif italic font-bold text-lg text-[#F5F5F5]">
                {editingCustomer ? 'Edit Customer Profile' : 'New Customer Profile'}
              </h3>
              <button
                onClick={() => setShowAddEditModal(false)}
                className="text-[#737373] hover:text-white cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#A3A3A3] font-bold uppercase tracking-wider mb-1.5">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Eleanor Vance"
                  className="w-full bg-[#141414] border border-[#262626] rounded-lg p-2 text-[#E5E5E5] focus:outline-hidden focus:border-[#C5A059]"
                />
              </div>

              <div>
                <label className="block text-[#A3A3A3] font-bold uppercase tracking-wider mb-1.5">Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={formData.phone || ''}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="e.g. 555-0199"
                  className="w-full bg-[#141414] border border-[#262626] rounded-lg p-2 text-[#E5E5E5] font-mono focus:outline-hidden focus:border-[#C5A059]"
                />
              </div>

              <div>
                <label className="block text-[#A3A3A3] font-bold uppercase tracking-wider mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder="e.g. eleanor@example.com"
                  className="w-full bg-[#141414] border border-[#262626] rounded-lg p-2 text-[#E5E5E5] focus:outline-hidden focus:border-[#C5A059]"
                />
              </div>

              <div>
                <label className="block text-[#A3A3A3] font-bold uppercase tracking-wider mb-1.5">Starting Loyalty Points</label>
                <input
                  type="number"
                  value={formData.loyaltyPoints ?? 0}
                  onChange={e => setFormData({ ...formData, loyaltyPoints: parseInt(e.target.value, 10) || 0 })}
                  className="w-full bg-[#141414] border border-[#262626] rounded-lg p-2 text-[#E5E5E5] font-mono focus:outline-hidden focus:border-[#C5A059]"
                />
              </div>

              <div>
                <label className="block text-[#A3A3A3] font-bold uppercase tracking-wider mb-1.5">Preferences & Sommelier Notes</label>
                <textarea
                  rows={2}
                  value={formData.notes || ''}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Prefers peaty Islay Scotch, Burgundy reds..."
                  className="w-full bg-[#141414] border border-[#262626] rounded-lg p-2 text-[#E5E5E5] focus:outline-hidden focus:border-[#C5A059]"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-[#262626]">
                <button
                  type="button"
                  onClick={() => setShowAddEditModal(false)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider text-[#737373] hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#C5A059] hover:bg-[#D4B06A] text-black font-bold uppercase tracking-wider text-xs transition-colors cursor-pointer shadow-md"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
