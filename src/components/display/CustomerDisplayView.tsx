import React, { useState, useEffect } from 'react';
import {
  Wine,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  HeartHandshake,
  Maximize2,
  Minimize2,
  QrCode,
  Smartphone,
  CreditCard,
  Lock,
} from 'lucide-react';
import { CustomerDisplayState } from '../../types';

export const CustomerDisplayView: React.FC = () => {
  const [displayState, setDisplayState] = useState<CustomerDisplayState>(() => {
    try {
      const saved = localStorage.getItem('pos_customer_display_state');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      screenState: 'welcome',
      storeName: '377 Spirits',
      tagline: 'Fine Liquors, Craft Spirits, Wine & Beer • Granbury, TX',
      items: [],
      subtotal: 0,
      discountTotal: 0,
      taxTotal: 0,
      grandTotal: 0,
      welcomeMessage: 'Welcome to 377 Spirits! Please present valid ID if purchasing alcohol.',
      promoBanner: 'Specials: Texas Whiskey & Garrison Brothers Bourbon 10% Off with Club Points!',
    };
  });

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [promoIndex, setPromoIndex] = useState(0);

  const PROMO_SLIDES = [
    {
      title: 'Join the 377 Spirits Club',
      desc: 'Earn 1 point per $1 spent. Get $5 off every 100 points + Birthday Rewards!',
      badge: 'Free Membership',
    },
    {
      title: 'Texas Craft Bourbon & Spirits Spotlight',
      desc: 'Featured: Garrison Brothers, Balcones Texas Single Malt, and Tito\'s Handmade Vodka',
      badge: 'Texas Proud',
    },
    {
      title: 'Craft Beer Six-Packs on Special',
      desc: 'Revolver Blood & Honey, Shiner Bock, and Karbach Love Street in cold cooler aisle',
      badge: 'Cold Cooler',
    },
  ];

  useEffect(() => {
    // BroadcastChannel synchronization
    let channel: BroadcastChannel | null = null;
    try {
      if ('BroadcastChannel' in window) {
        channel = new BroadcastChannel('pos_customer_display_channel');
        channel.onmessage = (event) => {
          if (event.data) {
            setDisplayState(event.data);
          }
        };
      }
    } catch (e) {}

    // Storage event synchronization for multi-window / cross-tab updates
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'pos_customer_display_state' && e.newValue) {
        try {
          setDisplayState(JSON.parse(e.newValue));
        } catch (err) {}
      }
    };

    window.addEventListener('storage', handleStorage);

    // Promo rotation timer every 6 seconds when on welcome screen
    const promoTimer = setInterval(() => {
      setPromoIndex(prev => (prev + 1) % PROMO_SLIDES.length);
    }, 6000);

    return () => {
      channel?.close();
      window.removeEventListener('storage', handleStorage);
      clearInterval(promoTimer);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const hasItems = displayState.items && displayState.items.length > 0;
  const currentPromo = PROMO_SLIDES[promoIndex];

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#0A0D14] text-slate-100 flex flex-col font-sans select-none antialiased">
      {/* Top Store Banner */}
      <header className="bg-[#0F172A] border-b border-slate-800 px-8 py-5 flex items-center justify-between shadow-xl">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#C5A059] to-[#9B7A38] p-0.5 flex items-center justify-center shadow-lg shadow-amber-900/30">
            <div className="w-full h-full bg-[#0A0A0A] rounded-[14px] flex items-center justify-center">
              <Wine className="w-7 h-7 text-[#F3C067]" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-black tracking-wider text-white uppercase">
                {displayState.storeName}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Granbury, TX • Reg #01
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium tracking-wide">
              {displayState.tagline}
            </p>
          </div>
        </div>

        {/* Right Header Status & Fullscreen toggle */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-emerald-400 font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Customer Display Synced</span>
          </div>
          <button
            onClick={toggleFullscreen}
            title="Toggle Fullscreen for 2nd Monitor"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 overflow-hidden p-8 flex gap-8">
        {/* Left Column: Cart items, Welcome Hero, or Payment Mirror */}
        <div className="flex-1 flex flex-col bg-[#0F172A]/90 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
          {displayState.screenState === 'customer_qr' ? (
            /* PAY-004: Customer Phone QR Payment Display */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
                <QrCode className="w-8 h-8" />
              </div>

              <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 mb-2">
                Private Phone Payment
              </span>
              <h2 className="text-3xl font-black text-white uppercase tracking-wide mb-2">
                Scan with Your Phone to Pay
              </h2>
              <p className="text-sm text-slate-300 max-w-md mb-6">
                Scan the QR code below using your phone camera to securely complete payment using Apple Pay, Google Pay, or Card.
              </p>

              {/* QR Code Container */}
              <div className="p-4 bg-white rounded-3xl shadow-2xl border-4 border-amber-400/50 mb-6 flex flex-col items-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
                    displayState.paymentQrUrl || window.location.origin + '/?view=pay-customer'
                  )}`}
                  alt="Payment QR"
                  className="w-52 h-52 object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="flex items-center space-x-6 text-xs text-slate-400">
                <span className="flex items-center space-x-1.5">
                  <Smartphone className="w-4 h-4 text-amber-400" />
                  <span>No App Download Needed</span>
                </span>
                <span>•</span>
                <span className="flex items-center space-x-1.5">
                  <Lock className="w-4 h-4 text-emerald-400" />
                  <span>PCI-DSS Encrypted</span>
                </span>
                <span>•</span>
                <span className="font-bold text-amber-400">
                  Fixed Amount: ${displayState.grandTotal.toFixed(2)}
                </span>
              </div>
            </div>
          ) : displayState.screenState === 'customer_self_entry' ? (
            /* PAY-003, PAY-005: Customer Self-Entry Card Screen */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4">
                <CreditCard className="w-8 h-8" />
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 mb-2">
                Customer Private Self-Entry
              </span>
              <h2 className="text-2xl font-black text-white mb-2">
                Please Enter Your Card Information Privately
              </h2>
              <p className="text-xs text-slate-400 max-w-md mb-6">
                Your card information is encrypted directly with the payment provider. Employee cannot see or record your CVV or account number.
              </p>

              <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-5 text-left space-y-3">
                <div className="text-center py-4 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-400 block uppercase font-semibold">Total Amount</span>
                  <div className="text-3xl font-black font-mono text-amber-400">
                    ${displayState.grandTotal.toFixed(2)}
                  </div>
                </div>
                <div className="text-center text-xs text-slate-400 pt-2">
                  Follow the on-screen keypad or prompt on the terminal to authorize.
                </div>
              </div>
            </div>
          ) : hasItems ? (
            <>
              {/* Header */}
              <div className="bg-slate-900/90 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Your Register Order ({displayState.items.length} {displayState.items.length === 1 ? 'item' : 'items'})
                </span>
                {displayState.lastScannedItem && (
                  <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                    Just Scanned: {displayState.lastScannedItem}
                  </span>
                )}
              </div>

              {/* Items List */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-800/80 p-4">
                {displayState.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="py-3 px-3 flex items-center justify-between rounded-xl hover:bg-slate-850 transition-colors"
                  >
                    <div className="flex-1 min-w-0 pr-4">
                      <h4 className="text-lg font-bold text-white truncate">{item.name}</h4>
                      <p className="text-xs text-slate-400">
                        {item.size ? `${item.size} • ` : ''}${item.unitPrice.toFixed(2)} each
                      </p>
                    </div>

                    <div className="flex items-center space-x-8 shrink-0">
                      <div className="text-center">
                        <span className="text-xs text-slate-400 block font-semibold">QTY</span>
                        <span className="text-base font-black text-slate-200">{item.quantity}</span>
                      </div>
                      <div className="text-right min-w-[90px]">
                        <span className="text-xs text-slate-400 block font-semibold">TOTAL</span>
                        <span className="text-xl font-mono font-black text-amber-400">
                          ${item.lineTotal.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            /* Welcome / Empty Cart Presentation */
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-radial from-amber-500/5 to-transparent pointer-events-none" />

              <div className="w-24 h-24 rounded-3xl bg-amber-500/10 border border-amber-400/30 text-[#F3C067] flex items-center justify-center mb-6 shadow-2xl">
                <Sparkles className="w-12 h-12" />
              </div>

              <h2 className="text-3xl font-black text-white uppercase tracking-wider mb-2">
                Welcome to 377 Spirits
              </h2>
              <p className="text-base text-slate-400 max-w-lg mb-8 leading-relaxed">
                {displayState.welcomeMessage}
              </p>

              {/* Animated Promo Slide */}
              <div className="w-full max-w-lg bg-slate-900/90 border border-slate-800 rounded-2xl p-6 text-left relative shadow-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {currentPromo.badge}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">Store Promotion</span>
                </div>
                <h3 className="text-lg font-black text-white mb-1">{currentPromo.title}</h3>
                <p className="text-xs text-slate-300 leading-relaxed">{currentPromo.desc}</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Running Order Totals & Texas Legal Notices */}
        <div className="w-96 flex flex-col justify-between space-y-6">
          {/* Totals Panel */}
          <div className="bg-[#0F172A] border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-3">
              Payment Summary
            </h3>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-slate-300">
                <span>Subtotal</span>
                <span className="font-mono font-bold">${displayState.subtotal.toFixed(2)}</span>
              </div>

              {displayState.discountTotal > 0 && (
                <div className="flex justify-between text-emerald-400 font-semibold">
                  <span>Savings & Discounts</span>
                  <span className="font-mono font-bold">-${displayState.discountTotal.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-300">
                <span className="flex items-center space-x-1">
                  <span>Texas Sales Tax</span>
                  <span className="text-[10px] text-slate-500">(8.25%)</span>
                </span>
                <span className="font-mono font-bold">${displayState.taxTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Grand Total Highlight */}
            <div className="pt-4 border-t-2 border-slate-800 bg-slate-950/60 p-4 rounded-2xl border border-slate-800 text-right">
              <span className="text-xs uppercase font-black tracking-wider text-slate-400 block mb-1">
                Total Due
              </span>
              <div className="text-4xl font-black font-mono text-amber-400 tracking-tight">
                ${displayState.grandTotal.toFixed(2)}
              </div>
            </div>

            {/* If Payment Tendered */}
            {displayState.tenderedAmount !== undefined && (
              <div className="bg-emerald-950/40 border border-emerald-800/40 p-3 rounded-xl space-y-1 text-sm">
                <div className="flex justify-between text-emerald-300">
                  <span>Amount Tendered:</span>
                  <span className="font-mono font-bold">${displayState.tenderedAmount.toFixed(2)}</span>
                </div>
                {displayState.changeDue !== undefined && displayState.changeDue > 0 && (
                  <div className="flex justify-between text-emerald-400 font-bold text-base">
                    <span>Change Due:</span>
                    <span className="font-mono">${displayState.changeDue.toFixed(2)}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Texas TABC Notice & Age Verification */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 text-xs text-slate-400 space-y-2">
            <div className="flex items-center space-x-2 text-amber-400 font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>Texas Alcoholic Beverage Code</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-400">
              Persons under 21 years of age are prohibited from purchasing or possessing alcoholic beverages. Valid government photo ID is required.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};
