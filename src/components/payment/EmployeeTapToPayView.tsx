import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Wifi,
  Radio,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Wine,
  RefreshCw,
  Sparkles,
  CreditCard,
  Lock,
} from 'lucide-react';
import { api } from '../../utils/api';
import { PaymentSession } from '../../types';
import { playBeep } from '../../utils/audio';

interface EmployeeTapToPayViewProps {
  token: string;
}

export const EmployeeTapToPayView: React.FC<EmployeeTapToPayViewProps> = ({ token }) => {
  const [session, setSession] = useState<PaymentSession | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthorizing, setIsAuthorizing] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [tapStatus, setTapStatus] = useState<'waiting' | 'reading' | 'authorized' | 'declined'>('waiting');

  // Load session & notify backend of connection (PAY-011)
  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      try {
        setLoading(true);
        const res = await api.getPaymentSession(token);
        if (!isMounted) return;
        if (res.success && res.session) {
          setSession(res.session);
          api.connectPaymentSession(token).catch(() => {});
        } else {
          setError('Payment session not found or has expired');
        }
      } catch (err: any) {
        if (!isMounted) return;
        setError(err.message || 'Unable to connect to employee payment session');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (token) {
      initSession();
    } else {
      setError('Missing payment token');
      setLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [token]);

  // Simulate NFC Tap payment
  const handleNfcTap = async (brand: 'Visa Contactless' | 'Mastercard Tap' | 'Apple Pay' | 'Google Wallet', simulateDecline: boolean = false) => {
    if (!session || isAuthorizing) return;
    setIsAuthorizing(true);
    setAuthError(null);
    setTapStatus('reading');
    playBeep();

    // Small delay to simulate contactless NFC read
    await new Promise(r => setTimeout(r, 900));

    try {
      const res = await api.authorizePaymentSession(session.id, {
        idempotencyKey: session.idempotencyKey,
        cardBrand: brand,
        cardLast4: Math.floor(1000 + Math.random() * 9000).toString(),
        entryMode: 'tap_to_pay_phone_nfc',
        simulateFailure: simulateDecline ? 'card_declined' : 'none',
      });

      if (res.success && res.session) {
        setSession(res.session);
        setTapStatus('authorized');
        playBeep();
      } else if (res.session?.status === 'failed') {
        setSession(res.session);
        setTapStatus('declined');
        setAuthError(res.session.failureReason || 'Card declined by issuer');
      }
    } catch (err: any) {
      setTapStatus('declined');
      setAuthError(err.message || 'NFC authorization failed');
    } finally {
      setIsAuthorizing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-6 text-center">
        <RefreshCw className="w-8 h-8 animate-spin text-amber-400 mb-3" />
        <h2 className="text-base font-bold text-white">Initializing Store Mobile Terminal...</h2>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
        <AlertCircle className="w-10 h-10 text-rose-400 mb-3" />
        <h2 className="text-lg font-bold text-white mb-2">Terminal Session Error</h2>
        <p className="text-xs text-slate-400">{error || 'Session not found or already closed.'}</p>
      </div>
    );
  }

  if (session.status === 'payment_complete') {
    return (
      <div className="min-h-screen bg-[#0F172A] text-slate-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-400 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
              TAP TO PAY COMPLETE
            </span>
            <h2 className="text-2xl font-black text-white mt-1">Payment Approved</h2>
            <div className="text-3xl font-black font-mono text-amber-400 mt-2">
              ${session.amount.toFixed(2)}
            </div>
          </div>
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-left text-xs space-y-1.5">
            <div className="flex justify-between text-slate-400">
              <span>Order Ref:</span>
              <span className="font-mono text-white font-bold">{session.orderNumber}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Method:</span>
              <span className="text-slate-200 font-semibold">
                {session.paymentResult?.brand} •••• {session.paymentResult?.last4}
              </span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Auth Code:</span>
              <span className="font-mono text-slate-300">{session.paymentResult?.authCode}</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400">
            Register {session.registerId} has automatically completed the transaction.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0D14] text-slate-100 flex flex-col justify-between antialiased">
      {/* Top Header */}
      <header className="bg-[#0F172A] border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[#F3C067] flex items-center justify-center">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xs font-black text-white uppercase tracking-wider">
              Store Phone Terminal #2
            </h1>
            <span className="text-[10px] text-emerald-400 flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Cellular/Wi-Fi Active (PAY-026)</span>
            </span>
          </div>
        </div>

        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
          Tap to Pay
        </span>
      </header>

      {/* Main NFC Area */}
      <main className="flex-1 max-w-md w-full mx-auto p-5 flex flex-col justify-center items-center text-center space-y-6">
        {/* Order Amount */}
        <div className="space-y-1">
          <span className="text-xs uppercase font-bold tracking-wider text-slate-400">
            Charge Customer (Order {session.orderNumber})
          </span>
          <div className="text-5xl font-black font-mono text-amber-400 tracking-tight">
            ${session.amount.toFixed(2)}
          </div>
        </div>

        {/* Interactive NFC Tap Zone */}
        <div className="relative w-64 h-64 rounded-full border-4 border-dashed border-amber-500/40 flex flex-col items-center justify-center p-6 bg-slate-900/60 shadow-2xl">
          <div className="absolute inset-0 rounded-full bg-amber-500/5 animate-ping opacity-30 pointer-events-none" />

          <Radio className="w-14 h-14 text-amber-400 mb-2 animate-pulse" />
          <span className="text-xs font-black uppercase tracking-wider text-white">
            Hold Card or Phone Here
          </span>
          <span className="text-[10px] text-slate-400 mt-1 max-w-[150px]">
            Customer contactless card, Apple Pay, or Google Wallet
          </span>
        </div>

        {authError && (
          <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{authError}</span>
          </div>
        )}

        {/* Tap simulation buttons for employee/tester */}
        <div className="w-full space-y-2">
          <span className="text-[11px] font-semibold text-slate-400 block uppercase">
            Simulate Customer Tap:
          </span>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => handleNfcTap('Visa Contactless')}
              disabled={isAuthorizing}
              className="py-3 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center space-x-2 border border-slate-700 cursor-pointer disabled:opacity-50"
            >
              <CreditCard className="w-4 h-4 text-amber-400" />
              <span>Tap Visa Card</span>
            </button>
            <button
              onClick={() => handleNfcTap('Apple Pay')}
              disabled={isAuthorizing}
              className="py-3 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center space-x-2 border border-slate-700 cursor-pointer disabled:opacity-50"
            >
              <span className="text-sm font-black">Pay Tap</span>
            </button>
          </div>

          <div className="pt-1">
            <button
              onClick={() => handleNfcTap('Visa Contactless', true)}
              disabled={isAuthorizing}
              className="text-[10px] text-slate-500 hover:text-amber-400 underline font-mono"
            >
              Simulate Declined NFC Tap (PAY-015)
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#0F172A] border-t border-slate-800 p-4 text-center text-[10px] text-slate-500 flex items-center justify-between px-6">
        <span className="font-mono">Tied to {session.registerId}</span>
        <span className="flex items-center space-x-1 text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Processor Tokenized</span>
        </span>
      </footer>
    </div>
  );
};
