import React, { useState } from 'react';
import { ShieldCheck, ExternalLink, RefreshCw, Smartphone, Monitor } from 'lucide-react';
import { OnlineStoreConfig } from '../../types';
import { GranburySpiritsStorefront } from './GranburySpiritsStorefront';

interface StorefrontSimulatorTabProps {
  config: OnlineStoreConfig;
  onOrderPlaced: () => void;
  onOpenAdminTab?: (tab: string) => void;
}

export const StorefrontSimulatorTab: React.FC<StorefrontSimulatorTabProps> = ({
  config,
  onOrderPlaced,
  onOpenAdminTab,
}) => {
  const [deviceView, setDeviceView] = useState<'desktop' | 'mobile'>('desktop');
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Browser Chrome / Device Simulator Header */}
      <div className="bg-[#141414] border border-[#262626] rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1.5 mr-2">
            <span className="w-3 h-3 rounded-full bg-[#FF5F56]" />
            <span className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
            <span className="w-3 h-3 rounded-full bg-[#27C93F]" />
          </div>

          <div className="flex items-center space-x-2 bg-[#0D0D0D] border border-[#2B2B2B] rounded-xl px-4 py-1.5 text-xs text-[#888888] font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-[#666666]">https://</span>
            <span className="text-white font-bold">
              {config.customDomain || config.subdomain || 'www.377spirits.com'}
            </span>
          </div>
        </div>

        {/* Device Mode & Action Buttons */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center bg-[#0D0D0D] p-1 rounded-xl border border-[#262626]">
            <button
              onClick={() => setDeviceView('desktop')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1 ${
                deviceView === 'desktop'
                  ? 'bg-[#2A2A2A] text-white shadow-xs'
                  : 'text-[#777777] hover:text-white'
              }`}
              title="Desktop View"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Desktop</span>
            </button>
            <button
              onClick={() => setDeviceView('mobile')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1 ${
                deviceView === 'mobile'
                  ? 'bg-[#2A2A2A] text-white shadow-xs'
                  : 'text-[#777777] hover:text-white'
              }`}
              title="Mobile Responsive View"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Mobile</span>
            </button>
          </div>

          <button
            onClick={() => setRefreshKey(k => k + 1)}
            className="p-2 rounded-xl bg-[#222222] hover:bg-[#2C2C2C] text-[#AAAAAA] hover:text-white transition-colors cursor-pointer"
            title="Reload Storefront"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Storefront Viewport */}
      <div
        className={`mx-auto transition-all duration-300 rounded-2xl overflow-hidden border border-[#2B2B2B] shadow-2xl ${
          deviceView === 'mobile' ? 'max-w-md' : 'w-full'
        }`}
      >
        <GranburySpiritsStorefront
          key={refreshKey}
          config={config}
          onOpenAdminTabs={onOpenAdminTab}
        />
      </div>
    </div>
  );
};
