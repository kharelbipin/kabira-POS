import React, { useState, useMemo } from 'react';
import { Product, Category, User, StoreSettings, ScannedInvoice } from '../types';
import { api } from '../utils/api';
import { playBeep } from '../utils/audio';
import { InvoiceScannerModal } from './invoice/InvoiceScannerModal';
import { InvoiceReviewView } from './invoice/InvoiceReviewView';
import { InvoiceHistoryView } from './invoice/InvoiceHistoryView';
import { VendorDirectoryView } from './invoice/VendorDirectoryView';
import { ReceivingLedgerView } from './invoice/ReceivingLedgerView';
import { InvoiceQrUploadModal } from './invoice/InvoiceQrUploadModal';
import { MultiBarcodeReceivingModal } from './invoice/MultiBarcodeReceivingModal';
import { AiShelfCounterModal } from './inventory/AiShelfCounterModal';
import { InventoryUpdatesHistoryView } from './inventory/InventoryUpdatesHistoryView';
import { UnifiedLedgerView } from './inventory/UnifiedLedgerView';
import { AvailableToSellView } from './inventory/AvailableToSellView';
import {
  Search,
  Plus,
  Edit2,
  AlertTriangle,
  Boxes,
  FileSpreadsheet,
  Download,
  Upload,
  ArrowDownToLine,
  SlidersHorizontal,
  CheckCircle2,
  X,
  PackageCheck,
  ClipboardPen,
  ScanBarcode,
  FileText,
  Building2,
  Layers,
  Sparkles,
  QrCode,
  Barcode,
  History,
  ShieldCheck,
} from 'lucide-react';

