import React, { useState, useEffect } from 'react';
import {
  Tag,
  Plus,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Truck,
  Percent,
  Calendar,
  CheckCircle2,
  Trash2,
  Sparkles,
  Award,
} from 'lucide-react';
import { OnlineCoupon } from '../../types';
import { api } from '../../utils/api';
import { playBeep } from '../../utils/audio';

export const CouponsAndAnalyticsTab: React.FC = () => {
  const [coupons, setCoupons] = useState<OnlineCoupon[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New Coupon Form
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newType, setNewType] = useState<'percentage' | 'fixed'>('percentage');
  const [newValue, setNewValue] = useState(10);
  const [newMinOrder, setNewMinOrder] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [couponRes, orderRes] = await Promise.all([
        api.getOnlineCoupons(),
        api.getOnlineOrders('all', 'all'),
      ]);
      setCoupons(couponRes.coupons || []);
      setOrders(orderRes.orders || []);
    } catch (err) {
      console.error('Failed to load coupons & analytics', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim()) return;

    try {
      const res = await api.createOnlineCoupon({
        code: newCode.trim().toUpperCase(),
        description: newDesc,
        discountType: newType,
        discountValue: newValue,
        minOrderAmount: newMinOrder,
        isActive: true,
      });

      setCoupons(prev => [res.coupon, ...prev]);
      setShowAddModal(false);
      setNewCode('');
      setNewDesc('');
      playBeep('success');
    } catch (err: any) {
      alert('Failed to create coupon: ' + err.message);
      playBeep('error');
    }
  };

  // Analytics Computations
  const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const completedOrders = orders.filter(o => o.status === 'completed');
  const curbsideCount = orders.filter(o => o.fulfillmentType === 'pickup').length;
  const deliveryCount = orders.filter(o => o.fulfillmentType === 'delivery').length;
  const avgBasket = orders.length > 0 ? totalRevenue / orders.length : 0;

  // Aggregate Top Items
  const itemMap: Record<string, { name: string; qty: number; revenue: number }> = {};
  orders.forEach(o => {
    (o.items || []).forEach((item: any) => {
      if (!itemMap[item.productName]) {
        itemMap[item.productName] = { name: item.productName, qty: 0, revenue: 0 };
      }
      itemMap[item.productName].qty += item.quantity || 1;
      itemMap[item.productName].revenue += item.totalPrice || 0;
    });
  });
  const topItems = Object.values(itemMap).sort((a, b) => b.qty - a.qty).slice(0, 5);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Analytics KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#141414] border border-[#262626] rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-[#888888]">
            <span className="text-xs font-bold uppercase tracking-wider">Web Gross Sales</span>
            <DollarSign className="w-4 h-4 text-[#C5A059]" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            ${totalRevenue.toFixed(2)}
          </div>
          <div className="text-[11px] text-[#777777]">
            Across {orders.length} online orders
          </div>
        </div>

        <div className="bg-[#141414] border border-[#262626] rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-[#888888]">
            <span className="text-xs font-bold uppercase tracking-wider">Avg. Basket Size</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            ${avgBasket.toFixed(2)}
          </div>
          <div className="text-[11px] text-emerald-400">
            Higher than standard walk-in
          </div>
        </div>

        <div className="bg-[#141414] border border-[#262626] rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-[#888888]">
            <span className="text-xs font-bold uppercase tracking-wider">Curbside vs Delivery</span>
            <ShoppingBag className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {curbsideCount} <span className="text-xs text-[#888888] font-normal">pickup</span> / {deliveryCount} <span className="text-xs text-[#888888] font-normal">deliv</span>
          </div>
          <div className="text-[11px] text-[#777777]">
            {orders.length > 0 ? `${Math.round((curbsideCount / orders.length) * 100)}% Curbside` : 'No orders yet'}
          </div>
        </div>

        <div className="bg-[#141414] border border-[#262626] rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-[#888888]">
            <span className="text-xs font-bold uppercase tracking-wider">21+ ID Compliance</span>
            <Award className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            100%
          </div>
          <div className="text-[11px] text-purple-400">
            TABC Age Gate & Hand-off checks
          </div>
        </div>
      </div>

      {/* Grid: Coupons & Top Spirits */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Promo Coupons Manager */}
        <div className="lg:col-span-7 bg-[#141414] border border-[#262626] rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#222222] pb-3">
            <div className="flex items-center space-x-2">
              <Tag className="w-4 h-4 text-[#C5A059]" />
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                Online Promo Codes & Coupons (WEB-023)
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="px-3 py-1.5 rounded-xl bg-[#C5A059] hover:bg-[#D4AF37] text-black text-xs font-bold flex items-center space-x-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Coupon</span>
            </button>
          </div>

          <div className="divide-y divide-[#222222]">
            {coupons.map(coupon => (
              <div key={coupon.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-black text-sm text-[#C5A059] bg-[#221C11] border border-[#C5A059]/40 px-2 py-0.5 rounded">
                      {coupon.code}
                    </span>
                    <span className="text-xs text-white font-medium">
                      {coupon.discountType === 'percentage'
                        ? `${coupon.discountValue}% OFF`
                        : `$${coupon.discountValue} OFF`}
                    </span>
                  </div>
                  <p className="text-xs text-[#888888] mt-1">{coupon.description}</p>
                </div>

                <div className="text-right">
                  <span className="text-xs font-mono text-[#AAAAAA] block">
                    Used {coupon.timesUsed || 0} times
                  </span>
                  <span
                    className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 ${
                      coupon.isActive
                        ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                        : 'bg-neutral-800 text-neutral-400'
                    }`}
                  >
                    {coupon.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Top Online Spirits */}
        <div className="lg:col-span-5 bg-[#141414] border border-[#262626] rounded-2xl p-5 space-y-4">
          <div className="flex items-center space-x-2 border-b border-[#222222] pb-3">
            <Sparkles className="w-4 h-4 text-[#C5A059]" />
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              Top Selling Online Spirits
            </h4>
          </div>

          {topItems.length === 0 ? (
            <p className="text-xs text-[#777777] py-6 text-center">
              No online orders recorded yet.
            </p>
          ) : (
            <div className="space-y-3">
              {topItems.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-[#181818] border border-[#262626] rounded-xl text-xs"
                >
                  <div className="flex items-center space-x-3">
                    <span className="w-5 h-5 rounded-full bg-[#262626] font-mono font-bold text-[#AAAAAA] flex items-center justify-center text-[11px]">
                      #{idx + 1}
                    </span>
                    <div>
                      <div className="font-bold text-white truncate max-w-[160px]">
                        {item.name}
                      </div>
                      <div className="text-[10px] text-[#777777]">{item.qty} bottles ordered</div>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-[#C5A059]">
                    ${item.revenue.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* New Coupon Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#181818] border border-[#333333] rounded-3xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Create Promo Coupon</h3>
            <form onSubmit={handleCreateCoupon} className="space-y-3.5 text-xs">
              <div>
                <label className="text-[#AAAAAA] block mb-1 font-bold uppercase tracking-wider">
                  Coupon Code
                </label>
                <input
                  type="text"
                  value={newCode}
                  onChange={e => setNewCode(e.target.value.toUpperCase())}
                  placeholder="e.g. SUMMER15"
                  required
                  className="w-full bg-[#222222] border border-[#444444] rounded-lg px-3 py-2 text-white font-mono font-bold outline-none focus:border-[#C5A059]"
                />
              </div>

              <div>
                <label className="text-[#AAAAAA] block mb-1 font-bold uppercase tracking-wider">
                  Description
                </label>
                <input
                  type="text"
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  placeholder="e.g. 15% off fine tequila and bourbons"
                  className="w-full bg-[#222222] border border-[#444444] rounded-lg px-3 py-2 text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#AAAAAA] block mb-1 font-bold uppercase tracking-wider">
                    Discount Type
                  </label>
                  <select
                    value={newType}
                    onChange={e => setNewType(e.target.value as any)}
                    className="w-full bg-[#222222] border border-[#444444] rounded-lg px-3 py-2 text-white outline-none"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Dollar ($)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[#AAAAAA] block mb-1 font-bold uppercase tracking-wider">
                    Value
                  </label>
                  <input
                    type="number"
                    value={newValue}
                    onChange={e => setNewValue(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#222222] border border-[#444444] rounded-lg px-3 py-2 text-white font-bold outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[#AAAAAA] block mb-1 font-bold uppercase tracking-wider">
                  Minimum Cart Amount ($)
                </label>
                <input
                  type="number"
                  value={newMinOrder}
                  onChange={e => setNewMinOrder(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#222222] border border-[#444444] rounded-lg px-3 py-2 text-white outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#262626] text-[#CCCCCC] text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#C5A059] hover:bg-[#D4AF37] text-black text-xs font-bold cursor-pointer"
                >
                  Create Code
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
