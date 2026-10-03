import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  ClipboardList,
  DollarSign,
  PackageCheck,
  Search,
  ShieldCheck,
  TrendingDown,
} from 'lucide-react';
import { Category, Product, StoreSettings } from '../../types';

interface ManagerInventoryDashboardProps {
  products: Product[];
  categories: Category[];
  settings: StoreSettings | null;
  onNavigate: (tab: string) => void;
}

const money = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);

export const ManagerInventoryDashboard: React.FC<ManagerInventoryDashboardProps> = ({
  products,
  categories,
  settings,
  onNavigate,
}) => {
  const [search, setSearch] = useState('');

  const activeProducts = useMemo(() => products.filter(product => product.active), [products]);
  const totalUnits = activeProducts.reduce((sum, product) => sum + Number(product.stockQuantity || 0), 0);
  const retailValue = activeProducts.reduce(
    (sum, product) => sum + Number(product.stockQuantity || 0) * Number(product.price || 0),
    0
  );
  const costValue = activeProducts.reduce(
    (sum, product) =>
      sum +
      Number(product.stockQuantity || 0) *
        Number(product.cost ?? product.costPrice ?? 0),
    0
  );
  const lowStock = activeProducts.filter(
    product => product.stockQuantity > 0 && product.stockQuantity <= product.lowStockThreshold
  );
  const outOfStock = activeProducts.filter(product => product.stockQuantity <= 0);
  const healthyStock = Math.max(0, activeProducts.length - lowStock.length - outOfStock.length);

  const categoryStats = useMemo(() => {
    const map = new Map<string, { name: string; units: number; products: number; value: number }>();

    activeProducts.forEach(product => {
      const categoryName =
        product.categoryName ||
        categories.find(category => category.id === product.categoryId)?.name ||
        'Uncategorized';

      const current = map.get(categoryName) || {
        name: categoryName,
        units: 0,
        products: 0,
        value: 0,
      };

      current.units += Number(product.stockQuantity || 0);
      current.products += 1;
      current.value += Number(product.stockQuantity || 0) * Number(product.price || 0);
      map.set(categoryName, current);
    });

    return [...map.values()].sort((a, b) => b.units - a.units).slice(0, 7);
  }, [activeProducts, categories]);

  const maxCategoryUnits = Math.max(1, ...categoryStats.map(category => category.units));

  const lowStockRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return [...activeProducts]
      .filter(product => product.stockQuantity <= product.lowStockThreshold)
      .filter(product => {
        if (!query) return true;
        return (
          product.name.toLowerCase().includes(query) ||
          product.sku.toLowerCase().includes(query) ||
          product.barcode.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => {
        const aRatio = a.lowStockThreshold > 0 ? a.stockQuantity / a.lowStockThreshold : 0;
        const bRatio = b.lowStockThreshold > 0 ? b.stockQuantity / b.lowStockThreshold : 0;
        return aRatio - bRatio;
      })
      .slice(0, 8);
  }, [activeProducts, search]);

  const topValueProducts = useMemo(
    () =>
      [...activeProducts]
        .map(product => ({
          ...product,
          inventoryValue: Number(product.stockQuantity || 0) * Number(product.price || 0),
        }))
        .sort((a, b) => b.inventoryValue - a.inventoryValue)
        .slice(0, 5),
    [activeProducts]
  );

  const totalStatus = Math.max(activeProducts.length, 1);
  const healthyPct = (healthyStock / totalStatus) * 100;
  const lowPct = (lowStock.length / totalStatus) * 100;
  const outPct = (outOfStock.length / totalStatus) * 100;

  return (
    <div className="h-full overflow-y-auto bg-[#07111f] text-slate-100">
      <div className="px-5 md:px-7 py-5 space-y-4">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] font-black text-amber-400">
              Inventory
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight mt-1">
              Inventory Performance
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Clean overview of stock health, inventory value, categories, and products needing attention.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onNavigate('receiving')}
              className="px-4 py-2.5 rounded-xl bg-amber-400 text-slate-950 text-xs font-black hover:bg-amber-300 cursor-pointer"
            >
              Receive Inventory
            </button>
            <button
              type="button"
              onClick={() => onNavigate('inventory-catalog')}
              className="px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-900/70 text-xs font-black hover:bg-slate-800 cursor-pointer"
            >
              Full Inventory Catalog
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
          {[
            {
              label: 'Active Products',
              value: String(activeProducts.length),
              detail: \`\${totalUnits.toLocaleString()} units on hand\`,
              icon: Boxes,
              accent: 'text-sky-400',
            },
            {
              label: 'Retail Value',
              value: money(retailValue),
              detail: \`Cost basis \${money(costValue)}\`,
              icon: DollarSign,
              accent: 'text-emerald-400',
            },
            {
              label: 'Healthy Stock',
              value: String(healthyStock),
              detail: 'Above reorder threshold',
              icon: ShieldCheck,
              accent: 'text-emerald-400',
            },
            {
              label: 'Low Stock',
              value: String(lowStock.length),
              detail: 'Needs reorder attention',
              icon: TrendingDown,
              accent: 'text-amber-400',
            },
            {
              label: 'Out of Stock',
              value: String(outOfStock.length),
              detail: 'Unavailable for sale',
              icon: AlertTriangle,
              accent: 'text-rose-400',
            },
          ].map(card => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className="rounded-2xl border border-slate-700/80 bg-[#0b1a2d] p-4 shadow-lg shadow-black/10"
              >
                <div className="flex items-center justify-between">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 font-black">
                    {card.label}
                  </div>
                  <Icon className={\`w-4 h-4 \${card.accent}\`} />
                </div>
                <div className="text-2xl font-black mt-2">{card.value}</div>
                <div className="text-[10px] text-slate-500 mt-1">{card.detail}</div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 rounded-2xl border border-slate-700/80 bg-[#0b1a2d] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-black">Inventory by Category</h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Units currently available by product category.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('inventory-catalog')}
                className="text-[10px] font-black text-sky-400 cursor-pointer"
              >
                View Catalog
              </button>
            </div>

            <div className="space-y-4 mt-6">
              {categoryStats.length === 0 ? (
                <div className="text-xs text-slate-500">No inventory categories available.</div>
              ) : (
                categoryStats.map(category => (
                  <div key={category.name}>
                    <div className="grid grid-cols-[minmax(100px,160px)_1fr_70px_90px] items-center gap-3 text-[10px]">
                      <span className="font-bold text-slate-300 truncate">{category.name}</span>
                      <div className="h-3 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-sky-600 to-sky-400"
                          style={{ width: \`\${Math.max(3, (category.units / maxCategoryUnits) * 100)}%\` }}
                        />
                      </div>
                      <span className="text-right font-black">{category.units}</span>
                      <span className="text-right text-slate-500">{money(category.value)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-700/80 bg-[#0b1a2d] p-4">
            <h2 className="text-base font-black">Stock Health</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">Product status distribution</p>

            <div className="mt-8">
              <div className="h-5 rounded-full overflow-hidden bg-slate-800 flex">
                <div className="bg-emerald-500" style={{ width: \`\${healthyPct}%\` }} />
                <div className="bg-amber-400" style={{ width: \`\${lowPct}%\` }} />
                <div className="bg-rose-500" style={{ width: \`\${outPct}%\` }} />
              </div>

              <div className="space-y-3 mt-6">
                {[
                  ['Healthy', healthyStock, 'bg-emerald-500'],
                  ['Low Stock', lowStock.length, 'bg-amber-400'],
                  ['Out of Stock', outOfStock.length, 'bg-rose-500'],
                ].map(([label, value, dot]: any) => (
                  <div key={label} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className={\`w-2.5 h-2.5 rounded-full \${dot}\`} />
                      <span className="text-slate-300">{label}</span>
                    </div>
                    <span className="font-black">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 rounded-2xl border border-slate-700/80 bg-[#0b1a2d] overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-black">Products Needing Attention</h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Low and out-of-stock items sorted by urgency.
                </p>
              </div>

              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  placeholder="Search product, SKU, barcode..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-sky-600"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[10px]">
                <thead className="bg-slate-950/50 text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-2.5">Product</th>
                    <th className="px-4 py-2.5">SKU</th>
                    <th className="px-4 py-2.5 text-right">On Hand</th>
                    <th className="px-4 py-2.5 text-right">Minimum</th>
                    <th className="px-4 py-2.5 text-right">Retail Value</th>
                    <th className="px-4 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {lowStockRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-xs text-slate-500">
                        No products need attention.
                      </td>
                    </tr>
                  ) : (
                    lowStockRows.map(product => (
                      <tr key={product.id} className="hover:bg-slate-900/40">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 min-w-[220px]">
                            {product.imageUrl ? (
                              <img
                                src={product.imageUrl}
                                alt=""
                                className="w-7 h-9 object-contain rounded bg-slate-900"
                              />
                            ) : (
                              <div className="w-7 h-9 rounded bg-slate-800" />
                            )}
                            <div>
                              <div className="font-black text-slate-200">{product.name}</div>
                              <div className="text-[9px] text-slate-500 mt-0.5">{product.size}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-400">{product.sku}</td>
                        <td className={\`px-4 py-3 text-right font-black \${
                          product.stockQuantity <= 0 ? 'text-rose-400' : 'text-amber-400'
                        }\`}>
                          {product.stockQuantity}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-400">
                          {product.lowStockThreshold}
                        </td>
                        <td className="px-4 py-3 text-right font-black">
                          {money(product.stockQuantity * product.price)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={\`inline-flex px-2 py-1 rounded-full border text-[9px] font-black \${
                            product.stockQuantity <= 0
                              ? 'bg-rose-950/50 border-rose-800 text-rose-300'
                              : 'bg-amber-950/50 border-amber-800 text-amber-300'
                          }\`}>
                            {product.stockQuantity <= 0 ? 'Out of Stock' : 'Low Stock'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-700/80 bg-[#0b1a2d] overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-700">
              <h2 className="text-base font-black">Highest Inventory Value</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Products tying up the most retail value.
              </p>
            </div>

            <div className="divide-y divide-slate-800">
              {topValueProducts.map((product, index) => (
                <div key={product.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="w-6 text-[10px] text-slate-500">{index + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-black truncate">{product.name}</div>
                    <div className="text-[9px] text-slate-500 mt-0.5">
                      {product.stockQuantity} units · {money(product.price)} each
                    </div>
                  </div>
                  <div className="text-xs font-black">{money(product.inventoryValue)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              label: 'Full Catalog',
              detail: 'Add, edit and adjust products',
              tab: 'inventory-catalog',
              icon: Boxes,
            },
            {
              label: 'Receiving',
              detail: 'Invoices and stock receiving',
              tab: 'receiving',
              icon: PackageCheck,
            },
            {
              label: 'Update History',
              detail: 'Review inventory changes',
              tab: 'inventory-history',
              icon: ClipboardList,
            },
            {
              label: 'Inventory Ledger',
              detail: 'Immutable stock movement history',
              tab: 'inventory-ledger',
              icon: ShieldCheck,
            },
          ].map(action => {
            const Icon = action.icon;
            return (
              <button
                key={action.tab}
                type="button"
                onClick={() => onNavigate(action.tab)}
                className="rounded-2xl border border-slate-700 bg-[#0b1a2d] p-4 text-left hover:border-sky-700 hover:bg-[#10223a] cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <Icon className="w-5 h-5 text-sky-400" />
                  <ArrowRight className="w-4 h-4 text-slate-600" />
                </div>
                <div className="text-sm font-black mt-3">{action.label}</div>
                <div className="text-[10px] text-slate-500 mt-1">{action.detail}</div>
              </button>
            );
          })}
        </div>

        <div className="text-[10px] text-slate-600 pb-1">
          {settings?.storeName || 'Store'} inventory data · {activeProducts.length} active products
        </div>
      </div>
    </div>
  );
};