interface InventoryViewProps {
  products: Product[];
  categories: Category[];
  currentUser: User | null;
  settings: StoreSettings | null;
  onRefresh: () => void;
  initialSubTab?: 'catalog' | 'invoices' | 'vendors' | 'ledger' | 'history' | 'unified-ledger' | 'ats';
  onOpenMobileCaptureSimulator?: (sessionId: string, token: string) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  products,
  categories,
  currentUser,
  settings,
  onRefresh,
  initialSubTab = 'catalog',
  onOpenMobileCaptureSimulator,
}) => {
  const [subTab, setSubTab] = useState<'catalog' | 'invoices' | 'vendors' | 'ledger' | 'history' | 'unified-ledger' | 'ats'>(initialSubTab);
  const [showScannerModal, setShowScannerModal] = useState<boolean>(false);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [showMultiBarcodeModal, setShowMultiBarcodeModal] = useState<boolean>(false);
  const [showAiShelfModal, setShowAiShelfModal] = useState<boolean>(false);
  const [activeReviewInvoice, setActiveReviewInvoice] = useState<ScannedInvoice | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  React.useEffect(() => {
    if (initialSubTab) {
      setSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filterLowStockOnly, setFilterLowStockOnly] = useState<boolean>(false);

  // Modal states
  const [showAddEditModal, setShowAddEditModal] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [showAdjustModal, setShowAdjustModal] = useState<boolean>(false);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [adjustDelta, setAdjustDelta] = useState<string>('-1');
  const [adjustReason, setAdjustReason] = useState<string>('Damaged / Broken bottle');

  const [showReceiveModal, setShowReceiveModal] = useState<boolean>(false);
  const [receivingProduct, setReceivingProduct] = useState<Product | null>(null);
  const [receiveQuantity, setReceiveQuantity] = useState<string>('12');
  const [receiveSupplier, setReceiveSupplier] = useState<string>('Southern Glazer’s Wine & Spirits');
  const [receivePoNumber, setReceivePoNumber] = useState<string>('PO-8820');

  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [csvText, setCsvText] = useState<string>('');
  const [importResult, setImportResult] = useState<{ count?: number; errors?: string[] } | null>(null);

  // Form inputs for Add/Edit
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    sku: '',
    barcode: '',
    categoryId: categories[0]?.id || '',
    price: 19.99,
    costPrice: 12.00,
    stockQuantity: 24,
    lowStockThreshold: 6,
    size: '750ml',
    imageUrl: 'https://images.unsplash.com/photo-1527061011665-3652c757a4d4?w=500&q=80',
    active: true,
  });

  const lowStockCount = products.filter(
    p => p.active && p.stockQuantity <= p.lowStockThreshold
  ).length;

  const filteredProducts = useMemo(() => {
    let list = [...products];

    if (filterLowStockOnly) {
      list = list.filter(p => p.active && p.stockQuantity <= p.lowStockThreshold);
    }

    if (selectedCategory !== 'all') {
      list = list.filter(p => p.categoryId === selectedCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        p =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.barcode.toLowerCase().includes(q)
      );
    }

    return list;
  }, [products, filterLowStockOnly, selectedCategory, searchQuery]);

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      sku: `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
      barcode: `080480${Math.floor(100000 + Math.random() * 900000)}`,
      categoryId: categories[0]?.id || '',
      price: 24.99,
      costPrice: 14.50,
      stockQuantity: 24,
      lowStockThreshold: 6,
      size: '750ml',
      imageUrl: 'https://images.unsplash.com/photo-1527061011665-3652c757a4d4?w=500&q=80',
      active: true,
    });
    setShowAddEditModal(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setFormData({
      ...p,
      costPrice: p.costPrice ?? p.cost ?? 0,
      cost: p.cost ?? p.costPrice ?? 0,
    });
    setShowAddEditModal(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await api.updateProduct(editingProduct.id, formData);
      } else {
        await api.createProduct(formData);
      }
      playBeep('success');
      setShowAddEditModal(false);
      onRefresh();
    } catch (err: any) {
      playBeep('error');
      alert(err.message || 'Failed to save product');
    }
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct) return;
    try {
      const delta = parseInt(adjustDelta, 10);
      await api.adjustInventory(adjustingProduct.id, adjustingProduct.stockQuantity + delta, adjustReason);
      playBeep('success');
      setShowAdjustModal(false);
      onRefresh();
    } catch (err: any) {
      playBeep('error');
      alert(err.message || 'Failed to adjust stock');
    }
  };

  const handleReceiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receivingProduct) return;
    try {
      const qty = parseInt(receiveQuantity, 10);
      await api.receiveInventory(receivingProduct.id, qty, receivePoNumber, receiveSupplier);
      playBeep('success');
      setShowReceiveModal(false);
      onRefresh();
    } catch (err: any) {
      playBeep('error');
      alert(err.message || 'Failed to receive shipment');
    }
  };

  const handleExportCSV = async () => {
    try {
      const csvData = await api.exportProductsCSV();
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `inventory-export-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      playBeep('success');
    } catch (err: any) {
      alert('Failed to export CSV: ' + err.message);
    }
  };

  const handleImportCSVSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.importProductsCSV(csvText);
      setImportResult(res);
      playBeep('success');
      onRefresh();
    } catch (err: any) {
      playBeep('error');
      setImportResult({ errors: [err.message] });
    }
  };

  if (activeReviewInvoice) {
    return (
      <div className="flex-1 flex flex-col h-[calc(100vh-84px)] overflow-hidden bg-[#0A0A0A] text-[#E5E5E5] select-none">
        <InvoiceReviewView
          invoice={activeReviewInvoice}
          categories={categories}
          currentUser={currentUser}
          onClose={() => setActiveReviewInvoice(null)}
          onCommitted={() => {
            setActiveReviewInvoice(null);
            setSuccessBanner('Invoice successfully committed to inventory!');
            onRefresh();
            setSubTab('ledger');
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-84px)] overflow-hidden bg-[#0A0A0A] text-[#E5E5E5] select-none">
      {/* Top Banner for Low Stock (IN-02) */}
      {lowStockCount > 0 && (
        <div className="bg-[#C5A059]/10 border-b border-[#C5A059]/30 px-4 py-2 flex items-center justify-between text-xs text-[#E5E5E5]">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-[#C5A059] shrink-0" />
            <span>
              <strong className="text-[#F5F5F5]">Inventory Notice:</strong> {lowStockCount} product(s) are below reorder threshold.
            </span>
          </div>
          <button
            onClick={() => {
              setSubTab('catalog');
              setFilterLowStockOnly(!filterLowStockOnly);
            }}
            className="px-2.5 py-1 rounded bg-[#C5A059]/20 hover:bg-[#C5A059]/30 text-[#C5A059] font-bold text-xs uppercase tracking-wider border border-[#C5A059]/40 cursor-pointer transition-colors"
          >
            {filterLowStockOnly ? 'Show All Products' : 'Filter Low Stock Items'}
          </button>
        </div>
      )}

      {/* Success Notification Banner */}
      {successBanner && (
        <div className="bg-emerald-950/60 border-b border-emerald-700/50 px-4 py-2 flex items-center justify-between text-xs text-emerald-200 animate-in fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successBanner}</span>
          </div>
          <button
            onClick={() => setSuccessBanner(null)}
            className="p-1 text-emerald-400 hover:text-white cursor-pointer transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Sub-Navigation Strip for Inventory / Receiving */}
      <div className="bg-[#0D0D0D] border-b border-[#262626] px-4 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto no-scrollbar">
          <button
            id="subtab-catalog"
            onClick={() => setSubTab('catalog')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              subTab === 'catalog'
                ? 'bg-[#1C1C1C] text-[#C5A059] border border-[#C5A059]/40 shadow-xs'
                : 'text-[#888888] hover:text-[#E5E5E5] hover:bg-[#141414]'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>Catalog ({products.length})</span>
          </button>

          <button
            id="subtab-invoices"
            onClick={() => setSubTab('invoices')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              subTab === 'invoices'
                ? 'bg-[#1C1C1C] text-[#C5A059] border border-[#C5A059]/40 shadow-xs'
                : 'text-[#888888] hover:text-[#E5E5E5] hover:bg-[#141414]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Invoice Intake</span>
          </button>

          <button
            id="subtab-vendors"
            onClick={() => setSubTab('vendors')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              subTab === 'vendors'
                ? 'bg-[#1C1C1C] text-[#C5A059] border border-[#C5A059]/40 shadow-xs'
                : 'text-[#888888] hover:text-[#E5E5E5] hover:bg-[#141414]'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Vendors</span>
          </button>

          <button
            id="subtab-ledger"
            onClick={() => setSubTab('ledger')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              subTab === 'ledger'
                ? 'bg-[#1C1C1C] text-[#C5A059] border border-[#C5A059]/40 shadow-xs'
                : 'text-[#888888] hover:text-[#E5E5E5] hover:bg-[#141414]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Receiving Ledger</span>
          </button>

          <button
            id="subtab-history"
            onClick={() => setSubTab('history')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              subTab === 'history'
                ? 'bg-[#1C1C1C] text-[#C5A059] border border-[#C5A059]/40 shadow-xs'
                : 'text-[#888888] hover:text-[#E5E5E5] hover:bg-[#141414]'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Updates & Recounts</span>
          </button>

          <button
            id="subtab-unified-ledger"
            onClick={() => setSubTab('unified-ledger')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              subTab === 'unified-ledger'
                ? 'bg-[#1C1C1C] text-[#C5A059] border border-[#C5A059]/40 shadow-xs'
                : 'text-[#888888] hover:text-[#E5E5E5] hover:bg-[#141414]'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#C5A059]" />
            <span>Omnichannel Ledger</span>
          </button>

          <button
            id="subtab-ats"
            onClick={() => setSubTab('ats')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              subTab === 'ats'
                ? 'bg-[#1C1C1C] text-emerald-400 border border-emerald-500/40 shadow-xs'
                : 'text-[#888888] hover:text-[#E5E5E5] hover:bg-[#141414]'
            }`}
          >
            <Boxes className="w-3.5 h-3.5 text-emerald-400" />
            <span>ATS Engine</span>
          </button>
        </div>

        {/* Quick Intake Actions */}
        <div className="flex items-center space-x-2 shrink-0 ml-2">
          <button
            id="btn-ai-shelf-counter"
            onClick={() => setShowAiShelfModal(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#1F1F1F] hover:bg-[#282828] text-[#C5A059] border border-[#C5A059]/40 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-xs"
            title="Count shelf bottles with Gemini AI Vision"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#C5A059]" />
            <span className="hidden sm:inline">AI Shelf Counter</span>
          </button>

          <button
            id="btn-quick-qr-session"
            onClick={() => setShowQrModal(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#1F1F1F] hover:bg-[#282828] text-white border border-[#3A3A3A] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-xs"
            title="Generate QR code for mobile phone camera scan (INV-01 to INV-18)"
          >
            <QrCode className="w-3.5 h-3.5 text-[#C5A059]" />
            <span className="hidden sm:inline">Phone QR</span>
          </button>

          <button
            id="btn-quick-multi-barcode"
            onClick={() => setShowMultiBarcodeModal(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#1F1F1F] hover:bg-[#282828] text-white border border-[#3A3A3A] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-xs"
            title="Continuous multi-barcode handheld scanning & bulk update (INV-MB-01 to MB-20)"
          >
            <Barcode className="w-3.5 h-3.5 text-[#C5A059]" />
            <span className="hidden sm:inline">Multi-Barcode</span>
          </button>

          <button
            id="btn-quick-scan-invoice"
            onClick={() => setShowScannerModal(true)}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-[#C5A059] to-[#E3C47E] hover:from-[#D4AF65] hover:to-[#F0D597] text-black text-xs font-bold uppercase tracking-wider shadow-md transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-black" />
            <span>Scan Invoice</span>
          </button>
        </div>
      </div>

      {subTab === 'invoices' && (
        <InvoiceHistoryView
          onScanNew={() => setShowScannerModal(true)}
          onReviewInvoice={inv => setActiveReviewInvoice(inv)}
          onOpenQrModal={() => setShowQrModal(true)}
          onOpenMultiBarcodeModal={() => setShowMultiBarcodeModal(true)}
        />
      )}

      {subTab === 'vendors' && (
        <VendorDirectoryView
          onScanForVendor={() => setShowScannerModal(true)}
        />
      )}

      {subTab === 'ledger' && (
        <ReceivingLedgerView
          onRefreshInventory={onRefresh}
        />
      )}

      {subTab === 'history' && (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#0A0A0A]">
          <InventoryUpdatesHistoryView
            onOpenAiCounter={() => setShowAiShelfModal(true)}
          />
        </div>
      )}

      {subTab === 'unified-ledger' && (
        <UnifiedLedgerView />
      )}

      {subTab === 'ats' && (
        <AvailableToSellView />
      )}

      {subTab === 'catalog' && (
        <>
          {/* Action and Search Toolbar */}
          <div className="p-4 bg-[#0D0D0D] border-b border-[#262626] flex flex-wrap gap-3 items-center justify-between shrink-0">
        <div className="flex flex-1 min-w-[280px] max-w-md relative">
          <Search className="w-4 h-4 text-[#737373] absolute left-3 top-2.5" />
          <input
            id="inventory-search-input"
            type="text"
            placeholder="Search SKU, UPC barcode, product title..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-[#141414] border border-[#262626] rounded-lg pl-9 pr-3 py-2 text-xs text-[#E5E5E5] placeholder:text-[#666666] focus:outline-hidden focus:border-[#C5A059]"
          />
        </div>

        <div className="flex items-center space-x-2">
          {/* Category Filter */}
          <select
            id="inventory-cat-filter"
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="bg-[#141414] border border-[#262626] rounded-lg px-3 py-2 text-xs text-[#E5E5E5] focus:outline-hidden focus:border-[#C5A059] cursor-pointer"
          >
            <option value="all">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Export CSV (IN-05) */}
          <button
            id="inventory-export-csv-btn"
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-[#141414] hover:bg-[#1A1A1A] border border-[#262626] text-xs font-bold uppercase tracking-wider text-[#A3A3A3] hover:text-white transition-colors cursor-pointer"
            title="Download CSV Catalog"
          >
            <Download className="w-3.5 h-3.5 text-[#C5A059]" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          {/* Import CSV (IN-05) */}
          <button
            id="inventory-import-csv-btn"
            onClick={() => {
              setImportResult(null);
              setCsvText(
                `name,sku,barcode,category,price,costPrice,stockQuantity,size\n"Glenlivet 15yr French Oak","GLEN-15-750","080480015099","Whiskey & Bourbon",84.99,52.00,18,"750ml"`
              );
              setShowImportModal(true);
            }}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-[#141414] hover:bg-[#1A1A1A] border border-[#262626] text-xs font-bold uppercase tracking-wider text-[#A3A3A3] hover:text-white transition-colors cursor-pointer"
            title="Import Products via CSV"
          >
            <Upload className="w-3.5 h-3.5 text-[#C5A059]" />
            <span className="hidden sm:inline">Import CSV</span>
          </button>

          {/* Add Product (PR-04) */}
          <button
            id="inventory-add-product-btn"
            onClick={handleOpenAdd}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-[#C5A059] hover:bg-[#D4B06A] text-black text-xs font-bold uppercase tracking-wider transition-all shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="bg-[#0F0F0F] border border-[#262626] rounded-xl overflow-hidden shadow-md">
          <table className="w-full text-left text-xs text-[#D4D4D4]">
            <thead className="bg-[#0A0A0A] text-[#737373] uppercase text-[10px] tracking-widest border-b border-[#262626] font-bold">
              <tr>
                <th className="px-4 py-3.5">Product</th>
                <th className="px-4 py-3.5">SKU / UPC</th>
                <th className="px-4 py-3.5">Category / Size</th>
                <th className="px-4 py-3.5 text-right">Cost</th>
                <th className="px-4 py-3.5 text-right">Retail Price</th>
                <th className="px-4 py-3.5 text-right">Margin</th>
                <th className="px-4 py-3.5 text-center">Stock Level</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F1F1F]">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-[#737373]">
                    No products found in inventory.
                  </td>
                </tr>
              ) : (
                filteredProducts.map(p => {
                  const isOutOfStock = p.stockQuantity <= 0;
                  const isLowStock = p.stockQuantity > 0 && p.stockQuantity <= p.lowStockThreshold;
                  const cost = p.costPrice ?? p.cost ?? 0;
                  const price = p.price ?? 0;
                  const marginPct = price > 0 ? (((price - cost) / price) * 100).toFixed(1) : '0';

                  return (
                    <tr key={p.id} className="hover:bg-[#161616] transition-colors">
                      <td className="px-4 py-3 font-sans">
                        <div className="flex items-center space-x-3">
                          <img
                            src={p.imageUrl}
                            alt={p.name}
                            className="w-10 h-10 rounded object-cover border border-[#262626] shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="font-medium text-[#F5F5F5] truncate max-w-xs">{p.name}</div>
                            {!p.active && (
                              <span className="text-[10px] bg-red-950/40 text-red-400 px-1.5 py-0.2 rounded border border-red-800">
                                Inactive / Delisted
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 font-mono text-[11px] text-[#737373]">
                        <div>SKU: {p.sku}</div>
                        <div className="text-[#525252]">UPC: {p.barcode}</div>
                      </td>

                      <td className="px-4 py-3">
                        <span className="bg-[#141414] border border-[#262626] px-2 py-0.5 rounded text-[11px] text-[#A3A3A3]">
                          {p.categoryName}
                        </span>
                        <span className="ml-1.5 text-[#737373] font-mono text-[11px]">{p.size}</span>
                      </td>

                      <td className="px-4 py-3 text-right font-mono text-[#737373]">
                        ${cost.toFixed(2)}
                      </td>

                      <td className="px-4 py-3 text-right font-mono font-bold text-[#F5F5F5]">
                        ${price.toFixed(2)}
                      </td>

                      <td className="px-4 py-3 text-right font-mono text-green-400 text-[11px]">
                        {marginPct}%
                      </td>

                      <td className="px-4 py-3 text-center">
                        <div className="inline-flex items-center space-x-1.5">
                          <span
                            className={`font-mono font-bold text-xs px-2 py-0.5 rounded ${
                              isOutOfStock
                                ? 'bg-red-950/40 text-red-400 border border-red-800'
                                : isLowStock
                                ? 'bg-[#C5A059]/15 text-[#C5A059] border border-[#C5A059]/40'
                                : 'bg-[#141414] border border-[#262626] text-[#E5E5E5]'
                            }`}
                          >
                            {p.stockQuantity}
                          </span>
                          {isLowStock && (
                            <span title="Low Stock Warning">
                              <AlertTriangle className="w-3.5 h-3.5 text-[#C5A059]" />
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-right font-sans">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            id={`receive-btn-${p.id}`}
                            onClick={() => {
                              setReceivingProduct(p);
                              setShowReceiveModal(true);
                            }}
                            className="p-1.5 text-[#737373] hover:text-green-400 hover:bg-[#1A1A1A] rounded transition-colors cursor-pointer"
                            title="Receive Shipment (IN-04)"
                          >
                            <PackageCheck className="w-4 h-4" />
                          </button>

                          <button
                            id={`adjust-btn-${p.id}`}
                            onClick={() => {
                              setAdjustingProduct(p);
                              setShowAdjustModal(true);
                            }}
                            className="p-1.5 text-[#737373] hover:text-[#C5A059] hover:bg-[#1A1A1A] rounded transition-colors cursor-pointer"
                            title="Adjust Stock / Recount (IN-03)"
                          >
                            <ClipboardPen className="w-4 h-4" />
                          </button>

                          <button
                            id={`edit-prod-btn-${p.id}`}
                            onClick={() => handleOpenEdit(p)}
                            className="p-1.5 text-[#737373] hover:text-white hover:bg-[#1A1A1A] rounded transition-colors cursor-pointer"
                            title="Edit Product Details (PR-05)"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}

      {/* Add / Edit Product Modal (PR-04, PR-05, PR-06) */}
      {showAddEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 select-none">
          <div className="bg-[#0F0F0F] border border-[#262626] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden text-[#E5E5E5] flex flex-col max-h-[90vh]">
            <div className="bg-[#0A0A0A] px-6 py-4 border-b border-[#262626] flex justify-between items-center">
              <h3 className="font-serif italic font-bold text-lg text-[#F5F5F5]">
                {editingProduct ? `Edit ${editingProduct.name}` : 'Add New Catalog Product'}
              </h3>
              <button
                onClick={() => setShowAddEditModal(false)}
                className="text-[#737373] hover:text-white cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              <div>
                <label className="block text-[#A3A3A3] font-bold uppercase tracking-wider mb-1.5">Product Title *</label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-[#141414] border border-[#262626] rounded-lg p-2 text-[#E5E5E5] focus:outline-hidden focus:border-[#C5A059]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#A3A3A3] font-bold uppercase tracking-wider mb-1.5">SKU *</label>
                  <input
                    type="text"
                    required
                    value={formData.sku || ''}
                    onChange={e => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full bg-[#141414] border border-[#262626] rounded-lg p-2 text-[#E5E5E5] font-mono focus:outline-hidden focus:border-[#C5A059]"
                  />
                </div>
                <div>
                  <label className="block text-[#A3A3A3] font-bold uppercase tracking-wider mb-1.5">UPC / Barcode *</label>
                  <input
                    type="text"
                    required
                    value={formData.barcode || ''}
                    onChange={e => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full bg-[#141414] border border-[#262626] rounded-lg p-2 text-[#E5E5E5] font-mono focus:outline-hidden focus:border-[#C5A059]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#A3A3A3] font-bold uppercase tracking-wider mb-1.5">Category *</label>
                  <select
                    value={formData.categoryId || ''}
                    onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full bg-[#141414] border border-[#262626] rounded-lg p-2 text-[#E5E5E5] focus:outline-hidden focus:border-[#C5A059]"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[#A3A3A3] font-bold uppercase tracking-wider mb-1.5">Bottle Size / Variant (PR-06)</label>
                  <input
                    type="text"
                    placeholder="e.g. 750ml, 1L, 1.75L"
                    value={formData.size || ''}
                    onChange={e => setFormData({ ...formData, size: e.target.value })}
                    className="w-full bg-[#141414] border border-[#262626] rounded-lg p-2 text-[#E5E5E5] focus:outline-hidden focus:border-[#C5A059]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#A3A3A3] font-bold uppercase tracking-wider mb-1.5">Cost Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.costPrice || 0}
                    onChange={e => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#141414] border border-[#262626] rounded-lg p-2 text-[#E5E5E5] font-mono focus:outline-hidden focus:border-[#C5A059]"
                  />
                </div>
                <div>
                  <label className="block text-[#A3A3A3] font-bold uppercase tracking-wider mb-1.5">Retail Price ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.price || 0}
                    onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#141414] border border-[#262626] rounded-lg p-2 text-[#E5E5E5] font-mono focus:outline-hidden focus:border-[#C5A059]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#A3A3A3] font-bold uppercase tracking-wider mb-1.5">Current Stock Quantity</label>
                  <input
                    type="number"
                    value={formData.stockQuantity ?? 0}
                    onChange={e => setFormData({ ...formData, stockQuantity: parseInt(e.target.value, 10) || 0 })}
                    className="w-full bg-[#141414] border border-[#262626] rounded-lg p-2 text-[#E5E5E5] font-mono focus:outline-hidden focus:border-[#C5A059]"
                  />
                </div>
                <div>
                  <label className="block text-[#A3A3A3] font-bold uppercase tracking-wider mb-1.5">Low Stock Alert Threshold</label>
                  <input
                    type="number"
                    value={formData.lowStockThreshold ?? 5}
                    onChange={e => setFormData({ ...formData, lowStockThreshold: parseInt(e.target.value, 10) || 0 })}
                    className="w-full bg-[#141414] border border-[#262626] rounded-lg p-2 text-[#E5E5E5] font-mono focus:outline-hidden focus:border-[#C5A059]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#A3A3A3] font-bold uppercase tracking-wider mb-1.5">Image URL</label>
                <input
                  type="url"
                  value={formData.imageUrl || ''}
                  onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
                  className="w-full bg-[#141414] border border-[#262626] rounded-lg p-2 text-[#E5E5E5] focus:outline-hidden focus:border-[#C5A059]"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="prod-active-chk"
                  checked={formData.active ?? true}
                  onChange={e => setFormData({ ...formData, active: e.target.checked })}
                  className="rounded bg-[#141414] border-[#262626] text-[#C5A059] focus:ring-[#C5A059]"
                />
                <label htmlFor="prod-active-chk" className="text-[#E5E5E5] font-medium">
                  Active (Display in Cashier POS Register)
                </label>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-[#262626]">
                <button
                  type="button"
                  onClick={() => setShowAddEditModal(false)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider text-[#737373] hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#C5A059] hover:bg-[#D4B06A] text-black font-bold uppercase tracking-wider text-xs transition-colors cursor-pointer"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal (IN-03) */}
      {showAdjustModal && adjustingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 select-none">
          <div className="bg-[#0F0F0F] border border-[#262626] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden text-[#E5E5E5] p-6 space-y-4">
            <h3 className="font-serif italic font-bold text-lg text-[#F5F5F5]">Adjust Stock: {adjustingProduct.name}</h3>
            <div className="bg-[#141414] p-3 rounded-lg border border-[#262626] text-xs flex justify-between">
              <span className="text-[#737373]">Current Stock:</span>
              <span className="font-bold font-mono text-[#C5A059]">{adjustingProduct.stockQuantity} units</span>
            </div>

            <form onSubmit={handleAdjustSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#A3A3A3] font-bold uppercase tracking-wider mb-1.5">Adjustment Delta (positive or negative number)</label>
                <input
                  type="number"
                  required
                  value={adjustDelta}
                  onChange={e => setAdjustDelta(e.target.value)}
                  placeholder="e.g. -2 or +5"
                  className="w-full bg-[#141414] border border-[#262626] rounded-lg p-2 font-mono text-[#E5E5E5] focus:outline-hidden focus:border-[#C5A059]"
                />
              </div>

              <div>
                <label className="block text-[#A3A3A3] font-bold uppercase tracking-wider mb-1.5">Reason for Adjustment *</label>
                <select
                  value={adjustReason}
                  onChange={e => setAdjustReason(e.target.value)}
                  className="w-full bg-[#141414] border border-[#262626] rounded-lg p-2 text-[#E5E5E5] focus:outline-hidden focus:border-[#C5A059]"
                >
                  <option value="Damaged / Broken bottle">Damaged / Broken bottle</option>
                  <option value="Inventory Recount discrepancy">Inventory Recount discrepancy</option>
                  <option value="Expired / Corked vintage">Expired / Corked vintage</option>
                  <option value="Shrinkage / Missing item">Shrinkage / Missing item</option>
                  <option value="Store Tasting / Promotional sample">Store Tasting / Promotional sample</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-[#262626]">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider text-[#737373] hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#C5A059] hover:bg-[#D4B06A] text-black font-bold uppercase tracking-wider text-xs cursor-pointer shadow-md transition-colors"
                >
                  Apply Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receive Stock Shipment Modal (IN-04) */}
      {showReceiveModal && receivingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 select-none">
          <div className="bg-[#0F0F0F] border border-[#262626] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden text-[#E5E5E5] p-6 space-y-4">
            <h3 className="font-serif italic font-bold text-lg text-[#F5F5F5]">Receive Shipment: {receivingProduct.name}</h3>
            <div className="bg-[#141414] p-3 rounded-lg border border-[#262626] text-xs flex justify-between">
              <span className="text-[#737373]">Current Stock:</span>
              <span className="font-bold font-mono text-[#F5F5F5]">{receivingProduct.stockQuantity}</span>
            </div>

            <form onSubmit={handleReceiveSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#A3A3A3] font-bold uppercase tracking-wider mb-1.5">Quantity Received (units) *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={receiveQuantity}
                  onChange={e => setReceiveQuantity(e.target.value)}
                  className="w-full bg-[#141414] border border-[#262626] rounded-lg p-2 font-mono text-[#E5E5E5] focus:outline-hidden focus:border-[#C5A059]"
                />
              </div>

              <div>
                <label className="block text-[#A3A3A3] font-bold uppercase tracking-wider mb-1.5">Distributor / Supplier *</label>
                <input
                  type="text"
                  required
                  value={receiveSupplier}
                  onChange={e => setReceiveSupplier(e.target.value)}
                  className="w-full bg-[#141414] border border-[#262626] rounded-lg p-2 text-[#E5E5E5] focus:outline-hidden focus:border-[#C5A059]"
                />
              </div>

              <div>
                <label className="block text-[#A3A3A3] font-bold uppercase tracking-wider mb-1.5">PO Number / Bill of Lading *</label>
                <input
                  type="text"
                  required
                  value={receivePoNumber}
                  onChange={e => setReceivePoNumber(e.target.value)}
                  className="w-full bg-[#141414] border border-[#262626] rounded-lg p-2 text-[#E5E5E5] font-mono focus:outline-hidden focus:border-[#C5A059]"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-[#262626]">
                <button
                  type="button"
                  onClick={() => setShowReceiveModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider text-[#737373] hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#C5A059] hover:bg-[#D4B06A] text-black font-bold uppercase tracking-wider text-xs cursor-pointer shadow-md transition-colors"
                >
                  Confirm Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal (IN-05) */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 select-none">
          <div className="bg-[#0F0F0F] border border-[#262626] rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden text-[#E5E5E5] flex flex-col max-h-[90vh]">
            <div className="bg-[#0A0A0A] px-6 py-4 border-b border-[#262626] flex justify-between items-center">
              <h3 className="font-serif italic font-bold text-lg text-[#F5F5F5]">Bulk CSV Catalog Import</h3>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-[#737373] hover:text-white cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleImportCSVSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              <p className="text-[#737373]">
                Paste CSV data below with column headers:{' '}
                <code className="text-[#C5A059] font-mono">name,sku,barcode,category,price,costPrice,stockQuantity,size</code>
              </p>

              {importResult && (
                <div
                  className={`p-3 rounded-lg ${
                    importResult.errors && importResult.errors.length > 0
                      ? 'bg-red-950/40 border border-red-800 text-red-300'
                      : 'bg-green-950/40 border border-green-800 text-green-300'
                  }`}
                >
                  {importResult.count !== undefined && (
                    <div className="font-bold">Successfully imported {importResult.count} products!</div>
                  )}
                  {importResult.errors && importResult.errors.length > 0 && (
                    <div className="mt-1 space-y-0.5">
                      <div className="font-bold">Validation Errors:</div>
                      {importResult.errors.map((err, i) => (
                        <div key={i}>• {err}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div>
                <textarea
                  rows={8}
                  value={csvText}
                  onChange={e => setCsvText(e.target.value)}
                  className="w-full bg-[#141414] border border-[#262626] rounded-lg p-3 font-mono text-[11px] text-[#E5E5E5] focus:outline-hidden focus:border-[#C5A059]"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-[#262626]">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider text-[#737373] hover:text-white cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#C5A059] hover:bg-[#D4B06A] text-black font-bold uppercase tracking-wider text-xs cursor-pointer shadow-md transition-colors"
                >
                  Validate & Import CSV
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Scanner Modal */}
      {showScannerModal && (
        <InvoiceScannerModal
          onClose={() => setShowScannerModal(false)}
          onInvoiceReady={inv => {
            setShowScannerModal(false);
            setActiveReviewInvoice(inv);
          }}
        />
      )}

      {/* Phone QR Invoice Upload Modal (INV-01 to INV-18) */}
      {showQrModal && (
        <InvoiceQrUploadModal
          isOpen={showQrModal}
          onClose={() => setShowQrModal(false)}
          onInvoiceExtracted={inv => {
            setShowQrModal(false);
            setActiveReviewInvoice(inv);
            setSuccessBanner(`Invoice ${inv.invoiceNumber} uploaded via mobile phone camera! Ready for review.`);
          }}
          onSimulateMobileCapture={(sessionId, token) => {
            if (onOpenMobileCaptureSimulator) {
              setShowQrModal(false);
              onOpenMobileCaptureSimulator(sessionId, token);
            }
          }}
        />
      )}

      {/* Continuous Multi-Barcode Receiving Modal (INV-MB-01 to INV-MB-20) */}
      {showMultiBarcodeModal && (
        <MultiBarcodeReceivingModal
          isOpen={showMultiBarcodeModal}
          onClose={() => setShowMultiBarcodeModal(false)}
          onComplete={receivingNumber => {
            onRefresh();
            setSuccessBanner(`Bulk Barcode Receiving ${receivingNumber} completed and updated to catalog!`);
          }}
        />
      )}

      {/* AI Shelf Bottle Counter Modal */}
      {showAiShelfModal && (
        <AiShelfCounterModal
          isOpen={showAiShelfModal}
          onClose={() => setShowAiShelfModal(false)}
          onSuccess={() => {
            setShowAiShelfModal(false);
            onRefresh();
            setSubTab('history');
            setSuccessBanner('AI shelf count reconciled and updated in inventory ledger!');
          }}
          onOpenHistory={() => {
            setShowAiShelfModal(false);
            setSubTab('history');
          }}
        />
      )}
    </div>
  );
};
