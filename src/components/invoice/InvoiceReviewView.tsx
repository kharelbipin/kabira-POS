import React, { useState, useMemo } from 'react';
import {
  ScannedInvoice,
  InvoiceLineItem,
  Product,
  Category,
  User,
  StoreSettings,
} from '../../types';
import { api } from '../../utils/api';
import { playBeep } from '../../utils/audio';
import { MissingProductModal } from './MissingProductModal';
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  FileText,
  Calendar,
  DollarSign,
  Building2,
  Package,
  Layers,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Edit3,
  Save,
  Check,
  X,
  MapPin,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  RotateCcw,
} from 'lucide-react';

interface InvoiceReviewViewProps {
  invoice: ScannedInvoice;
  products: Product[];
  categories: Category[];
  currentUser: User | null;
  settings: StoreSettings | null;
  onConfirmed: (result: any) => void;
  onCancel: () => void;
}

export const InvoiceReviewView: React.FC<InvoiceReviewViewProps> = ({
  invoice: initialInvoice,
  products,
  categories,
  currentUser,
  settings,
  onConfirmed,
  onCancel,
}) => {
  const [invoice, setInvoice] = useState<ScannedInvoice>(initialInvoice);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Missing Product Modal state (IN-SC-08)
  const [missingProductTargetIndex, setMissingProductTargetIndex] = useState<number | null>(null);

  // Duplicate Override Confirmation (IN-SC-14)
  const [managerOverrideDuplicate, setManagerOverrideDuplicate] = useState(false);

  // Expandable Vendor info & File preview toggle
  const [showVendorDetails, setShowVendorDetails] = useState(false);
  const [showOriginalDocument, setShowOriginalDocument] = useState(false);

  // Filter line items
  const [itemFilter, setItemFilter] = useState<'all' | 'review' | 'matched' | 'new_product'>('all');

  const targetMargin = settings?.targetProfitMarginPercent || 35;

  // Header field edits
  const handleUpdateInvoiceField = (field: keyof ScannedInvoice, value: any) => {
    setInvoice(prev => ({ ...prev, [field]: value }));
  };

  // Line item field edits
  const handleUpdateLineField = (index: number, field: keyof InvoiceLineItem, value: any) => {
    setInvoice(prev => {
      const newLines = [...prev.lineItems];
      const target = { ...newLines[index], [field]: value };

      // Recalculate inventory units and extended costs if quantity or pack size changes (IN-SC-07)
      if (field === 'quantity' || field === 'packSize' || field === 'isCaseOrPack' || field === 'unitCost') {
        const qty = field === 'quantity' ? Number(value) : target.quantity;
        const pack = field === 'packSize' ? Number(value) : (target.packSize || 1);
        const isCase = field === 'isCaseOrPack' ? Boolean(value) : target.isCaseOrPack;
        
        target.totalInventoryUnits = isCase ? qty * pack : qty;
        
        const uCost = field === 'unitCost' ? Number(value) : target.unitCost;
        target.extendedCost = Number((uCost * target.totalInventoryUnits).toFixed(2));
        target.lineTotal = Number((target.extendedCost - (target.discount || 0)).toFixed(2));

        // Recalculate margins (IN-SC-10, IN-SC-11)
        if (target.currentPrice && target.currentPrice > 0) {
          target.costDiff = target.currentCost !== undefined ? Number((uCost - target.currentCost).toFixed(2)) : 0;
          target.costDiffPercent = target.currentCost && target.currentCost > 0
            ? Number(((target.costDiff / target.currentCost) * 100).toFixed(1))
            : 0;
          target.newMargin = Number((((target.currentPrice - uCost) / target.currentPrice) * 100).toFixed(1));
        }
        const marginFactor = Math.max(0.05, 1 - (targetMargin / 100));
        target.suggestedPrice = Number((uCost / marginFactor).toFixed(2));
      }

      newLines[index] = target;

      // Recompute invoice totals
      const linesSum = newLines.reduce((sum, l) => sum + (l.status !== 'ignored' ? l.lineTotal : 0), 0);
      return {
        ...prev,
        lineItems: newLines,
        subtotal: Number(linesSum.toFixed(2)),
        totalAmount: Number((linesSum + (prev.taxAmount || 0) + (prev.freightAmount || 0)).toFixed(2)),
      };
    });
  };

  // Re-map line to an existing catalog product
  const handleSelectProductForLine = (index: number, productId: string) => {
    const selectedProd = products.find(p => p.id === productId);
    if (!selectedProd) return;

    setInvoice(prev => {
      const newLines = [...prev.lineItems];
      const target = { ...newLines[index] };

      target.matchedProductId = selectedProd.id;
      target.matchedProductName = selectedProd.name;
      target.matchedProductSku = selectedProd.sku;
      target.status = 'matched';
      target.confidence = 100;
      target.matchType = 'manual';

      const currentCost = selectedProd.cost ?? selectedProd.costPrice ?? 0;
      target.currentCost = currentCost;
      target.costDiff = Number((target.unitCost - currentCost).toFixed(2));
      target.costDiffPercent = currentCost > 0 ? Number(((target.costDiff / currentCost) * 100).toFixed(1)) : 0;
      target.currentPrice = selectedProd.price;
      target.oldMargin = selectedProd.price > 0 && currentCost > 0
        ? Number((((selectedProd.price - currentCost) / selectedProd.price) * 100).toFixed(1))
        : 0;
      target.newMargin = selectedProd.price > 0 && target.unitCost > 0
        ? Number((((selectedProd.price - target.unitCost) / selectedProd.price) * 100).toFixed(1))
        : 0;

      const marginFactor = Math.max(0.05, 1 - (targetMargin / 100));
      target.suggestedPrice = Number((target.unitCost / marginFactor).toFixed(2));

      newLines[index] = target;
      return { ...prev, lineItems: newLines };
    });
    playBeep('success');
  };

  // Handle Missing Product Creation confirmation (IN-SC-08)
  const handleConfirmNewProduct = (newProdData: any) => {
    if (missingProductTargetIndex === null) return;
    const idx = missingProductTargetIndex;

    setInvoice(prev => {
      const newLines = [...prev.lineItems];
      const target = { ...newLines[idx] };

      target.newProductDetails = newProdData;
      target.matchedProductName = newProdData.name;
      target.matchedProductSku = newProdData.sku;
      target.status = 'matched';
      target.confidence = 100;
      target.matchType = 'manual';
      target.unitCost = newProdData.cost;
      target.currentPrice = newProdData.price;
      target.newMargin = newProdData.price > 0 ? Number((((newProdData.price - newProdData.cost) / newProdData.price) * 100).toFixed(1)) : 0;

      newLines[idx] = target;
      return { ...prev, lineItems: newLines };
    });

    setMissingProductTargetIndex(null);
    playBeep('success');
  };

  // Counts
  const reviewCount = invoice.lineItems.filter(l => l.status === 'review' || !l.matchedProductId).length;
  const totalUnits = invoice.lineItems.reduce((s, l) => s + (l.status !== 'ignored' ? l.totalInventoryUnits : 0), 0);

  // Filtered lines for display
  const displayedLines = useMemo(() => {
    if (itemFilter === 'review') {
      return invoice.lineItems.filter(l => l.status === 'review' || !l.matchedProductId);
    }
    if (itemFilter === 'matched') {
      return invoice.lineItems.filter(l => l.status === 'matched');
    }
    if (itemFilter === 'new_product') {
      return invoice.lineItems.filter(l => !l.matchedProductId);
    }
    return invoice.lineItems;
  }, [invoice.lineItems, itemFilter]);

  // Submit and Confirm & Receive Inventory (IN-SC-09, IN-SC-15)
  const handleConfirmInvoice = async () => {
    if (invoice.isDuplicate && !managerOverrideDuplicate) {
      setSubmitError('This invoice is flagged as a duplicate. Manager confirmation override is required to proceed.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const result = await api.confirmAndReceiveInvoice(invoice.id, invoice);
      playBeep('success');
      onConfirmed(result);
    } catch (err: any) {
      playBeep('error');
      setSubmitError(err.message || 'Failed to receive inventory from invoice');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12 animate-in fade-in duration-200">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#111111] p-4 rounded-xl border border-[#262626]">
        <div className="flex items-center space-x-3">
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg bg-[#1A1A1A] hover:bg-[#262626] text-[#888888] hover:text-white transition-colors cursor-pointer"
            title="Back"
          >
            <X className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs uppercase font-mono tracking-wider text-[#C5A059]">
                Invoice Review (IN-SC-12)
              </span>
              <span className="text-[#444444]">•</span>
              <span className="text-xs text-[#888888]">Confidence: {invoice.extractedConfidence}%</span>
            </div>
            <h1 className="text-lg font-bold text-white tracking-wide">
              Invoice #{invoice.invoiceNumber}
            </h1>
          </div>
        </div>

        {/* Global actions */}
        <div className="flex items-center space-x-2">
          {invoice.fileDataUrl && (
            <button
              onClick={() => setShowOriginalDocument(!showOriginalDocument)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#1A1A1A] hover:bg-[#262626] border border-[#262626] text-xs text-[#CCCCCC] hover:text-white transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>{showOriginalDocument ? 'Hide Original File' : 'View Original File'}</span>
            </button>
          )}

          <button
            onClick={onCancel}
            className="px-3.5 py-1.5 rounded-lg bg-[#1A1A1A] hover:bg-[#262626] border border-[#262626] text-xs text-[#888888] hover:text-white transition-colors cursor-pointer"
          >
            Discard
          </button>

          <button
            onClick={handleConfirmInvoice}
            disabled={isSubmitting || (invoice.isDuplicate && !managerOverrideDuplicate)}
            className="flex items-center space-x-2 px-5 py-1.5 bg-[#C5A059] hover:bg-[#D4AF37] disabled:opacity-50 text-black font-bold text-xs uppercase tracking-wider rounded-lg transition-colors shadow-md cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Confirm & Receive ({totalUnits} Units)</span>
          </button>
        </div>
      </div>

      {/* Duplicate Invoice Warning Banner (IN-SC-14) */}
      {invoice.isDuplicate && (
        <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                Duplicate Invoice Detected (IN-SC-14)
              </div>
              <p className="text-xs text-amber-200/90">
                {invoice.duplicateWarning ||
                  `Invoice #${invoice.invoiceNumber} from "${invoice.vendorName}" has already been processed and received.`}
              </p>
            </div>
          </div>

          <label className="flex items-center space-x-2 bg-[#141414] px-3 py-2 rounded-lg border border-amber-700/50 text-xs font-medium cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={managerOverrideDuplicate}
              onChange={e => setManagerOverrideDuplicate(e.target.checked)}
              className="accent-[#C5A059] rounded"
            />
            <span className="text-amber-300">Manager Override Duplicate</span>
          </label>
        </div>
      )}

      {/* Extraction Warnings Banner (IN-SC-18) */}
      {invoice.processingWarnings && invoice.processingWarnings.length > 0 && (
        <div className="p-3 bg-blue-950/30 border border-blue-900/40 rounded-xl text-blue-200 text-xs space-y-1">
          <div className="font-bold flex items-center space-x-1.5 text-blue-300">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Extraction Notice / Quality Check:</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-[11px] text-blue-200/80 pl-2">
            {invoice.processingWarnings.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {submitError && (
        <div className="p-3 bg-red-950/40 border border-red-800/50 rounded-xl text-red-300 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      {/* Summary Metadata Card (IN-SC-12 Spec) */}
      <div className="bg-[#141414] border border-[#262626] rounded-xl p-5 shadow-xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Vendor */}
          <div className="space-y-1">
            <label className="block text-[11px] font-semibold text-[#888888] uppercase tracking-wider">
              Vendor (IN-SC-02, 03, 04)
            </label>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-bold text-white truncate">{invoice.vendorName}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                  invoice.vendorStatus === 'existing'
                    ? 'bg-green-950/40 text-green-400 border border-green-800/40'
                    : 'bg-amber-950/40 text-amber-400 border border-amber-800/40'
                }`}
              >
                {invoice.vendorStatus === 'existing' ? 'Existing Vendor ✓' : 'New Vendor (Auto-Create)'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowVendorDetails(!showVendorDetails)}
              className="text-[11px] text-[#C5A059] hover:underline flex items-center space-x-1 pt-0.5 cursor-pointer"
            >
              <span>{showVendorDetails ? 'Hide details' : 'View vendor details & account'}</span>
              {showVendorDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          {/* Invoice Date */}
          <div className="space-y-1">
            <label className="block text-[11px] font-semibold text-[#888888] uppercase tracking-wider">
              Invoice Date
            </label>
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-[#888888]" />
              <input
                type="date"
                value={invoice.invoiceDate}
                onChange={e => handleUpdateInvoiceField('invoiceDate', e.target.value)}
                className="bg-[#1A1A1A] border border-[#333333] rounded-md px-2 py-1 text-xs text-white font-mono focus:outline-hidden focus:border-[#C5A059]"
              />
            </div>
          </div>

          {/* Receiving Location (IN-SC-15) */}
          <div className="space-y-1">
            <label className="block text-[11px] font-semibold text-[#888888] uppercase tracking-wider">
              Receiving Stock Location
            </label>
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-[#C5A059]" />
              <select
                value={invoice.receivingLocation || 'Main Liquor Storage'}
                onChange={e => handleUpdateInvoiceField('receivingLocation', e.target.value)}
                className="bg-[#1A1A1A] border border-[#333333] rounded-md px-2 py-1 text-xs text-white focus:outline-hidden focus:border-[#C5A059] w-full"
              >
                <option value="Main Liquor Storage">Main Liquor Storage</option>
                <option value="Front Sales Floor">Front Sales Floor</option>
                <option value="Backroom Wine Vault">Backroom Wine Vault</option>
                <option value="Cold Beer Walk-in">Cold Beer Walk-in</option>
              </select>
            </div>
          </div>

          {/* Invoice Total */}
          <div className="space-y-1 md:text-right">
            <label className="block text-[11px] font-semibold text-[#888888] uppercase tracking-wider">
              Invoice Total Amount
            </label>
            <div className="text-xl font-bold font-mono text-[#C5A059]">
              ${invoice.totalAmount.toFixed(2)}
            </div>
            <div className="text-[11px] text-[#888888]">
              Subtotal: ${invoice.subtotal.toFixed(2)} • Tax: ${invoice.taxAmount.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Expandable Vendor Details */}
        {showVendorDetails && invoice.vendorInfo && (
          <div className="mt-3 pt-3 border-t border-[#262626] grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-[#1A1A1A] p-3 rounded-lg">
            <div>
              <span className="text-[#888888] block text-[10px] uppercase">Account #</span>
              <span className="text-white font-mono">{invoice.vendorInfo.accountNumber || 'N/A'}</span>
            </div>
            <div>
              <span className="text-[#888888] block text-[10px] uppercase">Phone</span>
              <span className="text-white">{invoice.vendorInfo.phone || 'N/A'}</span>
            </div>
            <div>
              <span className="text-[#888888] block text-[10px] uppercase">Email</span>
              <span className="text-white truncate block">{invoice.vendorInfo.email || 'N/A'}</span>
            </div>
            <div>
              <span className="text-[#888888] block text-[10px] uppercase">Address</span>
              <span className="text-white truncate block">{invoice.vendorInfo.address || 'N/A'}</span>
            </div>
          </div>
        )}

        {/* Original File Preview Drawer (IN-SC-01 & IN-SC-16) */}
        {showOriginalDocument && invoice.fileDataUrl && (
          <div className="mt-3 pt-3 border-t border-[#262626] space-y-2">
            <div className="flex items-center justify-between text-xs text-[#AAAAAA]">
              <span className="font-semibold">Preserved Original Document ({invoice.fileName})</span>
              <button
                onClick={() => setShowOriginalDocument(false)}
                className="text-[#888888] hover:text-white text-xs"
              >
                Close Preview
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto bg-black rounded-lg p-2 border border-[#333333] flex justify-center">
              {invoice.fileType?.includes('pdf') ? (
                <iframe
                  src={invoice.fileDataUrl}
                  title="Original Invoice PDF"
                  className="w-full h-80 rounded"
                />
              ) : (
                <img
                  src={invoice.fileDataUrl}
                  alt="Original Scanned Invoice"
                  className="max-h-76 object-contain rounded"
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Line Items Section Header & Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2">
        <div className="flex items-center space-x-2">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Extracted Line Items ({invoice.lineItems.length})
          </h2>
          {reviewCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold animate-pulse">
              {reviewCount} Need Review
            </span>
          )}
        </div>

        {/* Quick Review Filter Pills */}
        <div className="flex space-x-1 bg-[#1A1A1A] p-1 rounded-lg border border-[#262626] text-xs">
          <button
            type="button"
            onClick={() => setItemFilter('all')}
            className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
              itemFilter === 'all' ? 'bg-[#C5A059] text-black font-bold' : 'text-[#888888] hover:text-white'
            }`}
          >
            All ({invoice.lineItems.length})
          </button>
          <button
            type="button"
            onClick={() => setItemFilter('review')}
            className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
              itemFilter === 'review' ? 'bg-amber-500 text-black font-bold' : 'text-amber-400 hover:text-white'
            }`}
          >
            Review ({reviewCount})
          </button>
          <button
            type="button"
            onClick={() => setItemFilter('matched')}
            className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
              itemFilter === 'matched' ? 'bg-green-600 text-white font-bold' : 'text-[#888888] hover:text-white'
            }`}
          >
            Matched ({invoice.lineItems.filter(l => l.status === 'matched').length})
          </button>
        </div>
      </div>

      {/* Main Line Items Table */}
      <div className="bg-[#141414] border border-[#262626] rounded-xl overflow-x-auto shadow-xs">
        <table className="w-full text-left text-xs text-[#CCCCCC] divide-y divide-[#262626]">
          <thead className="bg-[#1A1A1A] text-[#888888] font-bold uppercase tracking-wider text-[10px]">
            <tr>
              <th className="px-4 py-3">Status / Match</th>
              <th className="px-4 py-3">Invoice Description</th>
              <th className="px-4 py-3">Matched POS Item</th>
              <th className="px-4 py-3 text-center">Qty & Pack (Units)</th>
              <th className="px-4 py-3 text-right">Unit Cost</th>
              <th className="px-4 py-3 text-right">Cost Diff</th>
              <th className="px-4 py-3 text-right">Retail & Margin</th>
              <th className="px-4 py-3 text-center">Update Cost</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1F1F1F]">
            {displayedLines.map((line, idx) => {
              const originalIndex = invoice.lineItems.findIndex(l => l.id === line.id);
              const isMatched = line.status === 'matched' && line.matchedProductId;
              const hasCostChange = line.costDiff && Math.abs(line.costDiff) > 0.01;

              return (
                <tr
                  key={line.id}
                  className={`hover:bg-[#1A1A1A]/80 transition-colors ${
                    line.status === 'review' ? 'bg-amber-950/10' : ''
                  }`}
                >
                  {/* Status badge & confidence */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex flex-col items-start space-y-1">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                          line.status === 'matched'
                            ? 'bg-green-950/40 text-green-400 border border-green-800/40'
                            : line.status === 'review'
                            ? 'bg-amber-950/40 text-amber-400 border border-amber-800/40'
                            : 'bg-purple-950/40 text-purple-400 border border-purple-800/40'
                        }`}
                      >
                        {line.status === 'matched' ? 'Match' : 'Review'}
                      </span>
                      <span className="text-[10px] text-[#666666] font-mono">
                        {line.confidence}% ({line.matchType?.toUpperCase() || 'OCR'})
                      </span>
                    </div>
                  </td>

                  {/* Description & UPC */}
                  <td className="px-4 py-3 max-w-[220px]">
                    <div className="font-semibold text-white truncate" title={line.description}>
                      {line.description}
                    </div>
                    <div className="text-[11px] text-[#777777] font-mono flex items-center space-x-1">
                      {line.vendorItemNumber && <span>#{line.vendorItemNumber}</span>}
                      {line.upc && <span>• UPC {line.upc}</span>}
                    </div>
                  </td>

                  {/* Matched POS Item */}
                  <td className="px-4 py-3 min-w-[240px]">
                    {isMatched ? (
                      <div className="space-y-1">
                        <div className="text-white font-medium truncate max-w-[240px]">
                          {line.matchedProductName}
                        </div>
                        <div className="text-[11px] text-[#C5A059] font-mono flex items-center space-x-1">
                          <span>SKU: {line.matchedProductSku}</span>
                          <button
                            type="button"
                            onClick={() => handleUpdateLineField(originalIndex, 'matchedProductId', undefined)}
                            className="text-[#888888] hover:text-white underline text-[10px] ml-2 cursor-pointer"
                          >
                            Change
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <select
                          value={line.matchedProductId || ''}
                          onChange={e => handleSelectProductForLine(originalIndex, e.target.value)}
                          className="w-full bg-[#1A1A1A] border border-[#444444] rounded px-2 py-1 text-xs text-white focus:outline-hidden focus:border-[#C5A059]"
                        >
                          <option value="">-- Select Existing Product --</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.size || 'Bottle'}) - ${p.price.toFixed(2)}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setMissingProductTargetIndex(originalIndex)}
                          className="text-[11px] font-bold text-[#C5A059] hover:underline flex items-center space-x-1 cursor-pointer"
                        >
                          <span>+ Create Missing Product (IN-SC-08)</span>
                        </button>
                      </div>
                    )}
                  </td>

                  {/* Qty & Case/Pack multiplier (IN-SC-07) */}
                  <td className="px-4 py-3 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center space-x-1">
                      <input
                        type="number"
                        min="1"
                        value={line.quantity}
                        onChange={e => handleUpdateLineField(originalIndex, 'quantity', parseInt(e.target.value, 10) || 1)}
                        className="w-12 bg-[#1A1A1A] border border-[#333333] rounded px-1.5 py-0.5 text-center text-xs font-mono text-white focus:outline-hidden"
                      />
                      <span className="text-[#666666]">×</span>
                      <input
                        type="number"
                        min="1"
                        value={line.packSize || 1}
                        onChange={e => {
                          const p = parseInt(e.target.value, 10) || 1;
                          handleUpdateLineField(originalIndex, 'packSize', p);
                          handleUpdateLineField(originalIndex, 'isCaseOrPack', p > 1);
                        }}
                        className="w-12 bg-[#1A1A1A] border border-[#333333] rounded px-1.5 py-0.5 text-center text-xs font-mono text-white focus:outline-hidden"
                        title="Pack size multiplier per case"
                      />
                    </div>
                    <div className="text-[10px] text-[#C5A059] font-mono mt-0.5">
                      = {line.totalInventoryUnits} units
                    </div>
                  </td>

                  {/* Unit Cost */}
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <div className="font-mono font-bold text-white">
                      ${line.unitCost.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-[#777777] font-mono">
                      Line: ${line.lineTotal.toFixed(2)}
                    </div>
                  </td>

                  {/* Cost Diff (IN-SC-10) */}
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {line.currentCost !== undefined && line.currentCost > 0 ? (
                      <div className="flex flex-col items-end">
                        <span
                          className={`font-mono font-bold flex items-center space-x-0.5 text-xs ${
                            (line.costDiff || 0) > 0
                              ? 'text-red-400'
                              : (line.costDiff || 0) < 0
                              ? 'text-green-400'
                              : 'text-[#888888]'
                          }`}
                        >
                          {(line.costDiff || 0) > 0 ? (
                            <>
                              <TrendingUp className="w-3 h-3" />
                              <span>+${(line.costDiff || 0).toFixed(2)}</span>
                            </>
                          ) : (line.costDiff || 0) < 0 ? (
                            <>
                              <TrendingDown className="w-3 h-3" />
                              <span>-${Math.abs(line.costDiff || 0).toFixed(2)}</span>
                            </>
                          ) : (
                            <span>$0.00</span>
                          )}
                        </span>
                        <span className="text-[10px] text-[#666666] font-mono">
                          Prior: ${(line.currentCost || 0).toFixed(2)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-[#666666] font-mono">New Item</span>
                    )}
                  </td>

                  {/* Retail & Margin Impact (IN-SC-11) */}
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <div className="font-mono text-white text-xs">
                      ${(line.currentPrice || 0).toFixed(2)}
                    </div>
                    <div className="text-[10px] font-mono flex items-center justify-end space-x-1">
                      {line.oldMargin !== undefined && (
                        <span className="text-[#777777]">{line.oldMargin}% →</span>
                      )}
                      <span
                        className={`font-bold ${
                          (line.newMargin || 0) >= 30
                            ? 'text-green-400'
                            : (line.newMargin || 0) >= 20
                            ? 'text-amber-400'
                            : 'text-red-400'
                        }`}
                      >
                        {line.newMargin || 0}%
                      </span>
                    </div>
                  </td>

                  {/* Update Master Cost Checkbox (IN-SC-10) */}
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={line.updateMasterCost ?? false}
                      onChange={e => handleUpdateLineField(originalIndex, 'updateMasterCost', e.target.checked)}
                      className="accent-[#C5A059] rounded cursor-pointer"
                      title="Update product master cost in catalog upon confirmation"
                    />
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {!isMatched && (
                      <button
                        type="button"
                        onClick={() => setMissingProductTargetIndex(originalIndex)}
                        className="px-2.5 py-1 rounded bg-[#C5A059]/20 hover:bg-[#C5A059]/30 text-[#C5A059] border border-[#C5A059]/40 text-[11px] font-bold cursor-pointer"
                      >
                        Create
                      </button>
                    )}
                    {isMatched && (
                      <button
                        type="button"
                        onClick={() => handleUpdateLineField(originalIndex, 'status', 'matched')}
                        className="p-1 text-green-400 hover:text-green-300"
                        title="Ready for receiving"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Bottom Sticky Action Bar */}
      <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center space-x-3 text-xs text-[#888888]">
          <span className="text-white font-bold">{invoice.lineItems.length} Line Items</span>
          <span>•</span>
          <span className="text-[#C5A059] font-mono font-bold">{totalUnits} Sellable Units</span>
          <span>•</span>
          <span className="font-mono text-white font-bold">${invoice.totalAmount.toFixed(2)} Total</span>
          {reviewCount > 0 && (
            <span className="text-amber-400 font-bold bg-amber-950/40 px-2 py-0.5 rounded border border-amber-900/40">
              {reviewCount} item(s) need review
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {reviewCount > 0 && (
            <button
              type="button"
              onClick={() => {
                const firstUnmatched = invoice.lineItems.findIndex(l => !l.matchedProductId);
                if (firstUnmatched !== -1) {
                  setMissingProductTargetIndex(firstUnmatched);
                }
              }}
              className="flex items-center space-x-1.5 px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Review New Items</span>
            </button>
          )}

          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-[#1A1A1A] hover:bg-[#262626] border border-[#262626] text-xs font-semibold uppercase tracking-wider text-[#888888] hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirmInvoice}
            disabled={isSubmitting || (invoice.isDuplicate && !managerOverrideDuplicate)}
            className="flex items-center space-x-2 px-6 py-2 bg-[#C5A059] hover:bg-[#D4AF37] disabled:opacity-50 text-black font-bold text-xs uppercase tracking-wider rounded-lg transition-colors shadow-md cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Confirm & Receive Inventory</span>
          </button>
        </div>
      </div>

      {/* Missing Product Creation Modal (IN-SC-08) */}
      {missingProductTargetIndex !== null && (
        <MissingProductModal
          isOpen={true}
          onClose={() => setMissingProductTargetIndex(null)}
          initialData={invoice.lineItems[missingProductTargetIndex]?.newProductDetails || {
            name: invoice.lineItems[missingProductTargetIndex]?.description || '',
            brand: invoice.vendorName,
            categoryId: categories[0]?.id || 'cat-1',
            sku: invoice.lineItems[missingProductTargetIndex]?.sku || `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
            barcode: invoice.lineItems[missingProductTargetIndex]?.upc || `080${Math.floor(100000000 + Math.random() * 900000000)}`,
            size: invoice.lineItems[missingProductTargetIndex]?.unitSize || '750ml',
            cost: invoice.lineItems[missingProductTargetIndex]?.unitCost || 0,
            price: invoice.lineItems[missingProductTargetIndex]?.suggestedPrice || 0,
            taxRate: settings?.defaultTaxRate || 0.0825,
          }}
          categories={categories}
          settings={settings}
          onConfirm={handleConfirmNewProduct}
        />
      )}
    </div>
  );
};
