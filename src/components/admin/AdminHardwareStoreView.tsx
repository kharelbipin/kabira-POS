import React, { useCallback, useEffect, useState } from 'react';
import { Building2, Cpu, Monitor, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { api } from '../../utils/api';
import { useAdminStore } from '../../contexts/AdminStoreContext';
import { HardwareDeviceManager } from './HardwareDeviceManager';

export const AdminHardwareStoreView: React.FC = () => {
  const { selectedStoreId, selectedStore, isAllStores } = useAdminStore();
  const [telemetry, setTelemetry] = useState<any[]>([]);
  const [registers, setRegisters] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (isAllStores) {
      setTelemetry([]);
      setRegisters([]);
      return;
    }

    setLoading(true);
    try {
      const [telemetryResult, registerResult] = await Promise.all([
        api.getBridgeTelemetry(selectedStoreId).catch(() => ({
          terminals: [],
          count: 0,
          serverTime: new Date().toISOString(),
        })),
        api.getRegisters(selectedStoreId).catch(() => ({ registers: [] })),
      ]);
      setTelemetry(telemetryResult.terminals || []);
      setRegisters(registerResult.registers || []);
    } finally {
      setLoading(false);
    }
  }, [isAllStores, selectedStoreId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (isAllStores || !selectedStore) {
    return (
      <div className="h-full flex items-center justify-center bg-[#0A0A0A] p-6">
        <div className="max-w-lg w-full rounded-3xl border border-slate-800 bg-[#111827] p-8 text-center shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/20 mx-auto flex items-center justify-center">
            <Building2 className="w-7 h-7 text-sky-400" />
          </div>
          <h2 className="mt-4 text-xl font-black text-white">Select a Store</h2>
          <p className="mt-2 text-sm text-slate-400">
            Hardware is store and register specific. Select one store before viewing bridge,
            printer, drawer, scanner, or customer-display configuration.
          </p>
        </div>
      </div>
    );
  }

  const onlineBridges = telemetry.filter(
    terminal => terminal.online !== false && terminal.status !== 'offline'
  ).length;

  return (
    <div className="h-full overflow-y-auto bg-[#0A0A0A] p-4 md:p-6 text-white">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="rounded-2xl border border-slate-800 bg-[#111827] px-5 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-wider font-black text-slate-500">
              Hardware Scope
            </div>
            <div className="mt-1 text-lg font-black">{selectedStore.name}</div>
            <div className="mt-1 text-xs text-slate-400">
              {registers.length} register{registers.length === 1 ? '' : 's'} · {telemetry.length} bridge endpoint{telemetry.length === 1 ? '' : 's'}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 ${
              onlineBridges > 0
                ? 'border-emerald-800 bg-emerald-950/30 text-emerald-300'
                : 'border-slate-700 bg-slate-900 text-slate-400'
            }`}>
              {onlineBridges > 0 ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
              {onlineBridges} Bridge Online
            </div>

            <button
              type="button"
              onClick={() => void load()}
              className="px-3 py-2 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-xs font-bold flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh Store
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-amber-900/50 bg-amber-950/20 px-4 py-3 text-xs text-amber-200">
          <strong>Store context:</strong> remote status is filtered to {selectedStore.name}. Device
          tests and direct printer/drawer commands still run through the bridge connected to the
          computer where this Admin portal is currently open.
        </div>

        {registers.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {registers.map(register => (
              <div key={register.terminalId || register.id} className="rounded-2xl border border-slate-800 bg-[#111827] p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center">
                    <Monitor className="w-5 h-5 text-sky-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-black truncate">{register.name}</div>
                    <div className="text-[10px] text-slate-500 truncate">{register.location || register.id}</div>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-[10px]">
                  <span className="text-slate-500">Status</span>
                  <span className="font-black text-slate-300 uppercase">{register.status || 'offline'}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="rounded-2xl border border-slate-800 overflow-hidden">
          <div className="px-4 py-3 bg-[#111827] border-b border-slate-800 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-black uppercase tracking-wider">
              Hardware Device Manager — {selectedStore.name}
            </span>
          </div>
          <HardwareDeviceManager />
        </div>
      </div>
    </div>
  );
};
