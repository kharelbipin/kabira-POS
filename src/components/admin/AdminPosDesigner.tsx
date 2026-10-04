import React, { useState } from 'react';
import {
  PosConfiguration,
  BusinessType,
  FeatureDefinition,
  ConfigHierarchyLevel,
  StoreProfile,
  RegisterProfile,
} from '../../types/industryConfig';
import {
  industryConfigService,
  INDUSTRY_TEMPLATES,
  DEFAULT_FEATURES,
  SAMPLE_STORES,
  SAMPLE_REGISTERS,
} from '../../services/industryConfigService';
import { playBeep } from '../../utils/audio';
import { useAdminStore } from '../../contexts/AdminStoreContext';
import {
  posDeploymentService,
  PosDeploymentOptions,
  PosDeploymentRecord,
} from '../../services/posDeploymentService';
import {
  Sliders,
  Store,
  Monitor,
  Layout,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  UploadCloud,
  Eye,
  Smartphone,
  Tablet,
  Laptop,
  Palette,
  HardDrive,
  Cpu,
  Receipt,
  ShoppingCart,
  ShieldCheck,
  Zap,
  ArrowRight,
  Plus,
  Trash2,
  Save,
  Check,
  History,
  X,
  Lock,
  Download,
  PackageCheck,
  KeyRound,
  Copy,
} from 'lucide-react';

interface AdminPosDesignerProps {
  onClose?: () => void;
  onApplyConfiguration?: (config: PosConfiguration) => void;
}

