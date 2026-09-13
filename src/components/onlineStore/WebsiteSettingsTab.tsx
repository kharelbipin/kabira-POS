import React, { useState } from 'react';
import {
  Globe,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  ShieldCheck,
  RotateCcw,
  Upload,
  Clock,
  Truck,
  ShoppingBag,
  Sparkles,
  Save,
  Radio,
  FileCheck,
} from 'lucide-react';
import { OnlineStoreConfig } from '../../types';
import { api } from '../../utils/api';
import { playBeep } from '../../utils/audio';

interface WebsiteSettingsTabProps {
  config: OnlineStoreConfig;
  canRollback: boolean;
  onConfigUpdated: (updated: OnlineStoreConfig) => void;
  onPreviewStorefront: () => void;
}

export const WebsiteSettingsTab: React.FC<WebsiteSettingsTabProps> = ({
  config,
  canRollback,
  onConfigUpdated,
  onPreviewStorefront,
}) => {
  const [formData, setFormData] = useState<OnlineStoreConfig>({ ...config });
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const res = await api.updateOnlineStoreConfig(formData);
      onConfigUpdated(res.config);
      setMessage({ type: 'success', text: 'Website configuration saved successfully!' });
      playBeep('success');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to save configuration.' });
      playBeep('error');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    setMessage(null);

    try {
      const res = await api.publishOnlineStore();
      onConfigUpdated(res.config);
      setFormData(res.config);
      setMessage({ type: 'success', text: `Website published live! Accessible at https://${res.config.subdomain}` });
      playBeep('success');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to publish store.' });
      playBeep('error');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleRollback = async () => {
    if (!confirm('Are you sure you want to rollback to the previous published version?')) return;

    setIsRollingBack(true);
    setMessage(null);

    try {
      const res = await api.rollbackOnlineStore();
      onConfigUpdated(res.config);
      setFormData(res.config);
      setMessage({ type: 'success', text: 'Storefront rolled back to previous version.' });
      playBeep('success');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to rollback.' });
      playBeep('error');
    } finally {
      setIsRollingBack(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'live':
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-800/50 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>LIVE & HOSTED</span>
          </span>
        );
      case 'publishing':
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-950/60 text-amber-400 border border-amber-800/50 shadow-xs">
            <RefreshCw className="w-3 h-3 animate-spin" />
            <span>PUBLISHING...</span>
          </span>
        );
      case 'draft':
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#262626] text-[#CCCCCC] border border-[#3A3A3A]">
            <FileCheck className="w-3 h-3" />
            <span>DRAFT (STAGING)</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-950/60 text-rose-400 border border-rose-800/50">
            <Radio className="w-3 h-3" />
            <span>OFFLINE</span>
          </span>
        );
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 animate-in fade-in duration-200">
      {/* Top Notification */}
      {message && (
        <div
          className={`flex items-center justify-between p-4 rounded-xl text-xs font-medium ${
            message.type === 'success'
              ? 'bg-emerald-950/50 border border-emerald-800/50 text-emerald-200'
              : 'bg-red-950/50 border border-red-800/50 text-red-200'
          }`}
        >
          <div className="flex items-center space-x-2">
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="text-xs text-white/60 hover:text-white underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Website Status & Quick Publish Bar (WEB-001, WEB-002, WEB-003, WEB-004) */}
      <div className="bg-[#141414] border border-[#262626] rounded-2xl p-5 shadow-lg flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <h3 className="text-base font-bold text-white tracking-wide">
              Website Status & Domain Hosting
            </h3>
            {getStatusBadge(formData.websiteStatus)}
            {formData.hasSsl && (
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-950/60 text-blue-400 border border-blue-800/40">
                <ShieldCheck className="w-3 h-3" />
                <span>HTTPS / SSL Active</span>
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-[#888888]">
            <div className="flex items-center space-x-1">
              <span>Automatic Subdomain:</span>
              <a
                href={`https://${formData.subdomain}`}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-[#C5A059] hover:underline flex items-center space-x-1"
              >
                <span>https://{formData.subdomain}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            {formData.customDomain && (
              <>
                <span>•</span>
                <div className="flex items-center space-x-1">
                  <span>Custom Domain:</span>
                  <span className="font-mono text-white">https://{formData.customDomain}</span>
                </div>
              </>
            )}
            <span>•</span>
            <span>Version: #{formData.publishedVersion || 1}</span>
            {formData.lastPublishedAt && (
              <span>• Published: {new Date(formData.lastPublishedAt).toLocaleString()}</span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onPreviewStorefront}
            className="px-4 py-2 rounded-xl bg-[#222222] hover:bg-[#2A2A2A] text-[#CCCCCC] hover:text-white text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 border border-[#333333] transition-colors cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-[#C5A059]" />
            <span>Interactive Preview</span>
          </button>

          {canRollback && (
            <button
              type="button"
              onClick={handleRollback}
              disabled={isRollingBack}
              className="px-3.5 py-2 rounded-xl bg-[#1C1C1C] hover:bg-[#282828] text-amber-400 text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 border border-amber-800/40 transition-colors cursor-pointer"
              title="Rollback to previous version"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isRollingBack ? 'animate-spin' : ''}`} />
              <span>Rollback</span>
            </button>
          )}

          <button
            type="button"
            onClick={handlePublish}
            disabled={isPublishing}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#C5A059] to-[#D4AF37] hover:from-[#D4AF37] hover:to-[#C5A059] text-black text-xs font-black uppercase tracking-wider flex items-center space-x-1.5 shadow-lg transition-all cursor-pointer"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isPublishing ? 'animate-spin' : ''}`} />
            <span>{isPublishing ? 'Publishing...' : 'Publish Website Live'}</span>
          </button>
        </div>
      </div>

      {/* Grid: 2 Columns for Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Domain & Hosting Config */}
        <div className="bg-[#141414] border border-[#262626] rounded-2xl p-5 space-y-4">
          <div className="flex items-center space-x-2 border-b border-[#222222] pb-3">
            <Globe className="w-4 h-4 text-[#C5A059]" />
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              Domain & URL Settings (WEB-002, WEB-003)
            </h4>
          </div>

          <div className="space-y-3.5 text-xs">
            <div>
              <label className="text-[#AAAAAA] font-bold uppercase tracking-wider block mb-1">
                Auto-Generated Subdomain (Free)
              </label>
              <div className="flex items-center bg-[#1A1A1A] border border-[#333333] rounded-lg overflow-hidden">
                <input
                  type="text"
                  value={formData.subdomain.replace('.yourpos.com', '')}
                  onChange={e =>
                    setFormData({ ...formData, subdomain: `${e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')}.yourpos.com` })
                  }
                  className="flex-1 bg-transparent px-3 py-2 text-white font-mono text-sm outline-none"
                  placeholder="my-liquor-store"
                />
                <span className="px-3 text-[#777777] font-mono border-l border-[#333333]">
                  .yourpos.com
                </span>
              </div>
              <p className="text-[11px] text-[#666666] mt-1">
                Unique subdomain provisioned instantly with free TLS/SSL encryption
              </p>
            </div>

            <div>
              <label className="text-[#AAAAAA] font-bold uppercase tracking-wider block mb-1">
                Custom Domain (Optional)
              </label>
              <input
                type="text"
                value={formData.customDomain || ''}
                onChange={e => setFormData({ ...formData, customDomain: e.target.value })}
                placeholder="e.g. www.377spirits.com"
                className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-[#C5A059] outline-none"
              />
              <p className="text-[11px] text-[#666666] mt-1">
                Point your CNAME record to <span className="font-mono text-[#AAAAAA]">proxy.yourpos.com</span>. Automated SSL certificates issued within 5 minutes.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-[#222222]">
              <div>
                <span className="font-bold text-white block">Status Mode</span>
                <span className="text-[11px] text-[#777777]">Set store availability</span>
              </div>
              <select
                value={formData.websiteStatus}
                onChange={e => setFormData({ ...formData, websiteStatus: e.target.value as any })}
                className="bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-1.5 text-xs text-white font-bold outline-none"
              >
                <option value="draft">Draft (Private / Staging)</option>
                <option value="live">Live (Public)</option>
                <option value="offline">Offline / Maintenance</option>
              </select>
            </div>
          </div>
        </div>

        {/* Branding & Visuals (WEB-004 to WEB-008) */}
        <div className="bg-[#141414] border border-[#262626] rounded-2xl p-5 space-y-4">
          <div className="flex items-center space-x-2 border-b border-[#222222] pb-3">
            <Sparkles className="w-4 h-4 text-[#C5A059]" />
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              Storefront Branding & Theme (WEB-005)
            </h4>
          </div>

          <div className="space-y-3.5 text-xs">
            <div>
              <label className="text-[#AAAAAA] font-bold uppercase tracking-wider block mb-1">
                Storefront Display Name
              </label>
              <input
                type="text"
                value={formData.storeName}
                onChange={e => setFormData({ ...formData, storeName: e.target.value })}
                className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-2 text-white font-bold outline-none focus:border-[#C5A059]"
              />
            </div>

            <div>
              <label className="text-[#AAAAAA] font-bold uppercase tracking-wider block mb-1">
                Store Tagline & Pitch
              </label>
              <input
                type="text"
                value={formData.tagline}
                onChange={e => setFormData({ ...formData, tagline: e.target.value })}
                className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-2 text-white outline-none focus:border-[#C5A059]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[#AAAAAA] font-bold uppercase tracking-wider block mb-1">
                  Primary Accent Color
                </label>
                <div className="flex items-center space-x-2 bg-[#1A1A1A] border border-[#333333] rounded-lg p-1.5">
                  <input
                    type="color"
                    value={formData.primaryColor || '#C5A059'}
                    onChange={e => setFormData({ ...formData, primaryColor: e.target.value })}
                    className="w-7 h-7 rounded border-0 bg-transparent cursor-pointer"
                  />
                  <span className="font-mono text-white text-xs">{formData.primaryColor}</span>
                </div>
              </div>

              <div>
                <label className="text-[#AAAAAA] font-bold uppercase tracking-wider block mb-1">
                  Header Bar Theme
                </label>
                <div className="flex items-center space-x-2 bg-[#1A1A1A] border border-[#333333] rounded-lg p-1.5">
                  <input
                    type="color"
                    value={formData.accentColor || '#121212'}
                    onChange={e => setFormData({ ...formData, accentColor: e.target.value })}
                    className="w-7 h-7 rounded border-0 bg-transparent cursor-pointer"
                  />
                  <span className="font-mono text-white text-xs">{formData.accentColor}</span>
                </div>
              </div>
            </div>

            <div>
              <label className="text-[#AAAAAA] font-bold uppercase tracking-wider block mb-1">
                Hero Banner Photo URL
              </label>
              <input
                type="text"
                value={formData.heroBannerUrl}
                onChange={e => setFormData({ ...formData, heroBannerUrl: e.target.value })}
                className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-2 text-white text-xs font-mono outline-none focus:border-[#C5A059]"
              />
            </div>
          </div>
        </div>

        {/* Curbside & In-Store Pickup Settings (WEB-013, WEB-014) */}
        <div className="bg-[#141414] border border-[#262626] rounded-2xl p-5 space-y-4">
          <div className="flex items-center space-x-2 border-b border-[#222222] pb-3">
            <ShoppingBag className="w-4 h-4 text-[#C5A059]" />
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              Curbside & In-Store Pickup (WEB-013)
            </h4>
          </div>

          <div className="space-y-3.5 text-xs">
            <div className="flex items-center justify-between p-3 bg-[#1A1A1A] rounded-xl border border-[#262626]">
              <div>
                <span className="font-bold text-white block">Enable Curbside & Counter Pickup</span>
                <span className="text-[11px] text-[#777777]">Allow customers to order for fast store pickup</span>
              </div>
              <input
                type="checkbox"
                checked={formData.enableInStorePickup}
                onChange={e => setFormData({ ...formData, enableInStorePickup: e.target.checked })}
                className="w-4 h-4 accent-[#C5A059] cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[#AAAAAA] font-bold uppercase tracking-wider block mb-1">
                  Preparation Time
                </label>
                <div className="flex items-center space-x-1.5 bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-2">
                  <Clock className="w-3.5 h-3.5 text-[#C5A059]" />
                  <input
                    type="number"
                    min="5"
                    step="5"
                    value={formData.pickupPrepTimeMinutes}
                    onChange={e => setFormData({ ...formData, pickupPrepTimeMinutes: parseInt(e.target.value) || 20 })}
                    className="w-full bg-transparent text-white font-bold outline-none"
                  />
                  <span className="text-[#777777]">mins</span>
                </div>
              </div>

              <div>
                <label className="text-[#AAAAAA] font-bold uppercase tracking-wider block mb-1">
                  Safety Stock Buffer
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.defaultSafetyStock}
                  onChange={e => setFormData({ ...formData, defaultSafetyStock: parseInt(e.target.value) || 0 })}
                  className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-2 text-white font-bold outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[#AAAAAA] font-bold uppercase tracking-wider block mb-1">
                Pickup Instructions for Customer
              </label>
              <textarea
                rows={2}
                value={formData.pickupInstructions}
                onChange={e => setFormData({ ...formData, pickupInstructions: e.target.value })}
                className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg p-2.5 text-white text-xs outline-none focus:border-[#C5A059]"
              />
            </div>
          </div>
        </div>

        {/* Local Delivery & Age Verification Settings (WEB-015, WEB-016) */}
        <div className="bg-[#141414] border border-[#262626] rounded-2xl p-5 space-y-4">
          <div className="flex items-center space-x-2 border-b border-[#222222] pb-3">
            <Truck className="w-4 h-4 text-[#C5A059]" />
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              Local Delivery & Texas 21+ Compliance (WEB-015, WEB-022)
            </h4>
          </div>

          <div className="space-y-3.5 text-xs">
            <div className="flex items-center justify-between p-3 bg-[#1A1A1A] rounded-xl border border-[#262626]">
              <div>
                <span className="font-bold text-white block">Enable Local Delivery</span>
                <span className="text-[11px] text-[#777777]">Direct local delivery to Granbury & surrounding area</span>
              </div>
              <input
                type="checkbox"
                checked={formData.enableLocalDelivery}
                onChange={e => setFormData({ ...formData, enableLocalDelivery: e.target.checked })}
                className="w-4 h-4 accent-[#C5A059] cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[#AAAAAA] font-bold uppercase tracking-wider block mb-1">
                  Radius
                </label>
                <div className="flex items-center space-x-1 bg-[#1A1A1A] border border-[#333333] rounded-lg px-2 py-2">
                  <input
                    type="number"
                    value={formData.deliveryRadiusMiles}
                    onChange={e => setFormData({ ...formData, deliveryRadiusMiles: parseFloat(e.target.value) || 10 })}
                    className="w-full bg-transparent text-white font-bold outline-none text-xs"
                  />
                  <span className="text-[#777777]">mi</span>
                </div>
              </div>

              <div>
                <label className="text-[#AAAAAA] font-bold uppercase tracking-wider block mb-1">
                  Delivery Fee
                </label>
                <div className="flex items-center space-x-1 bg-[#1A1A1A] border border-[#333333] rounded-lg px-2 py-2">
                  <span className="text-[#777777]">$</span>
                  <input
                    type="number"
                    step="0.5"
                    value={formData.deliveryFee}
                    onChange={e => setFormData({ ...formData, deliveryFee: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-transparent text-white font-bold outline-none text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-[#AAAAAA] font-bold uppercase tracking-wider block mb-1">
                  Free Over
                </label>
                <div className="flex items-center space-x-1 bg-[#1A1A1A] border border-[#333333] rounded-lg px-2 py-2">
                  <span className="text-[#777777]">$</span>
                  <input
                    type="number"
                    value={formData.freeDeliveryThreshold}
                    onChange={e => setFormData({ ...formData, freeDeliveryThreshold: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-transparent text-white font-bold outline-none text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-amber-950/20 border border-amber-800/40 rounded-xl">
              <div>
                <span className="font-bold text-amber-300 block">Texas 21+ Age Gate Modal (TABC)</span>
                <span className="text-[11px] text-amber-400/80">Requires customer birthdate confirmation before entering site</span>
              </div>
              <input
                type="checkbox"
                checked={formData.ageGateRequired}
                onChange={e => setFormData({ ...formData, ageGateRequired: e.target.checked })}
                className="w-4 h-4 accent-[#C5A059] cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Announcement Bar & Contact Strip */}
      <div className="bg-[#141414] border border-[#262626] rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[#222222] pb-3">
          <div className="flex items-center space-x-2">
            <Radio className="w-4 h-4 text-[#C5A059]" />
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              Top Announcement Banner & Store Contact
            </h4>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-[#888888]">Display Banner</span>
            <input
              type="checkbox"
              checked={formData.showAnnouncement}
              onChange={e => setFormData({ ...formData, showAnnouncement: e.target.checked })}
              className="w-4 h-4 accent-[#C5A059] cursor-pointer"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="sm:col-span-3">
            <input
              type="text"
              value={formData.announcementBar}
              onChange={e => setFormData({ ...formData, announcementBar: e.target.value })}
              placeholder="e.g. 🥃 Rare Bourbon Drop this Friday! | Curbside Pickup Ready in 20 Mins"
              className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-2 text-white outline-none focus:border-[#C5A059]"
            />
          </div>

          <div>
            <label className="text-[#888888] block mb-1">Store Phone</label>
            <input
              type="text"
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
              className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-1.5 text-white outline-none"
            />
          </div>

          <div>
            <label className="text-[#888888] block mb-1">Orders Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-1.5 text-white outline-none"
            />
          </div>

          <div>
            <label className="text-[#888888] block mb-1">Operating Hours</label>
            <input
              type="text"
              value={formData.businessHours}
              onChange={e => setFormData({ ...formData, businessHours: e.target.value })}
              className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-1.5 text-white outline-none"
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isSaving}
          className="px-6 py-3 rounded-xl bg-[#C5A059] hover:bg-[#D4AF37] text-black font-bold text-xs uppercase tracking-wider flex items-center space-x-2 shadow-lg transition-all cursor-pointer"
        >
          {isSaving ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Saving Changes...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Save Website Configuration</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
};
