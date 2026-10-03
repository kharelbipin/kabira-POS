import React, { useEffect, useMemo, useState } from 'react';
import JSZip from 'jszip';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Download,
  FileDown,
  Package,
  RefreshCw,
  Tags,
  UploadCloud,
  WalletCards,
} from 'lucide-react';
import {
  ManufacturerReimbursementSummary,
  Product,
  Promotion,
  ScanDataExportBatch,
  ScanDataTransaction,
  StoreSettings,
} from '../../types';
import { api } from '../../utils/api';
import { PromotionsSettings } from '../PromotionsSettings';

type CenterTab =
  | 'overview'
  | 'programs'
  | 'products'
  | 'transactions'
  | 'exports'
  | 'reimbursements'
  | 'errors'
  | 'settings';

interface ManagerPromotionScanDataCenterProps {
  products: Product[];
  settings: StoreSettings | null;
  onNavigate: (tab: string) => void;
  onSettingsUpdated: (settings: StoreSettings) => void;
}

const money = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);

const downloadCsv = (fileName: string, csv: string) => {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const downloadBlob = (fileName: string, blob: Blob) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const ManagerPromotionScanDataCenter: React.FC<ManagerPromotionScanDataCenterProps> = ({
  products,
  settings,
  onNavigate,
  onSettingsUpdated,
}) => {
  const [tab, setTab] = useState<CenterTab>('overview');
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [transactions, setTransactions] = useState<ScanDataTransaction[]>([]);
  const [batches, setBatches] = useState<ScanDataExportBatch[]>([]);
  const [summary, setSummary] = useState<{
    totals: {
      transactions: number;
      eligibleUnits: number;
      discountsGiven: number;
      expectedReimbursement: number;
      pendingTransactions: number;
      errorTransactions: number;
    };
    byManufacturer: ManufacturerReimbursementSummary[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [subscriptionForm, setSubscriptionForm] = useState({
    active: settings?.scanDataSubscriptionActive ?? false,
    provider: settings?.scanDataSubscriptionProvider || '',
    monthlyFee: Number(settings?.scanDataMonthlySubscriptionFee || 0),
    retailerAccountId: settings?.scanDataRetailerAccountId || '',
    defaultFrequency: settings?.scanDataDefaultExportFrequency || 'monthly',
  });

  const [companyFilter, setCompanyFilter] = useState('all');
  const [headingFilter, setHeadingFilter] = useState('all');
  const [programFilter, setProgramFilter] = useState('all');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));

  const loadAll = async () => {
    setLoading(true);
    try {
      const [promoRows, txRows, batchRows, summaryRows] = await Promise.all([
        api.getPromotions(),
        api.getScanDataTransactions(),
        api.getScanDataExportBatches(),
        api.getScanDataSummary(),
      ]);
      setPromotions(promoRows);
      setTransactions(txRows);
      setBatches(batchRows);
      setSummary(summaryRows);
    } catch (error) {
      console.error('Failed to load promotions and scan data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  useEffect(() => {
    setSubscriptionForm({
      active: settings?.scanDataSubscriptionActive ?? false,
      provider: settings?.scanDataSubscriptionProvider || '',
      monthlyFee: Number(settings?.scanDataMonthlySubscriptionFee || 0),
      retailerAccountId: settings?.scanDataRetailerAccountId || '',
      defaultFrequency: settings?.scanDataDefaultExportFrequency || 'monthly',
    });
  }, [settings]);

  const manufacturerPrograms = useMemo(
    () => promotions.filter(p => p.fundingSource && p.fundingSource !== 'store'),
    [promotions]
  );

  const companies = useMemo(
    () =>
      Array.from(
        new Set(
          [
            ...manufacturerPrograms.map(p => p.manufacturerName || ''),
            ...products.map(p => p.manufacturerName || ''),
            ...transactions.map(t => t.manufacturerName || ''),
          ].filter(Boolean)
        )
      ).sort(),
    [manufacturerPrograms, products, transactions]
  );

  const headings = useMemo(
    () =>
      Array.from(
        new Set(
          [
            ...manufacturerPrograms.map(p => p.productHeading || ''),
            ...products.map(p => p.productHeading || ''),
            ...transactions.map(t => t.productHeading || ''),
          ].filter(Boolean)
        )
      ).sort(),
    [manufacturerPrograms, products, transactions]
  );

  const mappedProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter(product => {
      if (!q) return true;
      return (
        product.name.toLowerCase().includes(q) ||
        product.sku.toLowerCase().includes(q) ||
        product.barcode.toLowerCase().includes(q) ||
        String(product.manufacturerName || '').toLowerCase().includes(q) ||
        String(product.productHeading || '').toLowerCase().includes(q)
      );
    });
  }, [products, search]);

  const mappingErrors = useMemo(
    () =>
      products.filter(
        p =>
          p.scanDataEligible &&
          (!String(p.productHeading || '').trim() || !String(p.manufacturerName || '').trim())
      ),
    [products]
  );

  const transactionErrors = useMemo(
    () =>
      transactions.filter(
        t =>
          t.saleStatus !== 'sale' ||
          t.submissionStatus === 'rejected' ||
          t.submissionStatus === 'excluded'
      ),
    [transactions]
  );

  const handleGenerateExport = async () => {
    setBusy(true);
    try {
      const result = await api.createScanDataExportBatch({
        manufacturerName: companyFilter,
        productHeading: headingFilter,
        programId: programFilter,
        startDate,
        endDate,
      });
      downloadCsv(result.batch.fileName, result.csv);
      await api.updateScanDataExportBatchStatus(result.batch.id, { status: 'downloaded' });
      await loadAll();
      setTab('exports');
    } catch (error: any) {
      const details = Array.isArray(error?.validationErrors)
        ? '\n' + error.validationErrors.join('\n')
        : '';
      alert((error?.message || 'Could not generate scan-data file.') + details);
    } finally {
      setBusy(false);
    }
  };

  const handleGenerateSeparateFiles = async () => {
    setBusy(true);
    try {
      const from = startDate ? new Date(startDate + 'T00:00:00').getTime() : Number.NEGATIVE_INFINITY;
      const to = endDate ? new Date(endDate + 'T23:59:59').getTime() : Number.POSITIVE_INFINITY;
      const pending = transactions.filter(tx => {
        const time = new Date(tx.orderCreatedAt).getTime();
        return (
          tx.saleStatus === 'sale' &&
          tx.submissionStatus === 'pending' &&
          time >= from &&
          time <= to &&
          (companyFilter === 'all' || tx.manufacturerName === companyFilter) &&
          (headingFilter === 'all' || tx.productHeading === headingFilter) &&
          (programFilter === 'all' || tx.programId === programFilter)
        );
      });

      const groups = new Map<string, { manufacturerName: string; productHeading: string }>();
      pending.forEach(tx => {
        const key = tx.manufacturerName + '||' + tx.productHeading;
        if (!groups.has(key)) {
          groups.set(key, {
            manufacturerName: tx.manufacturerName,
            productHeading: tx.productHeading,
          });
        }
      });

      if (groups.size === 0) {
        alert('No pending transactions are available for separate company/product files.');
        return;
      }

      const zip = new JSZip();
      const createdBatchIds: string[] = [];

      for (const group of groups.values()) {
        const result = await api.createScanDataExportBatch({
          manufacturerName: group.manufacturerName,
          productHeading: group.productHeading,
          programId: programFilter,
          startDate,
          endDate,
        });
        zip.file(result.batch.fileName, result.csv);
        createdBatchIds.push(result.batch.id);
      }

      const blob = await zip.generateAsync({ type: 'blob' });
      downloadBlob(
        'scan-data-separate-files-' + new Date().toISOString().slice(0, 10) + '.zip',
        blob
      );

      for (const batchId of createdBatchIds) {
        await api.updateScanDataExportBatchStatus(batchId, { status: 'downloaded' });
      }
      await loadAll();
      setTab('exports');
    } catch (error: any) {
      alert(error?.message || 'Could not generate separate scan-data files.');
    } finally {
      setBusy(false);
    }
  };

  const handleDownloadBatch = async (batch: ScanDataExportBatch) => {
    try {
      const result = await api.getScanDataExportBatchCsv(batch.id);
      downloadCsv(result.fileName, result.csv);
      if (batch.status === 'validated') {
        await api.updateScanDataExportBatchStatus(batch.id, { status: 'downloaded' });
        await loadAll();
      }
    } catch (error: any) {
      alert(error?.message || 'Could not download this export batch.');
    }
  };

  const handleBatchStatus = async (
    batch: ScanDataExportBatch,
    status: ScanDataExportBatch['status']
  ) => {
    let paidAmount: number | undefined;
    if (status === 'paid') {
      const raw = window.prompt(
        'Enter amount received from the company:',
        String(batch.expectedReimbursement.toFixed(2))
      );
      if (raw === null) return;
      paidAmount = Number(raw);
      if (!Number.isFinite(paidAmount) || paidAmount < 0) {
        alert('Enter a valid paid amount.');
        return;
      }
    }

    try {
      await api.updateScanDataExportBatchStatus(batch.id, { status, paidAmount });
      await loadAll();
    } catch (error: any) {
      alert(error?.message || 'Could not update export status.');
    }
  };

  const saveSubscriptionSettings = async () => {
    setSavingSettings(true);
    try {
      const updated = await api.updateSettings({
        scanDataSubscriptionActive: subscriptionForm.active,
        scanDataSubscriptionProvider: subscriptionForm.provider.trim(),
        scanDataMonthlySubscriptionFee: Math.max(0, Number(subscriptionForm.monthlyFee || 0)),
        scanDataRetailerAccountId: subscriptionForm.retailerAccountId.trim(),
        scanDataDefaultExportFrequency: subscriptionForm.defaultFrequency as 'daily' | 'weekly' | 'monthly',
      });
      onSettingsUpdated(updated);
    } catch (error: any) {
      alert(error?.message || 'Could not save scan-data service settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  const tabs: { id: CenterTab; label: string }[] = [
    { id: 'overview', label: 'Dashboard' },
    { id: 'programs', label: 'Programs & Promotions' },
    { id: 'products', label: 'Products & Company Mapping' },
    { id: 'transactions', label: 'Transactions' },
    { id: 'exports', label: 'Exports' },
    { id: 'reimbursements', label: 'Reimbursements' },
    { id: 'errors', label: 'Errors / Exceptions' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <div className="h-full overflow-y-auto bg-[#eef3f8] text-[#10234a]">
      <div className="px-4 md:px-5 py-4 space-y-4">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div>
            <div className="text-[10px] text-slate-500 mb-1">Manager Portal › Promotions & Scan Data</div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">Promotions & Scan Data Center</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Manage store promotions, manufacturer-funded programs, company exports, and reimbursement tracking.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadAll()}
            className="h-10 px-4 rounded-lg bg-white border border-slate-300 text-xs font-black flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className={'w-4 h-4 ' + (loading ? 'animate-spin' : '')} />
            Refresh
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-2 flex flex-wrap gap-2">
          {tabs.map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={
                'px-3 py-2 rounded-lg text-[11px] font-black cursor-pointer ' +
                (tab === item.id
                  ? 'bg-[#08274d] text-white'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100')
              }
            >
              {item.label}
            </button>
          ))}
        </div>

        {loading && !summary ? (
          <div className="bg-white border border-slate-200 rounded-xl py-20 text-center text-sm text-slate-400">
            Loading promotion and scan-data records...
          </div>
        ) : (
          <>
            {tab === 'overview' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
                  {[
                    ['Eligible Transactions', String(summary?.totals.transactions || 0)],
                    ['Eligible Units', String(summary?.totals.eligibleUnits || 0)],
                    ['Discounts Given', money(summary?.totals.discountsGiven || 0)],
                    ['Expected Reimbursement', money(summary?.totals.expectedReimbursement || 0)],
                    ['Paid Reimbursement', money((summary?.byManufacturer || []).reduce((sum, row) => sum + row.paidAmount, 0))],
                    ['Monthly Service Fee', money(settings?.scanDataMonthlySubscriptionFee || 0)],
                    ['Pending Export', String(summary?.totals.pendingTransactions || 0)],
                    ['Exceptions', String((summary?.totals.errorTransactions || 0) + mappingErrors.length)],
                  ].map(([label, value]) => (
                    <div key={label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                      <div className="text-[9px] uppercase font-black text-slate-500">{label}</div>
                      <div className="text-xl font-black mt-2">{value}</div>
                    </div>
                  ))}
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-black">Scan Data Subscription Coverage</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Compare manufacturer money received with the monthly scan-data service cost.
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-right">
                      <div>
                        <div className="text-[9px] uppercase font-black text-slate-400">Paid Back</div>
                        <div className="text-lg font-black text-emerald-700">
                          {money((summary?.byManufacturer || []).reduce((sum, row) => sum + row.paidAmount, 0))}
                        </div>
                      </div>
                      <div>
                        <div className="text-[9px] uppercase font-black text-slate-400">Monthly Fee</div>
                        <div className="text-lg font-black">
                          {money(settings?.scanDataMonthlySubscriptionFee || 0)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[9px] uppercase font-black text-slate-400">Net After Fee</div>
                        <div className={
                          'text-lg font-black ' +
                          ((summary?.byManufacturer || []).reduce((sum, row) => sum + row.paidAmount, 0) -
                            Number(settings?.scanDataMonthlySubscriptionFee || 0) >= 0
                            ? 'text-emerald-700'
                            : 'text-amber-700')
                        }>
                          {money(
                            (summary?.byManufacturer || []).reduce((sum, row) => sum + row.paidAmount, 0) -
                              Number(settings?.scanDataMonthlySubscriptionFee || 0)
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2 font-black">
                    <Building2 className="w-4 h-4" />
                    Company Reimbursement Overview
                  </div>
                  {(summary?.byManufacturer || []).length === 0 ? (
                    <div className="py-12 text-center text-sm text-slate-400">
                      Manufacturer-funded transactions will appear here after qualifying sales.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[900px] text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500">
                          <tr>
                            <th className="px-4 py-2">Company</th>
                            <th className="px-4 py-2 text-right">Units</th>
                            <th className="px-4 py-2 text-right">Discounts</th>
                            <th className="px-4 py-2 text-right">Expected</th>
                            <th className="px-4 py-2 text-right">Submitted</th>
                            <th className="px-4 py-2 text-right">Paid</th>
                            <th className="px-4 py-2 text-right">Outstanding</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {summary?.byManufacturer.map(row => (
                            <tr key={row.manufacturerName}>
                              <td className="px-4 py-3 font-black">{row.manufacturerName}</td>
                              <td className="px-4 py-3 text-right">{row.eligibleUnits}</td>
                              <td className="px-4 py-3 text-right">{money(row.discountsGiven)}</td>
                              <td className="px-4 py-3 text-right font-black">{money(row.expectedReimbursement)}</td>
                              <td className="px-4 py-3 text-right">{money(row.submittedAmount)}</td>
                              <td className="px-4 py-3 text-right text-emerald-700 font-black">{money(row.paidAmount)}</td>
                              <td className="px-4 py-3 text-right text-amber-700 font-black">{money(row.outstandingAmount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === 'programs' && (
              <div className="bg-[#080808] rounded-xl border border-slate-800 p-4">
                <PromotionsSettings />
              </div>
            )}

            {tab === 'products' && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div>
                    <div className="font-black flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      Product & Company Mapping
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Product heading and manufacturer determine which company export receives a sale.
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Search product, UPC, company..."
                      className="h-9 w-64 max-w-full rounded-lg border border-slate-300 px-3 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => onNavigate('inventory')}
                      className="h-9 px-3 rounded-lg bg-[#08274d] text-white text-xs font-black cursor-pointer"
                    >
                      Edit Inventory Mapping
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto max-h-[600px]">
                  <table className="w-full min-w-[950px] text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 sticky top-0">
                      <tr>
                        <th className="px-4 py-2">Product</th>
                        <th className="px-4 py-2">UPC</th>
                        <th className="px-4 py-2">Heading</th>
                        <th className="px-4 py-2">Manufacturer</th>
                        <th className="px-4 py-2">Distributor</th>
                        <th className="px-4 py-2">Program</th>
                        <th className="px-4 py-2">Scan Data</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {mappedProducts.slice(0, 200).map(product => {
                        const program = manufacturerPrograms.find(p => p.id === product.defaultProgramId);
                        return (
                          <tr key={product.id}>
                            <td className="px-4 py-3 font-bold">{product.name}</td>
                            <td className="px-4 py-3 font-mono text-slate-500">{product.barcode}</td>
                            <td className="px-4 py-3">{product.productHeading || '—'}</td>
                            <td className="px-4 py-3">{product.manufacturerName || '—'}</td>
                            <td className="px-4 py-3">{product.distributorName || product.vendor || '—'}</td>
                            <td className="px-4 py-3">{program?.name || 'Automatic match'}</td>
                            <td className="px-4 py-3">
                              {product.scanDataEligible ? (
                                <span className="text-emerald-700 font-black">Eligible</span>
                              ) : (
                                <span className="text-slate-400">Off</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {tab === 'transactions' && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200 font-black">Manufacturer Scan / Rebate Ledger</div>
                {transactions.length === 0 ? (
                  <div className="py-12 text-center text-sm text-slate-400">
                    Qualifying sales will be recorded automatically after checkout.
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-[650px]">
                    <table className="w-full min-w-[1250px] text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 sticky top-0">
                        <tr>
                          <th className="px-3 py-2">Date</th>
                          <th className="px-3 py-2">Order</th>
                          <th className="px-3 py-2">Product</th>
                          <th className="px-3 py-2">Company</th>
                          <th className="px-3 py-2">Heading</th>
                          <th className="px-3 py-2 text-right">Qty</th>
                          <th className="px-3 py-2 text-right">Discount</th>
                          <th className="px-3 py-2 text-right">Expected</th>
                          <th className="px-3 py-2">Customer Token</th>
                          <th className="px-3 py-2">Submission</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {transactions.map(tx => (
                          <tr key={tx.id}>
                            <td className="px-3 py-3">{new Date(tx.orderCreatedAt).toLocaleString()}</td>
                            <td className="px-3 py-3 font-mono">{tx.orderNumber}</td>
                            <td className="px-3 py-3 font-bold">{tx.productName}</td>
                            <td className="px-3 py-3">{tx.manufacturerName}</td>
                            <td className="px-3 py-3">{tx.productHeading}</td>
                            <td className="px-3 py-3 text-right">{tx.quantity}</td>
                            <td className="px-3 py-3 text-right">{money(tx.manufacturerDiscountTotal)}</td>
                            <td className="px-3 py-3 text-right font-black">{money(tx.expectedReimbursement)}</td>
                            <td className="px-3 py-3 font-mono text-[10px] text-slate-500">
                              {tx.customerPhoneToken ? '••••' + tx.customerPhoneToken.slice(-6) : '—'}
                            </td>
                            <td className="px-3 py-3 font-bold capitalize">{tx.submissionStatus.replace(/_/g, ' ')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {tab === 'exports' && (
              <div className="space-y-4">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                  <div className="font-black flex items-center gap-2 mb-1">
                    <FileDown className="w-4 h-4" />
                    Generate Company / Product File
                  </div>
                  <div className="text-[10px] text-slate-500 mb-4">
                    Filter by company, product heading, program, and date. Only unsubmitted qualifying transactions are included.
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-3">
                    <select value={companyFilter} onChange={e => setCompanyFilter(e.target.value)} className="h-10 rounded-lg border border-slate-300 px-2 text-xs bg-white">
                      <option value="all">All Companies</option>
                      {companies.map(value => <option key={value} value={value}>{value}</option>)}
                    </select>
                    <select value={headingFilter} onChange={e => setHeadingFilter(e.target.value)} className="h-10 rounded-lg border border-slate-300 px-2 text-xs bg-white">
                      <option value="all">All Product Headings</option>
                      {headings.map(value => <option key={value} value={value}>{value}</option>)}
                    </select>
                    <select value={programFilter} onChange={e => setProgramFilter(e.target.value)} className="h-10 rounded-lg border border-slate-300 px-2 text-xs bg-white">
                      <option value="all">All Programs</option>
                      {manufacturerPrograms.map(value => <option key={value.id} value={value.id}>{value.name}</option>)}
                    </select>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-10 rounded-lg border border-slate-300 px-2 text-xs" />
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-10 rounded-lg border border-slate-300 px-2 text-xs" />
                    <div className="flex gap-2 md:col-span-3 xl:col-span-1">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleGenerateExport()}
                        className="h-10 flex-1 rounded-lg bg-[#08274d] text-white text-[10px] font-black flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 px-2"
                      >
                        <Download className="w-4 h-4" />
                        {busy ? 'Generating...' : 'One File'}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleGenerateSeparateFiles()}
                        className="h-10 flex-1 rounded-lg bg-[#c78d20] text-white text-[10px] font-black flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 px-2"
                        title="Create one CSV per manufacturer + product heading and download them as a ZIP"
                      >
                        <FileDown className="w-4 h-4" />
                        Separate ZIP
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-200 font-black">Export Batches</div>
                  {batches.length === 0 ? (
                    <div className="py-12 text-center text-sm text-slate-400">No export batches created yet.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[1150px] text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500">
                          <tr>
                            <th className="px-3 py-2">Batch</th>
                            <th className="px-3 py-2">Company</th>
                            <th className="px-3 py-2">Heading</th>
                            <th className="px-3 py-2">Rows</th>
                            <th className="px-3 py-2 text-right">Expected</th>
                            <th className="px-3 py-2 text-right">Paid</th>
                            <th className="px-3 py-2">Status</th>
                            <th className="px-3 py-2">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {batches.map(batch => (
                            <tr key={batch.id}>
                              <td className="px-3 py-3 font-mono font-bold">{batch.batchNumber}</td>
                              <td className="px-3 py-3">{batch.manufacturerName || 'Mixed'}</td>
                              <td className="px-3 py-3">{batch.productHeading || 'Mixed'}</td>
                              <td className="px-3 py-3">{batch.transactionCount}</td>
                              <td className="px-3 py-3 text-right font-black">{money(batch.expectedReimbursement)}</td>
                              <td className="px-3 py-3 text-right text-emerald-700 font-black">{money(batch.paidAmount || 0)}</td>
                              <td className="px-3 py-3 capitalize font-bold">{batch.status}</td>
                              <td className="px-3 py-3">
                                <div className="flex flex-wrap gap-1.5">
                                  <button onClick={() => void handleDownloadBatch(batch)} className="px-2 py-1 rounded bg-slate-100 font-bold cursor-pointer">Download</button>
                                  {!['submitted','accepted','paid','rejected'].includes(batch.status) && (
                                    <button onClick={() => void handleBatchStatus(batch, 'submitted')} className="px-2 py-1 rounded bg-sky-100 text-sky-800 font-bold cursor-pointer">Submitted</button>
                                  )}
                                  {batch.status === 'rejected' && (
                                    <button onClick={() => void handleBatchStatus(batch, 'validated')} className="px-2 py-1 rounded bg-violet-100 text-violet-800 font-bold cursor-pointer">Reopen</button>
                                  )}
                                  {batch.status === 'submitted' && (
                                    <button onClick={() => void handleBatchStatus(batch, 'accepted')} className="px-2 py-1 rounded bg-amber-100 text-amber-800 font-bold cursor-pointer">Accepted</button>
                                  )}
                                  {batch.status === 'accepted' && (
                                    <button onClick={() => void handleBatchStatus(batch, 'paid')} className="px-2 py-1 rounded bg-emerald-100 text-emerald-800 font-bold cursor-pointer">Paid</button>
                                  )}
                                  {!['paid','rejected'].includes(batch.status) && (
                                    <button onClick={() => void handleBatchStatus(batch, 'rejected')} className="px-2 py-1 rounded bg-rose-100 text-rose-800 font-bold cursor-pointer">Rejected</button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === 'reimbursements' && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200 font-black flex items-center gap-2">
                  <WalletCards className="w-4 h-4" />
                  Reimbursement Reconciliation
                </div>
                {(summary?.byManufacturer || []).length === 0 ? (
                  <div className="py-12 text-center text-sm text-slate-400">No reimbursement activity yet.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px] text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500">
                        <tr>
                          <th className="px-4 py-2">Company</th>
                          <th className="px-4 py-2 text-right">Eligible Units</th>
                          <th className="px-4 py-2 text-right">Discounts Given</th>
                          <th className="px-4 py-2 text-right">Expected Back</th>
                          <th className="px-4 py-2 text-right">Accepted</th>
                          <th className="px-4 py-2 text-right">Paid</th>
                          <th className="px-4 py-2 text-right">Outstanding</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {summary?.byManufacturer.map(row => (
                          <tr key={row.manufacturerName}>
                            <td className="px-4 py-3 font-black">{row.manufacturerName}</td>
                            <td className="px-4 py-3 text-right">{row.eligibleUnits}</td>
                            <td className="px-4 py-3 text-right">{money(row.discountsGiven)}</td>
                            <td className="px-4 py-3 text-right font-black">{money(row.expectedReimbursement)}</td>
                            <td className="px-4 py-3 text-right">{money(row.acceptedAmount)}</td>
                            <td className="px-4 py-3 text-right text-emerald-700 font-black">{money(row.paidAmount)}</td>
                            <td className="px-4 py-3 text-right text-amber-700 font-black">{money(row.outstandingAmount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {tab === 'errors' && (
              <div className="space-y-4">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-200 font-black flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    Product Mapping Exceptions
                  </div>
                  {mappingErrors.length === 0 ? (
                    <div className="py-8 text-center text-sm text-emerald-700 font-bold flex justify-center items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      No scan-data product mapping errors.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {mappingErrors.map(product => (
                        <div key={product.id} className="px-4 py-3 flex items-center justify-between gap-4">
                          <div>
                            <div className="text-xs font-black">{product.name}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{product.barcode}</div>
                          </div>
                          <div className="text-[10px] text-rose-700 font-bold">
                            {!product.productHeading ? 'Missing product heading. ' : ''}
                            {!product.manufacturerName ? 'Missing manufacturer.' : ''}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-200 font-black">Transaction / Submission Exceptions</div>
                  {transactionErrors.length === 0 ? (
                    <div className="py-8 text-center text-sm text-emerald-700 font-bold">No rejected, voided, refunded, or excluded scan-data transactions.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[850px] text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500">
                          <tr>
                            <th className="px-3 py-2">Order</th>
                            <th className="px-3 py-2">Product</th>
                            <th className="px-3 py-2">Company</th>
                            <th className="px-3 py-2">Sale Status</th>
                            <th className="px-3 py-2">Submission</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {transactionErrors.map(tx => (
                            <tr key={tx.id}>
                              <td className="px-3 py-3 font-mono">{tx.orderNumber}</td>
                              <td className="px-3 py-3 font-bold">{tx.productName}</td>
                              <td className="px-3 py-3">{tx.manufacturerName}</td>
                              <td className="px-3 py-3 capitalize">{tx.saleStatus}</td>
                              <td className="px-3 py-3 capitalize">{tx.submissionStatus}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
            {tab === 'settings' && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
                  <div>
                    <div className="text-base font-black">Scan Data Service</div>
                    <div className="text-xs text-slate-500 mt-1">
                      Track the service/provider used to submit scan data and compare its fee with manufacturer reimbursements.
                    </div>
                  </div>

                  <label className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
                    <div>
                      <div className="text-xs font-black">Subscription Active</div>
                      <div className="text-[10px] text-slate-500">Enable when this store is enrolled with a scan-data provider or manufacturer program.</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={subscriptionForm.active}
                      onChange={e => setSubscriptionForm({ ...subscriptionForm, active: e.target.checked })}
                    />
                  </label>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Provider / Service</label>
                      <input
                        value={subscriptionForm.provider}
                        onChange={e => setSubscriptionForm({ ...subscriptionForm, provider: e.target.value })}
                        placeholder="e.g. scan-data provider name"
                        className="w-full h-10 rounded-lg border border-slate-300 px-3 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Retailer / Account ID</label>
                      <input
                        value={subscriptionForm.retailerAccountId}
                        onChange={e => setSubscriptionForm({ ...subscriptionForm, retailerAccountId: e.target.value })}
                        placeholder="Optional account/reference ID"
                        className="w-full h-10 rounded-lg border border-slate-300 px-3 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Monthly Subscription Fee ($)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={subscriptionForm.monthlyFee}
                        onChange={e => setSubscriptionForm({ ...subscriptionForm, monthlyFee: Number(e.target.value || 0) })}
                        className="w-full h-10 rounded-lg border border-slate-300 px-3 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Default Reporting Frequency</label>
                      <select
                        value={subscriptionForm.defaultFrequency}
                        onChange={e => setSubscriptionForm({ ...subscriptionForm, defaultFrequency: e.target.value as 'daily' | 'weekly' | 'monthly' })}
                        className="w-full h-10 rounded-lg border border-slate-300 px-3 text-xs bg-white"
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={savingSettings}
                    onClick={() => void saveSubscriptionSettings()}
                    className="h-10 px-4 rounded-lg bg-[#08274d] text-white text-xs font-black cursor-pointer disabled:opacity-60"
                  >
                    {savingSettings ? 'Saving...' : 'Save Scan Data Settings'}
                  </button>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                  <div className="text-base font-black">Current Economics</div>
                  <div className="text-xs text-slate-500 mt-1 mb-4">
                    Reimbursement tracking is separate from customer discounts so you can see whether the program is covering its service cost.
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Expected reimbursement</span>
                      <span className="font-black">{money(summary?.totals.expectedReimbursement || 0)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Actually paid</span>
                      <span className="font-black text-emerald-700">
                        {money((summary?.byManufacturer || []).reduce((sum, row) => sum + row.paidAmount, 0))}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Monthly service fee</span>
                      <span className="font-black">{money(subscriptionForm.monthlyFee)}</span>
                    </div>
                    <div className="flex justify-between text-sm border-t border-slate-200 pt-3">
                      <span className="font-black">Paid minus monthly fee</span>
                      <span className="font-black">
                        {money(
                          (summary?.byManufacturer || []).reduce((sum, row) => sum + row.paidAmount, 0) -
                            Number(subscriptionForm.monthlyFee || 0)
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </>
        )}
      </div>
    </div>
  );
};
