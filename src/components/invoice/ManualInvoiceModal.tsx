import React, { useEffect, useMemo, useState } from 'react';
import {
  FilePlus2,
  Plus,
  Printer,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import { InvoiceLineItem, Product, ScannedInvoice, Vendor } from '../../types';
import { api } from '../../utils/api';

interface ManualInvoiceModalProps {
  isOpen: boolean;
  products: Product[];
  onClose: () => void;
  onSaved?: (invoice: ScannedInvoice) => void;
  onFinalize?: (invoice: ScannedInvoice) => void;
}

interface ManualLine {
  id: string;
  productId: string;
  vendorItemNumber: string;
  receivedCases: number;
  unitsPerCase: number;
  receivedUnits: number;
  costPerUnit: number;
  price: number;
}

const today = () => new Date().toISOString().slice(0, 10);

export const ManualInvoiceModal: React.FC<ManualInvoiceModalProps> = ({
  isOpen,
  products,
  onClose,
  onSaved,
  onFinalize,
}) => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vendorId, setVendorId] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(today());
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<ManualLine[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    api.getVendors().then(setVendors).catch(() => setVendors([]));
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setVendorId('');
    setVendorName('');
    setInvoiceNumber('');
    setInvoiceDate(today());
    setDueDate('');
    setNotes('');
    setLines([]);
    setError(null);
  }, [isOpen]);

  const addLine = () => {
    setLines(prev => [
      ...prev,
      {
        id: `manual-line-${Date.now()}-${prev.length + 1}`,
        productId: '',
        vendorItemNumber: '',
        receivedCases: 0,
        unitsPerCase: 1,
        receivedUnits: 1,
        costPerUnit: 0,
        price: 0,
      },
    ]);
  };

  const updateLine = (id: string, patch: Partial<ManualLine>) => {
    setLines(prev =>
      prev.map(line => {
        if (line.id !== id) return line;
        const next = { ...line, ...patch };

        if ('productId' in patch) {
          const product = products.find(item => item.id === patch.productId);
          if (product) {
            next.costPerUnit = Number(product.cost ?? product.costPrice ?? 0);
            next.price = Number(product.price || 0);
            next.vendorItemNumber = product.vendorSku || '';
          }
        }

        if ('receivedCases' in patch || 'unitsPerCase' in patch) {
          const cases = Math.max(0, Number(next.receivedCases || 0));
          const unitsPerCase = Math.max(1, Number(next.unitsPerCase || 1));
          if (cases > 0) next.receivedUnits = cases * unitsPerCase;
        }

        return next;
      })
    );
  };

  const selectedVendor = vendors.find(vendor => vendor.id === vendorId);

  const totals = useMemo(() => {
    return lines.reduce(
      (sum, line) => {
        const qty = Math.max(0, Number(line.receivedUnits || 0));
        const cost = Math.max(0, Number(line.costPerUnit || 0));
        const retail = Math.max(0, Number(line.price || 0));
        sum.units += qty;
        sum.cases += Math.max(0, Number(line.receivedCases || 0));
        sum.total += qty * cost;
        sum.retail += qty * retail;
        return sum;
      },
      { units: 0, cases: 0, total: 0, retail: 0 }
    );
  }, [lines]);

  const marginPercent =
    totals.retail > 0 ? ((totals.retail - totals.total) / totals.retail) * 100 : 0;

  const buildInvoice = (status: ScannedInvoice['status']): Partial<ScannedInvoice> => {
    const now = new Date().toISOString();

    const lineItems: InvoiceLineItem[] = lines
      .filter(line => line.productId && line.receivedUnits > 0)
      .map(line => {
        const product = products.find(item => item.id === line.productId)!;
        const qty = Math.max(1, Number(line.receivedUnits || 1));
        const unitCost = Math.max(0, Number(line.costPerUnit || 0));
        const lineTotal = Number((qty * unitCost).toFixed(2));
        const currentCost = Number(product.cost ?? product.costPrice ?? 0);
        const currentPrice = Number(line.price || product.price || 0);

        return {
          id: line.id,
          description: product.name,
          vendorItemNumber: line.vendorItemNumber || undefined,
          upc: product.barcode,
          sku: product.sku,
          quantity: line.receivedCases > 0 ? Number(line.receivedCases) : qty,
          unitSize: product.size,
          isCaseOrPack: line.receivedCases > 0,
          packSize: line.receivedCases > 0 ? Math.max(1, Number(line.unitsPerCase || 1)) : 1,
          totalInventoryUnits: qty,
          unitCost,
          caseCost:
            line.receivedCases > 0
              ? Number((unitCost * Math.max(1, Number(line.unitsPerCase || 1))).toFixed(2))
              : undefined,
          extendedCost: lineTotal,
          discount: 0,
          lineTotal,
          matchedProductId: product.id,
          matchedProductName: product.name,
          matchedProductSku: product.sku,
          matchType: 'manual',
          confidence: 100,
          status: 'matched',
          currentCost,
          costDiff: Number((unitCost - currentCost).toFixed(2)),
          costDiffPercent:
            currentCost > 0 ? Number((((unitCost - currentCost) / currentCost) * 100).toFixed(1)) : 0,
          currentPrice,
          oldMargin:
            currentPrice > 0 ? Number((((currentPrice - currentCost) / currentPrice) * 100).toFixed(1)) : 0,
          newMargin:
            currentPrice > 0 ? Number((((currentPrice - unitCost) / currentPrice) * 100).toFixed(1)) : 0,
          suggestedPrice: currentPrice,
          updateMasterCost: true,
        };
      });

    return {
      invoiceNumber: invoiceNumber.trim(),
      invoiceDate,
      dueDate: dueDate || undefined,
      receivedDate: invoiceDate,
      vendorId: selectedVendor?.id,
      vendorName: selectedVendor?.name || vendorName.trim(),
      vendorStatus: selectedVendor ? 'existing' : 'new',
      vendorInfo: selectedVendor
        ? undefined
        : {
            name: vendorName.trim(),
            source: 'Manual',
            active: true,
          },
      subtotal: Number(totals.total.toFixed(2)),
      taxAmount: 0,
      freightAmount: 0,
      totalAmount: Number(totals.total.toFixed(2)),
      lineItems,
      status,
      notes: [dueDate ? `Due date: ${dueDate}` : '', notes.trim()].filter(Boolean).join(' | ') || undefined,
      extractedConfidence: 100,
      processingWarnings: [],
      receivingLocation: 'Manager Portal - Manual Invoice',
      createdAt: now,
      updatedAt: now,
    };
  };

  const validate = () => {
    if (!(selectedVendor?.name || vendorName.trim())) {
      setError('Supplier is required.');
      return false;
    }
    if (!invoiceNumber.trim()) {
      setError('Invoice number is required.');
      return false;
    }
    if (!invoiceDate) {
      setError('Invoice date is required.');
      return false;
    }
    if (lines.filter(line => line.productId && line.receivedUnits > 0).length === 0) {
      setError('Add at least one product with a received quantity.');
      return false;
    }
    setError(null);
    return true;
  };

  const saveInvoice = async (finalize: boolean) => {
    if (!validate()) return;
    setSaving(true);
    try {
      const created = await api.saveInvoiceDraft(buildInvoice(finalize ? 'review_required' : 'draft'));
      if (finalize) {
        onFinalize?.(created);
      } else {
        onSaved?.(created);
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Unable to save manual invoice.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3">
      <div className="w-full max-w-[1280px] max-h-[94vh] overflow-hidden rounded-2xl border border-slate-700 bg-[#0b1119] text-white shadow-2xl flex flex-col">
        <div className="px-5 py-4 bg-[#123f73] border-b border-blue-300/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FilePlus2 className="w-5 h-5" />
            <div>
              <h2 className="text-lg font-black">Manual Invoice Intake</h2>
              <p className="text-[11px] text-blue-100/80">Enter a supplier invoice without scanning a document.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <label className="space-y-1">
              <span className="text-xs font-bold text-slate-300">Supplier</span>
              <select
                value={vendorId}
                onChange={e => {
                  setVendorId(e.target.value);
                  const vendor = vendors.find(row => row.id === e.target.value);
                  setVendorName(vendor?.name || '');
                }}
                className="w-full h-10 rounded-lg border border-slate-600 bg-[#121a25] px-3 text-sm"
              >
                <option value="">Select supplier...</option>
                {vendors.map(vendor => (
                  <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
                ))}
              </select>
              {!vendorId && (
                <input
                  value={vendorName}
                  onChange={e => setVendorName(e.target.value)}
                  placeholder="Or type supplier name"
                  className="w-full h-10 rounded-lg border border-slate-600 bg-[#121a25] px-3 text-sm"
                />
              )}
            </label>

            <label className="space-y-1">
              <span className="text-xs font-bold text-slate-300">Invoice Number</span>
              <input
                value={invoiceNumber}
                onChange={e => setInvoiceNumber(e.target.value)}
                className="w-full h-10 rounded-lg border border-slate-600 bg-[#121a25] px-3 text-sm"
                placeholder="INV-100245"
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs font-bold text-slate-300">Invoice Date</span>
              <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} className="w-full h-10 rounded-lg border border-slate-600 bg-[#121a25] px-3 text-sm" />
            </label>

            <label className="space-y-1">
              <span className="text-xs font-bold text-slate-300">Due Date</span>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full h-10 rounded-lg border border-slate-600 bg-[#121a25] px-3 text-sm" />
            </label>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              ['Invoice Total', totals.total.toFixed(2)],
              ['Margin', `${marginPercent.toFixed(2)}%`],
              ['Cases', String(totals.cases)],
              ['Units', String(totals.units)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-slate-700 bg-[#111923] px-4 py-3">
                <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">{label}</div>
                <div className="text-xl font-black mt-1 text-white">{label === 'Invoice Total' ? `$${value}` : value}</div>
              </div>
            ))}
          </div>

          <label className="space-y-1 block">
            <span className="text-xs font-bold text-slate-300">Note</span>
            <input value={notes} onChange={e => setNotes(e.target.value)} className="w-full h-10 rounded-lg border border-slate-600 bg-[#121a25] px-3 text-sm" placeholder="Optional invoice notes" />
          </label>

          <div className="flex justify-end">
            <button type="button" onClick={addLine} className="h-10 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 font-black text-sm flex items-center gap-2 cursor-pointer">
              <Plus className="w-4 h-4" />
              Add Item
            </button>
          </div>

          <div className="rounded-xl border border-slate-700 overflow-x-auto">
            <table className="w-full min-w-[1180px] text-[11px]">
              <thead className="bg-[#17304b] text-slate-200">
                <tr>
                  <th className="px-3 py-3 text-left">Product</th>
                  <th className="px-3 py-3 text-left">Vendor Item No.</th>
                  <th className="px-3 py-3 text-right">Qty On Hand</th>
                  <th className="px-3 py-3 text-right">Received Case</th>
                  <th className="px-3 py-3 text-right">Unit / Case</th>
                  <th className="px-3 py-3 text-right">Received Units</th>
                  <th className="px-3 py-3 text-right">Total Cost</th>
                  <th className="px-3 py-3 text-right">Cost / Unit</th>
                  <th className="px-3 py-3 text-right">Price</th>
                  <th className="px-3 py-3 text-right">Margin</th>
                  <th className="px-3 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-[#0e1722]">
                {lines.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-12 text-center text-slate-500">
                      No items added. Click <strong className="text-slate-300">Add Item</strong> to enter invoice lines manually.
                    </td>
                  </tr>
                ) : (
                  lines.map(line => {
                    const product = products.find(item => item.id === line.productId);
                    const totalCost = Number(line.receivedUnits || 0) * Number(line.costPerUnit || 0);
                    const margin =
                      Number(line.price || 0) > 0
                        ? ((Number(line.price) - Number(line.costPerUnit || 0)) / Number(line.price)) * 100
                        : 0;
                    return (
                      <tr key={line.id}>
                        <td className="px-2 py-2">
                          <select
                            value={line.productId}
                            onChange={e => updateLine(line.id, { productId: e.target.value })}
                            className="w-64 h-9 rounded-md border border-slate-600 bg-[#121a25] px-2 text-xs"
                          >
                            <option value="">Select product...</option>
                            {products.filter(item => item.active).map(item => (
                              <option key={item.id} value={item.id}>{item.name} — {item.sku}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-2">
                          <input value={line.vendorItemNumber} onChange={e => updateLine(line.id, { vendorItemNumber: e.target.value })} className="w-32 h-9 rounded-md border border-slate-600 bg-[#121a25] px-2" />
                        </td>
                        <td className="px-2 py-2 text-right font-black text-slate-300">{product?.stockQuantity ?? 0}</td>
                        <td className="px-2 py-2">
                          <input type="number" min="0" value={line.receivedCases} onChange={e => updateLine(line.id, { receivedCases: Number(e.target.value) })} className="w-20 h-9 rounded-md border border-slate-600 bg-[#121a25] px-2 text-right" />
                        </td>
                        <td className="px-2 py-2">
                          <input type="number" min="1" value={line.unitsPerCase} onChange={e => updateLine(line.id, { unitsPerCase: Number(e.target.value) })} className="w-20 h-9 rounded-md border border-slate-600 bg-[#121a25] px-2 text-right" />
                        </td>
                        <td className="px-2 py-2">
                          <input type="number" min="0" value={line.receivedUnits} onChange={e => updateLine(line.id, { receivedUnits: Number(e.target.value), receivedCases: 0 })} className="w-24 h-9 rounded-md border border-slate-600 bg-[#121a25] px-2 text-right" />
                        </td>
                        <td className="px-2 py-2 text-right font-black">${totalCost.toFixed(2)}</td>
                        <td className="px-2 py-2">
                          <input type="number" step="0.01" min="0" value={line.costPerUnit} onChange={e => updateLine(line.id, { costPerUnit: Number(e.target.value) })} className="w-24 h-9 rounded-md border border-slate-600 bg-[#121a25] px-2 text-right" />
                        </td>
                        <td className="px-2 py-2">
                          <input type="number" step="0.01" min="0" value={line.price} onChange={e => updateLine(line.id, { price: Number(e.target.value) })} className="w-24 h-9 rounded-md border border-slate-600 bg-[#121a25] px-2 text-right" />
                        </td>
                        <td className={`px-2 py-2 text-right font-black ${margin >= 30 ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {margin.toFixed(1)}%
                        </td>
                        <td className="px-2 py-2 text-center">
                          <button type="button" onClick={() => setLines(prev => prev.filter(item => item.id !== line.id))} className="w-8 h-8 rounded-md border border-rose-800 text-rose-400 hover:bg-rose-950/30 inline-flex items-center justify-center cursor-pointer">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {error && (
            <div className="rounded-lg border border-rose-800 bg-rose-950/20 px-4 py-3 text-sm text-rose-300">
              {error}
            </div>
          )}
        </div>

        <div className="px-5 py-4 bg-[#101a27] border-t border-slate-700 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            Finalize opens the existing invoice review screen before stock is received.
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => window.print()} className="h-10 px-4 rounded-lg bg-slate-700 hover:bg-slate-600 font-bold text-sm flex items-center gap-2 cursor-pointer">
              <Printer className="w-4 h-4" /> Print
            </button>
            <button type="button" disabled={saving} onClick={() => saveInvoice(false)} className="h-10 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 font-bold text-sm flex items-center gap-2 cursor-pointer">
              <Save className="w-4 h-4" /> Save For Later
            </button>
            <button type="button" disabled={saving} onClick={() => saveInvoice(true)} className="h-10 px-5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 font-black text-sm flex items-center gap-2 cursor-pointer">
              <Save className="w-4 h-4" /> Finalize
            </button>
            <button type="button" onClick={onClose} className="h-10 px-4 rounded-lg bg-slate-700 hover:bg-slate-600 font-bold text-sm flex items-center gap-2 cursor-pointer">
              <X className="w-4 h-4" /> Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
