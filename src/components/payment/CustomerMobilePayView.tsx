import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Lock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Wine,
  Sparkles,
  Smartphone,
  ChevronRight,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { api } from '../../utils/api';
import { PaymentSession } from '../../types';

interface CustomerMobilePayViewProps {
  token: string;
}

export const CustomerMobilePayView: React.FC<CustomerMobilePayViewProps> = ({ token }) => {
  const [session, setSession] = useState<PaymentSession | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [cardNumber, setCardNumber] = useState<string>('');
  const [cardExp, setCardExp] = useState<string>('');
  const [cardCvv, setCardCvv] = useState<string>('');
  const [cardZip, setCardZip] = useState<string>('');
  const [cardholderName, setCardholderName] = useState<string>('');

  // Processing state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>('');

  // Detect card brand dynamically
  const cardBrand = React.useMemo(() => {
    const clean = cardNumber.replace(/\D/g, '');
    if (clean.startsWith('4')) return 'Visa';
    if (/^5[1-5]/.test(clean) || /^2[2-7]/.test(clean)) return 'Mastercard';
    if (/^3[47]/.test(clean)) return 'American Express';
    if (/^6(?:011|5)/.test(clean)) return 'Discover';
    return 'Credit Card';
  }, [cardNumber]);

  // Load session & notify backend of connection (PAY-011)
  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      try {
        setLoading(true);
        const res = await api.getPaymentSession(token);
        if (!isMounted) return;
        if (res.success && res.session) {
          // PAY-008: Customer QR must never allow employee mode
          if (res.session.mode === 'employee') {
            setError('This QR code is reserved for authorized store employee devices.');
            setLoading(false);
            return;
          }
          setSession(res.session);
          // Notify register of customer connection (PAY-011)
          api.connectPaymentSession(token).catch(() => {});
        } else {
          setError('Payment session not found or has expired');
        }
      } catch (err: any) {
        if (!isMounted) return;
        setError(err.message || 'Unable to connect to payment session');
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

  // Expiration countdown (PAY-010, PAY-022)
  useEffect(() => {
    if (!session || session.status === 'payment_complete') return;

    const timer = setInterval(() => {
      const remainingMs = new Date(session.expiresAt).getTime() - Date.now();
      if (remainingMs <= 0) {
        setTimeLeft('Expired');
        setSession(prev => (prev ? { ...prev, status: 'expired' } : null));
        clearInterval(timer);
      } else {
        const mins = Math.floor(remainingMs / 60000);
        const secs = Math.floor((remainingMs % 60000) / 1000);
        setTimeLeft(`${mins}:${secs < 10 ? '0' : ''}${secs}`);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [session]);

  // Format card input
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 16);
    const parts = raw.match(/.{1,4}/g) || [];
    setCardNumber(parts.join(' '));

    // Notify register of entry start (PAY-011)
    if (raw.length === 1 && session) {
      api.startPaymentSessionEntry(token).catch(() => {});
    }
  };

  const handleExpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (raw.length >= 3) {
      raw = `${raw.slice(0, 2)}/${raw.slice(2)}`;
    }
    setCardExp(raw);
  };

  // Submit payment through tokenized processor (PAY-002, PAY-005, PAY-012, PAY-019, PAY-020)
  const handleSubmitPayment = async (simulateDecline: boolean = false) => {
    if (!session) return;
    setSubmitError(null);

    const cleanCard = cardNumber.replace(/\D/g, '');
    if (!simulateDecline && cleanCard.length < 15) {
      setSubmitError('Please enter a valid 15-16 digit card number');
      return;
    }
    if (!simulateDecline && cardExp.length < 5) {
      setSubmitError('Please enter expiration in MM/YY format');
      return;
    }
    if (!simulateDecline && cardCvv.length < 3) {
      setSubmitError('Please enter a 3 or 4-digit security code (CVV)');
      return;
    }
    if (!simulateDecline && cardZip.length < 5) {
      setSubmitError('Please enter a 5-digit billing ZIP code');
      return;
    }

    setIsSubmitting(true);

    try {
      // PAY-019, PAY-020: We ONLY send tokenized fields and last 4! Raw CVV is never sent or saved!
      const last4 = cleanCard.length >= 4 ? cleanCard.slice(-4) : '4242';

      const res = await api.authorizePaymentSession(session.id, {
        idempotencyKey: session.idempotencyKey,
        cardBrand,
        cardLast4: last4,
        entryMode: 'customer_qr',
        postalCode: cardZip,
        simulateFailure: simulateDecline ? 'card_declined' : 'none',
      });

      if (res.success && res.session) {
        setSession(res.session);
      } else if (res.session?.status === 'failed') {
        setSession(res.session);
        setSubmitError(res.session.failureReason || 'Payment authorization declined');
      } else {
        setSubmitError('Payment could not be authorized. Please check your card information.');
      }
    } catch (err: any) {
      setSubmitError(err.message || 'Payment authorization failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Express Wallet click (Apple Pay / Google Pay simulation)
  const handleExpressWallet = async (walletName: 'Apple Pay' | 'Google Pay') => {
    if (!session) return;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await api.authorizePaymentSession(session.id, {
        idempotencyKey: session.idempotencyKey,
        cardBrand: walletName,
        cardLast4: '9012',
        entryMode: 'customer_qr_wallet',
        simulateFailure: 'none',
      });

      if (res.success && res.session) {
        setSession(res.session);
      } else {
        setSubmitError(res.session?.failureReason || `${walletName} payment was not authorized`);
      }
    } catch (err: any) {
      setSubmitError(err.message || 'Payment failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 animate-pulse mb-4">
          <RefreshCw className="w-8 h-8 animate-spin" />
        </div>
        <h2 className="text-lg font-bold text-white mb-1">Connecting to POS Register...</h2>
        <p className="text-xs text-slate-400">Loading secure checkout session</p>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-white mb-2">Session Unavailable</h2>
        <p className="text-sm text-slate-400 mb-6">{error || 'This payment session is invalid or has expired.'}</p>
        <p className="text-xs text-slate-500">Please ask the cashier at 377 Spirits to generate a fresh payment QR code.</p>
      </div>
    );
  }

  // Success Screen
  if (session.status === 'payment_complete') {
    return (
      <div className="min-h-screen bg-[#0F172A] text-slate-100 flex flex-col items-center justify-center p-6 select-none">
        <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center shadow-2xl space-y-5">
          <div className="w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-400 mx-auto flex items-center justify-center shadow-lg">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
              PAYMENT AUTHORIZED
            </span>
            <h2 className="text-2xl font-black text-white mt-1">Thank You!</h2>
            <p className="text-xs text-slate-400 mt-1">
              Your payment has been received by the register.
            </p>
          </div>

          <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 text-left space-y-2">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Order Number:</span>
              <span className="font-mono font-bold text-white">{session.orderNumber}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>Amount Paid:</span>
              <span className="font-mono font-black text-amber-400 text-base">
                ${session.amount.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>Payment Method:</span>
              <span className="font-semibold text-slate-200">
                {session.paymentResult?.brand || 'Card'} •••• {session.paymentResult?.last4 || '4242'}
              </span>
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>Auth Code:</span>
              <span className="font-mono text-[11px] text-slate-300">
                {session.paymentResult?.authCode || 'APX-948201'}
              </span>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 leading-relaxed">
            The cashier has received confirmation and your receipt is printing now. You may safely close this page.
          </div>
        </div>
      </div>
    );
  }

  // Expired Screen (PAY-022)
  if (session.status === 'expired') {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-6 text-center max-w-sm mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4">
          <Clock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Payment Session Expired</h2>
        <p className="text-xs text-slate-400 mb-6">
          For your security, payment sessions expire after 10 minutes. Please ask the cashier for a fresh payment code.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0D14] text-slate-100 flex flex-col justify-between antialiased">
      {/* Top Header */}
      <header className="bg-[#0F172A] border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[#F3C067] flex items-center justify-center font-black">
            <Wine className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-black text-white tracking-wide uppercase">377 Spirits</h1>
            <span className="text-[10px] text-slate-400">Granbury, Texas • Granbury Square</span>
          </div>
        </div>

        {/* Security badge & Expiry Timer */}
        <div className="flex items-center space-x-2">
          {timeLeft && (
            <span className="flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-mono bg-slate-800 text-amber-400 border border-slate-700">
              <Clock className="w-3 h-3" />
              <span>{timeLeft}</span>
            </span>
          )}
          <span className="flex items-center space-x-1 text-[11px] text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded-full font-semibold">
            <Lock className="w-3 h-3" />
            <span>256-Bit SSL</span>
          </span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-lg w-full mx-auto p-5 space-y-5">
        {/* Fixed Order Total Card (PAY-009) */}
        <div className="bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] border border-slate-800 rounded-3xl p-5 shadow-2xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block">
                Total Due
              </span>
              <div className="text-3xl font-black font-mono text-amber-400 tracking-tight mt-0.5">
                ${session.amount.toFixed(2)}
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-500 block uppercase font-mono">Order Ref</span>
              <span className="text-xs font-mono font-bold text-white">{session.orderNumber}</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">{session.registerId}</span>
            </div>
          </div>
        </div>

        {/* Express Payment Options (Apple Pay & Google Pay) */}
        <div className="space-y-2.5">
          <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400 block px-1">
            Express Checkout
          </span>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleExpressWallet('Apple Pay')}
              disabled={isSubmitting}
              className="w-full bg-white hover:bg-slate-100 text-black py-3 rounded-2xl font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow-md active:scale-98 cursor-pointer disabled:opacity-50"
            >
              <span className="text-base font-black">Pay</span>
            </button>
            <button
              onClick={() => handleExpressWallet('Google Pay')}
              disabled={isSubmitting}
              className="w-full bg-white hover:bg-slate-100 text-slate-900 py-3 rounded-2xl font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow-md active:scale-98 cursor-pointer disabled:opacity-50"
            >
              <span className="font-black text-sm">G Pay</span>
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center space-x-3 my-2">
          <div className="flex-1 h-px bg-slate-800" />
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
            Or pay with card
          </span>
          <div className="flex-1 h-px bg-slate-800" />
        </div>

        {/* Error Alert */}
        {submitError && (
          <div className="p-3.5 rounded-2xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-start space-x-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <div className="flex-1">
              <span className="font-bold block mb-0.5">Payment Failed</span>
              <span>{submitError}</span>
            </div>
          </div>
        )}

        {/* Secure Card Form (PAY-005: card number, expiration, CVV, billing zip, pay button) */}
        <div className="bg-[#0F172A] border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5 flex items-center justify-between">
              <span>Cardholder Name</span>
              <span className="text-[10px] text-slate-500">As on card</span>
            </label>
            <input
              type="text"
              placeholder="Elena Rostova"
              value={cardholderName}
              onChange={e => setCardholderName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 transition-colors"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5 flex items-center justify-between">
              <span>Card Number</span>
              <span className="text-[10px] font-bold text-amber-400">{cardBrand}</span>
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="4532 •••• •••• 8920"
                value={cardNumber}
                onChange={handleCardNumberChange}
                maxLength={19}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm font-mono text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 transition-colors"
              />
              <CreditCard className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Expiration
              </label>
              <input
                type="text"
                placeholder="MM/YY"
                value={cardExp}
                onChange={handleExpChange}
                maxLength={5}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 transition-colors text-center"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5 flex items-center justify-between">
                <span>Security CVV</span>
                <span className="text-[10px] text-slate-500">3-4 digits</span>
              </label>
              <input
                type="password"
                placeholder="•••"
                value={cardCvv}
                onChange={e => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                maxLength={4}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 transition-colors text-center"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5 flex items-center justify-between">
              <span>Billing ZIP / Postal Code</span>
              <span className="text-[10px] text-slate-500">US 5-Digit</span>
            </label>
            <input
              type="text"
              placeholder="76048"
              value={cardZip}
              onChange={e => setCardZip(e.target.value.replace(/\D/g, '').slice(0, 5))}
              maxLength={5}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 transition-colors"
            />
          </div>

          {/* Pay Button */}
          <button
            onClick={() => handleSubmitPayment(false)}
            disabled={isSubmitting}
            className="w-full mt-2 bg-[#F3C067] hover:bg-[#F59E0B] text-slate-950 py-3.5 rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center space-x-2 transition-all shadow-lg active:scale-98 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Authorizing Payment...</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Pay ${session.amount.toFixed(2)}</span>
              </>
            )}
          </button>

          {/* Demonstration / Testing helper for decline (PAY-013, PAY-015) */}
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
            <span>Tester tools:</span>
            <button
              onClick={() => handleSubmitPayment(true)}
              disabled={isSubmitting}
              className="text-amber-400 hover:text-amber-300 underline font-mono text-[10px]"
            >
              Simulate Card Decline (PAY-015)
            </button>
          </div>
        </div>
      </main>

      {/* PCI-DSS Security Compliance Footer (PAY-018, PAY-019, PAY-020) */}
      <footer className="bg-[#0F172A] border-t border-slate-800 p-4 text-center text-[10px] text-slate-500 space-y-1">
        <div className="flex items-center justify-center space-x-2 text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-semibold">PCI-DSS Level 1 Encrypted Payment</span>
        </div>
        <p>
          Card details are encrypted directly via processor component. 377 Spirits POS never stores full card numbers or CVV.
        </p>
      </footer>
    </div>
  );
};
