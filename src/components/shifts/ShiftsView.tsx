import React, { useState, useEffect, useCallback } from 'react';
import {
  Shift,
  ShiftDenominationCount,
  ShiftReconciliation,
  ShiftSummarySnapshot,
  User,
  StoreSettings,
} from '../../types';
import { api } from '../../utils/api';
import { playBeep } from '../../utils/audio';
import {
  Clock,
  DollarSign,
  ArrowDownRight,
  ArrowUpRight,
  AlertTriangle,
  CheckCircle2,
  Printer,
  Mail,
  RefreshCw,
  PlusCircle,
  Coins,
  FileSpreadsheet,
  Lock,
  Unlock,
  CreditCard,
  Receipt,
  User as UserIcon,
  ShieldCheck,
  ChevronRight,
  Calculator,
  X,
  History,
  TrendingUp,
} from 'lucide-react';

interface ShiftsViewProps {
  currentUser: User | null;
  settings: StoreSettings | null;
  onRefreshData?: () => void;
}

export const ShiftsView: React.FC<ShiftsViewProps> = ({
  currentUser,
  settings,
  onRefreshData,
}) => {
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [shiftSummary, setShiftSummary] = useState<ShiftSummarySnapshot | null>(null);
  const [durationMinutes, setDurationMinutes] = useState<number>(0);
  const [hasActiveShift, setHasActiveShift] = useState<boolean>(false);
  const [lastClosedShift, setLastClosedShift] = useState<Shift | null>(null);
  const [suggestedStartingCash, setSuggestedStartingCash] = useState<number>(200);
  const [pastShifts, setPastShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modals
  const [showStartShiftModal, setShowStartShiftModal] = useState<boolean>(false);
  const [showCashMovementModal, setShowCashMovementModal] = useState<boolean>(false);
  const [movementType, setMovementType] = useState<'cash_in' | 'cash_drop' | 'payout'>('cash_drop');
  const [showReconcileModal, setShowReconcileModal] = useState<boolean>(false);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [reportType, setReportType] = useState<'x_report' | 'z_report'>('x_report');
  const [selectedShiftForReport, setSelectedShiftForReport] = useState<Shift | null>(null);

  // Load current shift & history
  const loadShiftData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [cur, history] = await Promise.all([
        api.getCurrentShift('reg-1', currentUser?.id),
        api.getShifts(),
      ]);

      setHasActiveShift(cur.hasActiveShift);
      if (cur.hasActiveShift && cur.shift) {
        setActiveShift(cur.shift);
        setShiftSummary(cur.summary || null);
        setDurationMinutes(cur.durationMinutes || 0);
      } else {
        setActiveShift(null);
        setShiftSummary(null);
        setLastClosedShift(cur.lastClosedShift || null);
        if (cur.suggestedStartingCash) {
          setSuggestedStartingCash(cur.suggestedStartingCash);
        }
      }

      const list = Array.isArray(history) ? history : ((history as any)?.shifts || []);
      setPastShifts(list);
    } catch (err) {
      console.error('Failed to load shifts data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    loadShiftData();
  }, [loadShiftData]);

  // Handle open report modal
  const handleOpenXReport = () => {
    if (!activeShift) return;
    setSelectedShiftForReport(activeShift);
    setReportType('x_report');
    setShowReportModal(true);
  };

  const handleOpenZReport = (shift: Shift) => {
    setSelectedShiftForReport(shift);
    setReportType('z_report');
    setShowReportModal(true);
  };

  const formatCurrency = (val?: number) => `$${(val || 0).toFixed(2)}`;

  return (
    <div className="h-full flex flex-col bg-[#0D0D0D] text-[#E5E5E5] overflow-y-auto p-4 sm:p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#262626] pb-4">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-xl sm:text-2xl font-black tracking-wider text-white uppercase flex items-center gap-2">
              <Coins className="w-6 h-6 text-[#C5A059]" />
              Shift & Drawer Management
            </h1>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                hasActiveShift
                  ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                  : 'bg-amber-950/80 text-amber-400 border border-amber-800/60'
              }`}
            >
              {hasActiveShift ? '● Shift Active' : '○ No Shift Open'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#888888] mt-1">
            Cash drawer accountability, safe drops, payouts, denomination reconciliation, and Z-Reports.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={loadShiftData}
            disabled={isLoading}
            className="p-2 bg-[#1A1A1A] hover:bg-[#262626] text-[#CCCCCC] hover:text-white rounded-lg border border-[#2A2A2A] transition-colors cursor-pointer"
            title="Refresh shift data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#C5A059]' : ''}`} />
          </button>

          {!hasActiveShift ? (
            <button
              onClick={() => setShowStartShiftModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-[#C5A059] hover:bg-[#B38F46] text-black font-bold text-xs uppercase tracking-wider rounded-lg shadow transition-colors cursor-pointer"
            >
              <Unlock className="w-4 h-4" />
              <span>Open New Shift (SR-01)</span>
            </button>
          ) : (
            <div className="flex items-center space-x-2">
              <button
                onClick={handleOpenXReport}
                className="flex items-center space-x-1.5 px-3 py-2 bg-[#1A1A1A] hover:bg-[#262626] text-[#C5A059] border border-[#C5A059]/40 hover:border-[#C5A059] text-xs font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                title="Mid-day snapshot without closing shift"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>X-Report (SR-04)</span>
              </button>

              <button
                onClick={() => setShowReconcileModal(true)}
                className="flex items-center space-x-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow transition-colors cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                <span>Close Shift & Z-Report (SR-05)</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Active Shift Card or Prompt */}
      {hasActiveShift && activeShift && shiftSummary ? (
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-5 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-[#C5A059] via-amber-400 to-emerald-500" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-[#222222]">
            <div className="flex items-start sm:items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-[#C5A059]/10 border border-[#C5A059]/30 flex items-center justify-center text-[#C5A059] shrink-0">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-3 flex-wrap">
                  <span className="text-lg font-black text-white">{activeShift.shiftNumber}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-[#222222] text-[#AAAAAA] font-mono">
                    Register: {activeShift.registerName || activeShift.registerId}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-[#222222] text-[#AAAAAA] flex items-center gap-1">
                    <UserIcon className="w-3 h-3 text-[#C5A059]" />
                    {activeShift.cashierName}
                  </span>
                </div>
                <div className="flex items-center space-x-4 text-xs text-[#888888] mt-1.5">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#C5A059]" />
                    Opened {new Date(activeShift.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({Math.floor(durationMinutes / 60)}h {durationMinutes % 60}m)
                  </span>
                  <span>•</span>
                  <span>Starting Drawer: <strong className="text-white">{formatCurrency(activeShift.startingCash)}</strong></span>
                </div>
              </div>
            </div>

            {/* Quick Drawer Action Buttons (SR-03) */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  setMovementType('cash_in');
                  setShowCashMovementModal(true);
                }}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#1F2937]/70 hover:bg-[#1F2937] text-sky-400 border border-sky-800/50 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                <ArrowDownRight className="w-3.5 h-3.5" />
                <span>+ Cash In / Float</span>
              </button>

              <button
                onClick={() => {
                  setMovementType('cash_drop');
                  setShowCashMovementModal(true);
                }}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#1F2937]/70 hover:bg-[#1F2937] text-amber-400 border border-amber-800/50 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Safe Drop</span>
              </button>

              <button
                onClick={() => {
                  setMovementType('payout');
                  setShowCashMovementModal(true);
                }}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#1F2937]/70 hover:bg-[#1F2937] text-rose-400 border border-rose-800/50 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Payout / Expense</span>
              </button>
            </div>
          </div>

          {/* Real-time Calculated Drawer Numbers (SR-02) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-5">
            <div className="bg-[#1A1A1A] p-3 rounded-lg border border-[#282828]">
              <span className="text-[10px] uppercase font-bold text-[#888888] tracking-wider block">Live Expected Cash</span>
              <span className="text-xl font-black text-emerald-400 mt-1 block">
                {formatCurrency(shiftSummary.expectedCashInDrawer ?? shiftSummary.expectedCash)}
              </span>
              <span className="text-[10px] text-[#666666]">Should be in drawer</span>
            </div>

            <div className="bg-[#1A1A1A] p-3 rounded-lg border border-[#282828]">
              <span className="text-[10px] uppercase font-bold text-[#888888] tracking-wider block">Cash Sales</span>
              <span className="text-lg font-bold text-white mt-1 block">
                {formatCurrency(shiftSummary.cashSales)}
              </span>
              <span className="text-[10px] text-[#666666]">
                {shiftSummary.paymentMethods?.cash?.count ?? (shiftSummary.paymentBreakdown?.find(p => p.method === 'cash')?.count || 0)} transactions
              </span>
            </div>

            <div className="bg-[#1A1A1A] p-3 rounded-lg border border-[#282828]">
              <span className="text-[10px] uppercase font-bold text-[#888888] tracking-wider block">Card Sales</span>
              <span className="text-lg font-bold text-white mt-1 block">
                {formatCurrency(shiftSummary.cardSales ?? (shiftSummary.paymentBreakdown?.find(p => p.method === 'card')?.amount || 0))}
              </span>
              <span className="text-[10px] text-[#666666]">
                {shiftSummary.paymentMethods?.card?.count ?? (shiftSummary.paymentBreakdown?.find(p => p.method === 'card')?.count || 0)} transactions
              </span>
            </div>

            <div className="bg-[#1A1A1A] p-3 rounded-lg border border-[#282828]">
              <span className="text-[10px] uppercase font-bold text-[#888888] tracking-wider block">Checks Cashed</span>
              <span className="text-lg font-bold text-amber-400 mt-1 block">
                {formatCurrency(shiftSummary.checksCashedVolume || 0)}
              </span>
              <span className="text-[10px] text-[#666666]">{shiftSummary.checksCashedCount || 0} check(s)</span>
            </div>

            <div className="bg-[#1A1A1A] p-3 rounded-lg border border-[#282828]">
              <span className="text-[10px] uppercase font-bold text-[#888888] tracking-wider block">Drops & Payouts</span>
              <span className="text-lg font-bold text-rose-400 mt-1 block">
                -{formatCurrency((shiftSummary.cashDropsTotal || 0) + (shiftSummary.payoutsTotal || 0))}
              </span>
              <span className="text-[10px] text-[#666666]">Safe drops & expenses</span>
            </div>

            <div className="bg-[#1A1A1A] p-3 rounded-lg border border-[#282828]">
              <span className="text-[10px] uppercase font-bold text-[#888888] tracking-wider block">Gross Sales</span>
              <span className="text-lg font-bold text-[#C5A059] mt-1 block">
                {formatCurrency(shiftSummary.grossSales)}
              </span>
              <span className="text-[10px] text-[#666666]">{shiftSummary.totalOrders ?? shiftSummary.totalTransactions ?? 0} total sales</span>
            </div>
          </div>

          {/* Cash Movements Feed inside Shift */}
          {activeShift.cashMovements && activeShift.cashMovements.length > 0 && (
            <div className="mt-5 pt-4 border-t border-[#222222]">
              <h4 className="text-xs uppercase font-bold text-[#AAAAAA] tracking-wider mb-2.5 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-[#C5A059]" />
                Recent Drawer Movements During Shift
              </h4>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {activeShift.cashMovements.map(mov => (
                  <div
                    key={mov.id}
                    className="flex items-center justify-between p-2.5 rounded bg-[#181818] border border-[#242424] text-xs"
                  >
                    <div className="flex items-center space-x-2.5">
                      <span
                        className={`px-1.5 py-0.5 rounded font-bold uppercase text-[10px] ${
                          mov.type === 'cash_in'
                            ? 'bg-sky-950 text-sky-400 border border-sky-800'
                            : mov.type === 'cash_drop'
                            ? 'bg-amber-950 text-amber-400 border border-amber-800'
                            : 'bg-rose-950 text-rose-400 border border-rose-800'
                        }`}
                      >
                        {mov.type.replace('_', ' ')}
                      </span>
                      <span className="text-[#DDDDDD] font-medium">{mov.reason}</span>
                      {mov.managerName && (
                        <span className="text-[#777777] text-[10px]">
                          (Auth by: {mov.managerName})
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <span
                        className={`font-mono font-bold ${
                          mov.type === 'cash_in' ? 'text-sky-400' : 'text-rose-400'
                        }`}
                      >
                        {mov.type === 'cash_in' ? '+' : '-'}{formatCurrency(mov.amount)}
                      </span>
                      <span className="text-[10px] text-[#666666] block font-mono">
                        {new Date(mov.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* No active shift state */
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-8 text-center shadow-lg">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-white uppercase tracking-wider">
            Register Drawer Is Currently Closed
          </h2>
          <p className="text-sm text-[#888888] max-w-md mx-auto mt-2">
            No active shift is open on Register 1. Cash transactions, returns, and check cashing payouts require an open shift drawer for audit compliance.
          </p>

          {lastClosedShift && (
            <div className="mt-4 p-3 bg-[#1A1A1A] border border-[#262626] rounded-lg max-w-sm mx-auto text-xs text-left">
              <span className="text-[#888888] block">Previous Shift #{lastClosedShift.shiftNumber}</span>
              <div className="flex justify-between items-center mt-1">
                <span className="text-[#CCCCCC]">Closed by {lastClosedShift.cashierName}</span>
                <span className="font-mono text-emerald-400 font-bold">
                  Closing Cash: {formatCurrency(lastClosedShift.reconciliation?.actualCash || lastClosedShift.startingCash)}
                </span>
              </div>
            </div>
          )}

          <div className="mt-6">
            <button
              onClick={() => setShowStartShiftModal(true)}
              className="px-6 py-2.5 bg-[#C5A059] hover:bg-[#B38F46] text-black font-black text-xs uppercase tracking-widest rounded-lg shadow transition-colors cursor-pointer inline-flex items-center gap-2"
            >
              <Unlock className="w-4 h-4" />
              Open Shift Now
            </button>
          </div>
        </div>
      )}

      {/* Past Shifts History Table (SR-07) */}
      <div className="bg-[#141414] border border-[#262626] rounded-xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-black uppercase text-white tracking-wider flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-[#C5A059]" />
              Shift Audit Log & Z-Reports History
            </h3>
            <p className="text-xs text-[#888888]">Comprehensive record of all closed register sessions and cash reconciliations.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#262626] text-[#777777] uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">Shift #</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Cashier</th>
                <th className="py-2.5 px-3">Register</th>
                <th className="py-2.5 px-3">Start Time</th>
                <th className="py-2.5 px-3">End Time</th>
                <th className="py-2.5 px-3 text-right">Starting Cash</th>
                <th className="py-2.5 px-3 text-right">Actual Count</th>
                <th className="py-2.5 px-3 text-right">Variance</th>
                <th className="py-2.5 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F1F1F]">
              {pastShifts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-[#666666]">
                    No past shifts found.
                  </td>
                </tr>
              ) : (
                pastShifts.map(shift => {
                  const variance = shift.reconciliation?.variance || 0;
                  const isClosed = shift.status === 'closed';

                  return (
                    <tr key={shift.id} className="hover:bg-[#1A1A1A] transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-white">
                        {shift.shiftNumber}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            shift.status === 'open'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : 'bg-[#222222] text-[#AAAAAA]'
                          }`}
                        >
                          {shift.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-[#CCCCCC]">{shift.cashierName}</td>
                      <td className="py-3 px-3 text-[#888888]">{shift.registerName || shift.registerId}</td>
                      <td className="py-3 px-3 text-[#888888] font-mono">
                        {new Date(shift.startTime).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-3 text-[#888888] font-mono">
                        {shift.endTime
                          ? new Date(shift.endTime).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'In Progress'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-[#CCCCCC]">
                        {formatCurrency(shift.startingCash)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-white">
                        {isClosed && shift.reconciliation
                          ? formatCurrency(shift.reconciliation.actualCash)
                          : '—'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold">
                        {isClosed && shift.reconciliation ? (
                          <span
                            className={
                              Math.abs(variance) < 0.01
                                ? 'text-emerald-400'
                                : variance > 0
                                ? 'text-sky-400'
                                : 'text-rose-400'
                            }
                          >
                            {variance > 0 ? `+${formatCurrency(variance)}` : formatCurrency(variance)}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {isClosed ? (
                          <button
                            onClick={() => handleOpenZReport(shift)}
                            className="px-2.5 py-1 bg-[#222222] hover:bg-[#2E2E2E] text-[#C5A059] rounded font-bold text-[10px] uppercase tracking-wider transition-colors cursor-pointer inline-flex items-center gap-1"
                          >
                            <Printer className="w-3 h-3" />
                            Z-Report
                          </button>
                        ) : (
                          <button
                            onClick={() => setShowReconcileModal(true)}
                            className="px-2.5 py-1 bg-red-950 hover:bg-red-900 text-red-400 border border-red-800/50 rounded font-bold text-[10px] uppercase tracking-wider transition-colors cursor-pointer"
                          >
                            Close
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* START SHIFT MODAL (SR-01) */}
      {showStartShiftModal && (
        <StartShiftModal
          isOpen={showStartShiftModal}
          onClose={() => setShowStartShiftModal(false)}
          currentUser={currentUser}
          suggestedStartingCash={suggestedStartingCash}
          onShiftStarted={() => {
            setShowStartShiftModal(false);
            loadShiftData();
            if (onRefreshData) onRefreshData();
          }}
        />
      )}

      {/* CASH MOVEMENT MODAL (SR-03) */}
      {showCashMovementModal && activeShift && (
        <CashMovementModal
          isOpen={showCashMovementModal}
          onClose={() => setShowCashMovementModal(false)}
          shiftId={activeShift.id}
          initialType={movementType}
          currentUser={currentUser}
          onSuccess={() => {
            setShowCashMovementModal(false);
            loadShiftData();
            playBeep('success');
          }}
        />
      )}

      {/* SHIFT RECONCILIATION & CLOSING MODAL (SR-05, SR-06) */}
      {showReconcileModal && activeShift && (
        <ReconciliationModal
          isOpen={showReconcileModal}
          onClose={() => setShowReconcileModal(false)}
          shift={activeShift}
          summary={shiftSummary}
          currentUser={currentUser}
          onClosedSuccess={closedShift => {
            setShowReconcileModal(false);
            loadShiftData();
            if (onRefreshData) onRefreshData();
            handleOpenZReport(closedShift);
          }}
        />
      )}

      {/* REPORT PRINT/VIEW MODAL (SR-04 X-Report, SR-05 Z-Report) */}
      {showReportModal && selectedShiftForReport && (
        <ShiftReportModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          shift={selectedShiftForReport}
          reportType={reportType}
          settings={settings}
        />
      )}
    </div>
  );
};

// ============================================================================
// SUBCOMPONENT: START SHIFT MODAL
// ============================================================================
interface StartShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  suggestedStartingCash: number;
  onShiftStarted: () => void;
}

const StartShiftModal: React.FC<StartShiftModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  suggestedStartingCash,
  onShiftStarted,
}) => {
  const [startingCash, setStartingCash] = useState<string>(suggestedStartingCash.toFixed(2));
  const [pin, setPin] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin) {
      setErrorMsg('Please enter your cashier PIN to verify drawer opening.');
      return;
    }

    const numStarting = parseFloat(startingCash);
    if (isNaN(numStarting) || numStarting < 0) {
      setErrorMsg('Please enter a valid starting cash amount.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await api.startShift({
        cashierId: currentUser?.id || 'usr-3',
        registerId: 'reg-1',
        registerName: 'Main Liquor Counter (Reg 1)',
        startingCash: numStarting,
        pin,
        notes,
      });

      playBeep('success');
      onShiftStarted();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to start shift. Check PIN.');
      playBeep('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#141414] border border-[#333333] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
        <div className="p-5 border-b border-[#242424] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-[#C5A059]/10 text-[#C5A059]">
              <Unlock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black uppercase text-white tracking-wider">
                Open Cash Drawer Shift
              </h3>
              <p className="text-xs text-[#888888]">Register 1 • 377 Spirits Granbury</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#888888] hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs uppercase font-bold text-[#AAAAAA] tracking-wider mb-1.5">
              Opening Cash Drawer Float ($)
            </label>
            <div className="relative">
              <DollarSign className="w-4 h-4 text-[#888888] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="number"
                step="0.01"
                value={startingCash}
                onChange={e => setStartingCash(e.target.value)}
                className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg pl-9 pr-3 py-2.5 text-white font-mono font-bold focus:outline-none focus:border-[#C5A059]"
                placeholder="200.00"
                required
              />
            </div>
            <p className="text-[11px] text-[#777777] mt-1">
              Standard opening drawer float is $200.00 for change makers.
            </p>
          </div>

          <div>
            <label className="block text-xs uppercase font-bold text-[#AAAAAA] tracking-wider mb-1.5">
              Cashier PIN (Auth Required)
            </label>
            <input
              type="password"
              maxLength={6}
              value={pin}
              onChange={e => setPin(e.target.value)}
              className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-2.5 text-white text-center tracking-widest font-mono text-lg focus:outline-none focus:border-[#C5A059]"
              placeholder="••••"
              required
              autoFocus
            />
            <p className="text-[11px] text-[#777777] mt-1">
              Active cashier: <strong className="text-[#C5A059]">{currentUser?.name || 'Elena Rostova'}</strong> (Demo PIN: 3344)
            </p>
          </div>

          <div>
            <label className="block text-xs uppercase font-bold text-[#AAAAAA] tracking-wider mb-1.5">
              Shift Opening Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C5A059]"
              placeholder="e.g. Received extra roll of quarters from safe"
            />
          </div>

          <div className="pt-2 flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-[#1F1F1F] hover:bg-[#292929] text-[#CCCCCC] rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 bg-[#C5A059] hover:bg-[#B38F46] text-black font-black text-xs uppercase tracking-wider rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              {isSubmitting ? 'Opening...' : 'Start Shift'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// SUBCOMPONENT: CASH MOVEMENT MODAL (SR-03)
// ============================================================================
interface CashMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  shiftId: string;
  initialType: 'cash_in' | 'cash_drop' | 'payout';
  currentUser: User | null;
  onSuccess: () => void;
}

const CashMovementModal: React.FC<CashMovementModalProps> = ({
  isOpen,
  onClose,
  shiftId,
  initialType,
  currentUser,
  onSuccess,
}) => {
  const [type, setType] = useState<'cash_in' | 'cash_drop' | 'payout'>(initialType);
  const [amount, setAmount] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [managerPin, setManagerPin] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg('Please enter a valid positive dollar amount.');
      return;
    }

    if (!reason.trim()) {
      setErrorMsg('A detailed reason is mandatory for drawer audit trails.');
      return;
    }

    // Payouts or safe drops > $500 require manager pin
    if (type === 'payout' && !managerPin) {
      setErrorMsg('Manager PIN authorization is required for cash payouts.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await api.recordCashMovement(shiftId, {
        type,
        amount: numAmount,
        reason,
        managerPin: managerPin || undefined,
      });

      onSuccess();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to record cash movement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#141414] border border-[#333333] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
        <div className="p-5 border-b border-[#242424] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div
              className={`p-2 rounded-lg ${
                type === 'cash_in'
                  ? 'bg-sky-500/10 text-sky-400'
                  : type === 'cash_drop'
                  ? 'bg-amber-500/10 text-amber-400'
                  : 'bg-rose-500/10 text-rose-400'
              }`}
            >
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black uppercase text-white tracking-wider">
                Drawer Cash Movement
              </h3>
              <p className="text-xs text-[#888888]">Live Cash Drop / In / Payout Audit</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#888888] hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Movement Type Tabs */}
          <div className="grid grid-cols-3 gap-2 bg-[#1A1A1A] p-1 rounded-lg border border-[#2A2A2A]">
            <button
              type="button"
              onClick={() => setType('cash_in')}
              className={`py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all cursor-pointer ${
                type === 'cash_in'
                  ? 'bg-sky-500 text-black shadow'
                  : 'text-[#888888] hover:text-white'
              }`}
            >
              + Cash In
            </button>
            <button
              type="button"
              onClick={() => setType('cash_drop')}
              className={`py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all cursor-pointer ${
                type === 'cash_drop'
                  ? 'bg-amber-500 text-black shadow'
                  : 'text-[#888888] hover:text-white'
              }`}
            >
              Safe Drop
            </button>
            <button
              type="button"
              onClick={() => setType('payout')}
              className={`py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all cursor-pointer ${
                type === 'payout'
                  ? 'bg-rose-500 text-white shadow'
                  : 'text-[#888888] hover:text-white'
              }`}
            >
              Payout
            </button>
          </div>

          <div>
            <label className="block text-xs uppercase font-bold text-[#AAAAAA] tracking-wider mb-1.5">
              Amount ($)
            </label>
            <div className="relative">
              <DollarSign className="w-4 h-4 text-[#888888] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg pl-9 pr-3 py-2.5 text-white font-mono font-bold focus:outline-none focus:border-[#C5A059]"
                placeholder="100.00"
                required
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase font-bold text-[#AAAAAA] tracking-wider mb-1.5">
              Reason / Destination
            </label>
            <input
              type="text"
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C5A059]"
              placeholder={
                type === 'cash_drop'
                  ? 'e.g. Mid-day $500 safe drop (Excess $20s)'
                  : type === 'payout'
                  ? 'e.g. Ice delivery fee / Store supplies reimbursement'
                  : 'e.g. Added $100 change float from back safe'
              }
              required
            />
          </div>

          <div>
            <label className="block text-xs uppercase font-bold text-[#AAAAAA] tracking-wider mb-1.5">
              Manager PIN {type === 'payout' ? '(Required)' : '(Optional if > $500)'}
            </label>
            <input
              type="password"
              maxLength={6}
              value={managerPin}
              onChange={e => setManagerPin(e.target.value)}
              className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-2 text-xs text-white font-mono text-center tracking-widest focus:outline-none focus:border-[#C5A059]"
              placeholder="••••"
            />
            <p className="text-[10px] text-[#666666] mt-1">Manager PIN: 1122</p>
          </div>

          <div className="pt-2 flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-[#1F1F1F] hover:bg-[#292929] text-[#CCCCCC] rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex-1 py-2.5 font-black text-xs uppercase tracking-wider rounded-lg transition-colors cursor-pointer ${
                type === 'cash_in'
                  ? 'bg-sky-500 hover:bg-sky-400 text-black'
                  : type === 'cash_drop'
                  ? 'bg-amber-500 hover:bg-amber-400 text-black'
                  : 'bg-rose-500 hover:bg-rose-400 text-white'
              }`}
            >
              {isSubmitting ? 'Recording...' : 'Confirm Movement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// SUBCOMPONENT: RECONCILIATION & CLOSING MODAL (SR-05, SR-06)
// ============================================================================
interface ReconciliationModalProps {
  isOpen: boolean;
  onClose: () => void;
  shift: Shift;
  summary: ShiftSummarySnapshot | null;
  currentUser: User | null;
  onClosedSuccess: (closedShift: Shift) => void;
}

const ReconciliationModal: React.FC<ReconciliationModalProps> = ({
  isOpen,
  onClose,
  shift,
  summary,
  currentUser,
  onClosedSuccess,
}) => {
  const [denominations, setDenominations] = useState<ShiftDenominationCount>({
    hundreds: 0,
    fifties: 0,
    twenties: 0,
    tens: 0,
    fives: 0,
    ones: 0,
    halves: 0,
    quarters: 0,
    dimes: 0,
    nickels: 0,
    pennies: 0,
    rolls: 0,
  });

  const [notes, setNotes] = useState<string>('');
  const [managerOverridePin, setManagerOverridePin] = useState<string>('');
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Calculate live total from entered counts
  const totalCounted =
    denominations.hundreds * 100 +
    denominations.fifties * 50 +
    denominations.twenties * 20 +
    denominations.tens * 10 +
    denominations.fives * 5 +
    denominations.ones * 1 +
    denominations.halves * 0.5 +
    denominations.quarters * 0.25 +
    denominations.dimes * 0.1 +
    denominations.nickels * 0.05 +
    denominations.pennies * 0.01 +
    (denominations.rolls || 0);

  const expectedCash = summary?.expectedCashInDrawer ?? summary?.expectedCash ?? shift.startingCash;
  const variance = totalCounted - expectedCash;
  const varianceExceeded = Math.abs(variance) > 5.0; // Tolerance is $5.00

  const handleDenomChange = (field: keyof ShiftDenominationCount, value: string) => {
    const num = parseInt(value, 10);
    setDenominations(prev => ({
      ...prev,
      [field]: isNaN(num) || num < 0 ? 0 : num,
    }));
  };

  const handleCloseShiftSubmit = async () => {
    if (varianceExceeded && !managerOverridePin) {
      setErrorMsg(`Drawer variance of $${Math.abs(variance).toFixed(2)} exceeds the $5.00 tolerance. Manager PIN override is required.`);
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await api.closeShift(shift.id, {
        denominations,
        notes,
        managerOverridePin: managerOverridePin || undefined,
        overrideReason: overrideReason || undefined,
      });

      playBeep('success');
      onClosedSuccess(res.shift);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to close shift.');
      playBeep('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#141414] border border-[#333333] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="p-5 border-b border-[#242424] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-red-500/10 text-red-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black uppercase text-white tracking-wider">
                Reconcile & Close Shift (Z-Report)
              </h3>
              <p className="text-xs text-[#888888]">
                {shift.shiftNumber} • Cashier: {shift.cashierName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#888888] hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Variance Comparison Banner */}
          <div className="grid grid-cols-3 gap-3 bg-[#1A1A1A] p-4 rounded-xl border border-[#282828]">
            <div>
              <span className="text-[10px] uppercase font-bold text-[#888888] block">Expected Drawer</span>
              <span className="text-lg font-black text-white mt-0.5 block font-mono">
                ${expectedCash.toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-[#888888] block">Counted Cash</span>
              <span className="text-lg font-black text-[#C5A059] mt-0.5 block font-mono">
                ${totalCounted.toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-[#888888] block">Variance</span>
              <span
                className={`text-lg font-black mt-0.5 block font-mono ${
                  Math.abs(variance) < 0.01
                    ? 'text-emerald-400'
                    : variance > 0
                    ? 'text-sky-400'
                    : 'text-rose-400'
                }`}
              >
                {variance > 0 ? `+$${variance.toFixed(2)}` : `-$${Math.abs(variance).toFixed(2)}`}
              </span>
            </div>
          </div>

          {/* Denomination Counter (SR-06) */}
          <div>
            <h4 className="text-xs uppercase font-bold text-[#CCCCCC] tracking-wider mb-2 flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-[#C5A059]" />
              Denomination Breakdown (Enter Physical Counts)
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {[
                { label: '$100 Bills', field: 'hundreds', mult: 100 },
                { label: '$50 Bills', field: 'fifties', mult: 50 },
                { label: '$20 Bills', field: 'twenties', mult: 20 },
                { label: '$10 Bills', field: 'tens', mult: 10 },
                { label: '$5 Bills', field: 'fives', mult: 5 },
                { label: '$1 Bills', field: 'ones', mult: 1 },
                { label: 'Half Dollars ($0.50)', field: 'halves', mult: 0.5 },
                { label: 'Quarters ($0.25)', field: 'quarters', mult: 0.25 },
                { label: 'Dimes ($0.10)', field: 'dimes', mult: 0.1 },
                { label: 'Nickels ($0.05)', field: 'nickels', mult: 0.05 },
                { label: 'Pennies ($0.01)', field: 'pennies', mult: 0.01 },
                { label: 'Loose / Rolled Coin ($)', field: 'rolls', mult: 1 },
              ].map(item => {
                const count = denominations[item.field as keyof ShiftDenominationCount] || 0;
                const subtotal = count * item.mult;

                return (
                  <div key={item.field} className="bg-[#181818] p-2.5 rounded-lg border border-[#282828] flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-[#CCCCCC] block">{item.label}</span>
                      <span className="text-[10px] text-[#777777] font-mono">${subtotal.toFixed(2)}</span>
                    </div>
                    <input
                      type="number"
                      min="0"
                      value={count || ''}
                      onChange={e => handleDenomChange(item.field as keyof ShiftDenominationCount, e.target.value)}
                      placeholder="0"
                      className="w-16 bg-[#111111] border border-[#333333] rounded px-2 py-1 text-center font-mono text-xs text-white focus:outline-none focus:border-[#C5A059]"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Manager Override Section if variance exceeds threshold */}
          {varianceExceeded && (
            <div className="p-3.5 bg-amber-950/30 border border-amber-800/60 rounded-xl space-y-2.5">
              <div className="flex items-center space-x-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4" />
                <span>Variance Threshold Exceeded (Tolerance: $5.00)</span>
              </div>
              <p className="text-[11px] text-[#BBBBBB]">
                A variance of ${Math.abs(variance).toFixed(2)} requires manager PIN authorization and a documented audit reason.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="text-[10px] text-[#AAAAAA] uppercase block mb-1">Manager PIN</label>
                  <input
                    type="password"
                    maxLength={6}
                    value={managerOverridePin}
                    onChange={e => setManagerOverridePin(e.target.value)}
                    className="w-full bg-[#111111] border border-[#333333] rounded px-2.5 py-1.5 text-xs text-white font-mono tracking-widest text-center focus:outline-none focus:border-[#C5A059]"
                    placeholder="••••"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#AAAAAA] uppercase block mb-1">Override Reason</label>
                  <input
                    type="text"
                    value={overrideReason}
                    onChange={e => setOverrideReason(e.target.value)}
                    className="w-full bg-[#111111] border border-[#333333] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#C5A059]"
                    placeholder="e.g. Unaccounted coin shortage"
                  />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs uppercase font-bold text-[#AAAAAA] tracking-wider mb-1.5">
              Shift Closing Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[#C5A059]"
              placeholder="Optional notes regarding register count or store incidents..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#242424] bg-[#111111] flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#1F1F1F] hover:bg-[#292929] text-[#CCCCCC] rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleCloseShiftSubmit}
            className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-lg"
          >
            <Lock className="w-4 h-4" />
            {isSubmitting ? 'Closing...' : 'Close Shift & Finalize Z-Report'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// SUBCOMPONENT: SHIFT REPORT MODAL (X-REPORT & Z-REPORT)
// ============================================================================
interface ShiftReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  shift: Shift;
  reportType: 'x_report' | 'z_report';
  settings: StoreSettings | null;
}

const ShiftReportModal: React.FC<ShiftReportModalProps> = ({
  isOpen,
  onClose,
  shift,
  reportType,
  settings,
}) => {
  const [emailTo, setEmailTo] = useState<string>('manager@377spirits.com');
  const [isSendingEmail, setIsSendingEmail] = useState<boolean>(false);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const isZReport = reportType === 'z_report';
  const snapshot = shift.reconciliation || shift;

  const handlePrint = () => {
    window.print();
  };

  const handleSendEmail = async () => {
    if (!emailTo) return;
    setIsSendingEmail(true);
    setEmailStatus(null);
    try {
      await api.emailShiftReport(shift.id, emailTo);
      setEmailStatus('Report sent successfully!');
      playBeep('success');
    } catch (err: any) {
      setEmailStatus('Failed to send email.');
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#141414] border border-[#333333] rounded-2xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="p-4 border-b border-[#242424] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Printer className="w-5 h-5 text-[#C5A059]" />
            <h3 className="text-sm font-black uppercase text-white tracking-wider">
              {isZReport ? 'Official Z-Report (End of Shift)' : 'Live X-Report (Mid-Day Audit)'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#888888] hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable Thermal Receipt Style Slip */}
        <div className="p-6 overflow-y-auto flex-1 bg-[#101010]">
          <div className="max-w-sm mx-auto bg-white text-black p-5 rounded font-mono text-[11px] leading-relaxed shadow-md border border-neutral-300">
            {/* Store Header */}
            <div className="text-center pb-3 border-b border-dashed border-neutral-400">
              <h2 className="font-black text-sm tracking-wider uppercase">377 SPIRITS</h2>
              <p className="text-[10px] text-neutral-600">Granbury, TX • Liquor & Spirits</p>
              <p className="text-[10px] text-neutral-600">Tel: (817) 555-0377</p>
              <div className="mt-2 text-[10px] font-bold uppercase bg-neutral-100 py-0.5 border border-neutral-300">
                {isZReport ? '*** END OF DAY Z-REPORT ***' : '*** MID-DAY X-REPORT ***'}
              </div>
            </div>

            {/* Shift Meta */}
            <div className="py-2 border-b border-dashed border-neutral-400 text-[10px] space-y-0.5">
              <div className="flex justify-between">
                <span>Shift Number:</span>
                <span className="font-bold">{shift.shiftNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Register:</span>
                <span>{shift.registerName || shift.registerId}</span>
              </div>
              <div className="flex justify-between">
                <span>Cashier:</span>
                <span className="font-bold">{shift.cashierName}</span>
              </div>
              <div className="flex justify-between">
                <span>Shift Opened:</span>
                <span>{new Date(shift.startTime).toLocaleString()}</span>
              </div>
              {shift.endTime && (
                <div className="flex justify-between">
                  <span>Shift Closed:</span>
                  <span>{new Date(shift.endTime).toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* Cash Drawer Reconciliation */}
            <div className="py-2 border-b border-dashed border-neutral-400 text-[10px] space-y-1">
              <span className="font-bold block uppercase text-[11px]">CASH DRAWER RECONCILIATION</span>
              <div className="flex justify-between">
                <span>Starting Float:</span>
                <span>${shift.startingCash.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Cash Sales Received:</span>
                <span>+${(shift.reconciliation?.expectedCash ? (shift.reconciliation.expectedCash - shift.startingCash) : 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Expected Drawer Total:</span>
                <span className="font-bold">${(shift.reconciliation?.expectedCash || shift.startingCash).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold border-t border-dotted border-neutral-300 pt-0.5">
                <span>Actual Cash Counted:</span>
                <span>${(shift.reconciliation?.actualCash || shift.startingCash).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-neutral-800">
                <span>Drawer Variance:</span>
                <span>
                  {shift.reconciliation
                    ? shift.reconciliation.variance >= 0
                      ? `+$${shift.reconciliation.variance.toFixed(2)} (OVER)`
                      : `-$${Math.abs(shift.reconciliation.variance).toFixed(2)} (SHORT)`
                    : '$0.00'}
                </span>
              </div>
            </div>

            {/* End of Report Verification */}
            <div className="pt-4 text-center text-[9px] text-neutral-500 space-y-1">
              <p>TEXAS ALCOHOLIC BEVERAGE COMMISSION</p>
              <p>Authorized Cashier & Manager Signatures</p>
              <div className="pt-4 border-b border-neutral-400"></div>
              <p className="text-[8px]">Cashier Signature / Date</p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#242424] bg-[#111111] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <input
              type="email"
              value={emailTo}
              onChange={e => setEmailTo(e.target.value)}
              placeholder="Email report..."
              className="bg-[#1A1A1A] border border-[#333333] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#C5A059] flex-1 sm:w-48"
            />
            <button
              onClick={handleSendEmail}
              disabled={isSendingEmail}
              className="px-2.5 py-1.5 bg-[#262626] hover:bg-[#333333] text-white rounded text-xs font-bold transition-colors cursor-pointer shrink-0"
              title="Email PDF / text report"
            >
              <Mail className="w-3.5 h-3.5" />
            </button>
            {emailStatus && <span className="text-[10px] text-emerald-400">{emailStatus}</span>}
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-[#1F1F1F] hover:bg-[#282828] text-[#CCCCCC] rounded text-xs font-bold uppercase transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-[#C5A059] hover:bg-[#B38F46] text-black rounded text-xs font-black uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Receipt
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
