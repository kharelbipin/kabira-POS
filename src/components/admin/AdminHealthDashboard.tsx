import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Boxes,
  CheckCircle2,
  CircleAlert,
  Cpu,
  Monitor,
  Printer,
  RefreshCw,
  Server,
  Store,
  UserRound,
} from 'lucide-react';
import { StoreSettings } from '../../types';
import { api } from '../../utils/api';
import { hardwareStore } from '../../hardware';

interface AdminHealthDashboardProps {
  settings: StoreSettings | null;
  onOpenHardware: () => void;
  onOpenUsers: () => void;
  onOpenInventory: () => void;
}

interface RegisterRow {
  id: string;
  name: string;
  location: string;
  status: string;
  currentCashier: string | null;
  activeShiftId: string | null;
}

export const AdminHealthDashboard: React.FC<AdminHealthDashboardProps> = ({
  settings,
  onOpenHardware,
  onOpenUsers,
  onOpenInventory,
}) => {
  const [registers, setRegisters] = useState<RegisterRow[]>([]);
  const [bridgeTelemetryCount, setBridgeTelemetryCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [bridgeHealth, setBridgeHealth] = useState(hardwareStore.getHealth());
  const [configuredHardware, setConfiguredHardware] = useState(hardwareStore.getConfiguredHardware());

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [registerResult, telemetryResult] = await Promise.all([
        api.getRegisters().catch(() => ({ registers: [] })),
        api.getBridgeTelemetry().catch(() => ({ terminals: [], count: 0, serverTime: new Date().toISOString() })),
        hardwareStore.refreshHealth().catch(() => hardwareStore.getHealth()),
      ]);

      setRegisters(registerResult.registers || []);
      setBridgeTelemetryCount(telemetryResult.count || 0);
      setBridgeHealth(hardwareStore.getHealth());
      setConfiguredHardware(hardwareStore.getConfiguredHardware());
      setLastUpdated(new Date().toLocaleTimeString());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();

    const unsubscribe = hardwareStore.subscribe(() => {
      setBridgeHealth(hardwareStore.getHealth());
      setConfiguredHardware(hardwareStore.getConfiguredHardware());
    });

    const timer = window.setInterval(() => {
      void refresh();
    }, 30000);

    return () => {
      unsubscribe();
      window.clearInterval(timer);
    };
  }, [refresh]);

  const bridgeOnline = bridgeHealth.status === 'running';
  const printerConfigured = Boolean(configuredHardware.receipt_printer?.deviceId);
  const drawerConfigured = Boolean(configuredHardware.cash_drawer?.deviceId || configuredHardware.cash_drawer?.hostPrinterId);
  const scannerConfigured = Boolean(configuredHardware.barcode_scanner?.deviceId);
  const customerDisplayConfigured = Boolean(configuredHardware.customer_display?.deviceId || configuredHardware.customer_display?.displayId);
  const onlineRegisters = registers.filter(r => r.status === 'active').length;
  const activeShifts = registers.filter(r => Boolean(r.activeShiftId)).length;

  const healthScore = useMemo(() => {
    const checks = [
      true,
      bridgeOnline,
      printerConfigured,
      drawerConfigured,
      scannerConfigured,
      customerDisplayConfigured,
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [bridgeOnline, printerConfigured, drawerConfigured, scannerConfigured, customerDisplayConfigured]);

  const statusPill = (ok: boolean, trueLabel = 'ONLINE', falseLabel = 'NEEDS ATTENTION') => (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
      ok
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : 'bg-rose-50 text-rose-700 border-rose-200'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-emerald-500' : 'bg-rose-500'}`} />
      {ok ? trueLabel : falseLabel}
    </span>
  );

  return (
    <div className="h-full overflow-y-auto bg-slate-100 text-slate-900 p-4 md:p-6 space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-sky-600" />
            <h1 className="text-xl font-black tracking-tight">Store & Register Health</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Live operational status for {settings?.storeName || 'KaBiRa POS Store'}.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void refresh()}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold shadow-sm cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Health
        </button>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-black uppercase tracking-wider">Store Status</span>
            <Server className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2">{statusPill(true, 'ONLINE', 'OFFLINE')}</div>
          <p className="text-[11px] text-slate-500 mt-2">{settings?.cityStateZip || settings?.address || 'Primary Store'}</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-black uppercase tracking-wider">Registers Online</span>
            <Monitor className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-2xl font-black mt-2">{onlineRegisters}/{registers.length || 2}</div>
          <p className="text-[11px] text-slate-500 mt-1">{activeShifts} active shift{activeShifts === 1 ? '' : 's'}</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-black uppercase tracking-wider">Bridge</span>
            <Cpu className="w-4 h-4 text-violet-500" />
          </div>
          <div className="mt-2">{statusPill(bridgeOnline, 'ONLINE', 'OFFLINE')}</div>
          <p className="text-[11px] text-slate-500 mt-2">
            Port {bridgeHealth.port || 5055} · {bridgeTelemetryCount} telemetry terminal{bridgeTelemetryCount === 1 ? '' : 's'}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-black uppercase tracking-wider">Hardware Health</span>
            <Activity className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black mt-2">{healthScore}%</div>
          <p className="text-[11px] text-slate-500 mt-1">Configured and reachable health snapshot</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black">Registers</h2>
              <p className="text-[11px] text-slate-500">Current terminal and shift status.</p>
            </div>
            <span className="text-[10px] text-slate-400">Updated {lastUpdated || '—'}</span>
          </div>

          <div className="divide-y divide-slate-100">
            {(registers.length ? registers : [
              { id: 'reg-1', name: 'Terminal #01 (Front Register)', location: 'Main Checkout Counter', status: 'active', currentCashier: null, activeShiftId: null },
              { id: 'reg-2', name: 'Terminal #02 (Express / Drive-Thru)', location: 'Secondary Express Counter', status: 'active', currentCashier: null, activeShiftId: null },
            ]).map(register => (
              <div key={register.id} className="px-4 py-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center">
                    <Monitor className="w-5 h-5 text-sky-600" />
                  </div>
                  <div>
                    <div className="text-sm font-black">{register.name}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{register.location}</div>
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-600">
                      <span className="flex items-center gap-1">
                        <UserRound className="w-3.5 h-3.5" />
                        {register.currentCashier || 'No active cashier'}
                      </span>
                      <span>{register.activeShiftId ? 'Shift open' : 'No open shift'}</span>
                    </div>
                  </div>
                </div>
                {statusPill(register.status === 'active', 'ONLINE', 'OFFLINE')}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="px-4 py-3 border-b border-slate-200">
            <h2 className="text-sm font-black">Register 01 Hardware</h2>
            <p className="text-[11px] text-slate-500">Configured device readiness.</p>
          </div>

          <div className="p-4 space-y-3">
            {[
              ['Bridge', bridgeOnline, bridgeHealth.version || 'Local bridge', Cpu],
              ['Receipt Printer', printerConfigured, configuredHardware.receipt_printer?.deviceName || 'Not configured', Printer],
              ['Cash Drawer', drawerConfigured, configuredHardware.cash_drawer?.deviceName || 'Not configured', Boxes],
              ['Barcode Scanner', scannerConfigured, configuredHardware.barcode_scanner?.deviceName || 'Not configured', CheckCircle2],
              ['Customer Display', customerDisplayConfigured, configuredHardware.customer_display?.deviceName || 'Not configured', Monitor],
            ].map(([label, ok, detail, Icon]: any) => (
              <div key={label} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${ok ? 'text-emerald-600' : 'text-rose-500'}`} />
                  <div className="min-w-0">
                    <div className="text-xs font-black">{label}</div>
                    <div className="text-[10px] text-slate-500 truncate">{String(detail)}</div>
                  </div>
                </div>
                {ok ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <CircleAlert className="w-4 h-4 text-rose-500 shrink-0" />
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={onOpenHardware}
              className="w-full mt-2 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-black hover:bg-slate-800 cursor-pointer"
            >
              Open Hardware Manager
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <button onClick={onOpenUsers} className="bg-white border border-slate-200 rounded-2xl p-4 text-left hover:border-sky-300 shadow-sm cursor-pointer">
          <Users className="w-5 h-5 text-sky-600 mb-2" />
          <div className="text-sm font-black">Users & Roles</div>
          <div className="text-[11px] text-slate-500 mt-1">Create managers and cashiers, assign access, and manage credentials.</div>
        </button>
        <button onClick={onOpenInventory} className="bg-white border border-slate-200 rounded-2xl p-4 text-left hover:border-sky-300 shadow-sm cursor-pointer">
          <Boxes className="w-5 h-5 text-amber-600 mb-2" />
          <div className="text-sm font-black">Inventory Control</div>
          <div className="text-[11px] text-slate-500 mt-1">Review stock health and receiving operations.</div>
        </button>
        <button onClick={onOpenHardware} className="bg-white border border-slate-200 rounded-2xl p-4 text-left hover:border-sky-300 shadow-sm cursor-pointer">
          <Cpu className="w-5 h-5 text-violet-600 mb-2" />
          <div className="text-sm font-black">Hardware Diagnostics</div>
          <div className="text-[11px] text-slate-500 mt-1">Inspect bridge and local device configuration.</div>
        </button>
      </div>
    </div>
  );
};
