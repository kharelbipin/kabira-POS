import React, { useState } from 'react';
import { StoreSettings, User } from '../../types';
import { api } from '../../utils/api';
import { playBeep } from '../../utils/audio';
import { PaymentAuditModal } from '../payment/PaymentAuditModal';
import {
  Settings,
  Store,
  CreditCard,
  Receipt,
  Users,
  Package,
  Tag,
  Gift,
  Globe,
  FileCheck,
  DollarSign,
  Cpu,
  Bell,
  Shield,
  FileSpreadsheet,
  Link2,
  Database,
  Activity,
  Search,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Save,
  RotateCcw,
  Sliders,
  ChevronRight,
  Printer,
  Barcode,
  Clock,
  Sparkles,
  Wifi,
  HardDrive,
  KeyRound,
  Percent,
} from 'lucide-react';

interface ManagerSettingsCenterProps {
  settings: StoreSettings | null;
  currentUser: User | null;
  onRefresh: () => void;
  onClose?: () => void;
}

export type SettingsSectionId =
  | 'general'
  | 'register'
  | 'printing'
  | 'users'
  | 'payments'
  | 'inventory'
  | 'pricing'
  | 'customers'
  | 'online_store'
  | 'check_cashing'
  | 'shifts'
  | 'devices'
  | 'notifications'
  | 'security'
  | 'taxes'
  | 'integrations'
  | 'backup'
  | 'audit';

interface SectionMeta {
  id: SettingsSectionId;
  label: string;
  icon: React.ElementType;
  description: string;
  badge?: string;
}

const SETTINGS_SECTIONS: SectionMeta[] = [
  { id: 'general', label: 'General', icon: Store, description: 'Store name, address, contact, and branding' },
  { id: 'register', label: 'Register & Checkout', icon: Sliders, description: 'Checkout behavior, age prompt, sounds' },
  { id: 'printing', label: 'Printing & Receipts', icon: Printer, description: 'Receipt templates, headers, auto-print' },
  { id: 'users', label: 'Users & Permissions', icon: Users, description: 'Role limits, discount thresholds, approval' },
  { id: 'payments', label: 'Payments', icon: CreditCard, description: 'Cash, card processing, splits, house accounts' },
  { id: 'inventory', label: 'Inventory', icon: Package, description: 'Stock thresholds, negative inventory, scanner' },
  { id: 'pricing', label: 'Products & Pricing', icon: Tag, description: 'Markup rules, rounding, happy hour specials' },
  { id: 'customers', label: 'Customers & Loyalty', icon: Gift, description: 'Reward points, sign-up bonus, tier perks' },
  { id: 'online_store', label: 'Online Store', icon: Globe, description: 'Pickup hours, delivery limits, online sync' },
  { id: 'check_cashing', label: 'Check Cashing', icon: FileCheck, description: 'Fee rules, payroll limits, ID requirements' },
  { id: 'shifts', label: 'Shifts & Cash Drawer', icon: DollarSign, description: 'Starting bank, blind closeout, cash drops' },
  { id: 'devices', label: 'Devices', icon: Cpu, description: 'Barcode guns, pole display, thermal printers' },
  { id: 'notifications', label: 'Notifications', icon: Bell, description: 'Low stock alerts, high transaction alerts' },
  { id: 'security', label: 'Security', icon: Shield, description: 'Manager PIN requirement, auto lock, logoff' },
  { id: 'taxes', label: 'Taxes & Compliance', icon: FileSpreadsheet, description: 'Texas 8.25% sales tax, TABC compliance' },
  { id: 'integrations', label: 'Integrations', icon: Link2, description: 'QuickBooks export, DoorDash, liquor sync' },
  { id: 'backup', label: 'Backup & Sync', icon: Database, description: 'Cloud replication, offline cache, data export' },
  { id: 'audit', label: 'Audit & System', icon: Activity, description: 'System health, disk usage, real-time logs' },
];

