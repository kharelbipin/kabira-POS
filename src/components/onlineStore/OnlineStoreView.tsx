import React, { useState, useEffect } from 'react';
import {
  Globe,
  Settings,
  ShoppingBag,
  Boxes,
  BarChart3,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  Eye,
  Plus,
  ArrowRight,
  Layers,
} from 'lucide-react';
import { OnlineStoreConfig, User, StoreSettings } from '../../types';
import { api } from '../../utils/api';
import { playBeep } from '../../utils/audio';

import { WebsiteSettingsTab } from './WebsiteSettingsTab';
import { WebProductsTab } from './WebProductsTab';
import { OnlineOrdersTab } from './OnlineOrdersTab';
import { StorefrontSimulatorTab } from './StorefrontSimulatorTab';
import { CouponsAndAnalyticsTab } from './CouponsAndAnalyticsTab';

interface OnlineStoreViewProps {
  currentUser: User | null;
  settings: StoreSettings | null;
}

export const OnlineStoreView: React.FC<OnlineStoreViewProps> = ({
  currentUser,
  settings,
}) => {
  const [subTab, setSubTab] = useState<
    'settings' | 'products' | 'orders' | 'preview' | 'analytics'
  >('settings');
  const [config, setConfig] = useState<OnlineStoreConfig | null>(null);
  const [canRollback, setCanRollback] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingWebsite, setIsCreatingWebsite] = useState(false);

  const loadConfig = async () => {
    setIsLoading(true);
    try {
      const res = await api.getOnlineStoreConfig();
      setConfig(res.config);
      setCanRollback(!!res.canRollback);
    } catch (err) {
      console.error('Failed to load online store config', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const handleCreateWebsite = async () => {
    setIsCreatingWebsite(true);
    try {
      const initialStoreName = settings?.storeName || '377 Spirits';
      const defaultSubdomain = initialStoreName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '') + '.yourpos.com';

      const initialPayload: Partial<OnlineStoreConfig> = {
        enabled: true,
        websiteStatus: 'draft',
        storeName: initialStoreName,
        subdomain: defaultSubdomain,
        customDomain: 'www.377spirits.com',
        primaryColor: '#C5A059',
        accentColor: '#121212',
        tagline: "Granbury's Premier Destination for Fine Spirits & Craft Wine",
        enableInStorePickup: true,
        enableLocalDelivery: true,
        pickupPrepTimeMinutes: 20,
        defaultSafetyStock: 1,
        deliveryRadiusMiles: 15,
        deliveryFee: 4.99,
        freeDeliveryThreshold: 75,
        ageGateRequired: true,
        showAnnouncement: true,
        announcementBar: '🥃 Granbury Curbside Pickup Ready in 20 Mins | Valid 21+ ID Required',
      };

      const res = await api.updateOnlineStoreConfig(initialPayload);
      setConfig(res.config);
      playBeep('success');
    } catch (err: any) {
      alert('Failed to initialize website: ' + err.message);
    } finally {
      setIsCreatingWebsite(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-[#0D0D0D] text-[#888888]">
        <div className="flex items-center space-x-3 text-sm">
          <RefreshCw className="w-5 h-5 animate-spin text-[#C5A059]" />
          <span>Loading Online Store Admin Portal...</span>
        </div>
      </div>
    );
  }

  // If website hasn't been created yet (WEB-001 "Create Website" flow)
  if (!config || !config.enabled) {
    return (
      <div className="h-full overflow-y-auto bg-[#0A0A0A] p-6 lg:p-12 flex items-center justify-center">
        <div className="max-w-2xl w-full bg-[#141414] border border-[#262626] rounded-3xl p-8 sm:p-12 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-[#C5A059]/20 text-[#C5A059] flex items-center justify-center mx-auto border border-[#C5A059]/40 shadow-lg">
            <Globe className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#C5A059]">
              Admin Portal • WEB-001 to WEB-023
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif italic font-bold text-white tracking-wide">
              Enable Online Store Directly From POS
            </h2>
            <p className="text-sm text-[#888888] max-w-lg mx-auto leading-relaxed">
              Launch a hosted eCommerce storefront tied directly to your Granbury POS catalog. Zero
              separate systems, real-time stock sync, Texas 21+ compliance, curbside pickup, and local delivery.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
            <div className="bg-[#1A1A1A] border border-[#2B2B2B] rounded-2xl p-4 space-y-1">
              <span className="text-xs font-bold text-white block">Auto-Hosted URL</span>
              <p className="text-[11px] text-[#777777]">
                Free subdomain + custom domain support with automated SSL encryption.
              </p>
            </div>
            <div className="bg-[#1A1A1A] border border-[#2B2B2B] rounded-2xl p-4 space-y-1">
              <span className="text-xs font-bold text-white block">Real-Time Inventory</span>
              <p className="text-[11px] text-[#777777]">
                Safety stock reserves prevent in-store overselling automatically.
              </p>
            </div>
            <div className="bg-[#1A1A1A] border border-[#2B2B2B] rounded-2xl p-4 space-y-1">
              <span className="text-xs font-bold text-white block">Texas 21+ Compliant</span>
              <p className="text-[11px] text-[#777777]">
                TABC age gate modal and cashier physical ID verification workflow.
              </p>
            </div>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              id="btn-create-website"
              onClick={handleCreateWebsite}
              disabled={isCreatingWebsite}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-[#C5A059] to-[#D4AF37] hover:from-[#D4AF37] hover:to-[#C5A059] text-black font-black text-xs uppercase tracking-wider shadow-xl flex items-center justify-center space-x-2 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isCreatingWebsite ? 'Configuring Storefront...' : 'Create Website Now'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#0A0A0A] overflow-hidden text-[#E5E5E5]">
      {/* Top Header & Subnav Strip */}
      <div className="bg-[#0F0F0F] border-b border-[#242424] px-4 py-3 shrink-0 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-[#C5A059]/20 text-[#C5A059] flex items-center justify-center border border-[#C5A059]/40">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Online Store Admin Portal
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#1F1F1F] text-[#AAAAAA] border border-[#333333]">
                {config.websiteStatus.toUpperCase()}
              </span>
            </div>
            <div className="text-[11px] text-[#777777] font-mono">
              https://{config.customDomain || config.subdomain}
            </div>
          </div>
        </div>

        {/* Sub Navigation Buttons */}
        <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar bg-[#161616] p-1 rounded-xl border border-[#282828]">
          <button
            id="subtab-website-settings"
            onClick={() => setSubTab('settings')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              subTab === 'settings'
                ? 'bg-[#C5A059] text-black shadow-sm'
                : 'text-[#888888] hover:text-white hover:bg-[#202020]'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Website Config</span>
          </button>

          <button
            id="subtab-online-catalog"
            onClick={() => setSubTab('products')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              subTab === 'products'
                ? 'bg-[#C5A059] text-black shadow-sm'
                : 'text-[#888888] hover:text-white hover:bg-[#202020]'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>Web Products</span>
          </button>

          <button
            id="subtab-online-orders"
            onClick={() => setSubTab('orders')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              subTab === 'orders'
                ? 'bg-[#C5A059] text-black shadow-sm'
                : 'text-[#888888] hover:text-white hover:bg-[#202020]'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Online Orders</span>
          </button>

          <button
            id="subtab-storefront-preview"
            onClick={() => setSubTab('preview')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              subTab === 'preview'
                ? 'bg-[#C5A059] text-black shadow-sm'
                : 'text-[#888888] hover:text-white hover:bg-[#202020]'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Storefront Preview</span>
          </button>

          <button
            id="subtab-coupons-analytics"
            onClick={() => setSubTab('analytics')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              subTab === 'analytics'
                ? 'bg-[#C5A059] text-black shadow-sm'
                : 'text-[#888888] hover:text-white hover:bg-[#202020]'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Coupons & Analytics</span>
          </button>
        </div>
      </div>

      {/* Main SubTab Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          {subTab === 'settings' && (
            <WebsiteSettingsTab
              config={config}
              canRollback={canRollback}
              onConfigUpdated={updated => {
                setConfig(updated);
                loadConfig();
              }}
              onPreviewStorefront={() => setSubTab('preview')}
            />
          )}

          {subTab === 'products' && <WebProductsTab />}

          {subTab === 'orders' && <OnlineOrdersTab />}

          {subTab === 'preview' && (
            <StorefrontSimulatorTab
              config={config}
              onOrderPlaced={() => {
                // When an order is placed in simulator, allow admin to switch to orders tab
                setSubTab('orders');
              }}
            />
          )}

          {subTab === 'analytics' && <CouponsAndAnalyticsTab />}
        </div>
      </div>
    </div>
  );
};
