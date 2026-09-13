import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Truck,
  CheckCircle2,
  Clock,
  User,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  Printer,
  ChevronRight,
  Search,
  Check,
  X,
  CreditCard,
  Package,
} from 'lucide-react';
import { OnlineOrder } from '../../types';
import { api } from '../../utils/api';
import { playBeep } from '../../utils/audio';

export const OnlineOrdersTab: React.FC = () => {
  const [orders, setOrders] = useState<OnlineOrder[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [fulfillmentFilter, setFulfillmentFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<OnlineOrder | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const res = await api.getOnlineOrders(statusFilter, fulfillmentFilter);
      setOrders(res.orders || []);
      setCounts(res.counts || {});
      if (selectedOrder) {
        const found = res.orders?.find(o => o.id === selectedOrder.id);
        if (found) setSelectedOrder(found);
      }
    } catch (err) {
      console.error('Failed to load online orders', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [statusFilter, fulfillmentFilter]);

  const handleUpdateStatus = async (orderId: string, nextStatus: string, verified21 = true) => {
    setIsUpdating(true);
    try {
      const res = await api.updateOnlineOrderStatus(orderId, nextStatus, verified21);
      playBeep('success');
      setOrders(prev => prev.map(o => (o.id === orderId ? res.order : o)));
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(res.order);
      }
      loadOrders();
    } catch (err: any) {
      alert('Status update failed: ' + err.message);
      playBeep('error');
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-950/60 text-amber-400 border border-amber-800/40 animate-pulse">
            NEW ORDER
          </span>
        );
      case 'preparing':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-sky-950/60 text-sky-400 border border-sky-800/40">
            PREPARING
          </span>
        );
      case 'ready_for_pickup':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-950/60 text-purple-400 border border-purple-800/40">
            READY FOR PICKUP
          </span>
        );
      case 'out_for_delivery':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-950/60 text-indigo-400 border border-indigo-800/40">
            OUT FOR DELIVERY
          </span>
        );
      case 'completed':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
            COMPLETED
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-neutral-800 text-neutral-400">
            {status.toUpperCase()}
          </span>
        );
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Header & Refresh */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#141414] p-5 rounded-2xl border border-[#262626]">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-[#C5A059]/15 text-[#C5A059] flex items-center justify-center border border-[#C5A059]/30">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Omnichannel Web Order Manager (WEB-017 to WEB-021)
            </h3>
            <p className="text-xs text-[#888888]">
              Live curbside pickup and delivery orders synced to POS fulfillment queue with Texas 21+ ID sign-off
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadOrders}
          className="p-2.5 rounded-xl bg-[#1E1E1E] hover:bg-[#282828] text-[#888888] hover:text-white border border-[#333333] transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Status Pipeline Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2 no-scrollbar">
        {[
          { id: 'all', label: 'All Orders', count: counts.all || 0 },
          { id: 'new', label: 'New / Unaccepted', count: counts.new || 0 },
          { id: 'preparing', label: 'In Prep', count: counts.preparing || 0 },
          { id: 'ready_for_pickup', label: 'Ready for Pickup', count: counts.ready_for_pickup || 0 },
          { id: 'out_for_delivery', label: 'Out for Delivery', count: counts.out_for_delivery || 0 },
          { id: 'completed', label: 'Completed', count: counts.completed || 0 },
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setStatusFilter(tab.id)}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              statusFilter === tab.id
                ? 'bg-[#C5A059] text-black shadow-md'
                : 'bg-[#141414] text-[#888888] hover:text-white border border-[#262626]'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                statusFilter === tab.id
                  ? 'bg-black/20 text-black'
                  : 'bg-[#222222] text-[#AAAAAA]'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Two Column Layout: Orders List & Active Order Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Orders Cards */}
        <div className="lg:col-span-5 space-y-3">
          {orders.length === 0 ? (
            <div className="bg-[#141414] border border-[#262626] rounded-2xl p-12 text-center space-y-2">
              <ShoppingBag className="w-10 h-10 text-[#444444] mx-auto" />
              <p className="text-sm font-bold text-white">No online orders in this view</p>
              <p className="text-xs text-[#777777]">
                New orders placed from the customer website will appear here in real-time.
              </p>
            </div>
          ) : (
            orders.map(order => {
              const isSelected = selectedOrder?.id === order.id;
              return (
                <div
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  className={`bg-[#141414] border rounded-2xl p-4 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-[#C5A059] ring-2 ring-[#C5A059]/20 bg-[#1A1813]'
                      : 'border-[#262626] hover:border-[#383838]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-black text-sm text-white">
                        {order.orderNumber}
                      </span>
                      {order.fulfillmentType === 'delivery' ? (
                        <span className="flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-sky-950/60 text-sky-400 border border-sky-800/40">
                          <Truck className="w-3 h-3" />
                          <span>Delivery</span>
                        </span>
                      ) : (
                        <span className="flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/60 text-amber-400 border border-amber-800/40">
                          <ShoppingBag className="w-3 h-3" />
                          <span>Curbside</span>
                        </span>
                      )}
                    </div>
                    {getStatusBadge(order.status)}
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-white">{order.customerName}</div>
                      <div className="text-[11px] text-[#888888] font-mono">{order.customerPhone}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-black text-sm text-[#C5A059]">
                        ${order.totalAmount.toFixed(2)}
                      </div>
                      <div className="text-[10px] text-[#777777]">
                        {order.items.reduce((s, i) => s + i.quantity, 0)} items •{' '}
                        {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Selected Order Detail Card */}
        <div className="lg:col-span-7">
          {selectedOrder ? (
            <div className="bg-[#141414] border border-[#262626] rounded-2xl p-6 space-y-5 sticky top-4 shadow-xl">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[#222222] pb-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-black text-lg text-white font-mono">
                      {selectedOrder.orderNumber}
                    </h3>
                    {getStatusBadge(selectedOrder.status)}
                  </div>
                  <p className="text-xs text-[#888888] mt-0.5">
                    Placed: {new Date(selectedOrder.createdAt).toLocaleString()}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-xs text-[#888888] block">Total Charged</span>
                  <span className="text-2xl font-black text-[#C5A059] font-mono">
                    ${selectedOrder.totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Texas 21+ Age Gate Compliance Banner (WEB-022) */}
              <div className="p-3.5 bg-amber-950/20 border border-amber-800/40 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 text-[#C5A059]" />
                    <span className="text-xs font-bold text-amber-200 uppercase tracking-wider">
                      Texas TABC 21+ Alcohol Compliance
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/50">
                    Age Verified at Checkout
                  </span>
                </div>
                <div className="text-xs text-[#AAAAAA] flex items-center justify-between pt-1 border-t border-amber-900/30">
                  <span>Physical ID Verification at Hand-off:</span>
                  <span
                    className={`font-bold ${
                      selectedOrder.ageVerifiedAtPickupOrDelivery
                        ? 'text-emerald-400'
                        : 'text-amber-400'
                    }`}
                  >
                    {selectedOrder.ageVerifiedAtPickupOrDelivery
                      ? `Verified by ${selectedOrder.verifiedByName || 'Cashier'}`
                      : 'Pending ID check at counter/doorstep'}
                  </span>
                </div>
              </div>

              {/* Customer & Fulfillment Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#181818] p-4 rounded-xl border border-[#262626] text-xs">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-[#888888]">Customer Contact</span>
                  <div className="font-bold text-white flex items-center space-x-1.5">
                    <User className="w-3.5 h-3.5 text-[#C5A059]" />
                    <span>{selectedOrder.customerName}</span>
                  </div>
                  <div className="text-[#AAAAAA] flex items-center space-x-1.5">
                    <Phone className="w-3.5 h-3.5 text-[#666666]" />
                    <span>{selectedOrder.customerPhone}</span>
                  </div>
                  <div className="text-[#AAAAAA] flex items-center space-x-1.5">
                    <Mail className="w-3.5 h-3.5 text-[#666666]" />
                    <span>{selectedOrder.customerEmail}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-[#888888]">Fulfillment Details</span>
                  <div className="font-bold text-white capitalize flex items-center space-x-1.5">
                    {selectedOrder.fulfillmentType === 'delivery' ? (
                      <Truck className="w-3.5 h-3.5 text-sky-400" />
                    ) : (
                      <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
                    )}
                    <span>{selectedOrder.fulfillmentType === 'delivery' ? 'Local Delivery' : 'Curbside / Counter Pickup'}</span>
                  </div>

                  {selectedOrder.deliveryAddress && (
                    <div className="text-[#AAAAAA] flex items-start space-x-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#666666] shrink-0 mt-0.5" />
                      <span>
                        {selectedOrder.deliveryAddress.street}, {selectedOrder.deliveryAddress.city},{' '}
                        {selectedOrder.deliveryAddress.state} {selectedOrder.deliveryAddress.zip}
                      </span>
                    </div>
                  )}

                  {selectedOrder.pickupTimeSlot && (
                    <div className="text-[#AAAAAA] flex items-center space-x-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#666666]" />
                      <span>Time Slot: {selectedOrder.pickupTimeSlot}</span>
                    </div>
                  )}

                  {selectedOrder.notes && (
                    <div className="text-[11px] text-[#C5A059] italic pt-1">
                      Note: &quot;{selectedOrder.notes}&quot;
                    </div>
                  )}
                </div>
              </div>

              {/* Order Items Table */}
              <div className="bg-[#181818] border border-[#262626] rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 bg-[#1C1C1C] border-b border-[#262626] text-xs font-bold uppercase tracking-wider text-white">
                  Spirits & Items to Pack
                </div>
                <div className="divide-y divide-[#222222] p-2 space-y-1">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 text-xs">
                      <div className="flex items-center space-x-3">
                        <div className="w-7 h-7 rounded bg-[#262626] font-mono font-bold text-white flex items-center justify-center text-xs">
                          {item.quantity}x
                        </div>
                        <div>
                          <div className="font-bold text-white">{item.productName}</div>
                          <div className="text-[10px] text-[#777777] font-mono">
                            {item.sku} • {item.size || '750ml'}
                          </div>
                        </div>
                      </div>
                      <span className="font-mono font-bold text-white">${item.totalPrice.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Workflow Pipeline Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#222222]">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-2 rounded-xl bg-[#222222] hover:bg-[#2A2A2A] text-[#CCCCCC] hover:text-white text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 border border-[#333333] cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-[#C5A059]" />
                  <span>Print Slip</span>
                </button>

                <div className="flex items-center space-x-2">
                  {selectedOrder.status === 'new' && (
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => handleUpdateStatus(selectedOrder.id, 'preparing')}
                      className="px-4 py-2 rounded-xl bg-[#C5A059] hover:bg-[#D4AF37] text-black text-xs font-bold uppercase tracking-wider cursor-pointer shadow-lg"
                    >
                      Accept & Start Packing
                    </button>
                  )}

                  {selectedOrder.status === 'preparing' && (
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() =>
                        handleUpdateStatus(
                          selectedOrder.id,
                          selectedOrder.fulfillmentType === 'delivery'
                            ? 'out_for_delivery'
                            : 'ready_for_pickup'
                        )
                      }
                      className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold uppercase tracking-wider cursor-pointer shadow-lg"
                    >
                      {selectedOrder.fulfillmentType === 'delivery'
                        ? 'Mark Out for Delivery'
                        : 'Mark Ready for Pickup'}
                    </button>
                  )}

                  {(selectedOrder.status === 'ready_for_pickup' ||
                    selectedOrder.status === 'out_for_delivery') && (
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => handleUpdateStatus(selectedOrder.id, 'completed', true)}
                      className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 cursor-pointer shadow-lg"
                    >
                      <Check className="w-4 h-4" />
                      <span>Verify 21+ ID & Complete Hand-off</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#141414] border border-[#262626] rounded-2xl p-16 text-center space-y-2">
              <ShoppingBag className="w-12 h-12 text-[#333333] mx-auto" />
              <p className="text-sm font-bold text-white">Select an order to inspect details</p>
              <p className="text-xs text-[#777777]">
                Review items to pack, verify delivery address, and record 21+ age verification upon pickup.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
