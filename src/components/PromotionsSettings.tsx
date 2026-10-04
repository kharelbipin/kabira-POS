import React, { useState, useEffect } from 'react';
import { Category, Product, Promotion } from '../types';
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
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

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
    fundingSource: 'store' as 'store' | 'manufacturer' | 'vendor',
    manufacturerName: '',
    distributorName: '',
    productHeading: 'Tobacco',
    programType: 'buydown' as Promotion['programType'],
    customerPhoneRequired: false,
    loyaltyRequired: false,
    ageVerificationRequired: false,
    reimbursementPerUnit: 0,
    reportingFrequency: 'monthly' as Promotion['reportingFrequency'],
    exportTemplate: 'Generic CSV',
    targetType: 'all' as NonNullable<Promotion['targetType']>,
    targetId: '',
    dealType: 'simple' as NonNullable<Promotion['dealType']>,
    buyProductIds: [] as string[],
    rewardProductIds: [] as string[],
    buyCategoryIds: [] as string[],
    rewardCategoryIds: [] as string[],
    buyQuantity: 1,
    rewardQuantity: 1,
    maxRewardsPerTransaction: 1,
    repeatable: false,
    rewardSelection: 'any_eligible' as NonNullable<Promotion['rewardSelection']>,
    customerIdentifierMode: 'token' as NonNullable<Promotion['customerIdentifierMode']>,
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
    Promise.all([api.getProducts(), api.getCategories()])
      .then(([productRows, categoryRows]) => {
        setProducts(productRows);
        setCategories(categoryRows);
      })
      .catch(() => {
        setProducts([]);
        setCategories([]);
      });
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
        fundingSource: formData.fundingSource,
        manufacturerName: formData.manufacturerName.trim() || undefined,
        distributorName: formData.distributorName.trim() || undefined,
        productHeading: formData.productHeading.trim() || undefined,
        programType: formData.programType,
        customerPhoneRequired: formData.customerPhoneRequired,
        loyaltyRequired: formData.loyaltyRequired,
        ageVerificationRequired: formData.ageVerificationRequired,
        reimbursementPerUnit: Number(formData.reimbursementPerUnit) || 0,
        reportingFrequency: formData.reportingFrequency,
        exportTemplate: formData.exportTemplate.trim() || 'Generic CSV',
        targetType: formData.targetType,
        targetId: formData.targetType === 'all' ? undefined : formData.targetId || undefined,
        dealType: formData.dealType,
        buyProductIds: formData.buyProductIds,
        rewardProductIds: formData.rewardProductIds,
        buyCategoryIds: formData.buyCategoryIds,
        rewardCategoryIds: formData.rewardCategoryIds,
        buyQuantity: Number(formData.buyQuantity) || 1,
        rewardQuantity: Number(formData.rewardQuantity) || 1,
        maxRewardsPerTransaction: Number(formData.maxRewardsPerTransaction) || 1,
        repeatable: formData.repeatable,
        rewardSelection: formData.rewardSelection,
        customerIdentifierMode: formData.customerIdentifierMode,
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
        fundingSource: 'store',
        manufacturerName: '',
        distributorName: '',
        productHeading: 'Tobacco',
        programType: 'buydown',
        customerPhoneRequired: false,
        loyaltyRequired: false,
        ageVerificationRequired: false,
        reimbursementPerUnit: 0,
        reportingFrequency: 'monthly',
        exportTemplate: 'Generic CSV',
        targetType: 'all',
        targetId: '',
        dealType: 'simple',
        buyProductIds: [],
        rewardProductIds: [],
        buyCategoryIds: [],
        rewardCategoryIds: [],
        buyQuantity: 1,
        rewardQuantity: 1,
        maxRewardsPerTransaction: 1,
        repeatable: false,
        rewardSelection: 'any_eligible',
        customerIdentifierMode: 'token',
      });
      loadPromotions();
    } catch (err: any) {
      playBeep('error');
      alert(err.message || 'Failed to create promotion');
    }
  };

  const toggleProductSelection = (field: 'buyProductIds' | 'rewardProductIds', productId: string) => {
    const current = formData[field];
    setFormData({
      ...formData,
      [field]: current.includes(productId)
        ? current.filter(id => id !== productId)
        : [...current, productId],
    });
  };

  const toggleCategorySelection = (field: 'buyCategoryIds' | 'rewardCategoryIds', categoryId: string) => {
    const current = formData[field];
    setFormData({
      ...formData,
      [field]: current.includes(categoryId)
        ? current.filter(id => id !== categoryId)
        : [...current, categoryId],
    });
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
                  {promo.fundingSource && promo.fundingSource !== 'store' && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-[#737373]">Funded By:</span>
                        <span className="font-bold text-sky-300">{promo.manufacturerName || promo.fundingSource}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[#737373]">Product Heading:</span>
                        <span className="font-mono text-[#E5E5E5]">{promo.productHeading || '—'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[#737373]">Expected Rebate:</span>
                        <span className="font-mono text-emerald-400">
                          {'$'}{Number(promo.reimbursementPerUnit || 0).toFixed(2)} / unit
                        </span>
                      </div>
                    </>
                  )}
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
          <div className="bg-[#111111] border border-[#262626] rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
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

              <div className="rounded-xl border border-[#3A3120] bg-[#0B0B0B] p-4 space-y-4">
                <div>
                  <div className="text-xs font-black uppercase tracking-wider text-[#C5A059]">IF / THEN Promotion Builder</div>
                  <div className="text-[11px] text-[#737373] mt-0.5">
                    Build mix-and-match deals using multiple qualifying products and multiple reward products.
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[#A3A3A3] font-bold uppercase tracking-wider mb-1">Deal Type</label>
                    <select
                      value={formData.dealType}
                      onChange={e => setFormData({ ...formData, dealType: e.target.value as NonNullable<Promotion['dealType']> })}
                      className="w-full bg-[#1A1A1A] border border-[#262626] rounded-lg p-2.5 text-[#E5E5E5]"
                    >
                      <option value="simple">Simple Discount</option>
                      <option value="buy_x_get_percent">Buy X, Get Y % Off</option>
                      <option value="buy_x_get_free">Buy X, Get Y Free</option>
                      <option value="mix_match">Mix & Match</option>
                      <option value="bundle_price">Bundle Price</option>
                      <option value="quantity_break">Quantity Break Pricing</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[#A3A3A3] font-bold uppercase tracking-wider mb-1">Buy Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.buyQuantity}
                      onChange={e => setFormData({ ...formData, buyQuantity: Math.max(1, Number(e.target.value) || 1) })}
                      className="w-full bg-[#1A1A1A] border border-[#262626] rounded-lg p-2.5 text-[#E5E5E5] font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[#A3A3A3] font-bold uppercase tracking-wider mb-1">Reward Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.rewardQuantity}
                      onChange={e => setFormData({ ...formData, rewardQuantity: Math.max(1, Number(e.target.value) || 1) })}
                      className="w-full bg-[#1A1A1A] border border-[#262626] rounded-lg p-2.5 text-[#E5E5E5] font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-sky-900/50 bg-sky-950/10 p-3 space-y-3">
                    <div>
                      <div className="text-xs font-black text-sky-300">IF CUSTOMER BUYS</div>
                      <div className="text-[10px] text-[#737373]">Choose any number of qualifying products and/or categories.</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[#A3A3A3] mb-2">Products ({formData.buyProductIds.length} selected)</div>
                      <div className="max-h-40 overflow-y-auto rounded-lg border border-[#262626] divide-y divide-[#222]">
                        {products.filter(row => row.active).map(row => (
                          <label key={row.id} className="flex items-center gap-2 px-3 py-2 bg-[#141414] hover:bg-[#191919] cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.buyProductIds.includes(row.id)}
                              onChange={() => toggleProductSelection('buyProductIds', row.id)}
                            />
                            <span className="flex-1 min-w-0 text-[#D4D4D4] truncate">{row.name}</span>
                            <span className="text-[10px] text-[#666] font-mono">{row.barcode}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[#A3A3A3] mb-2">Categories ({formData.buyCategoryIds.length} selected)</div>
                      <div className="flex flex-wrap gap-2">
                        {categories.filter(row => row.active).map(row => (
                          <label key={row.id} className={`px-2.5 py-1.5 rounded-lg border cursor-pointer ${formData.buyCategoryIds.includes(row.id) ? 'bg-sky-950/60 border-sky-600 text-sky-200' : 'bg-[#141414] border-[#262626] text-[#A3A3A3]'}`}>
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={formData.buyCategoryIds.includes(row.id)}
                              onChange={() => toggleCategorySelection('buyCategoryIds', row.id)}
                            />
                            {row.name}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-emerald-900/50 bg-emerald-950/10 p-3 space-y-3">
                    <div>
                      <div className="text-xs font-black text-emerald-300">THEN CUSTOMER GETS</div>
                      <div className="text-[10px] text-[#737373]">Choose multiple eligible reward products or categories.</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[#A3A3A3] mb-2">Reward Products ({formData.rewardProductIds.length} selected)</div>
                      <div className="max-h-40 overflow-y-auto rounded-lg border border-[#262626] divide-y divide-[#222]">
                        {products.filter(row => row.active).map(row => (
                          <label key={row.id} className="flex items-center gap-2 px-3 py-2 bg-[#141414] hover:bg-[#191919] cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.rewardProductIds.includes(row.id)}
                              onChange={() => toggleProductSelection('rewardProductIds', row.id)}
                            />
                            <span className="flex-1 min-w-0 text-[#D4D4D4] truncate">{row.name}</span>
                            <span className="text-[10px] text-[#666] font-mono">{row.barcode}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[#A3A3A3] mb-2">Reward Categories ({formData.rewardCategoryIds.length} selected)</div>
                      <div className="flex flex-wrap gap-2">
                        {categories.filter(row => row.active).map(row => (
                          <label key={row.id} className={`px-2.5 py-1.5 rounded-lg border cursor-pointer ${formData.rewardCategoryIds.includes(row.id) ? 'bg-emerald-950/60 border-emerald-600 text-emerald-200' : 'bg-[#141414] border-[#262626] text-[#A3A3A3]'}`}>
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={formData.rewardCategoryIds.includes(row.id)}
                              onChange={() => toggleCategorySelection('rewardCategoryIds', row.id)}
                            />
                            {row.name}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[#A3A3A3] font-bold uppercase tracking-wider mb-1">Reward Selection</label>
                    <select
                      value={formData.rewardSelection}
                      onChange={e => setFormData({ ...formData, rewardSelection: e.target.value as NonNullable<Promotion['rewardSelection']> })}
                      className="w-full bg-[#1A1A1A] border border-[#262626] rounded-lg p-2.5 text-[#E5E5E5]"
                    >
                      <option value="any_eligible">Any Eligible Reward Item</option>
                      <option value="cheapest">Cheapest Eligible Item</option>
                      <option value="most_expensive">Most Expensive Eligible Item</option>
                      <option value="same_products">Same Qualifying Products</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[#A3A3A3] font-bold uppercase tracking-wider mb-1">Max Rewards / Transaction</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.maxRewardsPerTransaction}
                      onChange={e => setFormData({ ...formData, maxRewardsPerTransaction: Math.max(1, Number(e.target.value) || 1) })}
                      className="w-full bg-[#1A1A1A] border border-[#262626] rounded-lg p-2.5 text-[#E5E5E5] font-mono"
                    />
                  </div>
                  <label className="flex items-end">
                    <span className="w-full flex items-center gap-2 bg-[#141414] border border-[#262626] rounded-lg p-2.5 min-h-[40px] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.repeatable}
                        onChange={e => setFormData({ ...formData, repeatable: e.target.checked })}
                      />
                      <span className="text-[#D4D4D4] font-bold">Repeat deal automatically</span>
                    </span>
                  </label>
                </div>

                <div className="rounded-lg border border-[#40351f] bg-[#171208] px-3 py-2 text-[11px] text-[#D4B06A]">
                  Example: Buy any <strong>{formData.buyQuantity}</strong> from {formData.buyProductIds.length + formData.buyCategoryIds.length} selected buy groups → get <strong>{formData.rewardQuantity}</strong> eligible reward item(s) at <strong>{formData.value}{formData.type === 'percentage' ? '%' : '$'} off</strong>.
                </div>

                <details className="rounded-lg border border-[#262626] bg-[#101010] p-3">
                  <summary className="cursor-pointer text-[11px] font-bold text-[#A3A3A3]">Legacy simple target (optional compatibility)</summary>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <select
                      value={formData.targetType}
                      onChange={e => setFormData({ ...formData, targetType: e.target.value as NonNullable<Promotion['targetType']>, targetId: '' })}
                      className="w-full bg-[#1A1A1A] border border-[#262626] rounded-lg p-2.5 text-[#E5E5E5]"
                    >
                      <option value="all">All Matching Products</option>
                      <option value="category">Specific Category</option>
                      <option value="product">Specific Product / UPC</option>
                    </select>
                    {formData.targetType === 'product' ? (
                      <select value={formData.targetId} onChange={e => setFormData({ ...formData, targetId: e.target.value })} className="w-full bg-[#1A1A1A] border border-[#262626] rounded-lg p-2.5 text-[#E5E5E5]">
                        <option value="">Choose product...</option>
                        {products.filter(row => row.active).map(row => <option key={row.id} value={row.id}>{row.name} — {row.barcode}</option>)}
                      </select>
                    ) : formData.targetType === 'category' ? (
                      <select value={formData.targetId} onChange={e => setFormData({ ...formData, targetId: e.target.value })} className="w-full bg-[#1A1A1A] border border-[#262626] rounded-lg p-2.5 text-[#E5E5E5]">
                        <option value="">Choose category...</option>
                        {categories.filter(row => row.active).map(row => <option key={row.id} value={row.id}>{row.name}</option>)}
                      </select>
                    ) : (
                      <div className="rounded-lg bg-[#141414] border border-[#262626] p-2.5 text-[#737373]">No legacy target required.</div>
                    )}
                  </div>
                </details>
              </div>

              <div className="rounded-xl border border-[#2A2A2A] bg-[#0B0B0B] p-4 space-y-3">
                <div>
                  <div className="text-xs font-black uppercase tracking-wider text-[#C5A059]">Promotion Funding & Reporting</div>
                  <div className="text-[11px] text-[#737373] mt-0.5">Use manufacturer/vendor funding for scan-data, buydown, rebate, loyalty, or beverage programs.</div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#A3A3A3] font-bold uppercase tracking-wider mb-1">Funding Source</label>
                    <select
                      value={formData.fundingSource}
                      onChange={e => setFormData({ ...formData, fundingSource: e.target.value as any })}
                      className="w-full bg-[#1A1A1A] border border-[#262626] rounded-lg p-2.5 text-[#E5E5E5]"
                    >
                      <option value="store">Store Funded</option>
                      <option value="manufacturer">Manufacturer Funded</option>
                      <option value="vendor">Vendor / Distributor Funded</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[#A3A3A3] font-bold uppercase tracking-wider mb-1">Program Type</label>
                    <select
                      value={formData.programType || 'buydown'}
                      onChange={e => setFormData({ ...formData, programType: e.target.value as Promotion['programType'] })}
                      className="w-full bg-[#1A1A1A] border border-[#262626] rounded-lg p-2.5 text-[#E5E5E5]"
                    >
                      <option value="scan_data">Scan Data</option>
                      <option value="buydown">Buydown</option>
                      <option value="rebate">Rebate</option>
                      <option value="loyalty">Loyalty Promotion</option>
                      <option value="multipack">Multipack</option>
                      <option value="vendor_promotion">Vendor Promotion</option>
                    </select>
                  </div>
                </div>

                {formData.fundingSource !== 'store' && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[#A3A3A3] font-bold uppercase tracking-wider mb-1">Manufacturer / Company</label>
                        <input value={formData.manufacturerName} onChange={e => setFormData({ ...formData, manufacturerName: e.target.value })} placeholder="e.g. Altria, Diageo, Red Bull" className="w-full bg-[#1A1A1A] border border-[#262626] rounded-lg p-2.5 text-[#E5E5E5]" />
                      </div>
                      <div>
                        <label className="block text-[#A3A3A3] font-bold uppercase tracking-wider mb-1">Distributor</label>
                        <input value={formData.distributorName} onChange={e => setFormData({ ...formData, distributorName: e.target.value })} placeholder="Optional distributor" className="w-full bg-[#1A1A1A] border border-[#262626] rounded-lg p-2.5 text-[#E5E5E5]" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[#A3A3A3] font-bold uppercase tracking-wider mb-1">Product Heading</label>
                        <select value={formData.productHeading} onChange={e => setFormData({ ...formData, productHeading: e.target.value })} className="w-full bg-[#1A1A1A] border border-[#262626] rounded-lg p-2.5 text-[#E5E5E5]">
                          <option>Tobacco</option>
                          <option>Cigars</option>
                          <option>Beer</option>
                          <option>Wine</option>
                          <option>Liquor</option>
                          <option>Energy Drinks</option>
                          <option>Soft Drinks</option>
                          <option>Snacks</option>
                          <option>Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[#A3A3A3] font-bold uppercase tracking-wider mb-1">Reimbursement / Unit ($)</label>
                        <input type="number" min="0" step="0.01" value={formData.reimbursementPerUnit} onChange={e => setFormData({ ...formData, reimbursementPerUnit: parseFloat(e.target.value) || 0 })} className="w-full bg-[#1A1A1A] border border-[#262626] rounded-lg p-2.5 text-[#E5E5E5] font-mono" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[#A3A3A3] font-bold uppercase tracking-wider mb-1">Reporting Frequency</label>
                        <select value={formData.reportingFrequency || 'monthly'} onChange={e => setFormData({ ...formData, reportingFrequency: e.target.value as Promotion['reportingFrequency'] })} className="w-full bg-[#1A1A1A] border border-[#262626] rounded-lg p-2.5 text-[#E5E5E5]">
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                          <option value="monthly">Monthly</option>
                          <option value="custom">Custom</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[#A3A3A3] font-bold uppercase tracking-wider mb-1">Export Template</label>
                        <input value={formData.exportTemplate} onChange={e => setFormData({ ...formData, exportTemplate: e.target.value })} placeholder="Generic CSV" className="w-full bg-[#1A1A1A] border border-[#262626] rounded-lg p-2.5 text-[#E5E5E5]" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[#A3A3A3] font-bold uppercase tracking-wider mb-1">Customer Identifier in Export</label>
                      <select
                        value={formData.customerIdentifierMode}
                        onChange={e => setFormData({ ...formData, customerIdentifierMode: e.target.value as NonNullable<Promotion['customerIdentifierMode']> })}
                        className="w-full bg-[#1A1A1A] border border-[#262626] rounded-lg p-2.5 text-[#E5E5E5]"
                      >
                        <option value="token">Protected Phone Token (Recommended)</option>
                        <option value="raw_phone">Raw Phone Number (Only if company requires it)</option>
                        <option value="none">Do Not Export Customer Identifier</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <label className="flex items-center gap-2 bg-[#141414] border border-[#262626] rounded-lg p-2.5">
                        <input type="checkbox" checked={formData.customerPhoneRequired} onChange={e => setFormData({ ...formData, customerPhoneRequired: e.target.checked })} />
                        <span className="text-[#D4D4D4] font-bold">Phone Required</span>
                      </label>
                      <label className="flex items-center gap-2 bg-[#141414] border border-[#262626] rounded-lg p-2.5">
                        <input type="checkbox" checked={formData.loyaltyRequired} onChange={e => setFormData({ ...formData, loyaltyRequired: e.target.checked })} />
                        <span className="text-[#D4D4D4] font-bold">Loyalty Required</span>
                      </label>
                      <label className="flex items-center gap-2 bg-[#141414] border border-[#262626] rounded-lg p-2.5">
                        <input type="checkbox" checked={formData.ageVerificationRequired} onChange={e => setFormData({ ...formData, ageVerificationRequired: e.target.checked })} />
                        <span className="text-[#D4D4D4] font-bold">Age Verification</span>
                      </label>
                    </div>
                  </>
                )}
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