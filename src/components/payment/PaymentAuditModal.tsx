import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  CreditCard,
  Smartphone,
  QrCode,
  KeyRound,
  FileText,
  Download,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { api } from '../../utils/api';
import { PaymentAuditLog } from '../../types';

interface PaymentAuditModalProps {
  onClose: () => void;
}

export const PaymentAuditModal: React.FC<PaymentAuditModalProps> = ({ onClose }) => {
  const [logs, setLogs] = useState<PaymentAuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [resultFilter, setResultFilter] = useState<'all' | 'authorized' | 'failed' | 'cancelled'>('all');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await api.getPaymentAuditLogs();
      if (res.auditLogs) {
        setLogs(res.auditLogs);
      }
    } catch (e) {
      console.error('Failed to load audit logs', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(log => {
    const matchesSearch =
      log.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      log.employeeName.toLowerCase().includes(search.toLowerCase()) ||
      (log.processorTxId && log.processorTxId.toLowerCase().includes(search.toLowerCase())) ||
      (log.reasonForFallback && log.reasonForFallback.toLowerCase().includes(search.toLowerCase())) ||
      log.selectedMethod.toLowerCase().includes(search.toLowerCase());

    const matchesResult = resultFilter === 'all' || log.result === resultFilter;
    return matchesSearch && matchesResult;
  });

  const getMethodBadge = (method: string) => {
    switch (method) {
      case 'card_terminal':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <CreditCard className="w-3 h-3" />
            <span>Card Terminal</span>
          </span>
        );
      case 'tap_to_pay_phone':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
            <Smartphone className="w-3 h-3" />
            <span>Tap to Pay Phone</span>
          </span>
        );
      case 'customer_qr':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <QrCode className="w-3 h-3" />
            <span>Customer QR</span>
          </span>
        );
      case 'cashier_manual':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <KeyRound className="w-3 h-3" />
            <span>Cashier Keyed</span>
          </span>
        );
      case 'customer_self_entry':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <FileText className="w-3 h-3" />
            <span>Customer Self-Entry</span>
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
            {method}
          </span>
        );
    }
  };

  const exportCsv = () => {
    const headers = [
      'Timestamp',
      'Order Number',
      'Payment Attempt ID',
      'Store',
      'Register',
      'Employee',
      'Method',
      'Amount',
      'Result',
      'Processor Tx ID',
      'Fallback Reason',
      'Device Ref',
    ];
    const rows = filteredLogs.map(l => [
      l.timestamp,
      l.orderNumber,
      l.paymentAttemptId,
      l.store,
      l.register,
      l.employeeName,
      l.selectedMethod,
      l.amount.toFixed(2),
      l.result,
      l.processorTxId || '',
      `"${(l.reasonForFallback || '').replace(/"/g, '""')}"`,
      `"${(l.deviceSessionRef || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payment-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 z-50 animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center space-x-2">
                <span>Payment Fallback Audit Log (PAY-028)</span>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-full bg-amber-100 text-amber-800">
                  PCI Compliant
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Immutable electronic record of all fallback transactions, keyed entries, and processor authorizations
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={exportCsv}
              className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-700 flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="px-6 py-3 border-b border-slate-100 bg-white flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="relative flex-1 min-w-[240px]">
            <input
              type="text"
              placeholder="Search by order #, cashier, tx ID, or fallback reason..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-400"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-500">Status:</span>
            {(['all', 'authorized', 'failed', 'cancelled'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setResultFilter(tab)}
                className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-colors cursor-pointer ${
                  resultFilter === tab
                    ? 'bg-amber-500 text-slate-950 shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab}
              </button>
            ))}
            <button
              onClick={fetchLogs}
              title="Refresh logs"
              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center">
              <RefreshCw className="w-6 h-6 animate-spin mb-2 text-amber-500" />
              <span>Loading payment audit records...</span>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              No audit records matched your filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-400 bg-slate-50">
                    <th className="py-3 px-3">Timestamp</th>
                    <th className="py-3 px-3">Order / Attempt</th>
                    <th className="py-3 px-3">Employee</th>
                    <th className="py-3 px-3">Method</th>
                    <th className="py-3 px-3">Amount</th>
                    <th className="py-3 px-3">Result</th>
                    <th className="py-3 px-3">Processor Ref</th>
                    <th className="py-3 px-3">Reason for Fallback</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="font-bold text-slate-900 block font-mono">{log.orderNumber}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{log.register}</span>
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-700 whitespace-nowrap">
                        {log.employeeName}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        {getMethodBadge(log.selectedMethod)}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                        ${log.amount.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        {log.result === 'authorized' ? (
                          <span className="inline-flex items-center space-x-1 text-emerald-600 font-bold text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Authorized</span>
                          </span>
                        ) : log.result === 'failed' ? (
                          <span className="inline-flex items-center space-x-1 text-rose-600 font-bold text-[11px]">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Declined</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 text-slate-400 font-bold text-[11px]">
                            <Clock className="w-3.5 h-3.5" />
                            <span className="capitalize">{log.result}</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono text-[10px] text-slate-600 max-w-[150px] truncate">
                        {log.processorTxId || '—'}
                      </td>
                      <td className="py-3 px-3 text-slate-600 text-[11px] max-w-[200px] truncate" title={log.reasonForFallback}>
                        {log.reasonForFallback || 'Standard processing'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer Note */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between shrink-0">
          <span>Total Records: {filteredLogs.length}</span>
          <span className="text-slate-400">Zero sensitive PAN or CVV data stored (PAY-019)</span>
        </div>
      </div>
    </div>
  );
};
