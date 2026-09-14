import React, { useState } from 'react';
import {
  Globe,
  Server,
  Compass,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  ExternalLink,
  Save,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Radio,
  Tag,
  Link,
  Edit2,
  Check,
} from 'lucide-react';
import { OnlineStoreConfig } from '../../types';
import { api } from '../../utils/api';
import { playBeep } from '../../utils/audio';

interface WebsiteMenuManagerTabProps {
  config: OnlineStoreConfig;
  canRollback: boolean;
  onConfigUpdated: (updated: OnlineStoreConfig) => void;
  onPreviewStorefront: () => void;
}

interface MenuItem {
  id: string;
  label: string;
  url: string;
  badge?: string;
  visible: boolean;
  target?: '_self' | '_blank';
}

const DEFAULT_MENU_PRESETS: MenuItem[] = [
  { id: 'menu-1', label: 'Bourbon & Whiskey', url: '#bourbon', badge: 'Top Seller', visible: true },
  { id: 'menu-2', label: 'Tequila & Mezcal', url: '#tequila', visible: true },
  { id: 'menu-3', label: 'Texas Craft Spirits', url: '#texas-craft', badge: 'Local', visible: true },
  { id: 'menu-4', label: 'Fine Wine Cellar', url: '#wine', visible: true },
  { id: 'menu-5', label: 'Curbside Pickup', url: '#curbside', badge: '20 Mins', visible: true },
  { id: 'menu-6', label: 'Weekly Specials', url: '#specials', badge: 'Sale', visible: true },
  { id: 'menu-7', label: 'Store Hours & Map', url: '#contact', visible: true },
];

