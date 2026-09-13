import React, { useState, useMemo } from 'react';
import { Order, User, StoreSettings } from '../types';
import { api } from '../utils/api';
import { playBeep } from '../utils/audio';
import {
  Search,
  ReceiptText,
  Filter,
  Eye,
  Ban,
  RotateCcw,
  Printer,
  Calendar,
  User as UserIcon,
  CreditCard,
  Banknote,
  Smartphone,
  AlertTriangle,
  CheckCircle2,
  X,
  FileSpreadsheet,
} from 'lucide-react';

interface OrdersViewProps {
  orders: Order[];
  currentUser: User | null;
  settings: StoreSettings | null;
  onRefreshOrders: () => void;
  onReprintReceipt: (order: Order) => void;
}

export const OrdersView: React.FC<OrdersViewProps> = ({
  orders,
  currentUser,
  settings,
  onRefreshOrders,
  onReprintReceipt,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Void modal state
  const [showVoidModal, setShowVoidModal] = useState<boolean>(false);
  const [voidReason, setVoidReason] = useState<string>('Customer canceled before pickup');
  const [isVoiding, setIsVoiding] = useState<boolean>(false);
  const [voidError, setVoidError] = useState<string | null>(null);

  // Refund modal state
  const [showRefundModal, setShowRefundModal] = useState<boolean>(false);
  const [refundReason, setRefundReason] = useState<string>('Defective or corked bottle');
  const [refundAmount, setRefundAmount] = useState<string>('');
  const [isRefunding, setIsRefunding] = useState<boolean>(false);
  const [refundError, setRefundError] = useState<string | null>(null);

  const isManagerOrAdmin = currentUser?.role === 'Manager' || currentUser?.role === 'Admin';

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    let list = [...orders];

    if (statusFilter !== 'all') {
      list = list.filter(o => o.status === statusFilter);
    }

    if (paymentFilter !== 'all') {
      list = list.filter(o => o.payment.method === paymentFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        o =>
          o.orderNumber.toLowerCase().includes(q) ||
          o.cashierName.toLowerCase().includes(q) ||
          (o.customerName && o.customerName.toLowerCase().includes(q)) ||
          (o.customerPhone && o.customerPhone.includes(q))
      );
    }

    return list;
  }, [orders, statusFilter, paymentFilter, searchQuery]);

  // Handle Void
  const handleConfirmVoid = async () => {
    if (!selectedOrder) return;
    setIsVoiding(true);
    setVoidError(null);
    try {
      await api.voidOrder(selectedOrder.id, voidReason);
      playBeep('success');
      setShowVoidModal(false);
      setSelectedOrder(null);
      onRefreshOrders();
    } catch (err: any) {
      playBeep('error');
      setVoidError(err.message || 'Failed to void transaction');
    } finally {
      setIsVoiding(false);
    }
  };

  // Handle Refund
  const handleConfirmRefund = async () => {
    if (!selectedOrder) return;
    setIsRefunding(true);
    setRefundError(null);
    try {
      const amt = refundAmount ? parseFloat(refundAmount) : selectedOrder.grandTotal;
      await api.refundOrder(selectedOrder.id, refundReason, amt);
      playBeep('success');
      setShowRefundModal(false);
      setSelectedOrder(null);
      onRefreshOrders();
    } catch (err: any) {
      playBeep('error');
      setRefundError(err.message || 'Failed to process refund');
    } finally {
      setIsRefunding(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-84px)] overflow-hidden bg-[#0A0A0A] text-[#E5E5E5] select-none">
      {/* Search & Filter Toolbar (OR-02 & OR-03) */}
      <div className="p-4 bg-[#0D0D0D] border-b border-[#262626] flex flex-wrap gap-3 items-center justify-between shrink-0">
        <div className="flex flex-1 min-w-[280px] max-w-md relative">
          <Search className="w-4 h-4 text-[#737373] absolute left-3 top-2.5" />
          <input
            id="orders-search-input"
            type="text"
            placeholder="Search order #, customer name, phone, cashier..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-[#141414] border border-[#262626] rounded-lg pl-9 pr-3 py-2 text-xs text-[#E5E5E5] placeholder:text-[#666666] focus:outline-hidden focus:border-[#C5A059]"
          />
        </div>

        <div className="flex items-center space-x-2">
          {/* Status Filter */}
          <select
            id="orders-status-filter"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-[#141414] border border-[#262626] rounded-lg px-3 py-2 text-xs text-[#E5E5E5] focus:outline-hidden focus:border-[#C5A059] cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="voided">Voided</option>
            <option value="refunded">Refunded</option>
          </select>

          {/* Payment Method Filter */}
          <select
            id="orders-payment-filter"
            value={paymentFilter}
            onChange={e => setPaymentFilter(e.target.value)}
            className="bg-[#141414] border border-[#262626] rounded-lg px-3 py-2 text-xs text-[#E5E5E5] focus:outline-hidden focus:border-[#C5A059] cursor-pointer"
          >
            <option value="all">All Payment Types</option>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="contactless">Contactless</option>
            <option value="split">Split</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="bg-[#0F0F0F] border border-[#262626] rounded-xl overflow-hidden shadow-md">
          <table className="w-full text-left text-xs text-[#D4D4D4]">
            <thead className="bg-[#0A0A0A] text-[#737373] uppercase text-[10px] tracking-widest border-b border-[#262626] font-bold">
              <tr>
                <th className="px-4 py-3.5">Order Number</th>
                <th className="px-4 py-3.5">Date & Time</th>
                <th className="px-4 py-3.5">Cashier</th>
                <th className="px-4 py-3.5">Customer</th>
                <th className="px-4 py-3.5">Payment</th>
                <th className="px-4 py-3.5 text-right">Grand Total</th>
                <th className="px-4 py-3.5 text-center">Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F1F1F] font-mono">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-[#737373] font-sans">
                    No transactions found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredOrders.map(order => (
                  <tr
                    key={order.id}
                    className="hover:bg-[#161616] transition-colors cursor-pointer"
                    onClick={() => setSelectedOrder(order)}
                  >
                    <td className="px-4 py-3 font-bold text-[#C5A059] font-mono">
                      {order.orderNumber}
                    </td>
                    <td className="px-4 py-3 text-[#737373] font-sans">
                      {new Date(order.createdAt).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3 font-sans text-[#D4D4D4] truncate max-w-[140px]">
                      {order.cashierName}
                    </td>
                    <td className="px-4 py-3 font-sans text-[#D4D4D4]">
                      {order.customerName ? (
                        <span className="font-semibold text-[#F5F5F5]">{order.customerName}</span>
                      ) : (
                        <span className="text-[#525252] italic">Walk-in</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-sans">
                      <span className="inline-flex items-center space-x-1 uppercase text-[10px] font-bold tracking-wider bg-[#141414] border border-[#262626] px-2 py-0.5 rounded text-[#A3A3A3]">
                        {order.payment.method}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-[#F5F5F5]">
                      ${(order.grandTotal ?? 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center font-sans">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          order.status === 'completed'
                            ? 'bg-green-950/40 text-green-300 border border-green-800'
                            : order.status === 'voided'
                            ? 'bg-red-950/40 text-red-300 border border-red-800'
                            : 'bg-[#C5A059]/15 text-[#C5A059] border border-[#C5A059]/40'
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-sans" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="p-1.5 text-[#737373] hover:text-[#C5A059] hover:bg-[#1A1A1A] rounded transition-colors cursor-pointer"
                          title="View Order Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onReprintReceipt(order)}
                          className="p-1.5 text-[#737373] hover:text-white hover:bg-[#1A1A1A] rounded transition-colors cursor-pointer"
                          title="Reprint Receipt (CA-08)"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail Modal (OR-01 & OR-03) */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 select-none">
          <div className="bg-[#0F0F0F] border border-[#262626] rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden text-[#E5E5E5] animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-[#0A0A0A] px-6 py-4 border-b border-[#262626] flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-serif italic font-bold text-xl text-[#C5A059]">
                    {selectedOrder.orderNumber}
                  </h3>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      selectedOrder.status === 'completed'
                        ? 'bg-green-950/40 text-green-300 border border-green-800'
                        : selectedOrder.status === 'voided'
                        ? 'bg-red-950/40 text-red-300 border border-red-800'
                        : 'bg-[#C5A059]/15 text-[#C5A059] border border-[#C5A059]/40'
                    }`}
                  >
                    {selectedOrder.status}
                  </span>
                </div>
                <p className="text-xs text-[#737373] mt-0.5">
                  {new Date(selectedOrder.createdAt).toLocaleString()} • Cashier: {selectedOrder.cashierName}
                </p>
              </div>

              <button
                onClick={() => setSelectedOrder(null)}
                className="text-[#737373] hover:text-white p-1 rounded cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {/* Customer Info if Attached */}
              {selectedOrder.customerName && (
                <div className="bg-[#141414] p-3 rounded-lg border border-[#262626] text-xs">
                  <span className="font-bold uppercase tracking-wider text-[#737373]">Customer:</span>{' '}
                  <span className="text-[#F5F5F5] font-bold">{selectedOrder.customerName}</span>{' '}
                  {selectedOrder.customerPhone && (
                    <span className="text-[#737373]">({selectedOrder.customerPhone})</span>
                  )}
                </div>
              )}

              {/* Items Table */}
              <div>
                <h4 className="text-xs font-bold text-[#737373] uppercase tracking-wider mb-2">
                  Line Items ({selectedOrder.items.length})
                </h4>
                <div className="bg-[#141414] rounded-lg border border-[#262626] divide-y divide-[#1F1F1F]">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="p-3 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-medium text-[#E5E5E5]">{item.product.name}</div>
                        <div className="text-[11px] text-[#737373] font-mono mt-0.5">
                          {item.quantity} × ${(item.unitPrice ?? 0).toFixed(2)} ({item.product.size})
                        </div>
                        {(item.discountAmount ?? 0) > 0 && (
                          <div className="text-[10px] text-green-400 font-mono">
                            Discount: -${(item.discountAmount ?? 0).toFixed(2)}
                          </div>
                        )}
                      </div>
                      <div className="font-mono font-bold text-[#F5F5F5]">
                        ${(((item.unitPrice ?? 0) * item.quantity) - (item.discountAmount ?? 0)).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Totals */}
              <div className="bg-[#141414] p-4 rounded-lg border border-[#262626] space-y-1.5 text-xs font-mono">
                <div className="flex justify-between text-[#737373]">
                  <span>Subtotal:</span>
                  <span>${(selectedOrder.subtotal ?? 0).toFixed(2)}</span>
                </div>
                {(selectedOrder.discountTotal ?? 0) > 0 && (
                  <div className="flex justify-between text-green-400">
                    <span>Discount:</span>
                    <span>-${(selectedOrder.discountTotal ?? 0).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[#737373]">
                  <span>Tax:</span>
                  <span>${(selectedOrder.taxTotal ?? 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-[#C5A059] pt-2 border-t border-[#262626]">
                  <span>Grand Total:</span>
                  <span>${(selectedOrder.grandTotal ?? 0).toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Detail */}
              <div className="bg-[#141414] p-3 rounded-lg border border-[#262626] text-xs flex justify-between items-center">
                <div>
                  <span className="text-[#737373] uppercase font-bold tracking-wider">Payment: </span>
                  <span className="text-[#E5E5E5] font-bold uppercase">{selectedOrder.payment.method}</span>
                  {selectedOrder.payment.cardLast4 && (
                    <span className="text-[#737373] ml-2">
                      ({selectedOrder.payment.cardBrand} ending in {selectedOrder.payment.cardLast4})
                    </span>
                  )}
                </div>
                {selectedOrder.payment.authCode && (
                  <span className="font-mono text-[#737373] text-[11px]">
                    Auth: {selectedOrder.payment.authCode}
                  </span>
                )}
              </div>

              {/* Void / Refund details if applicable */}
              {selectedOrder.status === 'voided' && (
                <div className="p-3 rounded-lg bg-red-950/40 border border-red-800 text-red-300 text-xs space-y-1">
                  <div className="font-bold flex items-center space-x-1">
                    <Ban className="w-3.5 h-3.5" />
                    <span>Transaction Voided</span>
                  </div>
                  <div>Reason: {selectedOrder.voidReason}</div>
                  <div className="text-[10px] text-red-400">Voided by: {selectedOrder.voidedBy}</div>
                </div>
              )}

              {selectedOrder.status === 'refunded' && (
                <div className="p-3 rounded-lg bg-[#C5A059]/15 border border-[#C5A059]/40 text-[#C5A059] text-xs space-y-1">
                  <div className="font-bold flex items-center space-x-1">
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Transaction Refunded (${(selectedOrder.refundAmount ?? 0).toFixed(2)})</span>
                  </div>
                  <div>Reason: {selectedOrder.refundReason}</div>
                  <div className="text-[10px] text-[#C5A059]/80">Refunded by: {selectedOrder.refundedBy}</div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="bg-[#0A0A0A] px-6 py-3 border-t border-[#262626] flex items-center justify-between">
              <button
                id="order-reprint-btn"
                onClick={() => onReprintReceipt(selectedOrder)}
                className="px-3.5 py-1.5 rounded-lg bg-[#141414] hover:bg-[#1F1F1F] text-[#E5E5E5] text-xs font-bold uppercase tracking-wider border border-[#262626] flex items-center space-x-1.5 cursor-pointer transition-colors"
              >
                <Printer className="w-3.5 h-3.5 text-[#C5A059]" />
                <span>Print Receipt</span>
              </button>

              <div className="flex space-x-2">
                {selectedOrder.status === 'completed' && isManagerOrAdmin && (
                  <>
                    <button
                      id="order-refund-btn"
                      onClick={() => {
                        setRefundAmount((selectedOrder.grandTotal ?? 0).toFixed(2));
                        setShowRefundModal(true);
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-[#C5A059]/15 hover:bg-[#C5A059]/25 text-[#C5A059] border border-[#C5A059]/40 text-xs font-bold uppercase tracking-wider flex items-center space-x-1 cursor-pointer transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Refund (OR-05)</span>
                    </button>

                    <button
                      id="order-void-btn"
                      onClick={() => setShowVoidModal(true)}
                      className="px-3.5 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-950/60 text-red-300 border border-red-800 text-xs font-bold uppercase tracking-wider flex items-center space-x-1 cursor-pointer transition-colors"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>Void Order (OR-04)</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Void Modal Confirmation (OR-04) */}
      {showVoidModal && selectedOrder && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 select-none">
          <div className="bg-[#0F0F0F] border border-red-900/60 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden text-[#E5E5E5] p-6 space-y-4">
            <div className="flex items-center space-x-2 text-red-400">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-bold text-base">Void Transaction {selectedOrder.orderNumber}</h3>
            </div>
            <p className="text-xs text-[#737373]">
              Voiding an order cancels the sale, restores item inventory quantities to the catalog, and records an audit log entry.
            </p>

            {voidError && (
              <div className="p-2.5 rounded bg-red-950/40 border border-red-800 text-red-300 text-xs">
                {voidError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#A3A3A3] mb-1.5">Reason for Void *</label>
              <textarea
                id="void-reason-input"
                rows={3}
                value={voidReason}
                onChange={e => setVoidReason(e.target.value)}
                className="w-full bg-[#141414] border border-[#262626] rounded-lg p-2.5 text-xs text-[#E5E5E5] focus:outline-hidden focus:border-red-500"
                placeholder="Explain why transaction is being voided..."
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowVoidModal(false)}
                disabled={isVoiding}
                className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider text-[#737373] hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="void-confirm-submit"
                type="button"
                onClick={handleConfirmVoid}
                disabled={isVoiding || !voidReason.trim()}
                className="px-4 py-1.5 rounded-lg bg-red-700 hover:bg-red-600 text-white font-bold uppercase tracking-wider text-xs cursor-pointer shadow-md transition-colors"
              >
                {isVoiding ? 'Voiding...' : 'Confirm Void Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refund Modal Confirmation (OR-05) */}
      {showRefundModal && selectedOrder && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 select-none">
          <div className="bg-[#0F0F0F] border border-[#262626] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden text-[#E5E5E5] p-6 space-y-4">
            <div className="flex items-center space-x-2 text-[#C5A059]">
              <RotateCcw className="w-5 h-5" />
              <h3 className="font-serif italic font-bold text-lg text-[#F5F5F5]">Refund Order {selectedOrder.orderNumber}</h3>
            </div>
            <p className="text-xs text-[#737373]">
              Processing a refund restores product stock, adjusts sales analytics, and logs a manager audit entry.
            </p>

            {refundError && (
              <div className="p-2.5 rounded bg-red-950/40 border border-red-800 text-red-300 text-xs">
                {refundError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#A3A3A3] mb-1.5">Refund Amount ($)</label>
              <input
                id="refund-amount-input"
                type="number"
                step="0.01"
                max={selectedOrder.grandTotal}
                value={refundAmount}
                onChange={e => setRefundAmount(e.target.value)}
                className="w-full bg-[#141414] border border-[#262626] rounded-lg p-2.5 text-sm text-[#E5E5E5] font-mono focus:outline-hidden focus:border-[#C5A059]"
              />
              <span className="text-[11px] text-[#737373] mt-1 block">Max refundable: ${(selectedOrder.grandTotal ?? 0).toFixed(2)}</span>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#A3A3A3] mb-1.5">Reason for Refund *</label>
              <textarea
                id="refund-reason-input"
                rows={3}
                value={refundReason}
                onChange={e => setRefundReason(e.target.value)}
                className="w-full bg-[#141414] border border-[#262626] rounded-lg p-2.5 text-xs text-[#E5E5E5] focus:outline-hidden focus:border-[#C5A059]"
                placeholder="Reason for return / refund..."
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRefundModal(false)}
                disabled={isRefunding}
                className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider text-[#737373] hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="refund-confirm-submit"
                type="button"
                onClick={handleConfirmRefund}
                disabled={isRefunding || !refundReason.trim()}
                className="px-4 py-1.5 rounded-lg bg-[#C5A059] hover:bg-[#D4B06A] text-black font-bold uppercase tracking-wider text-xs cursor-pointer shadow-md transition-colors"
              >
                {isRefunding ? 'Processing...' : 'Confirm Refund'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
