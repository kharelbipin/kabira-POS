import React, { useState } from 'react';
import { Product } from '../../types';
import { playBeep } from '../../utils/audio';
import {
  X,
  Flame,
  CheckCircle2,
  Plus,
  AlertTriangle,
  Sparkles,
  Utensils,
} from 'lucide-react';

interface MenuModifiersModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onApplyModifiers: (itemNotes: string, addedCost: number) => void;
}

export const MenuModifiersModal: React.FC<MenuModifiersModalProps> = ({
  isOpen,
  onClose,
  product,
  onApplyModifiers,
}) => {
  const [temperature, setTemperature] = useState<string>('Medium Rare');
  const [selectedSide, setSelectedSide] = useState<string>('Seasoned French Fries');
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [specialInstructions, setSpecialInstructions] = useState<string>('');
  const [isGlutenFree, setIsGlutenFree] = useState<boolean>(false);
  const [hasAllergy, setHasAllergy] = useState<boolean>(false);

  if (!isOpen || !product) return null;

  const meatTemperatures = ['Rare', 'Medium Rare', 'Medium', 'Medium Well', 'Well Done'];
  const sides = [
    'Seasoned French Fries',
    'Sweet Potato Fries (+ $1.50)',
    'Loaded Baked Potato (+ $2.00)',
    'Caesar Salad',
    'Steamed Garlic Broccoli',
    'Crispy Onion Rings (+ $2.00)',
  ];

  const addonsList = [
    { name: 'Truffle Butter Glaze', price: 2.50 },
    { name: 'Applewood Smoked Bacon', price: 2.00 },
    { name: 'Sautéed Wild Mushrooms', price: 3.00 },
    { name: 'Caramelized Sweet Onions', price: 1.50 },
    { name: 'Extra Sharp Cheddar', price: 1.50 },
  ];

  const toggleAddon = (name: string) => {
    playBeep('click');
    setSelectedAddons(prev =>
      prev.includes(name) ? prev.filter(a => a !== name) : [...prev, name]
    );
  };

  const calculatedAddonCost = selectedAddons.reduce((sum, name) => {
    const item = addonsList.find(a => a.name === name);
    return sum + (item ? item.price : 0);
  }, 0) + (selectedSide.includes('(+ $1.50)') ? 1.50 : selectedSide.includes('(+ $2.00)') ? 2.00 : 0);

  const handleSaveAndApply = () => {
    playBeep('beep');
    const notesParts: string[] = [];
    if (temperature) notesParts.push(`Temp: ${temperature}`);
    if (selectedSide) notesParts.push(`Side: ${selectedSide.replace(/ \(\+.*?\)/, '')}`);
    if (selectedAddons.length > 0) notesParts.push(`Add: ${selectedAddons.join(', ')}`);
    if (isGlutenFree) notesParts.push('**GLUTEN-FREE**');
    if (hasAllergy) notesParts.push('⚠️ ALLERGY ALERT');
    if (specialInstructions.trim()) notesParts.push(`Note: ${specialInstructions.trim()}`);

    onApplyModifiers(notesParts.join(' • '), calculatedAddonCost);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 select-none animate-in fade-in duration-150">
      <div className="bg-[#0F172A] border border-rose-500/30 rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#020617] px-6 py-4 border-b border-rose-500/20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">{product.name}</h2>
              <p className="text-xs text-slate-400">
                Menu Modifiers, Cook Temperatures & Kitchen Prep Notes
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Meat Temperature Selection */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-rose-500" />
              <span>Cooking Temperature</span>
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {meatTemperatures.map(temp => (
                <button
                  key={temp}
                  type="button"
                  onClick={() => {
                    playBeep('click');
                    setTemperature(temp);
                  }}
                  className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    temperature === temp
                      ? 'bg-rose-600 text-white shadow-xs ring-2 ring-rose-500/40'
                      : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {temp}
                </button>
              ))}
            </div>
          </div>

          {/* Side Choice */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2 block">
              Included Side Choice:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {sides.map(side => (
                <button
                  key={side}
                  type="button"
                  onClick={() => {
                    playBeep('click');
                    setSelectedSide(side);
                  }}
                  className={`p-2.5 text-left rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    selectedSide === side
                      ? 'bg-slate-800 border-2 border-rose-500 text-white shadow-xs'
                      : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-850'
                  }`}
                >
                  {side}
                </button>
              ))}
            </div>
          </div>

          {/* Add-ons List */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2 block">
              Premium Add-Ons & Toppings:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {addonsList.map(addon => {
                const isChecked = selectedAddons.includes(addon.name);
                return (
                  <button
                    key={addon.name}
                    type="button"
                    onClick={() => toggleAddon(addon.name)}
                    className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-all cursor-pointer ${
                      isChecked
                        ? 'bg-rose-950/40 border-rose-500 text-white shadow-xs'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
                    }`}
                  >
                    <span className="font-semibold">{addon.name}</span>
                    <span className="font-mono text-emerald-400 font-bold">+${addon.price.toFixed(2)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Allergies & Flags */}
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => setIsGlutenFree(!isGlutenFree)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                isGlutenFree
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              🌾 Gluten-Free Kitchen Prep
            </button>
            <button
              type="button"
              onClick={() => setHasAllergy(!hasAllergy)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                hasAllergy
                  ? 'bg-red-500/20 border-red-500 text-red-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              ⚠️ Severe Allergy Warning
            </button>
          </div>

          {/* Special Instructions */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">
              Special Kitchen Instructions / Prep Notes:
            </label>
            <input
              type="text"
              value={specialInstructions}
              onChange={e => setSpecialInstructions(e.target.value)}
              placeholder="e.g. Dressing on side, extra crispy fries, no onions..."
              className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-hidden focus:border-rose-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#020617] px-6 py-3.5 border-t border-slate-800 flex items-center justify-between">
          <div className="text-xs font-mono text-slate-300">
            <span>Extra Modifier Cost: </span>
            <span className="text-emerald-400 font-bold">+${calculatedAddonCost.toFixed(2)}</span>
          </div>
          <button
            type="button"
            onClick={handleSaveAndApply}
            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase tracking-wider shadow-md flex items-center space-x-1.5 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Apply Modifiers to Item</span>
          </button>
        </div>
      </div>
    </div>
  );
};
