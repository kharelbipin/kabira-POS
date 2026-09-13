import React, { useState, useEffect, useCallback } from 'react';
import {
  BankAccount,
  IssuedCheck,
  CheckStubAllocation,
  CheckIssuer,
  CheckFeeRule,
  CheckCashingTransaction,
  DepositBatch,
  CheckQrSession,
  User,
  StoreSettings,
} from '../../types';
import { api } from '../../utils/api';
import { playBeep } from '../../utils/audio';
import {
  Landmark,
  FileCheck,
  DollarSign,
  PlusCircle,
  Printer,
  Ban,
  RotateCcw,
  QrCode,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Search,
  Filter,
  Eye,
  Camera,
  UploadCloud,
  FileText,
  UserCheck,
  RefreshCw,
  Building,
  Layers,
  ArrowRight,
  ChevronRight,
  ExternalLink,
  X,
  Clock,
  Sparkles,
  Sliders,
} from 'lucide-react';

interface ChecksViewProps {
  currentUser: User | null;
  settings: StoreSettings | null;
  onRefreshData?: () => void;
}

export const ChecksView: React.FC<ChecksViewProps> = ({
  currentUser,
  settings,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<'issuance' | 'cashing' | 'batches'>('cashing');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Check Issuance State
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
  const [issuedChecks, setIssuedChecks] = useState<IssuedCheck[]>([]);
  const [issuanceFilterStatus, setIssuanceFilterStatus] = useState<string>('all');
  const [issuanceSearch, setIssuanceSearch] = useState<string>('');

  // Check Cashing State
  const [cashingDashboard, setCashingDashboard] = useState<any>(null);
  const [cashingTransactions, setCashingTransactions] = useState<CheckCashingTransaction[]>([]);
  const [cashingFeeRules, setCashingFeeRules] = useState<CheckFeeRule[]>([]);
  const [issuers, setIssuers] = useState<CheckIssuer[]>([]);
  const [depositBatches, setDepositBatches] = useState<DepositBatch[]>([]);
  const [cashingStatusFilter, setCashingStatusFilter] = useState<string>('all');
  const [cashingSearch, setCashingSearch] = useState<string>('');

  // Modals
  const [showNewCheckModal, setShowNewCheckModal] = useState<boolean>(false);
  const [showPrintCheckModal, setShowPrintCheckModal] = useState<boolean>(false);
  const [selectedCheckToPrint, setSelectedCheckToPrint] = useState<IssuedCheck | null>(null);
  const [showVoidModal, setShowVoidModal] = useState<boolean>(false);
  const [checkToVoid, setCheckToVoid] = useState<IssuedCheck | null>(null);

  // Check Cashing Modals
  const [showCashCheckModal, setShowCashCheckModal] = useState<boolean>(false);
  const [showQrSessionModal, setShowQrSessionModal] = useState<boolean>(false);
  const [activeQrSession, setActiveQrSession] = useState<CheckQrSession | null>(null);
  const [showDepositBatchModal, setShowDepositBatchModal] = useState<boolean>(false);
  const [showReturnedCheckModal, setShowReturnedCheckModal] = useState<boolean>(false);
  const [selectedTransactionForReturn, setSelectedTransactionForReturn] = useState<CheckCashingTransaction | null>(null);
  const [showDepositSlipModal, setShowDepositSlipModal] = useState<boolean>(false);
  const [selectedBatchForSlip, setSelectedBatchForSlip] = useState<DepositBatch | null>(null);

  // Load all check data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [accounts, checks, dash, txs, rules, iss, batches] = await Promise.all([
        api.getBankAccounts().catch(() => []),
        api.getIssuedChecks().catch(() => []),
        api.getCheckCashingDashboard().catch(() => null),
        api.getCheckCashingTransactions().catch(() => []),
        api.getCheckFeeRules().catch(() => []),
        api.getCheckIssuers().catch(() => []),
        api.getDepositBatches().catch(() => []),
      ]);

      const safeAccounts = Array.isArray(accounts) ? accounts : (accounts as any)?.bankAccounts || [];
      const safeChecks = Array.isArray(checks) ? checks : (checks as any)?.checks || [];
      const safeTxs = Array.isArray(txs) ? txs : (txs as any)?.transactions || [];
      const safeRules = Array.isArray(rules) ? rules : (rules as any)?.feeRules || [];
      const safeIssuers = Array.isArray(iss) ? iss : (iss as any)?.issuers || [];
      const safeBatches = Array.isArray(batches) ? batches : (batches as any)?.batches || [];

      setBankAccounts(safeAccounts);
      setIssuedChecks(safeChecks);
      setCashingDashboard(dash);
      setCashingTransactions(safeTxs);
      setCashingFeeRules(safeRules);
      setIssuers(safeIssuers);
      setDepositBatches(safeBatches);
    } catch (err) {
      console.error('Failed to load checks data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formatCurrency = (v?: number) => `$${(v || 0).toFixed(2)}`;

  // Filtered Issued Checks
  const filteredIssuedChecks = (Array.isArray(issuedChecks) ? issuedChecks : []).filter(c => {
    if (selectedAccountId !== 'all' && c.bankAccountId !== selectedAccountId) return false;
    if (issuanceFilterStatus !== 'all' && c.status !== issuanceFilterStatus) return false;
    if (issuanceSearch.trim()) {
      const q = issuanceSearch.toLowerCase();
      return (
        c.payeeName.toLowerCase().includes(q) ||
        c.checkNumber.toLowerCase().includes(q) ||
        (c.memo && c.memo.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Filtered Cashing Transactions
  const filteredCashingTxs = (Array.isArray(cashingTransactions) ? cashingTransactions : []).filter(t => {
    if (cashingStatusFilter !== 'all' && t.status !== cashingStatusFilter) return false;
    if (cashingSearch.trim()) {
      const q = cashingSearch.toLowerCase();
      return (
        t.customerName.toLowerCase().includes(q) ||
        t.checkNumber.toLowerCase().includes(q) ||
        t.issuerName.toLowerCase().includes(q) ||
        t.transactionNumber.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="h-full flex flex-col bg-[#0D0D0D] text-[#E5E5E5] overflow-y-auto p-4 sm:p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#262626] pb-4">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-xl sm:text-2xl font-black tracking-wider text-white uppercase flex items-center gap-2">
              <Landmark className="w-6 h-6 text-[#C5A059]" />
              Check Services & Banking
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-[#C5A059]/10 text-[#C5A059] border border-[#C5A059]/30">
              Granbury Financial Hub
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#888888] mt-1">
            Accounts Payable check issuance with voucher stubs & customer check cashing services with live drawer payout.
          </p>
        </div>

        {/* Global Tab Switcher */}
        <div className="flex items-center bg-[#1A1A1A] p-1 rounded-xl border border-[#2B2B2B]">
          <button
            onClick={() => setActiveTab('cashing')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'cashing'
                ? 'bg-[#C5A059] text-black shadow'
                : 'text-[#888888] hover:text-white'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>Check Cashing</span>
          </button>

          <button
            onClick={() => setActiveTab('issuance')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'issuance'
                ? 'bg-[#C5A059] text-black shadow'
                : 'text-[#888888] hover:text-white'
            }`}
          >
            <FileCheck className="w-4 h-4" />
            <span>Check Issuance & Register</span>
          </button>

          <button
            onClick={() => setActiveTab('batches')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'batches'
                ? 'bg-[#C5A059] text-black shadow'
                : 'text-[#888888] hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Deposit Batches ({(Array.isArray(depositBatches) ? depositBatches : []).length})</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: CHECK CASHING MODULE                                              */}
      {/* ========================================================================= */}
      {activeTab === 'cashing' && (
        <div className="space-y-6">
          {/* Cashing KPIs Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-[#141414] border border-[#262626] rounded-xl p-4">
              <span className="text-[10px] uppercase font-bold text-[#888888] tracking-wider block">Today's Volume</span>
              <span className="text-xl sm:text-2xl font-black text-white mt-1 block font-mono">
                {formatCurrency(cashingDashboard?.todayStats?.totalVolume ?? cashingDashboard?.today?.totalFaceValue ?? 0)}
              </span>
              <span className="text-[11px] text-[#666666]">
                {cashingDashboard?.todayStats?.checksCount ?? cashingDashboard?.today?.checksCashed ?? 0} checks cashed
              </span>
            </div>

            <div className="bg-[#141414] border border-[#262626] rounded-xl p-4">
              <span className="text-[10px] uppercase font-bold text-[#888888] tracking-wider block">Fees Collected</span>
              <span className="text-xl sm:text-2xl font-black text-emerald-400 mt-1 block font-mono">
                {formatCurrency(cashingDashboard?.todayStats?.totalFeesCollected ?? cashingDashboard?.today?.totalFeesEarned ?? 0)}
              </span>
              <span className="text-[11px] text-[#666666]">Store revenue today</span>
            </div>

            <div className="bg-[#141414] border border-[#262626] rounded-xl p-4">
              <span className="text-[10px] uppercase font-bold text-[#888888] tracking-wider block">Ready for Bank Deposit</span>
              <span className="text-xl sm:text-2xl font-black text-[#C5A059] mt-1 block font-mono">
                {formatCurrency(cashingDashboard?.readyForDepositAmount ?? cashingDashboard?.pipeline?.awaitingDepositAmount ?? 0)}
              </span>
              <span className="text-[11px] text-[#666666]">
                {cashingDashboard?.readyForDepositCount ?? cashingDashboard?.pipeline?.awaitingDepositCount ?? 0} checks unbatched
              </span>
            </div>

            <div className="bg-[#141414] border border-[#262626] rounded-xl p-4">
              <span className="text-[10px] uppercase font-bold text-[#888888] tracking-wider block">Returned / NSF Watch</span>
              <span className="text-xl sm:text-2xl font-black text-rose-400 mt-1 block font-mono">
                {formatCurrency(cashingDashboard?.returnedAmount ?? cashingDashboard?.pipeline?.unrecoveredReturnedAmount ?? 0)}
              </span>
              <span className="text-[11px] text-rose-400/80">
                {cashingDashboard?.returnedCount ?? cashingDashboard?.pipeline?.returnedCount ?? 0} returned check(s)
              </span>
            </div>
          </div>

          {/* Action Bar & Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#141414] p-3.5 rounded-xl border border-[#262626]">
            <div className="flex items-center space-x-2.5 flex-1">
              <div className="relative flex-1 max-w-xs">
                <Search className="w-3.5 h-3.5 text-[#888888] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={cashingSearch}
                  onChange={e => setCashingSearch(e.target.value)}
                  placeholder="Search customer, check #, issuer..."
                  className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-[#666666] focus:outline-none focus:border-[#C5A059]"
                />
              </div>

              <select
                value={cashingStatusFilter}
                onChange={e => setCashingStatusFilter(e.target.value)}
                className="bg-[#1A1A1A] border border-[#333333] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#C5A059]"
              >
                <option value="all">All Statuses</option>
                <option value="ready_for_deposit">Paid / Ready for Deposit</option>
                <option value="pending_review">Pending Manager Review</option>
                <option value="deposited">Deposited in Bank</option>
                <option value="returned">Returned / Bounced</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  api.createCheckQrSession('Walk-in Customer').then(sess => {
                    setActiveQrSession(sess);
                    setShowQrSessionModal(true);
                  });
                }}
                className="flex items-center space-x-1.5 px-3 py-2 bg-[#1F2937] hover:bg-[#2A3749] text-sky-400 border border-sky-800/50 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                title="Customer scans QR with smartphone to snap ID & check pictures"
              >
                <QrCode className="w-4 h-4" />
                <span>Phone QR Intake</span>
              </button>

              <button
                onClick={() => setShowCashCheckModal(true)}
                className="flex items-center space-x-1.5 px-4 py-2 bg-[#C5A059] hover:bg-[#B38F46] text-black font-black text-xs uppercase tracking-wider rounded-lg shadow transition-colors cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Cash Check Now</span>
              </button>
            </div>
          </div>

          {/* Transactions List */}
          <div className="bg-[#141414] border border-[#262626] rounded-xl overflow-hidden shadow-lg">
            <div className="p-4 border-b border-[#242424] flex items-center justify-between">
              <h3 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-[#C5A059]" />
                Recent Check Cashing Transactions
              </h3>
              <span className="text-xs text-[#888888] font-mono">
                {filteredCashingTxs.length} record(s)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#242424] text-[#777777] uppercase tracking-wider text-[10px] bg-[#121212]">
                    <th className="py-2.5 px-3">Tx #</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3">Check Details</th>
                    <th className="py-2.5 px-3">Issuer / Bank</th>
                    <th className="py-2.5 px-3 text-right">Face Amount</th>
                    <th className="py-2.5 px-3 text-right">Fee</th>
                    <th className="py-2.5 px-3 text-right">Net Payout</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F1F1F]">
                  {filteredCashingTxs.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-[#666666]">
                        No check cashing transactions match filter.
                      </td>
                    </tr>
                  ) : (
                    filteredCashingTxs.map(tx => (
                      <tr key={tx.id} className="hover:bg-[#1A1A1A] transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-white">
                          {tx.transactionNumber}
                        </td>
                        <td className="py-3 px-3 text-[#888888] font-mono">
                          {new Date(tx.createdAt).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-bold text-[#E5E5E5] block">{tx.customerName}</span>
                          <span className="text-[10px] text-[#777777]">
                            {tx.customerIdType} • {tx.customerIdState || 'TX'}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-mono text-white block">
                            #{tx.checkNumber} ({tx.checkType})
                          </span>
                          <span className="text-[10px] text-[#777777] font-mono">
                            Rt: {tx.micrRoutingNumber}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="text-[#CCCCCC] block">{tx.issuerName}</span>
                          <span className="text-[10px] text-[#777777]">{tx.issuerBankName}</span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-white">
                          {formatCurrency(tx.checkAmount)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-emerald-400 font-bold">
                          {formatCurrency(tx.finalFee)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-[#C5A059]">
                          {formatCurrency(tx.customerPayoutAmount)}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              tx.status === 'ready_for_deposit'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : tx.status === 'pending_review'
                                ? 'bg-amber-950 text-amber-400 border border-amber-800'
                                : tx.status === 'deposited'
                                ? 'bg-sky-950 text-sky-400 border border-sky-800'
                                : tx.status === 'returned'
                                ? 'bg-rose-950 text-rose-400 border border-rose-800'
                                : 'bg-[#222222] text-[#888888]'
                            }`}
                          >
                            {tx.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          {tx.status === 'ready_for_deposit' && (
                            <button
                              onClick={() => {
                                setSelectedTransactionForReturn(tx);
                                setShowReturnedCheckModal(true);
                              }}
                              className="px-2 py-1 bg-rose-950/40 hover:bg-rose-950 text-rose-400 border border-rose-900 rounded text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                              title="Mark check returned/NSF"
                            >
                              Log NSF
                            </button>
                          )}
                          {tx.status === 'pending_review' && (
                            <button
                              onClick={() => {
                                const pin = prompt('Enter Manager PIN to approve check cashing:');
                                if (pin) {
                                  api.decideCheckCashingApproval(tx.id, 'approved', pin).then(() => {
                                    loadData();
                                    playBeep('success');
                                  });
                                }
                              }}
                              className="px-2 py-1 bg-[#C5A059] hover:bg-[#B38F46] text-black rounded text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                            >
                              Approve
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CHECK ISSUANCE & REGISTER (ACCOUNTS PAYABLE & VENDORS)             */}
      {/* ========================================================================= */}
      {activeTab === 'issuance' && (
        <div className="space-y-6">
          {/* Bank Accounts Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {bankAccounts.map(account => (
              <div
                key={account.id}
                onClick={() => setSelectedAccountId(account.id === selectedAccountId ? 'all' : account.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  selectedAccountId === account.id
                    ? 'bg-[#1E1E1E] border-[#C5A059] shadow-lg'
                    : 'bg-[#141414] border-[#262626] hover:border-[#333333]'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 rounded-lg bg-[#C5A059]/10 text-[#C5A059]">
                      <Building className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">{account.accountName}</h4>
                      <p className="text-[11px] text-[#888888] font-mono">{account.bankName}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-[#222222] text-[#CCCCCC] rounded">
                    Next #{account.nextCheckNumber}
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-[#222222] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-[#777777] uppercase block">Ledger Balance</span>
                    <span className="font-mono text-lg font-black text-emerald-400">
                      {formatCurrency(account.balance)}
                    </span>
                  </div>
                  <div className="text-right text-[10px] text-[#777777] font-mono">
                    <span>Acct: {account.accountNumber ? `****${account.accountNumber.slice(-4)}` : (account.accountNumberMasked || '****8921')}</span>
                    <br />
                    <span>Routing: {account.routingNumber}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Action Bar & Register Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#141414] p-3.5 rounded-xl border border-[#262626]">
            <div className="flex items-center space-x-2.5 flex-1">
              <div className="relative flex-1 max-w-xs">
                <Search className="w-3.5 h-3.5 text-[#888888] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={issuanceSearch}
                  onChange={e => setIssuanceSearch(e.target.value)}
                  placeholder="Search payee, check #, memo..."
                  className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-[#666666] focus:outline-none focus:border-[#C5A059]"
                />
              </div>

              <select
                value={issuanceFilterStatus}
                onChange={e => setIssuanceFilterStatus(e.target.value)}
                className="bg-[#1A1A1A] border border-[#333333] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#C5A059]"
              >
                <option value="all">All Check Statuses</option>
                <option value="draft">Draft</option>
                <option value="pending_approval">Pending Approval</option>
                <option value="issued">Issued / Unprinted</option>
                <option value="printed">Printed</option>
                <option value="cleared">Cleared</option>
                <option value="voided">Voided</option>
              </select>
            </div>

            <button
              onClick={() => setShowNewCheckModal(true)}
              className="flex items-center space-x-1.5 px-4 py-2 bg-[#C5A059] hover:bg-[#B38F46] text-black font-black text-xs uppercase tracking-wider rounded-lg shadow transition-colors cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Issue New Check (CI-01)</span>
            </button>
          </div>

          {/* Check Register Table */}
          <div className="bg-[#141414] border border-[#262626] rounded-xl overflow-hidden shadow-lg">
            <div className="p-4 border-b border-[#242424] flex items-center justify-between">
              <h3 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-2">
                <FileSpreadsheetIcon className="w-4 h-4 text-[#C5A059]" />
                Official Check Register & Stubs Ledger
              </h3>
              <span className="text-xs text-[#888888] font-mono">
                {filteredIssuedChecks.length} checks found
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#242424] text-[#777777] uppercase tracking-wider text-[10px] bg-[#121212]">
                    <th className="py-2.5 px-3">Check #</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Payee / Vendor</th>
                    <th className="py-2.5 px-3">Bank Account</th>
                    <th className="py-2.5 px-3">Memo / Allocation</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F1F1F]">
                  {filteredIssuedChecks.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-[#666666]">
                        No checks issued matching current filters.
                      </td>
                    </tr>
                  ) : (
                    filteredIssuedChecks.map(check => (
                      <tr key={check.id} className="hover:bg-[#1A1A1A] transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-white">
                          #{check.checkNumber}
                        </td>
                        <td className="py-3 px-3 text-[#888888] font-mono">
                          {check.date || (check as any).issueDate || ''}
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-bold text-white block">{check.payeeName}</span>
                          <span className="text-[10px] text-[#777777]">{check.paymentCategory || (check as any).category || 'General Expense'}</span>
                        </td>
                        <td className="py-3 px-3 text-[#CCCCCC]">
                          {check.bankAccountName}
                        </td>
                        <td className="py-3 px-3 text-[#888888] max-w-xs truncate">
                          {check.memo || '—'}
                          {check.allocations && check.allocations.length > 0 && (
                            <span className="text-[10px] text-[#C5A059] block">
                              ({check.allocations.length} voucher split line(s))
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-white">
                          {formatCurrency(check.amount)}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              check.status === 'printed' || check.status === 'cleared'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : check.status === 'voided'
                                ? 'bg-rose-950 text-rose-400 border border-rose-800'
                                : check.status === 'pending_approval'
                                ? 'bg-amber-950 text-amber-400 border border-amber-800'
                                : 'bg-[#222222] text-[#AAAAAA]'
                            }`}
                          >
                            {check.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center space-x-1.5">
                            <button
                              onClick={() => {
                                setSelectedCheckToPrint(check);
                                setShowPrintCheckModal(true);
                              }}
                              className="px-2.5 py-1 bg-[#222222] hover:bg-[#2E2E2E] text-[#C5A059] rounded text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer inline-flex items-center gap-1"
                              title="Print check on check stock"
                            >
                              <Printer className="w-3 h-3" />
                              Print
                            </button>

                            {check.status !== 'voided' && (
                              <button
                                onClick={() => {
                                  setCheckToVoid(check);
                                  setShowVoidModal(true);
                                }}
                                className="p-1 bg-[#222222] hover:bg-rose-950 text-[#888888] hover:text-rose-400 rounded transition-colors cursor-pointer"
                                title="Void check (CI-05)"
                              >
                                <Ban className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: DEPOSIT BATCHES                                                   */}
      {/* ========================================================================= */}
      {activeTab === 'batches' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-[#141414] p-4 rounded-xl border border-[#262626]">
            <div>
              <h3 className="text-sm font-black uppercase text-white tracking-wider">
                Bank Deposit Batches & Slips
              </h3>
              <p className="text-xs text-[#888888]">
                Group cashed checks into bank deposit batches and print standardized bank deposit slips.
              </p>
            </div>
            <button
              onClick={() => setShowDepositBatchModal(true)}
              className="flex items-center space-x-1.5 px-4 py-2 bg-[#C5A059] hover:bg-[#B38F46] text-black font-black text-xs uppercase tracking-wider rounded-lg shadow transition-colors cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Deposit Batch (CC-22)</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(Array.isArray(depositBatches) ? depositBatches : []).map(batch => (
              <div
                key={batch.id}
                className="bg-[#141414] border border-[#262626] rounded-xl p-5 shadow-lg space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-mono text-sm font-black text-white">{batch.batchNumber}</span>
                    <span className="text-[11px] text-[#888888] block">
                      {batch.depositBankName || batch.bankAccountName || 'Operating Account'}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      batch.status === 'deposited'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : 'bg-amber-950 text-amber-400 border border-amber-800'
                    }`}
                  >
                    {batch.status}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-[#1A1A1A] p-2.5 rounded-lg border border-[#242424] text-xs">
                  <div>
                    <span className="text-[10px] text-[#777777] uppercase block">Checks</span>
                    <span className="font-bold text-white">
                      {batch.checkCount ?? batch.checksCount ?? batch.checkIds?.length ?? 0} checks
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#777777] uppercase block">Total Amount</span>
                    <span className="font-bold text-[#C5A059] font-mono">{formatCurrency(batch.totalAmount)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#777777] uppercase block">Created By</span>
                    <span className="text-[#CCCCCC] truncate block">{batch.createdByName}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-[10px] text-[#666666] font-mono">
                    {new Date(batch.createdAt).toLocaleString()}
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setSelectedBatchForSlip(batch);
                        setShowDepositSlipModal(true);
                      }}
                      className="px-3 py-1.5 bg-[#222222] hover:bg-[#2A2A2A] text-[#C5A059] rounded text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer inline-flex items-center gap-1"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Deposit Slip
                    </button>
                    {batch.status !== 'deposited' && batch.status !== 'cleared' && (
                      <button
                        onClick={() => {
                          api.markDepositBatchDeposited(batch.id).then(() => {
                            loadData();
                            playBeep('success');
                          }).catch(err => console.error(err));
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                      >
                        Mark Deposited
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CASH NEW CHECK WIZARD (CC-01 to CC-15)                             */}
      {/* ========================================================================= */}
      {showCashCheckModal && (
        <CashCheckWizardModal
          isOpen={showCashCheckModal}
          onClose={() => setShowCashCheckModal(false)}
          currentUser={currentUser}
          feeRules={cashingFeeRules}
          issuers={issuers}
          onSuccess={() => {
            setShowCashCheckModal(false);
            loadData();
            playBeep('success');
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL: ISSUE NEW CHECK (CI-01 to CI-04)                                   */}
      {/* ========================================================================= */}
      {showNewCheckModal && (
        <IssueCheckModal
          isOpen={showNewCheckModal}
          onClose={() => setShowNewCheckModal(false)}
          bankAccounts={bankAccounts}
          currentUser={currentUser}
          onSuccess={newCheck => {
            setShowNewCheckModal(false);
            loadData();
            setSelectedCheckToPrint(newCheck);
            setShowPrintCheckModal(true);
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL: PRINT CHECK PREVIEW (CI-03, CI-04)                                 */}
      {selectedCheckToPrint && showPrintCheckModal && (
        <PrintCheckModal
          isOpen={showPrintCheckModal}
          onClose={() => setShowPrintCheckModal(false)}
          check={selectedCheckToPrint}
          bankAccounts={bankAccounts}
          onPrinted={() => {
            loadData();
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL: VOID CHECK (CI-05)                                                 */}
      {checkToVoid && showVoidModal && (
        <VoidCheckModal
          isOpen={showVoidModal}
          onClose={() => setShowVoidModal(false)}
          check={checkToVoid}
          onVoided={() => {
            setShowVoidModal(false);
            loadData();
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL: QR PHONE INTAKE (CC-18, CC-19)                                     */}
      {showQrSessionModal && activeQrSession && (
        <QrIntakeModal
          isOpen={showQrSessionModal}
          onClose={() => setShowQrSessionModal(false)}
          session={activeQrSession}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE DEPOSIT BATCH                                               */}
      {showDepositBatchModal && (
        <CreateDepositBatchModal
          isOpen={showDepositBatchModal}
          onClose={() => setShowDepositBatchModal(false)}
          bankAccounts={bankAccounts}
          unbatchedTransactions={cashingTransactions.filter(t => t.status === 'ready_for_deposit')}
          onSuccess={() => {
            setShowDepositBatchModal(false);
            loadData();
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL: PRINTABLE DEPOSIT SLIP                                             */}
      {showDepositSlipModal && selectedBatchForSlip && (
        <DepositSlipModal
          isOpen={showDepositSlipModal}
          onClose={() => setShowDepositSlipModal(false)}
          batch={selectedBatchForSlip}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL: LOG RETURNED CHECK                                                 */}
      {showReturnedCheckModal && selectedTransactionForReturn && (
        <LogReturnedCheckModal
          isOpen={showReturnedCheckModal}
          onClose={() => setShowReturnedCheckModal(false)}
          transaction={selectedTransactionForReturn}
          onSuccess={() => {
            setShowReturnedCheckModal(false);
            loadData();
          }}
        />
      )}
    </div>
  );
};

function FileSpreadsheetIcon(props: any) {
  return <FileText {...props} />;
}

// ============================================================================
// SUBCOMPONENT: ISSUE CHECK MODAL (CI-01)
// ============================================================================
interface IssueCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  bankAccounts: BankAccount[];
  currentUser: User | null;
  onSuccess: (check: IssuedCheck) => void;
}

const IssueCheckModal: React.FC<IssueCheckModalProps> = ({
  isOpen,
  onClose,
  bankAccounts,
  currentUser,
  onSuccess,
}) => {
  const [bankAccountId, setBankAccountId] = useState<string>(bankAccounts[0]?.id || 'bank-1');
  const [payeeName, setPayeeName] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [memo, setMemo] = useState<string>('');
  const [category, setCategory] = useState<string>('Inventory');
  const [allocations, setAllocations] = useState<CheckStubAllocation[]>([
    {
      id: 'alloc-1',
      invoiceNumber: 'INV-2026-081',
      invoiceDate: new Date().toISOString().slice(0, 10),
      description: 'Bourbon & Whiskey Wholesale',
      amountPaid: 0,
    },
  ]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const numAmount = parseFloat(amount) || 0;
  const requiresDualApproval = numAmount > 2500;

  const handleAddAllocation = () => {
    setAllocations(prev => [
      ...prev,
      {
        id: `alloc-${Date.now()}`,
        invoiceNumber: '',
        invoiceDate: new Date().toISOString().slice(0, 10),
        description: '',
        amountPaid: 0,
      },
    ]);
  };

  const handleAllocationChange = (index: number, field: keyof CheckStubAllocation, val: any) => {
    setAllocations(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payeeName.trim()) {
      setErrorMsg('Payee name is required.');
      return;
    }
    if (numAmount <= 0) {
      setErrorMsg('Check amount must be greater than $0.00.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await api.createIssuedCheck({
        bankAccountId,
        payeeType: 'vendor',
        payeeName,
        amount: numAmount,
        memo,
        paymentCategory: category || 'Vendor Invoice',
        category,
        allocations: allocations.filter(a => a.description || a.invoiceNumber),
      });

      playBeep('success');
      onSuccess(res.check);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to issue check.');
      playBeep('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#141414] border border-[#333333] rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
        <div className="p-5 border-b border-[#242424] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-[#C5A059]/10 text-[#C5A059]">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black uppercase text-white tracking-wider">
                Issue Vendor / AP Check
              </h3>
              <p className="text-xs text-[#888888]">Printable Check with Voucher Stub Lines</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-[#888888] hover:text-white rounded-lg transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {requiresDualApproval && (
            <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Amounts exceeding $2,500 require secondary manager dual signature approval.</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs uppercase font-bold text-[#AAAAAA] tracking-wider mb-1">
                Disbursement Bank Account
              </label>
              <select
                value={bankAccountId}
                onChange={e => setBankAccountId(e.target.value)}
                className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C5A059]"
              >
                {bankAccounts.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.accountName} (Balance: ${b.balance.toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs uppercase font-bold text-[#AAAAAA] tracking-wider mb-1">
                Expense Category
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C5A059]"
              >
                <option value="Inventory">Inventory Wholesale (Liquor / Beer / Wine)</option>
                <option value="Utilities">Store Utilities & Telecom</option>
                <option value="Rent">Commercial Building Lease</option>
                <option value="Maintenance">Equipment & Cooler Maintenance</option>
                <option value="Payroll">Payroll / Contractor</option>
                <option value="Other">Other Operational Expense</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs uppercase font-bold text-[#AAAAAA] tracking-wider mb-1">
                Payee / Vendor Name
              </label>
              <input
                type="text"
                value={payeeName}
                onChange={e => setPayeeName(e.target.value)}
                placeholder="e.g. Southern Glazer's Wine & Spirits"
                className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C5A059]"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs uppercase font-bold text-[#AAAAAA] tracking-wider mb-1">
                Amount ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-2 text-xs text-white font-mono font-bold focus:outline-none focus:border-[#C5A059]"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase font-bold text-[#AAAAAA] tracking-wider mb-1">
              Memo / Notes on Check
            </label>
            <input
              type="text"
              value={memo}
              onChange={e => setMemo(e.target.value)}
              placeholder="e.g. Invoice #SG-98124 - Monthly replenishment"
              className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C5A059]"
            />
          </div>

          {/* Voucher Stub Allocations (CI-02) */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs uppercase font-bold text-[#CCCCCC] tracking-wider">
                Voucher Stubs / Remittance Line Items
              </label>
              <button
                type="button"
                onClick={handleAddAllocation}
                className="text-[11px] text-[#C5A059] hover:underline font-bold"
              >
                + Add Stub Line
              </button>
            </div>

            <div className="space-y-2">
              {allocations.map((alloc, idx) => (
                <div key={alloc.id} className="flex items-center space-x-2 bg-[#1A1A1A] p-2 rounded-lg border border-[#262626]">
                  <input
                    type="text"
                    value={alloc.invoiceNumber || ''}
                    onChange={e => handleAllocationChange(idx, 'invoiceNumber', e.target.value)}
                    placeholder="Inv #"
                    className="w-24 bg-[#111111] border border-[#333333] rounded px-2 py-1 text-xs text-white font-mono"
                  />
                  <input
                    type="text"
                    value={alloc.description}
                    onChange={e => handleAllocationChange(idx, 'description', e.target.value)}
                    placeholder="Description"
                    className="flex-1 bg-[#111111] border border-[#333333] rounded px-2 py-1 text-xs text-white"
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={alloc.amountPaid || ''}
                    onChange={e => handleAllocationChange(idx, 'amountPaid', parseFloat(e.target.value) || 0)}
                    placeholder="Amount"
                    className="w-24 bg-[#111111] border border-[#333333] rounded px-2 py-1 text-xs text-white font-mono text-right"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#1F1F1F] hover:bg-[#292929] text-[#CCCCCC] rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-[#C5A059] hover:bg-[#B38F46] text-black font-black text-xs uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
            >
              {isSubmitting ? 'Creating...' : 'Save & Prepare Check'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// SUBCOMPONENT: PRINT CHECK PREVIEW MODAL (CI-03, CI-04)
// ============================================================================
interface PrintCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  check: IssuedCheck;
  bankAccounts: BankAccount[];
  onPrinted: () => void;
}

const PrintCheckModal: React.FC<PrintCheckModalProps> = ({
  isOpen,
  onClose,
  check,
  bankAccounts,
  onPrinted,
}) => {
  const [printFormat, setPrintFormat] = useState<'voucher_top' | 'voucher_middle' | 'standard'>('voucher_top');
  const [isRecording, setIsRecording] = useState<boolean>(false);

  if (!isOpen) return null;

  const handlePrint = async () => {
    setIsRecording(true);
    try {
      await api.printIssuedCheck(check.id, printFormat);
      onPrinted();
      window.print();
    } catch (e) {
      console.error(e);
    } finally {
      setIsRecording(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#141414] border border-[#333333] rounded-2xl w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
        <div className="p-4 border-b border-[#242424] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Printer className="w-5 h-5 text-[#C5A059]" />
            <div>
              <h3 className="text-sm font-black uppercase text-white tracking-wider">
                Print Check #{check.checkNumber}
              </h3>
              <p className="text-xs text-[#888888]">{check.bankAccountName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-[#888888] hover:text-white rounded-lg transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Visual Check Preview (Standard Bank Voucher Stock) */}
        <div className="p-6 overflow-y-auto flex-1 bg-[#0A0A0A] space-y-4">
          <div className="max-w-2xl mx-auto bg-[#FBF9F5] text-black p-6 rounded-lg shadow-xl border border-neutral-300 font-sans select-none">
            {/* Top Row */}
            <div className="flex justify-between items-start">
              <div>
                <h2 className="font-black text-sm uppercase tracking-wider text-neutral-900">377 SPIRITS LLC</h2>
                <p className="text-[10px] text-neutral-600">4100 E Hwy 377</p>
                <p className="text-[10px] text-neutral-600">Granbury, TX 76049</p>
              </div>

              <div className="text-right">
                <span className="font-mono text-base font-black tracking-widest text-neutral-900">
                  {check.checkNumber}
                </span>
                <p className="text-[10px] text-neutral-600 font-mono mt-1">Date: {check.issueDate}</p>
              </div>
            </div>

            {/* Bank Header */}
            <div className="text-[11px] text-neutral-700 font-medium mt-1">
              <span>{check.bankAccountName} • Granbury Branch</span>
            </div>

            {/* Payee & Amount Box */}
            <div className="mt-4 flex items-center space-x-4">
              <span className="text-[11px] uppercase font-bold text-neutral-600 shrink-0">PAY TO THE ORDER OF</span>
              <div className="flex-1 border-b border-neutral-700 pb-0.5 font-bold text-neutral-900 text-sm">
                {check.payeeName}
              </div>
              <div className="border-2 border-neutral-800 px-3 py-1 bg-white font-mono font-black text-base">
                ${check.amount.toFixed(2)}
              </div>
            </div>

            {/* Written Amount Words */}
            <div className="mt-3 flex items-center space-x-2">
              <div className="flex-1 border-b border-neutral-700 pb-0.5 font-medium text-xs text-neutral-900 italic">
                {check.writtenAmount || (check as any).amountWords || ''}
              </div>
              <span className="text-xs font-bold text-neutral-700">DOLLARS</span>
            </div>

            {/* Bottom Row: Memo & Signature Lines */}
            <div className="mt-6 flex items-end justify-between">
              <div className="w-1/2">
                <span className="text-[9px] uppercase text-neutral-500 block">FOR / MEMO</span>
                <div className="border-b border-neutral-700 text-xs text-neutral-800 pb-0.5">
                  {check.memo || 'Operational replenishment'}
                </div>
              </div>

              <div className="w-5/12 text-right">
                <div className="border-b border-neutral-700 pb-1 flex justify-center">
                  <span className="font-serif italic text-sm text-neutral-800">
                    Bipin Kharel (Authorized)
                  </span>
                </div>
                <span className="text-[9px] uppercase text-neutral-500 block mt-0.5">AUTHORIZED SIGNATURE</span>
              </div>
            </div>

            {/* MICR Encoding Line */}
            <div className="mt-6 pt-3 border-t border-neutral-300 font-mono text-center tracking-[0.25em] text-xs text-neutral-800">
              ⑈{check.checkNumber}⑈ ⑆{check.routingNumber}⑆ {(check as any).accountNumber || check.bankAccountNumberMasked}⑈
            </div>
          </div>

          {/* Voucher Stub Preview */}
          {check.allocations && check.allocations.length > 0 && (
            <div className="max-w-2xl mx-auto bg-[#1A1A1A] p-4 rounded-lg border border-[#2B2B2B] text-xs text-[#CCCCCC]">
              <span className="font-bold text-white uppercase text-[11px] block mb-2">Voucher Stub Remittance Detail</span>
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[#333333] text-[10px] text-[#888888] uppercase">
                    <th className="py-1">Invoice #</th>
                    <th className="py-1">Date</th>
                    <th className="py-1">Description</th>
                    <th className="py-1 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262626]">
                  {check.allocations.map(a => (
                    <tr key={a.id}>
                      <td className="py-1.5 font-mono">{a.invoiceNumber}</td>
                      <td className="py-1.5">{a.invoiceDate}</td>
                      <td className="py-1.5 text-white">{a.description}</td>
                      <td className="py-1.5 text-right font-mono">${(a.amountPaid || (a as any).amount || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#242424] bg-[#111111] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-[#888888]">Format:</span>
            <select
              value={printFormat}
              onChange={e => setPrintFormat(e.target.value as any)}
              className="bg-[#1A1A1A] border border-[#333333] rounded px-2.5 py-1 text-xs text-white"
            >
              <option value="voucher_top">Check on Top (Voucher Below)</option>
              <option value="voucher_middle">Check in Middle</option>
              <option value="standard">Standard 3-per-page</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#1F1F1F] hover:bg-[#292929] text-[#CCCCCC] rounded-lg text-xs font-bold uppercase transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={handlePrint}
              disabled={isRecording}
              className="px-6 py-2 bg-[#C5A059] hover:bg-[#B38F46] text-black font-black text-xs uppercase tracking-wider rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow"
            >
              <Printer className="w-4 h-4" />
              {isRecording ? 'Recording...' : 'Print on Check Paper'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// SUBCOMPONENT: CASH CHECK WIZARD (CC-01 to CC-15)
// ============================================================================
interface CashCheckWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  feeRules: CheckFeeRule[];
  issuers: CheckIssuer[];
  onSuccess: () => void;
}

const CashCheckWizardModal: React.FC<CashCheckWizardModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  feeRules,
  issuers,
  onSuccess,
}) => {
  // Step 1: Customer ID
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('(817) 555-0199');
  const [customerIdType, setCustomerIdType] = useState<string>('Driver License');
  const [customerIdNumber, setCustomerIdNumber] = useState<string>('TX-8912743');
  const [customerIdState, setCustomerIdState] = useState<string>('TX');

  // Step 2: Check Details
  const [checkType, setCheckType] = useState<string>('payroll');
  const [checkNumber, setCheckNumber] = useState<string>('1042');
  const [checkAmount, setCheckAmount] = useState<string>('450.00');
  const [micrRoutingNumber, setMicrRoutingNumber] = useState<string>('111000025');
  const [micrAccountNumber, setMicrAccountNumber] = useState<string>('982341234');
  const [issuerName, setIssuerName] = useState<string>('Granbury Construction LLC');

  // Step 3: Fee Calculation & Override
  const [feePercentOverride, setFeePercentOverride] = useState<string>('');
  const [feeOverrideReason, setFeeOverrideReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const numAmount = parseFloat(checkAmount) || 0;
  // Calculate preview fee
  const rule = feeRules.find(r => r.checkType === checkType) || {
    feePercent: 1.5,
    minFee: 3.0,
    maxFee: 30.0,
  };

  const effPercent = feePercentOverride ? parseFloat(feePercentOverride) : rule.feePercent;
  const rawFee = (numAmount * effPercent) / 100;
  const finalFee = Math.max(rule.minFee || 0, Math.min(rule.maxFee || 9999, rawFee));
  const customerPayout = Math.max(0, numAmount - finalFee);

  const handleCashCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      setErrorMsg('Customer name is required.');
      return;
    }
    if (numAmount <= 0) {
      setErrorMsg('Check amount must be greater than $0.00.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await api.createCheckCashingTransaction({
        customerName,
        customerPhone,
        customerIdType,
        customerIdNumber,
        customerIdState,
        checkType,
        checkNumber,
        checkAmount: numAmount,
        micrRoutingNumber,
        micrAccountNumber,
        issuerName,
        feePercentOverride: feePercentOverride ? parseFloat(feePercentOverride) : undefined,
        feeOverrideReason: feeOverrideReason || undefined,
        instantPayout: true,
      });

      onSuccess();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to process check cashing.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#141414] border border-[#333333] rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
        <div className="p-5 border-b border-[#242424] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black uppercase text-white tracking-wider">
                Cash Customer Check (Direct Drawer Payout)
              </h3>
              <p className="text-xs text-[#888888]">ID Verification • MICR Extraction • Fee Calculation</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-[#888888] hover:text-white rounded-lg transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleCashCheck} className="p-5 overflow-y-auto space-y-4 flex-1">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Payout Summary Banner */}
          <div className="grid grid-cols-3 gap-3 bg-[#181818] p-3.5 rounded-xl border border-[#282828] text-center">
            <div>
              <span className="text-[10px] uppercase font-bold text-[#888888] block">Check Amount</span>
              <span className="text-base font-mono font-bold text-white mt-0.5 block">
                ${numAmount.toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-[#888888] block">Store Fee ({effPercent}%)</span>
              <span className="text-base font-mono font-bold text-emerald-400 mt-0.5 block">
                ${finalFee.toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-[#888888] block">Cash to Customer</span>
              <span className="text-base font-mono font-black text-[#C5A059] mt-0.5 block">
                ${customerPayout.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Section: Customer Identification */}
          <div>
            <h4 className="text-xs uppercase font-bold text-[#CCCCCC] tracking-wider mb-2 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-[#C5A059]" />
              Customer Identification & Compliance
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-[#888888] uppercase block mb-1">Customer Full Name</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="e.g. Johnathan Miller"
                  className="w-full bg-[#1A1A1A] border border-[#333333] rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#C5A059]"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] text-[#888888] uppercase block mb-1">Customer Phone</label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  placeholder="(817) 555-0199"
                  className="w-full bg-[#1A1A1A] border border-[#333333] rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#C5A059]"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-2">
              <div>
                <label className="text-[10px] text-[#888888] uppercase block mb-1">ID Type</label>
                <select
                  value={customerIdType}
                  onChange={e => setCustomerIdType(e.target.value)}
                  className="w-full bg-[#1A1A1A] border border-[#333333] rounded px-2 py-1.5 text-xs text-white"
                >
                  <option value="Driver License">Driver's License</option>
                  <option value="State ID">State ID Card</option>
                  <option value="Passport">US / Foreign Passport</option>
                  <option value="Military ID">Military ID</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-[#888888] uppercase block mb-1">ID Number</label>
                <input
                  type="text"
                  value={customerIdNumber}
                  onChange={e => setCustomerIdNumber(e.target.value)}
                  placeholder="TX-8912743"
                  className="w-full bg-[#1A1A1A] border border-[#333333] rounded px-2 py-1.5 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] text-[#888888] uppercase block mb-1">State</label>
                <input
                  type="text"
                  value={customerIdState}
                  onChange={e => setCustomerIdState(e.target.value)}
                  placeholder="TX"
                  className="w-full bg-[#1A1A1A] border border-[#333333] rounded px-2 py-1.5 text-xs text-white uppercase text-center"
                />
              </div>
            </div>
          </div>

          {/* Section: Check Details */}
          <div>
            <h4 className="text-xs uppercase font-bold text-[#CCCCCC] tracking-wider mb-2 flex items-center gap-1.5">
              <FileCheck className="w-3.5 h-3.5 text-[#C5A059]" />
              Check Information & MICR Data
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] text-[#888888] uppercase block mb-1">Check Type</label>
                <select
                  value={checkType}
                  onChange={e => setCheckType(e.target.value)}
                  className="w-full bg-[#1A1A1A] border border-[#333333] rounded px-2 py-1.5 text-xs text-white"
                >
                  <option value="payroll">Payroll Check (1.5%)</option>
                  <option value="government">Government / Treasury (1.0%)</option>
                  <option value="tax_refund">IRS Tax Refund (1.0%)</option>
                  <option value="cashiers">Cashier's Check (2.0%)</option>
                  <option value="insurance">Insurance Settlement (2.0%)</option>
                  <option value="personal">Personal Check (3.0%)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-[#888888] uppercase block mb-1">Check Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={checkAmount}
                  onChange={e => setCheckAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-[#1A1A1A] border border-[#333333] rounded px-2 py-1.5 text-xs text-white font-mono font-bold"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] text-[#888888] uppercase block mb-1">Check #</label>
                <input
                  type="text"
                  value={checkNumber}
                  onChange={e => setCheckNumber(e.target.value)}
                  placeholder="1042"
                  className="w-full bg-[#1A1A1A] border border-[#333333] rounded px-2 py-1.5 text-xs text-white font-mono"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
              <div>
                <label className="text-[10px] text-[#888888] uppercase block mb-1">Routing #</label>
                <input
                  type="text"
                  value={micrRoutingNumber}
                  onChange={e => setMicrRoutingNumber(e.target.value)}
                  placeholder="111000025"
                  className="w-full bg-[#1A1A1A] border border-[#333333] rounded px-2 py-1.5 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] text-[#888888] uppercase block mb-1">Account #</label>
                <input
                  type="text"
                  value={micrAccountNumber}
                  onChange={e => setMicrAccountNumber(e.target.value)}
                  placeholder="982341234"
                  className="w-full bg-[#1A1A1A] border border-[#333333] rounded px-2 py-1.5 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] text-[#888888] uppercase block mb-1">Issuer / Employer</label>
                <input
                  type="text"
                  value={issuerName}
                  onChange={e => setIssuerName(e.target.value)}
                  placeholder="Granbury Construction"
                  className="w-full bg-[#1A1A1A] border border-[#333333] rounded px-2 py-1.5 text-xs text-white"
                />
              </div>
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#1F1F1F] hover:bg-[#292929] text-[#CCCCCC] rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-[#C5A059] hover:bg-[#B38F46] text-black font-black text-xs uppercase tracking-wider rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow"
            >
              <DollarSign className="w-4 h-4" />
              {isSubmitting ? 'Processing Payout...' : `Confirm & Disburse $${customerPayout.toFixed(2)}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// SUBCOMPONENT: QR PHONE INTAKE MODAL
// ============================================================================
interface QrIntakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: CheckQrSession;
}

const QrIntakeModal: React.FC<QrIntakeModalProps> = ({ isOpen, onClose, session }) => {
  if (!isOpen) return null;

  const directMobileUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}?mobileCheck=${session.token || session.id}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#141414] border border-[#333333] rounded-2xl w-full max-w-md p-6 text-center shadow-2xl animate-in fade-in zoom-in-95">
        <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-3">
          <QrCode className="w-6 h-6" />
        </div>
        <h3 className="text-base font-black uppercase text-white tracking-wider">
          Customer Smartphone Upload
        </h3>
        <p className="text-xs text-[#AAAAAA] mt-1">
          Scan with any smartphone camera to open the high-speed check & ID intake directly without loading delays.
        </p>

        {/* Dynamic QR Code */}
        <div className="my-5 p-4 bg-white rounded-2xl inline-block shadow-lg">
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(directMobileUrl)}`}
            alt="Intake QR Code"
            className="w-48 h-48 mx-auto"
          />
        </div>

        <div className="p-2.5 bg-[#1A1A1A] border border-[#2B2B2B] rounded-xl text-xs text-[#CCCCCC] font-mono break-all flex items-center justify-between">
          <span className="truncate pr-2">Session: {session.token}</span>
          <a
            href={directMobileUrl}
            target="_blank"
            rel="noreferrer"
            className="px-2.5 py-1 rounded bg-[#C5A059] text-black font-bold text-[10px] uppercase shrink-0 hover:bg-[#B38F46]"
          >
            Open Link
          </a>
        </div>

        <div className="mt-5">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-[#222222] hover:bg-[#2E2E2E] text-white font-bold text-xs uppercase rounded-xl transition-colors cursor-pointer"
          >
            Done / Close QR
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// SUBCOMPONENT: VOID CHECK MODAL
// ============================================================================
interface VoidCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  check: IssuedCheck;
  onVoided: () => void;
}

const VoidCheckModal: React.FC<VoidCheckModalProps> = ({ isOpen, onClose, check, onVoided }) => {
  const [reason, setReason] = useState<string>('Paper jam / Printer alignment spoiled');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleVoid = async () => {
    setIsSubmitting(true);
    try {
      await api.voidIssuedCheck(check.id, reason);
      playBeep('success');
      onVoided();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#141414] border border-[#333333] rounded-2xl w-full max-w-md p-5 shadow-2xl animate-in fade-in zoom-in-95">
        <div className="flex items-center space-x-3 text-rose-400 mb-3">
          <Ban className="w-6 h-6" />
          <h3 className="text-base font-black uppercase tracking-wider text-white">
            Void Check #{check.checkNumber}
          </h3>
        </div>
        <p className="text-xs text-[#888888]">
          Voiding this check will reverse the deduction from {check.bankAccountName} and mark the check permanently voided.
        </p>

        <div className="my-4">
          <label className="text-[10px] text-[#AAAAAA] uppercase block mb-1">Reason for Void</label>
          <input
            type="text"
            value={reason}
            onChange={e => setReason(e.target.value)}
            className="w-full bg-[#1A1A1A] border border-[#333333] rounded px-3 py-2 text-xs text-white"
            required
          />
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 bg-[#1F1F1F] hover:bg-[#292929] text-[#CCCCCC] rounded text-xs font-bold uppercase transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleVoid}
            disabled={isSubmitting}
            className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-bold uppercase transition-colors cursor-pointer"
          >
            {isSubmitting ? 'Voiding...' : 'Confirm Void'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// SUBCOMPONENT: CREATE DEPOSIT BATCH MODAL
// ============================================================================
interface CreateDepositBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  bankAccounts: BankAccount[];
  unbatchedTransactions: CheckCashingTransaction[];
  onSuccess: () => void;
}

const CreateDepositBatchModal: React.FC<CreateDepositBatchModalProps> = ({
  isOpen,
  onClose,
  bankAccounts,
  unbatchedTransactions,
  onSuccess,
}) => {
  const [bankId, setBankId] = useState<string>(bankAccounts[0]?.id || 'bank-1');
  const [selectedTxIds, setSelectedTxIds] = useState<string[]>(unbatchedTransactions.map(t => t.id));
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const totalBatchAmount = unbatchedTransactions
    .filter(t => selectedTxIds.includes(t.id))
    .reduce((sum, t) => sum + t.checkAmount, 0);

  const handleCreate = async () => {
    if (selectedTxIds.length === 0) return;
    setIsSubmitting(true);
    try {
      await api.createDepositBatch({
        depositBankAccountId: bankId,
        transactionIds: selectedTxIds,
      });
      playBeep('success');
      onSuccess();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#141414] border border-[#333333] rounded-2xl w-full max-w-lg p-5 shadow-2xl animate-in fade-in zoom-in-95">
        <h3 className="text-base font-black uppercase text-white tracking-wider mb-1">
          Create Bank Deposit Batch (CC-22)
        </h3>
        <p className="text-xs text-[#888888] mb-4">
          Bundle cashed checks to deposit into store operating account.
        </p>

        <div className="space-y-3">
          <div>
            <label className="text-[10px] text-[#AAAAAA] uppercase block mb-1">Deposit Destination Bank</label>
            <select
              value={bankId}
              onChange={e => setBankId(e.target.value)}
              className="w-full bg-[#1A1A1A] border border-[#333333] rounded px-3 py-2 text-xs text-white"
            >
              {bankAccounts.map(b => (
                <option key={b.id} value={b.id}>
                  {b.accountName} - {b.bankName}
                </option>
              ))}
            </select>
          </div>

          <div className="p-3 bg-[#1A1A1A] border border-[#2B2B2B] rounded-lg text-xs flex items-center justify-between">
            <span>Selected Checks: <strong>{selectedTxIds.length}</strong></span>
            <span className="font-mono font-black text-[#C5A059] text-sm">
              ${totalBatchAmount.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="mt-5 flex items-center space-x-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 bg-[#1F1F1F] hover:bg-[#292929] text-[#CCCCCC] rounded text-xs font-bold uppercase transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={isSubmitting || selectedTxIds.length === 0}
            className="flex-1 py-2 bg-[#C5A059] hover:bg-[#B38F46] text-black font-black text-xs uppercase tracking-wider rounded transition-colors cursor-pointer"
          >
            {isSubmitting ? 'Creating...' : 'Generate Batch & Deposit Slip'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// SUBCOMPONENT: PRINTABLE DEPOSIT SLIP MODAL
// ============================================================================
const DepositSlipModal: React.FC<{ isOpen: boolean; onClose: () => void; batch: DepositBatch }> = ({
  isOpen,
  onClose,
  batch,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#141414] border border-[#333333] rounded-2xl w-full max-w-lg p-6 shadow-2xl animate-in fade-in zoom-in-95">
        <div className="flex justify-between items-center pb-3 border-b border-[#242424]">
          <span className="text-sm font-black uppercase text-white tracking-wider">
            Official Bank Deposit Slip
          </span>
          <button onClick={onClose} className="text-[#888888] hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="my-4 bg-white text-black p-5 rounded font-mono text-xs border border-neutral-300">
          <div className="text-center font-black pb-2 border-b border-neutral-400 uppercase">
            {batch.depositBankName || batch.bankAccountName || 'COMMERCIAL OPERATING ACCOUNT'}
            <div className="text-[10px] font-normal">DEPOSIT TICKET</div>
          </div>
          <div className="py-2 text-[10px] space-y-1">
            <div className="flex justify-between">
              <span>Depositor:</span>
              <span className="font-bold">377 SPIRITS LLC</span>
            </div>
            <div className="flex justify-between">
              <span>Batch Ref:</span>
              <span className="font-bold">{batch.batchNumber}</span>
            </div>
            <div className="flex justify-between">
              <span>Date:</span>
              <span>{new Date(batch.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          <div className="border-t border-b border-dashed border-neutral-400 py-2 space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span>Total Number of Checks:</span>
              <span className="font-bold">{batch.checkCount ?? batch.checksCount ?? batch.checkIds?.length ?? 0}</span>
            </div>
            <div className="flex justify-between font-black text-sm">
              <span>TOTAL DEPOSIT:</span>
              <span>${batch.totalAmount.toFixed(2)}</span>
            </div>
          </div>

          <div className="pt-4 text-center text-[9px] text-neutral-500">
            Teller Stamp / Date Validation
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#222222] hover:bg-[#2A2A2A] text-white rounded text-xs uppercase font-bold cursor-pointer"
          >
            Close
          </button>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-[#C5A059] hover:bg-[#B38F46] text-black rounded text-xs uppercase font-black cursor-pointer flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Deposit Ticket
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// SUBCOMPONENT: LOG RETURNED CHECK MODAL
// ============================================================================
const LogReturnedCheckModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  transaction: CheckCashingTransaction;
  onSuccess: () => void;
}> = ({ isOpen, onClose, transaction, onSuccess }) => {
  const [returnReason, setReturnReason] = useState<string>('NSF - Non-Sufficient Funds');
  const [bankFeeCharged, setBankFeeCharged] = useState<string>('30.00');
  const [customerRecoveryFee, setCustomerRecoveryFee] = useState<string>('25.00');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleReturn = async () => {
    setIsSubmitting(true);
    try {
      await api.markCheckReturned(transaction.id, {
        returnReason,
        bankFeeCharged: parseFloat(bankFeeCharged) || 0,
        customerRecoveryFee: parseFloat(customerRecoveryFee) || 0,
      });
      playBeep('error');
      onSuccess();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#141414] border border-[#333333] rounded-2xl w-full max-w-md p-5 shadow-2xl animate-in fade-in zoom-in-95">
        <h3 className="text-base font-black uppercase text-rose-400 tracking-wider mb-1 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Log Returned Check #{transaction.checkNumber}
        </h3>
        <p className="text-xs text-[#888888] mb-4">
          Customer: <strong>{transaction.customerName}</strong> • Check: ${transaction.checkAmount.toFixed(2)}
        </p>

        <div className="space-y-3">
          <div>
            <label className="text-[10px] text-[#AAAAAA] uppercase block mb-1">Bank Return Reason</label>
            <select
              value={returnReason}
              onChange={e => setReturnReason(e.target.value)}
              className="w-full bg-[#1A1A1A] border border-[#333333] rounded px-2.5 py-1.5 text-xs text-white"
            >
              <option value="NSF - Non-Sufficient Funds">NSF - Non-Sufficient Funds</option>
              <option value="Stop Payment Ordered">Stop Payment Ordered</option>
              <option value="Account Closed">Account Closed</option>
              <option value="Unable to Locate Account">Unable to Locate Account</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-[#AAAAAA] uppercase block mb-1">Bank NSF Fee ($)</label>
              <input
                type="number"
                step="0.01"
                value={bankFeeCharged}
                onChange={e => setBankFeeCharged(e.target.value)}
                className="w-full bg-[#1A1A1A] border border-[#333333] rounded px-2 py-1.5 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#AAAAAA] uppercase block mb-1">Customer Recovery Fee ($)</label>
              <input
                type="number"
                step="0.01"
                value={customerRecoveryFee}
                onChange={e => setCustomerRecoveryFee(e.target.value)}
                className="w-full bg-[#1A1A1A] border border-[#333333] rounded px-2 py-1.5 text-xs text-white font-mono"
              />
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center space-x-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 bg-[#1F1F1F] hover:bg-[#292929] text-[#CCCCCC] rounded text-xs font-bold uppercase cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleReturn}
            disabled={isSubmitting}
            className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded text-xs font-bold uppercase cursor-pointer"
          >
            {isSubmitting ? 'Logging...' : 'Confirm Returned Check'}
          </button>
        </div>
      </div>
    </div>
  );
};
