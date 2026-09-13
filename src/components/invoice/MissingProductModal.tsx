import React, { useState, useEffect } from 'react';
import { Category, StoreSettings } from '../../types';
import { X, PackagePlus, Sparkles, Check } from 'lucide-react';

interface MissingProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: {
    name: string;
    brand?: string;
    categoryId: string;
    sku: string;
    barcode: string;
    size: string;
    cost: number;
    price: number;
    taxRate: number;
    imageUrl?: string;
  };
  categories: Category[];
  settings: StoreSettings | null;
  onConfirm: (productData: {
    name: string;
    brand?: string;
    categoryId: string;
    sku: string;
    barcode: string;
    size: string;
    cost: number;
    price: number;
    taxRate: number;
    imageUrl: string;
  }) => void;
}

export const MissingProductModal: React.FC<MissingProductModalProps> = ({
  isOpen,
  onClose,
  initialData,
  categories,
  settings,
  onConfirm,
}) => {
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [size, setSize] = useState('750ml');
  const [cost, setCost] = useState(0);
  const [price, setPrice] = useState(0);
  const [taxRate, setTaxRate] = useState(0.0825);
  const [imageUrl, setImageUrl] = useState('');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setBrand(initialData.brand || '');
      setCategoryId(initialData.categoryId || categories[0]?.id || '');
      setSku(initialData.sku || `SKU-${Math.floor(1000 + Math.random() * 9000)}`);
      setBarcode(initialData.barcode || `080${Math.floor(100000000 + Math.random() * 900000000)}`);
      setSize(initialData.size || '750ml');
      setCost(initialData.cost || 0);
      setPrice(initialData.price || (initialData.cost ? Number((initialData.cost * 1.5).toFixed(2)) : 0));
      setTaxRate(initialData.taxRate || settings?.defaultTaxRate || 0.0825);
      setImageUrl(initialData.imageUrl || 'https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=500&auto=format&fit=crop&q=60');
    }
  }, [initialData, categories, settings]);

  if (!isOpen) return null;

  const targetMargin = settings?.targetProfitMarginPercent || 35;
  const margin = price > 0 && cost > 0 ? Number((((price - cost) / price) * 100).toFixed(1)) : 0;

  const handleAutoPrice = () => {
    if (cost > 0) {
      const marginFactor = Math.max(0.05, 1 - (targetMargin / 100));
      setPrice(Number((cost / marginFactor).toFixed(2)));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onConfirm({
      name: name.trim(),
      brand: brand.trim(),
      categoryId: categoryId || categories[0]?.id || 'cat-1',
      sku: sku.trim(),
      barcode: barcode.trim(),
      size: size.trim(),
      cost: Number(cost) || 0,
      price: Number(price) || 0,
      taxRate: Number(taxRate) || 0.0825,
      imageUrl: imageUrl || 'https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=500&auto=format&fit=crop&q=60',
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
      <div className="bg-[#141414] border border-[#262626] rounded-xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#262626] bg-[#1A1A1A]">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <PackagePlus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Create Missing Product (IN-SC-08)
              </h2>
              <p className="text-xs text-[#888888]">
                Pre-filled from invoice line. Verify category, size, and pricing.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#888888] hover:text-white rounded-lg hover:bg-[#262626] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <div>
            <label className="block text-xs font-semibold text-[#AAAAAA] uppercase tracking-wider mb-1">
              Product Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-2 text-sm text-white focus:outline-hidden focus:border-[#C5A059]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#AAAAAA] uppercase tracking-wider mb-1">
                Brand / Producer
              </label>
              <input
                type="text"
                value={brand}
                onChange={e => setBrand(e.target.value)}
                className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-2 text-sm text-white focus:outline-hidden focus:border-[#C5A059]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#AAAAAA] uppercase tracking-wider mb-1">
                Category *
              </label>
              <select
                value={categoryId}
                onChange={e => setCategoryId(e.target.value)}
                className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-2 text-sm text-white focus:outline-hidden focus:border-[#C5A059]"
              >
                {categories.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#AAAAAA] uppercase tracking-wider mb-1">
                SKU *
              </label>
              <input
                type="text"
                required
                value={sku}
                onChange={e => setSku(e.target.value)}
                className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-hidden focus:border-[#C5A059]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#AAAAAA] uppercase tracking-wider mb-1">
                UPC / Barcode *
              </label>
              <input
                type="text"
                required
                value={barcode}
                onChange={e => setBarcode(e.target.value)}
                className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-hidden focus:border-[#C5A059]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#AAAAAA] uppercase tracking-wider mb-1">
                Bottle / Pack Size
              </label>
              <input
                type="text"
                value={size}
                onChange={e => setSize(e.target.value)}
                placeholder="750ml, 1L, etc."
                className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-2 text-sm text-white focus:outline-hidden focus:border-[#C5A059]"
              />
            </div>
          </div>

          {/* Pricing & Margins */}
          <div className="bg-[#1A1A1A] border border-[#262626] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#E5E5E5] uppercase tracking-wider">
                Cost & Retail Pricing (IN-SC-11)
              </span>
              <button
                type="button"
                onClick={handleAutoPrice}
                className="flex items-center space-x-1 text-xs text-[#C5A059] hover:underline cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                <span>Apply {targetMargin}% Target Margin</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-[#888888] mb-1">
                  Vendor Unit Cost ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={cost}
                  onChange={e => setCost(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#111111] border border-[#333333] rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-hidden focus:border-[#C5A059]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-[#888888] mb-1">
                  Retail Selling Price ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={price}
                  onChange={e => setPrice(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#111111] border border-[#333333] rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-hidden focus:border-[#C5A059]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1 border-t border-[#262626]">
              <span className="text-[#888888]">Calculated Margin:</span>
              <span
                className={`font-mono font-bold ${
                  margin >= 30 ? 'text-green-400' : margin >= 20 ? 'text-amber-400' : 'text-red-400'
                }`}
              >
                {margin}% {margin >= targetMargin ? '✓ Optimal' : '⚠️ Below Target'}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#AAAAAA] uppercase tracking-wider mb-1">
              Image URL (Optional)
            </label>
            <input
              type="text"
              value={imageUrl}
              onChange={e => setImageUrl(e.target.value)}
              className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-2 text-xs text-[#CCCCCC] focus:outline-hidden focus:border-[#C5A059]"
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-[#262626]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[#888888] hover:text-white rounded-lg hover:bg-[#262626] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center space-x-2 px-5 py-2 bg-[#C5A059] hover:bg-[#D4AF37] text-black font-bold text-xs uppercase tracking-wider rounded-lg transition-colors shadow-md cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Link As New Product</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
