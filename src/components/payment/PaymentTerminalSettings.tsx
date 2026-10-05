import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  CreditCard,
  PlugZap,
  RefreshCw,
  Save,
  ServerCog,
  ShieldCheck,
  TerminalSquare,
  Wifi,
  XCircle,
} from 'lucide-react';
import { api } from '../../utils/api';
import { useAdminStore } from '../../contexts/AdminStoreContext';

interface Props {
  storeId?: string;
  registerId?: string;
  currentUserRole?: string;
}

interface ConnectorOption {
  id: string;
  provider: string;
  processor: string;
  label: string;
  installed: boolean;
  sandbox: boolean;
  modes: string[];
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

const paxModels = ['A920 Pro', 'A920', 'A80', 'A35', 'A30', 'S300', 'Other'];

const modeLabels: Record<string, string> = {
  semi_integrated_lan: 'Semi-Integrated LAN',
  local_agent: 'Local Certified Agent',
  processor_cloud: 'Processor / Cloud',
};

export const PaymentTerminalSettings: React.FC<Props> = ({
  storeId = 'store-1',
  registerId = 'reg-01',
  currentUserRole,
}) => {
  const { stores } = useAdminStore();
  const initialStoreId =
    storeId === 'all'
      ? (stores[0]?.id || 'store-1')
      : storeId;

  const [selectedStoreId, setSelectedStoreId] = useState(initialStoreId);
  const [selectedRegisterId, setSelectedRegisterId] = useState(registerId);
  const [registers, setRegisters] = useState<any[]>([]);
  const [scopeBusy, setScopeBusy] = useState(false);
  const [config, setConfig] = useState<any>(null);
  const [status, setStatus] = useState<any>(null);
  const [connectors, setConnectors] = useState<ConnectorOption[]>([]);
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const canEdit = currentUserRole === 'Admin' || currentUserRole === 'Manager';
  const isMock = config?.provider === 'mock';
  const isPax = config?.provider === 'pax';

  const providerLabel = useMemo(
    () => providers.find(([id]) => id === config?.provider)?.[1] || config?.provider || 'Unknown',
    [config?.provider]
  );

  const selectedConnector = useMemo(
    () => connectors.find(item => item.id === config?.connectorId),
    [connectors, config?.connectorId]
  );

  const loadConnectors = async (provider: string) => {
    try {
      const list = await api.getPaymentConnectors(provider);
      setConnectors(list);
      return list;
    } catch {
      setConnectors([]);
      return [];
    }
  };

  const load = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const cfg = await api.getPaymentConfig(selectedStoreId, selectedRegisterId);
      const [sts, list] = await Promise.all([
        api.getPaymentTerminalStatus(selectedStoreId, selectedRegisterId),
        api.getPaymentConnectors(cfg.provider),
      ]);
      setConfig(cfg);
      setStatus(sts);
      setConnectors(list);
    } catch (error: any) {
      setMessage(error?.message || 'Unable to load payment terminal settings.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    const loadRegisters = async () => {
      setScopeBusy(true);
      try {
        const result = await api.getRegisters(selectedStoreId).catch(() => ({ registers: [] }));
        const apiRegisters = result.registers || [];
        const fallbackRegisters =
          stores.find(store => store.id === selectedStoreId)?.registers?.map(register => ({
            id: register.id,
            name: register.name,
            location: register.number,
            status: 'configured',
          })) || [];

        const nextRegisters = apiRegisters.length > 0 ? apiRegisters : fallbackRegisters;
        setRegisters(nextRegisters);

        if (
          nextRegisters.length > 0 &&
          !nextRegisters.some((register: any) => register.id === selectedRegisterId)
        ) {
          setSelectedRegisterId(nextRegisters[0].id);
        }
      } finally {
        setScopeBusy(false);
      }
    };

    void loadRegisters();
  }, [selectedStoreId, stores]);

  useEffect(() => {
    if (!selectedStoreId || !selectedRegisterId) return;
    void load();
  }, [selectedStoreId, selectedRegisterId]);

  const updateProvider = async (provider: string) => {
    const list = await loadConnectors(provider);
    const firstInstalled = list.find(item => item.installed);
    const nextConnector = firstInstalled || list[0];

    setConfig((prev: any) => ({
      ...prev,
      provider,
      connectorId: nextConnector?.id || '',
      processor:
        provider === 'mock'
          ? 'KaBiRa Sandbox'
          : nextConnector?.processor || '',
      environment:
        provider === 'mock' || nextConnector?.sandbox
          ? 'sandbox'
          : prev.environment || 'sandbox',
      integrationMode:
        provider === 'pax'
          ? nextConnector?.modes?.[0] || 'semi_integrated_lan'
          : prev.integrationMode,
      connectionType:
        provider === 'pax' ? 'lan' : provider === 'mock' ? 'cloud' : prev.connectionType,
    }));

    setStatus(null);
    setMessage(null);
  };

  const updateConnector = (connectorId: string) => {
    const connector = connectors.find(item => item.id === connectorId);
    if (!connector) return;

    setConfig((prev: any) => ({
      ...prev,
      connectorId,
      processor: connector.processor,
      environment: connector.sandbox ? 'sandbox' : prev.environment,
      integrationMode:
        connector.modes?.includes(prev.integrationMode)
          ? prev.integrationMode
          : connector.modes?.[0] || prev.integrationMode,
    }));

    setStatus(null);
    setMessage(null);
  };

  const save = async () => {
    if (!config) return;
    setBusy(true);
    setMessage(null);
    try {
      const saved = await api.savePaymentConfig({
        ...config,
        storeId: selectedStoreId,
        registerId: selectedRegisterId,
      });
      setConfig(saved);
      setMessage('Payment configuration saved for this register.');
      setStatus(await api.getPaymentTerminalStatus(selectedStoreId, selectedRegisterId));
    } catch (error: any) {
      setMessage(error?.message || 'Unable to save payment terminal settings.');
    } finally {
      setBusy(false);
    }
  };

  const testConnection = async () => {
    if (!config) return;

    setTesting(true);
    setMessage(null);
    try {
      // Save first so the connection test always uses what is currently on screen.
      const saved = canEdit
        ? await api.savePaymentConfig({ ...config, storeId, registerId })
        : config;
      setConfig(saved);

      const result = await api.connectPaymentTerminal(selectedStoreId, selectedRegisterId);
      setStatus(result);
      setMessage(
        result.connected
          ? `${providerLabel} terminal connection is ready.`
          : result.message || 'Terminal is not connected.'
      );
    } catch (error: any) {
      setStatus({
        connected: false,
        message: error?.message || 'Terminal connection test failed.',
      });
      setMessage(error?.message || 'Terminal connection test failed.');
    } finally {
      setTesting(false);
    }
  };

  if (!config) {
    return (
      <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-5 text-sm text-slate-400">
        {busy ? 'Loading payment terminal configuration…' : (message || 'Payment configuration unavailable.')}
      </div>
    );
  }

  const availableModes = selectedConnector?.modes?.length
    ? selectedConnector.modes
    : ['semi_integrated_lan', 'local_agent', 'processor_cloud'];

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-700 bg-[#0B1828] p-5 shadow-lg space-y-4">
        <div className="flex items-center gap-2">
          <ServerCog className="h-4 w-4 text-amber-400" />
          <div>
            <div className="text-xs font-black uppercase tracking-wider text-white">Store & Register Scope</div>
            <div className="text-[11px] text-slate-500">
              Payment configuration is saved separately for each register.
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="space-y-1">
            <span className="text-[11px] font-bold uppercase text-slate-400">Store</span>
            <select
              value={selectedStoreId}
              disabled={currentUserRole !== 'Admin' || scopeBusy}
              onChange={e => {
                setSelectedStoreId(e.target.value);
                setConfig(null);
                setStatus(null);
                setMessage(null);
              }}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white disabled:opacity-70"
            >
              {stores.map(store => (
                <option key={store.id} value={store.id}>
                  {store.name} • Store #{store.storeNumber}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-[11px] font-bold uppercase text-slate-400">Register</span>
            <select
              value={selectedRegisterId}
              disabled={scopeBusy || registers.length === 0}
              onChange={e => {
                setSelectedRegisterId(e.target.value);
                setConfig(null);
                setStatus(null);
                setMessage(null);
              }}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white disabled:opacity-70"
            >
              {registers.length === 0 ? (
                <option value={selectedRegisterId}>No configured registers found</option>
              ) : (
                registers.map((register: any) => (
                  <option key={register.id} value={register.id}>
                    {register.name || register.id}
                    {register.status ? ` • ${register.status}` : ''}
                  </option>
                ))
              )}
            </select>
          </label>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-700 bg-[#0B1828] p-5 shadow-lg">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-white">
              <CreditCard className="h-4 w-4 text-amber-400" />
              Payment Terminal Configuration
            </div>
            <p className="mt-1 max-w-3xl text-xs text-slate-400">
              Configure the terminal and processor for this store/register. KaBiRa checkout stays the same even when the merchant changes terminal brands or processors.
            </p>
          </div>

          <div className={`rounded-full border px-3 py-1 text-[11px] font-bold ${
            status?.connected
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
              : 'border-slate-600 bg-slate-800 text-slate-400'
          }`}>
            {status?.connected ? '● Connected' : '○ Not Connected'}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-4">
          {[
            ['1', 'Store', stores.find(store => store.id === selectedStoreId)?.name || selectedStoreId],
            ['2', 'Register', registers.find((register: any) => register.id === selectedRegisterId)?.name || selectedRegisterId],
            ['3', 'Provider', providerLabel],
            ['4', 'Status', status?.connected ? 'Ready' : 'Needs test'],
          ].map(([number, label, value]) => (
            <div key={number} className="rounded-xl border border-slate-700 bg-slate-900/60 p-3">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 text-[10px] font-black text-slate-950">
                  {number}
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</span>
              </div>
              <div className="mt-2 truncate text-xs font-bold text-slate-200">{value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-700 bg-[#0B1828] p-5 shadow-lg space-y-5">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <ServerCog className="h-4 w-4 text-sky-400" />
          <h4 className="text-xs font-black uppercase tracking-wider text-white">1. Provider & Processor Connector</h4>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="space-y-1">
            <span className="text-[11px] font-bold uppercase text-slate-400">Terminal Provider</span>
            <select
              value={config.provider}
              disabled={!canEdit}
              onChange={e => void updateProvider(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white"
            >
              {providers.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-[11px] font-bold uppercase text-slate-400">Processor Connector</span>
            <select
              value={config.connectorId || ''}
              disabled={!canEdit || connectors.length === 0}
              onChange={e => updateConnector(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white"
            >
              <option value="">Select connector</option>
              {connectors.map(connector => (
                <option key={connector.id} value={connector.id}>
                  {connector.label}{connector.installed ? ' • Installed' : ' • Available later'}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-[11px] font-bold uppercase text-slate-400">Processor / Acquirer</span>
            <input
              value={config.processor || ''}
              disabled={!canEdit}
              onChange={e => setConfig({ ...config, processor: e.target.value })}
              placeholder="TSYS, Fiserv, Worldpay, Heartland…"
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white"
            />
          </label>

          <label className="space-y-1">
            <span className="text-[11px] font-bold uppercase text-slate-400">Merchant Account Label</span>
            <input
              value={config.merchantAccountLabel || ''}
              disabled={!canEdit}
              onChange={e => setConfig({ ...config, merchantAccountLabel: e.target.value })}
              placeholder="Front Store Merchant Account"
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white"
            />
          </label>
        </div>

        {selectedConnector && (
          <div className={`rounded-xl border p-3 text-xs ${
            selectedConnector.installed
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
              : 'border-amber-500/30 bg-amber-500/10 text-amber-200'
          }`}>
            {selectedConnector.installed ? (
              <CheckCircle2 className="mr-2 inline h-4 w-4" />
            ) : (
              <XCircle className="mr-2 inline h-4 w-4" />
            )}
            {selectedConnector.installed
              ? 'This connector is installed and can be tested now.'
              : 'This connector can be configured now, but production transactions stay blocked until its certified connector package is installed.'}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-700 bg-[#0B1828] p-5 shadow-lg space-y-5">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <TerminalSquare className="h-4 w-4 text-violet-400" />
          <h4 className="text-xs font-black uppercase tracking-wider text-white">2. Terminal & Connection</h4>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="space-y-1">
            <span className="text-[11px] font-bold uppercase text-slate-400">Terminal Model</span>
            {isPax ? (
              <select
                value={config.terminalModel || ''}
                disabled={!canEdit}
                onChange={e => setConfig({ ...config, terminalModel: e.target.value })}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white"
              >
                <option value="">Select PAX model</option>
                {paxModels.map(model => <option key={model} value={model}>{model}</option>)}
              </select>
            ) : (
              <input
                value={config.terminalModel || ''}
                disabled={!canEdit}
                onChange={e => setConfig({ ...config, terminalModel: e.target.value })}
                placeholder="Terminal model"
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white"
              />
            )}
          </label>

          <label className="space-y-1">
            <span className="text-[11px] font-bold uppercase text-slate-400">Terminal ID</span>
            <input
              value={config.terminalId || ''}
              disabled={!canEdit}
              onChange={e => setConfig({ ...config, terminalId: e.target.value })}
              placeholder="Processor-assigned terminal ID"
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white"
            />
          </label>

          {isPax && (
            <label className="space-y-1">
              <span className="text-[11px] font-bold uppercase text-slate-400">Integration Mode</span>
              <select
                value={config.integrationMode || availableModes[0]}
                disabled={!canEdit}
                onChange={e => setConfig({ ...config, integrationMode: e.target.value })}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white"
              >
                {availableModes.map(mode => (
                  <option key={mode} value={mode}>{modeLabels[mode] || mode}</option>
                ))}
              </select>
            </label>
          )}

          <label className="space-y-1">
            <span className="text-[11px] font-bold uppercase text-slate-400">Connection Type</span>
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

          {config.connectionType === 'lan' && (
            <>
              <label className="space-y-1">
                <span className="text-[11px] font-bold uppercase text-slate-400">Terminal IP Address</span>
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
                  placeholder="Processor / connector port"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white"
                />
              </label>
            </>
          )}

          {(config.integrationMode === 'local_agent' || config.integrationMode === 'processor_cloud') && (
            <label className="space-y-1 md:col-span-2">
              <span className="text-[11px] font-bold uppercase text-slate-400">Secure Credential Profile</span>
              <input
                value={config.credentialProfileId || ''}
                disabled={!canEdit}
                onChange={e => setConfig({ ...config, credentialProfileId: e.target.value })}
                placeholder="Reference to securely stored processor credentials"
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white"
              />
              <span className="block text-[10px] text-slate-500">
                KaBiRa stores only the credential profile reference here, not raw API secrets or card data.
              </span>
            </label>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-700 bg-[#0B1828] p-5 shadow-lg space-y-5">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <h4 className="text-xs font-black uppercase tracking-wider text-white">3. Environment & Permissions</h4>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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

          <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:col-span-2">
            {[
              ['isEnabled', 'Enabled'],
              ['autoConnect', 'Auto Connect'],
              ['allowRefund', 'Refund'],
              ['allowVoid', 'Void'],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2.5">
                <span className="text-[11px] font-bold text-slate-200">{label}</span>
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
        </div>

        {(isMock || (isPax && config.environment === 'sandbox')) && (
          <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-3 text-xs text-sky-200">
            <ShieldCheck className="mr-2 inline h-4 w-4" />
            Sandbox mode uses a KaBiRa simulator and never sends a real card transaction.
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-700 bg-[#071525] p-5 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-white">
              <Wifi className="h-4 w-4 text-sky-400" />
              Connection Test
            </div>
            <div className="mt-1 text-xs text-slate-400">
              {status?.message || 'Save and test this register before enabling live card transactions.'}
            </div>
            {status?.checkedAt && (
              <div className="mt-1 text-[10px] text-slate-600">Last checked: {new Date(status.checkedAt).toLocaleString()}</div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void load()}
              disabled={busy || testing}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-600 px-4 py-2 text-xs font-bold text-slate-200 hover:bg-slate-800 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />
              Refresh
            </button>

            <button
              type="button"
              onClick={() => void testConnection()}
              disabled={busy || testing}
              className="inline-flex items-center gap-2 rounded-xl border border-sky-500/40 bg-sky-500/10 px-4 py-2 text-xs font-bold text-sky-200 hover:bg-sky-500/20 disabled:opacity-50"
            >
              <PlugZap className={`h-4 w-4 ${testing ? 'animate-pulse' : ''}`} />
              {testing ? 'Testing…' : 'Test Connection'}
            </button>

            {canEdit && (
              <button
                type="button"
                onClick={() => void save()}
                disabled={busy || testing}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2 text-xs font-black text-slate-950 hover:bg-amber-300 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                Save Configuration
              </button>
            )}
          </div>
        </div>

        {message && (
          <div className={`mt-4 rounded-xl border p-3 text-xs font-semibold ${
            status?.connected
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
              : 'border-slate-700 bg-slate-900/60 text-slate-300'
          }`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
};
