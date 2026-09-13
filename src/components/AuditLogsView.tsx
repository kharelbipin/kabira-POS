import React, { useState, useEffect } from 'react';
import { AuditLog } from '../types';
import { api } from '../utils/api';
import {
  FileClock,
  ShieldAlert,
  Search,
  RefreshCw,
  Clock,
  User,
  Filter,
} from 'lucide-react';

export const AuditLogsView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [actionFilter, setActionFilter] = useState<string>('all');

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const data = await api.getAuditLogs();
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(l => {
    if (actionFilter !== 'all' && !l.action.toLowerCase().includes(actionFilter.toLowerCase())) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        l.userName.toLowerCase().includes(q) ||
        l.action.toLowerCase().includes(q) ||
        l.details.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-84px)] overflow-hidden bg-[#0A0A0A] text-[#E5E5E5] p-4 md:p-6 select-none space-y-4">
      {/* Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0D0D0D] p-4 rounded-xl border border-[#262626] shrink-0">
        <div>
          <h2 className="text-xl font-serif italic font-bold text-[#F5F5F5] flex items-center space-x-2">
            <ShieldAlert className="w-5 h-5 text-[#C5A059]" />
            <span>Immutable Compliance Audit Log</span>
          </h2>
          <p className="text-xs text-[#737373] mt-0.5 font-sans">
            Cryptographically timestamped operational trace of all logins, voids, refunds, and price modifications
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-[#737373] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search audit trail..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-[#141414] border border-[#262626] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#E5E5E5] placeholder:text-[#666666] focus:outline-hidden focus:border-[#C5A059]"
            />
          </div>

          <select
            value={actionFilter}
            onChange={e => setActionFilter(e.target.value)}
            className="bg-[#141414] border border-[#262626] rounded-lg px-2.5 py-1.5 text-xs text-[#D4D4D4] focus:outline-hidden focus:border-[#C5A059]"
          >
            <option value="all" className="bg-[#141414]">All Actions</option>
            <option value="ORDER_CREATED" className="bg-[#141414]">Orders</option>
            <option value="ORDER_VOIDED" className="bg-[#141414]">Voids</option>
            <option value="ORDER_REFUNDED" className="bg-[#141414]">Refunds</option>
            <option value="INVENTORY_" className="bg-[#141414]">Stock Adjustments</option>
            <option value="USER_" className="bg-[#141414]">User Admin</option>
            <option value="SETTINGS_" className="bg-[#141414]">Settings Changes</option>
          </select>

          <button
            onClick={fetchLogs}
            className="p-2 text-[#737373] hover:text-white rounded hover:bg-[#141414] cursor-pointer transition-colors"
            title="Refresh logs"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-[#0F0F0F] border border-[#262626] rounded-xl overflow-hidden shadow-md flex-1 overflow-y-auto">
        <table className="w-full text-left text-xs text-[#D4D4D4]">
          <thead className="bg-[#0A0A0A] text-[#737373] uppercase text-[10px] tracking-widest border-b border-[#262626] font-bold">
            <tr>
              <th className="px-4 py-3.5">Timestamp</th>
              <th className="px-4 py-3.5">Operator</th>
              <th className="px-4 py-3.5">Action Type</th>
              <th className="px-4 py-3.5">Audit Details & Delta</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1F1F1F] font-mono text-[11px]">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-12 text-[#737373] font-sans">
                  No audit log records match filter.
                </td>
              </tr>
            ) : (
              filteredLogs.map(log => (
                <tr key={log.id} className="hover:bg-[#161616] transition-colors">
                  <td className="px-4 py-3 text-[#737373] whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </td>

                  <td className="px-4 py-3 font-sans font-medium text-[#F5F5F5] whitespace-nowrap">
                    {log.userName}
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        log.action.includes('VOID') || log.action.includes('DEACTIVATE')
                          ? 'bg-red-950/40 text-red-400 border border-red-800/60'
                          : log.action.includes('REFUND')
                          ? 'bg-[#C5A059]/15 text-[#C5A059] border border-[#C5A059]/30'
                          : log.action.includes('CREATE') || log.action.includes('RECEIVE')
                          ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/60'
                          : 'bg-blue-950/40 text-blue-400 border border-blue-800/60'
                      }`}
                    >
                      {log.action}
                    </span>
                  </td>

                  <td className="px-4 py-3 font-sans text-[#D4D4D4]">{log.details}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
