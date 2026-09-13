import React, { useState, useEffect } from 'react';
import { StoreSettings } from '../types';
import { api } from '../utils/api';
import { playBeep } from '../utils/audio';
import { HardwareSettings } from './HardwareSettings';
import { PromotionsSettings } from './PromotionsSettings';
import {
  Settings,
  Store,
  Percent,
  CreditCard,
  Receipt,
  Save,
  ShieldCheck,
  Volume2,
  CheckCircle2,
  Award,
  Sparkles,
  Gift,
  TrendingUp,
  HelpCircle,
  Cpu,
  Tag,
} from 'lucide-react';

interface SettingsViewProps {
  settings: StoreSettings | null;
  onRefresh: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ settings, onRefresh }) => {
  const [activeSection, setActiveSection] = useState<'store' | 'promotions' | 'hardware'>('store');
  const [formData, setFormData] = useState<StoreSettings>(
    settings || {
      storeName: '377 Spirits',
      tagline: 'Fine Liquors, Craft Spirits, Wine & Beer',
      address: 'Granbury, TX 76049',
      city: 'Granbury',
      state: 'TX',
      zip: '76049',
      cityStateZip: 'Granbury, TX 76049',
      phone: '(817) 555-0377',
      email: 'info@377spirits.com',
      taxId: 'TX-76-3770149',
      currency: 'USD',
      defaultTaxRate: 0.0825,
      receiptHeader: '377 Spirits\nGranbury, TX 76049',
      receiptFooter: 'Thank you for shopping with us! Please drink responsibly.',
      requireManagerDiscountAbove: 20,
      enableCash: true,
      enableCard: true,
      enableContactless: true,
      enableSplit: true,
      scannerSound: true,
      loyaltyProgramEnabled: true,
      loyaltyPointsPerDollar: 1,
      loyaltyPointsPerDollarDiscount: 20,
      loyaltyMinPointsToRedeem: 50,
      loyaltyMaxDiscountPercent: 50,
      loyaltySignupBonusPoints: 50,
    }
  );

  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Sync when props change
  useEffect(() => {
    if (settings) {
      setFormData(prev => ({
        ...prev,
        ...settings,
        city: settings.city || 'Granbury',
        state: settings.state || 'TX',
        zip: settings.zip || '76049',
        cityStateZip: settings.cityStateZip || 'Granbury, TX 76049',
        loyaltyProgramEnabled: settings.loyaltyProgramEnabled !== undefined ? settings.loyaltyProgramEnabled : true,
        loyaltyPointsPerDollar: settings.loyaltyPointsPerDollar ?? 1,
        loyaltyPointsPerDollarDiscount: settings.loyaltyPointsPerDollarDiscount ?? 20,
        loyaltyMinPointsToRedeem: settings.loyaltyMinPointsToRedeem ?? 50,
        loyaltyMaxDiscountPercent: settings.loyaltyMaxDiscountPercent ?? 50,
        loyaltySignupBonusPoints: settings.loyaltySignupBonusPoints ?? 50,
      }));
    }
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.updateSettings(formData);
      playBeep('success');
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
      onRefresh();
    } catch (err: any) {
      playBeep('error');
      alert(err.message || 'Failed to save store configuration');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-84px)] overflow-y-auto bg-[#0A0A0A] text-[#E5E5E5] p-4 md:p-6 select-none">
      <div className="max-w-4xl mx-auto w-full space-y-6">
        {/* Top Section Nav Tabs */}
        <div className="flex items-center space-x-2 border-b border-[#262626] pb-3">
          <button
            type="button"
            onClick={() => {
              playBeep('click');
              setActiveSection('store');
            }}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
              activeSection === 'store'
                ? 'bg-[#C5A059] text-black shadow-sm'
                : 'bg-[#141414] text-[#A3A3A3] hover:text-[#E5E5E5] border border-[#262626]'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>Store & Configuration</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playBeep('click');
              setActiveSection('promotions');
            }}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
              activeSection === 'promotions'
                ? 'bg-[#C5A059] text-black shadow-sm'
                : 'bg-[#141414] text-[#A3A3A3] hover:text-[#E5E5E5] border border-[#262626]'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Promotions & Coupons</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playBeep('click');
              setActiveSection('hardware');
            }}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
              activeSection === 'hardware'
                ? 'bg-[#C5A059] text-black shadow-sm'
                : 'bg-[#141414] text-[#A3A3A3] hover:text-[#E5E5E5] border border-[#262626]'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Hardware & Peripherals</span>
          </button>
        </div>

        {activeSection === 'promotions' && <PromotionsSettings />}
        {activeSection === 'hardware' && <HardwareSettings />}

        {activeSection === 'store' && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title & Save Bar */}
            <div className="flex items-center justify-between bg-[#0D0D0D] p-4 rounded-xl border border-[#262626]">
              <div>
                <h2 className="text-xl font-serif italic font-bold text-[#F5F5F5] flex items-center space-x-2">
                  <Settings className="w-5 h-5 text-[#C5A059]" />
                  <span>Store Configuration & Terminal Settings</span>
                </h2>
                <p className="text-xs text-[#737373] mt-0.5 font-sans">
                  Manage enterprise store parameters, tax rates, receipt formatting, and safety thresholds
                </p>
              </div>

              <div className="flex items-center space-x-3">
                {savedSuccess && (
                  <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider flex items-center space-x-1 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Saved successfully!</span>
                  </span>
                )}
                <button
                  id="settings-save-btn"
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-[#C5A059] hover:bg-[#D4B06A] text-black text-xs font-bold uppercase tracking-wider transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </div>

        {/* Store Profile Section (ST-01) */}
        <div className="bg-[#0D0D0D] rounded-xl border border-[#262626] p-5 space-y-4">
          <h3 className="font-serif italic font-bold text-base text-[#F5F5F5] flex items-center space-x-2 border-b border-[#262626] pb-2">
            <Store className="w-4 h-4 text-[#C5A059]" />
            <span>Store Profile & Invoicing Information</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-[#A3A3A3] font-bold uppercase tracking-wider mb-1.5">Store Name *</label>
              <input
                type="text"
                required
                value={formData.storeName}
                onChange={e => setFormData({ ...formData, storeName: e.target.value })}
                className="w-full bg-[#141414] border border-[#262626] rounded-lg p-2 text-[#E5E5E5] font-medium focus:outline-hidden focus:border-[#C5A059]"
              />
            </div>

            <div>
              <label className="block text-[#A3A3A3] font-bold uppercase tracking-wider mb-1.5">Tagline</label>
              <input
                type="text"
                value={formData.tagline}
                onChange={e => setFormData({ ...formData, tagline: e.target.value })}
                className="w-full bg-[#141414] border border-[#262626] rounded-lg p-2 text-[#E5E5E5] focus:outline-hidden focus:border-[#C5A059]"
              />
            </div>

            <div>
              <label className="block text-[#A3A3A3] font-bold uppercase tracking-wider mb-1.5">Physical Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
                placeholder="e.g. Granbury, TX 76049"
                className="w-full bg-[#141414] border border-[#262626] rounded-lg p-2 text-[#E5E5E5] focus:outline-hidden focus:border-[#C5A059]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[#A3A3A3] font-bold uppercase tracking-wider mb-1.5">City</label>
                <input
                  type="text"
                  value={formData.city || ''}
                  onChange={e => {
                    const newCity = e.target.value;
                    const combined = `${newCity}, ${formData.state || ''} ${formData.zip || ''}`.trim();
                    setFormData({ ...formData, city: newCity, cityStateZip: combined });
                  }}
                  placeholder="Granbury"
                  className="w-full bg-[#141414] border border-[#262626] rounded-lg p-2 text-[#E5E5E5] focus:outline-hidden focus:border-[#C5A059]"
                />
              </div>

              <div>
                <label className="block text-[#A3A3A3] font-bold uppercase tracking-wider mb-1.5">State</label>
                <input
                  type="text"
                  value={formData.state || ''}
                  onChange={e => {
                    const newState = e.target.value.toUpperCase();
                    const combined = `${formData.city || ''}, ${newState} ${formData.zip || ''}`.trim();
                    setFormData({ ...formData, state: newState, cityStateZip: combined });
                  }}
                  placeholder="TX"
                  maxLength={2}
                  className="w-full bg-[#141414] border border-[#262626] rounded-lg p-2 text-[#E5E5E5] uppercase font-mono focus:outline-hidden focus:border-[#C5A059]"
                />
              </div>

              <div>
                <label className="block text-[#A3A3A3] font-bold uppercase tracking-wider mb-1.5">ZIP Code</label>
                <input
                  type="text"
                  value={formData.zip || ''}
                  onChange={e => {
                    const newZip = e.target.value;
                    const combined = `${formData.city || ''}, ${formData.state || ''} ${newZip}`.trim();
                    setFormData({ ...formData, zip: newZip, cityStateZip: combined });
                  }}
                  placeholder="76049"
                  maxLength={10}
                  className="w-full bg-[#141414] border border-[#262626] rounded-lg p-2 text-[#E5E5E5] font-mono focus:outline-hidden focus:border-[#C5A059]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[#A3A3A3] font-bold uppercase tracking-wider mb-1.5">City, State, Zip (Display Line)</label>
              <input
                type="text"
                value={formData.cityStateZip}
                onChange={e => setFormData({ ...formData, cityStateZip: e.target.value })}
                className="w-full bg-[#141414] border border-[#262626] rounded-lg p-2 text-[#E5E5E5] focus:outline-hidden focus:border-[#C5A059]"
              />
            </div>

            <div>
              <label className="block text-[#A3A3A3] font-bold uppercase tracking-wider mb-1.5">Store Telephone</label>
              <input
                type="text"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                className="w-full bg-[#141414] border border-[#262626] rounded-lg p-2 text-[#E5E5E5] font-mono focus:outline-hidden focus:border-[#C5A059]"
              />
            </div>

            <div>
              <label className="block text-[#A3A3A3] font-bold uppercase tracking-wider mb-1.5">State Tax ID / EIN</label>
              <input
                type="text"
                value={formData.taxId}
                onChange={e => setFormData({ ...formData, taxId: e.target.value })}
                className="w-full bg-[#141414] border border-[#262626] rounded-lg p-2 text-[#E5E5E5] font-mono focus:outline-hidden focus:border-[#C5A059]"
              />
            </div>
          </div>
        </div>

        {/* Taxes & Safety Thresholds (ST-02 & CA-04) */}
        <div className="bg-[#0D0D0D] rounded-xl border border-[#262626] p-5 space-y-4">
          <h3 className="font-serif italic font-bold text-base text-[#F5F5F5] flex items-center space-x-2 border-b border-[#262626] pb-2">
            <Percent className="w-4 h-4 text-[#C5A059]" />
            <span>Taxation & Security Thresholds</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-[#A3A3A3] font-bold uppercase tracking-wider mb-1.5">
                Default Sales Tax Rate (e.g. 0.0825 for 8.25%)
              </label>
              <input
                type="number"
                step="0.0001"
                min="0"
                max="1"
                value={formData.defaultTaxRate}
                onChange={e => setFormData({ ...formData, defaultTaxRate: parseFloat(e.target.value) || 0 })}
                className="w-full bg-[#141414] border border-[#262626] rounded-lg p-2 text-[#E5E5E5] font-mono focus:outline-hidden focus:border-[#C5A059]"
              />
              <span className="text-[11px] text-[#737373] mt-1 block font-mono">
                Current: {(formData.defaultTaxRate * 100).toFixed(2)}%
              </span>
            </div>

            <div>
              <label className="block text-[#A3A3A3] font-bold uppercase tracking-wider mb-1.5">
                Require Manager PIN for Discounts Above (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.requireManagerDiscountAbove}
                onChange={e => setFormData({ ...formData, requireManagerDiscountAbove: parseInt(e.target.value, 10) || 0 })}
                className="w-full bg-[#141414] border border-[#262626] rounded-lg p-2 text-[#E5E5E5] font-mono focus:outline-hidden focus:border-[#C5A059]"
              />
              <span className="text-[11px] text-[#737373] mt-1 block">
                Protects inventory margins against cashier discount abuse.
              </span>
            </div>
          </div>
        </div>

        {/* Customer Loyalty Program Configuration */}
        <div id="loyalty-settings-card" className="bg-[#0D0D0D] rounded-xl border border-[#262626] p-5 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#262626] pb-3 gap-2">
            <h3 className="font-serif italic font-bold text-base text-[#F5F5F5] flex items-center space-x-2">
              <Award className="w-4 h-4 text-[#C5A059]" />
              <span>Customer Loyalty Program & Rewards Engine</span>
            </h3>
            <label className="flex items-center space-x-2.5 cursor-pointer bg-[#141414] px-3 py-1.5 rounded-lg border border-[#262626] hover:border-[#C5A059]/50 transition-colors">
              <input
                id="loyalty-program-toggle"
                type="checkbox"
                checked={formData.loyaltyProgramEnabled ?? true}
                onChange={e => setFormData({ ...formData, loyaltyProgramEnabled: e.target.checked })}
                className="rounded bg-[#0A0A0A] border-[#262626] text-[#C5A059] focus:ring-[#C5A059]"
              />
              <span className={`text-xs font-bold uppercase tracking-wider ${formData.loyaltyProgramEnabled ?? true ? 'text-[#C5A059]' : 'text-[#737373]'}`}>
                {formData.loyaltyProgramEnabled ?? true ? 'Program Active' : 'Program Paused'}
              </span>
            </label>
          </div>

          <p className="text-xs text-[#737373]">
            Configure point accumulation formulas, redemption rates for checkout discounts, thresholds, and member bonuses.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Points Earned Per Dollar */}
            <div className="bg-[#141414] p-3.5 rounded-lg border border-[#262626] space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[#A3A3A3] font-bold uppercase tracking-wider flex items-center space-x-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-[#C5A059]" />
                  <span>Points Earned per $1.00 Spent</span>
                </label>
                <span className="text-[11px] font-mono text-[#C5A059] bg-[#C5A059]/10 px-2 py-0.5 rounded">
                  {formData.loyaltyPointsPerDollar ?? 1} pt / $1.00
                </span>
              </div>
              <input
                id="loyalty-points-per-dollar"
                type="number"
                min="0.1"
                step="0.5"
                max="50"
                required
                value={formData.loyaltyPointsPerDollar ?? 1}
                onChange={e => setFormData({ ...formData, loyaltyPointsPerDollar: parseFloat(e.target.value) || 1 })}
                className="w-full bg-[#0A0A0A] border border-[#262626] rounded-lg p-2 text-[#E5E5E5] font-mono focus:outline-hidden focus:border-[#C5A059]"
              />
              <span className="text-[11px] text-[#737373] block">
                Number of points credited to customer per dollar spent on completed orders.
              </span>
            </div>

            {/* Points Required Per Dollar Discount */}
            <div className="bg-[#141414] p-3.5 rounded-lg border border-[#262626] space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[#A3A3A3] font-bold uppercase tracking-wider flex items-center space-x-1.5">
                  <Percent className="w-3.5 h-3.5 text-[#C5A059]" />
                  <span>Redemption: Points per $1.00 Discount</span>
                </label>
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                  {formData.loyaltyPointsPerDollarDiscount ?? 20} pts = $1.00
                </span>
              </div>
              <input
                id="loyalty-points-per-discount"
                type="number"
                min="1"
                step="1"
                max="500"
                required
                value={formData.loyaltyPointsPerDollarDiscount ?? 20}
                onChange={e => setFormData({ ...formData, loyaltyPointsPerDollarDiscount: parseInt(e.target.value, 10) || 20 })}
                className="w-full bg-[#0A0A0A] border border-[#262626] rounded-lg p-2 text-[#E5E5E5] font-mono focus:outline-hidden focus:border-[#C5A059]"
              />
              <span className="text-[11px] text-[#737373] block">
                Point exchange value. E.g. 20 pts = $1.00 off (1 point = ${(1 / (formData.loyaltyPointsPerDollarDiscount || 20)).toFixed(3)} credit).
              </span>
            </div>

            {/* Minimum Points to Redeem */}
            <div className="bg-[#141414] p-3.5 rounded-lg border border-[#262626] space-y-2">
              <label className="block text-[#A3A3A3] font-bold uppercase tracking-wider">
                Minimum Points Required to Redeem
              </label>
              <input
                id="loyalty-min-points"
                type="number"
                min="0"
                step="10"
                value={formData.loyaltyMinPointsToRedeem ?? 50}
                onChange={e => setFormData({ ...formData, loyaltyMinPointsToRedeem: parseInt(e.target.value, 10) || 0 })}
                className="w-full bg-[#0A0A0A] border border-[#262626] rounded-lg p-2 text-[#E5E5E5] font-mono focus:outline-hidden focus:border-[#C5A059]"
              />
              <span className="text-[11px] text-[#737373] block">
                Threshold before points can be applied for checkout discounts (e.g. 50 points = ${(50 / (formData.loyaltyPointsPerDollarDiscount || 20)).toFixed(2)} min discount).
              </span>
            </div>

            {/* Maximum Discount Percentage via Points */}
            <div className="bg-[#141414] p-3.5 rounded-lg border border-[#262626] space-y-2">
              <label className="block text-[#A3A3A3] font-bold uppercase tracking-wider">
                Max Order Discount via Points (%)
              </label>
              <input
                id="loyalty-max-discount"
                type="number"
                min="1"
                max="100"
                value={formData.loyaltyMaxDiscountPercent ?? 50}
                onChange={e => setFormData({ ...formData, loyaltyMaxDiscountPercent: parseInt(e.target.value, 10) || 50 })}
                className="w-full bg-[#0A0A0A] border border-[#262626] rounded-lg p-2 text-[#E5E5E5] font-mono focus:outline-hidden focus:border-[#C5A059]"
              />
              <span className="text-[11px] text-[#737373] block">
                Cap on order subtotal percentage payable with points (e.g. 50% ensures 50% cash/card revenue).
              </span>
            </div>

            {/* Welcome Bonus Points */}
            <div className="bg-[#141414] p-3.5 rounded-lg border border-[#262626] space-y-2 md:col-span-2">
              <div className="flex items-center justify-between">
                <label className="text-[#A3A3A3] font-bold uppercase tracking-wider flex items-center space-x-1.5">
                  <Gift className="w-3.5 h-3.5 text-[#C5A059]" />
                  <span>New Customer Enrollment Welcome Bonus (Points)</span>
                </label>
                <span className="text-[11px] font-mono text-[#C5A059]">
                  Instant Value: ${( (formData.loyaltySignupBonusPoints ?? 50) / (formData.loyaltyPointsPerDollarDiscount || 20) ).toFixed(2)}
                </span>
              </div>
              <input
                id="loyalty-signup-bonus"
                type="number"
                min="0"
                step="10"
                value={formData.loyaltySignupBonusPoints ?? 50}
                onChange={e => setFormData({ ...formData, loyaltySignupBonusPoints: parseInt(e.target.value, 10) || 0 })}
                className="w-full bg-[#0A0A0A] border border-[#262626] rounded-lg p-2 text-[#E5E5E5] font-mono focus:outline-hidden focus:border-[#C5A059]"
              />
              <span className="text-[11px] text-[#737373] block">
                Bonus points automatically awarded to new customers upon creating their account.
              </span>
            </div>
          </div>

          {/* Real-Time Program Economics Simulator */}
          <div className="bg-[#0A0A0A] p-4 rounded-xl border border-[#262626]/80">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#C5A059] flex items-center space-x-2 mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Program Economics & Tier Simulation</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-[#141414] p-2.5 rounded-lg border border-[#262626]">
                <div className="text-[10px] text-[#737373] uppercase font-bold">$100 Purchase</div>
                <div className="text-base font-bold font-mono text-[#E5E5E5] mt-0.5">
                  +{Math.floor(100 * (formData.loyaltyPointsPerDollar || 1))} pts
                </div>
                <div className="text-[10px] text-[#A3A3A3] mt-0.5">Accrued automatically</div>
              </div>

              <div className="bg-[#141414] p-2.5 rounded-lg border border-[#262626]">
                <div className="text-[10px] text-[#737373] uppercase font-bold">100 Points Value</div>
                <div className="text-base font-bold font-mono text-emerald-400 mt-0.5">
                  ${(100 / (formData.loyaltyPointsPerDollarDiscount || 20)).toFixed(2)} Off
                </div>
                <div className="text-[10px] text-[#A3A3A3] mt-0.5">At checkout register</div>
              </div>

              <div className="bg-[#141414] p-2.5 rounded-lg border border-[#262626]">
                <div className="text-[10px] text-[#737373] uppercase font-bold">500 Points Value</div>
                <div className="text-base font-bold font-mono text-emerald-400 mt-0.5">
                  ${(500 / (formData.loyaltyPointsPerDollarDiscount || 20)).toFixed(2)} Off
                </div>
                <div className="text-[10px] text-[#A3A3A3] mt-0.5">Gold tier threshold</div>
              </div>

              <div className="bg-[#141414] p-2.5 rounded-lg border border-[#262626]">
                <div className="text-[10px] text-[#737373] uppercase font-bold">1,000 Points Value</div>
                <div className="text-base font-bold font-mono text-emerald-400 mt-0.5">
                  ${(1000 / (formData.loyaltyPointsPerDollarDiscount || 20)).toFixed(2)} Off
                </div>
                <div className="text-[10px] text-[#A3A3A3] mt-0.5">Platinum VIP threshold</div>
              </div>
            </div>
          </div>
        </div>

        {/* Enabled Payment Methods (ST-03) */}
        <div className="bg-[#0D0D0D] rounded-xl border border-[#262626] p-5 space-y-4">
          <h3 className="font-serif italic font-bold text-base text-[#F5F5F5] flex items-center space-x-2 border-b border-[#262626] pb-2">
            <CreditCard className="w-4 h-4 text-[#C5A059]" />
            <span>Payment Methods Active on Register</span>
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <label className="flex items-center space-x-2.5 bg-[#141414] p-3 rounded-lg border border-[#262626] cursor-pointer hover:border-[#C5A059]/40 transition-colors">
              <input
                type="checkbox"
                checked={formData.enableCash}
                onChange={e => setFormData({ ...formData, enableCash: e.target.checked })}
                className="rounded bg-[#0A0A0A] border-[#262626] text-[#C5A059] focus:ring-[#C5A059]"
              />
              <span className="font-bold text-xs uppercase tracking-wider text-[#E5E5E5]">Cash</span>
            </label>

            <label className="flex items-center space-x-2.5 bg-[#141414] p-3 rounded-lg border border-[#262626] cursor-pointer hover:border-[#C5A059]/40 transition-colors">
              <input
                type="checkbox"
                checked={formData.enableCard}
                onChange={e => setFormData({ ...formData, enableCard: e.target.checked })}
                className="rounded bg-[#0A0A0A] border-[#262626] text-[#C5A059] focus:ring-[#C5A059]"
              />
              <span className="font-bold text-xs uppercase tracking-wider text-[#E5E5E5]">Credit / Debit</span>
            </label>

            <label className="flex items-center space-x-2.5 bg-[#141414] p-3 rounded-lg border border-[#262626] cursor-pointer hover:border-[#C5A059]/40 transition-colors">
              <input
                type="checkbox"
                checked={formData.enableContactless}
                onChange={e => setFormData({ ...formData, enableContactless: e.target.checked })}
                className="rounded bg-[#0A0A0A] border-[#262626] text-[#C5A059] focus:ring-[#C5A059]"
              />
              <span className="font-bold text-xs uppercase tracking-wider text-[#E5E5E5]">Apple / Google</span>
            </label>

            <label className="flex items-center space-x-2.5 bg-[#141414] p-3 rounded-lg border border-[#262626] cursor-pointer hover:border-[#C5A059]/40 transition-colors">
              <input
                type="checkbox"
                checked={formData.enableSplit}
                onChange={e => setFormData({ ...formData, enableSplit: e.target.checked })}
                className="rounded bg-[#0A0A0A] border-[#262626] text-[#C5A059] focus:ring-[#C5A059]"
              />
              <span className="font-bold text-xs uppercase tracking-wider text-[#E5E5E5]">Split Tender</span>
            </label>
          </div>
        </div>

        {/* Receipt Customization (ST-04) & Hardware Audio */}
        <div className="bg-[#0D0D0D] rounded-xl border border-[#262626] p-5 space-y-4">
          <h3 className="font-serif italic font-bold text-base text-[#F5F5F5] flex items-center space-x-2 border-b border-[#262626] pb-2">
            <Receipt className="w-4 h-4 text-[#C5A059]" />
            <span>Thermal Receipt Customization & Audio</span>
          </h3>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-[#A3A3A3] font-bold uppercase tracking-wider mb-1.5">Receipt Footer Message / Return Policy</label>
              <textarea
                rows={2}
                value={formData.receiptFooter}
                onChange={e => setFormData({ ...formData, receiptFooter: e.target.value })}
                className="w-full bg-[#141414] border border-[#262626] rounded-lg p-2.5 text-[#E5E5E5] font-mono focus:outline-hidden focus:border-[#C5A059]"
              />
            </div>

            <div className="pt-2">
              <label className="flex items-center space-x-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.scannerSound}
                  onChange={e => setFormData({ ...formData, scannerSound: e.target.checked })}
                  className="rounded bg-[#141414] border-[#262626] text-[#C5A059] focus:ring-[#C5A059]"
                />
                <span className="font-medium text-[#D4D4D4] flex items-center space-x-1.5">
                  <Volume2 className="w-4 h-4 text-[#C5A059]" />
                  <span>Enable tactile sound effects for barcode beeps and cashier registers</span>
                </span>
              </label>
            </div>
          </div>
        </div>
      </form>
    )}
    </div>
  </div>
  );
};
