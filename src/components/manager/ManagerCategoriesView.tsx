import React, { useMemo, useState } from 'react';
import { Layers, Search } from 'lucide-react';
import { Category, Product } from '../../types';

interface ManagerCategoriesViewProps {
  categories: Category[];
  products: Product[];
}

export const ManagerCategoriesView: React.FC<ManagerCategoriesViewProps> = ({
  categories,
  products,
}) => {
  const [search, setSearch] = useState('');

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return categories
      .filter(category => !query || category.name.toLowerCase().includes(query))
      .map(category => ({
        ...category,
        productCount: products.filter(
          product => product.active && product.categoryId === category.id
        ).length,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [categories, products, search]);

  return (
    <div className="h-full overflow-y-auto bg-[#eef3f8] text-[#10234a]">
      <div className="px-4 md:px-5 py-4 space-y-3">
        <div>
          <div className="text-[10px] text-slate-500 mb-1">
            Inventory <span className="mx-1">›</span> Categories
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">Categories</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Review the category structure used by the item catalog.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center">
                <Layers className="w-5 h-5 text-[#10234a]" />
              </div>
              <div>
                <div className="text-sm font-black">Category Directory</div>
                <div className="text-[10px] text-slate-500">{categories.length} categories</div>
              </div>
            </div>

            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Search categories..."
                className="w-full h-9 rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-[11px] text-slate-800 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-[11px]">
              <thead className="bg-[#f4f7fb] text-[#33476b] border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Slug</th>
                  <th className="px-4 py-3 text-right">Products</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-slate-400">
                      No categories match your search.
                    </td>
                  </tr>
                ) : (
                  rows.map(category => (
                    <tr key={category.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-bold text-[#203760]">{category.name}</td>
                      <td className="px-4 py-3 font-mono text-slate-500">{category.slug || '—'}</td>
                      <td className="px-4 py-3 text-right font-black text-blue-600">
                        {category.productCount}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="text-[10px] text-slate-500 px-1">
          Category definitions are shared across the item catalog, POS register, and online store.
        </div>
      </div>
    </div>
  );
};
