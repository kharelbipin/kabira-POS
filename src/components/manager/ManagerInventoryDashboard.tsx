import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Boxes,
  PackageCheck,
  Plus,
  Search,
  Upload,
  Download,
  Edit2,
  Save,
  X,
} from 'lucide-react';
import { Category, Product, StoreSettings } from '../../types';
import { api } from '../../utils/api';

interface ManagerInventoryDashboardProps {
  products: Product[];
  categories: Category[];
  settings: StoreSettings | null;
  onNavigate: (tab: string) => void;
  onOpenPrintLabel: () => void;
  onSettingsUpdated: (settings: StoreSettings) => void;
  onProductUpdated: (product: Product) => void;
}

const money = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);

export const ManagerInventoryDashboard: React.FC<ManagerInventoryDashboardProps> = ({
  products,
  categories,
  settings,
  onNavigate,
  onOpenPrintLabel,
  onSettingsUpdated,
  onProductUpdated,
}) => {
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('all');
  const [vendor, setVendor] = useState('all');
  const [status, setStatus] = useState('all');
  const [savingLabelSettings, setSavingLabelSettings] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState<Partial<Product>>({});
  const [savingProduct, setSavingProduct] = useState(false);

  const activeProducts = useMemo(() => products.filter(product => product.active), [products]);

  const vendors = useMemo(
    () =>
      [...new Set(activeProducts.map(product => product.vendor).filter(Boolean) as string[])].sort(),
    [activeProducts]
  );

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return activeProducts
      .filter(product => {
        if (!query) return true;
        return (
          product.name.toLowerCase().includes(query) ||
          product.sku.toLowerCase().includes(query) ||
          product.barcode.toLowerCase().includes(query) ||
          (product.brandName || product.brand || '').toLowerCase().includes(query)
        );
      })
      .filter(product => categoryId === 'all' || product.categoryId === categoryId)
      .filter(product => vendor === 'all' || product.vendor === vendor)
      .filter(product => {
        if (status === 'all') return true;
        if (status === 'out') return product.stockQuantity <= 0;
        if (status === 'low') {
          return product.stockQuantity > 0 && product.stockQuantity <= product.lowStockThreshold;
        }
        if (status === 'in') return product.stockQuantity > product.lowStockThreshold;
        return true;
      })
      .slice(0, 18);
  }, [activeProducts, search, categoryId, vendor, status]);

  const lowStock = useMemo(
    () =>
      activeProducts
        .filter(product => product.stockQuantity <= product.lowStockThreshold)
        .sort((a, b) => a.stockQuantity - b.stockQuantity)
        .slice(0, 5),
    [activeProducts]
  );

  const inventoryTotals = useMemo(
    () =>
      activeProducts.reduce(
        (totals, product) => {
          const quantity = Math.max(0, Number(product.stockQuantity) || 0);
          const cost = Math.max(0, Number(product.cost) || 0);
          const retail = Math.max(0, Number(product.price) || 0);
          totals.totalCost += quantity * cost;
          totals.retailValue += quantity * retail;
          return totals;
        },
        { totalCost: 0, retailValue: 0 }
      ),
    [activeProducts]
  );

  const estimatedMarginValue = Math.max(
    0,
    inventoryTotals.retailValue - inventoryTotals.totalCost
  );

  const saveLabelSetting = async (patch: Partial<StoreSettings>) => {
    setSavingLabelSettings(true);
    try {
      const updated = await api.updateSettings(patch);
      onSettingsUpdated(updated);
    } catch (error: any) {
      alert(error?.message || 'Failed to save label printing preference.');
    } finally {
      setSavingLabelSettings(false);
    }
  };

  const handleDownloadInventory = async () => {
    try {
      const csvData = await api.exportProductsCSV();
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `inventory-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      alert(error?.message || 'Failed to download inventory.');
    }
  };

  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product);
    setEditForm({
      name: product.name,
      sku: product.sku,
      barcode: product.barcode,
      categoryId: product.categoryId,
      categoryName: product.categoryName,
      size: product.size,
      stockQuantity: product.stockQuantity,
      cost: Number(product.cost ?? product.costPrice ?? 0),
      price: product.price,
      vendor: product.vendor || '',
      lowStockThreshold: product.lowStockThreshold,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingProduct) return;
    if (!String(editForm.name || '').trim()) {
      alert('Item name is required.');
      return;
    }

    setSavingProduct(true);
    try {
      const selectedCategory = categories.find(category => category.id === editForm.categoryId);
      const saved = await api.updateProduct(editingProduct.id, {
        ...editForm,
        name: String(editForm.name || '').trim(),
        sku: String(editForm.sku || '').trim(),
        barcode: String(editForm.barcode || '').trim(),
        categoryName: selectedCategory?.name || editForm.categoryName,
        size: String(editForm.size || '').trim(),
        vendor: String(editForm.vendor || '').trim() || undefined,
        stockQuantity: Number(editForm.stockQuantity || 0),
        cost: Number(editForm.cost || 0),
        price: Number(editForm.price || 0),
        lowStockThreshold: Number(editForm.lowStockThreshold || 0),
      });
      onProductUpdated(saved);
      setEditingProduct(null);
      setEditForm({});
    } catch (error: any) {
      alert(error?.message || 'Failed to update item.');
    } finally {
      setSavingProduct(false);
    }
  };

  const stockStatus = (product: Product) => {
    if (product.stockQuantity <= 0) {
      return {
        label: 'Out of Stock',
        cls: 'bg-rose-100 text-rose-700',
        dot: 'bg-rose-500',
      };
    }
    if (product.stockQuantity <= product.lowStockThreshold) {
      return {
        label: 'Low Stock',
        cls: 'bg-amber-100 text-amber-700',
        dot: 'bg-amber-500',
      };
    }
    return {
      label: 'In Stock',
      cls: 'bg-emerald-100 text-emerald-700',
      dot: 'bg-emerald-500',
    };
  };

  return (
    <div className="h-full overflow-y-auto bg-[#eef3f8] text-[#10234a]">
      <div className="px-4 md:px-5 py-4 space-y-3">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div>
            <div className="text-[10px] text-slate-500 mb-1">
              Inventory <span className="mx-1">›</span> Inventory Control Center
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-[#10234a]">
              Inventory Control Center
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Search, price, edit, import, export, and maintain the store item catalog.
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="flex flex-wrap justify-end gap-2">
              <div className="h-11 min-w-[142px] px-3 rounded-lg bg-white border border-slate-200 shadow-sm flex flex-col justify-center">
                <span className="text-[9px] uppercase tracking-wider font-bold text-slate-500">Total Inventory Cost</span>
                <span className="text-sm font-black text-[#10234a]">{money(inventoryTotals.totalCost)}</span>
              </div>
              <div className="h-11 min-w-[142px] px-3 rounded-lg bg-white border border-slate-200 shadow-sm flex flex-col justify-center">
                <span className="text-[9px] uppercase tracking-wider font-bold text-slate-500">Retail Value</span>
                <span className="text-sm font-black text-[#10234a]">{money(inventoryTotals.retailValue)}</span>
              </div>
              <div className="h-11 min-w-[142px] px-3 rounded-lg bg-emerald-50 border border-emerald-200 shadow-sm flex flex-col justify-center">
                <span className="text-[9px] uppercase tracking-wider font-bold text-emerald-700">Margin Value</span>
                <span className="text-sm font-black text-emerald-700">{money(estimatedMarginValue)}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 justify-end">
            <button type="button" onClick={() => onNavigate('inventory-add')} className="h-11 px-4 rounded-lg bg-[#c78d20] hover:bg-[#b57d18] text-white text-xs font-black flex items-center gap-2 cursor-pointer shadow-sm">
              <Plus className="w-4 h-4" />
              Add Item
            </button>
            <button type="button" onClick={() => onNavigate('inventory-import')} className="h-11 px-4 rounded-lg bg-white border border-[#25467b] text-[#10234a] text-xs font-black flex items-center gap-2 cursor-pointer">
              <Upload className="w-4 h-4" />
              Import CSV
            </button>
            <button type="button" onClick={handleDownloadInventory} className="h-11 px-4 rounded-lg bg-white border border-[#25467b] text-[#10234a] text-xs font-black flex items-center gap-2 cursor-pointer">
              <Download className="w-4 h-4" />
              Download Inventory
            </button>
            <button type="button" onClick={onOpenPrintLabel} className="h-11 px-4 rounded-lg bg-white border border-[#25467b] text-[#10234a] text-xs font-black flex items-center gap-2 cursor-pointer">
              <PackageCheck className="w-4 h-4" />
              Print Label
            </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div>
            <div className="text-sm font-black text-[#10234a]">Label Printing</div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Managers can print labels manually anytime, or auto-print when a new item is created or the retail price changes.
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold text-[#33476b]">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(settings?.autoPrintLabelOnNewItem)}
                disabled={savingLabelSettings}
                onChange={e => saveLabelSetting({ autoPrintLabelOnNewItem: e.target.checked })}
                className="accent-[#c78d20]"
              />
              Auto print for new item
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(settings?.autoPrintLabelOnPriceChange)}
                disabled={savingLabelSettings}
                onChange={e => saveLabelSetting({ autoPrintLabelOnPriceChange: e.target.checked })}
                className="accent-[#c78d20]"
              />
              Auto print on price change
            </label>
            <label className="flex items-center gap-2">
              Copies
              <select
                value={settings?.autoPrintLabelCopies || 1}
                disabled={savingLabelSettings}
                onChange={e => saveLabelSetting({ autoPrintLabelCopies: Number(e.target.value) })}
                className="h-8 rounded-md border border-slate-300 bg-white px-2"
              >
                {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <button type="button" onClick={onOpenPrintLabel} className="h-8 px-3 rounded-md bg-[#08274d] text-white cursor-pointer">
              Manual Print
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center">
                <Boxes className="w-5 h-5 text-[#10234a]" />
              </div>
              <div>
                <h2 className="text-lg font-black text-[#10234a]">Item Master</h2>
                <p className="text-[10px] text-slate-500">
                  {activeProducts.length.toLocaleString()} items · Shared live catalog for cashier POS and online store
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  placeholder="Search items, SKU, or brand..."
                  className="w-full h-9 rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-[11px] text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <select value={categoryId} onChange={event => setCategoryId(event.target.value)} className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-[10px] font-bold text-slate-600">
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>

              <select value={vendor} onChange={event => setVendor(event.target.value)} className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-[10px] font-bold text-slate-600">
                <option value="all">All Vendors</option>
                {vendors.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>

              <select value={status} onChange={event => setStatus(event.target.value)} className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-[10px] font-bold text-slate-600">
                <option value="all">All Statuses</option>
                <option value="in">In Stock</option>
                <option value="low">Low Stock</option>
                <option value="out">Out of Stock</option>
              </select>

              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setCategoryId('all');
                  setVendor('all');
                  setStatus('all');
                }}
                className="h-9 px-3 rounded-lg border border-blue-400 text-blue-600 bg-white text-[10px] font-black cursor-pointer"
              >
                Reset
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-left text-[10px]">
              <thead className="bg-[#f4f7fb] text-[#33476b] border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2.5">Item</th>
                  <th className="px-3 py-2.5">SKU</th>
                  <th className="px-3 py-2.5">Category</th>
                  <th className="px-3 py-2.5">Size</th>
                  <th className="px-3 py-2.5 text-right">On Hand</th>
                  <th className="px-3 py-2.5 text-right">Cost</th>
                  <th className="px-3 py-2.5 text-right">Price</th>
                  <th className="px-3 py-2.5">Vendor</th>
                  <th className="px-3 py-2.5 text-right">Reorder Level</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-8 text-center text-xs text-slate-400">
                      No inventory items match the current filters.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map(product => {
                    const state = stockStatus(product);
                    const category =
                      product.categoryName ||
                      categories.find(item => item.id === product.categoryId)?.name ||
                      'Uncategorized';
                    return (
                      <tr key={product.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2 min-w-[220px]">
                            {product.imageUrl ? (
                              <img src={product.imageUrl} alt="" className="w-6 h-8 object-contain rounded bg-white" />
                            ) : (
                              <div className="w-6 h-8 rounded bg-slate-100" />
                            )}
                            <span className="font-semibold text-[#203760] truncate">{product.name}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 font-mono text-[#36517a]">{product.sku}</td>
                        <td className="px-3 py-2 text-[#36517a]">{category}</td>
                        <td className="px-3 py-2 text-[#36517a]">{product.size}</td>
                        <td className={'px-3 py-2 text-right font-black ' + (product.stockQuantity <= 0 ? 'text-rose-600' : product.stockQuantity <= product.lowStockThreshold ? 'text-amber-600' : 'text-[#203760]')}>
                          {product.stockQuantity}
                        </td>
                        <td className="px-3 py-2 text-right text-[#36517a]">{money(Number(product.cost ?? product.costPrice ?? 0))}</td>
                        <td className="px-3 py-2 text-right text-[#203760] font-bold">{money(product.price)}</td>
                        <td className="px-3 py-2 text-[#36517a]">{product.vendor || '—'}</td>
                        <td className="px-3 py-2 text-right text-[#36517a]">{product.lowStockThreshold}</td>
                        <td className="px-3 py-2">
                          <span className={'inline-flex items-center gap-1.5 px-2 py-1 rounded-full font-bold ' + state.cls}>
                            <span className={'w-1.5 h-1.5 rounded-full ' + state.dot} />
                            {state.label}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(product)}
                            className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100 font-black cursor-pointer"
                            title="Edit item"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 flex items-center justify-between border-b border-slate-200">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
                <div>
                  <h3 className="text-sm font-black text-[#10234a]">Low Stock & Reorder</h3>
                  <p className="text-[10px] text-slate-500">Items at or below reorder level</p>
                </div>
              </div>
              <button type="button" onClick={() => { setStatus('low'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-[10px] font-black text-blue-600 cursor-pointer">View All</button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[10px]">
                <thead className="bg-[#f4f7fb] text-[#33476b]">
                  <tr>
                    <th className="px-3 py-2">Item</th>
                    <th className="px-3 py-2 text-right">On Hand</th>
                    <th className="px-3 py-2 text-right">Reorder Level</th>
                    <th className="px-3 py-2 text-right">Suggested</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lowStock.map(product => {
                    const state = stockStatus(product);
                    const suggested = Math.max(product.lowStockThreshold * 2 - product.stockQuantity, 1);
                    return (
                      <tr key={product.id}>
                        <td className="px-3 py-2 font-semibold text-[#203760]">{product.name}</td>
                        <td className={'px-3 py-2 text-right font-black ' + (product.stockQuantity <= 0 ? 'text-rose-600' : 'text-amber-600')}>{product.stockQuantity}</td>
                        <td className="px-3 py-2 text-right">{product.lowStockThreshold}</td>
                        <td className="px-3 py-2 text-right">{suggested}</td>
                        <td className="px-3 py-2">
                          <span className={'inline-flex items-center gap-1.5 px-2 py-1 rounded-full font-bold ' + state.cls}>
                            <span className={'w-1.5 h-1.5 rounded-full ' + state.dot} />
                            {state.label}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <button type="button" onClick={() => onNavigate('receiving')} className="px-3 py-1.5 rounded-md bg-[#08274d] hover:bg-[#0b315f] text-white font-black cursor-pointer">
                            Receive Stock
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

        <div className="flex items-center justify-between px-1 text-[10px] text-slate-500">
          <span>{settings?.storeName || 'Store'} inventory</span>
          <span className="font-bold text-emerald-600">Shared inventory source: Manager Portal + Cashier POS + Online Store</span>
        </div>
      </div>

      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-[#10234a]">Edit Item</h2>
                <p className="text-[11px] text-slate-500 mt-0.5">{editingProduct.name}</p>
              </div>
              <button type="button" onClick={() => setEditingProduct(null)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <label className="space-y-1">
                <span className="font-bold text-slate-600">Item Name</span>
                <input value={String(editForm.name || '')} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="w-full h-10 rounded-lg border border-slate-300 px-3" />
              </label>
              <label className="space-y-1">
                <span className="font-bold text-slate-600">SKU</span>
                <input value={String(editForm.sku || '')} onChange={e => setEditForm({ ...editForm, sku: e.target.value })} className="w-full h-10 rounded-lg border border-slate-300 px-3" />
              </label>
              <label className="space-y-1">
                <span className="font-bold text-slate-600">UPC / Barcode</span>
                <input value={String(editForm.barcode || '')} onChange={e => setEditForm({ ...editForm, barcode: e.target.value })} className="w-full h-10 rounded-lg border border-slate-300 px-3 font-mono" />
              </label>
              <label className="space-y-1">
                <span className="font-bold text-slate-600">Category</span>
                <select value={String(editForm.categoryId || '')} onChange={e => setEditForm({ ...editForm, categoryId: e.target.value })} className="w-full h-10 rounded-lg border border-slate-300 px-3 bg-white">
                  {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
              </label>
              <label className="space-y-1">
                <span className="font-bold text-slate-600">Size</span>
                <input value={String(editForm.size || '')} onChange={e => setEditForm({ ...editForm, size: e.target.value })} className="w-full h-10 rounded-lg border border-slate-300 px-3" />
              </label>
              <label className="space-y-1">
                <span className="font-bold text-slate-600">Vendor</span>
                <input value={String(editForm.vendor || '')} onChange={e => setEditForm({ ...editForm, vendor: e.target.value })} className="w-full h-10 rounded-lg border border-slate-300 px-3" />
              </label>
              <label className="space-y-1">
                <span className="font-bold text-slate-600">On Hand</span>
                <input type="number" min="0" value={Number(editForm.stockQuantity ?? 0)} onChange={e => setEditForm({ ...editForm, stockQuantity: Number(e.target.value) })} className="w-full h-10 rounded-lg border border-slate-300 px-3" />
              </label>
              <label className="space-y-1">
                <span className="font-bold text-slate-600">Reorder Level</span>
                <input type="number" min="0" value={Number(editForm.lowStockThreshold ?? 0)} onChange={e => setEditForm({ ...editForm, lowStockThreshold: Number(e.target.value) })} className="w-full h-10 rounded-lg border border-slate-300 px-3" />
              </label>
              <label className="space-y-1">
                <span className="font-bold text-slate-600">Cost</span>
                <input type="number" min="0" step="0.01" value={Number(editForm.cost ?? 0)} onChange={e => setEditForm({ ...editForm, cost: Number(e.target.value) })} className="w-full h-10 rounded-lg border border-slate-300 px-3" />
              </label>
              <label className="space-y-1">
                <span className="font-bold text-slate-600">Retail Price</span>
                <input type="number" min="0" step="0.01" value={Number(editForm.price ?? 0)} onChange={e => setEditForm({ ...editForm, price: Number(e.target.value) })} className="w-full h-10 rounded-lg border border-slate-300 px-3" />
              </label>
            </div>

            <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
              <button type="button" onClick={() => setEditingProduct(null)} className="h-10 px-4 rounded-lg border border-slate-300 bg-white text-slate-700 font-bold cursor-pointer">
                Cancel
              </button>
              <button type="button" disabled={savingProduct} onClick={handleSaveEdit} className="h-10 px-5 rounded-lg bg-[#08274d] text-white font-black flex items-center gap-2 cursor-pointer disabled:opacity-50">
                <Save className="w-4 h-4" />
                {savingProduct ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
