import React, { useState, useEffect, useRef } from 'react';
import {
  BarcodeReceivingSession,
  BarcodeReceivingLine,
  Product,
  Vendor,
  InventoryReceivingTransaction
} from '../../types';
import { api } from '../../utils/api';
import { playBeep } from '../../utils/audio';
import {
  X,
  Barcode,
  Plus,
  Minus,
  Trash2,
  Save,
  CheckCircle2,
  AlertTriangle,
  Search,
  Package,
  Boxes,
  Sparkles,
  ArrowRight,
  RotateCcw,
  DollarSign,
  FileText,
  Printer,
  History,
  Layers,
  ChevronRight,
  Check,
  AlertCircle,
  HelpCircle,
  FolderOpen
} from 'lucide-react';

interface MultiBarcodeReceivingModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingSessionId?: string;
  onComplete?: (receivingNumber: string) => void;
}

export const MultiBarcodeReceivingModal: React.FC<MultiBarcodeReceivingModalProps> = ({
  isOpen,
  onClose,
  existingSessionId,
  onComplete,
}) => {
  // Session State
  const [session, setSession] = useState<BarcodeReceivingSession | null>(null);
  const [draftSessions, setDraftSessions] = useState<BarcodeReceivingSession[]>([]);
  const [showDraftBrowser, setShowDraftBrowser] = useState<boolean>(false);
  const [step, setStep] = useState<'setup' | 'scanning' | 'review' | 'completed'>('scanning');

  // Setup Form State (INV-MB-01)
  const [vendorName, setVendorName] = useState<string>("Southern Glazer's Wine & Spirits");
  const [vendorId, setVendorId] = useState<string>('vnd-1');
  const [invoiceNumber, setInvoiceNumber] = useState<string>(`INV-${Math.floor(10000 + Math.random() * 90000)}`);
  const [invoiceDate, setInvoiceDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [receivingLocation, setReceivingLocation] = useState<string>('Main Liquor Storage');
  const [expectedTotalUnits, setExpectedTotalUnits] = useState<string>('');
  const [sessionNotes, setSessionNotes] = useState<string>('');

  // Scanning State (INV-MB-02)
  const [barcodeInput, setBarcodeInput] = useState<string>('');
  const [isCaseMode, setIsCaseMode] = useState<boolean>(false); // INV-MB-05
  const [packMultiplier, setPackMultiplier] = useState<number>(12); // Default case pack for spirits
  const [manualQuantity, setManualQuantity] = useState<number>(1);
  const [lastScannedMessage, setLastScannedMessage] = useState<string | null>(null);
  const [isProcessingScan, setIsProcessingScan] = useState<boolean>(false);

  // Unknown Barcode Modal State (INV-MB-07, INV-MB-08)
  const [unknownBarcode, setUnknownBarcode] = useState<string | null>(null);
  const [unknownAction, setUnknownAction] = useState<'choose' | 'create' | 'match'>('choose');
  const [matchSearchQuery, setMatchSearchQuery] = useState<string>('');
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [newProductName, setNewProductName] = useState<string>('');
  const [newProductPrice, setNewProductPrice] = useState<string>('29.99');
  const [newProductCost, setNewProductCost] = useState<string>('19.99');
  const [newProductSize, setNewProductSize] = useState<string>('750ml');

  // Confirmation & Receiving State (INV-MB-16, INV-MB-18, INV-MB-19)
  const [approveAllCosts, setApproveAllCosts] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [completedResult, setCompletedResult] = useState<{
    receivingNumber: string;
    updatedCount: number;
    totalUnits: number;
    transactions: InventoryReceivingTransaction[];
  } | null>(null);

  const [statusNotice, setStatusNotice] = useState<{ type: 'error' | 'success' | 'info'; text: string } | null>(null);
  const barcodeInputRef = useRef<HTMLInputElement | null>(null);

  const notify = (text: string, type: 'error' | 'success' | 'info' = 'info') => {
    setStatusNotice({ type, text });
    setTimeout(() => {
      setStatusNotice(prev => (prev?.text === text ? null : prev));
    }, 4500);
  };

  // Initialize or fetch sessions
  useEffect(() => {
    if (!isOpen) return;

    const loadData = async () => {
      try {
        const [drafts, prods] = await Promise.all([
          api.getBarcodeReceivingSessions(),
          api.getProducts({ activeOnly: true }),
        ]);
        const safeDrafts = Array.isArray(drafts) ? drafts : ((drafts as any)?.sessions || []);
        const safeProds = Array.isArray(prods) ? prods : ((prods as any)?.products || []);
        setDraftSessions(safeDrafts);
        setAllProducts(safeProds);

        if (existingSessionId) {
          const target = safeDrafts.find(d => d.id === existingSessionId);
          if (target) {
            setSession(target);
            setVendorName(target.vendorName);
            setInvoiceNumber(target.invoiceNumber);
            setStep(target.status === 'completed' ? 'completed' : 'scanning');
            return;
          }
        }

        // Check if there is an active draft session already
        const latestDraft = safeDrafts.find(d => d.status === 'draft');
        if (latestDraft) {
          setSession(latestDraft);
          setVendorName(latestDraft.vendorName);
          setInvoiceNumber(latestDraft.invoiceNumber);
          setStep('scanning');
        } else {
          setStep('setup');
        }
      } catch (err) {
        console.error('Failed loading barcode sessions', err);
      }
    };

    loadData();
  }, [isOpen, existingSessionId]);

  // Keep barcode input automatically focused for continuous scanning (INV-MB-02)
  useEffect(() => {
    if (step === 'scanning' && !unknownBarcode) {
      const timer = setTimeout(() => {
        barcodeInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [step, unknownBarcode, session?.lines.length]);

  // Create new session (INV-MB-01)
  const handleCreateSession = async () => {
    if (!vendorName.trim() || !invoiceNumber.trim()) {
      notify('Please provide Vendor Name and Invoice Number.', 'error');
      return;
    }

    try {
      const newSession = await api.createBarcodeReceivingSession({
        vendorId,
        vendorName,
        invoiceNumber,
        invoiceDate,
        receivingLocation,
        expectedTotalUnits: expectedTotalUnits ? Number(expectedTotalUnits) : undefined,
        notes: sessionNotes,
      });

      setSession(newSession);
      setDraftSessions(prev => [newSession, ...prev]);
      setStep('scanning');
      playBeep('success');
    } catch (err: any) {
      notify(err.message || 'Failed to create receiving session', 'error');
    }
  };

  // Process Continuous Barcode Scan (INV-MB-02, INV-MB-03, INV-MB-04, INV-MB-05)
  const handleBarcodeSubmit = async (codeToScan?: string) => {
    const code = (codeToScan || barcodeInput).trim();
    if (!code || !session) return;

    setIsProcessingScan(true);
    try {
      const res = await api.scanBarcodeInSession(session.id, {
        barcode: code,
        isCaseBarcode: isCaseMode,
        packMultiplier: isCaseMode ? packMultiplier : undefined,
        manualQuantity: manualQuantity > 1 ? manualQuantity : undefined,
      });

      if (!res.found) {
        // Unknown Barcode encountered (INV-MB-07)
        playBeep('error');
        setUnknownBarcode(code);
        setUnknownAction('choose');
        setNewProductName('');
      } else {
        // Product matched & incremented (INV-MB-03, INV-MB-04)
        playBeep('beep');
        setSession(res.session);
        setLastScannedMessage(res.message);
        setBarcodeInput('');
        setManualQuantity(1);
      }
    } catch (err: any) {
      console.error(err);
      playBeep('error');
    } finally {
      setIsProcessingScan(false);
      barcodeInputRef.current?.focus();
    }
  };

  // Quick-test scanning buttons for convenience
  const quickTestScan = (barcode: string, caseMode = false, pack = 12) => {
    setIsCaseMode(caseMode);
    if (caseMode) setPackMultiplier(pack);
    handleBarcodeSubmit(barcode);
  };

  // Adjust Line Quantity manually (INV-MB-06)
  const handleQuantityAdjust = (lineId: string, delta: number) => {
    if (!session) return;
    const updatedLines = session.lines.map(line => {
      if (line.id === lineId) {
        const nextUnits = Math.max(1, line.receivedUnits + delta);
        const newStock = line.currentStock + nextUnits;
        const extendedCost = Number((nextUnits * line.unitCost).toFixed(2));
        
        let matchStatus = line.matchStatus;
        if (line.expectedInvoiceQty !== undefined) {
          matchStatus = nextUnits === line.expectedInvoiceQty ? 'match' : nextUnits < line.expectedInvoiceQty ? 'short' : 'extra';
        }

        return {
          ...line,
          receivedUnits: nextUnits,
          newStock,
          extendedCost,
          matchStatus,
        };
      }
      return line;
    });

    const totalUniqueProducts = updatedLines.length;
    const totalUnitsReceived = updatedLines.reduce((s, l) => s + l.receivedUnits, 0);
    const totalCost = Number(updatedLines.reduce((s, l) => s + l.extendedCost, 0).toFixed(2));

    const updatedSession = {
      ...session,
      lines: updatedLines,
      totalUniqueProducts,
      totalUnitsReceived,
      totalCost,
    };

    setSession(updatedSession);
    api.updateBarcodeReceivingSession(session.id, { lines: updatedLines });
    playBeep('beep');
  };

  // Direct line quantity edit (INV-MB-06)
  const handleQuantityInput = (lineId: string, value: string) => {
    if (!session) return;
    const num = parseInt(value, 10);
    if (isNaN(num) || num <= 0) return;

    const updatedLines = session.lines.map(line => {
      if (line.id === lineId) {
        const nextUnits = num;
        const newStock = line.currentStock + nextUnits;
        const extendedCost = Number((nextUnits * line.unitCost).toFixed(2));
        return {
          ...line,
          receivedUnits: nextUnits,
          newStock,
          extendedCost,
        };
      }
      return line;
    });

    const totalUniqueProducts = updatedLines.length;
    const totalUnitsReceived = updatedLines.reduce((s, l) => s + l.receivedUnits, 0);
    const totalCost = Number(updatedLines.reduce((s, l) => s + l.extendedCost, 0).toFixed(2));

    setSession({ ...session, lines: updatedLines, totalUniqueProducts, totalUnitsReceived, totalCost });
    api.updateBarcodeReceivingSession(session.id, { lines: updatedLines });
  };

  // Toggle unit cost update for a line (INV-MB-18)
  const handleToggleCostUpdate = (lineId: string) => {
    if (!session) return;
    const updatedLines = session.lines.map(l => {
      if (l.id === lineId) {
        return { ...l, updateCost: !l.updateCost };
      }
      return l;
    });
    setSession({ ...session, lines: updatedLines });
    api.updateBarcodeReceivingSession(session.id, { lines: updatedLines });
  };

  // Set Expected Invoice Quantity for comparison (INV-MB-10)
  const handleSetExpectedQty = (lineId: string, value: string) => {
    if (!session) return;
    const expected = parseInt(value, 10);
    const updatedLines = session.lines.map(l => {
      if (l.id === lineId) {
        const exp = isNaN(expected) ? undefined : expected;
        let matchStatus: 'match' | 'short' | 'extra' | 'untracked' = 'untracked';
        if (exp !== undefined) {
          matchStatus = l.receivedUnits === exp ? 'match' : l.receivedUnits < exp ? 'short' : 'extra';
        }
        return { ...l, expectedInvoiceQty: exp, matchStatus };
      }
      return l;
    });

    setSession({ ...session, lines: updatedLines });
    api.updateBarcodeReceivingSession(session.id, { lines: updatedLines });
  };

  // Remove Line (INV-MB-12)
  const handleRemoveLine = (lineId: string) => {
    if (!session) return;
    const updatedLines = session.lines.filter(l => l.id !== lineId);
    const totalUniqueProducts = updatedLines.length;
    const totalUnitsReceived = updatedLines.reduce((s, l) => s + l.receivedUnits, 0);
    const totalCost = Number(updatedLines.reduce((s, l) => s + l.extendedCost, 0).toFixed(2));

    const updated = { ...session, lines: updatedLines, totalUniqueProducts, totalUnitsReceived, totalCost };
    setSession(updated);
    api.updateBarcodeReceivingSession(session.id, { lines: updatedLines });
    playBeep('beep');
  };

  // Link Unknown Barcode to Existing Catalog Product (INV-MB-07)
  const handleMatchExistingProduct = async (productId: string) => {
    if (!session || !unknownBarcode) return;
    try {
      const res = await api.linkUnknownBarcodeInSession(session.id, {
        barcode: unknownBarcode,
        productId,
        receivedUnits: 1,
      });
      setSession(res.session);
      setUnknownBarcode(null);
      setBarcodeInput('');
      playBeep('success');
      notify(`Linked barcode ${unknownBarcode} to catalog item`, 'success');
    } catch (err: any) {
      notify(err.message || 'Failed to link barcode', 'error');
    }
  };

  // Quick Create New Product from Unknown Barcode (INV-MB-08)
  const handleQuickCreateProduct = async () => {
    if (!session || !unknownBarcode) return;
    if (!newProductName.trim()) {
      notify('Product name is required', 'error');
      return;
    }

    try {
      const res = await api.linkUnknownBarcodeInSession(session.id, {
        barcode: unknownBarcode,
        newProductData: {
          name: newProductName.trim(),
          price: Number(newProductPrice) || 29.99,
          cost: Number(newProductCost) || 19.99,
          size: newProductSize || '750ml',
          categoryId: 'cat-1', // Default Spirits
        },
        receivedUnits: 1,
      });

      // Refresh catalog list
      setAllProducts(prev => [res.product, ...prev]);
      setSession(res.session);
      setUnknownBarcode(null);
      setBarcodeInput('');
      playBeep('success');
      notify(`Created "${res.product.name}" and added to receiving`, 'success');
    } catch (err: any) {
      notify(err.message || 'Failed to create product', 'error');
    }
  };

  // Save Session as Draft (INV-MB-13)
  const handleSaveDraft = async () => {
    if (!session) return;
    try {
      await api.updateBarcodeReceivingSession(session.id, {
        lines: session.lines,
        notes: sessionNotes,
      });
      playBeep('success');
      notify(`Session saved as Draft (${session.receivingNumber})!`, 'success');
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      notify('Failed saving draft', 'error');
    }
  };

  // Resume Draft Session (INV-MB-14)
  const handleResumeDraft = (draft: BarcodeReceivingSession) => {
    setSession(draft);
    setVendorName(draft.vendorName);
    setInvoiceNumber(draft.invoiceNumber);
    setShowDraftBrowser(false);
    setStep('scanning');
    playBeep('beep');
    notify(`Resumed Draft ${draft.receivingNumber}`, 'info');
  };

  // Confirm & Execute Atomic Bulk Receiving Update (INV-MB-16, INV-MB-17, INV-MB-18, INV-MB-19, INV-MB-20)
  const handleConfirmReceiving = async () => {
    if (!session || session.lines.length === 0) return;

    setIsSubmitting(true);
    try {
      const result = await api.confirmBarcodeReceiving(session.id, {
        approveAllCosts,
      });

      setCompletedResult({
        receivingNumber: result.receivingNumber,
        updatedCount: result.updatedProductCount,
        totalUnits: result.totalUnitsReceived,
        transactions: result.receivingTransactions,
      });

      setSession(result.session);
      setStep('completed');
      playBeep('success');

      if (onComplete) {
        onComplete(result.receivingNumber);
      }
    } catch (err: any) {
      console.error(err);
      notify(err.message || 'Bulk receiving failed', 'error');
      playBeep('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-3">
      <div className="bg-[#121212] border border-[#262626] rounded-xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[96vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#262626] bg-[#181818] shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-[#C5A059]/20 text-[#C5A059] flex items-center justify-center border border-[#C5A059]/30">
              <Barcode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Bulk Barcode Receiving
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#C5A059]/10 text-[#C5A059] border border-[#C5A059]/30 font-semibold">
                  INV-MB-01 to MB-20
                </span>
                {session && (
                  <span className="text-xs font-mono text-[#AAAAAA] bg-[#222222] px-2 py-0.5 rounded border border-[#333333]">
                    {session.receivingNumber}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#888888]">
                Continuous handheld barcode scanning with atomic inventory updates & cost margin tracking
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {step === 'scanning' && (
              <button
                onClick={() => setShowDraftBrowser(true)}
                className="px-3 py-1.5 rounded-lg bg-[#222222] hover:bg-[#2A2A2A] text-xs font-semibold text-[#CCCCCC] hover:text-white border border-[#333333] flex items-center space-x-1.5 transition-colors cursor-pointer"
                title="Browse existing draft sessions"
              >
                <FolderOpen className="w-3.5 h-3.5 text-[#C5A059]" />
                <span>Drafts ({draftSessions.filter(d => d.status === 'draft').length})</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-[#888888] hover:text-white hover:bg-[#262626] rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* In-Modal Notice Banner */}
        {statusNotice && (
          <div
            className={`px-4 py-2.5 text-xs font-semibold flex items-center justify-between border-b ${
              statusNotice.type === 'error'
                ? 'bg-rose-950/80 border-rose-800 text-rose-200'
                : statusNotice.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-800 text-emerald-200'
                : 'bg-blue-950/80 border-blue-800 text-blue-200'
            }`}
          >
            <span>{statusNotice.text}</span>
            <button
              onClick={() => setStatusNotice(null)}
              className="text-xs opacity-70 hover:opacity-100 cursor-pointer ml-4"
            >
              ✕
            </button>
          </div>
        )}

        {/* Setup Screen (INV-MB-01) */}
        {step === 'setup' && (
          <div className="p-8 max-w-xl mx-auto w-full space-y-6 overflow-y-auto">
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-white">Start New Receiving Session</h3>
              <p className="text-xs text-[#888888]">
                Enter distributor invoice details to begin continuous barcode intake
              </p>
            </div>

            <div className="space-y-4 bg-[#181818] p-6 rounded-xl border border-[#262626]">
              <div>
                <label className="text-xs font-semibold text-[#CCCCCC] block mb-1">
                  Vendor / Beverage Distributor *
                </label>
                <input
                  type="text"
                  value={vendorName}
                  onChange={e => setVendorName(e.target.value)}
                  placeholder="e.g. Southern Glazer's, Republic National, Andrews Distributing"
                  className="w-full bg-[#101010] border border-[#333333] rounded-lg px-3 py-2 text-sm text-white focus:border-[#C5A059] focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#CCCCCC] block mb-1">
                    Invoice Number *
                  </label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={e => setInvoiceNumber(e.target.value)}
                    placeholder="e.g. INV-98421"
                    className="w-full bg-[#101010] border border-[#333333] rounded-lg px-3 py-2 text-sm text-white focus:border-[#C5A059] focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#CCCCCC] block mb-1">
                    Invoice Date
                  </label>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={e => setInvoiceDate(e.target.value)}
                    className="w-full bg-[#101010] border border-[#333333] rounded-lg px-3 py-2 text-sm text-white focus:border-[#C5A059] focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#CCCCCC] block mb-1">
                    Receiving Location
                  </label>
                  <select
                    value={receivingLocation}
                    onChange={e => setReceivingLocation(e.target.value)}
                    className="w-full bg-[#101010] border border-[#333333] rounded-lg px-3 py-2 text-sm text-white focus:border-[#C5A059] focus:outline-hidden"
                  >
                    <option value="Main Liquor Storage">Main Liquor Storage</option>
                    <option value="Front Sales Floor Shelves">Front Sales Floor Shelves</option>
                    <option value="Beer Walk-In Cooler">Beer Walk-In Cooler</option>
                    <option value="Backroom Warehouse Bay 2">Backroom Warehouse Bay 2</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#CCCCCC] block mb-1">
                    Expected Total Units (Optional)
                  </label>
                  <input
                    type="number"
                    value={expectedTotalUnits}
                    onChange={e => setExpectedTotalUnits(e.target.value)}
                    placeholder="e.g. 36"
                    className="w-full bg-[#101010] border border-[#333333] rounded-lg px-3 py-2 text-sm text-white focus:border-[#C5A059] focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#CCCCCC] block mb-1">
                  Session Notes / Delivery Driver
                </label>
                <input
                  type="text"
                  value={sessionNotes}
                  onChange={e => setSessionNotes(e.target.value)}
                  placeholder="e.g. Morning delivery truck; pallet checked by Elena"
                  className="w-full bg-[#101010] border border-[#333333] rounded-lg px-3 py-2 text-sm text-white focus:border-[#C5A059] focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              {draftSessions.length > 0 && (
                <button
                  onClick={() => setShowDraftBrowser(true)}
                  className="text-xs text-[#C5A059] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>Resume Incomplete Delivery Draft</span>
                </button>
              )}
              <div className="ml-auto">
                <button
                  onClick={handleCreateSession}
                  className="px-6 py-2.5 rounded-lg bg-[#C5A059] hover:bg-[#b08e4d] text-black font-bold text-xs uppercase tracking-wider flex items-center space-x-2 shadow-lg transition-transform active:scale-98 cursor-pointer"
                >
                  <span>Start Scanning Session</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Continuous Scanning Screen (INV-MB-02 to INV-MB-14) */}
        {step === 'scanning' && session && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Session Summary Ribbon (INV-MB-11) */}
            <div className="bg-[#161616] border-b border-[#262626] px-6 py-2.5 flex flex-wrap items-center justify-between gap-4 text-xs shrink-0">
              <div className="flex items-center space-x-4">
                <div>
                  <span className="text-[#888888] block text-[10px] uppercase">Vendor</span>
                  <span className="font-bold text-white">{session.vendorName}</span>
                </div>
                <div>
                  <span className="text-[#888888] block text-[10px] uppercase">Invoice #</span>
                  <span className="font-mono text-[#CCCCCC]">{session.invoiceNumber}</span>
                </div>
                <div>
                  <span className="text-[#888888] block text-[10px] uppercase">Location</span>
                  <span className="text-[#CCCCCC]">{session.receivingLocation}</span>
                </div>
              </div>

              <div className="flex items-center space-x-6 bg-[#0E0E0E] px-4 py-1.5 rounded-lg border border-[#262626]">
                <div>
                  <span className="text-[#888888] block text-[10px] uppercase">Unique SKUs</span>
                  <span className="text-sm font-bold text-white">{session.totalUniqueProducts}</span>
                </div>
                <div>
                  <span className="text-[#888888] block text-[10px] uppercase">Units Received</span>
                  <span className="text-sm font-bold text-[#C5A059]">{session.totalUnitsReceived}</span>
                </div>
                <div>
                  <span className="text-[#888888] block text-[10px] uppercase">Extended Total</span>
                  <span className="text-sm font-bold text-emerald-400">${session.totalCost.toFixed(2)}</span>
                </div>
                {session.expectedTotalUnits !== undefined && (
                  <div>
                    <span className="text-[#888888] block text-[10px] uppercase">Expected / Diff</span>
                    <span className={`text-sm font-bold ${session.totalUnitsReceived === session.expectedTotalUnits ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {session.expectedTotalUnits} ({session.totalUnitsReceived - session.expectedTotalUnits > 0 ? `+${session.totalUnitsReceived - session.expectedTotalUnits}` : session.totalUnitsReceived - session.expectedTotalUnits})
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Continuous Scan Barcode Input Console (INV-MB-02) */}
            <div className="p-4 bg-[#1A1A1A] border-b border-[#262626] shrink-0 space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {/* Barcode Input Form */}
                <form
                  onSubmit={e => {
                    e.preventDefault();
                    handleBarcodeSubmit();
                  }}
                  className="flex-1 relative flex items-center"
                >
                  <div className="absolute left-3 text-[#C5A059]">
                    <Barcode className="w-5 h-5" />
                  </div>
                  <input
                    ref={barcodeInputRef}
                    type="text"
                    value={barcodeInput}
                    onChange={e => setBarcodeInput(e.target.value)}
                    placeholder="Scan product barcode (or type UPC / SKU and hit Enter)..."
                    className="w-full bg-[#0E0E0E] border-2 border-[#C5A059]/60 focus:border-[#C5A059] rounded-xl pl-10 pr-24 py-2.5 text-sm text-white font-mono placeholder:text-[#666666] focus:outline-hidden shadow-inner"
                    autoFocus
                  />
                  <div className="absolute right-2 flex items-center space-x-1">
                    <button
                      type="submit"
                      disabled={!barcodeInput.trim() || isProcessingScan}
                      className="px-3 py-1 bg-[#C5A059] hover:bg-[#b08e4d] disabled:opacity-40 text-black font-bold text-xs uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                    >
                      Enter
                    </button>
                  </div>
                </form>

                {/* Case Mode Toggle (INV-MB-05) */}
                <div className="flex items-center space-x-2 bg-[#121212] p-1.5 rounded-xl border border-[#2D2D2D]">
                  <button
                    type="button"
                    onClick={() => setIsCaseMode(!isCaseMode)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                      isCaseMode
                        ? 'bg-[#C5A059] text-black shadow'
                        : 'text-[#888888] hover:text-white'
                    }`}
                  >
                    <Boxes className="w-4 h-4" />
                    <span>Case Mode {isCaseMode ? 'ON' : 'OFF'}</span>
                  </button>

                  {isCaseMode && (
                    <div className="flex items-center space-x-1 text-xs text-[#AAAAAA] pr-2">
                      <span className="text-[10px] text-[#666666]">Pack:</span>
                      <select
                        value={packMultiplier}
                        onChange={e => setPackMultiplier(Number(e.target.value))}
                        className="bg-[#1C1C1C] border border-[#333333] rounded px-2 py-0.5 text-xs text-white"
                      >
                        <option value={6}>6 pk</option>
                        <option value={12}>12 pk</option>
                        <option value={24}>24 pk</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Simulator / Rapid Test Barcodes for Beverage Store */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#888888]">
                <span className="text-[11px] font-semibold text-[#AAAAAA]">Quick Test Barcode Scans:</span>
                <button
                  onClick={() => quickTestScan('080244009236')}
                  className="px-2 py-1 rounded bg-[#242424] hover:bg-[#333333] text-[11px] text-[#DDDDDD] border border-[#383838] transition-colors cursor-pointer"
                >
                  Buffalo Trace (080244009236)
                </button>
                <button
                  onClick={() => quickTestScan('080244009243')}
                  className="px-2 py-1 rounded bg-[#242424] hover:bg-[#333333] text-[11px] text-[#DDDDDD] border border-[#383838] transition-colors cursor-pointer"
                >
                  Eagle Rare 10Yr (080244009243)
                </button>
                <button
                  onClick={() => quickTestScan('080660956157')}
                  className="px-2 py-1 rounded bg-[#242424] hover:bg-[#333333] text-[11px] text-[#DDDDDD] border border-[#383838] transition-colors cursor-pointer"
                >
                  Modelo 12PK (080660956157)
                </button>
                <button
                  onClick={() => quickTestScan('080244012075', true, 6)}
                  className="px-2 py-1 rounded bg-[#C5A059]/15 hover:bg-[#C5A059]/30 text-[11px] text-[#C5A059] border border-[#C5A059]/30 transition-colors cursor-pointer"
                >
                  Weller (Case of 6)
                </button>
                <button
                  onClick={() => quickTestScan('079999888111')}
                  className="px-2 py-1 rounded bg-amber-950/40 hover:bg-amber-900/60 text-[11px] text-amber-300 border border-amber-800/40 transition-colors cursor-pointer"
                >
                  Unknown Barcode (INV-MB-07)
                </button>
              </div>

              {/* Status Banner */}
              {lastScannedMessage && (
                <div className="px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between animate-in fade-in duration-150">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{lastScannedMessage}</span>
                  </div>
                  <span className="text-[10px] text-emerald-400/80">Continuous scanner armed</span>
                </div>
              )}
            </div>

            {/* Scanned Lines Table (INV-MB-03, INV-MB-04, INV-MB-06, INV-MB-09, INV-MB-10) */}
            <div className="flex-1 overflow-y-auto p-4">
              {session.lines.length === 0 ? (
                <div className="py-20 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-[#1C1C1C] border border-[#2D2D2D] flex items-center justify-center mx-auto text-[#666666]">
                    <Barcode className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-white">Continuous Scanner Ready</h4>
                  <p className="text-xs text-[#888888] max-w-md mx-auto">
                    Point your physical handheld USB/Bluetooth scanner at incoming boxes or bottles. 
                    Every scan increments quantity in real time.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-[#888888] px-3 font-semibold">
                    <span>Scanned Products ({session.lines.length})</span>
                    <span>Cost & Margin Impact (INV-MB-18)</span>
                  </div>

                  <div className="space-y-2">
                    {session.lines.map((line) => {
                      const costChanged = line.costDiff !== 0;
                      return (
                        <div
                          key={line.id}
                          className="bg-[#161616] border border-[#262626] hover:border-[#383838] rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors"
                        >
                          {/* Product Info */}
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-sm text-white">{line.productName}</span>
                              <span className="text-xs font-mono text-[#888888] bg-[#121212] px-2 py-0.5 rounded">
                                {line.size}
                              </span>
                              {line.casesScanned && line.casesScanned > 0 && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                                  {line.casesScanned} CS ({line.packSize}pk)
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-3 text-xs text-[#888888]">
                              <span className="font-mono text-[11px]">UPC: {line.barcode}</span>
                              <span>•</span>
                              <span>SKU: {line.sku}</span>
                              <span>•</span>
                              <span>Current Stock: <strong className="text-white">{line.currentStock}</strong></span>
                              <span>•</span>
                              <span>New Stock: <strong className="text-[#C5A059]">{line.newStock}</strong></span>
                            </div>
                          </div>

                          {/* Invoice Comparison & Quantity Controls (INV-MB-06, INV-MB-10) */}
                          <div className="flex flex-wrap items-center gap-4 shrink-0">
                            {/* Expected vs Scanned (INV-MB-10) */}
                            <div className="flex items-center space-x-1.5 text-xs">
                              <span className="text-[10px] text-[#666666] uppercase">Expected:</span>
                              <input
                                type="number"
                                placeholder="--"
                                value={line.expectedInvoiceQty ?? ''}
                                onChange={e => handleSetExpectedQty(line.id, e.target.value)}
                                className="w-12 bg-[#0E0E0E] border border-[#333333] rounded px-1.5 py-1 text-center text-xs text-white"
                                title="Expected invoice quantity for comparison"
                              />
                              {line.matchStatus === 'match' && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                                  ✓ Match
                                </span>
                              )}
                              {line.matchStatus === 'short' && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30">
                                  ⚠ Short
                                </span>
                              )}
                              {line.matchStatus === 'extra' && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-bold border border-blue-500/30">
                                  + Extra
                                </span>
                              )}
                            </div>

                            {/* Stepper (INV-MB-06) */}
                            <div className="flex items-center space-x-1 bg-[#101010] p-1 rounded-lg border border-[#2D2D2D]">
                              <button
                                onClick={() => handleQuantityAdjust(line.id, -1)}
                                className="p-1 rounded text-[#888888] hover:text-white hover:bg-[#222222] transition-colors cursor-pointer"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <input
                                type="number"
                                value={line.receivedUnits}
                                onChange={e => handleQuantityInput(line.id, e.target.value)}
                                className="w-14 bg-transparent text-center font-bold text-sm text-white focus:outline-hidden"
                              />
                              <button
                                onClick={() => handleQuantityAdjust(line.id, 1)}
                                className="p-1 rounded text-[#888888] hover:text-white hover:bg-[#222222] transition-colors cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Extended Cost & Margin (INV-MB-18) */}
                            <div className="text-right min-w-[90px]">
                              <div className="text-sm font-bold text-white">
                                ${line.extendedCost.toFixed(2)}
                              </div>
                              <div className="text-[11px] text-[#888888]">
                                @ ${line.unitCost.toFixed(2)}/ea
                              </div>
                            </div>

                            {/* Cost Update Checkbox (INV-MB-18) */}
                            <label className="flex items-center space-x-1.5 text-xs text-[#AAAAAA] cursor-pointer bg-[#101010] px-2.5 py-1.5 rounded-lg border border-[#2D2D2D]">
                              <input
                                type="checkbox"
                                checked={line.updateCost}
                                onChange={() => handleToggleCostUpdate(line.id)}
                                className="rounded text-[#C5A059] focus:ring-0"
                              />
                              <span className="text-[11px]">Update Cost</span>
                            </label>

                            {/* Delete Line (INV-MB-12) */}
                            <button
                              onClick={() => handleRemoveLine(line.id)}
                              className="p-1.5 text-[#666666] hover:text-red-400 transition-colors cursor-pointer"
                              title="Remove from session"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Controls Bar (INV-MB-13, INV-MB-15) */}
            <div className="px-6 py-4 bg-[#181818] border-t border-[#262626] flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleSaveDraft}
                  className="px-4 py-2 rounded-lg bg-[#242424] hover:bg-[#2D2D2D] text-xs font-semibold text-[#CCCCCC] border border-[#333333] flex items-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <Save className="w-4 h-4 text-[#C5A059]" />
                  <span>Save Draft (INV-MB-13)</span>
                </button>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setStep('review')}
                  disabled={session.lines.length === 0}
                  className="px-6 py-2.5 rounded-lg bg-[#C5A059] hover:bg-[#b08e4d] disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold text-xs uppercase tracking-wider flex items-center space-x-2 shadow-lg transition-transform active:scale-98 cursor-pointer"
                >
                  <span>Review & Update Inventory ({session.lines.length})</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Review & Bulk Update Confirmation Screen (INV-MB-15, INV-MB-16, INV-MB-17, INV-MB-18) */}
        {step === 'review' && session && (
          <div className="flex-1 flex flex-col overflow-hidden p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-[#262626] pb-3 shrink-0">
              <div>
                <h3 className="text-base font-bold text-white">Review All Scanned Products</h3>
                <p className="text-xs text-[#888888]">
                  Verify stock increments, distributor costs, and margin impact before applying atomic update
                </p>
              </div>
              <button
                onClick={() => setStep('scanning')}
                className="px-3 py-1.5 rounded-lg bg-[#222222] hover:bg-[#2C2C2C] text-xs font-semibold text-[#CCCCCC] flex items-center space-x-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Return to Scanning</span>
              </button>
            </div>

            {/* Global Options Bar (INV-MB-18) */}
            <div className="p-3.5 rounded-xl bg-[#161616] border border-[#2D2D2D] flex items-center justify-between text-xs shrink-0">
              <label className="flex items-center space-x-2 text-white font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={approveAllCosts}
                  onChange={e => setApproveAllCosts(e.target.checked)}
                  className="rounded text-[#C5A059] focus:ring-0"
                />
                <span>Approve All Distributor Cost Updates (INV-MB-18)</span>
              </label>
              <span className="text-[#888888]">
                Products with updated costs will recalculate margins in product master catalog.
              </span>
            </div>

            {/* Summary Metrics Grid */}
            <div className="grid grid-cols-4 gap-3 shrink-0">
              <div className="p-3 bg-[#161616] rounded-xl border border-[#262626] text-center">
                <span className="text-[10px] text-[#888888] uppercase block">Total SKUs</span>
                <span className="text-lg font-bold text-white">{session.totalUniqueProducts}</span>
              </div>
              <div className="p-3 bg-[#161616] rounded-xl border border-[#262626] text-center">
                <span className="text-[10px] text-[#888888] uppercase block">Units Received</span>
                <span className="text-lg font-bold text-[#C5A059]">{session.totalUnitsReceived}</span>
              </div>
              <div className="p-3 bg-[#161616] rounded-xl border border-[#262626] text-center">
                <span className="text-[10px] text-[#888888] uppercase block">Invoice Total Cost</span>
                <span className="text-lg font-bold text-emerald-400">${session.totalCost.toFixed(2)}</span>
              </div>
              <div className="p-3 bg-[#161616] rounded-xl border border-[#262626] text-center">
                <span className="text-[10px] text-[#888888] uppercase block">Update Method</span>
                <span className="text-xs font-bold text-blue-400 block mt-1">Atomic (All-or-Nothing)</span>
              </div>
            </div>

            {/* Review Table (INV-MB-15) */}
            <div className="flex-1 overflow-y-auto border border-[#262626] rounded-xl bg-[#121212]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#181818] border-b border-[#262626] text-[#888888] uppercase text-[10px] sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3">Product Name</th>
                    <th className="py-2.5 px-3 text-center">Old Stock</th>
                    <th className="py-2.5 px-3 text-center text-[#C5A059]">Receive Qty</th>
                    <th className="py-2.5 px-3 text-center font-bold text-white">New Stock</th>
                    <th className="py-2.5 px-3 text-right">Unit Cost</th>
                    <th className="py-2.5 px-3 text-right">Extended</th>
                    <th className="py-2.5 px-3 text-right">Retail Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222222]">
                  {session.lines.map((l) => (
                    <tr key={l.id} className="hover:bg-[#181818] transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-white">{l.productName}</div>
                        <div className="text-[11px] text-[#666666] font-mono">{l.barcode}</div>
                      </td>
                      <td className="py-2.5 px-3 text-center text-[#888888]">{l.currentStock}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-[#C5A059]">+{l.receivedUnits}</td>
                      <td className="py-2.5 px-3 text-center font-bold text-white">{l.newStock}</td>
                      <td className="py-2.5 px-3 text-right">${l.unitCost.toFixed(2)}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-400">
                        ${l.extendedCost.toFixed(2)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-[#AAAAAA]">
                        {l.newMargin.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Confirm Actions Bar (INV-MB-16, INV-MB-17) */}
            <div className="pt-2 flex items-center justify-between shrink-0">
              <button
                onClick={() => setStep('scanning')}
                className="px-4 py-2 rounded-lg bg-[#242424] hover:bg-[#2D2D2D] text-xs font-semibold text-white transition-colors cursor-pointer"
              >
                Back to Scanning
              </button>

              <button
                onClick={handleConfirmReceiving}
                disabled={isSubmitting}
                className="px-8 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider flex items-center space-x-2 shadow-xl transition-transform active:scale-98 cursor-pointer disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>
                  {isSubmitting ? 'Updating Inventory & Logging Audit...' : 'Confirm & Update All Inventory Together (INV-MB-16)'}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Completion Receipt Screen (INV-MB-19, INV-MB-20) */}
        {step === 'completed' && completedResult && (
          <div className="p-8 max-w-xl mx-auto w-full space-y-6 text-center overflow-y-auto">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40 shadow-lg">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-bold text-white">Bulk Inventory Update Completed!</h3>
              <p className="text-xs text-emerald-300">
                All {completedResult.totalUnits} items updated atomically into master stock and ledger.
              </p>
            </div>

            {/* Official Audit Receipt Card */}
            <div className="bg-[#181818] border border-[#2D2D2D] rounded-xl p-5 text-left space-y-3 font-mono text-xs">
              <div className="flex justify-between pb-2 border-b border-[#262626]">
                <span className="text-[#888888]">RECEIVING RECORD:</span>
                <span className="font-bold text-[#C5A059]">{completedResult.receivingNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#888888]">INVOICE #:</span>
                <span className="text-white">{session?.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#888888]">DISTRIBUTOR:</span>
                <span className="text-white">{session?.vendorName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#888888]">PRODUCTS UPDATED:</span>
                <span className="text-white">{completedResult.updatedCount} items</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#888888]">TOTAL UNITS ADDED:</span>
                <span className="text-white font-bold">{completedResult.totalUnits} units</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[#262626]">
                <span className="text-[#888888]">TOTAL COST COMMITTED:</span>
                <span className="text-emerald-400 font-bold">${session?.totalCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#888888]">STATUS:</span>
                <span className="text-emerald-400 font-bold uppercase">RECEIVED & AUDITED</span>
              </div>
            </div>

            <div className="flex items-center justify-center space-x-3 pt-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2.5 rounded-lg bg-[#242424] hover:bg-[#303030] text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4 text-[#C5A059]" />
                <span>Print Receiving Receipt</span>
              </button>

              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-lg bg-[#C5A059] hover:bg-[#b08e4d] text-black text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Unknown Barcode Non-Blocking Modal (INV-MB-07, INV-MB-08) */}
      {unknownBarcode && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="bg-[#181818] border border-amber-500/50 rounded-xl w-full max-w-md shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Unknown Barcode Detected</h4>
                <p className="text-xs font-mono text-amber-300">{unknownBarcode}</p>
              </div>
            </div>

            {unknownAction === 'choose' && (
              <div className="space-y-3 pt-2">
                <p className="text-xs text-[#AAAAAA]">
                  This barcode does not match any current product in your store catalog. Choose an action:
                </p>

                <div className="space-y-2">
                  <button
                    onClick={() => setUnknownAction('create')}
                    className="w-full p-3 rounded-lg bg-[#222222] hover:bg-[#2C2C2C] border border-[#333333] text-left flex items-center justify-between text-xs transition-colors cursor-pointer"
                  >
                    <div>
                      <span className="font-bold text-white block">Quick Create Product (INV-MB-08)</span>
                      <span className="text-[11px] text-[#888888]">Create new product and link barcode immediately</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#C5A059]" />
                  </button>

                  <button
                    onClick={() => setUnknownAction('match')}
                    className="w-full p-3 rounded-lg bg-[#222222] hover:bg-[#2C2C2C] border border-[#333333] text-left flex items-center justify-between text-xs transition-colors cursor-pointer"
                  >
                    <div>
                      <span className="font-bold text-white block">Match Existing Catalog Product</span>
                      <span className="text-[11px] text-[#888888]">Attach this barcode to an existing item</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#C5A059]" />
                  </button>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => {
                      setUnknownBarcode(null);
                      setBarcodeInput('');
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#888888] hover:text-white transition-colors cursor-pointer"
                  >
                    Skip Barcode
                  </button>
                </div>
              </div>
            )}

            {unknownAction === 'create' && (
              <div className="space-y-3 pt-1">
                <div>
                  <label className="text-xs font-semibold text-[#CCCCCC] block mb-1">Product Name *</label>
                  <input
                    type="text"
                    value={newProductName}
                    onChange={e => setNewProductName(e.target.value)}
                    placeholder="e.g. Sazerac Rye Whiskey 750ML"
                    className="w-full bg-[#101010] border border-[#333333] rounded px-3 py-2 text-xs text-white focus:border-[#C5A059] focus:outline-hidden"
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs font-semibold text-[#CCCCCC] block mb-1">Price ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newProductPrice}
                      onChange={e => setNewProductPrice(e.target.value)}
                      className="w-full bg-[#101010] border border-[#333333] rounded px-2 py-1.5 text-xs text-white focus:border-[#C5A059] focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#CCCCCC] block mb-1">Cost ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newProductCost}
                      onChange={e => setNewProductCost(e.target.value)}
                      className="w-full bg-[#101010] border border-[#333333] rounded px-2 py-1.5 text-xs text-white focus:border-[#C5A059] focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#CCCCCC] block mb-1">Size</label>
                    <input
                      type="text"
                      value={newProductSize}
                      onChange={e => setNewProductSize(e.target.value)}
                      className="w-full bg-[#101010] border border-[#333333] rounded px-2 py-1.5 text-xs text-white focus:border-[#C5A059] focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3">
                  <button
                    onClick={() => setUnknownAction('choose')}
                    className="px-3 py-1.5 text-xs text-[#888888] hover:text-white cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleQuickCreateProduct}
                    className="px-4 py-2 rounded-lg bg-[#C5A059] hover:bg-[#b08e4d] text-black font-bold text-xs uppercase tracking-wider cursor-pointer"
                  >
                    Create & Add to Session
                  </button>
                </div>
              </div>
            )}

            {unknownAction === 'match' && (
              <div className="space-y-3 pt-1">
                <div>
                  <label className="text-xs font-semibold text-[#CCCCCC] block mb-1">Search Catalog</label>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#888888]" />
                    <input
                      type="text"
                      value={matchSearchQuery}
                      onChange={e => setMatchSearchQuery(e.target.value)}
                      placeholder="Search product by name or SKU..."
                      className="w-full bg-[#101010] border border-[#333333] rounded pl-8 pr-3 py-1.5 text-xs text-white focus:border-[#C5A059] focus:outline-hidden"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1">
                  {allProducts
                    .filter(p => !matchSearchQuery || p.name.toLowerCase().includes(matchSearchQuery.toLowerCase()) || p.sku.toLowerCase().includes(matchSearchQuery.toLowerCase()))
                    .slice(0, 10)
                    .map(p => (
                      <button
                        key={p.id}
                        onClick={() => handleMatchExistingProduct(p.id)}
                        className="w-full text-left p-2 rounded bg-[#121212] hover:bg-[#222222] border border-[#262626] flex items-center justify-between text-xs transition-colors cursor-pointer"
                      >
                        <div>
                          <span className="font-bold text-white block">{p.name}</span>
                          <span className="text-[11px] text-[#888888]">{p.sku} • {p.size}</span>
                        </div>
                        <span className="text-[#C5A059] text-[11px] font-semibold">Select</span>
                      </button>
                    ))}
                </div>

                <div className="flex justify-between pt-2">
                  <button
                    onClick={() => setUnknownAction('choose')}
                    className="px-3 py-1.5 text-xs text-[#888888] hover:text-white cursor-pointer"
                  >
                    Back
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Draft Sessions Browser Modal (INV-MB-14) */}
      {showDraftBrowser && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="bg-[#181818] border border-[#2D2D2D] rounded-xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#262626] pb-3">
              <div className="flex items-center space-x-2">
                <FolderOpen className="w-5 h-5 text-[#C5A059]" />
                <h4 className="text-sm font-bold text-white">Draft Receiving Sessions (INV-MB-14)</h4>
              </div>
              <button
                onClick={() => setShowDraftBrowser(false)}
                className="text-[#888888] hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2">
              {draftSessions.filter(d => d.status === 'draft').length === 0 ? (
                <p className="text-xs text-[#888888] py-8 text-center">No active drafts found.</p>
              ) : (
                draftSessions.filter(d => d.status === 'draft').map(draft => (
                  <div
                    key={draft.id}
                    className="p-3 bg-[#121212] border border-[#262626] rounded-xl flex items-center justify-between hover:border-[#383838] transition-colors"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-xs text-white">{draft.vendorName}</span>
                        <span className="text-[10px] font-mono text-[#C5A059]">{draft.receivingNumber}</span>
                      </div>
                      <p className="text-[11px] text-[#888888]">
                        Inv #{draft.invoiceNumber} • {draft.lines.length} SKUs • {draft.totalUnitsReceived} units (${draft.totalCost.toFixed(2)})
                      </p>
                    </div>
                    <button
                      onClick={() => handleResumeDraft(draft)}
                      className="px-3 py-1.5 rounded-lg bg-[#C5A059] hover:bg-[#b08e4d] text-black font-bold text-xs transition-colors cursor-pointer"
                    >
                      Resume
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
