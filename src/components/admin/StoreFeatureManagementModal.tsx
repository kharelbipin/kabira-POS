import React, { useState, useEffect } from 'react';
import {
  StoreInfo,
  PosFeatureCode,
  POS_FEATURE_CATALOG,
  STORE_TEMPLATES,
  storeFeatureService,
  FeatureAuditLogEntry,
} from '../../services/storeFeatureService';
import { playBeep } from '../../utils/audio';
import {
  Store,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  ChefHat,
  Utensils,
  Scale,
  ScanBarcode,
  Ticket,
  DollarSign,
  Boxes,
  X,
  History,
  Layers,
  Sparkles,
  Info,
  Check,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';

interface StoreFeatureManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: { id: string; name: string; role: string } | null;
  onStoreSwitched?: (storeId: string) => void;
}

export const StoreFeatureManagementModal: React.FC<StoreFeatureManagementModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onStoreSwitched,
}) => {
  const [activeTab, setActiveTab] = useState<'features' | 'bulk' | 'audit'>('features');
  const [selectedStoreId, setSelectedStoreId] = useState<string>(() =>
    storeFeatureService.getActiveStoreId()
  );
  const [features, setFeatures] = useState<Record<PosFeatureCode, boolean>>(() =>
    storeFeatureService.getFeaturesForStore(selectedStoreId)
  );
  const [auditLogs, setAuditLogs] = useState<FeatureAuditLogEntry[]>(() =>
    storeFeatureService.getAuditLogs()
  );
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Bulk management state
  const [bulkSelectedStores, setBulkSelectedStores] = useState<string[]>(['store-1', 'store-2']);
  const [bulkTargetFeature, setBulkTargetFeature] = useState<PosFeatureCode>('SCAN');
  const [bulkTargetAction, setBulkTargetAction] = useState<boolean>(true);
  const [showBulkConfirm, setShowBulkConfirm] = useState<boolean>(false);

  const stores = storeFeatureService.getAllStores();
  const selectedStore = storeFeatureService.getStore(selectedStoreId) || stores[0];
  const activePosStoreId = storeFeatureService.getActiveStoreId();

  // Synchronize state when store selection or service updates
  useEffect(() => {
    setFeatures(storeFeatureService.getFeaturesForStore(selectedStoreId));
    setAuditLogs(storeFeatureService.getAuditLogs());
  }, [selectedStoreId]);

  useEffect(() => {
    const handleServiceChange = () => {
      setFeatures(storeFeatureService.getFeaturesForStore(selectedStoreId));
      setAuditLogs(storeFeatureService.getAuditLogs());
    };
    window.addEventListener('kabira_store_features_changed', handleServiceChange);
    return () => {
      window.removeEventListener('kabira_store_features_changed', handleServiceChange);
    };
  }, [selectedStoreId]);

  if (!isOpen) return null;

  const showFeedback = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const handleToggleFeature = (code: PosFeatureCode) => {
    const currentVal = !!features[code];
    const nextVal = !currentVal;
    playBeep(nextVal ? 'success' : 'click');

    storeFeatureService.setFeatureEnabled(
      selectedStoreId,
      code,
      nextVal,
      currentUser ? `${currentUser.name} (${currentUser.role})` : 'System Administrator',
      `Manual Admin toggle: ${code} turned ${nextVal ? 'ON' : 'OFF'}`
    );

    setFeatures(prev => ({ ...prev, [code]: nextVal }));
    showFeedback(
      `${POS_FEATURE_CATALOG.find(f => f.code === code)?.name} turned ${nextVal ? 'ON' : 'OFF'} for ${selectedStore.name}`
    );
  };

  const handleApplyTemplate = (templateKey: string) => {
    const tpl = STORE_TEMPLATES[templateKey];
    if (!tpl) return;
    playBeep('success');

    storeFeatureService.applyTemplate(
      selectedStoreId,
      templateKey,
      currentUser ? `${currentUser.name} (${currentUser.role})` : 'System Administrator'
    );

    setFeatures(storeFeatureService.getFeaturesForStore(selectedStoreId));
    showFeedback(`Applied "${tpl.label}" configuration to ${selectedStore.name}`);
  };

  const handleSwitchActivePosStore = (storeId: string) => {
    playBeep('click');
    storeFeatureService.setActiveStoreId(storeId);
    setSelectedStoreId(storeId);
    if (onStoreSwitched) onStoreSwitched(storeId);
    showFeedback(`Active POS Terminal switched to ${storeFeatureService.getStore(storeId)?.name}`);
  };

  const handleExecuteBulkChange = () => {
    if (bulkSelectedStores.length === 0) return;
    playBeep('success');

    storeFeatureService.bulkSetFeature(
      bulkSelectedStores,
      bulkTargetFeature,
      bulkTargetAction,
      currentUser ? `${currentUser.name} (${currentUser.role})` : 'System Administrator',
      `Bulk rollout across ${bulkSelectedStores.length} stores`
    );

    setShowBulkConfirm(false);
    setFeatures(storeFeatureService.getFeaturesForStore(selectedStoreId));
    showFeedback(
      `Bulk update complete: ${POS_FEATURE_CATALOG.find(f => f.code === bulkTargetFeature)?.name} set to ${bulkTargetAction ? 'ON' : 'OFF'} on ${bulkSelectedStores.length} stores`
    );
  };

  const getFeatureIcon = (code: PosFeatureCode) => {
    switch (code) {
      case 'DESIGNER':
        return Sliders;
      case 'KDS':
        return ChefHat;
      case 'TABLES':
        return Utensils;
      case 'SCALE_PLU':
        return Scale;
      case 'SCAN':
        return ScanBarcode;
      case 'LOTTO_SALE':
        return Ticket;
      case 'LOTTO_PAYOUT':
        return DollarSign;
      case 'INVENTORY':
        return Boxes;
      default:
        return Layers;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-3 sm:p-5 select-none overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-[#0D1117] border border-slate-700/80 rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden text-slate-100 flex flex-col max-h-[92vh]">
        {/* Top Header Bar */}
        <div className="bg-[#161B22] border-b border-slate-700/70 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Admin Portal
                </span>
                <span className="text-xs text-slate-400">POS-FEAT-SEC-01</span>
              </div>
              <h3 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                Store-Level POS Feature Management
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              playBeep('click');
              onClose();
            }}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="bg-[#11161D] border-b border-slate-800 px-6 py-2.5 flex items-center justify-between shrink-0 flex-wrap gap-2">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setActiveTab('features')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'features'
                  ? 'bg-amber-500 text-black shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              <span>Features by Store</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('bulk')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'bulk'
                  ? 'bg-amber-500 text-black shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Bulk Store Rollout</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('audit')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'audit'
                  ? 'bg-amber-500 text-black shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Audit History ({auditLogs.length})</span>
            </button>
          </div>

          {/* Active POS Register Badge */}
          <div className="flex items-center space-x-2 text-xs bg-slate-800/80 border border-slate-700 px-3 py-1 rounded-xl">
            <span className="text-slate-400">Current POS Terminal:</span>
            <strong className="text-amber-300">
              {storeFeatureService.getActiveStore().name}
            </strong>
          </div>
        </div>

        {/* Success Toast */}
        {successToast && (
          <div className="bg-emerald-950/80 border-b border-emerald-700/60 px-6 py-2 text-emerald-300 text-xs font-semibold flex items-center space-x-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successToast}</span>
          </div>
        )}

        {/* Main Body Content */}
        <div className="p-6 flex-1 overflow-y-auto min-h-0 space-y-6">
          {/* TAB 1: INDIVIDUAL STORE FEATURES */}
          {activeTab === 'features' && (
            <div className="space-y-6">
              {/* Store Selector Cards */}
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-400 block mb-2">
                  Select Store to Configure ({stores.length} Locations)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {stores.map(st => {
                    const isConfigSelected = st.id === selectedStoreId;
                    const isPosActive = st.id === activePosStoreId;
                    return (
                      <div
                        key={st.id}
                        onClick={() => {
                          playBeep('click');
                          setSelectedStoreId(st.id);
                        }}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                          isConfigSelected
                            ? 'bg-amber-500/10 border-amber-500/70 shadow-md ring-1 ring-amber-400/40'
                            : 'bg-[#161B22] border-slate-800 hover:border-slate-700 hover:bg-[#1A202C]'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-mono font-bold text-slate-400">
                              #{st.storeNumber}
                            </span>
                            <span className="text-[9px] uppercase font-black px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                              {st.businessType}
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-white line-clamp-1 mb-1">{st.name}</h4>
                          <p className="text-[10px] text-slate-400 line-clamp-1">{st.address}</p>
                        </div>

                        <div className="pt-2 mt-2 border-t border-slate-800/80 flex items-center justify-between">
                          {isPosActive ? (
                            <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                              Active POS
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                handleSwitchActivePosStore(st.id);
                              }}
                              className="text-[10px] font-bold text-amber-400 hover:text-amber-300 underline cursor-pointer"
                            >
                              Set as Active POS
                            </button>
                          )}
                          {isConfigSelected && (
                            <Check className="w-3.5 h-3.5 text-amber-400" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick Template Presets for Selected Store */}
              <div className="bg-[#161B22] border border-slate-800 p-4 rounded-2xl space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-black uppercase tracking-wider text-slate-200">
                      Apply Industry Template to {selectedStore.name}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    One-click presets with standard feature baselines
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2 pt-1">
                  {Object.entries(STORE_TEMPLATES).map(([key, tpl]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleApplyTemplate(key)}
                      className="p-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 hover:border-amber-400/60 text-left transition-all cursor-pointer group"
                    >
                      <div className="text-xs font-bold text-white group-hover:text-amber-300 mb-0.5">
                        {tpl.label.replace(' Template', '')}
                      </div>
                      <p className="text-[9.5px] text-slate-400 line-clamp-2 leading-tight">
                        {tpl.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Strict Anti-Clutter Principle Notice */}
              <div className="p-3 rounded-xl bg-sky-950/40 border border-sky-800/50 flex items-start space-x-3 text-xs text-sky-200">
                <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold text-sky-300">POS Anti-Clutter Enforcement: </strong>
                  Disabled features are completely hidden from the cashier checkout UI. They do not
                  appear as disabled gray buttons, ensuring a lean and focused screen for each store.
                </div>
              </div>

              {/* Features List Table */}
              <div className="bg-[#161B22] border border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between bg-[#13171F]">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-300">
                    Core Platform Modules ({POS_FEATURE_CATALOG.length})
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Store: {selectedStore.name} (#{selectedStore.storeNumber})
                  </span>
                </div>

                <div className="divide-y divide-slate-800/80">
                  {POS_FEATURE_CATALOG.map(feature => {
                    const isEnabled = !!features[feature.code];
                    const Icon = getFeatureIcon(feature.code);

                    // Check for dependency warning: e.g. Lotto Payout without Lotto Sale
                    const hasDependencyWarning =
                      feature.code === 'LOTTO_PAYOUT' && isEnabled && !features.LOTTO_SALE;

                    return (
                      <div
                        key={feature.code}
                        className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                          isEnabled ? 'bg-slate-900/40' : 'bg-[#161B22]/60 opacity-80'
                        }`}
                      >
                        <div className="flex items-start space-x-3.5 max-w-2xl">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                              isEnabled
                                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                                : 'bg-slate-800 border-slate-700 text-slate-500'
                            }`}
                          >
                            <Icon className="w-5 h-5" />
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center space-x-2 flex-wrap">
                              <h4 className="text-sm font-bold text-white tracking-tight">
                                {feature.name}
                              </h4>
                              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                                {feature.code}
                              </span>
                              <span className="text-[10px] font-semibold text-slate-400">
                                • {feature.badge}
                              </span>
                            </div>

                            <p className="text-xs text-slate-400 leading-relaxed">
                              {feature.description}
                            </p>

                            {/* Dependency Warning */}
                            {hasDependencyWarning && (
                              <div className="flex items-center space-x-1.5 text-[11px] text-amber-400 bg-amber-950/40 border border-amber-800/50 px-2 py-0.5 rounded-lg">
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                <span>
                                  Notice: Lotto Payout is enabled while Lotto Sale is disabled. It is
                                  recommended to enable Lotto Sale for balanced lottery shifts.
                                </span>
                              </div>
                            )}

                            {feature.dependencyWarning && !hasDependencyWarning && (
                              <div className="text-[11px] text-slate-500 italic">
                                Note: {feature.dependencyWarning}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Interactive Toggle Switch */}
                        <div className="flex items-center space-x-3 shrink-0 self-end sm:self-center">
                          <div className="text-right">
                            <span
                              className={`text-xs font-bold block ${
                                isEnabled ? 'text-emerald-400' : 'text-slate-500'
                              }`}
                            >
                              {isEnabled ? 'ENABLED' : 'DISABLED'}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {isEnabled ? 'Visible in POS' : 'Hidden from POS'}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleToggleFeature(feature.code)}
                            className={`w-14 h-7 rounded-full transition-colors relative p-1 cursor-pointer focus:outline-none ${
                              isEnabled ? 'bg-emerald-600' : 'bg-slate-700'
                            }`}
                          >
                            <div
                              className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                                isEnabled ? 'translate-x-7' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BULK STORE MANAGEMENT */}
          {activeTab === 'bulk' && (
            <div className="space-y-6">
              <div className="bg-[#161B22] border border-slate-800 p-5 rounded-2xl space-y-4">
                <div className="flex items-center space-x-2">
                  <Layers className="w-5 h-5 text-amber-400" />
                  <h4 className="text-sm font-black uppercase tracking-wider text-white">
                    Bulk Module Rollout Across Stores
                  </h4>
                </div>
                <p className="text-xs text-slate-400">
                  Select multiple store locations to simultaneously enable or disable a POS module in a
                  single administrative operation.
                </p>

                {/* Step 1: Select Target Stores */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300 uppercase block">
                    1. Select Stores ({bulkSelectedStores.length} selected)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {stores.map(st => {
                      const isSelected = bulkSelectedStores.includes(st.id);
                      return (
                        <label
                          key={st.id}
                          className={`p-3 rounded-xl border flex items-center space-x-3 cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-amber-500/10 border-amber-500/60'
                              : 'bg-slate-800/50 border-slate-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={e => {
                              if (e.target.checked) {
                                setBulkSelectedStores([...bulkSelectedStores, st.id]);
                              } else {
                                setBulkSelectedStores(bulkSelectedStores.filter(id => id !== st.id));
                              }
                            }}
                            className="w-4 h-4 rounded text-amber-500 focus:ring-0 cursor-pointer"
                          />
                          <div className="flex-1">
                            <div className="text-xs font-bold text-white">{st.name}</div>
                            <div className="text-[10px] text-slate-400">
                              #{st.storeNumber} • {st.businessType}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Step 2: Choose Feature & Desired Action */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="text-xs font-bold text-slate-300 uppercase block mb-1">
                      2. Choose Module
                    </label>
                    <select
                      value={bulkTargetFeature}
                      onChange={e => setBulkTargetFeature(e.target.value as PosFeatureCode)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white font-semibold focus:outline-none focus:border-amber-400"
                    >
                      {POS_FEATURE_CATALOG.map(f => (
                        <option key={f.code} value={f.code}>
                          {f.name} ({f.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 uppercase block mb-1">
                      3. Target Status
                    </label>
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={() => setBulkTargetAction(true)}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer ${
                          bulkTargetAction
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        ENABLE (ON)
                      </button>
                      <button
                        type="button"
                        onClick={() => setBulkTargetAction(false)}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer ${
                          !bulkTargetAction
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        DISABLE (OFF)
                      </button>
                    </div>
                  </div>
                </div>

                {/* Execute Button */}
                <div className="pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowBulkConfirm(true)}
                    disabled={bulkSelectedStores.length === 0}
                    className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-30 disabled:cursor-not-allowed text-black font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center space-x-2 transition-all cursor-pointer"
                  >
                    <Layers className="w-4 h-4 text-black" />
                    <span>
                      Apply to {bulkSelectedStores.length} Selected Store
                      {bulkSelectedStores.length !== 1 ? 's' : ''}
                    </span>
                  </button>
                </div>
              </div>

              {/* Confirmation Dialog */}
              {showBulkConfirm && (
                <div className="p-4 rounded-2xl bg-amber-950/80 border border-amber-600/70 text-amber-200 space-y-3">
                  <div className="flex items-center space-x-2 font-bold text-sm text-white">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span>Confirm Bulk Configuration Rollout</span>
                  </div>
                  <p className="text-xs">
                    You are about to turn{' '}
                    <strong>{bulkTargetAction ? 'ON (ENABLE)' : 'OFF (DISABLE)'}</strong> the module{' '}
                    <strong>{POS_FEATURE_CATALOG.find(f => f.code === bulkTargetFeature)?.name}</strong>{' '}
                    across <strong>{bulkSelectedStores.length} stores</strong>. This will take effect
                    immediately on all active registers.
                  </p>
                  <div className="flex items-center justify-end space-x-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowBulkConfirm(false)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleExecuteBulkChange}
                      className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-xs font-bold text-black uppercase tracking-wider cursor-pointer"
                    >
                      Yes, Apply Bulk Changes
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: AUDIT LOGS */}
          {activeTab === 'audit' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                    Feature Configuration Change Log
                  </h4>
                  <p className="text-xs text-slate-400">
                    Full tamper-evident audit trail of all store module modifications
                  </p>
                </div>

                {auditLogs.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Clear audit log history?')) {
                        storeFeatureService.clearAuditLogs();
                        setAuditLogs([]);
                        showFeedback('Audit logs cleared');
                      }
                    }}
                    className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 text-xs font-semibold cursor-pointer transition-colors"
                  >
                    Clear History
                  </button>
                )}
              </div>

              {auditLogs.length === 0 ? (
                <div className="p-12 text-center bg-[#161B22] border border-slate-800 rounded-2xl text-slate-500 space-y-2">
                  <History className="w-8 h-8 mx-auto text-slate-600" />
                  <p className="text-xs">No configuration change events recorded yet.</p>
                </div>
              ) : (
                <div className="bg-[#161B22] border border-slate-800 rounded-2xl overflow-hidden shadow-xs divide-y divide-slate-800/80">
                  {auditLogs.map(log => (
                    <div
                      key={log.id}
                      className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-white">{log.storeName}</span>
                          <span className="text-slate-500">•</span>
                          <span className="font-mono text-amber-300 font-semibold">{log.featureName}</span>
                        </div>
                        <p className="text-slate-400 text-[11px]">{log.reason}</p>
                        <div className="text-[10px] text-slate-500 font-mono">
                          By: {log.changedBy} • {new Date(log.timestamp).toLocaleString()}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.previousStatus
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {log.previousStatus ? 'WAS ON' : 'WAS OFF'}
                        </span>
                        <ArrowRight className="w-3 h-3 text-slate-500" />
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.newStatus
                              ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-600'
                              : 'bg-rose-950/60 text-rose-300 border border-rose-800'
                          }`}
                        >
                          {log.newStatus ? 'NOW ON' : 'NOW OFF'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#161B22] border-t border-slate-800 px-6 py-3.5 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-400">
            Active Store: <strong className="text-white">{selectedStore.name}</strong>
          </span>

          <button
            type="button"
            onClick={() => {
              playBeep('click');
              onClose();
            }}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
          >
            Close Portal
          </button>
        </div>
      </div>
    </div>
  );
};
