import React, { useState } from 'react';
import { User } from '../types';
import { api } from '../utils/api';
import { playBeep } from '../utils/audio';
import { ShieldCheck, Delete, KeyRound, Mail, UserCheck, AlertCircle, Lock } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
  currentUserId?: string;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [mode, setMode] = useState<'pin' | 'email'>('pin');
  const [pin, setPin] = useState<string>('');
  const [email, setEmail] = useState<string>('cashier@pos.local');
  const [password, setPassword] = useState<string>('cashier123');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  if (!isOpen) return null;

  const handlePinDigit = (digit: string) => {
    playBeep('click');
    if (pin.length < 6) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setError(null);
      if (nextPin.length === 4) {
        // Auto submit 4-digit PIN for speed
        submitPin(nextPin);
      }
    }
  };

  const handlePinBackspace = () => {
    playBeep('click');
    setPin(prev => prev.slice(0, -1));
    setError(null);
  };

  const handlePinClear = () => {
    playBeep('click');
    setPin('');
    setError(null);
  };

  const submitPin = async (enteredPin: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await api.login({ pin: enteredPin });
      playBeep('success');
      api.setUserId(result.user.id);
      onLoginSuccess(result.user);
      setPin('');
      onClose();
    } catch (err: any) {
      playBeep('error');
      setError(err.message || 'Invalid PIN. Try 1234, 5555, or 9999');
      setPin('');
    } finally {
      setIsLoading(false);
    }
  };

  const submitEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const result = await api.login({ email, password });
      playBeep('success');
      api.setUserId(result.user.id);
      onLoginSuccess(result.user);
      onClose();
    } catch (err: any) {
      playBeep('error');
      setError(err.message || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  // Quick switch presets for testing
  const quickSwitch = (targetPin: string) => {
    submitPin(targetPin);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4">
      <div className="bg-[#0F0F0F] border border-[#262626] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden text-[#E5E5E5] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-[#0A0A0A] px-6 py-4 border-b border-[#262626] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#C5A059]/15 text-[#C5A059] flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-serif italic font-bold text-[#F5F5F5] text-lg">Terminal Login / Switch</h2>
              <p className="text-xs text-[#737373] mt-0.5">Authenticate operator credentials</p>
            </div>
          </div>
          <div className="flex bg-[#141414] p-0.5 rounded-lg border border-[#262626]">
            <button
              id="login-tab-pin"
              onClick={() => { setMode('pin'); setError(null); }}
              className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-md transition-all cursor-pointer ${
                mode === 'pin' ? 'bg-[#C5A059] text-black' : 'text-[#737373] hover:text-white'
              }`}
            >
              PIN Pad
            </button>
            <button
              id="login-tab-email"
              onClick={() => { setMode('email'); setError(null); }}
              className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-md transition-all cursor-pointer ${
                mode === 'email' ? 'bg-[#C5A059] text-black' : 'text-[#737373] hover:text-white'
              }`}
            >
              Email / Pass
            </button>
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-950/40 border border-red-800 text-red-300 text-xs flex items-center space-x-2 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {mode === 'pin' ? (
            <div>
              {/* PIN Display */}
              <div className="mb-5 text-center">
                <p className="text-xs text-[#737373] mb-2 font-medium">Enter 4-digit Cashier / Manager / Admin PIN</p>
                <div className="flex justify-center space-x-3 my-3">
                  {[0, 1, 2, 3].map(i => (
                    <div
                      key={i}
                      className={`w-3.5 h-3.5 rounded-full transition-all duration-150 ${
                        pin.length > i
                          ? 'bg-[#C5A059] scale-110 shadow-sm shadow-[#C5A059]/50'
                          : 'border border-[#333333] bg-[#1A1A1A]'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Numeric Keypad (Tablet Touch Ergonomics) */}
              <div className="grid grid-cols-3 gap-2.5 max-w-[280px] mx-auto mb-4">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => (
                  <button
                    key={d}
                    id={`pin-btn-${d}`}
                    onClick={() => handlePinDigit(d)}
                    disabled={isLoading}
                    className="h-14 rounded-xl bg-[#141414] hover:bg-[#1F1F1F] active:bg-[#C5A059] active:text-black text-[#E5E5E5] font-semibold text-xl border border-[#262626] shadow-xs flex items-center justify-center transition-transform active:scale-95 cursor-pointer"
                  >
                    {d}
                  </button>
                ))}
                <button
                  id="pin-btn-clear"
                  onClick={handlePinClear}
                  disabled={isLoading}
                  className="h-14 rounded-xl bg-[#101010] hover:bg-[#1A1A1A] text-[#737373] hover:text-white text-xs font-bold uppercase tracking-wider border border-[#262626] flex items-center justify-center cursor-pointer active:scale-95"
                >
                  Clear
                </button>
                <button
                  id="pin-btn-0"
                  onClick={() => handlePinDigit('0')}
                  disabled={isLoading}
                  className="h-14 rounded-xl bg-[#141414] hover:bg-[#1F1F1F] active:bg-[#C5A059] active:text-black text-[#E5E5E5] font-semibold text-xl border border-[#262626] shadow-xs flex items-center justify-center cursor-pointer active:scale-95"
                >
                  0
                </button>
                <button
                  id="pin-btn-backspace"
                  onClick={handlePinBackspace}
                  disabled={isLoading}
                  className="h-14 rounded-xl bg-[#101010] hover:bg-[#1A1A1A] text-[#737373] hover:text-white text-sm border border-[#262626] flex items-center justify-center cursor-pointer active:scale-95"
                >
                  <Delete className="w-5 h-5" />
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={submitEmailLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#A3A3A3] mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#737373] absolute left-3 top-3" />
                  <input
                    id="login-email-input"
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full bg-[#141414] border border-[#262626] rounded-lg pl-9 pr-3 py-2 text-sm text-[#E5E5E5] focus:outline-hidden focus:border-[#C5A059]"
                    placeholder="name@pos.local"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#A3A3A3] mb-1.5">Password</label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-[#737373] absolute left-3 top-3" />
                  <input
                    id="login-password-input"
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-[#141414] border border-[#262626] rounded-lg pl-9 pr-3 py-2 text-sm text-[#E5E5E5] focus:outline-hidden focus:border-[#C5A059]"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                id="login-submit-btn"
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-lg bg-[#C5A059] hover:bg-[#D4B06A] text-black font-bold uppercase tracking-wider text-xs transition-all shadow-md cursor-pointer disabled:opacity-50"
              >
                {isLoading ? 'Verifying...' : 'Sign In to Register'}
              </button>
            </form>
          )}

          {/* Quick Demo Switchers */}
          <div className="mt-5 pt-4 border-t border-[#262626] text-xs">
            <span className="text-[11px] font-bold text-[#737373] uppercase tracking-wider block mb-2">
              Quick Role Test Logins:
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                id="quick-login-cashier"
                onClick={() => quickSwitch('1234')}
                className="p-2.5 rounded-lg bg-[#141414] hover:bg-[#1A1A1A] border border-[#262626] hover:border-[#C5A059]/50 text-left transition-colors cursor-pointer"
              >
                <div className="font-semibold text-xs text-[#E5E5E5]">Elena (Cashier)</div>
                <div className="text-[10px] text-[#C5A059] font-mono mt-0.5">PIN: 1234</div>
              </button>

              <button
                type="button"
                id="quick-login-manager"
                onClick={() => quickSwitch('5555')}
                className="p-2.5 rounded-lg bg-[#141414] hover:bg-[#1A1A1A] border border-[#262626] hover:border-[#C5A059]/50 text-left transition-colors cursor-pointer"
              >
                <div className="font-semibold text-xs text-[#E5E5E5]">Marcus (Mgr)</div>
                <div className="text-[10px] text-[#C5A059] font-mono mt-0.5">PIN: 5555</div>
              </button>

              <button
                type="button"
                id="quick-login-admin"
                onClick={() => quickSwitch('9999')}
                className="p-2.5 rounded-lg bg-[#141414] hover:bg-[#1A1A1A] border border-[#262626] hover:border-[#C5A059]/50 text-left transition-colors cursor-pointer"
              >
                <div className="font-semibold text-xs text-[#E5E5E5]">Sarah (Admin)</div>
                <div className="text-[10px] text-[#C5A059] font-mono mt-0.5">PIN: 9999</div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#0A0A0A] px-6 py-3 border-t border-[#262626] flex justify-end">
          <button
            id="login-cancel-btn"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-[#737373] hover:text-white rounded-md hover:bg-[#1A1A1A] transition-colors cursor-pointer"
          >
            Cancel / Back
          </button>
        </div>
      </div>
    </div>
  );
};
