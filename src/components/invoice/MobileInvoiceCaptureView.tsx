import React, { useState, useEffect, useRef } from 'react';
import { InvoiceUploadSession } from '../../types';
import { api } from '../../utils/api';
import { playBeep } from '../../utils/audio';
import {
  Camera,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  X,
  Plus,
  Trash2,
  RotateCcw,
  Sparkles,
  Store,
  Clock,
  ShieldAlert,
  Loader2,
  Image as ImageIcon,
  ArrowRight,
  Info
} from 'lucide-react';

interface MobileInvoiceCaptureViewProps {
  sessionId: string;
  token?: string;
  onClose?: () => void;
  onSuccess?: () => void;
}

export const MobileInvoiceCaptureView: React.FC<MobileInvoiceCaptureViewProps> = ({
  sessionId,
  token,
  onClose,
  onSuccess,
}) => {
  const [session, setSession] = useState<InvoiceUploadSession | null>(null);
  const [isValidating, setIsValidating] = useState<boolean>(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  
  // Image capture states (INV-03)
  const [pages, setPages] = useState<Array<{ id: string; dataUrl: string; name: string; sizeKb: number }>>([]);
  const [activeCamera, setActiveCamera] = useState<boolean>(false);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [previewPageIndex, setPreviewPageIndex] = useState<number | null>(null);

  // Upload states (INV-04)
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadSuccess, setUploadSuccess] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Connect to session and validate (INV-02)
  useEffect(() => {
    let isMounted = true;
    const connect = async () => {
      setIsValidating(true);
      setSessionError(null);
      try {
        const res = await api.connectUploadSession(sessionId, token || '');
        if (isMounted) {
          setSession(res.session);
          playBeep('beep');
        }
      } catch (err: any) {
        console.error('Session connection failed', err);
        if (isMounted) {
          setSessionError(err.message || 'Invalid, expired, or unauthorized invoice receiving session.');
          playBeep('error');
        }
      } finally {
        if (isMounted) setIsValidating(false);
      }
    };

    connect();

    return () => {
      isMounted = false;
      stopCamera();
    };
  }, [sessionId, token]);

  // Handle camera start
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access not supported by this browser. Please choose photo file instead.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' }, // Prefer rear camera on mobile
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });

      setVideoStream(stream);
      setActiveCamera(true);
      try {
        localStorage.setItem('pos_camera_permission_granted', 'true');
      } catch (e) {
        // ignore storage errors
      }
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      console.warn('Camera could not be opened, falling back to file input', err);
      setCameraError(err.message || 'Camera permission denied or camera unavailable.');
      // Open file picker directly
      fileInputRef.current?.click();
    }
  };

  const stopCamera = () => {
    if (videoStream) {
      videoStream.getTracks().forEach(t => t.stop());
      setVideoStream(null);
    }
    setActiveCamera(false);
  };

  // Capture snapshot from video stream
  const captureSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    const sizeKb = Math.round(dataUrl.length * 0.75 / 1024);

    // Image quality pre-check (INV-03)
    if (canvas.width < 400 || canvas.height < 400) {
      alert('Photo resolution is very low. Please hold the phone closer to the invoice.');
    }

    const newPage = {
      id: `page-${Date.now()}-${pages.length + 1}`,
      dataUrl,
      name: `Invoice Page ${pages.length + 1}`,
      sizeKb,
    };

    setPages(prev => [...prev, newPage]);
    playBeep('beep');
    stopCamera();
  };

  // Handle file picker selection (supports camera capture on mobile through capture="environment")
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (dataUrl) {
          const sizeKb = Math.round(file.size / 1024);
          setPages(prev => [
            ...prev,
            {
              id: `page-${Date.now()}-${prev.length + 1}`,
              dataUrl,
              name: file.name || `Invoice Page ${prev.length + 1}`,
              sizeKb,
            },
          ]);
          playBeep('scan');
        }
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  // Remove page (INV-03)
  const removePage = (id: string) => {
    setPages(prev => prev.filter(p => p.id !== id));
  };

  // Upload to POS (INV-04)
  const handleUploadToPos = async () => {
    if (pages.length === 0) {
      alert('Please take at least one photo of the vendor invoice before uploading.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(15);
    setUploadError(null);

    try {
      // Step simulation for clear visual feedback (INV-04)
      const progressTimer = setInterval(() => {
        setUploadProgress(p => (p < 85 ? p + 15 : p));
      }, 400);

      const fileDataUrls = pages.map(p => p.dataUrl);
      const fileNames = pages.map(p => p.name);

      const res = await api.uploadSessionInvoice(sessionId, {
        fileDataUrls,
        fileNames,
      });

      clearInterval(progressTimer);
      setUploadProgress(100);
      setUploadSuccess(true);
      playBeep('success');

      if (onSuccess) {
        setTimeout(onSuccess, 2000);
      }
    } catch (err: any) {
      console.error('Upload failed', err);
      setUploadError(err.message || 'Failed to transmit invoice photos to the POS terminal.');
      playBeep('error');
    } finally {
      setIsUploading(false);
    }
  };

  // Preset demo invoices for rapid testing without physical documents
  const loadDemoBeverageInvoice = () => {
    // Southern Glazers Beverage Distributor Sample Invoice
    const demoCanvas = document.createElement('canvas');
    demoCanvas.width = 1200;
    demoCanvas.height = 1600;
    const ctx = demoCanvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, 1200, 1600);

      ctx.fillStyle = '#111827';
      ctx.font = 'bold 36px sans-serif';
      ctx.fillText("SOUTHERN GLAZER'S WINE & SPIRITS OF TEXAS", 60, 90);

      ctx.font = '20px sans-serif';
      ctx.fillStyle = '#4B5563';
      ctx.fillText('Wholesale Beverage Distribution Invoice', 60, 130);
      ctx.fillText('Invoice #: INV-2026-98104', 60, 160);
      ctx.fillText(`Date: ${new Date().toLocaleDateString()}`, 60, 190);
      ctx.fillText('Sold To: 377 Spirits Granbury (Acct #SG-77820)', 60, 220);

      // Line items table
      ctx.fillStyle = '#E5E7EB';
      ctx.fillRect(60, 260, 1080, 45);
      ctx.fillStyle = '#111827';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText('ITEM / DESCRIPTION', 80, 290);
      ctx.fillText('PACK/SIZE', 480, 290);
      ctx.fillText('QTY', 660, 290);
      ctx.fillText('UNIT COST', 780, 290);
      ctx.fillText('TOTAL', 980, 290);

      const items = [
        { desc: 'Buffalo Trace Kentucky Bourbon', size: '12 x 750ML', qty: '2 CS (24 btl)', cost: '$24.99', total: '$599.76', upc: '080244009236' },
        { desc: 'Eagle Rare 10 Year Straight Bourbon', size: '6 x 750ML', qty: '1 CS (6 btl)', cost: '$32.50', total: '$195.00', upc: '080244009243' },
        { desc: 'Weller Special Reserve 750ML', size: '6 x 750ML', qty: '2 CS (12 btl)', cost: '$39.00', total: '$468.00', upc: '080244012075' },
        { desc: 'Tito\'s Handmade Vodka 1.75L', size: '6 x 1.75L', qty: '3 CS (18 btl)', cost: '$26.50', total: '$477.00', upc: '619947000020' },
      ];

      let y = 350;
      ctx.font = '18px sans-serif';
      items.forEach((item, idx) => {
        ctx.fillStyle = idx % 2 === 0 ? '#F9FAFB' : '#FFFFFF';
        ctx.fillRect(60, y - 30, 1080, 50);
        ctx.fillStyle = '#111827';
        ctx.fillText(item.desc, 80, y);
        ctx.fillStyle = '#4B5563';
        ctx.fillText(item.size, 480, y);
        ctx.fillStyle = '#111827';
        ctx.fillText(item.qty, 660, y);
        ctx.fillText(item.cost, 780, y);
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText(item.total, 980, y);
        ctx.font = '14px monospace';
        ctx.fillStyle = '#6B7280';
        ctx.fillText(`UPC: ${item.upc}`, 80, y + 20);
        y += 70;
      });

      // Totals
      ctx.fillStyle = '#111827';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText('INVOICE TOTAL DUE: $1,739.76', 700, y + 60);

      const dataUrl = demoCanvas.toDataURL('image/jpeg', 0.9);
      setPages(prev => [
        ...prev,
        {
          id: `demo-${Date.now()}`,
          dataUrl,
          name: 'Southern-Glazers-INV-98104.jpg',
          sizeKb: 145,
        },
      ]);
      playBeep('beep');
    }
  };

  return (
    <div className="min-h-screen bg-[#0E0E0E] text-[#EEEEEE] flex flex-col font-sans">
      {/* Mobile Header (INV-02) */}
      <header className="sticky top-0 z-30 bg-[#141414] border-b border-[#262626] px-4 py-3.5 flex items-center justify-between shadow-md">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#C5A059]/20 text-[#C5A059] flex items-center justify-center border border-[#C5A059]/30">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-wide">Mobile Invoice Capture</h1>
            <div className="flex items-center space-x-1 text-[11px] text-[#888888]">
              <Store className="w-3 h-3 text-[#C5A059]" />
              <span>{session?.storeName || '377 Spirits Granbury'}</span>
            </div>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#888888] hover:text-white hover:bg-[#262626] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </header>

      {/* Main Content Body */}
      <main className="flex-1 p-4 max-w-lg mx-auto w-full space-y-4">
        {/* Validating Session Spinner */}
        {isValidating && (
          <div className="py-24 text-center space-y-3">
            <Loader2 className="w-10 h-10 text-[#C5A059] animate-spin mx-auto" />
            <p className="text-sm font-semibold text-white">Validating QR Session Code...</p>
            <p className="text-xs text-[#888888]">Linking phone camera directly to POS register</p>
          </div>
        )}

        {/* Invalid or Expired Session Error (INV-02, INV-18) */}
        {!isValidating && sessionError && (
          <div className="p-6 rounded-xl bg-red-950/30 border border-red-800/50 text-center space-y-4 my-8">
            <div className="w-12 h-12 rounded-full bg-red-900/40 text-red-400 flex items-center justify-center mx-auto border border-red-700/50">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Unable to Open Upload Session</h2>
              <p className="text-xs text-red-300 mt-1.5">{sessionError}</p>
            </div>
            <div className="p-3 bg-black/40 rounded-lg text-xs text-[#AAAAAA] text-left space-y-1">
              <p className="font-semibold text-white flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#C5A059]" /> Session Expiration Rules (INV-01 / INV-18):
              </p>
              <p>• QR codes expire after 10 minutes for store data security.</p>
              <p>• Already completed or cancelled codes cannot be reused.</p>
              <p>• Please return to POS terminal and click "Scan QR with Phone" to generate a fresh code.</p>
            </div>
          </div>
        )}

        {/* Upload Success View (INV-04) */}
        {!isValidating && uploadSuccess && (
          <div className="p-6 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 text-center space-y-4 my-6 animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40 shadow-lg">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Invoice Transmitted to POS!</h2>
              <p className="text-xs text-emerald-300 mt-1">
                {pages.length} page(s) uploaded successfully. The POS terminal is now extracting line items, quantities, and distributor costs.
              </p>
            </div>
            <div className="p-3 bg-[#161616] rounded-xl text-xs text-[#AAAAAA] text-left border border-[#262626] space-y-1">
              <p className="text-white font-semibold">Next Step:</p>
              <p>Look up at the POS screen. The "Review Invoice" modal has appeared with all line items pre-matched to your catalog.</p>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                Done
              </button>
            )}
          </div>
        )}

        {/* Active Capture & Review Workspace */}
        {!isValidating && !sessionError && !uploadSuccess && (
          <>
            {/* Session Info Bar */}
            <div className="p-3 rounded-xl bg-[#161616] border border-[#262626] flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="font-semibold text-white">POS Connected</span>
              </div>
              <span className="text-[11px] font-mono text-[#888888]">ID: {sessionId.slice(-8)}</span>
            </div>

            {/* Live Camera Viewfinder (INV-03) */}
            {activeCamera ? (
              <div className="relative rounded-2xl overflow-hidden border border-[#C5A059]/50 bg-black aspect-3/4 flex flex-col items-center justify-center shadow-2xl">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />

                {/* Framing Overlay */}
                <div className="absolute inset-6 border-2 border-dashed border-[#C5A059]/60 rounded-lg pointer-events-none flex flex-col justify-between p-3">
                  <div className="text-[10px] uppercase font-mono text-[#C5A059] bg-black/60 px-2 py-0.5 rounded w-fit">
                    Align Vendor Invoice Inside Frame
                  </div>
                  <div className="text-[10px] text-center text-white/80 bg-black/60 px-2 py-1 rounded">
                    Hold still and ensure bright lighting
                  </div>
                </div>

                {/* Camera Action Buttons */}
                <div className="absolute bottom-4 left-0 right-0 flex items-center justify-around px-6">
                  <button
                    onClick={stopCamera}
                    className="p-3 rounded-full bg-black/70 text-white hover:bg-black transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  <button
                    onClick={captureSnapshot}
                    className="w-16 h-16 rounded-full border-4 border-white bg-[#C5A059] flex items-center justify-center shadow-lg active:scale-95 transition-transform cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-full bg-white"></div>
                  </button>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-3 rounded-full bg-black/70 text-white hover:bg-black transition-colors cursor-pointer"
                  >
                    <ImageIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ) : (
              /* Capture Trigger Buttons */
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={startCamera}
                    className="p-4 rounded-xl bg-[#C5A059] hover:bg-[#b08e4d] text-black font-bold flex flex-col items-center justify-center space-y-2 shadow-lg transition-transform active:scale-95 cursor-pointer"
                  >
                    <Camera className="w-6 h-6" />
                    <span className="text-xs uppercase tracking-wider">Take Photo</span>
                  </button>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-4 rounded-xl bg-[#1E1E1E] hover:bg-[#282828] border border-[#333333] text-white font-bold flex flex-col items-center justify-center space-y-2 shadow transition-transform active:scale-95 cursor-pointer"
                  >
                    <ImageIcon className="w-6 h-6 text-[#C5A059]" />
                    <span className="text-xs uppercase tracking-wider">Choose File</span>
                  </button>
                </div>

                {/* Demo Receipt Helper */}
                <button
                  onClick={loadDemoBeverageInvoice}
                  className="w-full py-2 rounded-lg bg-[#141414] hover:bg-[#1A1A1A] border border-[#2D2D2D] text-[#AAAAAA] hover:text-[#C5A059] text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#C5A059]" />
                  <span>Insert Distributor Demo Invoice (Southern Glazer's)</span>
                </button>
              </div>
            )}

            {/* Hidden native file input with camera capture support */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Captured Pages Gallery (INV-03: Multi-Page Support) */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white uppercase tracking-wider">
                  Captured Invoice Pages ({pages.length})
                </span>
                {pages.length > 0 && (
                  <span className="text-[#888888] text-[11px]">
                    Tap photo to preview full size
                  </span>
                )}
              </div>

              {pages.length === 0 ? (
                <div className="p-8 rounded-xl border border-dashed border-[#2D2D2D] bg-[#121212] text-center space-y-2">
                  <ImageIcon className="w-8 h-8 text-[#444444] mx-auto" />
                  <p className="text-xs text-[#888888]">No invoice photos captured yet.</p>
                  <p className="text-[11px] text-[#666666]">
                    Take a clear photo of page 1, then add additional pages if vendor invoice has multiple sheets.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {pages.map((page, idx) => (
                    <div
                      key={page.id}
                      className="relative rounded-xl border border-[#2D2D2D] bg-[#161616] overflow-hidden group shadow"
                    >
                      <img
                        src={page.dataUrl}
                        alt={`Page ${idx + 1}`}
                        onClick={() => setPreviewPageIndex(idx)}
                        className="w-full h-32 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                      />
                      <div className="p-2 flex items-center justify-between bg-[#141414] border-t border-[#222222]">
                        <span className="text-[11px] font-bold text-white truncate">
                          Page {idx + 1}
                        </span>
                        <button
                          onClick={() => removePage(page.id)}
                          className="p-1 text-[#888888] hover:text-red-400 transition-colors cursor-pointer"
                          title="Remove this page"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Add Another Page Card */}
                  <button
                    onClick={startCamera}
                    className="h-32 rounded-xl border border-dashed border-[#333333] hover:border-[#C5A059]/60 bg-[#121212] flex flex-col items-center justify-center space-y-1 text-[#888888] hover:text-[#C5A059] transition-colors cursor-pointer"
                  >
                    <Plus className="w-5 h-5" />
                    <span className="text-xs font-semibold">Add Page {pages.length + 1}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Upload Error Banner */}
            {uploadError && (
              <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-center justify-between">
                <span>{uploadError}</span>
                <button
                  onClick={handleUploadToPos}
                  className="px-2 py-1 rounded bg-red-900/80 hover:bg-red-800 text-[11px] font-bold text-white transition-colors cursor-pointer"
                >
                  Retry Upload
                </button>
              </div>
            )}

            {/* Upload Progress Bar (INV-04) */}
            {isUploading && (
              <div className="p-4 rounded-xl bg-[#161616] border border-[#2D2D2D] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-white flex items-center gap-2">
                    <UploadCloud className="w-4 h-4 text-[#C5A059] animate-bounce" />
                    Uploading to POS Terminal...
                  </span>
                  <span className="text-[#C5A059] font-bold">{uploadProgress}%</span>
                </div>
                <div className="w-full h-2 bg-[#222222] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#C5A059] transition-all duration-300 rounded-full"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Main Submit / Transmit Button (INV-04) */}
            <div className="pt-2">
              <button
                onClick={handleUploadToPos}
                disabled={pages.length === 0 || isUploading}
                className="w-full py-3.5 rounded-xl bg-[#C5A059] hover:bg-[#b08e4d] disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shadow-xl transition-transform active:scale-98 cursor-pointer"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-black" />
                    <span>Processing with AI on POS...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" />
                    <span>Upload {pages.length} Page(s) to POS Register</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </main>

      {/* Full Size Image Preview Modal (INV-03) */}
      {previewPageIndex !== null && pages[previewPageIndex] && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col p-4">
          <div className="flex items-center justify-between text-white pb-3 border-b border-[#262626]">
            <span className="text-sm font-bold">{pages[previewPageIndex].name}</span>
            <button
              onClick={() => setPreviewPageIndex(null)}
              className="p-1 text-[#888888] hover:text-white rounded transition-colors cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center p-2 overflow-auto">
            <img
              src={pages[previewPageIndex].dataUrl}
              alt="Preview"
              className="max-w-full max-h-[80vh] object-contain rounded-lg border border-[#333333]"
            />
          </div>
          <div className="pt-2 flex justify-end">
            <button
              onClick={() => setPreviewPageIndex(null)}
              className="px-4 py-2 rounded-lg bg-[#333333] hover:bg-[#444444] text-xs font-semibold text-white transition-colors cursor-pointer"
            >
              Done Previewing
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