export const ManagerSettingsCenter: React.FC<ManagerSettingsCenterProps> = ({
  settings,
  currentUser,
  onRefresh,
  onClose,
}) => {
  const [activeSection, setActiveSection] = useState<SettingsSectionId>('general');
  const [searchQuery, setSearchQuery] = useState('');
  const [scopeLevel, setScopeLevel] = useState<'company' | 'store' | 'register'>('store');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showPaymentAuditModal, setShowPaymentAuditModal] = useState(false);

  // Form State initialized with store settings + full manager controls
  const [formData, setFormData] = useState({
    // General
    storeName: settings?.storeName || '377 Spirits',
    tagline: settings?.tagline || 'Fine Liquors, Craft Spirits, Wine & Beer',
    address: settings?.address || '4100 E Hwy 377',
    city: settings?.city || 'Granbury',
    state: settings?.state || 'TX',
    zip: settings?.zip || '76049',
    phone: settings?.phone || '(817) 555-0377',
    email: settings?.email || 'manager@377spirits.com',
    website: 'https://377spirits.com',
    timezone: 'America/Chicago (CST)',
    currency: 'USD ($)',

    // Register & Checkout
    defaultTerminalName: 'Terminal #01 (Main Register)',
    promptCustomerAtStart: true,
    requireAgeVerificationAllAlcohol: true,
    ageVerificationThreshold: 21,
    scannerSound: settings?.scannerSound !== false,
    autoLockMinutes: 15,
    allowQuickCashButtons: true,
    enableItemLevelDiscount: true,
    autoOpenDrawerOnCash: true,

    // Printing & Receipts
    receiptHeader: settings?.receiptHeader || '377 Spirits\nGranbury, TX 76049\n(817) 555-0377',
    receiptFooter: settings?.receiptFooter || 'Thank you for choosing 377 Spirits!\nPlease enjoy responsibly.',
    printMerchantCopyCard: true,
    printCustomerCopyCard: false,
    emailReceiptsEnabled: true,
    smsReceiptsEnabled: true,
    showBarcodeOnReceipt: true,

    // Users & Permissions
    cashierMaxDiscountPercent: 10,
    managerMaxDiscountPercent: 25,
    adminMaxDiscountPercent: 100,
    requireManagerDiscountAbove: settings?.requireManagerDiscountAbove ?? 20,
    requireManagerForRefunds: true,
    requireManagerForPriceOverride: true,
    requireManagerToOpenDrawerNoSale: true,

    // Payments
    enableCash: settings?.enableCash !== false,
    enableCard: settings?.enableCard !== false,
    enableContactless: settings?.enableContactless !== false,
    enableSplit: settings?.enableSplit !== false,
    creditCardSurchargePercent: 0,
    allowCheckPayment: true,
    allowHouseAccounts: false,

    // Payment Fallback (PAY-001 to PAY-028)
    paymentFallbackEnabled: settings?.paymentFallbackEnabled !== false,
    tapToPayPhoneEnabled: settings?.tapToPayPhoneEnabled !== false,
    customerQrPaymentEnabled: settings?.customerQrPaymentEnabled !== false,
    customerSelfEnterCard: settings?.customerSelfEnterCard || 'all_cashiers',
    cashierManualCardEntry: settings?.cashierManualCardEntry || 'manager_required',
    terminalAutoFallbackOnFailure: settings?.terminalAutoFallbackOnFailure !== false,
    paymentSessionExpiryMinutes: settings?.paymentSessionExpiryMinutes || 10,
    paymentTerminalIp: settings?.paymentTerminalIp || '192.168.1.45',

    // Inventory
    defaultLowStockThreshold: 6,
    allowNegativeInventory: false,
    autoReorderPointMultiplier: 1.5,
    enforceBarcodeScanAtReceiving: true,
    aiShelfCounterConfidenceCutoff: 80,

    // Products & Pricing
    defaultMarkupPercent: 35,
    roundPricesToNearest: '0.99',
    enableHappyHourPricing: true,
    happyHourDiscountPercent: 10,

    // Customers & Loyalty
    loyaltyProgramEnabled: settings?.loyaltyProgramEnabled !== false,
    loyaltyPointsPerDollar: settings?.loyaltyPointsPerDollar ?? 1,
    loyaltyPointsPerDollarDiscount: settings?.loyaltyPointsPerDollarDiscount ?? 20,
    loyaltyMinPointsToRedeem: settings?.loyaltyMinPointsToRedeem ?? 50,
    loyaltyMaxDiscountPercent: settings?.loyaltyMaxDiscountPercent ?? 50,
    loyaltySignupBonusPoints: settings?.loyaltySignupBonusPoints ?? 50,

    // Online Store
    onlineStoreEnabled: true,
    onlineStoreCurbsidePickup: true,
    onlineStoreDeliveryEnabled: true,
    onlineDeliveryMinOrder: 35.0,
    onlineDeliveryRadiusMiles: 15,

    // Check Cashing
    checkCashingEnabled: true,
    payrollCheckFeePercent: 1.5,
    governmentCheckFeePercent: 1.0,
    personalCheckFeePercent: 3.0,
    minCheckFee: 3.0,
    maxCheckFee: 35.0,
    requireManagerCheckApprovalAbove: 1000,

    // Shifts & Cash Drawer
    startingBankAmount: 200.0,
    blindCloseout: true,
    maxCashDrawerThreshold: 1500.0,
    alertCashDropNeeded: true,

    // Devices
    activePrinterModel: 'Epson TM-T88VII High-Speed Thermal',
    barcodeScannerMode: 'USB HID Keyboard Emulation',
    poleCustomerDisplayEnabled: true,
    cashDrawerKickCode: '<ESC>p040',

    // Notifications
    alertLowStockEmail: true,
    alertCashDropDrawerThreshold: true,
    alertRefundAboveAmount: 100.0,

    // Security
    requireManagerPinForVoid: true,
    pinLockoutAttempts: 5,
    sessionTimeoutInactivity: 30,

    // Taxes & Compliance
    defaultTaxRate: settings?.defaultTaxRate ?? 0.0825,
    liquorTaxIncluded: false,
    tabcReportingEnabled: true,

    // Integrations
    quickBooksSyncEnabled: true,
    stateLiquorReportExport: true,
    doorDashSyncEnabled: false,

    // Backup & Sync
    cloudSyncStatus: 'Online & Synced (Cloud Run Container)',
    offlineTransactionCacheLimit: 500,
    autoDailyBackupHour: 3,
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.updateSettings({
        storeName: formData.storeName,
        tagline: formData.tagline,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zip: formData.zip,
        cityStateZip: `${formData.city}, ${formData.state} ${formData.zip}`,
        phone: formData.phone,
        email: formData.email,
        defaultTaxRate: formData.defaultTaxRate,
        receiptHeader: formData.receiptHeader,
        receiptFooter: formData.receiptFooter,
        requireManagerDiscountAbove: formData.requireManagerDiscountAbove,
        enableCash: formData.enableCash,
        enableCard: formData.enableCard,
        enableContactless: formData.enableContactless,
        enableSplit: formData.enableSplit,
        scannerSound: formData.scannerSound,
        loyaltyProgramEnabled: formData.loyaltyProgramEnabled,
        loyaltyPointsPerDollar: formData.loyaltyPointsPerDollar,
        loyaltyPointsPerDollarDiscount: formData.loyaltyPointsPerDollarDiscount,
        loyaltyMinPointsToRedeem: formData.loyaltyMinPointsToRedeem,
        loyaltyMaxDiscountPercent: formData.loyaltyMaxDiscountPercent,
        loyaltySignupBonusPoints: formData.loyaltySignupBonusPoints,
        paymentFallbackEnabled: formData.paymentFallbackEnabled,
        tapToPayPhoneEnabled: formData.tapToPayPhoneEnabled,
        customerQrPaymentEnabled: formData.customerQrPaymentEnabled,
        customerSelfEnterCard: formData.customerSelfEnterCard,
        cashierManualCardEntry: formData.cashierManualCardEntry,
        terminalAutoFallbackOnFailure: formData.terminalAutoFallbackOnFailure,
        paymentSessionExpiryMinutes: formData.paymentSessionExpiryMinutes,
        paymentTerminalIp: formData.paymentTerminalIp,
      });

      // Persist scope-level overrides locally
      try {
        localStorage.setItem(`pos_settings_scope_${scopeLevel}`, JSON.stringify(formData));
      } catch (e) {}

      playBeep('success');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      onRefresh();
    } catch (err: any) {
      playBeep('error');
      alert(err.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredSections = SETTINGS_SECTIONS.filter(s => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return s.label.toLowerCase().includes(q) || s.description.toLowerCase().includes(q);
  });

  return (
    <div className="h-full flex flex-col bg-[#F8FAFC] text-slate-800 select-none overflow-hidden">
      {/* Top Bar with 3-Level Scope Selector */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shrink-0 shadow-xs">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-900 shadow-xs">
              <Settings className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">Manager Settings Center</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  Granbury Store #01
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage operational controls, printing, cash drawers, security, and hardware without backend access.
              </p>
            </div>
          </div>
        </div>

        {/* 3-Level Scope Selector */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setScopeLevel('company')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                scopeLevel === 'company'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🏢 Company Default
            </button>
            <button
              type="button"
              onClick={() => setScopeLevel('store')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                scopeLevel === 'store'
                  ? 'bg-amber-400 text-slate-950 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🏪 Store: Granbury #1
            </button>
            <button
              type="button"
              onClick={() => setScopeLevel('register')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                scopeLevel === 'register'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🖥️ Terminal #01
            </button>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center space-x-1.5 px-4 py-2 bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-sm transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-2.5 flex items-center space-x-2 text-emerald-800 text-xs font-semibold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Settings successfully synchronized across Granbury Store #01 and Register Terminal #01.</span>
        </div>
      )}

      {/* Main Settings Body: Left Navigation & Right Content Form */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: 18 Sections */}
        <div className="w-72 bg-white border-r border-slate-200 flex flex-col shrink-0">
          {/* Search Box */}
          <div className="p-3 border-b border-slate-100">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search 18 setting areas..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* Section Items */}
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {filteredSections.map(section => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-left text-xs transition-all cursor-pointer ${
                    isActive
                      ? 'bg-amber-100/70 text-amber-950 font-bold border border-amber-300/60 shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-amber-700' : 'text-slate-400'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <span className="block truncate">{section.label}</span>
                  </div>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-amber-700 shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Footer Info */}
          <div className="p-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
            <div className="flex items-center space-x-1.5">
              <Lock className="w-3 h-3 text-slate-400" />
              <span>Manager Auth Active</span>
            </div>
            <span>18 Sections</span>
          </div>
        </div>

        {/* Right Content Panel */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#F8FAFC]">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Section Header */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center space-x-3">
                {(() => {
                  const curr = SETTINGS_SECTIONS.find(s => s.id === activeSection);
                  const Icon = curr?.icon || Settings;
                  return (
                    <>
                      <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-lg font-black text-slate-900">{curr?.label} Settings</h2>
                        <p className="text-xs text-slate-500">{curr?.description}</p>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* SECTION 1: GENERAL */}
            {activeSection === 'general' && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
                  Store Information & Public Profile
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Store Legal Name</label>
                    <input
                      type="text"
                      value={formData.storeName}
                      onChange={e => setFormData({ ...formData, storeName: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Store Tagline</label>
                    <input
                      type="text"
                      value={formData.tagline}
                      onChange={e => setFormData({ ...formData, tagline: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Street Address</label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={e => setFormData({ ...formData, address: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">City</label>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={e => setFormData({ ...formData, city: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">State</label>
                      <input
                        type="text"
                        value={formData.state}
                        onChange={e => setFormData({ ...formData, state: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-400 text-center"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">ZIP</label>
                      <input
                        type="text"
                        value={formData.zip}
                        onChange={e => setFormData({ ...formData, zip: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-400 text-center"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Store Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 2: REGISTER & CHECKOUT */}
            {activeSection === 'register' && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
                  Checkout Behavior & Rules
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Prompt for Customer at Start of Sale</span>
                      <span className="text-[11px] text-slate-500">Encourages cashiers to attach phone or loyalty member</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.promptCustomerAtStart}
                      onChange={e => setFormData({ ...formData, promptCustomerAtStart: e.target.checked })}
                      className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Enforce 21+ Age Verification Modal</span>
                      <span className="text-[11px] text-slate-500">TABC compliance: cashiers must verify birthdate on alcohol checkout</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.requireAgeVerificationAllAlcohol}
                      onChange={e => setFormData({ ...formData, requireAgeVerificationAllAlcohol: e.target.checked })}
                      className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Audio Beeps on Scan & Actions</span>
                      <span className="text-[11px] text-slate-500">Auditory confirmation when barcode gun scans or error triggers</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.scannerSound}
                      onChange={e => setFormData({ ...formData, scannerSound: e.target.checked })}
                      className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">Terminal Device Name</label>
                      <input
                        type="text"
                        value={formData.defaultTerminalName}
                        onChange={e => setFormData({ ...formData, defaultTerminalName: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">Auto-Lock Inactivity (Minutes)</label>
                      <input
                        type="number"
                        value={formData.autoLockMinutes}
                        onChange={e => setFormData({ ...formData, autoLockMinutes: parseInt(e.target.value) || 15 })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 3: PRINTING & RECEIPTS */}
            {activeSection === 'printing' && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
                  Receipt Templates & Printing
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Receipt Header Text</label>
                    <textarea
                      rows={3}
                      value={formData.receiptHeader}
                      onChange={e => setFormData({ ...formData, receiptHeader: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Receipt Footer Text</label>
                    <textarea
                      rows={3}
                      value={formData.receiptFooter}
                      onChange={e => setFormData({ ...formData, receiptFooter: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 font-mono"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-xs font-medium text-slate-800">Print Merchant Copy on Cards</span>
                      <input
                        type="checkbox"
                        checked={formData.printMerchantCopyCard}
                        onChange={e => setFormData({ ...formData, printMerchantCopyCard: e.target.checked })}
                        className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-xs font-medium text-slate-800">Show Return Barcode on Receipt</span>
                      <input
                        type="checkbox"
                        checked={formData.showBarcodeOnReceipt}
                        onChange={e => setFormData({ ...formData, showBarcodeOnReceipt: e.target.checked })}
                        className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 4: USERS & PERMISSIONS */}
            {activeSection === 'users' && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
                  Role Limits & Granular Approval
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-xs font-bold text-slate-900 block">Cashier Role</span>
                    <span className="text-[11px] text-slate-500 block mb-2">Checkout & scanning only</span>
                    <label className="text-[10px] text-slate-600 uppercase font-semibold block mb-1">Max Discount %</label>
                    <input
                      type="number"
                      value={formData.cashierMaxDiscountPercent}
                      onChange={e => setFormData({ ...formData, cashierMaxDiscountPercent: parseInt(e.target.value) || 0 })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-900"
                    />
                  </div>
                  <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-xl">
                    <span className="text-xs font-bold text-amber-950 block">Manager Role</span>
                    <span className="text-[11px] text-slate-500 block mb-2">Shift & drawer approvals</span>
                    <label className="text-[10px] text-slate-600 uppercase font-semibold block mb-1">Max Discount %</label>
                    <input
                      type="number"
                      value={formData.managerMaxDiscountPercent}
                      onChange={e => setFormData({ ...formData, managerMaxDiscountPercent: parseInt(e.target.value) || 0 })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-900"
                    />
                  </div>
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-xs font-bold text-slate-900 block">Admin Role</span>
                    <span className="text-[11px] text-slate-500 block mb-2">Full store configuration</span>
                    <label className="text-[10px] text-slate-600 uppercase font-semibold block mb-1">Max Discount %</label>
                    <input
                      type="number"
                      value={formData.adminMaxDiscountPercent}
                      disabled
                      className="w-full bg-slate-100 border border-slate-200 rounded-lg p-2 text-xs font-bold text-slate-500"
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-xs font-medium text-slate-800">Require Manager Approval for Refunds</span>
                    <input
                      type="checkbox"
                      checked={formData.requireManagerForRefunds}
                      onChange={e => setFormData({ ...formData, requireManagerForRefunds: e.target.checked })}
                      className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-xs font-medium text-slate-800">Require Manager Approval to Open Drawer (No Sale)</span>
                    <input
                      type="checkbox"
                      checked={formData.requireManagerToOpenDrawerNoSale}
                      onChange={e => setFormData({ ...formData, requireManagerToOpenDrawerNoSale: e.target.checked })}
                      className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 5: PAYMENTS */}
            {activeSection === 'payments' && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
                  Payment Methods & Processing
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Cash Tender</span>
                      <span className="text-[11px] text-slate-500">Bills, coins & change calculation</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.enableCash}
                      onChange={e => setFormData({ ...formData, enableCash: e.target.checked })}
                      className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Credit & Debit Card</span>
                      <span className="text-[11px] text-slate-500">Integrated EMV chip & swipe</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.enableCard}
                      onChange={e => setFormData({ ...formData, enableCard: e.target.checked })}
                      className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Apple Pay & Contactless</span>
                      <span className="text-[11px] text-slate-500">NFC tap-to-pay terminals</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.enableContactless}
                      onChange={e => setFormData({ ...formData, enableContactless: e.target.checked })}
                      className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Split Payments</span>
                      <span className="text-[11px] text-slate-500">Split across cash, cards, and loyalty</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.enableSplit}
                      onChange={e => setFormData({ ...formData, enableSplit: e.target.checked })}
                      className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                    />
                  </div>
                </div>

                {/* PAYMENT FALLBACK & BUSINESS CONTINUITY (PAY-001 TO PAY-028) */}
                <div className="pt-4 border-t border-slate-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center space-x-2">
                        <span>Payment Fallback & Reader Continuity</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          PAY-001 - PAY-028
                        </span>
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Approved fallback processing methods when the customer-facing card terminal experiences hardware or network failure
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowPaymentAuditModal(true)}
                      className="px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-xs font-bold text-slate-700 flex items-center space-x-1.5 transition-colors cursor-pointer"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-amber-600" />
                      <span>View Payment Audit Log (PAY-028)</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Fallback Master Toggle */}
                    <div className="flex items-center justify-between p-3 bg-amber-50/50 rounded-xl border border-amber-200">
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">Enable Payment Fallback System</span>
                        <span className="text-[11px] text-slate-500">Allows secondary card processing modes (PAY-001)</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={formData.paymentFallbackEnabled}
                        onChange={e => setFormData({ ...formData, paymentFallbackEnabled: e.target.checked })}
                        className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                      />
                    </div>

                    {/* Tap to Pay on Store Phone (PAY-006, PAY-007) */}
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">Tap to Pay on Phone</span>
                        <span className="text-[11px] text-slate-500">Authorized store smartphone NFC terminal</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={formData.tapToPayPhoneEnabled}
                        onChange={e => setFormData({ ...formData, tapToPayPhoneEnabled: e.target.checked })}
                        className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                      />
                    </div>

                    {/* Customer Phone QR (PAY-004) */}
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">Customer Phone QR Payment</span>
                        <span className="text-[11px] text-slate-500">Customer scans QR to pay with Apple/Google/Card</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={formData.customerQrPaymentEnabled}
                        onChange={e => setFormData({ ...formData, customerQrPaymentEnabled: e.target.checked })}
                        className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                      />
                    </div>

                    {/* Terminal Auto-Fallback (PAY-014) */}
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">Auto-Switch on Terminal Failure</span>
                        <span className="text-[11px] text-slate-500">Automatically display fallback options upon disconnect</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={formData.terminalAutoFallbackOnFailure}
                        onChange={e => setFormData({ ...formData, terminalAutoFallbackOnFailure: e.target.checked })}
                        className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    {/* Customer Self-Enter Card Permission (PAY-017) */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <label className="text-xs font-bold text-slate-900 block mb-1">
                        Customer Self-Enter Permission (PAY-017)
                      </label>
                      <select
                        value={formData.customerSelfEnterCard}
                        onChange={e => setFormData({ ...formData, customerSelfEnterCard: e.target.value as any })}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
                      >
                        <option value="all_cashiers">Allowed for All Cashiers</option>
                        <option value="manager_required">Manager Approval Required</option>
                        <option value="disabled">Disabled</option>
                      </select>
                    </div>

                    {/* Cashier Manual Keyed Entry Permission (PAY-016) */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <label className="text-xs font-bold text-slate-900 block mb-1">
                        Cashier Manual Card Entry Permission (PAY-016)
                      </label>
                      <select
                        value={formData.cashierManualCardEntry}
                        onChange={e => setFormData({ ...formData, cashierManualCardEntry: e.target.value as any })}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
                      >
                        <option value="manager_required">Manager PIN Approval Required (Default)</option>
                        <option value="all_cashiers">Allowed for All Cashiers</option>
                        <option value="disabled">Strictly Disabled</option>
                      </select>
                    </div>

                    {/* Session Expiry (PAY-010, PAY-022) */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <label className="text-xs font-bold text-slate-900 block mb-1">
                        QR Payment Expiration (Minutes)
                      </label>
                      <input
                        type="number"
                        min="2"
                        max="30"
                        value={formData.paymentSessionExpiryMinutes}
                        onChange={e => setFormData({ ...formData, paymentSessionExpiryMinutes: parseInt(e.target.value) || 10 })}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
                      />
                    </div>

                    {/* Primary Terminal IP Address */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <label className="text-xs font-bold text-slate-900 block mb-1">
                        Primary PAX Terminal IP Address
                      </label>
                      <input
                        type="text"
                        value={formData.paymentTerminalIp}
                        onChange={e => setFormData({ ...formData, paymentTerminalIp: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-800"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 6: INVENTORY */}
            {activeSection === 'inventory' && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
                  Inventory Controls & Stock Thresholds
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Default Low Stock Alert Threshold</label>
                    <input
                      type="number"
                      value={formData.defaultLowStockThreshold}
                      onChange={e => setFormData({ ...formData, defaultLowStockThreshold: parseInt(e.target.value) || 5 })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">AI Shelf Counter Minimum Confidence %</label>
                    <input
                      type="number"
                      value={formData.aiShelfCounterConfidenceCutoff}
                      onChange={e => setFormData({ ...formData, aiShelfCounterConfidenceCutoff: parseInt(e.target.value) || 75 })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 mt-2">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Allow Negative Inventory Selling</span>
                    <span className="text-[11px] text-slate-500">If disabled, items at 0 quantity cannot be sold without manager override</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.allowNegativeInventory}
                    onChange={e => setFormData({ ...formData, allowNegativeInventory: e.target.checked })}
                    className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* SECTION 7: PRODUCTS & PRICING */}
            {activeSection === 'pricing' && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
                  Pricing & Rounding Formulas
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Default Retail Markup %</label>
                    <input
                      type="number"
                      value={formData.defaultMarkupPercent}
                      onChange={e => setFormData({ ...formData, defaultMarkupPercent: parseFloat(e.target.value) || 30 })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Price Ending Format</label>
                    <select
                      value={formData.roundPricesToNearest}
                      onChange={e => setFormData({ ...formData, roundPricesToNearest: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                    >
                      <option value="0.99">End in .99 (e.g. $59.99)</option>
                      <option value="0.49">End in .49 or .99</option>
                      <option value="0.00">Exact whole dollar ($60.00)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 8: CUSTOMERS & LOYALTY */}
            {activeSection === 'customers' && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
                  Customer Loyalty Rewards Program
                </h3>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Enable 377 VIP Loyalty Rewards</span>
                    <span className="text-[11px] text-slate-500">Customers accumulate points with phone number lookup</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.loyaltyProgramEnabled}
                    onChange={e => setFormData({ ...formData, loyaltyProgramEnabled: e.target.checked })}
                    className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Points Earned per $1.00</label>
                    <input
                      type="number"
                      value={formData.loyaltyPointsPerDollar}
                      onChange={e => setFormData({ ...formData, loyaltyPointsPerDollar: parseInt(e.target.value) || 1 })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Points Needed for $1.00 Off</label>
                    <input
                      type="number"
                      value={formData.loyaltyPointsPerDollarDiscount}
                      onChange={e => setFormData({ ...formData, loyaltyPointsPerDollarDiscount: parseInt(e.target.value) || 20 })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">New Member Bonus Points</label>
                    <input
                      type="number"
                      value={formData.loyaltySignupBonusPoints}
                      onChange={e => setFormData({ ...formData, loyaltySignupBonusPoints: parseInt(e.target.value) || 50 })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 9: ONLINE STORE */}
            {activeSection === 'online_store' && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
                  Online Storefront & Pickup Rules
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-xs font-bold text-slate-900">Enable In-Store Curbside Pickup</span>
                    <input
                      type="checkbox"
                      checked={formData.onlineStoreCurbsidePickup}
                      onChange={e => setFormData({ ...formData, onlineStoreCurbsidePickup: e.target.checked })}
                      className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-xs font-bold text-slate-900">Enable Local Granbury Delivery</span>
                    <input
                      type="checkbox"
                      checked={formData.onlineStoreDeliveryEnabled}
                      onChange={e => setFormData({ ...formData, onlineStoreDeliveryEnabled: e.target.checked })}
                      className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">Minimum Delivery Order ($)</label>
                      <input
                        type="number"
                        value={formData.onlineDeliveryMinOrder}
                        onChange={e => setFormData({ ...formData, onlineDeliveryMinOrder: parseFloat(e.target.value) || 35 })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">Delivery Radius (Miles)</label>
                      <input
                        type="number"
                        value={formData.onlineDeliveryRadiusMiles}
                        onChange={e => setFormData({ ...formData, onlineDeliveryRadiusMiles: parseInt(e.target.value) || 15 })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 10: CHECK CASHING */}
            {activeSection === 'check_cashing' && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
                  Check Cashing Fee Schedule & Limits
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Payroll Check Fee %</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.payrollCheckFeePercent}
                      onChange={e => setFormData({ ...formData, payrollCheckFeePercent: parseFloat(e.target.value) || 1.5 })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Government Check Fee %</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.governmentCheckFeePercent}
                      onChange={e => setFormData({ ...formData, governmentCheckFeePercent: parseFloat(e.target.value) || 1.0 })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Personal Check Fee %</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.personalCheckFeePercent}
                      onChange={e => setFormData({ ...formData, personalCheckFeePercent: parseFloat(e.target.value) || 3.0 })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Minimum Fee ($)</label>
                    <input
                      type="number"
                      value={formData.minCheckFee}
                      onChange={e => setFormData({ ...formData, minCheckFee: parseFloat(e.target.value) || 3.0 })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Maximum Fee ($)</label>
                    <input
                      type="number"
                      value={formData.maxCheckFee}
                      onChange={e => setFormData({ ...formData, maxCheckFee: parseFloat(e.target.value) || 35.0 })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Manager Approval Above ($)</label>
                    <input
                      type="number"
                      value={formData.requireManagerCheckApprovalAbove}
                      onChange={e => setFormData({ ...formData, requireManagerCheckApprovalAbove: parseFloat(e.target.value) || 1000 })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 11: SHIFTS & CASH DRAWER */}
            {activeSection === 'shifts' && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
                  Cash Drawer & Shift Controls
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Default Morning Starting Bank ($)</label>
                    <input
                      type="number"
                      value={formData.startingBankAmount}
                      onChange={e => setFormData({ ...formData, startingBankAmount: parseFloat(e.target.value) || 200 })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Cash Drop Alert Threshold ($)</label>
                    <input
                      type="number"
                      value={formData.maxCashDrawerThreshold}
                      onChange={e => setFormData({ ...formData, maxCashDrawerThreshold: parseFloat(e.target.value) || 1500 })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Enforce Blind Closeout</span>
                    <span className="text-[11px] text-slate-500">Cashiers count cash blindly without seeing expected system balance first</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.blindCloseout}
                    onChange={e => setFormData({ ...formData, blindCloseout: e.target.checked })}
                    className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* SECTION 12: DEVICES */}
            {activeSection === 'devices' && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
                  POS Hardware & Peripherals
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Primary Receipt Printer</label>
                    <input
                      type="text"
                      value={formData.activePrinterModel}
                      onChange={e => setFormData({ ...formData, activePrinterModel: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Barcode Scanner Interface Mode</label>
                    <input
                      type="text"
                      value={formData.barcodeScannerMode}
                      onChange={e => setFormData({ ...formData, barcodeScannerMode: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 13: NOTIFICATIONS */}
            {activeSection === 'notifications' && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
                  Operational Alerts & Dispatch
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-xs font-bold text-slate-900">Email Manager on Low Stock Items</span>
                    <input
                      type="checkbox"
                      checked={formData.alertLowStockEmail}
                      onChange={e => setFormData({ ...formData, alertLowStockEmail: e.target.checked })}
                      className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-xs font-bold text-slate-900">Banner Alert When Drawer Exceeds $1,500</span>
                    <input
                      type="checkbox"
                      checked={formData.alertCashDropDrawerThreshold}
                      onChange={e => setFormData({ ...formData, alertCashDropDrawerThreshold: e.target.checked })}
                      className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 14: SECURITY */}
            {activeSection === 'security' && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
                  PIN Rules & Authentication
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-xs font-bold text-slate-900">Require Manager PIN for Order Voids</span>
                    <input
                      type="checkbox"
                      checked={formData.requireManagerPinForVoid}
                      onChange={e => setFormData({ ...formData, requireManagerPinForVoid: e.target.checked })}
                      className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">Max Failed PIN Attempts</label>
                      <input
                        type="number"
                        value={formData.pinLockoutAttempts}
                        onChange={e => setFormData({ ...formData, pinLockoutAttempts: parseInt(e.target.value) || 5 })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">Session Inactivity Lock (Seconds)</label>
                      <input
                        type="number"
                        value={formData.sessionTimeoutInactivity}
                        onChange={e => setFormData({ ...formData, sessionTimeoutInactivity: parseInt(e.target.value) || 30 })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 15: TAXES & COMPLIANCE */}
            {activeSection === 'taxes' && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
                  Texas Sales Tax & TABC Compliance
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Default Sales Tax Rate</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        step="0.0001"
                        value={formData.defaultTaxRate}
                        onChange={e => setFormData({ ...formData, defaultTaxRate: parseFloat(e.target.value) || 0.0825 })}
                        className="w-48 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 font-mono"
                      />
                      <span className="text-xs text-slate-500 font-semibold">
                        (= {(formData.defaultTaxRate * 100).toFixed(2)}% Hood County & Granbury City rate)
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">TABC Alcohol Sales Log Recording</span>
                      <span className="text-[11px] text-slate-500">Record cashier initials, transaction timestamps, and age verified flag</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.tabcReportingEnabled}
                      onChange={e => setFormData({ ...formData, tabcReportingEnabled: e.target.checked })}
                      className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 16: INTEGRATIONS */}
            {activeSection === 'integrations' && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
                  Accounting & External Sync
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">QuickBooks Online Daily Export</span>
                      <span className="text-[11px] text-slate-500">Auto-sync daily sales, taxes, cost of goods, and drawer payouts</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.quickBooksSyncEnabled}
                      onChange={e => setFormData({ ...formData, quickBooksSyncEnabled: e.target.checked })}
                      className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">State Liquor Reporting Exporter</span>
                      <span className="text-[11px] text-slate-500">Export distributor wholesale invoice logs for state reporting</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.stateLiquorReportExport}
                      onChange={e => setFormData({ ...formData, stateLiquorReportExport: e.target.checked })}
                      className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 17: BACKUP & SYNC */}
            {activeSection === 'backup' && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
                  Cloud Replication & Offline Storage
                </h3>
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <div>
                      <span className="text-xs font-bold text-emerald-950 block">Database Sync Status</span>
                      <span className="text-[11px] text-emerald-800">{formData.cloudSyncStatus}</span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                    Live
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Offline Cache Capacity (Transactions)</label>
                    <input
                      type="number"
                      value={formData.offlineTransactionCacheLimit}
                      onChange={e => setFormData({ ...formData, offlineTransactionCacheLimit: parseInt(e.target.value) || 500 })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Daily Automated Snapshot Hour</label>
                    <input
                      type="text"
                      value="03:00 AM CST (Nightly)"
                      disabled
                      className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 18: AUDIT & SYSTEM */}
            {activeSection === 'audit' && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
                  System Diagnostics & Version Telemetry
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">POS Version</span>
                    <span className="text-sm font-bold text-slate-900 mt-1 block">v1.0.0 (Granbury)</span>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">Environment</span>
                    <span className="text-sm font-bold text-slate-900 mt-1 block">Cloud Run Linux</span>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">Active User</span>
                    <span className="text-sm font-bold text-slate-900 mt-1 block">
                      {currentUser?.name || 'Elena Rostova'}
                    </span>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">Network Status</span>
                    <span className="text-sm font-bold text-emerald-600 mt-1 block flex items-center justify-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                      100% Operational
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Form Actions */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  playBeep('click');
                  if (onClose) onClose();
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Close Settings
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center space-x-1.5 px-6 py-2 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow transition-colors cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Synchronizing...' : 'Save & Apply Changes'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {showPaymentAuditModal && (
        <PaymentAuditModal
          isOpen={showPaymentAuditModal}
          onClose={() => setShowPaymentAuditModal(false)}
        />
      )}
    </div>
  );
};
