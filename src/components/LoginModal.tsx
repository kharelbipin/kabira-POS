import React, { useEffect, useState } from 'react';
import { User } from '../types';
import { api } from '../utils/api';
import { playBeep } from '../utils/audio';
import {
  Delete,
  KeyRound,
  Mail,
  AlertCircle,
  Lock,
  ShieldCheck,
  UserRound,
} from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
  currentUserId?: string;
  managerOnly?: boolean;
  title?: string;
  subtitle?: string;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  managerOnly = false,
  title,
  subtitle,
}) => {
  const [mode, setMode] = useState<'pin' | 'email'>('pin');

  const [pin, setPin] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // First-run Admin setup
  const [isCheckingSetup, setIsCheckingSetup] =
    useState<boolean>(true);

  const [requiresSetup, setRequiresSetup] =
    useState<boolean>(false);

  const [setupName, setSetupName] =
    useState<string>('');

  const [setupEmail, setSetupEmail] =
    useState<string>('');

  const [setupPin, setSetupPin] =
    useState<string>('');

  const [setupPassword, setSetupPassword] =
    useState<string>('');

  const [
    setupPasswordConfirm,
    setSetupPasswordConfirm,
  ] = useState<string>('');

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let cancelled = false;

    const checkBootstrapStatus = async () => {
      setIsCheckingSetup(true);
      setError(null);

      try {
        const status =
          await api.getBootstrapStatus();

        if (!cancelled) {
          setRequiresSetup(
            Boolean(status.requiresSetup)
          );
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(
            err?.message ||
              'Unable to check initial KaBiRa POS setup status.'
          );
        }
      } finally {
        if (!cancelled) {
          setIsCheckingSetup(false);
        }
      }
    };

    void checkBootstrapStatus();

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handlePinDigit = (
    digit: string
  ) => {
    playBeep('click');

    if (
      isLoading ||
      pin.length >= 4
    ) {
      return;
    }

    const nextPin =
      pin + digit;

    setPin(nextPin);
    setError(null);

    if (nextPin.length === 4) {
      void submitPin(nextPin);
    }
  };

  const handlePinBackspace = () => {
    playBeep('click');

    setPin(prev =>
      prev.slice(0, -1)
    );

    setError(null);
  };

  const handlePinClear = () => {
    playBeep('click');

    setPin('');
    setError(null);
  };

  const submitPin = async (
    enteredPin: string
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const result =
        await api.login({
          pin: enteredPin,
        });

      if (managerOnly && result.user.role !== 'Manager' && result.user.role !== 'Admin') {
        playBeep('error');
        setError('Manager or Admin credentials are required for this portal.');
        setPin('');
        return;
      }

      playBeep('success');

      api.setUserId(
        result.user.id
      );

      onLoginSuccess(
        result.user
      );

      setPin('');

      onClose();
    } catch (err: any) {
      playBeep('error');

      setError(
        err?.message ||
          'Invalid PIN or inactive account.'
      );

      setPin('');
    } finally {
      setIsLoading(false);
    }
  };

  const submitEmailLogin = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setIsLoading(true);
    setError(null);

    try {
      const result =
        await api.login({
          email,
          password,
        });

      if (managerOnly && result.user.role !== 'Manager' && result.user.role !== 'Admin') {
        playBeep('error');
        setError('Manager or Admin credentials are required for this portal.');
        setPassword('');
        return;
      }

      playBeep('success');

      api.setUserId(
        result.user.id
      );

      onLoginSuccess(
        result.user
      );

      onClose();
    } catch (err: any) {
      playBeep('error');

      setError(
        err?.message ||
          'Invalid email or password'
      );

      setPassword('');
    } finally {
      setIsLoading(false);
    }
  };

  const submitInitialAdminSetup =
    async (
      e: React.FormEvent
    ) => {
      e.preventDefault();

      setError(null);

      const normalizedName =
        setupName.trim();

      const normalizedEmail =
        setupEmail
          .trim()
          .toLowerCase();

      const normalizedPin =
        setupPin.trim();

      if (!normalizedName) {
        setError(
          'Admin name is required.'
        );

        return;
      }

      if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
          normalizedEmail
        )
      ) {
        setError(
          'Enter a valid Admin email address.'
        );

        return;
      }

      if (
        !/^\d{4}$/.test(
          normalizedPin
        )
      ) {
        setError(
          'Admin register PIN must be exactly 4 digits.'
        );

        return;
      }

      if (
        setupPassword.length < 8
      ) {
        setError(
          'Admin password must be at least 8 characters.'
        );

        return;
      }

      if (
        setupPassword !==
        setupPasswordConfirm
      ) {
        setError(
          'Admin passwords do not match.'
        );

        return;
      }

      setIsLoading(true);

      try {
        const result =
          await api.bootstrapAdmin({
            name: normalizedName,
            email: normalizedEmail,
            pin: normalizedPin,
            password:
              setupPassword,
          });

        playBeep('success');

        onLoginSuccess(
          result.user
        );

        setSetupName('');
        setSetupEmail('');
        setSetupPin('');
        setSetupPassword('');
        setSetupPasswordConfirm('');

        setRequiresSetup(false);

        onClose();
      } catch (err: any) {
        playBeep('error');

        setError(
          err?.message ||
            'Unable to complete initial Admin setup.'
        );
      } finally {
        setIsLoading(false);
      }
    };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4">
      <div className="bg-[#0F0F0F] border border-[#262626] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden text-[#E5E5E5] animate-in fade-in zoom-in-95 duration-150">

        {/* HEADER */}
        <div className="bg-[#0A0A0A] px-6 py-4 border-b border-[#262626] flex items-center justify-between">

          <div className="flex items-center space-x-2.5">

            <div className="w-8 h-8 rounded-lg bg-[#C5A059]/15 text-[#C5A059] flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>

            <div>
              <h2 className="font-serif italic font-bold text-[#F5F5F5] text-lg">
                {requiresSetup
                  ? 'Initial Admin Setup'
                  : title || (managerOnly ? 'Manager Portal Login' : 'Terminal Login / Switch')}
              </h2>

              <p className="text-xs text-[#737373] mt-0.5">
                {requiresSetup
                  ? 'Create the first secure KaBiRa POS administrator account'
                  : subtitle || (managerOnly
                    ? 'Manager/Admin authentication required for backend POS controls'
                    : 'Authenticate operator credentials')}
              </p>
            </div>

          </div>

          {!requiresSetup &&
            !isCheckingSetup && (
              <div className="flex bg-[#141414] p-0.5 rounded-lg border border-[#262626]">

                <button
                  id="login-tab-pin"
                  type="button"
                  onClick={() => {
                    setMode('pin');
                    setError(null);
                    setPassword('');
                  }}
                  className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-md transition-all cursor-pointer ${
                    mode === 'pin'
                      ? 'bg-[#C5A059] text-black'
                      : 'text-[#737373] hover:text-white'
                  }`}
                >
                  PIN Pad
                </button>

                <button
                  id="login-tab-email"
                  type="button"
                  onClick={() => {
                    setMode('email');
                    setError(null);
                    setPin('');
                  }}
                  className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-md transition-all cursor-pointer ${
                    mode === 'email'
                      ? 'bg-[#C5A059] text-black'
                      : 'text-[#737373] hover:text-white'
                  }`}
                >
                  Email / Pass
                </button>

              </div>
            )}
        </div>

        {/* BODY */}
        <div className="p-6">

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-950/40 border border-red-800 text-red-300 text-xs flex items-center space-x-2 animate-shake">

              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />

              <span>
                {error}
              </span>

            </div>
          )}

          {/* CHECKING INITIAL SETUP */}
          {isCheckingSetup ? (
            <div className="py-10 text-center">

              <div className="mx-auto mb-3 w-10 h-10 rounded-full border-2 border-[#333333] border-t-[#C5A059] animate-spin" />

              <p className="text-xs text-[#888888]">
                Checking KaBiRa POS setup...
              </p>

            </div>
          ) : requiresSetup ? (

            /* FIRST RUN ADMIN */
            <form
              onSubmit={
                submitInitialAdminSetup
              }
              className="space-y-4"
            >

              <div className="rounded-xl border border-[#C5A059]/30 bg-[#C5A059]/10 p-3 flex items-start gap-3">

                <ShieldCheck className="w-5 h-5 text-[#C5A059] shrink-0 mt-0.5" />

                <div>

                  <p className="text-xs font-bold text-[#E5E5E5]">
                    First-run security setup
                  </p>

                  <p className="text-[11px] text-[#9A9A9A] mt-1">
                    No operator accounts exist yet.
                    Create the first Admin before
                    the register can be used.
                  </p>

                </div>
              </div>

              {/* ADMIN NAME */}
              <div>

                <label className="block text-xs font-bold uppercase tracking-wider text-[#A3A3A3] mb-1.5">
                  Admin Name
                </label>

                <div className="relative">

                  <UserRound className="w-4 h-4 text-[#737373] absolute left-3 top-3" />

                  <input
                    id="bootstrap-admin-name"
                    type="text"
                    required
                    autoComplete="name"
                    value={setupName}
                    onChange={e => {
                      setSetupName(
                        e.target.value
                      );

                      setError(null);
                    }}
                    disabled={
                      isLoading
                    }
                    className="w-full bg-[#141414] border border-[#262626] rounded-lg pl-9 pr-3 py-2 text-sm text-[#E5E5E5] focus:outline-hidden focus:border-[#C5A059] disabled:opacity-60"
                    placeholder="Store administrator"
                    autoFocus
                  />

                </div>
              </div>

              {/* ADMIN EMAIL */}
              <div>

                <label className="block text-xs font-bold uppercase tracking-wider text-[#A3A3A3] mb-1.5">
                  Admin Email
                </label>

                <div className="relative">

                  <Mail className="w-4 h-4 text-[#737373] absolute left-3 top-3" />

                  <input
                    id="bootstrap-admin-email"
                    type="email"
                    required
                    autoComplete="username"
                    value={setupEmail}
                    onChange={e => {
                      setSetupEmail(
                        e.target.value
                      );

                      setError(null);
                    }}
                    disabled={
                      isLoading
                    }
                    className="w-full bg-[#141414] border border-[#262626] rounded-lg pl-9 pr-3 py-2 text-sm text-[#E5E5E5] focus:outline-hidden focus:border-[#C5A059] disabled:opacity-60"
                    placeholder="admin@yourstore.com"
                  />

                </div>
              </div>

              {/* ADMIN PIN */}
              <div>

                <label className="block text-xs font-bold uppercase tracking-wider text-[#A3A3A3] mb-1.5">
                  4-Digit Register PIN
                </label>

                <input
                  id="bootstrap-admin-pin"
                  type="password"
                  inputMode="numeric"
                  autoComplete="new-password"
                  maxLength={4}
                  required
                  value={setupPin}
                  onChange={e => {
                    setSetupPin(
                      e.target.value.replace(
                        /\D/g,
                        ''
                      )
                    );

                    setError(null);
                  }}
                  disabled={
                    isLoading
                  }
                  className="w-full bg-[#141414] border border-[#262626] rounded-lg px-3 py-2 text-center text-lg font-mono tracking-[0.35em] text-[#E5E5E5] focus:outline-hidden focus:border-[#C5A059] disabled:opacity-60"
                  placeholder="••••"
                />

              </div>

              {/* PASSWORD */}
              <div>

                <label className="block text-xs font-bold uppercase tracking-wider text-[#A3A3A3] mb-1.5">
                  Admin Password
                </label>

                <div className="relative">

                  <KeyRound className="w-4 h-4 text-[#737373] absolute left-3 top-3" />

                  <input
                    id="bootstrap-admin-password"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={
                      setupPassword
                    }
                    onChange={e => {
                      setSetupPassword(
                        e.target.value
                      );

                      setError(null);
                    }}
                    disabled={
                      isLoading
                    }
                    className="w-full bg-[#141414] border border-[#262626] rounded-lg pl-9 pr-3 py-2 text-sm text-[#E5E5E5] focus:outline-hidden focus:border-[#C5A059] disabled:opacity-60"
                    placeholder="Minimum 8 characters"
                  />

                </div>
              </div>

              {/* CONFIRM PASSWORD */}
              <div>

                <label className="block text-xs font-bold uppercase tracking-wider text-[#A3A3A3] mb-1.5">
                  Confirm Password
                </label>

                <div className="relative">

                  <Lock className="w-4 h-4 text-[#737373] absolute left-3 top-3" />

                  <input
                    id="bootstrap-admin-password-confirm"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={
                      setupPasswordConfirm
                    }
                    onChange={e => {
                      setSetupPasswordConfirm(
                        e.target.value
                      );

                      setError(null);
                    }}
                    disabled={
                      isLoading
                    }
                    className="w-full bg-[#141414] border border-[#262626] rounded-lg pl-9 pr-3 py-2 text-sm text-[#E5E5E5] focus:outline-hidden focus:border-[#C5A059] disabled:opacity-60"
                    placeholder="Re-enter Admin password"
                  />

                </div>
              </div>

              <button
                id="bootstrap-admin-submit"
                type="submit"
                disabled={
                  isLoading ||
                  !setupName.trim() ||
                  !setupEmail.trim() ||
                  setupPin.length !== 4 ||
                  setupPassword.length < 8 ||
                  setupPasswordConfirm.length <
                    8
                }
                className="w-full py-2.5 rounded-lg bg-[#C5A059] hover:bg-[#D4B06A] text-black font-bold uppercase tracking-wider text-xs transition-all shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading
                  ? 'Creating Admin...'
                  : 'Create First Admin'}
              </button>

            </form>
          ) : mode === 'pin' ? (

            /* PIN LOGIN */
            <div>

              <div className="mb-5 text-center">

                <p className="text-xs text-[#737373] mb-2 font-medium">
                  Enter your 4-digit operator PIN
                </p>

                <div className="flex justify-center space-x-3 my-3">

                  {[0, 1, 2, 3].map(
                    i => (
                      <div
                        key={i}
                        className={`w-3.5 h-3.5 rounded-full transition-all duration-150 ${
                          pin.length >
                          i
                            ? 'bg-[#C5A059] scale-110 shadow-sm shadow-[#C5A059]/50'
                            : 'border border-[#333333] bg-[#1A1A1A]'
                        }`}
                      />
                    )
                  )}

                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5 max-w-[280px] mx-auto mb-4">

                {[
                  '1',
                  '2',
                  '3',
                  '4',
                  '5',
                  '6',
                  '7',
                  '8',
                  '9',
                ].map(d => (
                  <button
                    key={d}
                    id={`pin-btn-${d}`}
                    type="button"
                    onClick={() =>
                      handlePinDigit(
                        d
                      )
                    }
                    disabled={
                      isLoading
                    }
                    className="h-14 rounded-xl bg-[#141414] hover:bg-[#1F1F1F] active:bg-[#C5A059] active:text-black text-[#E5E5E5] font-semibold text-xl border border-[#262626] shadow-xs flex items-center justify-center transition-transform active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    {d}
                  </button>
                ))}

                <button
                  id="pin-btn-clear"
                  type="button"
                  onClick={
                    handlePinClear
                  }
                  disabled={
                    isLoading
                  }
                  className="h-14 rounded-xl bg-[#101010] hover:bg-[#1A1A1A] text-[#737373] hover:text-white text-xs font-bold uppercase tracking-wider border border-[#262626] flex items-center justify-center cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  Clear
                </button>

                <button
                  id="pin-btn-0"
                  type="button"
                  onClick={() =>
                    handlePinDigit(
                      '0'
                    )
                  }
                  disabled={
                    isLoading
                  }
                  className="h-14 rounded-xl bg-[#141414] hover:bg-[#1F1F1F] active:bg-[#C5A059] active:text-black text-[#E5E5E5] font-semibold text-xl border border-[#262626] shadow-xs flex items-center justify-center cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  0
                </button>

                <button
                  id="pin-btn-backspace"
                  type="button"
                  onClick={
                    handlePinBackspace
                  }
                  disabled={
                    isLoading
                  }
                  className="h-14 rounded-xl bg-[#101010] hover:bg-[#1A1A1A] text-[#737373] hover:text-white text-sm border border-[#262626] flex items-center justify-center cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  <Delete className="w-5 h-5" />
                </button>

              </div>
            </div>
          ) : (

            /* EMAIL LOGIN */
            <form
              onSubmit={
                submitEmailLogin
              }
              className="space-y-4"
            >

              <div>

                <label className="block text-xs font-bold uppercase tracking-wider text-[#A3A3A3] mb-1.5">
                  Email Address
                </label>

                <div className="relative">

                  <Mail className="w-4 h-4 text-[#737373] absolute left-3 top-3" />

                  <input
                    id="login-email-input"
                    type="email"
                    required
                    autoComplete="username"
                    value={email}
                    onChange={e => {
                      setEmail(
                        e.target.value
                      );

                      setError(null);
                    }}
                    disabled={
                      isLoading
                    }
                    className="w-full bg-[#141414] border border-[#262626] rounded-lg pl-9 pr-3 py-2 text-sm text-[#E5E5E5] focus:outline-hidden focus:border-[#C5A059] disabled:opacity-60"
                    placeholder="name@yourstore.com"
                  />

                </div>
              </div>

              <div>

                <label className="block text-xs font-bold uppercase tracking-wider text-[#A3A3A3] mb-1.5">
                  Password
                </label>

                <div className="relative">

                  <KeyRound className="w-4 h-4 text-[#737373] absolute left-3 top-3" />

                  <input
                    id="login-password-input"
                    type="password"
                    required
                    autoComplete="current-password"
                    value={
                      password
                    }
                    onChange={e => {
                      setPassword(
                        e.target.value
                      );

                      setError(null);
                    }}
                    disabled={
                      isLoading
                    }
                    className="w-full bg-[#141414] border border-[#262626] rounded-lg pl-9 pr-3 py-2 text-sm text-[#E5E5E5] focus:outline-hidden focus:border-[#C5A059] disabled:opacity-60"
                    placeholder="••••••••"
                  />

                </div>
              </div>

              <button
                id="login-submit-btn"
                type="submit"
                disabled={
                  isLoading
                }
                className="w-full py-2.5 rounded-lg bg-[#C5A059] hover:bg-[#D4B06A] text-black font-bold uppercase tracking-wider text-xs transition-all shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading
                  ? 'Verifying...'
                  : 'Sign In to Register'}
              </button>

            </form>
          )}
        </div>

        {/* FOOTER */}
        {!requiresSetup && (
          <div className="bg-[#0A0A0A] px-6 py-3 border-t border-[#262626] flex justify-end">

            <button
              id="login-cancel-btn"
              type="button"
              onClick={onClose}
              disabled={
                isCheckingSetup ||
                isLoading
              }
              className="px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-[#737373] hover:text-white rounded-md hover:bg-[#1A1A1A] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel / Back
            </button>

          </div>
        )}

      </div>
    </div>
  );
};
