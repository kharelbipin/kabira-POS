import React, { useState } from 'react';
import { Product } from '../types';
import { playBeep } from '../utils/audio';
import { ScanBarcode, CheckCircle2, Search, X, Volume2, Sparkles, AlertCircle } from 'lucide-react';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onScanBarcode: (barcode: string) => void;
  cartCount?: number;
  cartTotal?: number;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  products,
  onScanBarcode,
  cartCount = 0,
  cartTotal = 0,
}) => {
  const [manualBarcode, setManualBarcode] = useState<string>('');
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string; productName?: string; price?: number } | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleTriggerScan = (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;

    playBeep('scan');
    setLastScanned(trimmed);

    const found = products.find(p => p.barcode === trimmed || p.sku.toLowerCase() === trimmed.toLowerCase() || (p.barcodes && p.barcodes.some(b => b.barcode.toLowerCase() === trimmed.toLowerCase())));
    if (found) {
      setScanResult({
        success: true,
        message: `Automatically Added to Cart: ${found.name} (${found.size})`,
        productName: found.name,
        price: found.price,
      });
      onScanBarcode(trimmed);
    } else {
      setScanResult({ success: false, message: `No product found matching barcode "${trimmed}"` });
      playBeep('error');
    }

    // Keep focus in input for continuous scanning
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleTriggerScan(manualBarcode);
    setManualBarcode('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 select-none">
      <div className="bg-[#0F0F0F] border border-[#262626] rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden text-[#E5E5E5] animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="bg-[#0A0A0A] px-6 py-4 border-b border-[#262626] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#C5A059]/15 text-[#C5A059] flex items-center justify-center">
              <ScanBarcode className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-serif italic text-[#F5F5F5]">Barcode Scanner Terminal</h2>
              <p className="text-xs text-[#737373] mt-0.5">USB / Bluetooth / Keyboard Emulation Mode</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#737373] hover:text-white p-1 rounded cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Laser Scanner Animation graphic */}
          <div className="relative bg-[#0A0A0A] rounded-xl p-4 border border-[#262626] text-center overflow-hidden">
            <div className="absolute inset-x-0 top-1/2 h-0.5 bg-[#C5A059] shadow-[0_0_8px_#C5A059] animate-pulse pointer-events-none" />
            <div className="font-mono text-2xl tracking-[10px] text-[#404040] py-4 select-none">
              ||||| | |||| ||| |||||||
            </div>
            <div className="flex items-center justify-center space-x-2 text-xs text-[#C5A059] font-mono">
              <span className="w-2 h-2 rounded-full bg-[#C5A059] animate-ping" />
              <span>Laser Ready • Any USB Barcode Gun is automatically active</span>
            </div>
          </div>

          {/* Feedback banner */}
          {scanResult && (
            <div
              className={`p-3 rounded-lg text-xs flex items-center space-x-2 ${
                scanResult.success
                  ? 'bg-green-950/40 border border-green-800 text-green-300'
                  : 'bg-red-950/40 border border-red-800 text-red-300'
              }`}
            >
              {scanResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              )}
              <span>{scanResult.message}</span>
            </div>
          )}

          {/* Manual Barcode Input Form */}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <ScanBarcode className="w-4 h-4 text-[#737373] absolute left-3 top-3" />
              <input
                ref={inputRef}
                id="scanner-manual-input"
                type="text"
                placeholder="Scan or enter UPC / Barcode (e.g. 080480015003)..."
                value={manualBarcode}
                onChange={e => setManualBarcode(e.target.value)}
                autoFocus
                className="w-full bg-[#141414] border border-[#262626] rounded-lg pl-9 pr-3 py-2 text-sm text-[#E5E5E5] placeholder:text-[#666666] focus:outline-hidden focus:border-[#C5A059] font-mono"
              />
            </div>
            <button
              id="scanner-manual-submit"
              type="submit"
              className="px-5 py-2 bg-[#C5A059] hover:bg-[#D4B06A] text-black font-bold uppercase tracking-wider text-xs rounded-lg transition-colors cursor-pointer"
            >
              Scan & Add
            </button>
          </form>

          {/* Quick Tap Demo Barcodes from Inventory */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#737373] mb-2.5">
              Tap Barcodes Below to Simulate Instant Laser Scan (Bridge Ingest):
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[220px] overflow-y-auto">
              {[...products].sort((a, b) => (a.barcode === '012345678905' ? -1 : b.barcode === '012345678905' ? 1 : 0)).slice(0, 8).map(p => (
                <button
                  key={p.id}
                  type="button"
                  id={`quick-scan-${p.id}`}
                  onClick={() => handleTriggerScan(p.barcode)}
                  className={`flex items-center space-x-2.5 p-2.5 rounded-lg text-left transition-all cursor-pointer group ${
                    p.barcode === '012345678905'
                      ? 'bg-amber-950/40 border border-amber-500/60 hover:bg-amber-900/40'
                      : 'bg-[#141414] hover:bg-[#1A1A1A] border border-[#262626] hover:border-[#C5A059]/40'
                  }`}
                >
                  <img
                    src={p.imageUrl}
                    alt={p.name}
                    className="w-9 h-9 rounded object-cover border border-[#262626] shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-[#E5E5E5] truncate group-hover:text-[#C5A059] transition-colors flex items-center space-x-1.5">
                      <span className="truncate">{p.name}</span>
                      {p.barcode === '012345678905' && (
                        <span className="text-[9px] font-black uppercase bg-amber-400 text-black px-1.5 py-0.2 rounded shrink-0">
                          Demo UPC
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-mono text-[#737373] flex items-center space-x-2 mt-0.5">
                      <span>UPC: {p.barcode}</span>
                      <span>•</span>
                      <span className="text-[#C5A059] font-semibold">${(p.price ?? 0).toFixed(2)}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#0A0A0A] px-6 py-3 border-t border-[#262626] flex justify-between items-center text-xs">
          <div className="flex items-center space-x-2 text-[#737373]">
            <Volume2 className="w-3.5 h-3.5 text-[#C5A059]" />
            <span>Audio feedback enabled</span>
          </div>

          <div className="flex items-center space-x-3">
            {cartCount > 0 && (
              <div className="text-right hidden sm:block">
                <span className="text-[10px] uppercase font-bold text-slate-400">Cart Total: </span>
                <span className="text-amber-400 font-mono font-bold">{cartCount} items • ${cartTotal.toFixed(2)}</span>
              </div>
            )}
            <button
              id="scanner-done-btn"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#C5A059] hover:bg-[#D4B06A] text-black font-bold uppercase tracking-wider text-xs cursor-pointer transition-colors shadow-xs"
            >
              {cartCount > 0 ? `View Cart (${cartCount}) & Done ➔` : 'Done Scanning'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
