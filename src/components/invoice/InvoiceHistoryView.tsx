import React, { useState, useEffect } from 'react';
import { ScannedInvoice } from '../../types';
import { api } from '../../utils/api';
import {
  FileText,
  Search,
  Filter,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  Download,
  Building2,
  MapPin,
  X,
  ExternalLink,
  QrCode,
  Barcode,
  Sparkles
} from 'lucide-react';

interface InvoiceHistoryViewProps {
  onScanNew: () => void;
  onReviewInvoice?: (invoice: ScannedInvoice) => void;
  onOpenQrModal?: () => void;
  onOpenMultiBarcodeModal?: () => void;
}

export const InvoiceHistoryView: React.FC<InvoiceHistoryViewProps> = ({
  onScanNew,
  onReviewInvoice,
  onOpenQrModal,
  onOpenMultiBarcodeModal,
}) => {
  const [invoices, setInvoices] = useState<ScannedInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedInvoice, setSelectedInvoice] = useState<ScannedInvoice | null>(null);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const data = await api.getInvoices({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        q: searchTerm || undefined,
      });
      setInvoices(data);
    } catch (err) {
      console.error('Failed to load invoices', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadInvoices();
  };

  return (
    <div className="space-y-4">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#141414] p-4 rounded-xl border border-[#262626]">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-[#C5A059]/20 text-[#C5A059] flex items-center justify-center border border-[#C5A059]/30">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Invoice History & Archives (IN-SC-16)
            </h2>
            <p className="text-xs text-[#888888]">
              Track scanned vendor invoices, original receipt documents, and stock receipts
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onOpenQrModal && (
            <button
              type="button"
              onClick={onOpenQrModal}
              className="flex items-center space-x-1.5 px-3 py-2 bg-[#1F1F1F] hover:bg-[#282828] text-white border border-[#3A3A3A] font-bold text-xs uppercase tracking-wider rounded-lg transition-colors shadow-xs cursor-pointer"
              title="Scan QR with phone camera (INV-01 to INV-18)"
            >
              <QrCode className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>Phone QR Intake</span>
            </button>
          )}

          {onOpenMultiBarcodeModal && (
            <button
              type="button"
              onClick={onOpenMultiBarcodeModal}
              className="flex items-center space-x-1.5 px-3 py-2 bg-[#1F1F1F] hover:bg-[#282828] text-white border border-[#3A3A3A] font-bold text-xs uppercase tracking-wider rounded-lg transition-colors shadow-xs cursor-pointer"
              title="Continuous Multi-Barcode Receiving (INV-MB-01 to INV-MB-20)"
            >
              <Barcode className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>Multi-Barcode Scan</span>
            </button>
          )}

          <button
            type="button"
            onClick={onScanNew}
            className="flex items-center space-x-1.5 px-4 py-2 bg-[#C5A059] hover:bg-[#D4AF37] text-black font-bold text-xs uppercase tracking-wider rounded-lg transition-colors shadow-md cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-black" />
            <span>AI Invoice Scan</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearchSubmit} className="relative grow">
          <Search className="w-4 h-4 text-[#888888] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by invoice #, vendor name, or product description..."
            className="w-full bg-[#141414] border border-[#262626] rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-[#666666] focus:outline-hidden focus:border-[#C5A059]"
          />
        </form>

        <div className="flex space-x-2">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-[#141414] border border-[#262626] rounded-xl px-3 py-2 text-xs text-[#CCCCCC] focus:outline-hidden focus:border-[#C5A059]"
          >
            <option value="all">All Statuses</option>
            <option value="confirmed">Confirmed & Received</option>
            <option value="review">Needs Review</option>
            <option value="draft">Draft</option>
          </select>
        </div>
      </div>

      {/* Invoices List */}
      <div className="bg-[#141414] border border-[#262626] rounded-xl overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-xs text-[#888888]">
            Loading invoice archives...
          </div>
        ) : invoices.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <FileText className="w-8 h-8 text-[#444444] mx-auto" />
            <p className="text-sm font-semibold text-[#888888]">No invoices found</p>
            <p className="text-xs text-[#666666]">
              Upload or scan a vendor invoice using the button above.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#1F1F1F]">
            {invoices.map(inv => (
              <div
                key={inv.id}
                className="p-4 hover:bg-[#1A1A1A] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-sm text-white font-mono">
                      #{inv.invoiceNumber}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        inv.status === 'confirmed'
                          ? 'bg-green-950/40 text-green-400 border border-green-800/40'
                          : inv.status === 'review'
                          ? 'bg-amber-950/40 text-amber-400 border border-amber-800/40'
                          : 'bg-[#262626] text-[#888888]'
                      }`}
                    >
                      {inv.status}
                    </span>
                    {inv.isDuplicate && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-950/40 text-red-400 border border-red-800/40">
                        Duplicate Flagged
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-[#AAAAAA] flex items-center space-x-2">
                    <span className="font-semibold text-white">{inv.vendorName}</span>
                    <span>•</span>
                    <span className="font-mono">{inv.invoiceDate}</span>
                    <span>•</span>
                    <span>{inv.lineItems.length} line items</span>
                    {inv.receivingLocation && (
                      <>
                        <span>•</span>
                        <span className="text-[#C5A059] flex items-center space-x-1">
                          <MapPin className="w-3 h-3" />
                          <span>{inv.receivingLocation}</span>
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end space-x-4">
                  <div className="text-right">
                    <div className="font-mono font-bold text-white text-sm">
                      ${inv.totalAmount.toFixed(2)}
                    </div>
                    <div className="text-[11px] text-[#666666]">
                      By {inv.receivedByUserName || 'Staff'}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setSelectedInvoice(inv)}
                      className="px-3 py-1.5 rounded-lg bg-[#1A1A1A] hover:bg-[#262626] border border-[#262626] text-xs text-[#CCCCCC] hover:text-white flex items-center space-x-1.5 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View</span>
                    </button>

                    {inv.status !== 'confirmed' && onReviewInvoice && (
                      <button
                        type="button"
                        onClick={() => onReviewInvoice(inv)}
                        className="px-3 py-1.5 rounded-lg bg-[#C5A059]/20 hover:bg-[#C5A059]/30 text-[#C5A059] border border-[#C5A059]/40 text-xs font-bold cursor-pointer"
                      >
                        Review
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invoice Details & Document Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="bg-[#141414] border border-[#262626] rounded-xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#262626] bg-[#1A1A1A]">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Invoice Archive #{selectedInvoice.invoiceNumber}
                </h3>
                <p className="text-xs text-[#888888]">
                  {selectedInvoice.vendorName} • {selectedInvoice.invoiceDate}
                </p>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="p-1.5 text-[#888888] hover:text-white rounded-lg hover:bg-[#262626] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              {/* Preserved File Preview */}
              {selectedInvoice.fileDataUrl && (
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-[#888888] uppercase tracking-wider">
                    Original Document Preview ({selectedInvoice.fileName})
                  </span>
                  <div className="max-h-60 overflow-y-auto bg-black rounded-lg p-2 border border-[#262626] flex justify-center">
                    {selectedInvoice.fileType?.includes('pdf') ? (
                      <iframe
                        src={selectedInvoice.fileDataUrl}
                        title="Archived PDF"
                        className="w-full h-56 rounded"
                      />
                    ) : (
                      <img
                        src={selectedInvoice.fileDataUrl}
                        alt="Archived Invoice"
                        className="max-h-52 object-contain rounded"
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Line Items Table */}
              <div>
                <span className="text-xs font-semibold text-[#888888] uppercase tracking-wider block mb-2">
                  Line Items ({selectedInvoice.lineItems.length})
                </span>
                <div className="border border-[#262626] rounded-lg overflow-x-auto">
                  <table className="w-full text-left text-xs text-[#CCCCCC] divide-y divide-[#262626]">
                    <thead className="bg-[#1A1A1A] text-[#888888] font-bold uppercase text-[10px]">
                      <tr>
                        <th className="px-3 py-2">Item</th>
                        <th className="px-3 py-2 text-center">Qty / Units</th>
                        <th className="px-3 py-2 text-right">Unit Cost</th>
                        <th className="px-3 py-2 text-right">Line Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1F1F1F]">
                      {selectedInvoice.lineItems.map(l => (
                        <tr key={l.id}>
                          <td className="px-3 py-2">
                            <div className="font-medium text-white">{l.description}</div>
                            {l.matchedProductName && (
                              <div className="text-[11px] text-[#C5A059]">
                                Matched: {l.matchedProductName}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center font-mono">
                            {l.totalInventoryUnits} units
                          </td>
                          <td className="px-3 py-2 text-right font-mono">
                            ${l.unitCost.toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-white">
                            ${l.lineTotal.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Summary Totals */}
              <div className="flex justify-end pt-2 border-t border-[#262626]">
                <div className="text-right space-y-1">
                  <div className="text-xs text-[#888888]">
                    Subtotal: <span className="font-mono text-white">${selectedInvoice.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="text-xs text-[#888888]">
                    Tax: <span className="font-mono text-white">${selectedInvoice.taxAmount.toFixed(2)}</span>
                  </div>
                  <div className="text-base font-bold text-[#C5A059] font-mono">
                    Total: ${selectedInvoice.totalAmount.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-3 border-t border-[#262626] bg-[#1A1A1A] flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="px-4 py-1.5 bg-[#262626] hover:bg-[#333333] text-xs text-white rounded-lg cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
