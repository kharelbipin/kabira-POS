import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Sparkles,
  UploadCloud,
  X,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Package,
  Layers,
  History,
  ShieldCheck,
  Zap,
  QrCode,
  Smartphone,
  ExternalLink,
  Plus,
  Trash2,
} from 'lucide-react';
import { api } from '../../utils/api';
import { playBeep } from '../../utils/audio';

interface AiShelfCounterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onOpenHistory?: () => void;
}

const SAMPLE_SHELF_PRESETS = [
  {
    id: 'preset-bourbon',
    name: 'Bourbon & Rare Whiskies (Aisle 3)',
    location: 'Aisle 3 - Premium Bourbon Bay',
    imageUrl: 'https://images.unsplash.com/photo-1527061011665-3652c757a4d4?w=800&q=80',
    description: 'Buffalo Trace, Eagle Rare 10Yr, Woodford Reserve Derby Edition',
  },
  {
    id: 'preset-tequila',
    name: 'Tequila & Mezcal Wall (Front Bay)',
    location: 'Front Display - Agave Spirits',
    imageUrl: 'https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=800&q=80',
    description: 'Casamigos Reposado, Clase Azul, Don Julio 1942',
  },
  {
    id: 'preset-wine',
    name: 'Sommelier Reserve Wine Rack',
    location: 'Wine Cellar - Section B',
    imageUrl: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&q=80',
    description: 'Silver Oak Cabernet, Caymus Vineyards, Duckhorn Merlot',
  },
];

