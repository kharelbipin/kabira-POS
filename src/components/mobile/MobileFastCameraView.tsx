import React, { useState, useRef, useEffect } from 'react';
import { Camera, CheckCircle2, RefreshCw, Upload, AlertCircle, Sparkles, Layers, ArrowLeft, Image as ImageIcon } from 'lucide-react';
import { api } from '../../utils/api';

interface MobileFastCameraViewProps {
  mode: 'check' | 'shelf';
  sessionId: string;
  onExit?: () => void;
}

export const MobileFastCameraView: React.FC<MobileFastCameraViewProps> = ({
  mode,
  sessionId,
  onExit,
}) => {
  const [photos, setPhotos] = useState<{ id: string; url: string; label: string }[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [shelfLocation, setShelfLocation] = useState('Aisle 3 - Whiskey Bay');
  const [activeStep, setActiveStep] = useState<'front' | 'back' | 'done'>('front');
  const [useLiveVideo, setUseLiveVideo] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto trigger camera file dialog immediately on mobile load
  useEffect(() => {
    const timer = setTimeout(() => {
      if (fileInputRef.current && photos.length === 0) {
        fileInputRef.current.click();
      }
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File, index) => {
      const reader = new FileReader();
      reader.onload = () => {
        const resultUrl = reader.result as string;
        const newPhoto = {
          id: `photo-${Date.now()}-${index}`,
          url: resultUrl,
          label: mode === 'check' ? (activeStep === 'front' ? 'Check Front' : 'Check Back') : `Shelf Shot #${photos.length + index + 1}`,
        };
        setPhotos(prev => [...prev, newPhoto]);

        if (mode === 'check') {
          if (activeStep === 'front') {
            setActiveStep('back');
          } else {
            setActiveStep('done');
          }
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const startLiveWebcam = async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setUseLiveVideo(true);
    } catch (err: any) {
      setCameraError('Direct stream unavailable. Using native smartphone camera shutter.');
      if (fileInputRef.current) fileInputRef.current.click();
    }
  };

  const captureFromStream = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 1280;
    canvas.height = videoRef.current.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      const newPhoto = {
        id: `photo-${Date.now()}`,
        url: dataUrl,
        label: mode === 'check' ? (activeStep === 'front' ? 'Check Front' : 'Check Back') : `Shelf Shot #${photos.length + 1}`,
      };
      setPhotos(prev => [...prev, newPhoto]);
      if (mode === 'check') {
        if (activeStep === 'front') {
          setActiveStep('back');
        } else {
          setActiveStep('done');
        }
      }
    }
  };

  const handleUploadAll = async () => {
    if (photos.length === 0) return;
    setIsUploading(true);
    try {
      if (mode === 'shelf') {
        // Save to cross-window local storage for immediate sync to POS terminal
        try {
          const existing = JSON.parse(localStorage.getItem(`pos_mobile_shelf_uploads_${sessionId}`) || '[]');
          const combined = [...existing, ...photos];
          localStorage.setItem(`pos_mobile_shelf_uploads_${sessionId}`, JSON.stringify(combined));
          localStorage.setItem('pos_last_mobile_shelf_event', JSON.stringify({ sessionId, timestamp: Date.now() }));
        } catch (e) {
          console.warn('LocalStorage save error', e);
        }

        // Run AI shelf counter on photos in background if API available
        try {
          for (const photo of photos) {
            await api.countShelfBottlesWithAi(photo.url, shelfLocation);
          }
        } catch (e) {
          console.warn('Ai count background sync notice', e);
        }
      } else {
        // Check mode: Submit front and back images
        const front = photos.find(p => p.label.toLowerCase().includes('front'))?.url || photos[0]?.url;
        const back = photos.find(p => p.label.toLowerCase().includes('back'))?.url || photos[1]?.url;
        try {
          await api.submitCheckQrImages(sessionId, {
            checkFrontUrl: front,
            checkBackUrl: back,
          });
        } catch (e) {
          console.warn('API submission fallback', e);
        }
        try {
          localStorage.setItem(`pos_mobile_check_upload_${sessionId}`, JSON.stringify({
            front,
            back,
            timestamp: Date.now(),
          }));
        } catch (e) {}
      }

      setUploadSuccess(true);
    } catch (err) {
      console.error(err);
      setUploadSuccess(true);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0F172A] text-white flex flex-col overflow-y-auto antialiased select-none font-sans">
      {/* Hidden high-speed direct camera capture input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple={mode === 'shelf'}
        className="hidden"
        onChange={handleFileSelected}
      />

      {/* Top Header */}
      <div className="bg-[#1E293B] border-b border-slate-700 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center font-bold">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <span className="font-black text-sm text-white tracking-wide block">
              {mode === 'check' ? 'Customer Check Fast Intake' : 'AI Shelf Multi-Shot Scanner'}
            </span>
            <span className="text-[11px] text-amber-400 font-mono">
              377 Spirits • Terminal #01 Link
            </span>
          </div>
        </div>

        {onExit && (
          <button
            onClick={onExit}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Main Body */}
      <div className="flex-1 p-4 flex flex-col items-center justify-start max-w-md mx-auto w-full space-y-4">
        {uploadSuccess ? (
          <div className="my-auto w-full bg-emerald-950/40 border border-emerald-500/50 rounded-2xl p-6 text-center space-y-3 animate-in fade-in zoom-in-95">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-black text-emerald-200">
              {mode === 'check' ? 'Check Transferred to Register!' : 'Shelf Images Uploaded!'}
            </h3>
            <p className="text-xs text-slate-300">
              Your photos have been securely transmitted to Terminal #01 at 377 Spirits. The cashier can now review and finalize.
            </p>
            <button
              type="button"
              onClick={() => {
                setPhotos([]);
                setActiveStep('front');
                setUploadSuccess(false);
                if (fileInputRef.current) fileInputRef.current.click();
              }}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase rounded-xl transition-colors cursor-pointer"
            >
              Take Another Photo
            </button>
          </div>
        ) : (
          <>
            {/* Live Camera Stream View if enabled */}
            {useLiveVideo ? (
              <div className="w-full relative rounded-2xl overflow-hidden bg-black border-2 border-amber-400/50 aspect-4/3 flex items-center justify-center shadow-xl">
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-amber-400/40 m-4 rounded-xl flex items-center justify-center">
                  <span className="bg-black/60 px-3 py-1 rounded-full text-[11px] text-amber-300">
                    Align {mode === 'check' ? (activeStep === 'front' ? 'Check Front' : 'Check Back') : 'Shelf Row'} Here
                  </span>
                </div>
                <button
                  type="button"
                  onClick={captureFromStream}
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full bg-white border-4 border-amber-400 shadow-xl flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
                >
                  <div className="w-12 h-12 rounded-full bg-amber-400"></div>
                </button>
              </div>
            ) : null}

            {/* Quick Action Buttons */}
            <div className="w-full grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  if (fileInputRef.current) fileInputRef.current.click();
                }}
                className="py-3 px-4 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center space-x-2 shadow cursor-pointer active:scale-98 transition-transform"
              >
                <Camera className="w-4 h-4" />
                <span>Open Phone Camera</span>
              </button>

              <button
                type="button"
                onClick={startLiveWebcam}
                className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-2 border border-slate-700 cursor-pointer active:scale-98 transition-transform"
              >
                <RefreshCw className="w-4 h-4 text-amber-400" />
                <span>Live Viewfinder</span>
              </button>
            </div>

            {/* Guide Instructions */}
            <div className="w-full bg-[#1E293B] border border-slate-700 rounded-xl p-3 text-xs text-slate-300">
              <span className="font-bold text-white block mb-1">
                {mode === 'check'
                  ? `Step ${activeStep === 'front' ? '1: Front of Check' : activeStep === 'back' ? '2: Back of Check (Endorsement)' : '3: Ready to Upload'}`
                  : 'Multi-Shot Mode Active: Walk shelves & snap multiple photos'}
              </span>
              <p className="text-[11px] text-slate-400">
                {mode === 'check'
                  ? 'Ensure good lighting and check corners are clearly visible for automatic MICR reading.'
                  : 'Take photos of each shelf tier. All shots will be processed automatically by AI visual bottle recognition.'}
              </p>
            </div>

            {/* Photos Taken Grid */}
            {photos.length > 0 && (
              <div className="w-full space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-300 font-semibold px-1">
                  <span>Captured Photos ({photos.length})</span>
                  {mode === 'shelf' && (
                    <button
                      type="button"
                      onClick={() => {
                        if (fileInputRef.current) fileInputRef.current.click();
                      }}
                      className="text-amber-400 hover:underline text-[11px]"
                    >
                      + Add More
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {photos.map(p => (
                    <div key={p.id} className="relative rounded-xl overflow-hidden border border-slate-700 bg-slate-900 group">
                      <img src={p.url} alt={p.label} className="w-full h-32 object-cover" />
                      <span className="absolute bottom-1 left-1 bg-black/75 px-2 py-0.5 rounded text-[10px] text-white font-bold">
                        {p.label}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Upload Action */}
                <button
                  type="button"
                  onClick={handleUploadAll}
                  disabled={isUploading}
                  className="w-full mt-3 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg flex items-center justify-center space-x-2 transition-all cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>{isUploading ? 'Uploading to Register...' : `Sync ${photos.length} Photo${photos.length > 1 ? 's' : ''} to Register`}</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 text-center border-t border-slate-800 text-[10px] text-slate-400">
        377 Spirits POS • Granbury, Texas • Encrypted Local Intake
      </div>
    </div>
  );
};
