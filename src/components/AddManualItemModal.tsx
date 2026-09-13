import React, { useState } from 'react';
import { Product, Category, StoreSettings } from '../types';
import { playBeep } from '../utils/audio';
import { api } from '../utils/api';
import {
  X,
  Plus,
  ShoppingBag,
  Database,
  DollarSign,
  Barcode,
  Hash,
  Layers,
  Sparkles,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

interface AddManualItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  settings: StoreSettings | null;
  onAddCustomItemToCart: (product: Product, quantity: number) => void;
  onProductCreated?: (newProduct: Product) => void;
}

export const AddManualItemModal: React.FC<AddManualItemModalProps> = ({
  isOpen,
  onClose,
  categories,
  settings,
  onAddCustomItemToCart,
  onProductCreated,
}) => {
  const [mode, setMode] = useState<'quick' | 'catalog'>('quick');

  // Quick Ad-hoc Item state
  const [quickName, setQuickName] = useState<string>('');
  const [quickPrice, setQuickPrice] = useState<string>('');
  const [quickQty, setQuickQty] = useState<number>(1);
  const [quickCategoryId, setQuickCategoryId] = useState<string>(categories[0]?.id || 'cat-1');
  const [quickTaxable, setQuickTaxable] = useState<boolean>(true);

  // Save to Catalog state
  const [catalogName, setCatalogName] = useState<string>('');
  const [catalogSku, setCatalogSku] = useState<string>('');
  const [catalogBarcode, setCatalogBarcode] = useState<string>('');
  const [catalogCategoryId, setCatalogCategoryId] = useState<string>(categories[0]?.id || 'cat-1');
  const [catalogPrice, setCatalogPrice] = useState<string>('');
  const [catalogCost, setCatalogCost] = useState<string>('');
  const [catalogStock, setCatalogStock] = useState<string>('10');
  const [addToCartAfterSave, setAddToCartAfterSave] = useState<boolean>(true);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleGenerateSkuAndBarcode = () => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const generatedSku = `MAN-${randomSuffix}`;
    const generatedBarcode = `0${Math.floor(10000000000 + Math.random() * 90000000000)}`;
    setCatalogSku(generatedSku);
    setCatalogBarcode(generatedBarcode);
  };

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const name = quickName.trim() || 'Custom Manual Item';
    const priceNum = parseFloat(quickPrice);

    if (isNaN(priceNum) || priceNum < 0) {
      setErrorMsg('Please enter a valid price (e.g. 15.00)');
      playBeep('error');
      return;
    }

    if (quickQty < 1) {
      setErrorMsg('Quantity must be at least 1');
      playBeep('error');
      return;
    }

    const category = categories.find(c => c.id === quickCategoryId);
    const timestamp = Date.now();

    // Create an ad-hoc product representation
    const customProduct: Product = {
      id: `manual-${timestamp}`,
      name: name,
      sku: `MISC-${Math.floor(1000 + Math.random() * 9000)}`,
      barcode: `999${timestamp.toString().slice(-8)}`,
      categoryId: quickCategoryId,
      categoryName: category?.name || 'Custom / Ad-Hoc',
      price: priceNum,
      cost: 0,
      taxRate: quickTaxable ? (settings?.defaultTaxRate || 8.25) : 0,
      size: 'Custom',
      stockQuantity: 9999, // Unconstrained inventory for manual services/items
      lowStockThreshold: 0,
      imageUrl: 'https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=500&auto=format&fit=crop&q=60',
      description: 'Cashier manual entry line item',
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    playBeep('scan');
    onAddCustomItemToCart(customProduct, quickQty);
    onClose();
  };

  const handleCatalogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!catalogName.trim()) {
      setErrorMsg('Product name is required');
      playBeep('error');
      return;
    }

    const priceNum = parseFloat(catalogPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      setErrorMsg('Please enter a valid retail price');
      playBeep('error');
      return;
    }

    const sku = catalogSku.trim() || `SKU-${Date.now().toString().slice(-6)}`;
    const barcode = catalogBarcode.trim() || `UPC-${Date.now().toString().slice(-8)}`;

    setIsSubmitting(true);
    try {
      const category = categories.find(c => c.id === catalogCategoryId);
      const newProd = await api.createProduct({
        name: catalogName.trim(),
        sku,
        barcode,
        categoryId: catalogCategoryId,
        price: priceNum,
        cost: parseFloat(catalogCost) || 0,
        stockQuantity: parseInt(catalogStock) || 0,
        lowStockThreshold: 5,
        size: 'Standard',
        imageUrl: 'https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=500&auto=format&fit=crop&q=60',
        description: 'Added manually from POS terminal',
      });

      playBeep('success');
      if (onProductCreated) {
        onProductCreated(newProd);
      }

      if (addToCartAfterSave) {
        onAddCustomItemToCart(newProd, 1);
      }

      onClose();
    } catch (err: any) {
      console.error('Failed to create manual product', err);
      setErrorMsg(err.message || 'Failed to save product. Check for duplicate SKU or Barcode.');
      playBeep('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-[#0F0F0F] border border-[#262626] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#262626] flex items-center justify-between bg-[#141414]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#C5A059]/10 border border-[#C5A059]/30 flex items-center justify-center text-[#C5A059]">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-serif italic font-bold text-[#F5F5F5]">
                Manual Item Entry
              </h2>
              <p className="text-[11px] text-[#737373]">
                Add custom line items or create new inventory from the POS
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#737373] hover:text-[#E5E5E5] rounded-lg hover:bg-[#262626] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="px-6 pt-4 pb-2 bg-[#0F0F0F]">
          <div className="grid grid-cols-2 p-1 bg-[#1A1A1A] rounded-xl border border-[#262626]">
            <button
              type="button"
              onClick={() => {
                setMode('quick');
                setErrorMsg(null);
              }}
              className={`py-2 px-3 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                mode === 'quick'
                  ? 'bg-[#C5A059] text-black shadow-md'
                  : 'text-[#A3A3A3] hover:text-white'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Quick Custom Item</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('catalog');
                setErrorMsg(null);
                if (!catalogSku) handleGenerateSkuAndBarcode();
              }}
              className={`py-2 px-3 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                mode === 'catalog'
                  ? 'bg-[#C5A059] text-black shadow-md'
                  : 'text-[#A3A3A3] hover:text-white'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Save To Catalog</span>
            </button>
          </div>
        </div>

        {/* Error notification */}
        {errorMsg && (
          <div className="mx-6 mt-2 p-2.5 bg-red-950/60 border border-red-800/60 rounded-xl flex items-center space-x-2 text-red-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Mode 1: Quick Ad-hoc Item */}
        {mode === 'quick' && (
          <form onSubmit={handleQuickSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#A3A3A3] mb-1.5">
                Item Description / Name <span className="text-red-400">*</span>
              </label>
              <input
                id="manual-quick-name"
                type="text"
                required
                placeholder="e.g. Special Reserve Tasting, Gift Wrap, Misc Cigar"
                value={quickName}
                onChange={e => setQuickName(e.target.value)}
                className="w-full bg-[#1A1A1A] border border-[#262626] focus:border-[#C5A059] rounded-xl px-3.5 py-2.5 text-sm text-[#F5F5F5] placeholder:text-[#555] focus:outline-hidden"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#A3A3A3] mb-1.5">
                  Unit Price ($) <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 text-[#737373] absolute left-3 top-3" />
                  <input
                    id="manual-quick-price"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="0.00"
                    value={quickPrice}
                    onChange={e => setQuickPrice(e.target.value)}
                    className="w-full bg-[#1A1A1A] border border-[#262626] focus:border-[#C5A059] rounded-xl pl-9 pr-3 py-2.5 text-sm font-mono text-[#F5F5F5] placeholder:text-[#555] focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#A3A3A3] mb-1.5">
                  Quantity
                </label>
                <div className="flex items-center bg-[#1A1A1A] border border-[#262626] rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setQuickQty(prev => Math.max(1, prev - 1))}
                    className="px-3 py-2.5 text-[#A3A3A3] hover:text-white hover:bg-[#262626] transition-colors cursor-pointer font-bold"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={quickQty}
                    onChange={e => setQuickQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-transparent text-center text-sm font-mono text-[#F5F5F5] focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setQuickQty(prev => prev + 1)}
                    className="px-3 py-2.5 text-[#A3A3A3] hover:text-white hover:bg-[#262626] transition-colors cursor-pointer font-bold"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Price Increment Presets */}
            <div>
              <div className="text-[10px] text-[#737373] uppercase font-bold tracking-wider mb-1.5">
                Quick Price Presets
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[5, 10, 15, 20, 25, 50, 100].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setQuickPrice(val.toFixed(2))}
                    className="px-2.5 py-1 bg-[#1A1A1A] hover:bg-[#262626] hover:border-[#C5A059] text-[#C5A059] text-xs font-mono font-bold rounded-lg border border-[#262626] transition-colors cursor-pointer"
                  >
                    ${val}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#A3A3A3] mb-1.5">
                  Category
                </label>
                <select
                  value={quickCategoryId}
                  onChange={e => setQuickCategoryId(e.target.value)}
                  className="w-full bg-[#1A1A1A] border border-[#262626] focus:border-[#C5A059] rounded-xl px-3 py-2.5 text-xs text-[#E5E5E5] focus:outline-hidden"
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center pt-6">
                <label className="flex items-center space-x-2 text-xs text-[#E5E5E5] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={quickTaxable}
                    onChange={e => setQuickTaxable(e.target.checked)}
                    className="w-4 h-4 rounded bg-[#1A1A1A] border-[#262626] text-[#C5A059] focus:ring-0 focus:ring-offset-0 cursor-pointer"
                  />
                  <span>Taxable ({settings?.defaultTaxRate || 8.25}%)</span>
                </label>
              </div>
            </div>

            <div className="pt-3 border-t border-[#262626] flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-[#A3A3A3] hover:text-white rounded-xl cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-[#C5A059] hover:bg-[#b08d48] text-black text-xs font-bold uppercase tracking-wider rounded-xl transition-colors flex items-center space-x-2 cursor-pointer shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span>Add To Current Sale</span>
              </button>
            </div>
          </form>
        )}

        {/* Mode 2: Save to Permanent Catalog */}
        {mode === 'catalog' && (
          <form onSubmit={handleCatalogSubmit} className="p-6 space-y-3.5 max-h-[70vh] overflow-y-auto">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#A3A3A3] mb-1">
                Product Title <span className="text-red-400">*</span>
              </label>
              <input
                id="catalog-item-name"
                type="text"
                required
                placeholder="e.g. Blanton's Single Barrel Bourbon 750ml"
                value={catalogName}
                onChange={e => setCatalogName(e.target.value)}
                className="w-full bg-[#1A1A1A] border border-[#262626] focus:border-[#C5A059] rounded-xl px-3.5 py-2 text-sm text-[#F5F5F5] placeholder:text-[#555] focus:outline-hidden"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#A3A3A3] mb-1">
                  Category
                </label>
                <select
                  value={catalogCategoryId}
                  onChange={e => setCatalogCategoryId(e.target.value)}
                  className="w-full bg-[#1A1A1A] border border-[#262626] focus:border-[#C5A059] rounded-xl px-3 py-2 text-xs text-[#E5E5E5] focus:outline-hidden"
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#A3A3A3] mb-1">
                  Retail Price ($) <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <DollarSign className="w-3.5 h-3.5 text-[#737373] absolute left-3 top-2.5" />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="0.00"
                    value={catalogPrice}
                    onChange={e => setCatalogPrice(e.target.value)}
                    className="w-full bg-[#1A1A1A] border border-[#262626] focus:border-[#C5A059] rounded-xl pl-8 pr-3 py-2 text-sm font-mono text-[#F5F5F5] focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#A3A3A3]">
                    SKU Code
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateSkuAndBarcode}
                    className="text-[10px] text-[#C5A059] hover:underline font-mono"
                  >
                    Auto-Gen
                  </button>
                </div>
                <div className="relative">
                  <Hash className="w-3.5 h-3.5 text-[#737373] absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="SKU-XXXX"
                    value={catalogSku}
                    onChange={e => setCatalogSku(e.target.value)}
                    className="w-full bg-[#1A1A1A] border border-[#262626] focus:border-[#C5A059] rounded-xl pl-8 pr-3 py-2 text-xs font-mono text-[#F5F5F5] focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#A3A3A3] mb-1">
                  UPC / Barcode
                </label>
                <div className="relative">
                  <Barcode className="w-3.5 h-3.5 text-[#737373] absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Scan or enter UPC"
                    value={catalogBarcode}
                    onChange={e => setCatalogBarcode(e.target.value)}
                    className="w-full bg-[#1A1A1A] border border-[#262626] focus:border-[#C5A059] rounded-xl pl-8 pr-3 py-2 text-xs font-mono text-[#F5F5F5] focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#A3A3A3] mb-1">
                  Wholesale Cost ($)
                </label>
                <div className="relative">
                  <DollarSign className="w-3.5 h-3.5 text-[#737373] absolute left-3 top-2.5" />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={catalogCost}
                    onChange={e => setCatalogCost(e.target.value)}
                    className="w-full bg-[#1A1A1A] border border-[#262626] focus:border-[#C5A059] rounded-xl pl-8 pr-3 py-2 text-xs font-mono text-[#F5F5F5] focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#A3A3A3] mb-1">
                  Initial Stock Qty
                </label>
                <input
                  type="number"
                  min="0"
                  value={catalogStock}
                  onChange={e => setCatalogStock(e.target.value)}
                  className="w-full bg-[#1A1A1A] border border-[#262626] focus:border-[#C5A059] rounded-xl px-3 py-2 text-xs font-mono text-[#F5F5F5] focus:outline-hidden"
                />
              </div>
            </div>

            <div className="pt-2">
              <label className="flex items-center space-x-2 text-xs text-[#E5E5E5] cursor-pointer">
                <input
                  type="checkbox"
                  checked={addToCartAfterSave}
                  onChange={e => setAddToCartAfterSave(e.target.checked)}
                  className="w-4 h-4 rounded bg-[#1A1A1A] border-[#262626] text-[#C5A059] focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
                <span>Also add 1 unit to the current POS cart immediately</span>
              </label>
            </div>

            <div className="pt-3 border-t border-[#262626] flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-[#A3A3A3] hover:text-white rounded-xl cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-[#C5A059] hover:bg-[#b08d48] disabled:opacity-50 text-black text-xs font-bold uppercase tracking-wider rounded-xl transition-colors flex items-center space-x-2 cursor-pointer shadow-md"
              >
                <Database className="w-4 h-4" />
                <span>{isSubmitting ? 'Saving...' : 'Save & Register Product'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
