import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  Maximize2,
  Minimize2,
  QrCode,
  Smartphone,
  CreditCard,
  Lock,
  Phone,
  Gift,
  Receipt,
  Mail,
  MessageSquare,
  ThumbsUp,
  RotateCcw,
  HeartHandshake,
} from 'lucide-react';
import { CustomerDisplayState, CustomerReceiptPreference } from '../../types';
import { KabiraEmblem } from '../common/KabiraLogo';
import { IdentifyDisplaysOverlay } from './IdentifyDisplaysOverlay';
import { hardwareStore } from '../../hardware/HardwareStore';
import { playBeep } from '../../utils/audio';

export const CustomerDisplayView: React.FC = () => {
  const [displayState, setDisplayState] = useState<CustomerDisplayState>(() => {
    try {
      const saved = localStorage.getItem('pos_customer_display_state');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      screenState: 'welcome',
      storeName: 'KABIRA POS',
      tagline: 'Fine Liquors, Craft Spirits, Wine & Beer • 377 SPIRITS',
      items: [],
      subtotal: 0,
      discountTotal: 0,
      taxTotal: 0,
      grandTotal: 0,
      welcomeMessage: 'Welcome to KABIRA POS! Please present valid ID if purchasing alcohol.',
      promoBanner: 'Specials: Texas Whiskey & Garrison Brothers Bourbon 10% Off with Club Points!',
    };
  });

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [promoIndex, setPromoIndex] = useState(0);

  // Customer Touchscreen Interactions (WV-049 - WV-053)
  const [showLoyaltyKeypad, setShowLoyaltyKeypad] = useState<boolean>(false);
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [phoneSubmitted, setPhoneSubmitted] = useState<boolean>(false);
  const [receiptSelected, setReceiptSelected] = useState<CustomerReceiptPreference | null>(null);
  const [selectedTip, setSelectedTip] = useState<number | null>(null);

  const autoReturnTimerRef = useRef<number | null>(null);

  const PROMO_SLIDES = [
    {
      title: 'Join the KABIRA VIP Club',
      desc: 'Earn 1 point per $1 spent. Get $5 off every 100 points + Birthday Rewards!',
      badge: 'Free Membership',
    },
    {
      title: 'Texas Craft Bourbon & Spirits Spotlight',
      desc: "Featured: Garrison Brothers, Balcones Texas Single Malt, and Tito's Handmade Vodka",
      badge: 'Texas Proud',
    },
    {
      title: 'Craft Beer Six-Packs on Special',
      desc: 'Revolver Blood & Honey, Shiner Bock, and Karbach Love Street in cold cooler aisle',
      badge: 'Cold Cooler',
    },
  ];

  useEffect(() => {
    // BroadcastChannel synchronization (WV-030)
    let channel: BroadcastChannel | null = null;
    try {
      if ('BroadcastChannel' in window) {
        channel = new BroadcastChannel('pos_customer_display_channel');
        channel.onmessage = (event) => {
          if (event.data) {
            setDisplayState(event.data);
            handleStateTransition(event.data);
          }
        };
      }
    } catch (e) {}

    // Storage event synchronization for multi-window / cross-tab updates
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'pos_customer_display_state' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setDisplayState(parsed);
          handleStateTransition(parsed);
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
      if (autoReturnTimerRef.current) clearTimeout(autoReturnTimerRef.current);
    };
  }, []);

  // Return to welcome screen after configured timeout (WV-029)
  const handleStateTransition = (newState: CustomerDisplayState) => {
    if (autoReturnTimerRef.current) {
      clearTimeout(autoReturnTimerRef.current);
      autoReturnTimerRef.current = null;
    }

    if (newState.screenState === 'thank_you') {
      // Auto-return to welcome after 8 seconds (or configured timeout)
      const timeoutSec = 8;
      autoReturnTimerRef.current = window.setTimeout(() => {
        setDisplayState(prev => ({
          ...prev,
          screenState: 'welcome',
          items: [],
          subtotal: 0,
          discountTotal: 0,
          taxTotal: 0,
          grandTotal: 0,
          tenderedAmount: undefined,
          changeDue: undefined,
        }));
        setReceiptSelected(null);
        setSelectedTip(null);
        setShowLoyaltyKeypad(false);
        setCustomerPhone('');
        setPhoneSubmitted(false);
      }, timeoutSec * 1000);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Focus protection: Stop events from stealing cashier focus on primary screen (WV-053)
  const handleTouchContainerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // Customer Loyalty keypad numbers
  const handleKeypadPress = (val: string) => {
    playBeep('click');
    if (customerPhone.length < 10) {
      setCustomerPhone(prev => prev + val);
    }
  };

  const handleKeypadBackspace = () => {
    playBeep('click');
    setCustomerPhone(prev => prev.slice(0, -1));
  };

  const handleKeypadSubmit = () => {
    if (customerPhone.length >= 7) {
      playBeep('success');
      setPhoneSubmitted(true);
      hardwareStore.broadcastCustomerTouchAction({
        type: 'LOYALTY_PHONE_ENTERED',
        timestamp: new Date().toISOString(),
        data: { phone: customerPhone },
      });
      setTimeout(() => setShowLoyaltyKeypad(false), 2000);
    }
  };

  const handleReceiptSelection = (pref: CustomerReceiptPreference) => {
    playBeep('click');
    setReceiptSelected(pref);
    hardwareStore.broadcastCustomerTouchAction({
      type: 'RECEIPT_PREFERENCE',
      timestamp: new Date().toISOString(),
      data: { preference: pref },
    });
  };

  const handleTipSelection = (amount: number) => {
    playBeep('click');
    setSelectedTip(amount);
    hardwareStore.broadcastCustomerTouchAction({
      type: 'TIP_SELECTED',
      timestamp: new Date().toISOString(),
      data: { tipAmount: amount },
    });
  };

  const hasItems = displayState.items && displayState.items.length > 0;
  const currentPromo = PROMO_SLIDES[promoIndex];

  return (
    <div
      id="customer-display-container"
      onClick={handleTouchContainerClick}
      className="h-screen w-screen overflow-hidden bg-[#0A0D14] text-slate-100 flex flex-col font-sans select-none antialiased relative"
    >
      {/* Identify Displays Overlay for Monitor 2 (WV-015) */}
      <IdentifyDisplaysOverlay currentDisplayNumber={2} />

      {/* Top Store Banner */}
      <header className="bg-[#0F172A] border-b border-slate-800 px-8 py-4 flex items-center justify-between shadow-xl">
        <div className="flex items-center space-x-4">
          <div className="p-1 rounded-2xl bg-[#0B132B] border border-sky-500/40 flex items-center justify-center shadow-lg shadow-sky-950/50">
            <KabiraEmblem size={48} theme="dark" />
          </div>
          <div>
            <div className="flex items-center space-x-3">
              <div className="flex items-baseline tracking-tight font-black text-2xl leading-none">
                <span className="text-white">Ka</span>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-sky-300 to-blue-500">Bi</span>
                <span className="text-white">Ra</span>
              </div>
              <span className="font-mono text-xs font-black tracking-widest px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-400/40 uppercase shadow-xs">
                POS
              </span>
              <span className="font-['Cinzel',serif] text-xs font-black tracking-widest text-[#C5A059] uppercase">
                377 SPIRITS
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium tracking-wide mt-1">
              {displayState.tagline}
            </p>
          </div>
        </div>

        {/* Right Header Status & Fullscreen toggle */}
        <div className="flex items-center space-x-4">
          {/* Customer Loyalty Button */}
          {displayState.screenState !== 'thank_you' && (
            <button
              onClick={() => {
                setShowLoyaltyKeypad(prev => !prev);
                setPhoneSubmitted(false);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer ${
                showLoyaltyKeypad
                  ? 'bg-[#C5A059] text-black border-[#C5A059]'
                  : 'bg-slate-900 border-slate-800 text-amber-300 hover:bg-slate-800'
              }`}
            >
              <Gift className="w-3.5 h-3.5" />
              <span>{phoneSubmitted ? 'Points Linked!' : 'Enter Rewards Phone'}</span>
            </button>
          )}

          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-emerald-400 font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Display 2 Synced</span>
          </div>

          <button
            onClick={toggleFullscreen}
            title="Toggle Fullscreen for 2nd Monitor"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 overflow-hidden p-6 flex gap-6">
        {/* Left Column: Cart items, Welcome Hero, Payment State, or Thank You */}
        <div className="flex-1 flex flex-col bg-[#0F172A]/90 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative">
          {/* Loyalty Phone Keypad Overlay (WV-050) */}
          {showLoyaltyKeypad && (
            <div className="absolute inset-0 z-30 bg-black/90 p-8 flex flex-col items-center justify-center animate-in fade-in">
              <div className="w-full max-w-sm bg-[#121826] border border-slate-700 p-6 rounded-3xl shadow-2xl space-y-4">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto mb-2">
                    <Phone className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Join / Lookup VIP Rewards</h3>
                  <p className="text-xs text-slate-400">Enter your 10-digit mobile phone number</p>
                </div>

                <div className="bg-black/60 border border-slate-700 rounded-2xl py-3 px-4 text-center">
                  <span className="text-2xl font-mono font-bold tracking-widest text-amber-400">
                    {customerPhone
                      ? customerPhone.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3')
                      : '(---) --- ----'}
                  </span>
                </div>

                {phoneSubmitted ? (
                  <div className="p-3 bg-emerald-950/60 border border-emerald-600 rounded-xl text-center text-xs text-emerald-300 font-bold flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Rewards phone linked to transaction!</span>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-2">
                      {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'Clear', '0', '⌫'].map(btn => (
                        <button
                          key={btn}
                          onClick={() => {
                            if (btn === 'Clear') setCustomerPhone('');
                            else if (btn === '⌫') handleKeypadBackspace();
                            else handleKeypadPress(btn);
                          }}
                          className="h-12 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-white font-bold text-lg transition-colors cursor-pointer"
                        >
                          {btn}
                        </button>
                      ))}
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => setShowLoyaltyKeypad(false)}
                        className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleKeypadSubmit}
                        disabled={customerPhone.length < 7}
                        className="flex-1 py-2.5 rounded-xl bg-[#C5A059] hover:bg-[#B38F46] disabled:opacity-50 text-black text-xs font-black uppercase tracking-wider"
                      >
                        Apply Phone
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* SCREEN STATE: THANK YOU / TRANSACTION COMPLETE (WV-028) */}
          {displayState.screenState === 'thank_you' ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center relative overflow-hidden space-y-6">
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 flex items-center justify-center mx-auto shadow-2xl shadow-emerald-950">
                <CheckCircle2 className="w-12 h-12" />
              </div>

              <div>
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-950 border border-emerald-700 text-emerald-300">
                  Payment Approved
                </span>
                <h2 className="text-3xl font-extrabold text-white mt-3">
                  Thank You for Shopping at 377 SPIRITS!
                </h2>
                <p className="text-sm text-slate-300 mt-1">
                  We appreciate your business. Please choose your receipt preference below:
                </p>
              </div>

              {/* Digital Receipt Selection (WV-050) */}
              <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Select Receipt Delivery
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <button
                    onClick={() => handleReceiptSelection('printed')}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      receiptSelected === 'printed'
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                        : 'bg-slate-800 border-slate-700 hover:bg-slate-750 text-slate-200'
                    }`}
                  >
                    <Receipt className="w-5 h-5 mx-auto mb-1 text-slate-300" />
                    <span className="text-xs font-bold block">Paper</span>
                  </button>

                  <button
                    onClick={() => handleReceiptSelection('sms')}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      receiptSelected === 'sms'
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                        : 'bg-slate-800 border-slate-700 hover:bg-slate-750 text-slate-200'
                    }`}
                  >
                    <MessageSquare className="w-5 h-5 mx-auto mb-1 text-slate-300" />
                    <span className="text-xs font-bold block">Text SMS</span>
                  </button>

                  <button
                    onClick={() => handleReceiptSelection('email')}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      receiptSelected === 'email'
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                        : 'bg-slate-800 border-slate-700 hover:bg-slate-750 text-slate-200'
                    }`}
                  >
                    <Mail className="w-5 h-5 mx-auto mb-1 text-slate-300" />
                    <span className="text-xs font-bold block">Email</span>
                  </button>

                  <button
                    onClick={() => handleReceiptSelection('none')}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      receiptSelected === 'none'
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                        : 'bg-slate-800 border-slate-700 hover:bg-slate-750 text-slate-200'
                    }`}
                  >
                    <ThumbsUp className="w-5 h-5 mx-auto mb-1 text-slate-300" />
                    <span className="text-xs font-bold block">No Receipt</span>
                  </button>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5">
                <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                <span>Screen will reset to welcome in a few moments...</span>
              </div>
            </div>
          ) : displayState.screenState === 'payment_processing' ? (
            /* SCREEN STATE: PAYMENT PROCESSING (WV-026) */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center relative overflow-hidden space-y-6">
              <div className="w-20 h-20 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 text-amber-400 flex items-center justify-center mx-auto animate-pulse">
                <CreditCard className="w-10 h-10" />
              </div>

              <div>
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-950 border border-amber-700 text-amber-300">
                  Payment Processing
                </span>
                <h2 className="text-3xl font-extrabold text-white mt-3">
                  Please Insert, Tap, or Swipe Your Card
                </h2>
                <p className="text-sm text-slate-300 mt-1">
                  Follow the prompt on the payment terminal to complete your transaction.
                </p>
              </div>

              {/* Optional Tip Quick Pills (WV-050) */}
              <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Add Cashier Tip (Optional)
                </span>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 5].map(amt => (
                    <button
                      key={amt}
                      onClick={() => handleTipSelection(amt)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                        selectedTip === amt
                          ? 'bg-[#C5A059] text-black border-[#C5A059]'
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      ${amt}.00
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Lock className="w-4 h-4 text-emerald-400" />
                <span>PCI-PTS 5.x End-to-End Encrypted Terminal</span>
              </div>
            </div>
          ) : hasItems ? (
            /* SCREEN STATE: ACTIVE CART (WV-019 to WV-025) */
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

              {/* Items List (WV-023: Product name, size, quantity, unit price, discounts, line total) */}
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
            /* SCREEN STATE: WELCOME / IDLE DISPLAY */
            <div className="flex-1 flex flex-col items-center justify-center p-10 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-radial from-amber-500/5 to-transparent pointer-events-none" />

              <div className="p-3 rounded-3xl bg-[#0B132B] border border-sky-500/40 flex items-center justify-center mb-6 shadow-2xl shadow-sky-950/60">
                <KabiraEmblem size={72} theme="dark" />
              </div>

              <div className="flex items-center justify-center space-x-2 mb-2">
                <div className="flex items-baseline tracking-tight font-black text-4xl">
                  <span className="text-white">Ka</span>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-sky-300 to-blue-500">Bi</span>
                  <span className="text-white">Ra</span>
                </div>
                <span className="font-mono text-sm font-black tracking-widest px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-400/40 uppercase shadow-xs">
                  POS
                </span>
              </div>
              <div className="font-['Cinzel',serif] text-sm font-black tracking-[0.22em] text-[#C5A059] uppercase mb-3">
                377 SPIRITS
              </div>
              <p className="text-base text-slate-400 max-w-lg mb-8 leading-relaxed">
                {displayState.welcomeMessage}
              </p>

              {/* Animated Promo Slide (WV-025) */}
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

        {/* Right Column: Running Order Totals & Texas Legal Notices (WV-024) */}
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
