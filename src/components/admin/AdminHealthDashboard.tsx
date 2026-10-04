import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  CircleAlert,
  Cpu,
  Monitor,
  Printer,
  RefreshCw,
  Server,
  Store,
  UserRound,
  Users,
} from 'lucide-react';
import { AuditLog, Order, StoreSettings } from '../../types';
import { api } from '../../utils/api';
import { hardwareStore } from '../../hardware';

interface AdminHealthDashboardProps {
  settings: StoreSettings | null;
  onOpenHardware: () => void;
  onOpenUsers: () => void;
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
}) => {
  const [registers, setRegisters] = useState<RegisterRow[]>([]);
  const [bridgeTelemetryCount, setBridgeTelemetryCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [bridgeHealth, setBridgeHealth] = useState(hardwareStore.getHealth());
  const [configuredHardware, setConfiguredHardware] = useState(hardwareStore.getConfiguredHardware());
  const [selectedRegister, setSelectedRegister] = useState<RegisterRow | null>(null);
  const [quickAction, setQuickAction] = useState<string | null>(null);
  const [quickActionMessage, setQuickActionMessage] = useState<{ success: boolean; message: string } | null>(null);
  const [latestOrder, setLatestOrder] = useState<Order | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [registerResult, telemetryResult, ordersResult, auditResult] = await Promise.all([
        api.getRegisters().catch(() => ({ registers: [] })),
        api.getBridgeTelemetry().catch(() => ({ terminals: [], count: 0, serverTime: new Date().toISOString() })),
        api.getOrders().catch(() => []),
        api.getAuditLogs().catch(() => []),
        hardwareStore.refreshHealth().catch(() => hardwareStore.getHealth()),
      ]);

      const sortedOrders = [...ordersResult].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      const sortedAudit = [...auditResult].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setRegisters(registerResult.registers || []);
      setBridgeTelemetryCount(telemetryResult.count || 0);
      setLatestOrder(sortedOrders[0] || null);
      setAuditLogs(sortedAudit);
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

  const alerts = useMemo(() => {
    const items: Array<{
      id: string;
      severity: 'critical' | 'warning' | 'info';
      title: string;
      detail: string;
      action: 'hardware' | 'users' | 'inventory' | null;
    }> = [];

    if (!bridgeOnline) {
      items.push({
        id: 'bridge-offline',
        severity: 'critical',
        title: 'POS Bridge Offline',
        detail: 'Register hardware commands may fail until the local bridge reconnects.',
        action: 'hardware',
      });
    }

    if (!printerConfigured) {
      items.push({
        id: 'printer-missing',
        severity: 'critical',
        title: 'Receipt Printer Not Configured',
        detail: 'Register 01 has no assigned receipt printer.',
        action: 'hardware',
      });
    }

    if (!drawerConfigured) {
      items.push({
        id: 'drawer-missing',
        severity: 'warning',
        title: 'Cash Drawer Not Configured',
        detail: 'Cash drawer control is unavailable on Register 01.',
        action: 'hardware',
      });
    }

    if (!scannerConfigured) {
      items.push({
        id: 'scanner-missing',
        severity: 'warning',
        title: 'Barcode Scanner Not Configured',
        detail: 'Barcode entry will rely on manual input until a scanner is assigned.',
        action: 'hardware',
      });
    }

    if (!customerDisplayConfigured) {
      items.push({
        id: 'display-missing',
        severity: 'warning',
        title: 'Customer Display Not Configured',
        detail: 'Register 01 does not currently have a customer display assignment.',
        action: 'hardware',
      });
    }

    registers.forEach(register => {
      if (register.status !== 'active') {
        items.push({
          id: `register-offline-${register.id}`,
          severity: 'critical',
          title: `${register.name} Offline`,
          detail: `${register.location} is not reporting as active.`,
          action: 'hardware',
        });
      } else if (!register.activeShiftId) {
        items.push({
          id: `shift-missing-${register.id}`,
          severity: 'info',
          title: `${register.name} Has No Open Shift`,
          detail: register.currentCashier
            ? `${register.currentCashier} is signed in without an active shift.`
            : 'No cashier or active shift is currently assigned.',
          action: 'users',
        });
      }
    });

    return items;
  }, [
    bridgeOnline,
    printerConfigured,
    drawerConfigured,
    scannerConfigured,
    customerDisplayConfigured,
    registers,
  ]);

  const criticalAlertCount = alerts.filter(a => a.severity === 'critical').length;
  const warningAlertCount = alerts.filter(a => a.severity === 'warning').length;
  const infoAlertCount = alerts.filter(a => a.severity === 'info').length;

  const runQuickAction = async (
    action: 'scan' | 'printer' | 'drawer' | 'display' | 'bridge'
  ) => {
    setQuickAction(action);
    setQuickActionMessage(null);

    try {
      if (action === 'scan') {
        const devices = await hardwareStore.scanHardware();
        setConfiguredHardware(hardwareStore.getConfiguredHardware());
        setBridgeHealth(hardwareStore.getHealth());
        setQuickActionMessage({
          success: true,
          message: `Device refresh complete. ${devices.length} device${devices.length === 1 ? '' : 's'} detected.`,
        });
      }

      if (action === 'printer') {
        const result = await hardwareStore.testDevice('receipt_printer');
        setQuickActionMessage({ success: result.success, message: result.message });
      }

      if (action === 'drawer') {
        const result = await hardwareStore.testDevice('cash_drawer');
        setQuickActionMessage({ success: result.success, message: result.message });
      }

      if (action === 'display') {
        const result = await hardwareStore.restartCustomerDisplay();
        setQuickActionMessage({ success: result.success, message: result.message });
      }

      if (action === 'bridge') {
        const confirmed = window.confirm(
          'Restart the KaBiRa Hardware Bridge service?\n\nPrinter, drawer, scanner, and customer-display hardware access may be unavailable for a few seconds.'
        );

        if (!confirmed) {
          setQuickAction(null);
          return;
        }

        const result = await api.restartBridgeService();
        setQuickActionMessage({ success: result.success, message: result.message });

        await new Promise(resolve => window.setTimeout(resolve, 2000));
        await hardwareStore.refreshHealth();
      }

      await refresh();
    } catch (error: any) {
      setQuickActionMessage({
        success: false,
        message: error?.message || 'Troubleshooting action failed.',
      });
    } finally {
      setQuickAction(null);
    }
  };

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

  const latestAuditFor = (...terms: string[]) =>
    auditLogs.find(log =>
      terms.some(term =>
        `${log.action} ${log.targetType} ${log.details}`
          .toLowerCase()
          .includes(term.toLowerCase())
      )
    ) || null;

  const latestPrint = latestAuditFor('print', 'receipt');
  const latestDrawer = latestAuditFor('drawer_open', 'drawer open', 'cash drawer');
  const latestDeviceScan = latestAuditFor('device scan', 'hardware scan', 'barcode_scan');
  const latestBridgeEvent = latestAuditFor('bridge_service_restart', 'bridge', 'hardware bridge');

  const formatTime = (value?: string | null) => {
    if (!value) return 'No activity recorded';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
  };

  return (
    <div className="h-full overflow-y-auto bg-[#f4f8fc] text-slate-900 p-5 md:p-7 space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <div className="text-[11px] text-slate-500 font-semibold mb-2">Dashboard <span className="mx-2">›</span> Store & Register Health</div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-sky-500/10 border border-sky-200 flex items-center justify-center">
              <Store className="w-6 h-6 text-sky-600" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-[#0d1b36]">Store & Register Health</h1>
              <p className="text-sm text-slate-500 mt-1">
                Live operational status for {settings?.storeName || 'KaBiRa POS Store'}.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => void refresh()}
            className="inline-flex items-center gap-2 px-4 py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm font-bold shadow-sm cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh Health
          </button>
          <div className="hidden md:block">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-black">Last Updated</div>
            <div className="text-xs font-bold text-slate-700 mt-1">{lastUpdated || '—'}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-white to-emerald-50/50 border border-emerald-100 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <div className="w-11 h-11 rounded-2xl bg-emerald-100 flex items-center justify-center">
              <Server className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider">Store Status</span>
          </div>
          <div className="mt-3">{statusPill(true, 'ONLINE', 'OFFLINE')}</div>
          <p className="text-[11px] text-slate-500 mt-2">{settings?.cityStateZip || settings?.address || 'Primary Store'}</p>
        </div>

        <div className="bg-gradient-to-br from-white to-sky-50/60 border border-sky-100 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <div className="w-11 h-11 rounded-2xl bg-sky-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-sky-600" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider">Registers Online</span>
          </div>
          <div className="text-3xl font-black mt-3 text-[#0d1b36]">{onlineRegisters}/{registers.length || 2}</div>
          <p className="text-[11px] text-slate-500 mt-1">{activeShifts} active shift{activeShifts === 1 ? '' : 's'}</p>
        </div>

        <div className="bg-gradient-to-br from-white to-violet-50/60 border border-violet-100 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <div className="w-11 h-11 rounded-2xl bg-violet-100 flex items-center justify-center">
              <Cpu className="w-5 h-5 text-violet-600" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider">Bridge</span>
          </div>
          <div className="mt-3">{statusPill(bridgeOnline, 'ONLINE', 'OFFLINE')}</div>
          <p className="text-[11px] text-slate-500 mt-2">
            Port {bridgeHealth.port || 5055} · {bridgeTelemetryCount} telemetry terminal{bridgeTelemetryCount === 1 ? '' : 's'}
          </p>
        </div>

        <div className="bg-gradient-to-br from-white to-amber-50/60 border border-amber-100 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <div className="w-11 h-11 rounded-2xl bg-amber-100 flex items-center justify-center">
              <Activity className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider">Hardware Health</span>
          </div>
          <div className="text-3xl font-black mt-3 text-[#0d1b36]">{healthScore}%</div>
          <p className="text-[11px] text-slate-500 mt-1">Configured and reachable health snapshot</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-black flex items-center gap-3 text-[#0d1b36]">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center">
                <CircleAlert className={`w-5 h-5 ${criticalAlertCount > 0 ? 'text-rose-600' : warningAlertCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`} />
              </div>
              Operational Alerts
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">Prioritized issues that may affect register operation.</p>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider">
            <span className="px-2 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
              {criticalAlertCount} Critical
            </span>
            <span className="px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              {warningAlertCount} Warning
            </span>
            <span className="px-2 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
              {infoAlertCount} Info
            </span>
          </div>
        </div>

        <div className="p-3 space-y-2">
          {alerts.length === 0 ? (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <div className="text-xs font-black text-emerald-800">All monitored systems healthy</div>
                <div className="text-[11px] text-emerald-700 mt-0.5">No register or hardware alerts require attention.</div>
              </div>
            </div>
          ) : (
            alerts.map(alert => {
              const critical = alert.severity === 'critical';
              const warning = alert.severity === 'warning';
              const actionLabel =
                alert.action === 'hardware'
                  ? 'Open Hardware'
                  : alert.action === 'users'
                  ? 'Open Users'
                  : null;

              const handleAction = () => {
                if (alert.action === 'hardware') onOpenHardware();
                if (alert.action === 'users') onOpenUsers();
              };

              return (
                <div
                  key={alert.id}
                  className={`flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-2xl border shadow-sm ${
                    critical
                      ? 'bg-rose-50 border-rose-200'
                      : warning
                      ? 'bg-amber-50 border-amber-200'
                      : 'bg-sky-50 border-sky-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <CircleAlert className={`w-4 h-4 mt-0.5 shrink-0 ${
                      critical ? 'text-rose-600' : warning ? 'text-amber-600' : 'text-sky-600'
                    }`} />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider ${
                          critical
                            ? 'bg-rose-600 text-white'
                            : warning
                            ? 'bg-amber-500 text-white'
                            : 'bg-sky-600 text-white'
                        }`}>
                          {alert.severity}
                        </span>
                        <span className="text-xs font-black text-slate-900">{alert.title}</span>
                      </div>
                      <div className="text-[11px] text-slate-600 mt-1">{alert.detail}</div>
                    </div>
                  </div>

                  {actionLabel && (
                    <button
                      type="button"
                      onClick={handleAction}
                      className="shrink-0 px-3 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-[10px] font-black uppercase tracking-wider cursor-pointer"
                    >
                      {actionLabel}
                    </button>
                  )}
                </div>
              );
            })
          )}
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
              <button
                key={register.id}
                type="button"
                onClick={() => setSelectedRegister(register)}
                className="w-full px-4 py-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-left hover:bg-slate-50 cursor-pointer"
              >
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
                <div className="flex items-center gap-3">
                  {statusPill(register.status === 'active', 'ONLINE', 'OFFLINE')}
                  <span className="text-[10px] font-black uppercase tracking-wider text-sky-700">View Details</span>
                </div>
              </button>
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

      {selectedRegister && (
        <div className="fixed inset-0 z-[120] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-slate-200">
            <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-5 py-4 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Monitor className="w-5 h-5 text-sky-600" />
                  <h2 className="text-lg font-black">{selectedRegister.name}</h2>
                  {statusPill(selectedRegister.status === 'active', 'ONLINE', 'OFFLINE')}
                </div>
                <p className="text-xs text-slate-500 mt-1">{selectedRegister.location}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRegister(null)}
                className="px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-black cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="p-5 space-y-5">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-[10px] uppercase tracking-wider font-black text-slate-500">Cashier</div>
                  <div className="text-sm font-black mt-1">{selectedRegister.currentCashier || 'None'}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-[10px] uppercase tracking-wider font-black text-slate-500">Shift</div>
                  <div className="text-sm font-black mt-1">{selectedRegister.activeShiftId ? 'Open' : 'Closed'}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-[10px] uppercase tracking-wider font-black text-slate-500">Bridge</div>
                  <div className={`text-sm font-black mt-1 ${bridgeOnline ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {bridgeOnline ? 'Online' : 'Offline'}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-[10px] uppercase tracking-wider font-black text-slate-500">Health Score</div>
                  <div className="text-sm font-black mt-1">{healthScore}%</div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                  <h3 className="text-sm font-black">Live Diagnostics</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">Current device readiness for this POS installation.</p>
                </div>

                <div className="divide-y divide-slate-100">
                  {[
                    ['POS Bridge', bridgeOnline, bridgeHealth.version || 'Local bridge service', `Port ${bridgeHealth.port || 5055}`],
                    ['Receipt Printer', printerConfigured, configuredHardware.receipt_printer?.deviceName || 'Not configured', configuredHardware.receipt_printer?.connectionType || 'No connection'],
                    ['Cash Drawer', drawerConfigured, configuredHardware.cash_drawer?.deviceName || 'Not configured', configuredHardware.cash_drawer?.drawerConnectionMethod || 'No connection'],
                    ['Barcode Scanner', scannerConfigured, configuredHardware.barcode_scanner?.deviceName || 'Not configured', configuredHardware.barcode_scanner?.connectionType || 'No connection'],
                    ['Customer Display', customerDisplayConfigured, configuredHardware.customer_display?.deviceName || 'Not configured', configuredHardware.customer_display?.displayId || 'No display assigned'],
                  ].map(([label, ok, detail, meta]: any) => (
                    <div key={label} className="px-4 py-3 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        {ok ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                        ) : (
                          <CircleAlert className="w-5 h-5 text-rose-500 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <div className="text-xs font-black">{label}</div>
                          <div className="text-[11px] text-slate-500 truncate">{String(detail)}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{String(meta)}</div>
                        </div>
                      </div>
                      {statusPill(Boolean(ok), 'READY', 'ATTENTION')}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-sm font-black">Latest Register Activity</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Most recent important events for quick troubleshooting.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                  <div className="rounded-xl bg-white border border-slate-200 p-3">
                    <div className="text-[10px] uppercase tracking-wider font-black text-slate-500">Last Transaction</div>
                    <div className="text-xs font-black mt-1">
                      {latestOrder ? `${latestOrder.orderNumber} · ${latestOrder.grandTotal.toFixed(2)}` : 'No transaction recorded'}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">
                      {latestOrder ? `${latestOrder.cashierName} · ${formatTime(latestOrder.createdAt)}` : '—'}
                    </div>
                  </div>

                  <div className="rounded-xl bg-white border border-slate-200 p-3">
                    <div className="text-[10px] uppercase tracking-wider font-black text-slate-500">Last Print Activity</div>
                    <div className="text-xs font-black mt-1">{latestPrint?.details || 'No print activity recorded'}</div>
                    <div className="text-[10px] text-slate-500 mt-1">{formatTime(latestPrint?.timestamp)}</div>
                  </div>

                  <div className="rounded-xl bg-white border border-slate-200 p-3">
                    <div className="text-[10px] uppercase tracking-wider font-black text-slate-500">Last Drawer Activity</div>
                    <div className="text-xs font-black mt-1">{latestDrawer?.details || 'No drawer activity recorded'}</div>
                    <div className="text-[10px] text-slate-500 mt-1">{formatTime(latestDrawer?.timestamp)}</div>
                  </div>

                  <div className="rounded-xl bg-white border border-slate-200 p-3">
                    <div className="text-[10px] uppercase tracking-wider font-black text-slate-500">Last Device / Scanner Activity</div>
                    <div className="text-xs font-black mt-1">{latestDeviceScan?.details || 'No device scan activity recorded'}</div>
                    <div className="text-[10px] text-slate-500 mt-1">{formatTime(latestDeviceScan?.timestamp)}</div>
                  </div>

                  <div className="rounded-xl bg-white border border-slate-200 p-3 md:col-span-2">
                    <div className="text-[10px] uppercase tracking-wider font-black text-slate-500">Last Bridge Event</div>
                    <div className="text-xs font-black mt-1">
                      {latestBridgeEvent?.details || bridgeHealth.error || 'No bridge error or restart event recorded'}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">
                      {latestBridgeEvent ? formatTime(latestBridgeEvent.timestamp) : `Heartbeat: ${bridgeHealth.lastHeartbeat || 'Never'}`}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 text-xs">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider font-black text-slate-500">Register ID</div>
                    <div className="font-mono font-bold mt-1">{selectedRegister.id}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider font-black text-slate-500">Last Health Refresh</div>
                    <div className="font-bold mt-1">{lastUpdated || '—'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider font-black text-slate-500">Bridge Heartbeat</div>
                    <div className="font-bold mt-1">{bridgeHealth.lastHeartbeat || 'Never'}</div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
                  <h3 className="text-sm font-black">Quick Troubleshooting</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">Run safe local diagnostics without leaving this register.</p>
                </div>

                <div className="p-4 grid grid-cols-2 lg:grid-cols-5 gap-2">
                  <button
                    type="button"
                    disabled={quickAction !== null}
                    onClick={() => void runQuickAction('bridge')}
                    className="px-3 py-3 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 disabled:opacity-50 text-xs font-black text-rose-800 cursor-pointer"
                  >
                    {quickAction === 'bridge' ? 'Restarting…' : 'Restart Bridge'}
                  </button>

                  <button
                    type="button"
                    disabled={quickAction !== null}
                    onClick={() => void runQuickAction('scan')}
                    className="px-3 py-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 text-xs font-black cursor-pointer"
                  >
                    {quickAction === 'scan' ? 'Refreshing…' : 'Refresh Devices'}
                  </button>

                  <button
                    type="button"
                    disabled={quickAction !== null || !printerConfigured}
                    onClick={() => void runQuickAction('printer')}
                    className="px-3 py-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 text-xs font-black cursor-pointer"
                  >
                    {quickAction === 'printer' ? 'Testing…' : 'Test Printer'}
                  </button>

                  <button
                    type="button"
                    disabled={quickAction !== null || !drawerConfigured}
                    onClick={() => void runQuickAction('drawer')}
                    className="px-3 py-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 text-xs font-black cursor-pointer"
                  >
                    {quickAction === 'drawer' ? 'Testing…' : 'Test Drawer'}
                  </button>

                  <button
                    type="button"
                    disabled={quickAction !== null || !customerDisplayConfigured}
                    onClick={() => void runQuickAction('display')}
                    className="px-3 py-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 text-xs font-black cursor-pointer"
                  >
                    {quickAction === 'display' ? 'Launching…' : 'Relaunch Display'}
                  </button>
                </div>

                {quickActionMessage && (
                  <div className={`mx-4 mb-4 p-3 rounded-xl border text-xs font-bold ${
                    quickActionMessage.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}>
                    {quickActionMessage.message}
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => void refresh()}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-black cursor-pointer"
                >
                  Refresh Diagnostics
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRegister(null);
                    onOpenHardware();
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black cursor-pointer"
                >
                  Open Hardware Manager
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <button onClick={onOpenUsers} className="bg-white border border-slate-200 rounded-2xl p-4 text-left hover:border-sky-300 shadow-sm cursor-pointer">
          <Users className="w-5 h-5 text-sky-600 mb-2" />
          <div className="text-sm font-black">Users & Roles</div>
          <div className="text-[11px] text-slate-500 mt-1">Create managers and cashiers, assign access, and manage credentials.</div>
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
