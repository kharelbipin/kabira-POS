import React, { useState, useEffect } from 'react';
import { Promotion } from '../types';
import { api } from '../utils/api';
import { playBeep } from '../utils/audio';
import {
  Tag,
  Percent,
  DollarSign,
  Calendar,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

export const PromotionsSettings: React.FC = () => {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: 'percentage' as Promotion['type'],
    value: 10,
    minPurchaseAmount: 0,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    maxUsages: 100,
    active: true,
  });

  const loadPromotions = async () => {
    try {
      setLoading(true);
      const data = await api.getPromotions();
      setPromotions(data);
    } catch (err) {
      console.error('Failed to load promotions', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPromotions();
  }, []);

  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createPromotion({
        code: formData.code.toUpperCase().trim(),
        name: formData.name.trim(),
        type: formData.type,
        value: Number(formData.value),
        minPurchaseAmount: Number(formData.minPurchaseAmount) || 0,
        startDate: formData.startDate,
        endDate: formData.endDate,
        maxUsages: Number(formData.maxUsages) || undefined,
        active: formData.active,
      });
      playBeep('success');
      setShowAddModal(false);
      setFormData({
        code: '',
        name: '',
        type: 'percentage',
        value: 10,
        minPurchaseAmount: 0,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        maxUsages: 100,
        active: true,
      });
      loadPromotions();
    } catch (err: any) {
      playBeep('error');
      alert(err.message || 'Failed to create promotion');
    }
  };

  const handleToggleActive = async (promo: Promotion) => {
    try {
      await api.updatePromotion(promo.id, { active: !promo.active });
      playBeep('click');
      loadPromotions();
    } catch (err: any) {
      alert(err.message || 'Failed to update promotion');
    }
  };

  const handleDelete = async (id: string, code: string) => {
    if (!confirm(`Are you sure you want to delete promo code "${code}"?`)) return;
    try {
      await api.deletePromotion(id);
      playBeep('click');
      loadPromotions();
    } catch (err: any) {
      alert(err.message || 'Failed to delete promotion');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0D0D0D] p-4 rounded-xl border border-[#262626]">
        <div>
          <h3 className="font-serif italic font-bold text-base text-[#F5F5F5] flex items-center space-x-2">
            <Tag className="w-4 h-4 text-[#C5A059]" />
            <span>Promotions, Coupons & Discounts (AP-DS-01 - 04)</span>
          </h3>
          <p className="text-xs text-[#737373] mt-0.5">
            Configure percentage discounts, flat amount vouchers, minimum ticket spends, and expiration dates
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={loadPromotions}
            className="p-2 text-[#A3A3A3] hover:text-[#E5E5E5] bg-[#141414] hover:bg-[#1A1A1A] border border-[#262626] rounded-lg cursor-pointer transition-colors"
            title="Refresh Promotions"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => {
              playBeep('click');
              setShowAddModal(true);
            }}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-[#C5A059] hover:bg-[#D4B06A] text-black text-xs font-bold uppercase tracking-wider transition-all shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Promo</span>
          </button>
        </div>
      </div>

      {/* Promotions Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {promotions.map(promo => {
          const isExpired = new Date(promo.endDate) < new Date();

          return (
            <div
              key={promo.id}
              className={`bg-[#0D0D0D] border rounded-xl p-4 flex flex-col justify-between transition-colors ${
                promo.active && !isExpired
                  ? 'border-[#262626] hover:border-[#C5A059]/50'
                  : 'border-[#1F1F1F] opacity-75'
              }`}
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-9 h-9 rounded-lg bg-[#141414] border border-[#262626] flex items-center justify-center">
                      {promo.type === 'percentage' ? (
                        <Percent className="w-4 h-4 text-[#C5A059]" />
                      ) : (
                        <DollarSign className="w-4 h-4 text-emerald-400" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-sm font-bold text-[#E5E5E5] tracking-wider">
                          {promo.code}
                        </span>
                        {promo.active && !isExpired && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 text-[10px] font-bold uppercase">
                            Active
                          </span>
                        )}
                        {isExpired && (
                          <span className="px-1.5 py-0.5 rounded bg-red-950/40 border border-red-800/40 text-red-400 text-[10px] font-bold uppercase">
                            Expired
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#737373] line-clamp-1">{promo.name}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDelete(promo.id, promo.code)}
                    className="text-[#525252] hover:text-red-400 p-1 cursor-pointer transition-colors"
                    title="Delete Promo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="bg-[#141414] p-3 rounded-lg border border-[#262626] text-xs space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[#737373]">Discount:</span>
                    <span className="font-bold text-[#C5A059] font-mono">
                      {promo.type === 'percentage' ? `${promo.value}% OFF` : `$${(promo.value ?? 0).toFixed(2)} OFF`}
                    </span>
                  </div>
                  {(promo.minPurchaseAmount ?? 0) > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-[#737373]">Min Spend:</span>
                      <span className="font-mono text-[#E5E5E5]">${(promo.minPurchaseAmount ?? 0).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-[#737373]">Redemptions:</span>
                    <span className="font-mono text-[#E5E5E5]">
                      {promo.currentUsages || 0} / {promo.maxUsages || '∞'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-[#262626]/60 text-[11px]">
                    <span className="text-[#737373] flex items-center space-x-1">
                      <Calendar className="w-3 h-3 text-[#525252]" />
                      <span>Valid until:</span>
                    </span>
                    <span className="font-mono text-[#A3A3A3]">{promo.endDate}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#262626] flex items-center justify-between">
                <span className="text-xs text-[#737373]">Status Toggle:</span>
                <button
                  type="button"
                  onClick={() => handleToggleActive(promo)}
                  className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                    promo.active
                      ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/40 hover:bg-emerald-900/60'
                      : 'bg-neutral-800 text-neutral-400 border border-neutral-700 hover:bg-neutral-700'
                  }`}
                >
                  {promo.active ? 'Active' : 'Disabled'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Promotion Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-[#111111] border border-[#262626] rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#262626] pb-3">
              <h3 className="text-base font-serif italic font-bold text-[#F5F5F5] flex items-center space-x-2">
                <Tag className="w-4 h-4 text-[#C5A059]" />
                <span>Create Discount Promotion</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-[#737373] hover:text-[#E5E5E5] text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePromo} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#A3A3A3] font-bold uppercase tracking-wider mb-1">
                    Promo Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. GRANBURY10"
                    value={formData.code}
                    onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full bg-[#1A1A1A] border border-[#262626] rounded-lg p-2.5 text-[#E5E5E5] font-mono uppercase focus:outline-hidden focus:border-[#C5A059]"
                  />
                </div>

                <div>
                  <label className="block text-[#A3A3A3] font-bold uppercase tracking-wider mb-1">
                    Promotion Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 10% Granbury Locals Discount"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-[#1A1A1A] border border-[#262626] rounded-lg p-2.5 text-[#E5E5E5] focus:outline-hidden focus:border-[#C5A059]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#A3A3A3] font-bold uppercase tracking-wider mb-1">
                    Discount Type *
                  </label>
                  <select
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value as Promotion['type'] })}
                    className="w-full bg-[#1A1A1A] border border-[#262626] rounded-lg p-2.5 text-[#E5E5E5] focus:outline-hidden focus:border-[#C5A059]"
                  >
                    <option value="percentage">Percentage Off (%)</option>
                    <option value="flat_amount">Flat Amount Off ($)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#A3A3A3] font-bold uppercase tracking-wider mb-1">
                    {formData.type === 'percentage' ? 'Percent Value (%) *' : 'Discount Amount ($) *'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.1"
                    required
                    value={formData.value}
                    onChange={e => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#1A1A1A] border border-[#262626] rounded-lg p-2.5 text-[#E5E5E5] font-mono focus:outline-hidden focus:border-[#C5A059]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#A3A3A3] font-bold uppercase tracking-wider mb-1">
                    Minimum Cart Spend ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.minPurchaseAmount}
                    onChange={e => setFormData({ ...formData, minPurchaseAmount: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#1A1A1A] border border-[#262626] rounded-lg p-2.5 text-[#E5E5E5] font-mono focus:outline-hidden focus:border-[#C5A059]"
                  />
                </div>

                <div>
                  <label className="block text-[#A3A3A3] font-bold uppercase tracking-wider mb-1">
                    Max Redemptions
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="100"
                    value={formData.maxUsages}
                    onChange={e => setFormData({ ...formData, maxUsages: parseInt(e.target.value) || 0 })}
                    className="w-full bg-[#1A1A1A] border border-[#262626] rounded-lg p-2.5 text-[#E5E5E5] font-mono focus:outline-hidden focus:border-[#C5A059]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#A3A3A3] font-bold uppercase tracking-wider mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full bg-[#1A1A1A] border border-[#262626] rounded-lg p-2.5 text-[#E5E5E5] focus:outline-hidden focus:border-[#C5A059]"
                  />
                </div>

                <div>
                  <label className="block text-[#A3A3A3] font-bold uppercase tracking-wider mb-1">
                    Expiration Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full bg-[#1A1A1A] border border-[#262626] rounded-lg p-2.5 text-[#E5E5E5] focus:outline-hidden focus:border-[#C5A059]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-[#262626]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg bg-[#1A1A1A] hover:bg-[#262626] text-[#E5E5E5] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#C5A059] hover:bg-[#D4B06A] text-black font-bold uppercase tracking-wider transition-all shadow-md cursor-pointer"
                >
                  Save Promotion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
