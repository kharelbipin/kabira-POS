import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Monitor,
  RefreshCw,
  Sliders,
  Download,
  Wifi,
  WifiOff,
  Clock3,
  Cpu,
} from 'lucide-react';
import { api } from '../../utils/api';
import { useAdminStore } from '../../contexts/AdminStoreContext';

interface AdminRegistersViewProps {
  onOpenDesigner: () => void;
}

interface RegisterRow {
  id: string;
  name: string;
  location?: string;
  status?: string;
  currentCashier?: string | null;
  activeShiftId?: string | null;
  storeId?: string;
  terminalId?: string;
  posVersion?: string;
  configurationVersion?: number;
  lastSeenAt?: string;
}

export const AdminRegistersView: React.FC<AdminRegistersViewProps> = ({
  onOpenDesigner,
}) => {
  const { stores, selectedStoreId, selectedStore, isAllStores, setSelectedStoreId } = useAdminStore();
  const [registers, setRegisters] = useState<RegisterRow[]>([]);
  const [terminals, setTerminals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const scope = isAllStores ? 'all' : selectedStoreId;
      const [registerResult, terminalResult] = await Promise.all([
        api.getRegisters(scope).catch(() => ({ registers: [] })),
        api.getRegisteredTerminals().catch(() => ({ terminals: [] })),
      ]);
      setRegisters(registerResult.registers || []);
      setTerminals(
        (terminalResult.terminals || []).filter(
          (terminal: any) => isAllStores || terminal.storeId === selectedStoreId
        )
      );
    } finally {
      setLoading(false);
    }
  }, [isAllStores, selectedStoreId]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo(() => {
    const byKey = new Map<string, RegisterRow>();

    for (const register of registers) {
      byKey.set(register.terminalId || register.id, register);
    }

    for (const terminal of terminals) {
      const key = terminal.id || terminal.registerId;
      if (!byKey.has(key)) {
        byKey.set(key, {
          id: terminal.registerId || terminal.id,
          name: terminal.registerName || terminal.deviceName || terminal.registerId,
          location: terminal.storeName,
          status: terminal.status,
          storeId: terminal.storeId,
          terminalId: terminal.id,
          posVersion: terminal.posVersion,
          configurationVersion: terminal.configurationVersion,
          lastSeenAt: terminal.lastSeenAt,
        });
      }
    }

    return Array.from(byKey.values());
  }, [registers, terminals]);

  if (isAllStores) {
    return (
      <div className="h-full overflow-y-auto bg-[#f4f8fc] p-5 md:p-7">
        <div className="max-w-6xl mx-auto space-y-5">
          <div>
            <div className="text-[11px] text-slate-500 font-semibold">Administration › POS Registers</div>
            <h1 className="mt-2 text-3xl font-black text-[#0d1b36]">Stores & Registers</h1>
            <p className="mt-1 text-sm text-slate-500">
              Choose a store to manage its registers, deployment, and POS configuration.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {stores.map(store => (
              <button
                key={store.id}
                type="button"
                onClick={() => setSelectedStoreId(store.id)}
                className="text-left rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-sky-300 hover:shadow-md transition cursor-pointer"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-sky-600" />
                  </div>
                  <span className="text-[10px] uppercase tracking-wider font-black text-slate-400">
                    Store #{store.storeNumber}
                  </span>
                </div>
                <div className="mt-4 text-base font-black text-slate-900">{store.name}</div>
                <div className="mt-1 text-xs text-slate-500">{store.cityStateZip}</div>
                <div className="mt-4 text-xs font-bold text-sky-700">
                  {store.registers.length} configured register{store.registers.length === 1 ? '' : 's'}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-[#f4f8fc] p-5 md:p-7">
      <div className="max-w-7xl mx-auto space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="text-[11px] text-slate-500 font-semibold">Administration › POS Registers</div>
            <h1 className="mt-2 text-3xl font-black text-[#0d1b36]">
              {selectedStore?.name || 'Selected Store'} Registers
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage enrolled terminals, versions, configuration, and deployment for this store.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void load()}
              className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              type="button"
              onClick={onOpenDesigner}
              className="h-10 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black flex items-center gap-2 cursor-pointer"
            >
              <Sliders className="w-4 h-4" />
              POS Designer
            </button>
            <button
              type="button"
              onClick={onOpenDesigner}
              className="h-10 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-black flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Build Installer
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-[10px] uppercase tracking-wider font-black text-slate-400">Registers</div>
            <div className="mt-2 text-2xl font-black text-slate-900">{rows.length}</div>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-white p-4">
            <div className="text-[10px] uppercase tracking-wider font-black text-slate-400">Online</div>
            <div className="mt-2 text-2xl font-black text-emerald-600">
              {rows.filter(row => ['online', 'active'].includes(String(row.status || '').toLowerCase())).length}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-[10px] uppercase tracking-wider font-black text-slate-400">Activated Devices</div>
            <div className="mt-2 text-2xl font-black text-sky-600">{terminals.length}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-[10px] uppercase tracking-wider font-black text-slate-400">Store Type</div>
            <div className="mt-2 text-lg font-black text-slate-900 capitalize">
              {selectedStore?.businessType.replace('_', ' ') || '—'}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <div className="text-base font-black text-slate-900">Register Directory</div>
            <div className="text-xs text-slate-500 mt-1">
              Enrolled POS terminals and configured registers for {selectedStore?.name}.
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3">Register</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Current Cashier</th>
                  <th className="px-4 py-3">POS Version</th>
                  <th className="px-4 py-3">Config</th>
                  <th className="px-4 py-3">Last Seen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                      No registers are enrolled for this store yet. Use Build Installer to deploy the first terminal.
                    </td>
                  </tr>
                ) : rows.map(row => {
                  const online = ['online', 'active'].includes(String(row.status || '').toLowerCase());
                  return (
                    <tr key={row.terminalId || row.id} className="hover:bg-slate-50">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center">
                            <Monitor className="w-4 h-4 text-slate-600" />
                          </div>
                          <div>
                            <div className="font-black text-slate-900">{row.name}</div>
                            <div className="text-[10px] text-slate-500">{row.location || row.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full font-bold ${
                          online ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {online ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                          {String(row.status || 'offline').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-4 font-semibold text-slate-700">{row.currentCashier || '—'}</td>
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center gap-1.5 text-slate-700">
                          <Cpu className="w-3.5 h-3.5 text-slate-400" />
                          {row.posVersion || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-4 font-mono text-sky-700">
                        {row.configurationVersion ? `v${row.configurationVersion}` : '—'}
                      </td>
                      <td className="px-4 py-4 text-slate-500">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock3 className="w-3.5 h-3.5" />
                          {row.lastSeenAt ? new Date(row.lastSeenAt).toLocaleString() : '—'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
