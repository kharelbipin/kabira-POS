import React, { useState, useMemo, useEffect } from 'react';
import { COMMON_PRODUCE_PLUS, ProducePLUItem } from '../../services/industryConfigService';
import { Product } from '../../types';
import { playBeep } from '../../utils/audio';
import {
  X,
  Scale,
  Apple,
  Search,
  CheckCircle2,
  RefreshCw,
  Hash,
  ShoppingBag,
  Sliders,
  Sparkles,
} from 'lucide-react';

interface ProducePluScaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProduceToCart: (product: Product, weightInLbs: number, totalPrice: number) => void;
}

export const ProducePluScaleModal: React.FC<ProducePluScaleModalProps> = ({
  isOpen,
  onClose,
  onAddProduceToCart,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<ProducePLUItem | null>(COMMON_PRODUCE_PLUS[0]);
  const [scaleWeight, setScaleWeight] = useState<number>(1.85); // simulated live scale weight in lbs
  const [tareWeight, setTareWeight] = useState<number>(0.03); // standard plastic bag tare
  const [isScaleReading, setIsScaleReading] = useState<boolean>(false);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [quantityMultiplier, setQuantityMultiplier] = useState<number>(1);

  useEffect(() => {
    if (selectedItem) {
      setTareWeight(selectedItem.tareWeight || 0.03);
    }
  }, [selectedItem]);

  const filteredItems = useMemo(() => {
    let list = COMMON_PRODUCE_PLUS;
    if (activeCategory !== 'All') {
      list = list.filter(item => item.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        item =>
          item.name.toLowerCase().includes(q) ||
          item.plu.includes(q) ||
          item.category.toLowerCase().includes(q)
      );
    }
    return list;
  }, [searchQuery, activeCategory]);

  if (!isOpen) return null;

  const netWeight = Math.max(0, Math.round((scaleWeight - tareWeight) * 100) / 100);
  const pricePerLb = selectedItem ? selectedItem.pricePerLb : 0;
  const totalPrice = Math.round(netWeight * pricePerLb * quantityMultiplier * 100) / 100;

  const handleSimulateScaleWeight = (weight: number) => {
    setIsScaleReading(true);
    playBeep('click');
    setTimeout(() => {
      setScaleWeight(weight);
      setIsScaleReading(false);
    }, 150);
  };

  const handleZeroScale = () => {
    playBeep('click');
    setScaleWeight(0.0);
  };

  const handleConfirmAndAddToCart = () => {
    if (!selectedItem) return;
    if (netWeight <= 0) {
      playBeep('error');
      return;
    }

    playBeep('beep');

    const produceProduct: Product = {
      id: `plu-${selectedItem.plu}-${Date.now()}`,
      name: `${selectedItem.name} (${selectedItem.plu})`,
      sku: `PLU-${selectedItem.plu}`,
      barcode: selectedItem.plu,
      price: totalPrice,
      cost: Math.round(totalPrice * 0.55 * 100) / 100,
      categoryId: 'cat-produce',
      categoryName: 'Fresh Produce',
      size: `${netWeight.toFixed(2)} lbs @ $${pricePerLb.toFixed(2)}/lb`,
      stockQuantity: 999,
      lowStockThreshold: 10,
      imageUrl: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=150',
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onAddProduceToCart(produceProduct, netWeight, totalPrice);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 select-none animate-in fade-in duration-150">
      <div className="bg-[#0F172A] border border-emerald-500/30 rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden text-slate-100 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-[#020617] px-6 py-4 border-b border-emerald-500/20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-black tracking-tight text-white">Grocery Scale & Produce PLU</h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold border border-emerald-500/40">
                  NTEP CERTIFIED
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                POS Bridge Live Scale Reader • 4-Digit & 5-Digit Produce Lookup
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: PLU Directory & Search (7 cols) */}
          <div className="lg:col-span-7 space-y-4 flex flex-col">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search produce name or enter PLU code (e.g. 4011, Bananas, 4046)..."
                className="w-full bg-slate-900 border border-slate-700/80 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-hidden focus:border-emerald-500 font-mono"
                autoFocus
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs">
              {['All', 'Fruit', 'Vegetable', 'Herb', 'Organic'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl font-bold uppercase tracking-wider text-[11px] transition-all cursor-pointer whitespace-nowrap ${
                    activeCategory === cat
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Produce PLU Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[360px] overflow-y-auto pr-1">
              {filteredItems.map(item => {
                const isSelected = selectedItem?.plu === item.plu;
                return (
                  <button
                    key={item.plu}
                    onClick={() => {
                      playBeep('click');
                      setSelectedItem(item);
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-emerald-950/60 border-emerald-400 shadow-md ring-2 ring-emerald-500/30'
                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <span className="text-2xl">{item.image}</span>
                      <span className="px-1.5 py-0.5 rounded-md bg-slate-800 text-emerald-400 font-mono font-black text-xs border border-slate-700">
                        {item.plu}
                      </span>
                    </div>
                    <div className="mt-2">
                      <div className="text-xs font-bold text-slate-100 line-clamp-1">{item.name}</div>
                      <div className="text-[11px] font-mono text-emerald-300 font-bold mt-0.5">
                        ${item.pricePerLb.toFixed(2)} / lb
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Live Scale Readout & Ring-Up (5 cols) */}
          <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-3xl p-5 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  Live POS Bridge Scale
                </span>
                <span className="flex items-center space-x-1.5 text-xs text-emerald-400 font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>ONLINE (0.005 lb tolerance)</span>
                </span>
              </div>

              {/* Big Digital Scale Display */}
              <div className="mt-4 bg-[#020617] border-2 border-emerald-500/50 rounded-2xl p-4 text-center shadow-inner relative overflow-hidden">
                <div className="text-xs text-slate-400 font-mono flex items-center justify-between px-2">
                  <span>GROSS: {scaleWeight.toFixed(2)} lb</span>
                  <span>TARE: -{tareWeight.toFixed(2)} lb</span>
                </div>

                <div className="py-2">
                  <div className="text-5xl font-black font-mono text-emerald-400 tracking-tight flex items-baseline justify-center space-x-2">
                    <span>{netWeight.toFixed(2)}</span>
                    <span className="text-xl font-bold text-emerald-600">lbs</span>
                  </div>
                  <div className="text-xs font-mono text-slate-400 uppercase tracking-widest mt-1">
                    NET SCALE WEIGHT
                  </div>
                </div>

                {/* Scale Zero / Tare controls */}
                <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={handleZeroScale}
                    className="py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-mono font-bold text-slate-300"
                  >
                    ZERO
                  </button>
                  {[1.25, 2.50, 4.00].map(w => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => handleSimulateScaleWeight(w)}
                      className="py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-mono font-bold text-emerald-400"
                    >
                      {w} lb
                    </button>
                  ))}
                </div>
              </div>

              {/* Selected Item Breakdown */}
              {selectedItem && (
                <div className="mt-4 p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">{selectedItem.name}</span>
                    <span className="text-xs font-mono font-bold text-emerald-300">PLU #{selectedItem.plu}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                    <span>Rate:</span>
                    <span>${selectedItem.pricePerLb.toFixed(2)} / lb</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                    <span>Net Weight:</span>
                    <span>{netWeight.toFixed(2)} lbs</span>
                  </div>
                  {quantityMultiplier > 1 && (
                    <div className="flex items-center justify-between text-xs text-amber-400 font-mono">
                      <span>Multiplier:</span>
                      <span>{quantityMultiplier}x bags</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-slate-700 flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-white">Computed Total:</span>
                    <span className="text-2xl font-black font-mono text-emerald-400">
                      ${totalPrice.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {/* Quantity Multiplier buttons */}
              <div className="mt-3 flex items-center justify-between bg-slate-800/40 p-2 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                  <Hash className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Qty Mult:</span>
                </span>
                <div className="flex items-center space-x-1">
                  {[1, 2, 3, 5, 10].map(mult => (
                    <button
                      key={mult}
                      type="button"
                      onClick={() => setQuantityMultiplier(mult)}
                      className={`px-2 py-0.5 rounded-lg text-xs font-mono font-bold transition-all ${
                        quantityMultiplier === mult
                          ? 'bg-emerald-500 text-slate-950 shadow-xs'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {mult}x
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleConfirmAndAddToCart}
                disabled={!selectedItem || netWeight <= 0}
                className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center space-x-2 transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Add Produce to Cart (${totalPrice.toFixed(2)})</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
