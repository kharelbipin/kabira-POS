import React, { useMemo, useState } from 'react';
import { Barcode, Printer, X, Minus, Plus, CheckCircle2, AlertCircle } from 'lucide-react';
import { Product } from '../types';
import { hardwareStore } from '../hardware/HardwareStore';
import { playBeep } from '../utils/audio';

interface PrintLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
}

export const PrintLabelModal: React.FC<PrintLabelModalProps> = ({ isOpen, onClose, products }) => {
  const [query, setQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [labelCount, setLabelCount] = useState('1');
  const [isPrinting, setIsPrinting] = useState(false);
  const [message, setMessage] = useState<{type:'success'|'error';text:string}|null>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return products.filter(p =>
      String(p.barcode || '').toLowerCase().includes(q) ||
      String(p.sku || '').toLowerCase().includes(q) ||
      String(p.name || '').toLowerCase().includes(q)
    ).slice(0, 8);
  }, [products, query]);

  if (!isOpen) return null;

  const choose = (product: Product) => {
    setSelectedProduct(product);
    setQuery(product.barcode || product.name);
    setMessage(null);
    playBeep('click');
  };

  const handlePrint = async () => {
    if (!selectedProduct) {
      setMessage({type:'error', text:'Scan or select an item first.'});
      playBeep('error');
      return;
    }

    const count = Math.max(1, Math.min(500, parseInt(labelCount, 10) || 1));
    setLabelCount(String(count));
    setIsPrinting(true);
    setMessage(null);

    try {
      const price = Number(selectedProduct.price || 0);
      const upc = String(selectedProduct.barcode || '').trim();
      const label = [
        String(selectedProduct.name || 'Item').trim(),
        selectedProduct.size ? `SIZE: ${selectedProduct.size}` : '',
        `PRICE: $${price.toFixed(2)}`,
        `UPC: ${upc || 'N/A'}`,
        upc ? `|||| ${upc} ||||` : '',
        '',
        ''
      ].filter(Boolean).join('\n');

      for (let i = 0; i < count; i += 1) {
        const result = await hardwareStore.printReceipt(label, { reason: 'Product label print' });
        if (!result.success) throw new Error(result.message || result.error || 'Label print failed.');
      }

      playBeep('success');
      setMessage({type:'success', text:`${count} label${count === 1 ? '' : 's'} sent to the configured printer.`});
    } catch (error: any) {
      playBeep('error');
      setMessage({type:'error', text:error?.message || 'Unable to print label.'});
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 text-slate-900">
        <div className="bg-sky-600 text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Printer className="w-5 h-5" />
            <div>
              <h2 className="text-lg font-black">Print Label</h2>
              <p className="text-[11px] text-sky-100">Scan a barcode or search inventory.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="w-9 h-9 rounded-lg hover:bg-white/10 flex items-center justify-center cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {message && (
            <div className={`rounded-xl border px-3 py-2.5 text-xs font-semibold flex items-center gap-2 ${message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
              {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{message.text}</span>
            </div>
          )}

          <div className="space-y-1.5 relative">
            <label className="text-sm font-bold text-slate-700">Scan or Search Item</label>
            <div className="relative">
              <Barcode className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
              <input
                autoFocus
                value={query}
                onChange={e => {
                  const value = e.target.value;
                  setQuery(value);
                  setSelectedProduct(null);
                  const exact = products.find(p => String(p.barcode || '').trim() === value.trim());
                  if (exact) setSelectedProduct(exact);
                }}
                onKeyDown={e => {
                  if (e.key !== 'Enter') return;
                  e.preventDefault();
                  const exact = products.find(p => String(p.barcode || '').trim() === query.trim());
                  if (exact) choose(exact);
                  else if (matches[0]) choose(matches[0]);
                }}
                placeholder="Scan UPC or type product name / SKU"
                className="w-full h-12 pl-11 pr-4 border-2 border-slate-300 focus:border-sky-500 rounded-xl outline-none text-sm font-medium"
              />
            </div>

            {!selectedProduct && query.trim() && matches.length > 0 && (
              <div className="absolute left-0 right-0 top-[76px] z-20 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                {matches.map(product => (
                  <button key={product.id} type="button" onClick={() => choose(product)} className="w-full text-left px-4 py-2.5 hover:bg-slate-50 border-b border-slate-100 last:border-b-0 cursor-pointer">
                    <div className="text-sm font-bold">{product.name}</div>
                    <div className="text-[11px] text-slate-500 font-mono">UPC {product.barcode || 'N/A'} • {product.size || 'No size'} • ${Number(product.price || 0).toFixed(2)}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedProduct && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-2">
                <span className="text-[10px] uppercase font-bold text-slate-400">Product</span>
                <div className="text-sm font-black">{selectedProduct.name}</div>
              </div>
              <div><span className="text-[10px] uppercase font-bold text-slate-400">Size</span><div className="text-sm font-bold">{selectedProduct.size || '—'}</div></div>
              <div><span className="text-[10px] uppercase font-bold text-slate-400">Price</span><div className="text-lg font-black text-sky-700">${Number(selectedProduct.price || 0).toFixed(2)}</div></div>
              <div className="sm:col-span-4"><span className="text-[10px] uppercase font-bold text-slate-400">UPC</span><div className="text-sm font-mono font-bold">{selectedProduct.barcode || 'N/A'}</div></div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-slate-700">No. of Labels</label>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setLabelCount(String(Math.max(1,(parseInt(labelCount,10)||1)-1)))} className="w-12 h-12 rounded-xl border border-slate-300 bg-slate-100 hover:bg-slate-200 flex items-center justify-center cursor-pointer"><Minus className="w-5 h-5" /></button>
              <input type="number" min="1" max="500" inputMode="numeric" value={labelCount} onChange={e => setLabelCount(e.target.value.replace(/\D/g,'').slice(0,3))} className="flex-1 h-12 border-2 border-slate-300 focus:border-sky-500 rounded-xl px-4 text-center text-xl font-black font-mono outline-none" />
              <button type="button" onClick={() => setLabelCount(String(Math.min(500,(parseInt(labelCount,10)||1)+1)))} className="w-12 h-12 rounded-xl border border-slate-300 bg-slate-100 hover:bg-slate-200 flex items-center justify-center cursor-pointer"><Plus className="w-5 h-5" /></button>
            </div>
            <p className="text-[11px] text-slate-500">Type the label quantity directly for large batches.</p>
          </div>
        </div>

        <div className="px-5 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button type="button" onClick={onClose} className="px-5 h-11 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-sm font-bold cursor-pointer">Cancel</button>
          <button type="button" onClick={handlePrint} disabled={!selectedProduct || isPrinting} className="px-6 h-11 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-black flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
            <Printer className="w-4 h-4" />
            <span>{isPrinting ? 'Printing...' : 'Print Label'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