export const AiShelfCounterModal: React.FC<AiShelfCounterModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onOpenHistory,
}) => {
  const [activeTab, setActiveTab] = useState<'presets' | 'camera' | 'upload'>('presets');
  const [selectedImage, setSelectedImage] = useState<string>(SAMPLE_SHELF_PRESETS[0].imageUrl);
  const [multipleShelfImages, setMultipleShelfImages] = useState<string[]>([]);
  const [shelfLocation, setShelfLocation] = useState(SAMPLE_SHELF_PRESETS[0].location);
  const [notes, setNotes] = useState('');
  const [shelfSessionId] = useState<string>(() => `shelf-${Date.now()}`);

  // Camera state
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Analysis & Processing state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  const [editableItems, setEditableItems] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const directShelfUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}?mobileShelf=${shelfSessionId}&loc=${encodeURIComponent(shelfLocation)}`;

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setAnalysisResult(null);
      setErrorMsg(null);
      setSuccessMsg(null);
      return;
    }

    // Check for existing or incoming mobile uploads for this session
    const checkForMobileUploads = async () => {
      // 1. Local storage check for instant same-browser reaction
      try {
        const raw = localStorage.getItem(`pos_mobile_shelf_uploads_${shelfSessionId}`);
        if (raw) {
          const uploads = JSON.parse(raw);
          if (Array.isArray(uploads) && uploads.length > 0) {
            const urls = uploads.map((u: any) => u.url).filter(Boolean);
            if (urls.length > 0) {
              setMultipleShelfImages(prev => Array.from(new Set([...prev, ...urls])));
              if (!selectedImage || selectedImage === SAMPLE_SHELF_PRESETS[0].imageUrl) {
                setSelectedImage(urls[urls.length - 1]);
              }
            }
          }
        }
      } catch (e) {}

      // 2. Backend server endpoint check for cross-device smartphone uploads
      try {
        const res = await api.getShelfPhotos(shelfSessionId);
        if (res && res.success && Array.isArray(res.photos) && res.photos.length > 0) {
          const urls = res.photos.map(p => p.url).filter(Boolean);
          if (urls.length > 0) {
            setMultipleShelfImages(prev => Array.from(new Set([...prev, ...urls])));
            if (!selectedImage || selectedImage === SAMPLE_SHELF_PRESETS[0].imageUrl) {
              setSelectedImage(urls[urls.length - 1]);
            }
          }
        }
      } catch (e) {}
    };

    checkForMobileUploads();
    const interval = setInterval(checkForMobileUploads, 1500);
    const handleStorage = (e: StorageEvent) => {
      if (e.key === `pos_mobile_shelf_uploads_${shelfSessionId}` || e.key === 'pos_last_mobile_shelf_event') {
        checkForMobileUploads();
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorage);
    };
  }, [isOpen, shelfSessionId, selectedImage]);

  const startCamera = async () => {
    setCameraError(null);
    if (!navigator?.mediaDevices?.getUserMedia) {
      setCameraError('Camera access is not supported by this browser. Please scan the QR code above or upload photos.');
      setCameraActive(false);
      return;
    }

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });
      } catch (idealErr) {
        // Fall back to basic video constraint if environment constraints fail
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setCameraActive(true);
      try {
        localStorage.setItem('pos_camera_permission_granted', 'true');
      } catch (e) {}
    } catch (err: any) {
      console.warn('Camera access unavailable or permission denied:', err?.name || err?.message || err);
      const isPermDenied = err?.name === 'NotAllowedError' || err?.message?.toLowerCase().includes('permission');
      setCameraError(
        isPermDenied
          ? 'Camera permission denied or blocked. Please allow camera in browser settings, scan the QR code above with any phone, or upload shelf photos.'
          : (err?.message || 'Unable to access camera. Please check permissions or upload an image.')
      );
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
      setCameraStream(null);
    }
    setCameraActive(false);
  };

  const captureCamera = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 1280;
    canvas.height = videoRef.current.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setSelectedImage(dataUrl);
    stopCamera();
    setActiveTab('upload');
    playBeep('success');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const urls: string[] = [];
    Array.from(files).forEach((file: File, idx) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (typeof event.target?.result === 'string') {
          const res = event.target.result;
          urls.push(res);
          setMultipleShelfImages(prev => prev.includes(res) ? prev : [...prev, res]);
          if (idx === 0) {
            setSelectedImage(res);
          }
        }
      };
      reader.readAsDataURL(file);
    });
    setActiveTab('upload');
  };

  const handleRunAiCount = async () => {
    if (!selectedImage) {
      setErrorMsg('Please select a shelf image or take a photo first.');
      return;
    }

    setIsAnalyzing(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await api.countShelfBottlesWithAi(selectedImage, shelfLocation);
      setAnalysisResult(res);
      setEditableItems(res.items.map(item => ({ ...item })));
      playBeep('success');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to complete AI shelf bottle count.');
      playBeep('error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleUpdateItemCount = (index: number, newCount: number) => {
    const next = [...editableItems];
    const val = Math.max(0, newCount);
    next[index].detectedCount = val;
    next[index].variance = val - next[index].currentPosStock;
    setEditableItems(next);
  };

  const handleApplyToInventory = async () => {
    if (!editableItems.length) return;

    setIsApplying(true);
    setErrorMsg(null);

    try {
      const res = await api.applyAiShelfCount({
        shelfLocation,
        photoUrl: selectedImage,
        items: editableItems,
        notes: notes || `AI visual shelf count performed by cashier on ${new Date().toLocaleDateString()}`,
      });

      setSuccessMsg(`Inventory updated! Adjusted ${res.adjustments.length} products to physical counts.`);
      playBeep('success');
      setTimeout(() => {
        onSuccess();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to apply inventory adjustments.');
      playBeep('error');
    } finally {
      setIsApplying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-5">
      <div className="bg-[#121212] border border-[#262626] rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#222222] bg-[#181818] shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#C5A059]/15 text-[#C5A059] flex items-center justify-center border border-[#C5A059]/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  AI Visual Shelf Inventory Counter
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#C5A059]/20 text-[#C5A059] border border-[#C5A059]/30">
                  Gemini Vision Powered
                </span>
              </div>
              <p className="text-xs text-[#888888]">
                Photograph shelves or backbar displays to instantly count bottles, verify catalog SKUs, and reconcile POS stock
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {onOpenHistory && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenHistory();
                }}
                className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#1F1F1F] hover:bg-[#282828] text-[#AAAAAA] hover:text-white text-xs transition-colors cursor-pointer border border-[#333333]"
              >
                <History className="w-3.5 h-3.5" />
                <span>Count History</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-[#888888] hover:text-white rounded-lg hover:bg-[#222222] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#222222] bg-[#141414] px-6 pt-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              stopCamera();
              setActiveTab('presets');
            }}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors cursor-pointer ${
              activeTab === 'presets'
                ? 'border-[#C5A059] text-[#C5A059]'
                : 'border-transparent text-[#777777] hover:text-[#CCCCCC]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Store Presets (Instant Test)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('camera');
            }}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors cursor-pointer ${
              activeTab === 'camera'
                ? 'border-[#C5A059] text-[#C5A059]'
                : 'border-transparent text-[#777777] hover:text-[#CCCCCC]'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Live Camera Scanner</span>
          </button>

          <button
            type="button"
            onClick={() => {
              stopCamera();
              setActiveTab('upload');
            }}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors cursor-pointer ${
              activeTab === 'upload'
                ? 'border-[#C5A059] text-[#C5A059]'
                : 'border-transparent text-[#777777] hover:text-[#CCCCCC]'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Upload Photo</span>
          </button>
        </div>

        {/* Body Container */}
        <div className="p-6 overflow-y-auto grow space-y-5">
          {errorMsg && (
            <div className="flex items-center space-x-2.5 p-3 bg-red-950/40 border border-red-800/50 rounded-xl text-red-200 text-xs">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center space-x-2.5 p-3 bg-emerald-950/40 border border-emerald-800/50 rounded-xl text-emerald-200 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Top Config Row: Shelf Location & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#181818] p-4 rounded-xl border border-[#262626]">
            <div>
              <label className="text-xs font-bold text-[#AAAAAA] uppercase tracking-wider block mb-1.5">
                Shelf Location / Bay Identifier
              </label>
              <input
                type="text"
                value={shelfLocation}
                onChange={e => setShelfLocation(e.target.value)}
                placeholder="e.g. Aisle 3 - Top Bourbon Shelf"
                className="w-full bg-[#111111] border border-[#333333] rounded-lg px-3 py-2 text-sm text-white focus:border-[#C5A059] outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-[#AAAAAA] uppercase tracking-wider block mb-1.5">
                Session Audit Notes (Optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. Morning cycle count before store open"
                className="w-full bg-[#111111] border border-[#333333] rounded-lg px-3 py-2 text-sm text-white focus:border-[#C5A059] outline-none"
              />
            </div>
          </div>

          {/* Tab 1: Presets */}
          {activeTab === 'presets' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#888888]">
                  Select Sample Shelf Photo
                </span>
                <span className="text-[11px] text-[#666666]">
                  Click to inspect and run bottle detection
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {SAMPLE_SHELF_PRESETS.map(preset => {
                  const isSelected = selectedImage === preset.imageUrl;
                  return (
                    <div
                      key={preset.id}
                      onClick={() => {
                        setSelectedImage(preset.imageUrl);
                        setShelfLocation(preset.location);
                        setAnalysisResult(null);
                      }}
                      className={`relative rounded-xl border overflow-hidden cursor-pointer transition-all ${
                        isSelected
                          ? 'border-[#C5A059] ring-2 ring-[#C5A059]/30 bg-[#1F1C16]'
                          : 'border-[#262626] bg-[#161616] hover:border-[#383838]'
                      }`}
                    >
                      <div className="h-32 w-full overflow-hidden relative">
                        <img
                          src={preset.imageUrl}
                          alt={preset.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                        {isSelected && (
                          <div className="absolute top-2 right-2 bg-[#C5A059] text-black rounded-full p-1 shadow">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </div>
                        )}
                        <span className="absolute bottom-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded bg-black/60 text-white backdrop-blur-xs">
                          {preset.location}
                        </span>
                      </div>
                      <div className="p-3">
                        <h4 className="text-xs font-bold text-white truncate">{preset.name}</h4>
                        <p className="text-[11px] text-[#888888] line-clamp-1 mt-0.5">
                          {preset.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab 2: Live Camera Scanner */}
          {activeTab === 'camera' && (
            <div className="space-y-4">
              {/* Smartphone QR Multi-Shot Intake Card */}
              <div className="bg-[#181818] border border-[#2B2B2B] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-5">
                <div className="bg-white p-3 rounded-xl shrink-0 shadow-md">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(directShelfUrl)}`}
                    alt="Smartphone Camera QR"
                    className="w-36 h-36 mx-auto"
                  />
                </div>
                <div className="space-y-2 text-center sm:text-left flex-1">
                  <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-300 text-[11px] font-bold">
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Scan with Smartphone for Multi-Shot Camera</span>
                  </div>
                  <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider">
                    Walk Aisles & Snap Multiple Photos
                  </h3>
                  <p className="text-xs text-[#999999] leading-relaxed">
                    Scan this QR code with any phone to immediately open your camera lens. Snap wide shelves, top bays, and backbars multiple times — photos sync automatically to this screen in real time.
                  </p>
                  <div className="pt-1 flex flex-wrap gap-2 justify-center sm:justify-start">
                    <a
                      href={directShelfUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#C5A059] hover:bg-[#B38F46] text-black font-bold text-xs uppercase cursor-pointer transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open Camera In New Tab (Test Link)</span>
                    </a>
                  </div>
                </div>
              </div>

              {/* Photos Received / Multi-Shot Gallery */}
              {multipleShelfImages.length > 0 && (
                <div className="bg-[#161616] border border-[#262626] rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs text-[#AAAAAA] font-bold uppercase tracking-wider">
                    <span>Captured Shelf Photos ({multipleShelfImages.length})</span>
                    <span className="text-[11px] text-[#C5A059] lowercase font-normal">click any to select for AI analysis</span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
                    {multipleShelfImages.map((imgUrl, i) => {
                      const isCurr = selectedImage === imgUrl;
                      return (
                        <div
                          key={i}
                          onClick={() => setSelectedImage(imgUrl)}
                          className={`relative rounded-lg overflow-hidden border cursor-pointer group aspect-video ${
                            isCurr ? 'border-[#C5A059] ring-2 ring-[#C5A059]/40' : 'border-[#333333] hover:border-[#666666]'
                          }`}
                        >
                          <img src={imgUrl} alt={`Shot ${i + 1}`} className="w-full h-full object-cover" />
                          <span className="absolute bottom-1 left-1 bg-black/80 px-1.5 py-0.5 rounded text-[9px] font-bold text-white">
                            Shot #{i + 1}
                          </span>
                          {isCurr && (
                            <div className="absolute top-1 right-1 bg-[#C5A059] text-black rounded-full p-0.5 shadow">
                              <CheckCircle2 className="w-3 h-3" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Terminal USB / Laptop Webcam View */}
              <div className="relative bg-black rounded-xl overflow-hidden border border-[#333333] min-h-[220px] flex items-center justify-center">
                <video
                  ref={videoRef}
                  playsInline
                  autoPlay
                  className={`w-full max-h-[320px] object-cover ${cameraActive ? 'block' : 'hidden'}`}
                />

                {!cameraActive && (
                  <div className="p-6 text-center space-y-3 max-w-md mx-auto">
                    <Camera className="w-10 h-10 text-[#555555] mx-auto" />
                    <p className="text-xs text-[#AAAAAA] leading-relaxed">
                      {cameraError || 'Or snap directly using this terminal’s webcam or USB inspection camera.'}
                    </p>
                    <div className="flex items-center justify-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={startCamera}
                        className="px-4 py-2 bg-[#222222] hover:bg-[#2C2C2C] text-white font-bold text-xs rounded-lg transition-colors cursor-pointer border border-[#444444]"
                      >
                        {cameraError ? 'Retry Terminal Camera' : 'Start Terminal Camera'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('upload');
                          fileInputRef.current?.click();
                        }}
                        className="px-4 py-2 bg-[#C5A059] hover:bg-[#D4AF37] text-black font-bold text-xs rounded-lg transition-colors cursor-pointer"
                      >
                        Upload Photos
                      </button>
                    </div>
                  </div>
                )}

                {cameraActive && (
                  <div className="absolute inset-x-0 bottom-4 flex justify-center">
                    <button
                      type="button"
                      onClick={captureCamera}
                      className="px-6 py-2 rounded-full bg-[#C5A059] hover:bg-[#D4AF37] text-black font-bold text-xs uppercase tracking-wider flex items-center space-x-2 shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Snap Shelf Photo for AI Count</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 3: Upload Photo */}
          {activeTab === 'upload' && (
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#333333] hover:border-[#C5A059]/60 bg-[#161616] hover:bg-[#1A1A1A] rounded-xl p-8 text-center cursor-pointer transition-all space-y-3"
              >
                <div className="w-12 h-12 rounded-xl bg-[#222222] text-[#C5A059] flex items-center justify-center mx-auto border border-[#333333]">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Click or Drag & Drop Shelf Photos (Select Multiple)</p>
                  <p className="text-xs text-[#777777] mt-0.5">Supports JPG, PNG, WEBP high-resolution photos</p>
                </div>
              </div>

              {multipleShelfImages.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs text-[#AAAAAA] font-bold uppercase tracking-wider block">
                    Available Shelf Photos ({multipleShelfImages.length})
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {multipleShelfImages.map((imgUrl, idx) => (
                      <div
                        key={idx}
                        onClick={() => setSelectedImage(imgUrl)}
                        className={`relative rounded-xl overflow-hidden border cursor-pointer aspect-video ${
                          selectedImage === imgUrl ? 'border-[#C5A059] ring-2 ring-[#C5A059]/40' : 'border-[#262626]'
                        }`}
                      >
                        <img src={imgUrl} alt={`Uploaded ${idx}`} className="w-full h-full object-cover" />
                        <span className="absolute bottom-1 left-1 bg-black/80 px-1.5 py-0.5 rounded text-[9px] font-bold text-white">
                          Image #{idx + 1}
                        </span>
                        {selectedImage === imgUrl && (
                          <div className="absolute top-1 right-1 bg-[#C5A059] text-black rounded-full p-0.5 shadow">
                            <CheckCircle2 className="w-3 h-3" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedImage && multipleShelfImages.length === 0 && (
                <div className="relative rounded-xl overflow-hidden border border-[#262626] max-h-48">
                  <img src={selectedImage} alt="Selected shelf" className="w-full h-48 object-cover" />
                  <span className="absolute bottom-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded bg-black/70 text-[#C5A059]">
                    Photo Ready for AI Analysis
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Analyze Trigger Action */}
          {!analysisResult && (
            <div className="pt-2">
              <button
                type="button"
                onClick={handleRunAiCount}
                disabled={isAnalyzing || !selectedImage}
                className={`w-full py-3.5 rounded-xl font-bold text-sm uppercase tracking-wider flex items-center justify-center space-x-2.5 transition-all cursor-pointer shadow-lg ${
                  isAnalyzing || !selectedImage
                    ? 'bg-[#222222] text-[#666666] cursor-not-allowed'
                    : 'bg-gradient-to-r from-[#C5A059] to-[#D4AF37] hover:from-[#D4AF37] hover:to-[#C5A059] text-black hover:scale-[1.01]'
                }`}
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Gemini AI Vision Analyzing Shelf Bottles...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Run AI Visual Bottle Count</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Analysis Results View */}
          {analysisResult && (
            <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
              {/* Summary KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-[#181818] border border-[#262626] rounded-xl p-3">
                  <span className="text-[10px] uppercase font-bold text-[#888888] block">Total Bottles Detected</span>
                  <div className="flex items-center space-x-2 mt-1">
                    <Package className="w-4 h-4 text-[#C5A059]" />
                    <span className="text-xl font-black text-white font-mono">
                      {editableItems.reduce((s, i) => s + (Number(i.detectedCount) || 0), 0)}
                    </span>
                  </div>
                </div>

                <div className="bg-[#181818] border border-[#262626] rounded-xl p-3">
                  <span className="text-[10px] uppercase font-bold text-[#888888] block">Vision Confidence</span>
                  <div className="flex items-center space-x-2 mt-1">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span className="text-xl font-black text-emerald-400 font-mono">
                      {analysisResult.confidenceScore || 96}%
                    </span>
                  </div>
                </div>

                <div className="bg-[#181818] border border-[#262626] rounded-xl p-3">
                  <span className="text-[10px] uppercase font-bold text-[#888888] block">Catalog Products</span>
                  <div className="flex items-center space-x-2 mt-1">
                    <Layers className="w-4 h-4 text-sky-400" />
                    <span className="text-xl font-black text-white font-mono">{editableItems.length}</span>
                  </div>
                </div>

                <div className="bg-[#181818] border border-[#262626] rounded-xl p-3">
                  <span className="text-[10px] uppercase font-bold text-[#888888] block">Net Discrepancy</span>
                  <div className="flex items-center space-x-2 mt-1">
                    {editableItems.reduce((s, i) => s + i.variance, 0) >= 0 ? (
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-rose-400" />
                    )}
                    <span className="text-xl font-black font-mono text-white">
                      {editableItems.reduce((s, i) => s + i.variance, 0) > 0 ? '+' : ''}
                      {editableItems.reduce((s, i) => s + i.variance, 0)} units
                    </span>
                  </div>
                </div>
              </div>

              {/* Items Breakdown Table */}
              <div className="bg-[#181818] border border-[#262626] rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-[#262626] flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-white">
                    Identified Spirits & Verification
                  </span>
                  <span className="text-[11px] text-[#888888]">
                    Review count before applying to POS inventory
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#141414] text-[#888888] uppercase tracking-wider text-[10px] border-b border-[#222222]">
                      <tr>
                        <th className="py-2.5 px-4">Product Name & Size</th>
                        <th className="py-2.5 px-3">Catalog Section</th>
                        <th className="py-2.5 px-3 text-center">POS Expected</th>
                        <th className="py-2.5 px-3 text-center">AI Counted</th>
                        <th className="py-2.5 px-3 text-center">Variance</th>
                        <th className="py-2.5 px-3 text-right">Confidence</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#222222]">
                      {editableItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-[#1C1C1C]">
                          <td className="py-3 px-4">
                            <div className="font-bold text-white">{item.productName}</div>
                            <div className="text-[10px] text-[#777777] font-mono">
                              {item.size || '750ml'} • {item.brand}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-[#999999]">{item.shelfSection || 'Row 1'}</td>
                          <td className="py-3 px-3 text-center font-mono text-sm text-[#AAAAAA]">
                            {item.currentPosStock}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <input
                              type="number"
                              min="0"
                              value={item.detectedCount}
                              onChange={e => handleUpdateItemCount(idx, parseInt(e.target.value) || 0)}
                              className="w-16 bg-[#111111] border border-[#383838] focus:border-[#C5A059] rounded px-2 py-1 text-center font-mono font-bold text-white text-sm outline-none"
                            />
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono ${
                                item.variance === 0
                                  ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-800/40'
                                  : item.variance > 0
                                  ? 'bg-blue-950/50 text-blue-400 border border-blue-800/40'
                                  : 'bg-rose-950/50 text-rose-400 border border-rose-800/40'
                              }`}
                            >
                              {item.variance > 0 ? `+${item.variance}` : item.variance}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-emerald-400 text-[11px]">
                            {item.confidence}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAnalysisResult(null)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-[#333333] hover:bg-[#222222] text-[#AAAAAA] hover:text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Discard & Retake Photo
                </button>

                <button
                  type="button"
                  onClick={handleApplyToInventory}
                  disabled={isApplying}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#C5A059] hover:bg-[#D4AF37] text-black text-xs font-bold uppercase tracking-wider flex items-center justify-center space-x-2 shadow-lg transition-all cursor-pointer"
                >
                  {isApplying ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Updating POS Inventory...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Apply AI Counts to POS Inventory</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