export const WebsiteMenuManagerTab: React.FC<WebsiteMenuManagerTabProps> = ({
  config,
  canRollback,
  onConfigUpdated,
  onPreviewStorefront,
}) => {
  const [formData, setFormData] = useState<OnlineStoreConfig>({ ...config });
  const [menuItems, setMenuItems] = useState<MenuItem[]>(() => {
    if (config.navigationMenuItems && config.navigationMenuItems.length > 0) {
      return config.navigationMenuItems;
    }
    return DEFAULT_MENU_PRESETS;
  });

  // Modal / Form state for new menu item
  const [showAddModal, setShowAddModal] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newBadge, setNewBadge] = useState('');
  const [newTarget, setNewTarget] = useState<'_self' | '_blank'>('_self');

  // Inline editing state
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editBadge, setEditBadge] = useState('');

  // Status & notifications
  const [isSaving, setIsSaving] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Handle Save All Settings
  const handleSave = async () => {
    setIsSaving(true);
    setNotification(null);
    try {
      const payload: Partial<OnlineStoreConfig> = {
        ...formData,
        navigationMenuItems: menuItems,
      };
      const res = await api.updateOnlineStoreConfig(payload);
      onConfigUpdated(res.config);
      setFormData(res.config);
      setNotification({ type: 'success', text: 'Website menu and hosting settings saved successfully!' });
      playBeep('success');
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message || 'Failed to save settings.' });
      playBeep('error');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Deploy Live
  const handleDeploy = async () => {
    setIsDeploying(true);
    setNotification(null);
    try {
      // First save the current menu
      await api.updateOnlineStoreConfig({ ...formData, navigationMenuItems: menuItems });
      const res = await api.publishOnlineStore();
      onConfigUpdated(res.config);
      setFormData(res.config);
      setNotification({
        type: 'success',
        text: `Website deployed and hosted live! Accessible at https://${res.config.customDomain || res.config.subdomain}`,
      });
      playBeep('success');
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message || 'Deployment failed.' });
      playBeep('error');
    } finally {
      setIsDeploying(false);
    }
  };

  // Handle Rollback
  const handleRollback = async () => {
    if (!confirm('Rollback website to previous stable deployment?')) return;
    setIsRollingBack(true);
    setNotification(null);
    try {
      const res = await api.rollbackOnlineStore();
      onConfigUpdated(res.config);
      setFormData(res.config);
      if (res.config.navigationMenuItems) {
        setMenuItems(res.config.navigationMenuItems);
      }
      setNotification({ type: 'success', text: 'Rolled back to previous version.' });
      playBeep('success');
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message || 'Rollback failed.' });
      playBeep('error');
    } finally {
      setIsRollingBack(false);
    }
  };

  // Menu Item Actions
  const handleAddMenuItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim()) return;

    const newItem: MenuItem = {
      id: `menu-${Date.now()}`,
      label: newLabel.trim(),
      url: newUrl.trim() || `#${newLabel.toLowerCase().replace(/\s+/g, '-')}`,
      badge: newBadge.trim() || undefined,
      visible: true,
      target: newTarget,
    };

    setMenuItems(prev => [...prev, newItem]);
    setNewLabel('');
    setNewUrl('');
    setNewBadge('');
    setShowAddModal(false);
    playBeep('click');
  };

  const handleToggleVisible = (id: string) => {
    setMenuItems(prev =>
      prev.map(item => (item.id === id ? { ...item, visible: !item.visible } : item))
    );
    playBeep('click');
  };

  const handleDeleteItem = (id: string) => {
    setMenuItems(prev => prev.filter(item => item.id !== id));
    playBeep('click');
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setMenuItems(prev => {
      const copy = [...prev];
      const temp = copy[index - 1];
      copy[index - 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
    playBeep('click');
  };

  const handleMoveDown = (index: number) => {
    if (index === menuItems.length - 1) return;
    setMenuItems(prev => {
      const copy = [...prev];
      const temp = copy[index + 1];
      copy[index + 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
    playBeep('click');
  };

  const handleStartEdit = (item: MenuItem) => {
    setEditingItemId(item.id);
    setEditLabel(item.label);
    setEditUrl(item.url);
    setEditBadge(item.badge || '');
  };

  const handleSaveEdit = (id: string) => {
    setMenuItems(prev =>
      prev.map(item =>
        item.id === id
          ? {
              ...item,
              label: editLabel.trim() || item.label,
              url: editUrl.trim() || item.url,
              badge: editBadge.trim() || undefined,
            }
          : item
      )
    );
    setEditingItemId(null);
    playBeep('success');
  };

  const handleResetToPresets = () => {
    if (confirm('Reset menu items to recommended Texas liquor store presets?')) {
      setMenuItems(DEFAULT_MENU_PRESETS);
      playBeep('click');
    }
  };

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#141414] border border-[#2B2B2B] rounded-2xl p-5 shadow-lg">
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-400/15 border border-amber-400/40 text-amber-400 flex items-center justify-center">
            <Server className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-white uppercase tracking-wider">
                Website Menu & Hosting Management
              </h2>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  formData.websiteStatus === 'live'
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    : formData.websiteStatus === 'draft'
                    ? 'bg-amber-950 text-amber-400 border border-amber-800'
                    : 'bg-rose-950 text-rose-400 border border-rose-800'
                }`}
              >
                {formData.websiteStatus.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-[#888888] mt-0.5">
              Host your storefront, configure domain routing, and manage customer navigation menus.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canRollback && (
            <button
              type="button"
              onClick={handleRollback}
              disabled={isRollingBack}
              className="px-3.5 py-2 rounded-xl bg-[#222222] hover:bg-[#2A2A2A] text-[#AAAAAA] hover:text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center space-x-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{isRollingBack ? 'Rolling back...' : 'Rollback'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onPreviewStorefront}
            className="px-3.5 py-2 rounded-xl bg-[#222222] hover:bg-[#2A2A2A] text-amber-400 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center space-x-1.5"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Preview Storefront</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 rounded-xl bg-[#282828] hover:bg-[#333333] text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center space-x-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
          </button>

          <button
            type="button"
            onClick={handleDeploy}
            disabled={isDeploying}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer flex items-center space-x-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isDeploying ? 'Deploying...' : 'Deploy Live'}</span>
          </button>
        </div>
      </div>

      {notification && (
        <div
          className={`p-4 rounded-xl flex items-center space-x-2.5 text-xs font-bold ${
            notification.type === 'success'
              ? 'bg-emerald-950/40 border border-emerald-800 text-emerald-300'
              : 'bg-rose-950/40 border border-rose-800 text-rose-300'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{notification.text}</span>
        </div>
      )}

      {/* Grid: Hosting Options & Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Navigation Menu Items Manager */}
        <div className="lg:col-span-2 space-y-6">
          {/* Menu Items Table Card */}
          <div className="bg-[#141414] border border-[#262626] rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Compass className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Customer Website Navigation Menu
                </h3>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleResetToPresets}
                  className="text-[11px] text-[#888888] hover:text-white transition-colors cursor-pointer"
                >
                  Load Recommended Presets
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  className="px-3 py-1.5 rounded-lg bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center space-x-1 hover:bg-amber-300"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Menu Item</span>
                </button>
              </div>
            </div>

            <p className="text-xs text-[#888888]">
              These menu items appear directly in your website's header navigation. Customers can tap them to jump to spirits categories, curbside pickup, or weekly specials.
            </p>

            {/* Menu Items List */}
            <div className="divide-y divide-[#222222] border border-[#222222] rounded-xl overflow-hidden bg-[#0F0F0F]">
              {menuItems.map((item, index) => (
                <div
                  key={item.id}
                  className={`p-3.5 flex items-center justify-between gap-3 transition-colors ${
                    !item.visible ? 'opacity-50 bg-[#0A0A0A]' : 'hover:bg-[#161616]'
                  }`}
                >
                  {/* Left: Reorder buttons & Label */}
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className="flex flex-col space-y-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleMoveUp(index)}
                        disabled={index === 0}
                        className="p-1 text-slate-500 hover:text-white disabled:opacity-20 cursor-pointer"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveDown(index)}
                        disabled={index === menuItems.length - 1}
                        className="p-1 text-slate-500 hover:text-white disabled:opacity-20 cursor-pointer"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    </div>

                    {editingItemId === item.id ? (
                      <div className="flex-1 flex items-center space-x-2">
                        <input
                          type="text"
                          value={editLabel}
                          onChange={e => setEditLabel(e.target.value)}
                          placeholder="Menu Label"
                          className="bg-[#1A1A1A] border border-amber-400/60 rounded px-2 py-1 text-xs text-white"
                        />
                        <input
                          type="text"
                          value={editUrl}
                          onChange={e => setEditUrl(e.target.value)}
                          placeholder="Target URL / #tag"
                          className="bg-[#1A1A1A] border border-[#333] rounded px-2 py-1 text-xs text-white font-mono"
                        />
                        <input
                          type="text"
                          value={editBadge}
                          onChange={e => setEditBadge(e.target.value)}
                          placeholder="Badge (optional)"
                          className="bg-[#1A1A1A] border border-[#333] rounded px-2 py-1 text-xs text-white w-28"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(item.id)}
                          className="p-1.5 rounded bg-emerald-600 text-white hover:bg-emerald-500"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-white truncate">{item.label}</span>
                          {item.badge && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/30">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#666666] font-mono truncate">{item.url}</div>
                      </div>
                    )}
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleVisible(item.id)}
                      className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider cursor-pointer ${
                        item.visible
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-[#222] text-[#888]'
                      }`}
                    >
                      {item.visible ? 'Visible' : 'Hidden'}
                    </button>

                    {editingItemId !== item.id && (
                      <button
                        type="button"
                        onClick={() => handleStartEdit(item)}
                        className="p-1.5 rounded bg-[#222222] hover:bg-[#2E2E2E] text-slate-300 hover:text-white cursor-pointer"
                        title="Edit Menu Item"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-1.5 rounded bg-[#222222] hover:bg-rose-950 text-slate-400 hover:text-rose-400 cursor-pointer"
                      title="Remove Menu Item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Live Interactive Navigation Bar Preview */}
            <div className="pt-4 border-t border-[#242424] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#AAAAAA] uppercase tracking-wider">
                  Live Customer Navigation Bar Preview
                </span>
                <span className="text-[10px] text-amber-400 font-mono">Desktop & Mobile View</span>
              </div>

              {/* Mock Storefront Header */}
              <div className="bg-[#0B132B] border border-slate-800 rounded-xl overflow-hidden shadow-inner">
                {/* Announcement Bar */}
                {formData.showAnnouncement && (
                  <div className="bg-amber-400 text-slate-950 py-1 px-4 text-center text-[10px] font-bold uppercase tracking-wider">
                    {formData.announcementBar || '🥃 Granbury Curbside Ready in 20 Mins | 21+ ID Required'}
                  </div>
                )}

                {/* Main Logo & Menu items */}
                <div className="p-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80">
                  <div className="font-serif font-black text-white text-sm tracking-tight flex items-center space-x-2">
                    <span className="text-amber-400">377</span>
                    <span>SPIRITS</span>
                  </div>

                  {/* Menu items row */}
                  <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar">
                    {menuItems
                      .filter(m => m.visible)
                      .map(item => (
                        <div
                          key={item.id}
                          className="px-2.5 py-1 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-200 text-[11px] font-semibold flex items-center space-x-1.5 whitespace-nowrap"
                        >
                          <span>{item.label}</span>
                          {item.badge && (
                            <span className="px-1 py-0.2 rounded text-[8px] font-black uppercase tracking-wider bg-amber-400 text-slate-950">
                              {item.badge}
                            </span>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Website Hosting & Domain Controls */}
        <div className="space-y-6">
          {/* Hosting Status Card */}
          <div className="bg-[#141414] border border-[#262626] rounded-2xl p-5 space-y-4">
            <div className="flex items-center space-x-2">
              <Server className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Website Hosting & Domain
              </h3>
            </div>

            {/* Hosting Status Radio Options */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-[#AAAAAA] uppercase tracking-wider block">
                Website Live Status
              </label>
              {(
                [
                  { id: 'live', label: 'Hosted Live (Public)', desc: 'Storefront is published and accepting orders' },
                  { id: 'draft', label: 'Private Draft', desc: 'Only visible via preview simulator' },
                  { id: 'maintenance', label: 'Maintenance Mode', desc: 'Displays a temporary store maintenance screen' },
                ] as const
              ).map(opt => (
                <label
                  key={opt.id}
                  className={`flex items-start space-x-3 p-3 rounded-xl border transition-all cursor-pointer ${
                    formData.websiteStatus === opt.id
                      ? 'bg-amber-400/10 border-amber-400/80 text-white'
                      : 'bg-[#181818] border-[#2B2B2B] text-[#888888] hover:border-[#383838]'
                  }`}
                >
                  <input
                    type="radio"
                    name="websiteStatus"
                    checked={formData.websiteStatus === opt.id}
                    onChange={() => setFormData({ ...formData, websiteStatus: opt.id })}
                    className="mt-0.5 accent-amber-400 cursor-pointer"
                  />
                  <div>
                    <div className="text-xs font-bold text-white">{opt.label}</div>
                    <div className="text-[10px] text-[#777777]">{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>

            {/* Subdomain Input */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#AAAAAA] uppercase tracking-wider block">
                Free POS Subdomain
              </label>
              <div className="flex items-center rounded-xl bg-[#1A1A1A] border border-[#2B2B2B] px-3 py-2 text-xs">
                <span className="text-[#666] font-mono mr-1">https://</span>
                <input
                  type="text"
                  value={formData.subdomain}
                  onChange={e => setFormData({ ...formData, subdomain: e.target.value })}
                  placeholder="377spirits.yourpos.com"
                  className="flex-1 bg-transparent text-white font-mono focus:outline-hidden"
                />
              </div>
            </div>

            {/* Custom Domain Input */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#AAAAAA] uppercase tracking-wider block">
                Custom Domain (e.g. www.377spirits.com)
              </label>
              <div className="flex items-center rounded-xl bg-[#1A1A1A] border border-[#2B2B2B] px-3 py-2 text-xs">
                <Globe className="w-3.5 h-3.5 text-slate-500 mr-2" />
                <input
                  type="text"
                  value={formData.customDomain || ''}
                  onChange={e => setFormData({ ...formData, customDomain: e.target.value })}
                  placeholder="www.377spirits.com"
                  className="flex-1 bg-transparent text-white font-mono focus:outline-hidden"
                />
              </div>
            </div>

            {/* Hosting Edge Infrastructure Badge */}
            <div className="p-3 bg-[#181818] rounded-xl border border-[#282828] space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  SSL Certificate & CDN
                </span>
                <span className="text-[10px] font-mono text-emerald-400 font-bold">Active</span>
              </div>
              <p className="text-[11px] text-[#777777]">
                Automated Let's Encrypt TLS 1.3 certificate with DDoS mitigation and Texas regional caching.
              </p>
            </div>

            {/* Age Gate & Announcement Bar */}
            <div className="space-y-3 pt-2 border-t border-[#262626]">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <div className="text-xs font-bold text-white">Texas 21+ Age Gate</div>
                  <div className="text-[10px] text-[#777]">Mandatory TABC birthdate verification modal</div>
                </div>
                <input
                  type="checkbox"
                  checked={formData.ageGateRequired}
                  onChange={e => setFormData({ ...formData, ageGateRequired: e.target.checked })}
                  className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <div className="text-xs font-bold text-white">Header Announcement Bar</div>
                  <div className="text-[10px] text-[#777]">Notice ticker at very top of website</div>
                </div>
                <input
                  type="checkbox"
                  checked={formData.showAnnouncement}
                  onChange={e => setFormData({ ...formData, showAnnouncement: e.target.checked })}
                  className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
                />
              </label>

              {formData.showAnnouncement && (
                <input
                  type="text"
                  value={formData.announcementBar || ''}
                  onChange={e => setFormData({ ...formData, announcementBar: e.target.value })}
                  placeholder="Announcement ticker message..."
                  className="w-full bg-[#1A1A1A] border border-[#2B2B2B] rounded-xl p-2.5 text-xs text-white"
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: Add New Navigation Item */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-[#333] rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#262626] pb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                Add Website Menu Navigation Item
              </h4>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleAddMenuItem} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-[#AAAAAA] uppercase tracking-wider block mb-1">
                  Menu Display Label
                </label>
                <input
                  type="text"
                  required
                  value={newLabel}
                  onChange={e => setNewLabel(e.target.value)}
                  placeholder="e.g. Single Barrel Bourbon"
                  className="w-full bg-[#1A1A1A] border border-[#333] rounded-xl p-2.5 text-xs text-white"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#AAAAAA] uppercase tracking-wider block mb-1">
                  Target Anchor or URL
                </label>
                <input
                  type="text"
                  value={newUrl}
                  onChange={e => setNewUrl(e.target.value)}
                  placeholder="e.g. #bourbon or /category/whiskey"
                  className="w-full bg-[#1A1A1A] border border-[#333] rounded-xl p-2.5 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#AAAAAA] uppercase tracking-wider block mb-1">
                  Badge Tag (Optional)
                </label>
                <input
                  type="text"
                  value={newBadge}
                  onChange={e => setNewBadge(e.target.value)}
                  placeholder="e.g. NEW, 21+, TOP PICK, SALE"
                  className="w-full bg-[#1A1A1A] border border-[#333] rounded-xl p-2.5 text-xs text-white"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#222] hover:bg-[#2A2A2A] text-slate-300 text-xs font-bold uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black uppercase tracking-wider"
                >
                  Add to Menu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
