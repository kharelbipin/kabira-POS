import { db } from './db.js';
import {
  Shift,
  ShiftDenominationCount,
  ShiftReconciliation,
  ShiftSummarySnapshot,
  ShiftCashMovement,
  ShiftPaymentMethodBreakdown,
  ShiftHourlySales,
  ShiftTopProduct,
  Order,
} from '../src/types.js';

// Helper to convert denominations to dollar total
export function calculateDenominationTotal(d: ShiftDenominationCount): number {
  const total =
    (d.d100 || 0) * 100 +
    (d.d50 || 0) * 50 +
    (d.d20 || 0) * 20 +
    (d.d10 || 0) * 10 +
    (d.d5 || 0) * 5 +
    (d.d2 || 0) * 2 +
    (d.d1 || 0) * 1 +
    (d.c50 || 0) * 0.5 +
    (d.c25 || 0) * 0.25 +
    (d.c10 || 0) * 0.1 +
    (d.c5 || 0) * 0.05 +
    (d.c1 || 0) * 0.01;
  return Math.round(total * 100) / 100;
}

// Calculate real-time or final summary for a shift
export function calculateShiftSummary(shift: Shift): ShiftSummarySnapshot {
  const startTime = new Date(shift.startTime).getTime();
  const endTime = shift.endTime ? new Date(shift.endTime).getTime() : Date.now();

  // Find all orders that fall within the shift timeframe
  // In POS environment, match orders during shift
  const shiftOrders = db.orders.filter(order => {
    const orderTime = new Date(order.createdAt).getTime();
    return orderTime >= startTime && orderTime <= endTime;
  });

  let grossSales = 0;
  let netSales = 0;
  let taxCollected = 0;
  let discountsTotal = 0;
  let refundsTotal = 0;
  let voidsTotal = 0;
  let itemsSold = 0;
  let cashSales = 0;
  let cashRefunds = 0;

  const paymentMap: Record<string, { count: number; amount: number; label: string }> = {
    cash: { count: 0, amount: 0, label: 'Cash' },
    card: { count: 0, amount: 0, label: 'Credit / Debit Card' },
    contactless: { count: 0, amount: 0, label: 'Mobile / Contactless' },
    split: { count: 0, amount: 0, label: 'Split Payment' },
  };

  const hourlyMap: Record<string, { sales: number; transactions: number }> = {};
  const productMap: Record<string, { name: string; sku: string; quantity: number; sales: number }> = {};

  for (const order of shiftOrders) {
    if (order.status === 'completed') {
      grossSales += order.subtotal + (order.discountTotal || 0);
      netSales += order.subtotal - (order.discountTotal || 0);
      taxCollected += order.taxTotal;
      discountsTotal += order.discountTotal || 0;

      const orderHour = new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }).slice(0, 2) + ':00';
      if (!hourlyMap[orderHour]) {
        hourlyMap[orderHour] = { sales: 0, transactions: 0 };
      }
      hourlyMap[orderHour].sales += order.grandTotal;
      hourlyMap[orderHour].transactions += 1;

      // Payment breakdown
      const method = order.payment?.method?.toLowerCase() || 'card';
      if (!paymentMap[method]) {
        paymentMap[method] = { count: 0, amount: 0, label: method.toUpperCase() };
      }
      paymentMap[method].count += 1;
      paymentMap[method].amount += order.grandTotal;

      if (method === 'cash') {
        cashSales += order.grandTotal;
      }

      // Line items
      if (order.items) {
        for (const item of order.items) {
          itemsSold += item.quantity;
          const prodId = item.product?.id || 'unknown';
          const prodName = item.product?.name || 'Unknown Product';
          const prodSku = item.product?.sku || 'N/A';
          const lineTotal = item.lineTotal || (item.unitPrice * item.quantity);

          if (!productMap[prodId]) {
            productMap[prodId] = {
              name: prodName,
              sku: prodSku,
              quantity: 0,
              sales: 0,
            };
          }
          productMap[prodId].quantity += item.quantity;
          productMap[prodId].sales += lineTotal;
        }
      }
    } else if (order.status === 'refunded') {
      refundsTotal += order.grandTotal;
      if (order.payment?.method?.toLowerCase() === 'cash') {
        cashRefunds += order.grandTotal;
      }
    } else if (order.status === 'voided') {
      voidsTotal += order.grandTotal;
    }
  }

  // Cash movements (Paid In / Payouts)
  let paidInTotal = 0;
  let payoutsTotal = 0;
  if (shift.cashMovements) {
    for (const mov of shift.cashMovements) {
      if (mov.type === 'paid_in') {
        paidInTotal += mov.amount;
      } else if (mov.type === 'payout') {
        payoutsTotal += mov.amount;
      }
    }
  }

  // Check cashing paid out in cash during this shift
  // Any cashing transaction paid during this shift reduces cash in drawer
  const shiftCashedChecks = db.checkCashingTransactions.filter(cc => {
    if (cc.status !== 'paid' && cc.status !== 'ready_for_deposit' && cc.status !== 'deposited' && cc.status !== 'cleared') return false;
    if (!cc.paidAt) return false;
    const paidTime = new Date(cc.paidAt).getTime();
    return paidTime >= startTime && paidTime <= endTime;
  });

  for (const cc of shiftCashedChecks) {
    // Face value - fee was paid out to customer
    payoutsTotal += cc.customerPayoutAmount;
    // Fee collected is positive income
    paidInTotal += cc.finalFee;
  }

  const expectedCash = Math.round((shift.startingCash + cashSales - cashRefunds - payoutsTotal + paidInTotal) * 100) / 100;
  const totalCompletedTransactions = shiftOrders.filter(o => o.status === 'completed').length;
  const grandTotalSales = Math.round((netSales + taxCollected) * 100) / 100;

  const paymentBreakdown: ShiftPaymentMethodBreakdown[] = Object.entries(paymentMap)
    .filter(([_, data]) => data.count > 0 || data.amount > 0)
    .map(([key, data]) => ({
      method: key,
      label: data.label,
      count: data.count,
      amount: Math.round(data.amount * 100) / 100,
      percentage: grandTotalSales > 0 ? Math.round((data.amount / grandTotalSales) * 1000) / 10 : 0,
    }));

  const hourlyTrends: ShiftHourlySales[] = Object.entries(hourlyMap)
    .sort(([hA], [hB]) => hA.localeCompare(hB))
    .map(([hour, stats]) => ({
      hour,
      sales: Math.round(stats.sales * 100) / 100,
      transactions: stats.transactions,
    }));

  const topProducts: ShiftTopProduct[] = Object.entries(productMap)
    .sort((a, b) => b[1].quantity - a[1].quantity)
    .slice(0, 5)
    .map(([id, prod]) => ({
      productId: id,
      name: prod.name,
      sku: prod.sku,
      quantitySold: prod.quantity,
      salesAmount: Math.round(prod.sales * 100) / 100,
    }));

  const checksCashedVolume = shiftCashedChecks.reduce((sum, c) => sum + c.customerPayoutAmount, 0);
  const checksCashedCount = shiftCashedChecks.length;
  const cashDropsTotal = shift.cashMovements?.filter(m => m.type === 'payout' || (m as any).type === 'cash_drop').reduce((sum, m) => sum + m.amount, 0) || 0;

  return {
    grossSales: Math.round(grossSales * 100) / 100,
    netSales: Math.round(netSales * 100) / 100,
    taxCollected: Math.round(taxCollected * 100) / 100,
    discountsTotal: Math.round(discountsTotal * 100) / 100,
    refundsTotal: Math.round(refundsTotal * 100) / 100,
    voidsTotal: Math.round(voidsTotal * 100) / 100,
    payoutsTotal: Math.round(payoutsTotal * 100) / 100,
    paidInTotal: Math.round(paidInTotal * 100) / 100,
    totalTransactions: totalCompletedTransactions,
    totalOrders: totalCompletedTransactions,
    itemsSold,
    averageOrderValue: totalCompletedTransactions > 0 ? Math.round((grandTotalSales / totalCompletedTransactions) * 100) / 100 : 0,
    cashSales: Math.round(cashSales * 100) / 100,
    cardSales: Math.round((paymentMap.card?.amount || 0) * 100) / 100,
    cashRefunds: Math.round(cashRefunds * 100) / 100,
    startingCash: shift.startingCash,
    expectedCash,
    expectedCashInDrawer: expectedCash,
    paymentMethods: paymentMap,
    checksCashedVolume: Math.round(checksCashedVolume * 100) / 100,
    checksCashedCount,
    cashDropsTotal: Math.round(cashDropsTotal * 100) / 100,
    paymentBreakdown,
    hourlyTrends,
    topProducts,
  };
}
