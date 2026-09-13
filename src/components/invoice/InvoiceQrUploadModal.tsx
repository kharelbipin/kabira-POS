import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { InvoiceUploadSession, ScannedInvoice } from '../../types';
import { api } from '../../utils/api';
import { playBeep } from '../../utils/audio';
import {
  X,
  QrCode,
  Smartphone,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  ExternalLink,
  Ban,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  Radio,
  FileCheck2,
} from 'lucide-react';

interface InvoiceQrUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvoiceExtracted: (invoice: ScannedInvoice) => void;
  onOpenMobileViewSimulator: (sessionId: string, token: string) => void;
}

export const InvoiceQrUploadModal: React.FC<InvoiceQrUploadModalProps> = ({
  isOpen,
  onClose,
  onInvoiceExtracted,
  onOpenMobileViewSimulator,
}) => {
  const [session, setSession] = useState<InvoiceUploadSession | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(600); // 10 minutes
  const [expiryMinutes, setExpiryMinutes] = useState<number>(10);
  const pollTimerRef = useRef<any>(null);
  const countdownTimerRef = useRef<any>(null);

  // Initialize or generate new session (INV-01)
  const initSession = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const newSession = await api.createUploadSession(expiryMinutes);
      setSession(newSession);

      // Generate mobile URL with session ID and security token (INV-02)
      const mobileUrl = `${window.location.origin}/?mobileUpload=${encodeURIComponent(newSession.id)}&token=${encodeURIComponent(newSession.token)}`;
      
      const qrCodeUrl = await QRCode.toDataURL(mobileUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });

      setQrDataUrl(qrCodeUrl);

      // Calculate time left in seconds
      const diffMs = new Date(newSession.expiresAt).getTime() - Date.now();
      setTimeLeftSeconds(Math.max(0, Math.floor(diffMs / 1000)));
      playBeep('success');
    } catch (err: any) {
      console.error('Failed to create upload session', err);
      setErrorMsg(err.message || 'Failed to generate QR upload session');
      playBeep('error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      initSession();
    } else {
      clearTimers();
    }
    return () => clearTimers();
  }, [isOpen]);

  const clearTimers = () => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
  };

  // Countdown timer for session expiration (INV-01, INV-18)
  useEffect(() => {
    if (!session || session.status === 'expired' || session.status === 'cancelled' || session.status === 'completed') {
      return;
    }

    countdownTimerRef.current = setInterval(() => {
      const diffMs = new Date(session.expiresAt).getTime() - Date.now();
      const rem = Math.max(0, Math.floor(diffMs / 1000));
      setTimeLeftSeconds(rem);
      if (rem <= 0) {
        clearInterval(countdownTimerRef.current);
        setSession(prev => prev ? { ...prev, status: 'expired', statusMessage: 'Session expired.' } : null);
      }
    }, 1000);

    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [session?.expiresAt, session?.status]);

  // Polling backend for status updates from phone (INV-17)
  useEffect(() => {
    if (!session || ['completed', 'expired', 'cancelled'].includes(session.status)) {
      return;
    }

    pollTimerRef.current = setInterval(async () => {
      try {
        const latest = await api.getUploadSession(session.id);
        setSession(prev => {
          if (!prev) return latest;
          // Play sound when status changes
          if (prev.status !== latest.status) {
            if (latest.status === 'phone_connected') playBeep('beep');
            if (latest.status === 'ready_for_review') playBeep('success');
            if (latest.status === 'failed') playBeep('error');
          }
          return latest;
        });

        // If ready for review, invoice extraction is finished! (INV-17)
        if (latest.status === 'ready_for_review' && latest.extractedInvoice) {
          clearInterval(pollTimerRef.current);
        }
      } catch (err) {
        console.error('Session poll error', err);
      }
    }, 1500);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [session?.id, session?.status]);

  // Manual session cancel / expire (INV-18)
  const handleCancelSession = async () => {
    if (!session) return;
    try {
      const res = await api.cancelUploadSession(session.id);
      setSession(res.session);
    } catch (err) {
      console.error(err);
    }
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
      <div className="bg-[#141414] border border-[#262626] rounded-xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#262626] bg-[#1A1A1A]">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-[#C5A059]/20 text-[#C5A059] flex items-center justify-center border border-[#C5A059]/30">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span>Scan QR with Phone Camera</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#C5A059]/10 text-[#C5A059] border border-[#C5A059]/30 font-medium">
                  INV-01 / INV-02
                </span>
              </h2>
              <p className="text-xs text-[#888888]">
                Open the mobile invoice capture camera without manual URLs or passwords
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#888888] hover:text-white hover:bg-[#262626] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-[#C5A059] animate-spin" />
              <p className="text-sm text-[#AAAAAA]">Generating secure receiving session & QR code...</p>
            </div>
          ) : errorMsg ? (
            <div className="p-4 rounded-lg bg-red-950/40 border border-red-800/60 text-red-300 text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Unable to generate QR upload session</p>
                <p className="text-xs text-red-400/80 mt-1">{errorMsg}</p>
                <button
                  onClick={initSession}
                  className="mt-3 px-3 py-1.5 rounded bg-red-900/60 hover:bg-red-800 text-xs font-semibold text-white transition-colors cursor-pointer"
                >
                  Retry Generation
                </button>
              </div>
            </div>
          ) : session ? (
            <>
              {/* Status Header Pill (INV-17) */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-[#1F1F1F] border border-[#2D2D2D]">
                <div className="flex items-center space-x-2.5">
                  {session.status === 'waiting_for_scan' && (
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                    </span>
                  )}
                  {session.status === 'phone_connected' && (
                    <Radio className="w-4 h-4 text-blue-400 animate-pulse" />
                  )}
                  {session.status === 'uploading' && (
                    <Loader2 className="w-4 h-4 text-sky-400 animate-spin" />
                  )}
                  {session.status === 'processing' && (
                    <Sparkles className="w-4 h-4 text-[#C5A059] animate-spin" />
                  )}
                  {session.status === 'ready_for_review' && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  )}
                  {session.status === 'expired' && (
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                  )}
                  {session.status === 'cancelled' && (
                    <Ban className="w-4 h-4 text-red-500" />
                  )}

                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-white">
                      Status: {session.status.replace(/_/g, ' ')}
                    </span>
                    <p className="text-[11px] text-[#AAAAAA]">{session.statusMessage}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 text-xs text-[#888888] bg-[#141414] px-2.5 py-1 rounded border border-[#2D2D2D]">
                  <Clock className="w-3.5 h-3.5 text-[#C5A059]" />
                  <span className={timeLeftSeconds < 120 ? 'text-red-400 font-bold' : 'text-[#CCCCCC]'}>
                    {timeLeftSeconds > 0 ? formatSeconds(timeLeftSeconds) : 'Expired'}
                  </span>
                </div>
              </div>

              {/* Ready for Review Notification Button (INV-17) */}
              {session.status === 'ready_for_review' && session.extractedInvoice && (
                <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in duration-200">
                  <div className="flex items-center space-x-3 text-left">
                    <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                      <FileCheck2 className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-emerald-300 uppercase tracking-wide">
                        Invoice Ready on POS!
                      </p>
                      <p className="text-[11px] text-emerald-200/80">
                        {session.extractedInvoice.vendorName} • {session.extractedInvoice.lineItems.length} lines • ${session.extractedInvoice.totalAmount.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (session.extractedInvoice) {
                        onInvoiceExtracted(session.extractedInvoice);
                        onClose();
                      }
                    }}
                    className="w-full sm:w-auto px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg transition-colors cursor-pointer shrink-0"
                  >
                    Open Review Screen
                  </button>
                </div>
              )}

              {/* QR Code & Barcode Card (INV-01, INV-02) */}
              {session.status !== 'ready_for_review' && (
                <div className="flex flex-col items-center justify-center p-6 bg-[#0E0E0E] rounded-xl border border-[#262626] space-y-4 text-center">
                  <div className="p-3 bg-white rounded-xl shadow-lg border border-white/20">
                    {qrDataUrl && (
                      <img
                        src={qrDataUrl}
                        alt="Mobile Upload QR Code"
                        className="w-52 h-52 object-contain"
                      />
                    )}
                  </div>

                  {/* Barcode Text Representation */}
                  <div className="w-full max-w-xs space-y-1">
                    <div className="h-8 bg-[#1A1A1A] border border-[#333333] rounded px-3 flex items-center justify-between text-xs font-mono text-[#C5A059]">
                      <span className="text-[#666666]">SESSION:</span>
                      <span className="font-bold tracking-widest">{session.id}</span>
                    </div>
                    <div className="flex items-center justify-center text-[10px] text-[#666666] font-mono">
                      STORE: {session.storeName}
                    </div>
                  </div>

                  {/* Step Instructions */}
                  <div className="grid grid-cols-3 gap-2 w-full text-center text-xs text-[#888888] pt-2 border-t border-[#1F1F1F]">
                    <div className="p-2 rounded bg-[#161616] border border-[#222222]">
                      <span className="font-bold text-white block mb-0.5">1. Open Camera</span>
                      Scan QR with default phone camera app
                    </div>
                    <div className="p-2 rounded bg-[#161616] border border-[#222222]">
                      <span className="font-bold text-white block mb-0.5">2. Snap Pages</span>
                      Take photo of vendor paper receipt
                    </div>
                    <div className="p-2 rounded bg-[#161616] border border-[#222222]">
                      <span className="font-bold text-white block mb-0.5">3. Live Sync</span>
                      Registers in POS inventory automatically
                    </div>
                  </div>
                </div>
              )}

              {/* Direct Desktop Browser Simulator Link (INV-02) */}
              <div className="p-3 rounded-lg bg-[#181818] border border-[#2A2A2A] flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2 text-[#AAAAAA]">
                  <Smartphone className="w-4 h-4 text-[#C5A059]" />
                  <span>No phone handy right now?</span>
                </div>
                <button
                  onClick={() => {
                    onOpenMobileViewSimulator(session.id, session.token);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#262626] hover:bg-[#333333] text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-[#C5A059]" />
                  <span>Open Phone Capture UI in Browser</span>
                </button>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-[#262626] bg-[#1A1A1A] flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            {session && session.status !== 'expired' && session.status !== 'cancelled' && (
              <button
                onClick={handleCancelSession}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-950/40 transition-colors flex items-center space-x-1 cursor-pointer"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>Expire Session (INV-18)</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={initSession}
              disabled={isLoading}
              className="px-3 py-1.5 rounded-lg bg-[#262626] hover:bg-[#333333] text-xs font-semibold text-[#CCCCCC] transition-colors flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Generate New Code</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-[#333333] hover:bg-[#444444] text-xs font-semibold text-white transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
