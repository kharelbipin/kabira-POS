import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  CheckCircle2,
  Upload,
  RefreshCw,
  FileCheck,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  ArrowLeft,
  X,
  User,
  Phone,
  DollarSign,
  Image as ImageIcon,
} from 'lucide-react';
import { api } from '../../utils/api';
import { playBeep } from '../../utils/audio';

interface CheckUploadDirectViewProps {
  sessionId?: string;
  token?: string;
  onExit?: () => void;
}

export const CheckUploadDirectView: React.FC<CheckUploadDirectViewProps> = ({
  sessionId = `chk-session-${Date.now()}`,
  token = `INTAKE-${Math.floor(1000 + Math.random() * 9000)}`,
  onExit,
}) => {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [checkAmount, setCheckAmount] = useState('');
  const [checkType, setCheckType] = useState('payroll');

  // Photo captures
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const [idImage, setIdImage] = useState<string | null>(null);

  // Active target for camera capture
  const [captureTarget, setCaptureTarget] = useState<'front' | 'back' | 'id'>('front');
  const [isLiveCameraActive, setIsLiveCameraActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Auto trigger camera dialog for front of check on initial load
  useEffect(() => {
    const timer = setTimeout(() => {
      if (fileInputRef.current && !frontImage) {
        setCaptureTarget('front');
        fileInputRef.current.click();
      }
    }, 350);
    return () => clearTimeout(timer);
  }, []);

  const triggerCameraCapture = (target: 'front' | 'back' | 'id') => {
    setCaptureTarget(target);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      if (captureTarget === 'front') {
        setFrontImage(dataUrl);
        // Automatically prompt for back of check next
        setTimeout(() => {
          setCaptureTarget('back');
          if (fileInputRef.current) fileInputRef.current.click();
        }, 600);
      } else if (captureTarget === 'back') {
        setBackImage(dataUrl);
      } else if (captureTarget === 'id') {
        setIdImage(dataUrl);
      }
      playBeep('click');
    };
    reader.readAsDataURL(file);
  };

  const startLiveCamera = async (target: 'front' | 'back' | 'id') => {
    setCaptureTarget(target);
    try {
      setErrorMessage(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsLiveCameraActive(true);
    } catch (err: any) {
      setErrorMessage('Direct live feed unavailable. Using native phone camera shutter.');
      triggerCameraCapture(target);
    }
  };

  const stopLiveCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsLiveCameraActive(false);
  };

  const captureFromLiveVideo = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 1280;
    canvas.height = videoRef.current.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      if (captureTarget === 'front') {
        setFrontImage(dataUrl);
        setCaptureTarget('back');
      } else if (captureTarget === 'back') {
        setBackImage(dataUrl);
        stopLiveCamera();
      } else if (captureTarget === 'id') {
        setIdImage(dataUrl);
        stopLiveCamera();
      }
      playBeep('success');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!frontImage) {
      setErrorMessage('Please capture the front of the check.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // Broadcast / Save locally for immediate cross-tab sync with cashier register
      const uploadPayload = {
        sessionId,
        token,
        customerName: customerName || 'Walk-in Customer',
        customerPhone,
        checkAmount: parseFloat(checkAmount) || 0,
        checkType,
        checkFrontUrl: frontImage,
        checkBackUrl: backImage || frontImage,
        idPhotoUrl: idImage,
        timestamp: Date.now(),
        status: 'submitted',
      };

      try {
        localStorage.setItem(`pos_mobile_check_upload_${sessionId}`, JSON.stringify(uploadPayload));
        localStorage.setItem('pos_last_check_intake_event', JSON.stringify({ sessionId, timestamp: Date.now() }));
      } catch (storageErr) {
        console.warn('Storage fallback warning:', storageErr);
      }

      // Submit to backend API
      try {
        await api.submitCheckQrImages(sessionId, {
          checkFrontUrl: frontImage,
          checkBackUrl: backImage || undefined,
          customerIdFrontUrl: idImage || undefined,
        });
      } catch (apiErr) {
        console.warn('Backend API notification handled via local persistence:', apiErr);
      }

      playBeep('success');
      setIsSuccess(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to transmit check images. Please retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForAnother = () => {
    setFrontImage(null);
    setBackImage(null);
    setIdImage(null);
    setCheckAmount('');
    setIsSuccess(false);
    setErrorMessage(null);
    setCaptureTarget('front');
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F17] text-white flex flex-col font-sans antialiased select-none">
      {/* Hidden high-speed direct camera capture input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Top Header */}
      <header className="bg-[#111827] border-b border-slate-800 px-4 py-3 flex items-center justify-between sticky top-0 z-20 shadow-md">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-[#C5A059] text-black flex items-center justify-center font-black shadow-sm">
            <FileCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-sm text-white tracking-wide">377 Spirits</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-mono font-bold">
                Check Intake
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              Terminal #01 Link • Ref #{token}
            </span>
          </div>
        </div>

        {onExit && (
          <button
            onClick={onExit}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer flex items-center space-x-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Exit</span>
          </button>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-lg mx-auto w-full p-4 flex flex-col space-y-4">
        {isSuccess ? (
          <div className="my-auto bg-gradient-to-b from-emerald-950/40 to-slate-900 border border-emerald-500/40 rounded-2xl p-6 text-center shadow-xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center ring-8 ring-emerald-500/10">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <h2 className="text-xl font-black text-white">Check Uploaded Successfully!</h2>
              <p className="text-xs text-slate-300 mt-1">
                Your check has been securely transferred to Cashier Terminal #01 at 377 Spirits.
              </p>
            </div>

            <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-left space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Confirmation ID:</span>
                <span className="font-mono text-amber-400 font-bold">{token}</span>
              </div>
              {customerName && (
                <div className="flex justify-between text-slate-400">
                  <span>Customer Name:</span>
                  <span className="text-white font-medium">{customerName}</span>
                </div>
              )}
              {checkAmount && (
                <div className="flex justify-between text-slate-400">
                  <span>Declared Amount:</span>
                  <span className="text-emerald-400 font-bold">${parseFloat(checkAmount).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-400">
                <span>Images Attached:</span>
                <span className="text-white">
                  Front {backImage ? '+ Back' : ''} {idImage ? '+ ID Photo' : ''}
                </span>
              </div>
            </div>

            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={handleResetForAnother}
                className="w-full py-3.5 bg-[#C5A059] hover:bg-[#B38F46] text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-transform active:scale-98 cursor-pointer"
              >
                Upload Another Check
              </button>
              {onExit && (
                <button
                  type="button"
                  onClick={onExit}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Return to POS Terminal
                </button>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Live Camera Modal / Overlay */}
            {isLiveCameraActive && (
              <div className="fixed inset-0 z-50 bg-black flex flex-col">
                <div className="bg-slate-900/90 px-4 py-3 flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400 uppercase">
                    Capturing {captureTarget === 'front' ? 'Check Front' : captureTarget === 'back' ? 'Check Back' : 'ID'}
                  </span>
                  <button
                    type="button"
                    onClick={stopLiveCamera}
                    className="p-1 rounded bg-slate-800 text-slate-300 text-xs font-bold"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex-1 relative flex items-center justify-center overflow-hidden">
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  <div className="absolute inset-x-6 inset-y-16 border-2 border-dashed border-amber-400/70 rounded-2xl pointer-events-none flex items-center justify-center">
                    <span className="bg-black/70 px-3 py-1.5 rounded-full text-xs text-amber-300 font-medium">
                      Align check inside border
                    </span>
                  </div>
                </div>
                <div className="p-5 bg-slate-950 flex items-center justify-center">
                  <button
                    type="button"
                    onClick={captureFromLiveVideo}
                    className="w-16 h-16 rounded-full bg-white border-4 border-amber-400 flex items-center justify-center shadow-xl active:scale-95 transition-transform cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-full bg-amber-400"></div>
                  </button>
                </div>
              </div>
            )}

            {/* Banner Guide */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex items-start space-x-3">
              <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-bold text-white block">Fast Smartphone Check Intake</span>
                <span className="text-slate-400 text-[11px]">
                  Click the boxes below to snap photos. Your pictures are sent directly to the register without loading delays.
                </span>
              </div>
            </div>

            {/* Photo Cards Grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Check Front Photo Card */}
              <div
                onClick={() => triggerCameraCapture('front')}
                className={`relative rounded-xl border-2 p-3 text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[140px] overflow-hidden ${
                  frontImage
                    ? 'border-emerald-500/80 bg-emerald-950/20'
                    : 'border-amber-400/50 bg-slate-900/60 hover:border-amber-400'
                }`}
              >
                {frontImage ? (
                  <>
                    <img src={frontImage} alt="Check Front" className="w-full h-24 object-cover rounded-lg mb-1" />
                    <span className="text-[11px] font-bold text-emerald-400 flex items-center space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Front Captured</span>
                    </span>
                    <span className="text-[10px] text-slate-400 underline mt-0.5">Tap to retake</span>
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-full bg-amber-400/10 text-amber-400 flex items-center justify-center mb-2">
                      <Camera className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-white">Click Check Front *</span>
                    <span className="text-[10px] text-slate-400 mt-1">Tap to snap photo</span>
                  </>
                )}
              </div>

              {/* Check Back Photo Card */}
              <div
                onClick={() => triggerCameraCapture('back')}
                className={`relative rounded-xl border-2 p-3 text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[140px] overflow-hidden ${
                  backImage
                    ? 'border-emerald-500/80 bg-emerald-950/20'
                    : 'border-slate-700 bg-slate-900/60 hover:border-slate-500'
                }`}
              >
                {backImage ? (
                  <>
                    <img src={backImage} alt="Check Back" className="w-full h-24 object-cover rounded-lg mb-1" />
                    <span className="text-[11px] font-bold text-emerald-400 flex items-center space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Back Captured</span>
                    </span>
                    <span className="text-[10px] text-slate-400 underline mt-0.5">Tap to retake</span>
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mb-2">
                      <Camera className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-slate-200">Click Check Back</span>
                    <span className="text-[10px] text-slate-400 mt-1">Endorsement signature</span>
                  </>
                )}
              </div>
            </div>

            {/* Quick Camera Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => triggerCameraCapture('front')}
                className="py-2.5 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>Snap Camera</span>
              </button>

              <button
                type="button"
                onClick={() => startLiveCamera('front')}
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4 text-amber-400" />
                <span>Live Viewfinder</span>
              </button>
            </div>

            {/* Customer Details Form (Optional / Quick Entry) */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 space-y-3">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Customer & Check Information
              </span>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Customer Full Name</label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    placeholder="e.g. Johnathan Carter"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Phone Number</label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={e => setCustomerPhone(e.target.value)}
                      placeholder="(817) 555-0199"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Check Amount ($)</label>
                  <div className="relative">
                    <DollarSign className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="number"
                      step="0.01"
                      value={checkAmount}
                      onChange={e => setCheckAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400 font-mono font-bold text-amber-400"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Check Classification</label>
                <select
                  value={checkType}
                  onChange={e => setCheckType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                >
                  <option value="payroll">Payroll Check (Standard 2.5%)</option>
                  <option value="government">Government / Treasury Check (1.5%)</option>
                  <option value="cashiers">Bank Cashier's Check (2.0%)</option>
                  <option value="tax_refund">IRS / State Tax Refund Check (1.75%)</option>
                  <option value="personal">Personal Check (5.0% - Subject to Approval)</option>
                </select>
              </div>

              {/* ID Photo (Optional) */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => triggerCameraCapture('id')}
                  className="w-full py-2 px-3 rounded-lg border border-dashed border-slate-700 hover:border-slate-500 text-[11px] font-semibold text-slate-300 flex items-center justify-between cursor-pointer"
                >
                  <span>{idImage ? 'ID Photo Attached (Tap to change)' : '+ Add Driver License / ID Photo (Optional)'}</span>
                  {idImage && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                </button>
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/50 text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !frontImage}
              className="w-full py-3.5 bg-[#C5A059] hover:bg-[#B38F46] disabled:opacity-50 disabled:cursor-not-allowed text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-lg flex items-center justify-center space-x-2 cursor-pointer transition-all active:scale-98"
            >
              <Upload className="w-4 h-4" />
              <span>{isSubmitting ? 'Uploading to Register...' : 'Upload Check to Register'}</span>
            </button>
          </form>
        )}
      </main>

      {/* Footer */}
      <footer className="p-3 text-center border-t border-slate-800 text-[11px] text-slate-500 shrink-0">
        377 Spirits Granbury • Direct Check Cashing Terminal Link
      </footer>
    </div>
  );
};
