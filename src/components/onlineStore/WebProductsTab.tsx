import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Package,
  Globe,
  Truck,
  ShoppingBag,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  SlidersHorizontal,
  DollarSign,
  Star,
} from 'lucide-react';
import { api } from '../../utils/api';
import { playBeep } from '../../utils/audio';

export const WebProductsTab: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [onlineFilter, setOnlineFilter] = useState<'all' | 'online' | 'hidden'>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const res = await api.getOnlineProducts();
      setProducts(res.products || []);
    } catch (err) {
      console.error('Failed to load online products', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const categories = Array.from(new Set(products.map(p => p.categoryName || 'Other'))).filter(Boolean);

  const filteredProducts = products.filter(p => {
    if (categoryFilter !== 'all' && p.categoryName !== categoryFilter) return false;
    if (onlineFilter === 'online' && !p.onlineSettings?.sellOnline) return false;
    if (onlineFilter === 'hidden' && p.onlineSettings?.sellOnline) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.brand?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleToggleOnlineSetting = async (
    productId: string,
    settingKey: 'sellOnline' | 'pickupAvailable' | 'deliveryAvailable' | 'isFeatured',
    currentVal: boolean
  ) => {
    try {
      const updated = { [settingKey]: !currentVal };
      await api.updateOnlineProductSettings(productId, updated);

      setProducts(prev =>
        prev.map(p => {
          if (p.id === productId) {
            return {
              ...p,
              onlineSettings: {
                ...p.onlineSettings,
                ...updated,
              },
            };
          }
          return p;
        })
      );
      playBeep('success');
    } catch (err: any) {
      alert('Failed to update product setting: ' + err.message);
    }
  };

  const handleUpdateOnlinePrice = async (productId: string, newPriceStr: string) => {
    const val = parseFloat(newPriceStr);
    const onlinePrice = isNaN(val) ? undefined : val;

    try {
      await api.updateOnlineProductSettings(productId, { onlinePrice });
      setProducts(prev =>
        prev.map(p => {
          if (p.id === productId) {
            return {
              ...p,
              onlineSettings: {
                ...p.onlineSettings,
                onlinePrice,
              },
            };
          }
          return p;
        })
      );
    } catch (err: any) {
      console.error('Failed to update online price', err);
    }
  };

  const handleUpdateSafetyStock = async (productId: string, val: number) => {
    const safetyStock = Math.max(0, val);
    try {
      await api.updateOnlineProductSettings(productId, { safetyStock });
      setProducts(prev =>
        prev.map(p => {
          if (p.id === productId) {
            const availableOnlineUnits = Math.max(0, p.stockQuantity - safetyStock);
            return {
              ...p,
              onlineSettings: {
                ...p.onlineSettings,
                safetyStock,
                availableOnlineUnits,
              },
            };
          }
          return p;
        })
      );
    } catch (err: any) {
      console.error('Failed to update safety stock', err);
    }
  };

  const handleBulkAction = async (action: 'publish' | 'unpublish' | 'enablePickup' | 'enableDelivery') => {
    if (!selectedIds.length) return;
    setIsBulkUpdating(true);

    try {
      let payload: any = { productIds: selectedIds };
      if (action === 'publish') payload.sellOnline = true;
      if (action === 'unpublish') payload.sellOnline = false;
      if (action === 'enablePickup') payload.pickupAvailable = true;
      if (action === 'enableDelivery') payload.deliveryAvailable = true;

      const res = await api.bulkUpdateOnlineProducts(payload);
      setSuccessBanner(`Updated ${res.updatedCount} products for online store!`);
      setSelectedIds([]);
      loadProducts();
      playBeep('success');
    } catch (err: any) {
      alert('Bulk update failed: ' + err.message);
      playBeep('error');
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredProducts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProducts.map(p => p.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Banner Notice */}
      <div className="bg-[#141414] border border-[#262626] rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-[#C5A059]/15 text-[#C5A059] flex items-center justify-center border border-[#C5A059]/30">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Omnichannel Product Catalog (WEB-009 to WEB-012)
            </h3>
            <p className="text-xs text-[#888888]">
              Manage online visibility, web-specific pricing, curbside & delivery channels, and safety stock reserves
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={loadProducts}
            className="p-2.5 rounded-xl bg-[#1E1E1E] hover:bg-[#282828] text-[#888888] hover:text-white border border-[#333333] transition-colors cursor-pointer"
            title="Refresh Catalog"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {successBanner && (
        <div className="flex items-center justify-between p-3.5 bg-emerald-950/60 border border-emerald-800/50 rounded-xl text-emerald-200 text-xs">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successBanner}</span>
          </div>
          <button onClick={() => setSuccessBanner(null)} className="text-xs underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Filter and Bulk Action Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-[#141414] p-3 rounded-xl border border-[#262626]">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 text-[#666666] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search spirits by name, SKU, brand..."
              className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg pl-9 pr-3 py-1.5 text-xs text-white focus:border-[#C5A059] outline-none"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-1.5 text-xs text-white outline-none"
          >
            <option value="all">All Categories</option>
            {categories.map(c => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={onlineFilter}
            onChange={e => setOnlineFilter(e.target.value as any)}
            className="bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-1.5 text-xs text-white outline-none"
          >
            <option value="all">All Visibility</option>
            <option value="online">Published Online Only</option>
            <option value="hidden">Hidden from Web</option>
          </select>
        </div>

        {/* Bulk Action Buttons */}
        {selectedIds.length > 0 && (
          <div className="flex items-center space-x-2 overflow-x-auto pt-2 lg:pt-0">
            <span className="text-[11px] font-bold text-[#C5A059] whitespace-nowrap">
              {selectedIds.length} selected:
            </span>
            <button
              type="button"
              onClick={() => handleBulkAction('publish')}
              disabled={isBulkUpdating}
              className="px-2.5 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-800/60 text-xs font-bold whitespace-nowrap cursor-pointer"
            >
              Publish Online
            </button>
            <button
              type="button"
              onClick={() => handleBulkAction('unpublish')}
              disabled={isBulkUpdating}
              className="px-2.5 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/60 text-xs font-bold whitespace-nowrap cursor-pointer"
            >
              Hide from Web
            </button>
            <button
              type="button"
              onClick={() => handleBulkAction('enablePickup')}
              disabled={isBulkUpdating}
              className="px-2.5 py-1 rounded-lg bg-[#222222] hover:bg-[#2A2A2A] text-white border border-[#3A3A3A] text-xs font-bold whitespace-nowrap cursor-pointer"
            >
              Enable Pickup
            </button>
            <button
              type="button"
              onClick={() => handleBulkAction('enableDelivery')}
              disabled={isBulkUpdating}
              className="px-2.5 py-1 rounded-lg bg-[#222222] hover:bg-[#2A2A2A] text-white border border-[#3A3A3A] text-xs font-bold whitespace-nowrap cursor-pointer"
            >
              Enable Delivery
            </button>
          </div>
        )}
      </div>

      {/* Catalog Table */}
      <div className="bg-[#141414] border border-[#262626] rounded-2xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#181818] text-[#888888] uppercase tracking-wider text-[10px] border-b border-[#262626]">
              <tr>
                <th className="py-3 px-4 w-8">
                  <input
                    type="checkbox"
                    checked={selectedIds.length > 0 && selectedIds.length === filteredProducts.length}
                    onChange={toggleSelectAll}
                    className="accent-[#C5A059] cursor-pointer"
                  />
                </th>
                <th className="py-3 px-3">Spirit / Item</th>
                <th className="py-3 px-3 text-center">POS Stock</th>
                <th className="py-3 px-3 text-center">Safety Stock</th>
                <th className="py-3 px-3 text-center">Web Available</th>
                <th className="py-3 px-3 text-center">POS Price</th>
                <th className="py-3 px-3 text-center">Web Price</th>
                <th className="py-3 px-3 text-center">Sell Online</th>
                <th className="py-3 px-3 text-center">Curbside</th>
                <th className="py-3 px-3 text-center">Delivery</th>
                <th className="py-3 px-3 text-center">Featured</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#202020]">
              {filteredProducts.map(p => {
                const settings = p.onlineSettings || {};
                const isOnline = !!settings.sellOnline;
                const safety = settings.safetyStock ?? 1;
                const availableWeb = Math.max(0, p.stockQuantity - safety);
                const isSelected = selectedIds.includes(p.id);

                return (
                  <tr
                    key={p.id}
                    className={`hover:bg-[#1A1A1A] transition-colors ${
                      isSelected ? 'bg-[#1C1810]' : ''
                    }`}
                  >
                    <td className="py-3 px-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectOne(p.id)}
                        className="accent-[#C5A059] cursor-pointer"
                      />
                    </td>

                    <td className="py-3 px-3">
                      <div className="flex items-center space-x-2.5">
                        {p.imageUrl ? (
                          <img
                            src={p.imageUrl}
                            alt=""
                            className="w-8 h-8 rounded-lg object-cover bg-[#222222] border border-[#333333] shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-[#222222] text-[#888888] flex items-center justify-center shrink-0">
                            <Package className="w-4 h-4" />
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-white truncate max-w-[200px]">
                            {p.name}
                          </div>
                          <div className="text-[10px] text-[#777777] font-mono">
                            {p.sku} • {p.size || '750ml'} • {p.categoryName || 'Spirits'}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-center font-mono font-bold text-white">
                      {p.stockQuantity}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <input
                        type="number"
                        min="0"
                        value={safety}
                        onChange={e => handleUpdateSafetyStock(p.id, parseInt(e.target.value) || 0)}
                        className="w-14 bg-[#1A1A1A] border border-[#333333] rounded px-1.5 py-1 text-center font-mono text-white text-xs outline-none focus:border-[#C5A059]"
                      />
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span
                        className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                          availableWeb > 0
                            ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                            : 'bg-rose-950/60 text-rose-400 border border-rose-800/40'
                        }`}
                      >
                        {availableWeb} units
                      </span>
                    </td>

                    <td className="py-3 px-3 text-center font-mono text-[#AAAAAA]">
                      ${p.price.toFixed(2)}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center">
                        <span className="text-[#666666] mr-0.5">$</span>
                        <input
                          type="number"
                          step="0.01"
                          placeholder={p.price.toFixed(2)}
                          defaultValue={settings.onlinePrice !== undefined ? settings.onlinePrice : ''}
                          onBlur={e => handleUpdateOnlinePrice(p.id, e.target.value)}
                          className="w-16 bg-[#1A1A1A] border border-[#333333] rounded px-1.5 py-1 text-center font-mono text-white text-xs outline-none focus:border-[#C5A059]"
                        />
                      </div>
                    </td>

                    {/* Channel Toggles */}
                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleOnlineSetting(p.id, 'sellOnline', isOnline)}
                        className={`w-7 h-7 rounded-lg inline-flex items-center justify-center transition-colors cursor-pointer ${
                          isOnline
                            ? 'bg-[#C5A059] text-black shadow-sm'
                            : 'bg-[#222222] text-[#666666] hover:text-white'
                        }`}
                        title={isOnline ? 'Published Online' : 'Hidden from Online Store'}
                      >
                        <Globe className="w-3.5 h-3.5" />
                      </button>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() =>
                          handleToggleOnlineSetting(p.id, 'pickupAvailable', !!settings.pickupAvailable)
                        }
                        className={`w-7 h-7 rounded-lg inline-flex items-center justify-center transition-colors cursor-pointer ${
                          settings.pickupAvailable !== false
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-[#222222] text-[#666666] hover:text-white'
                        }`}
                        title={settings.pickupAvailable !== false ? 'Pickup Enabled' : 'Pickup Disabled'}
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                      </button>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() =>
                          handleToggleOnlineSetting(p.id, 'deliveryAvailable', !!settings.deliveryAvailable)
                        }
                        className={`w-7 h-7 rounded-lg inline-flex items-center justify-center transition-colors cursor-pointer ${
                          settings.deliveryAvailable !== false
                            ? 'bg-sky-600 text-white shadow-sm'
                            : 'bg-[#222222] text-[#666666] hover:text-white'
                        }`}
                        title={settings.deliveryAvailable !== false ? 'Delivery Enabled' : 'Delivery Disabled'}
                      >
                        <Truck className="w-3.5 h-3.5" />
                      </button>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() =>
                          handleToggleOnlineSetting(p.id, 'isFeatured', !!settings.isFeatured)
                        }
                        className={`w-7 h-7 rounded-lg inline-flex items-center justify-center transition-colors cursor-pointer ${
                          settings.isFeatured
                            ? 'bg-amber-400 text-black shadow-sm'
                            : 'bg-[#222222] text-[#666666] hover:text-white'
                        }`}
                        title={settings.isFeatured ? 'Featured on Web Homepage' : 'Not Featured'}
                      >
                        <Star className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
