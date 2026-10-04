import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Boxes,
  ClipboardList,
  PackageCheck,
  Plus,
  Search,
  Truck,
  Upload,
  Download,
  Users,
} from 'lucide-react';
import { Category, Product, ScannedInvoice, StoreSettings } from '../../types';
import { api } from '../../utils/api';

interface ManagerInventoryDashboardProps {
  products: Product[];
  categories: Category[];
  settings: StoreSettings | null;
  onNavigate: (tab: string) => void;
  onOpenPrintLabel: () => void;
  onSettingsUpdated: (settings: StoreSettings) => void;
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
}) => {
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('all');
  const [vendor, setVendor] = useState('all');
  const [status, setStatus] = useState('all');
  const [recentInvoices, setRecentInvoices] = useState<ScannedInvoice[]>([]);
  const [savingLabelSettings, setSavingLabelSettings] = useState(false);

  useEffect(() => {
    api
      .getInvoices()
      .then(list =>
        setRecentInvoices(
          [...list]
            .sort(
              (a, b) =>
                new Date(b.receivedDate || b.createdAt).getTime() -
                new Date(a.receivedDate || a.createdAt).getTime()
            )
            .slice(0, 5)
        )
      )
      .catch(() => setRecentInvoices([]));
  }, [products]);

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

  const navItems = [
    { label: 'Items', icon: Boxes, tab: 'inventory', active: true },
    { label: 'Receive Inventory', icon: Truck, tab: 'receiving' },
    { label: 'Stock Count', icon: ClipboardList, tab: 'inventory-count' },
    { label: 'Vendors', icon: Users, tab: 'inventory-vendors' },
  ];

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
              Manage items, receive stock, run stock counts, manage vendors, and monitor inventory.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => onNavigate('inventory-add')} className="h-11 px-4 rounded-lg bg-[#c78d20] hover:bg-[#b57d18] text-white text-xs font-black flex items-center gap-2 cursor-pointer shadow-sm">
              <Plus className="w-4 h-4" />
              Add Item
            </button>
            <button type="button" onClick={() => onNavigate('receiving')} className="h-11 px-4 rounded-lg bg-[#08274d] hover:bg-[#0b315f] text-white text-xs font-black flex items-center gap-2 cursor-pointer">
              <Truck className="w-4 h-4" />
              Receive Items
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

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => onNavigate(item.tab)}
                className={'h-16 rounded-lg border flex items-center justify-center gap-3 text-xs font-black cursor-pointer transition ' + (item.active ? 'bg-[#08274d] text-white border-[#08274d] shadow-sm' : 'bg-white text-[#10234a] border-slate-200 hover:border-[#c78d20]')}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </button>
            );
          })}
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
                            onClick={() => onNavigate('inventory-catalog')}
                            className="w-7 h-7 rounded-md border border-slate-300 text-[#203760] hover:bg-slate-100 cursor-pointer"
                            title="Open product in inventory catalog"
                          >
                            •••
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

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 flex items-center justify-between border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-[#08274d]" />
                <div>
                  <h3 className="text-sm font-black text-[#10234a]">Recent Receiving</h3>
                  <p className="text-[10px] text-slate-500">Most recent inventory receipts</p>
                </div>
              </div>
              <button type="button" onClick={() => onNavigate('receiving')} className="text-[10px] font-black text-blue-600 cursor-pointer">View All</button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[10px]">
                <thead className="bg-[#f4f7fb] text-[#33476b]">
                  <tr>
                    <th className="px-3 py-2">Receipt #</th>
                    <th className="px-3 py-2">Vendor</th>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2 text-right">Items</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentInvoices.length === 0 ? (
                    <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-400">No recent receipts.</td></tr>
                  ) : (
                    recentInvoices.map(invoice => (
                      <tr key={invoice.id}>
                        <td className="px-3 py-2 font-bold text-blue-600">{invoice.invoiceNumber}</td>
                        <td className="px-3 py-2 text-[#36517a]">{invoice.vendorName}</td>
                        <td className="px-3 py-2 text-[#36517a]">{new Date(invoice.receivedDate || invoice.createdAt).toLocaleDateString()}</td>
                        <td className="px-3 py-2 text-right font-bold">
                          {invoice.lineItems.reduce((sum, line) => sum + Number(line.totalInventoryUnits || line.quantity || 0), 0)}
                        </td>
                        <td className="px-3 py-2">
                          <span className={'inline-flex px-2 py-1 rounded-full font-bold ' + (invoice.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' : invoice.status === 'failed' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700')}>
                            {invoice.status === 'confirmed' ? 'Received' : invoice.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

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
    </div>
  );
};