export const AdminPosDesigner: React.FC<AdminPosDesignerProps> = ({
  onClose,
  onApplyConfiguration,
}) => {
  const {
    selectedStoreId: adminStoreId,
    isAllStores,
    setSelectedStoreId: setAdminStoreId,
  } = useAdminStore();
  const initialStoreId =
    !isAllStores && SAMPLE_STORES.some(store => store.id === adminStoreId)
      ? adminStoreId
      : SAMPLE_STORES[0]?.id || 'store-1';
  const initialRegisterId =
    SAMPLE_STORES.find(store => store.id === initialStoreId)?.registers[0]?.id || 'reg-1-01';

  const [selectedStoreId, setSelectedStoreId] = useState<string>(initialStoreId);
  const [selectedRegisterId, setSelectedRegisterId] = useState<string>(initialRegisterId);
  const [hierarchyLevel, setHierarchyLevel] = useState<ConfigHierarchyLevel>('store');
  const [activeTab, setActiveTab] = useState<
    'features' | 'layout' | 'navigation' | 'actions' | 'workflow' | 'hardware' | 'theme' | 'history'
  >('features');

  // Active configuration being edited
  const [currentConfig, setCurrentConfig] = useState<PosConfiguration>(() =>
    industryConfigService.resolveActiveConfiguration(initialStoreId, initialRegisterId, 'Admin')
  );

  const [devicePreview, setDevicePreview] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [showPublishModal, setShowPublishModal] = useState<boolean>(false);
  const [showInstallerModal, setShowInstallerModal] = useState<boolean>(false);
  const [buildingInstaller, setBuildingInstaller] = useState<boolean>(false);
  const [deploymentRecord, setDeploymentRecord] = useState<PosDeploymentRecord | null>(null);
  const [deploymentOptions, setDeploymentOptions] = useState<PosDeploymentOptions>({
    installHardwareBridge: true,
    launchOnStartup: true,
    enableCustomerDisplay: true,
    enableOfflineMode: true,
    enableAutoUpdate: true,
    environment: 'production',
    expiresInDays: 7,
    adminApiUrl: window.location.origin + '/api',
  });
  const [publishTarget, setPublishTarget] = useState<'company' | 'store' | 'register'>('store');
  const [publishMessage, setPublishMessage] = useState<string>('');
  const [publishSuccessBanner, setPublishSuccessBanner] = useState<string | null>(null);

  // Synchronize the Designer with the persistent Admin store selector.
  useEffect(() => {
    if (isAllStores || !adminStoreId || adminStoreId === selectedStoreId) return;
    const store = SAMPLE_STORES.find(item => item.id === adminStoreId);
    if (!store) return;
    const nextRegisterId = store.registers[0]?.id || selectedRegisterId;
    setSelectedStoreId(store.id);
    setSelectedRegisterId(nextRegisterId);
    setCurrentConfig(
      industryConfigService.resolveActiveConfiguration(store.id, nextRegisterId, 'Admin')
    );
  }, [adminStoreId, isAllStores]);
  const [featureSearch, setFeatureSearch] = useState<string>('');
  const [featureCategoryFilter, setFeatureCategoryFilter] = useState<string>('ALL');

  // Handle template selection
  const handleSelectTemplate = (bizType: BusinessType) => {
    playBeep('click');
    const template = INDUSTRY_TEMPLATES[bizType];
    if (template) {
      setCurrentConfig({
        ...template,
        id: `config-${bizType}-${Date.now()}`,
        name: `${template.name} (Active Edit)`,
        version: currentConfig.version + 1,
        updatedAt: new Date().toISOString(),
      });
    }
  };

  // Toggle a feature
  const handleToggleFeature = (featureId: string) => {
    playBeep('click');
    const currentEnabled = currentConfig.features[featureId] ?? false;
    const newConfig = {
      ...currentConfig,
      features: {
        ...currentConfig.features,
        [featureId]: !currentEnabled,
      },
    };

    // If turning on restaurant, ensure modifiers is on, etc.
    if (!currentEnabled && featureId === 'feat_restaurant_tables') {
      newConfig.features['feat_kitchen_routing'] = true;
      newConfig.features['feat_menu_modifiers'] = true;
    }

    setCurrentConfig(newConfig);
  };

  // Toggle layout element
  const handleToggleLayoutElement = (elementId: string) => {
    playBeep('click');
    setCurrentConfig(prev => ({
      ...prev,
      layout: {
        ...prev.layout,
        elements: prev.layout.elements.map(el =>
          el.id === elementId ? { ...el, visible: !el.visible } : el
        ),
      },
    }));
  };

  // Toggle quick action
  const handleToggleQuickAction = (actionId: string) => {
    playBeep('click');
    setCurrentConfig(prev => ({
      ...prev,
      quickActions: prev.quickActions.map(qa =>
        qa.id === actionId ? { ...qa, enabled: !qa.enabled } : qa
      ),
    }));
  };

  // Publish configuration
  const handlePublish = () => {
    playBeep('success');
    const targetMap = publishTarget === 'company' ? 'entire_business' : publishTarget;
    const configToPublish: PosConfiguration = {
      ...currentConfig,
      storeId: publishTarget === 'company' ? undefined : selectedStoreId,
      registerId: publishTarget === 'register' ? selectedRegisterId : undefined,
    };
    const res = industryConfigService.publishConfiguration(
      configToPublish,
      targetMap,
      'Elena Rostova (Administrator)',
      publishMessage || `Published v${(currentConfig.version || 1) + 1} to ${publishTarget.toUpperCase()}`
    );

    const published = industryConfigService.resolveActiveConfiguration(selectedStoreId, selectedRegisterId);
    setCurrentConfig(published);
    setShowPublishModal(false);
    setPublishSuccessBanner(
      `Configuration v${res.version} published successfully to ${publishTarget.toUpperCase()}!`
    );

    if (onApplyConfiguration) {
      onApplyConfiguration(published);
    }

    setTimeout(() => {
      setPublishSuccessBanner(null);
    }, 4500);
  };

  const handleBuildInstaller = async () => {
    const store = SAMPLE_STORES.find(s => s.id === selectedStoreId);
    const register = SAMPLE_REGISTERS.find(r => r.id === selectedRegisterId);

    if (!store || !register) {
      setPublishSuccessBanner('Select a valid store and register before building the installer.');
      return;
    }

    setBuildingInstaller(true);
    try {
      const config = industryConfigService.resolveActiveConfiguration(
        selectedStoreId,
        selectedRegisterId,
        'Admin'
      );
      const record = await posDeploymentService.buildPackage(
        store,
        register,
        config,
        deploymentOptions
      );
      setDeploymentRecord(record);
      playBeep('success');
    } catch (error: any) {
      setPublishSuccessBanner(error?.message || 'Unable to build POS deployment package.');
    } finally {
      setBuildingInstaller(false);
    }
  };

  const activeStore = SAMPLE_STORES.find(s => s.id === selectedStoreId);
  const activeRegister = SAMPLE_REGISTERS.find(r => r.id === selectedRegisterId);

  // Filter features
  const filteredFeatures = DEFAULT_FEATURES.filter(f => {
    if (featureCategoryFilter !== 'ALL' && f.category !== featureCategoryFilter) return false;
    if (featureSearch.trim()) {
      const q = featureSearch.toLowerCase();
      return f.name.toLowerCase().includes(q) || f.description.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="h-full flex-1 min-h-0 flex flex-col bg-[#0B0F19] text-slate-100 select-none overflow-hidden font-sans">
      {/* Top Header Bar */}
      <div className="bg-[#030712] px-6 py-3.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 shrink-0 shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 text-slate-950 flex items-center justify-center shadow-lg font-black">
            <Sliders className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-black text-white tracking-tight">
                POS Designer & Feature Control Center
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold border border-amber-500/30">
                v{currentConfig.version}.0 • {currentConfig.businessType.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Enterprise Configuration Hierarchy • Layout Drag-and-Drop • Role Customization
            </p>
          </div>
        </div>

        {/* Hierarchy Context Selector: Store & Register */}
        <div className="flex items-center space-x-3 bg-slate-900/90 border border-slate-800 rounded-2xl px-3 py-1.5 text-xs">
          <div className="flex items-center space-x-1.5 text-slate-400">
            <Store className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-semibold">Target Store:</span>
          </div>
          <select
            value={selectedStoreId}
            onChange={e => {
              const nextStoreId = e.target.value;
              const nextStore = SAMPLE_STORES.find(store => store.id === nextStoreId);
              const nextRegisterId = nextStore?.registers[0]?.id || selectedRegisterId;
              setSelectedStoreId(nextStoreId);
              setSelectedRegisterId(nextRegisterId);
              setAdminStoreId(nextStoreId);
              const resolved = industryConfigService.resolveActiveConfiguration(
                nextStoreId,
                nextRegisterId,
                'Admin'
              );
              setCurrentConfig(resolved);
            }}
            className="bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1 text-white font-bold focus:outline-hidden focus:border-amber-400 cursor-pointer"
          >
            {SAMPLE_STORES.map(st => (
              <option key={st.id} value={st.id}>
                {st.name} ({st.businessType})
              </option>
            ))}
          </select>

          <div className="flex items-center space-x-1.5 text-slate-400 pl-2 border-l border-slate-700">
            <Monitor className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-semibold">Register:</span>
          </div>
          <select
            value={selectedRegisterId}
            onChange={e => {
              setSelectedRegisterId(e.target.value);
              const resolved = industryConfigService.resolveActiveConfiguration(
                selectedStoreId,
                e.target.value,
                'Admin'
              );
              setCurrentConfig(resolved);
            }}
            className="bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1 text-white font-bold focus:outline-hidden focus:border-amber-400 cursor-pointer"
          >
            {(activeStore?.registers || []).map(rg => (
              <option key={rg.id} value={rg.id}>
                {rg.name} ({rg.type})
              </option>
            ))}
          </select>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center space-x-2.5">
          <button
            type="button"
            onClick={() => setShowPublishModal(true)}
            className="flex items-center space-x-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-transform active:scale-95 cursor-pointer"
          >
            <UploadCloud className="w-4 h-4 text-slate-950 stroke-[2.5]" />
            <span>Publish to POS</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setDeploymentRecord(null);
              setShowInstallerModal(true);
            }}
            className="flex items-center space-x-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-transform active:scale-95 cursor-pointer"
          >
            <Download className="w-4 h-4 stroke-[2.5]" />
            <span>Build POS Installer</span>
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Publish Success Banner */}
      {publishSuccessBanner && (
        <div className="bg-emerald-950/90 border-b border-emerald-500 px-6 py-2.5 flex items-center justify-between text-xs text-emerald-300 font-bold animate-in slide-in-from-top duration-150">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{publishSuccessBanner}</span>
          </div>
          <span className="text-[10px] uppercase font-mono text-emerald-400">SYNCED WITH POS BRIDGE</span>
        </div>
      )}

      {/* Industry Template Quick Switcher Bar */}
      <div className="bg-slate-900/90 px-6 py-2.5 border-b border-slate-800 flex items-center justify-between overflow-x-auto gap-4 shrink-0">
        <div className="flex items-center space-x-2 shrink-0">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Presets:</span>
          </span>
          {(['liquor', 'smoke_shop', 'grocery', 'restaurant', 'convenience', 'retail'] as BusinessType[]).map(biz => {
            const isCurrent = currentConfig.businessType === biz;
            const labels: Record<BusinessType, string> = {
              liquor: '🍷 Liquor Store',
              smoke_shop: '💨 Smoke Shop',
              grocery: '🍏 Grocery / Produce',
              restaurant: '🍽️ Restaurant / Bar',
              convenience: '⛽ Convenience',
              retail: '🛍️ General Retail',
              custom: '⚙️ Custom',
            };
            return (
              <button
                key={biz}
                type="button"
                onClick={() => handleSelectTemplate(biz)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isCurrent
                    ? 'bg-amber-400 text-slate-950 shadow-md ring-2 ring-amber-400/40'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {labels[biz]}
              </button>
            );
          })}
        </div>

        {/* Device Preview Mode selector */}
        <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => setDevicePreview('desktop')}
            className={`p-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer ${
              devicePreview === 'desktop' ? 'bg-amber-400 text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
            title="Desktop Register (1920x1080)"
          >
            <Laptop className="w-3.5 h-3.5" />
            <span className="text-[11px] hidden sm:inline">Desktop</span>
          </button>
          <button
            type="button"
            onClick={() => setDevicePreview('tablet')}
            className={`p-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer ${
              devicePreview === 'tablet' ? 'bg-amber-400 text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
            title="iPad / Android Tablet (1024x768)"
          >
            <Tablet className="w-3.5 h-3.5" />
            <span className="text-[11px] hidden sm:inline">Tablet</span>
          </button>
          <button
            type="button"
            onClick={() => setDevicePreview('mobile')}
            className={`p-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer ${
              devicePreview === 'mobile' ? 'bg-amber-400 text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
            title="Mobile Handheld Scanner (375x812)"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="text-[11px] hidden sm:inline">Mobile</span>
          </button>
        </div>
      </div>

      {/* Main Designer Workspace: Navigation Tabs + Workspace Area */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Designer Sidebar Tabs */}
        <div className="w-60 bg-[#070B14] border-r border-slate-800 flex flex-col shrink-0 p-3 space-y-1 overflow-y-auto">
          <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500">
            DESIGNER MODULES
          </div>

          {[
            { id: 'features', label: 'Feature Control Center', icon: Zap, badge: `${Object.values(currentConfig.features).filter(Boolean).length} ON` },
            { id: 'layout', label: 'POS Layout Builder', icon: Layout },
            { id: 'navigation', label: 'Dynamic Navigation', icon: Layers },
            { id: 'actions', label: 'Quick Action Keys', icon: Sparkles },
            { id: 'workflow', label: 'Checkout Sequence', icon: ShoppingCart },
            { id: 'hardware', label: 'Bridge Hardware Specs', icon: Cpu },
            { id: 'theme', label: 'Theme & Branding', icon: Palette },
            { id: 'history', label: 'Releases & Rollback', icon: History, badge: 'v1 - v4' },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  playBeep('click');
                  setActiveTab(tab.id as any);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer text-left ${
                  isActive
                    ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-2.5 truncate">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                  <span className="truncate">{tab.label}</span>
                </div>
                {tab.badge && (
                  <span
                    className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md ${
                      isActive ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-amber-300'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}

          <div className="pt-4 mt-auto border-t border-slate-800/80 px-2 space-y-2">
            <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-[11px] text-slate-400 space-y-1">
              <div className="font-bold text-slate-200">Active Blueprint</div>
              <div className="font-mono text-amber-400">{currentConfig.name}</div>
              <div className="text-[10px] text-slate-500">Updated: Today by Elena R.</div>
            </div>
          </div>
        </div>

        {/* Workspace Canvas */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 bg-[#0B0F19]">
          {/* TAB 1: FEATURE CONTROL CENTER */}
          {activeTab === 'features' && (
            <div className="space-y-6 max-w-5xl">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-white tracking-tight">Feature Control Center</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Toggle capabilities on/off for this store profile. Dependencies are automatically verified.
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder="Search features..."
                    value={featureSearch}
                    onChange={e => setFeatureSearch(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-slate-500"
                  />
                  <select
                    value={featureCategoryFilter}
                    onChange={e => setFeatureCategoryFilter(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white font-bold cursor-pointer"
                  >
                    <option value="ALL">All Categories</option>
                    <option value="REGISTER">Core Register</option>
                    <option value="LIQUOR_TOBACCO">Liquor & Tobacco</option>
                    <option value="GROCERY">Grocery & Produce</option>
                    <option value="RESTAURANT">Restaurant & Bar</option>
                    <option value="ADVANCED">Advanced</option>
                  </select>
                </div>
              </div>

              {/* Features Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredFeatures.map(f => {
                  const isEnabled = currentConfig.features[f.id] ?? false;
                  return (
                    <div
                      key={f.id}
                      className={`p-4 rounded-3xl border transition-all flex items-start justify-between gap-3 ${
                        isEnabled
                          ? 'bg-slate-900/90 border-amber-500/50 shadow-md ring-1 ring-amber-500/20'
                          : 'bg-slate-950/60 border-slate-800/80 opacity-75'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-sm font-black text-white">{f.name}</h4>
                          <span className="px-1.5 py-0.5 rounded-md bg-slate-800 text-[10px] font-mono text-slate-400 border border-slate-700">
                            {f.category}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">{f.description}</p>
                        {f.dependencies && f.dependencies.length > 0 && (
                          <div className="text-[10px] text-amber-400/80 font-mono pt-1">
                            Requires: {f.dependencies.join(', ')}
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleFeature(f.id)}
                        className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 mt-1 ${
                          isEnabled ? 'bg-amber-400' : 'bg-slate-700'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-full bg-slate-950 transition-transform absolute top-0.5 ${
                            isEnabled ? 'left-6.5' : 'left-0.5'
                          }`}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: POS LAYOUT BUILDER */}
          {activeTab === 'layout' && (
            <div className="space-y-6 max-w-5xl">
              <div>
                <h2 className="text-xl font-black text-white tracking-tight">POS Layout Builder</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Configure visible sections on the cashier screen for {devicePreview.toUpperCase()} view.
                </p>
              </div>

              {/* Elements List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentConfig.layout.elements.map(el => (
                  <div
                    key={el.id}
                    className={`p-4 rounded-3xl border flex items-center justify-between gap-3 ${
                      el.visible
                        ? 'bg-slate-900 border-amber-500/50 shadow-md'
                        : 'bg-slate-950/60 border-slate-800 opacity-60'
                    }`}
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-bold text-white">{el.name}</span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-400">
                          {el.position.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">ID: {el.id}</div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleLayoutElement(el.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                        el.visible
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {el.visible ? 'Visible ✓' : 'Hidden'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: DYNAMIC NAVIGATION */}
          {activeTab === 'navigation' && (
            <div className="space-y-6 max-w-5xl">
              <div>
                <h2 className="text-xl font-black text-white tracking-tight">Dynamic Navigation Menu</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Reorder and customize top navbar tabs visible to cashiers and managers.
                </p>
              </div>

              <div className="space-y-3">
                {currentConfig.navigation.map((item, index) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="w-6 h-6 rounded-lg bg-slate-800 font-mono text-xs font-bold text-amber-400 flex items-center justify-center">
                        {index + 1}
                      </span>
                      <div>
                        <span className="text-sm font-bold text-white">{item.label}</span>
                        <span className="text-xs text-slate-400 font-mono ml-2">Target: {item.targetTab}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-mono text-slate-400">Min Role: {item.roles.join(', ')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: QUICK ACTIONS */}
          {activeTab === 'actions' && (
            <div className="space-y-6 max-w-5xl">
              <div>
                <h2 className="text-xl font-black text-white tracking-tight">Cashier Quick Action Keys</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  High-speed action keys displayed beneath the header bar for single-touch operation.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {currentConfig.quickActions.map(qa => (
                  <div
                    key={qa.id}
                    className={`p-4 rounded-2xl border flex items-center justify-between ${
                      qa.enabled
                        ? 'bg-slate-900 border-amber-500/40 shadow-sm'
                        : 'bg-slate-950 border-slate-800 opacity-60'
                    }`}
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-bold text-white">{qa.label}</span>
                        {qa.hotkey && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-amber-300 border border-slate-700">
                            {qa.hotkey}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">Action: {qa.action}</div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleQuickAction(qa.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                        qa.enabled
                          ? 'bg-amber-400 text-slate-950'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {qa.enabled ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: CHECKOUT WORKFLOW */}
          {activeTab === 'workflow' && (
            <div className="space-y-6 max-w-5xl">
              <div>
                <h2 className="text-xl font-black text-white tracking-tight">Checkout Workflow Sequence</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Ordered transaction stages enforced during ring-up and tender.
                </p>
              </div>

              <div className="space-y-3">
                {currentConfig.checkoutWorkflow.map((step, idx) => (
                  <div
                    key={step.id}
                    className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-300 font-mono font-bold flex items-center justify-center text-sm">
                        {idx + 1}
                      </span>
                      <div>
                        <span className="text-sm font-black text-white">{step.name}</span>
                        <p className="text-xs text-slate-400">{step.description}</p>
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold ${
                        step.required
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {step.required ? 'MANDATORY' : 'OPTIONAL'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: HARDWARE REQUIREMENTS */}
          {activeTab === 'hardware' && (
            <div className="space-y-6 max-w-5xl">
              <div>
                <h2 className="text-xl font-black text-white tracking-tight">POS Bridge Hardware Profiles</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Device types automatically claimed by the Windows POS Bridge for this store industry.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { name: 'Counter Receipt Printer', type: 'Epson / Star Micronics (USB/Ethernet)', required: currentConfig.hardwareProfile.receiptPrinterRequired, model: 'TM-T88VI' },
                  { name: 'Barcode Scanner Gun', type: 'Zebra / Honeywell (USB HID / Serial COM)', required: currentConfig.hardwareProfile.barcodeScannerRequired, model: 'DS2208' },
                  { name: 'Certified Weighing Scale', type: 'Mettler Toledo / Avery Berkel (RS-232 / USB)', required: currentConfig.hardwareProfile.scaleRequired, model: 'Ariva-S' },
                  { name: 'Kitchen Order Printer', type: 'Impact Ribbon or KDS Display (LAN)', required: currentConfig.hardwareProfile.kitchenPrinterRequired, model: 'TM-U220B' },
                  { name: 'Payment PIN Pad Terminal', type: 'PAX / Verifone / Ingenico (IP / USB)', required: currentConfig.hardwareProfile.paymentTerminalRequired, model: 'PAX A920 Pro' },
                  { name: 'Electronic Cash Drawer', type: 'APG Series 100 / 4000 (RJ11 Kickout)', required: currentConfig.hardwareProfile.cashDrawerRequired, model: 'APG Vasario' },
                ].map((hw, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white">{hw.name}</span>
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                          hw.required
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {hw.required ? 'REQUIRED' : 'OPTIONAL'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400">{hw.type}</div>
                    <div className="text-[11px] font-mono text-amber-400">Driver Model: {hw.model}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 7: THEME & BRANDING */}
          {activeTab === 'theme' && (
            <div className="space-y-6 max-w-5xl">
              <div>
                <h2 className="text-xl font-black text-white tracking-tight">Theme & Store Branding</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Customize the visual identity, brand name, and accent highlights for this location.
                </p>
              </div>

              <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-400 block mb-1">
                    Store Brand Display Name
                  </label>
                  <input
                    type="text"
                    value={currentConfig.theme.storeName}
                    onChange={e =>
                      setCurrentConfig(prev => ({
                        ...prev,
                        theme: { ...prev.theme, storeName: e.target.value },
                      }))
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white font-bold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-slate-400 block mb-2">
                    Branding Accent Color
                  </label>
                  <div className="flex items-center space-x-3">
                    {['#F5BD47', '#10B981', '#E11D48', '#3B82F6', '#8B5CF6', '#F97316'].map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() =>
                          setCurrentConfig(prev => ({
                            ...prev,
                            theme: { ...prev.theme, accentColor: color },
                          }))
                        }
                        style={{ backgroundColor: color }}
                        className={`w-9 h-9 rounded-2xl cursor-pointer transition-transform ${
                          currentConfig.theme.accentColor === color ? 'scale-110 ring-4 ring-white/30' : ''
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: VERSION HISTORY & ROLLBACK */}
          {activeTab === 'history' && (
            <div className="space-y-6 max-w-5xl">
              <div>
                <h2 className="text-xl font-black text-white tracking-tight">
                  Configuration Release History & Rollback
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Audit trail of all published templates with 1-click restore to any previous revision.
                </p>
              </div>

              <div className="space-y-3">
                {[
                  { version: 4, publishedAt: 'Today, 2:15 PM', author: 'Elena Rostova', notes: 'Integrated Grocery Produce PLU & Scale Reader' },
                  { version: 3, publishedAt: 'Yesterday, 11:30 AM', author: 'Elena Rostova', notes: 'Configured Restaurant Table Map & KDS line tickets' },
                  { version: 2, publishedAt: '3 days ago', author: 'Marcus King', notes: 'Merged Card & Apple/Google PIN pad checkout flow' },
                  { version: 1, publishedAt: 'Sep 10, 2026', author: 'System Bootstrap', notes: 'Initial Liquor Store default template deployment' },
                ].map(hist => (
                  <div
                    key={hist.version}
                    className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-black font-mono text-amber-400">
                          Release v{hist.version}.0
                        </span>
                        <span className="text-xs text-slate-400">• {hist.publishedAt}</span>
                      </div>
                      <p className="text-xs text-slate-300">{hist.notes}</p>
                      <div className="text-[10px] text-slate-500 font-mono">By: {hist.author}</div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        playBeep('click');
                        setPublishSuccessBanner(`Rolled back to Release v${hist.version}.0 successfully!`);
                        setTimeout(() => setPublishSuccessBanner(null), 3500);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center space-x-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                      <span>Rollback to v{hist.version}</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Publish Configuration Modal */}
      {showPublishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 select-none animate-in fade-in duration-150">
          <div className="bg-[#0F172A] border border-amber-500/40 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden text-slate-100 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <UploadCloud className="w-6 h-6 text-amber-400" />
                <h3 className="text-lg font-black text-white">Publish to POS</h3>
              </div>
              <button onClick={() => setShowPublishModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Send this configuration to POS terminals that are already installed and connected:
            </p>

            {/* Target Level */}
            <div className="space-y-2">
              {[
                { id: 'register', label: 'Single Register Only', desc: `Register ${activeRegister?.name || '#01'}` },
                { id: 'store', label: 'Entire Store Location', desc: `Store ${activeStore?.name || '#1'}` },
                { id: 'company', label: 'Company-Wide Global Default', desc: 'All stores & registers inheriting default' },
              ].map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setPublishTarget(t.id as any)}
                  className={`w-full p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                    publishTarget === t.id
                      ? 'bg-amber-400 text-slate-950 border-amber-400 font-bold shadow-md'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
                  }`}
                >
                  <div className="text-xs font-black uppercase">{t.label}</div>
                  <div className={`text-[11px] ${publishTarget === t.id ? 'text-slate-900' : 'text-slate-400'}`}>
                    {t.desc}
                  </div>
                </button>
              ))}
            </div>

            {/* Confirmation Buttons */}
            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowPublishModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePublish}
                className="flex-1 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black uppercase tracking-wider shadow-lg cursor-pointer"
              >
                Publish & Sync Now ✓
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Build POS Installer Modal */}
      {showInstallerModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 select-none">
          <div className="bg-[#0F172A] border border-sky-500/40 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto text-slate-100">
            <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center">
                  <PackageCheck className="w-6 h-6 text-sky-400" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Build Store POS Installer</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Create a store/register-specific Windows deployment package.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowInstallerModal(false)}
                className="w-9 h-9 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 font-black">Store</div>
                  <div className="text-sm font-black text-white mt-1">{activeStore?.name || selectedStoreId}</div>
                  <div className="text-[11px] text-slate-400 mt-1">{activeStore?.cityStateZip || 'Selected store'}</div>
                </div>
                <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 font-black">Register</div>
                  <div className="text-sm font-black text-white mt-1">{activeRegister?.name || selectedRegisterId}</div>
                  <div className="text-[11px] text-slate-400 mt-1">Configuration v{currentConfig.version}</div>
                </div>
              </div>

              {!deploymentRecord ? (
                <>
                  <div>
                    <div className="text-xs font-black text-white uppercase tracking-wider mb-3">Installer Options</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[
                        ['installHardwareBridge', 'Install Hardware Bridge', 'Printer, drawer, scanner and display service'],
                        ['launchOnStartup', 'Launch on Windows Startup', 'Start POS automatically after login'],
                        ['enableCustomerDisplay', 'Enable Customer Display', 'Prepare Display 2 support for this register'],
                        ['enableOfflineMode', 'Enable Offline Mode', 'Allow local operation during internet outages'],
                        ['enableAutoUpdate', 'Enable Auto Updates', 'Receive future POS releases from Admin'],
                      ].map(([key, label, desc]) => (
                        <label key={key} className="flex items-start gap-3 rounded-xl border border-slate-700 bg-slate-900/80 p-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean((deploymentOptions as any)[key])}
                            onChange={e =>
                              setDeploymentOptions(prev => ({ ...prev, [key]: e.target.checked }))
                            }
                            className="mt-0.5 w-4 h-4 accent-sky-500"
                          />
                          <span>
                            <span className="block text-xs font-bold text-slate-100">{label}</span>
                            <span className="block text-[10px] text-slate-500 mt-1">{desc}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <label>
                      <span className="block text-[10px] uppercase tracking-wider text-slate-500 font-black mb-1.5">Environment</span>
                      <select
                        value={deploymentOptions.environment}
                        onChange={e =>
                          setDeploymentOptions(prev => ({
                            ...prev,
                            environment: e.target.value as 'production' | 'test',
                          }))
                        }
                        className="w-full h-10 rounded-xl border border-slate-700 bg-slate-900 px-3 text-xs text-white"
                      >
                        <option value="production">Production</option>
                        <option value="test">Test / Staging</option>
                      </select>
                    </label>

                    <label>
                      <span className="block text-[10px] uppercase tracking-wider text-slate-500 font-black mb-1.5">Installer Expires</span>
                      <select
                        value={deploymentOptions.expiresInDays}
                        onChange={e =>
                          setDeploymentOptions(prev => ({
                            ...prev,
                            expiresInDays: Number(e.target.value),
                          }))
                        }
                        className="w-full h-10 rounded-xl border border-slate-700 bg-slate-900 px-3 text-xs text-white"
                      >
                        <option value={1}>1 Day</option>
                        <option value={3}>3 Days</option>
                        <option value={7}>7 Days</option>
                        <option value={14}>14 Days</option>
                        <option value={30}>30 Days</option>
                      </select>
                    </label>

                    <label>
                      <span className="block text-[10px] uppercase tracking-wider text-slate-500 font-black mb-1.5">Admin API</span>
                      <input
                        value={deploymentOptions.adminApiUrl}
                        onChange={e =>
                          setDeploymentOptions(prev => ({ ...prev, adminApiUrl: e.target.value }))
                        }
                        className="w-full h-10 rounded-xl border border-slate-700 bg-slate-900 px-3 text-xs text-white"
                      />
                    </label>
                  </div>

                  <div className="rounded-xl border border-sky-900/60 bg-sky-950/25 p-4 text-[11px] text-sky-200 leading-relaxed">
                    This package contains the selected POS configuration, store/register identity,
                    one-time enrollment credentials and a Windows setup script. It does not store
                    an administrator password.
                  </div>

                  <div className="flex justify-end gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowInstallerModal(false)}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={buildingInstaller}
                      onClick={() => void handleBuildInstaller()}
                      className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      {buildingInstaller ? 'Building Package...' : 'Generate & Download'}
                    </button>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-emerald-700/50 bg-emerald-950/25 p-5 flex items-start gap-4">
                    <CheckCircle2 className="w-7 h-7 text-emerald-400 shrink-0" />
                    <div>
                      <div className="text-base font-black text-emerald-300">POS Deployment Package Ready</div>
                      <div className="text-xs text-slate-300 mt-1 break-all">{deploymentRecord.fileName}</div>
                      <div className="text-[11px] text-slate-500 mt-2">
                        Package downloaded. Install it on the target store/register computer.
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-400">
                      <KeyRound className="w-4 h-4 text-amber-400" />
                      One-Time Activation Code
                    </div>
                    <div className="flex items-center justify-between gap-3 mt-3">
                      <div className="font-mono text-2xl font-black tracking-[0.18em] text-amber-300">
                        {deploymentRecord.activationCode}
                      </div>
                      <button
                        type="button"
                        onClick={() => navigator.clipboard?.writeText(deploymentRecord.activationCode)}
                        className="px-3 py-2 rounded-lg border border-slate-600 bg-slate-800 hover:bg-slate-700 text-xs font-bold flex items-center gap-2 cursor-pointer"
                      >
                        <Copy className="w-4 h-4" />
                        Copy
                      </button>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-3">
                      Expires {new Date(deploymentRecord.expiresAt).toLocaleString()} · Store {deploymentRecord.storeId} · Register {deploymentRecord.registerId}
                    </div>
                  </div>

                  <div className="rounded-xl border border-amber-800/50 bg-amber-950/20 p-4 text-[11px] text-amber-200">
                    Production activation should exchange the package's one-time deployment token
                    for a permanent device credential, then invalidate the token.
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setDeploymentRecord(null)}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold cursor-pointer"
                    >
                      Build Another
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowInstallerModal(false)}
                      className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
