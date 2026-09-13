import React, { useState, useRef, useEffect } from 'react';
import { ScannedInvoice } from '../../types';
import { api } from '../../utils/api';
import { playBeep } from '../../utils/audio';
import {
  X,
  Camera,
  UploadCloud,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Image as ImageIcon,
  Building2,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface InvoiceScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExtractionComplete: (invoice: ScannedInvoice) => void;
}

export const InvoiceScannerModal: React.FC<InvoiceScannerModalProps> = ({
  isOpen,
  onClose,
  onExtractionComplete,
}) => {
  const [activeMode, setActiveMode] = useState<'upload' | 'camera' | 'samples' | 'text'>('samples');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // File upload state
  const [selectedFile, setSelectedFile] = useState<{
    dataUrl: string;
    name: string;
    type: string;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Camera state
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Manual text state
  const [manualText, setManualText] = useState('');

  // Clean up camera on unmount or mode switch
  useEffect(() => {
    if (!isOpen || activeMode !== 'camera') {
      stopCamera();
    }
  }, [isOpen, activeMode]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
      try {
        localStorage.setItem('pos_camera_permission_granted', 'true');
      } catch (e) {}
    } catch (err: any) {
      console.error('Camera error', err);
      setCameraError(err.message || 'Unable to access camera. Please check browser permissions or upload an image instead.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setCameraActive(false);
  };

  const captureCameraSnapshot = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 1280;
    canvas.height = videoRef.current.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setSelectedFile({
      dataUrl,
      name: `camera-invoice-${Date.now()}.jpg`,
      type: 'image/jpeg',
    });
    stopCamera();
    setActiveMode('upload');
    playBeep('success');
  };

  const handleFileChange = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedFile({
        dataUrl: reader.result as string,
        name: file.name,
        type: file.type || 'application/pdf',
      });
      setErrorMsg(null);
    };
    reader.onerror = () => {
      setErrorMsg('Failed to read file. Please try again.');
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const runExtraction = async (payload: {
    fileDataUrl?: string;
    fileName?: string;
    fileType?: string;
    manualText?: string;
  }) => {
    setIsProcessing(true);
    setErrorMsg(null);
    setProcessingStep('1/4: Ingesting & preparing document...');

    try {
      await new Promise(r => setTimeout(r, 400));
      setProcessingStep('2/4: Gemini AI reading vendor, totals & line items...');
      
      const invoice = await api.extractInvoice(payload);

      setProcessingStep('3/4: Cascade matching items to POS catalog & checking duplicates...');
      await new Promise(r => setTimeout(r, 400));

      setProcessingStep('4/4: Calculating cost changes & profit margin impacts...');
      await new Promise(r => setTimeout(r, 300));

      playBeep('success');
      onExtractionComplete(invoice);
      onClose();
    } catch (err: any) {
      playBeep('error');
      setErrorMsg(err.message || 'Failed to extract invoice data. Please verify file format and try again.');
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  // Preset Sample Invoices for Instant 1-Click Testing
  const samplePresets = [
    {
      id: 'sgws-demo',
      title: "Southern Glazer's Wine & Spirits",
      invoiceNumber: 'INV-98452',
      badge: 'Exact Spec Example (IN-SC-12)',
      description: 'Buffalo Trace 750ml, Eagle Rare 750ml, Weller Antique 750ml, plus 1 unmatched item (New Whiskey XYZ) to test missing product creation.',
      total: '$2,485.72',
      linesCount: 4,
      payload: {
        fileName: 'SGWS_Texas_Invoice_98452.pdf',
        fileType: 'application/pdf',
        manualText: `SOUTHERN GLAZER'S WINE & SPIRITS OF TEXAS
Account: SG-984210  |  Invoice #: INV-98452  |  Date: 09/08/2026
Customer: 377 Spirits (Granbury, TX)  |  Terms: Net 30
Item SG-BT-750 Buffalo Trace 750ML Qty: 12 Cost: $24.99 Total: $299.88 UPC: 080244009236
Item SG-ER-750 Eagle Rare 750ML Qty: 6 Cost: $32.50 Total: $195.00 UPC: 080244009243
Item SG-WEL-750 Weller Antique 750ML Qty: 6 Cost: $41.25 Total: $247.50 UPC: 080244012075
Item SG-NW-990 New Whiskey XYZ Small Batch 750ML Qty: 12 Cost: $28.00 Total: $336.00 UPC: 088019482103
Subtotal: $2,296.28  Tax: $189.44  Invoice Total: $2,485.72`,
      },
    },
    {
      id: 'rndc-demo',
      title: 'Republic National Distributing Company (RNDC)',
      invoiceNumber: 'RNDC-TX-70419',
      badge: 'Case & Pack Multipliers (IN-SC-07)',
      description: 'Casamigos Reposado (2 Cases × 6 = 12 bottles), Grey Goose Vodka 1L (1 Case × 12), and Don Julio 1942 Anejo.',
      total: '$1,385.40',
      linesCount: 3,
      payload: {
        fileName: 'RNDC_Distribution_70419.pdf',
        fileType: 'application/pdf',
        manualText: `REPUBLIC NATIONAL DISTRIBUTING COMPANY
Account: RNDC-440219  |  Invoice #: RNDC-TX-70419  |  Date: 09/05/2026
Customer: 377 Spirits  |  Address: Granbury, TX
Line 1: Casamigos Reposado Tequila 750ml (Case 6pk) Qty: 2 cs Cost: $237.00 Line Total: $474.00 (Pack: 6, Unit Cost: $39.50) UPC: 854673005018
Line 2: Grey Goose French Vodka 1L (Case 12pk) Qty: 1 cs Cost: $302.40 Line Total: $302.40 (Pack: 12, Unit Cost: $25.20) UPC: 080480280029
Line 3: Don Julio 1942 Anejo 750ml Qty: 3 btl Cost: $115.00 Line Total: $345.00 UPC: 088076161845
Subtotal: $1,280.40  Tax: $105.00  Invoice Total: $1,385.40`,
      },
    },
    {
      id: 'breakthru-demo',
      title: 'Breakthru Beverage Group',
      invoiceNumber: 'BBG-55102',
      badge: 'Craft Beer & Mixers',
      description: 'Sierra Nevada Hazy Little Thing IPA 6-Packs, Fever-Tree Tonic Water 4-Packs, and Bar Snacks.',
      total: '$642.50',
      linesCount: 3,
      payload: {
        fileName: 'Breakthru_Bev_55102.pdf',
        fileType: 'application/pdf',
        manualText: `BREAKTHRU BEVERAGE GROUP
Account: BBG-10294  |  Invoice #: BBG-55102  |  Date: 09/06/2026
Customer: 377 Spirits  |  Warehouse: Fort Worth, TX
Item 1: Sierra Nevada Hazy Little Thing IPA 6-Pack Qty: 10 cs (4 packs/cs) Pack: 4 Total Units: 40 Unit Cost: $7.20 Total: $288.00 UPC: 025325120063
Item 2: Fever-Tree Premium Indian Tonic Water 4-Pack Qty: 5 cs (6 packs/cs) Pack: 6 Total Units: 30 Unit Cost: $3.40 Total: $102.00 UPC: 898195001004
Item 3: The Botanist Islay Dry Gin 750ml Qty: 6 btl Unit Cost: $27.00 Total: $162.00 UPC: 858441002013
Subtotal: $593.50  Tax: $49.00  Invoice Total: $642.50`,
      },
    },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
      <div className="bg-[#141414] border border-[#262626] rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#262626] bg-[#1A1A1A] shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-[#C5A059]/20 text-[#C5A059] flex items-center justify-center border border-[#C5A059]/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Scan or Upload Vendor Invoice (IN-SC-01)
              </h2>
              <p className="text-xs text-[#888888]">
                Camera scan, PDF, JPG, PNG, or instant preset testing with Gemini AI
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#888888] hover:text-white rounded-lg hover:bg-[#262626] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex border-b border-[#262626] bg-[#111111] px-6 pt-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              stopCamera();
              setActiveMode('samples');
            }}
            className={`flex items-center space-x-2 px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors cursor-pointer ${
              activeMode === 'samples'
                ? 'border-[#C5A059] text-[#C5A059]'
                : 'border-transparent text-[#888888] hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Preset Samples (1-Click)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              stopCamera();
              setActiveMode('upload');
            }}
            className={`flex items-center space-x-2 px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors cursor-pointer ${
              activeMode === 'upload'
                ? 'border-[#C5A059] text-[#C5A059]'
                : 'border-transparent text-[#888888] hover:text-white'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Upload PDF / Image</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveMode('camera');
              startCamera();
            }}
            className={`flex items-center space-x-2 px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors cursor-pointer ${
              activeMode === 'camera'
                ? 'border-[#C5A059] text-[#C5A059]'
                : 'border-transparent text-[#888888] hover:text-white'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Live Camera Scan</span>
          </button>

          <button
            type="button"
            onClick={() => {
              stopCamera();
              setActiveMode('text');
            }}
            className={`flex items-center space-x-2 px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors cursor-pointer ${
              activeMode === 'text'
                ? 'border-[#C5A059] text-[#C5A059]'
                : 'border-transparent text-[#888888] hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Paste Text / OCR</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto grow space-y-4">
          {errorMsg && (
            <div className="flex items-center space-x-2 p-3 bg-red-950/40 border border-red-800/50 rounded-lg text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Processing Loading Overlay */}
          {isProcessing && (
            <div className="py-12 flex flex-col items-center justify-center space-y-4 text-center">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-[#C5A059]/20 border-t-[#C5A059] animate-spin" />
                <Sparkles className="w-6 h-6 text-[#C5A059] absolute inset-0 m-auto animate-pulse" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Analyzing & Extracting Invoice...
                </h3>
                <p className="text-xs text-[#C5A059] font-mono animate-pulse">
                  {processingStep}
                </p>
                <p className="text-[11px] text-[#888888] max-w-sm pt-2">
                  Preserving original invoice, resolving vendor details, calculating case multipliers & profit margins.
                </p>
              </div>
            </div>
          )}

          {/* 1. SAMPLES MODE */}
          {!isProcessing && activeMode === 'samples' && (
            <div className="space-y-3">
              <p className="text-xs text-[#AAAAAA]">
                Select a standard distributor invoice below to test end-to-end extraction, automatic vendor identification, product cascade matching, and review:
              </p>

              <div className="space-y-3">
                {samplePresets.map(preset => (
                  <div
                    key={preset.id}
                    className="p-4 rounded-xl bg-[#1A1A1A] border border-[#262626] hover:border-[#C5A059]/50 transition-all group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-sm text-white group-hover:text-[#C5A059] transition-colors">
                            {preset.title}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-[#C5A059]/10 text-[#C5A059] border border-[#C5A059]/20 text-[10px] font-bold">
                            {preset.badge}
                          </span>
                        </div>
                        <div className="text-xs text-[#888888] flex items-center space-x-2 font-mono">
                          <span>Invoice #{preset.invoiceNumber}</span>
                          <span>•</span>
                          <span>{preset.linesCount} Items</span>
                          <span>•</span>
                          <span className="text-[#E5E5E5] font-bold">{preset.total}</span>
                        </div>
                        <p className="text-xs text-[#AAAAAA] pt-1">
                          {preset.description}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => runExtraction(preset.payload)}
                        className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-[#C5A059] hover:bg-[#D4AF37] text-black font-bold text-xs uppercase tracking-wider rounded-lg transition-colors shadow-xs shrink-0 cursor-pointer"
                      >
                        <span>Scan This</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. UPLOAD MODE */}
          {!isProcessing && activeMode === 'upload' && (
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,image/png,image/jpeg,image/jpg"
                className="hidden"
                onChange={e => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFileChange(e.target.files[0]);
                  }
                }}
              />

              <div
                onDragOver={e => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  isDragging
                    ? 'border-[#C5A059] bg-[#C5A059]/10'
                    : 'border-[#333333] hover:border-[#555555] bg-[#1A1A1A]'
                }`}
              >
                <div className="flex flex-col items-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-[#262626] flex items-center justify-center text-[#C5A059]">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-semibold text-white">
                    Click to browse or drag and drop invoice file
                  </div>
                  <p className="text-xs text-[#888888]">
                    Supports PDF, JPG, PNG (up to 50MB)
                  </p>
                </div>
              </div>

              {selectedFile && (
                <div className="p-4 bg-[#1A1A1A] border border-[#262626] rounded-xl flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-lg bg-[#262626] flex items-center justify-center text-[#C5A059]">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white truncate max-w-[280px]">
                        {selectedFile.name}
                      </div>
                      <div className="text-[11px] text-[#888888] font-mono">
                        Ready for AI Extraction
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setSelectedFile(null)}
                      className="px-2.5 py-1 text-xs text-[#888888] hover:text-white rounded-md hover:bg-[#262626] transition-colors"
                    >
                      Remove
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        runExtraction({
                          fileDataUrl: selectedFile.dataUrl,
                          fileName: selectedFile.name,
                          fileType: selectedFile.type,
                        })
                      }
                      className="flex items-center space-x-1.5 px-4 py-2 bg-[#C5A059] hover:bg-[#D4AF37] text-black font-bold text-xs uppercase tracking-wider rounded-lg transition-colors shadow-md cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Start Extraction</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3. CAMERA SCAN MODE */}
          {!isProcessing && activeMode === 'camera' && (
            <div className="space-y-4">
              <div className="relative aspect-4/3 bg-black rounded-xl overflow-hidden border border-[#262626] flex items-center justify-center">
                {cameraError ? (
                  <div className="p-6 text-center space-y-2">
                    <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
                    <p className="text-xs text-white">{cameraError}</p>
                    <button
                      type="button"
                      onClick={startCamera}
                      className="px-3 py-1.5 bg-[#262626] hover:bg-[#333333] text-xs text-white rounded-md cursor-pointer"
                    >
                      Retry Camera
                    </button>
                  </div>
                ) : (
                  <>
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    {/* Scanner viewfinder overlay */}
                    <div className="absolute inset-8 border-2 border-dashed border-[#C5A059]/60 rounded-lg pointer-events-none flex flex-col justify-between p-3">
                      <div className="flex justify-between">
                        <div className="w-4 h-4 border-t-2 border-l-2 border-[#C5A059]" />
                        <div className="w-4 h-4 border-t-2 border-r-2 border-[#C5A059]" />
                      </div>
                      <div className="text-center bg-black/60 backdrop-blur-xs py-1 px-3 rounded-full text-[11px] text-[#C5A059] font-mono self-center">
                        Align invoice within frame
                      </div>
                      <div className="flex justify-between">
                        <div className="w-4 h-4 border-b-2 border-l-2 border-[#C5A059]" />
                        <div className="w-4 h-4 border-b-2 border-r-2 border-[#C5A059]" />
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center justify-center space-x-3">
                <button
                  type="button"
                  onClick={captureCameraSnapshot}
                  disabled={!cameraActive}
                  className="flex items-center space-x-2 px-6 py-2.5 bg-[#C5A059] hover:bg-[#D4AF37] disabled:opacity-50 text-black font-bold text-xs uppercase tracking-wider rounded-lg transition-colors shadow-md cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>Capture Frame</span>
                </button>
              </div>
            </div>
          )}

          {/* 4. MANUAL TEXT / OCR PASTE MODE */}
          {!isProcessing && activeMode === 'text' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#AAAAAA] uppercase tracking-wider mb-1">
                  Paste Raw Invoice Text or OCR Output
                </label>
                <textarea
                  rows={8}
                  value={manualText}
                  onChange={e => setManualText(e.target.value)}
                  placeholder="Paste distributor invoice text here (e.g. from clipboard or terminal scanner)..."
                  className="w-full bg-[#1A1A1A] border border-[#333333] rounded-lg p-3 text-xs text-white font-mono focus:outline-hidden focus:border-[#C5A059]"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={!manualText.trim()}
                  onClick={() =>
                    runExtraction({
                      manualText,
                      fileName: 'manual-text-entry.txt',
                      fileType: 'text/plain',
                    })
                  }
                  className="flex items-center space-x-2 px-5 py-2 bg-[#C5A059] hover:bg-[#D4AF37] disabled:opacity-50 text-black font-bold text-xs uppercase tracking-wider rounded-lg transition-colors shadow-md cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Extract from Text</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-[#262626] bg-[#111111] text-[11px] text-[#888888] shrink-0">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
            <span>Original invoice file is saved and linked to receiving ledger (IN-SC-16)</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#888888] hover:text-white transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
