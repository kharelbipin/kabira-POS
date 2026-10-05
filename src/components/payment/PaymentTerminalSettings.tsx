import React, { useEffect, useMemo, useState } from 'react';
import { CreditCard, PlugZap, RefreshCw, Save, ShieldCheck, Wifi, XCircle } from 'lucide-react';
import { api } from '../../utils/api';

interface Props {
  storeId?: string;
  registerId?: string;
  currentUserRole?: string;
}

const providers = [
  ['mock', 'KaBiRa Test Terminal'],
  ['pax', 'PAX'],
  ['clover', 'Clover'],
  ['square', 'Square'],
  ['stripe_terminal', 'Stripe Terminal'],
  ['verifone', 'Verifone'],
  ['ingenico', 'Ingenico'],
  ['generic', 'Generic Terminal'],
] as const;

export const PaymentTerminalSettings: React.FC<Props> = ({
  storeId = 'store-1',
  registerId = 'reg-01',
  currentUserRole,
}) => {
  const [config, setConfig] = useState<any>(null);
  const [status, setStatus] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const canEdit = currentUserRole === 'Admin' || currentUserRole === 'Manager';

  const isMock = config?.provider === 'mock';
  const providerLabel = useMemo(
    () => providers.find(([id]) => id === config?.provider)?.[1] || config?.provider || 'Unknown',
    [config?.provider]
  );

  const load = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const [cfg, sts] = await Promise.all([
        api.getPaymentConfig(storeId, registerId),
        api.getPaymentTerminalStatus(storeId, registerId),
      ]);
      setConfig(cfg);
      setStatus(sts);
    } catch (error: any) {
      setMessage(error?.message || 'Unable to load payment terminal settings.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    void load();
  }, [storeId, registerId]);

  const save = async () => {
    if (!config) return;
    setBusy(true);
    setMessage(null);
    try {
      const saved = await api.savePaymentConfig({
        ...config,
        storeId,
        registerId,
      });
      setConfig(saved);
      setMessage('Payment terminal configuration saved.');
      setStatus(await api.getPaymentTerminalStatus(storeId, registerId));
    } catch (error: any) {
      setMessage(error?.message || 'Unable to save payment terminal settings.');
    } finally {
      setBusy(false);
    }
  };

  const testConnection = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const result = await api.connectPaymentTerminal(storeId, registerId);
      setStatus(result);
      setMessage(result.connected ? 'Terminal connection is ready.' : result.message);
    } catch (error: any) {
      setMessage(error?.message || 'Terminal connection test failed.');
    } finally {
      setBusy(false);
    }
  };

  if (!config) {
    return (
      <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-5 text-sm text-slate-400">
        {busy ? 'Loading payment terminal configuration…' : (message || 'Payment configuration unavailable.')}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-700 bg-[#0B1828] p-5 shadow-lg space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-white font-black uppercase tracking-wider text-sm">
            <CreditCard className="h-4 w-4 text-amber-400" />
            Universal Payment Terminal
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Configure the payment provider per store and register. Checkout does not depend on any one terminal brand.
          </p>
        </div>
        <div className={`rounded-full border px-3 py-1 text-[11px] font-bold ${status?.connected ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' : 'border-slate-600 bg-slate-800 text-slate-400'}`}>
          {status?.connected ? '● Connected' : '○ Not Connected'}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="space-y-1">
          <span className="text-[11px] font-bold uppercase text-slate-400">Provider</span>
          <select
            value={config.provider}
            disabled={!canEdit}
            onChange={e => setConfig({ ...config, provider: e.target.value })}
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white"
          >
            {providers.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-[11px] font-bold uppercase text-slate-400">Processor</span>
          <input
            value={config.processor || ''}
            disabled={!canEdit}
            onChange={e => setConfig({ ...config, processor: e.target.value })}
            placeholder="TSYS, Fiserv, Worldpay, etc."
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white"
          />
        </label>

        <label className="space-y-1">
          <span className="text-[11px] font-bold uppercase text-slate-400">Terminal Model</span>
          <input
            value={config.terminalModel || ''}
            disabled={!canEdit}
            onChange={e => setConfig({ ...config, terminalModel: e.target.value })}
            placeholder="A920 Pro, A35, etc."
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white"
          />
        </label>

        <label className="space-y-1">
          <span className="text-[11px] font-bold uppercase text-slate-400">Terminal ID</span>
          <input
            value={config.terminalId || ''}
            disabled={!canEdit}
            onChange={e => setConfig({ ...config, terminalId: e.target.value })}
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white"
          />
        </label>

        <label className="space-y-1">
          <span className="text-[11px] font-bold uppercase text-slate-400">Connection</span>
          <select
            value={config.connectionType}
            disabled={!canEdit}
            onChange={e => setConfig({ ...config, connectionType: e.target.value })}
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white"
          >
            <option value="lan">LAN / Wi-Fi</option>
            <option value="usb">USB</option>
            <option value="serial">Serial</option>
            <option value="cloud">Cloud API</option>
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-[11px] font-bold uppercase text-slate-400">Environment</span>
          <select
            value={config.environment}
            disabled={!canEdit}
            onChange={e => setConfig({ ...config, environment: e.target.value })}
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white"
          >
            <option value="sandbox">Sandbox / Test</option>
            <option value="production">Production</option>
          </select>
        </label>

        {config.provider === 'pax' && (
          <>
            <label className="space-y-1">
              <span className="text-[11px] font-bold uppercase text-slate-400">PAX Integration Mode</span>
              <select
                value={config.integrationMode || 'semi_integrated_lan'}
                disabled={!canEdit}
                onChange={e => setConfig({ ...config, integrationMode: e.target.value })}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white"
              >
                <option value="semi_integrated_lan">Semi-Integrated LAN</option>
                <option value="local_agent">Local Certified Agent</option>
                <option value="processor_cloud">Processor / Cloud</option>
              </select>
            </label>

            {(config.integrationMode === 'local_agent' || config.integrationMode === 'processor_cloud') && (
              <label className="space-y-1">
                <span className="text-[11px] font-bold uppercase text-slate-400">Secure Credential Profile</span>
                <input
                  value={config.credentialProfileId || ''}
                  disabled={!canEdit}
                  onChange={e => setConfig({ ...config, credentialProfileId: e.target.value })}
                  placeholder="Stored securely outside POS config"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white"
                />
              </label>
            )}
          </>
        )}

        {config.connectionType === 'lan' && (
          <>
            <label className="space-y-1">
              <span className="text-[11px] font-bold uppercase text-slate-400">IP Address</span>
              <input
                value={config.ipAddress || ''}
                disabled={!canEdit}
                onChange={e => setConfig({ ...config, ipAddress: e.target.value })}
                placeholder="192.168.1.80"
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[11px] font-bold uppercase text-slate-400">Port</span>
              <input
                type="number"
                value={config.port || ''}
                disabled={!canEdit}
                onChange={e => setConfig({ ...config, port: e.target.value ? Number(e.target.value) : undefined })}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white"
              />
            </label>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          ['isEnabled', 'Enabled'],
          ['allowRefund', 'Allow Refund'],
          ['allowVoid', 'Allow Void'],
        ].map(([key, label]) => (
          <label key={key} className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2.5">
            <span className="text-xs font-bold text-slate-200">{label}</span>
            <input
              type="checkbox"
              checked={Boolean(config[key])}
              disabled={!canEdit}
              onChange={e => setConfig({ ...config, [key]: e.target.checked })}
              className="h-4 w-4 accent-amber-400"
            />
          </label>
        ))}
      </div>

      {config.provider === 'pax' && config.environment === 'sandbox' && (
        <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-3 text-xs text-violet-200">
          <ShieldCheck className="mr-2 inline h-4 w-4" />
          PAX Sandbox mode uses the KaBiRa PAX simulator. It follows the same provider contract without sending real card data.
        </div>
      )}

      {isMock && (
        <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-3 text-xs text-sky-200">
          <ShieldCheck className="mr-2 inline h-4 w-4" />
          KaBiRa Test Terminal is active. It lets you test approve, decline, cancel, timeout, refund, void, and split tender without owning payment hardware.
        </div>
      )}

      {!isMock && status && !status.connected && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
          <XCircle className="mr-2 inline h-4 w-4" />
          {providerLabel} is selectable now, but real transactions stay blocked until its certified adapter is configured.
        </div>
      )}

      {message && <div className="text-xs font-semibold text-slate-300">{message}</div>}

      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={() => void load()}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-600 px-4 py-2 text-xs font-bold text-slate-200 hover:bg-slate-800 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />
          Refresh
        </button>
        <button
          type="button"
          onClick={() => void testConnection()}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-xl border border-sky-500/40 bg-sky-500/10 px-4 py-2 text-xs font-bold text-sky-200 hover:bg-sky-500/20 disabled:opacity-50"
        >
          <PlugZap className="h-4 w-4" />
          Test Connection
        </button>
        {canEdit && (
          <button
            type="button"
            onClick={() => void save()}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2 text-xs font-black text-slate-950 hover:bg-amber-300 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            Save Payment Setup
          </button>
        )}
      </div>
    </div>
  );
};
