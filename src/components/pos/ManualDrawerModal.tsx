import React, { useState } from 'react';
import { Landmark, X, ShieldAlert, CheckCircle2, KeyRound } from 'lucide-react';
import { User } from '../../types';
import { playBeep } from '../../utils/audio';
import { api } from '../../utils/api';
import { hardwareStore } from '../../hardware';

interface ManualDrawerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: User | null;
}

const REASONS = [
  'Making change for customer (No Sale)',
  'Adding coin rolls / change from store safe',
  'Cash drop / till skim into drop safe',
  'Mid-day drawer audit & balancing',
  'Drawer jam / mechanical check',
  'Shift handoff verification',
];

export const ManualDrawerModal: React.FC<ManualDrawerModalProps> = ({
  isOpen,
  onClose,
  currentUser,
}) => {
  const [selectedReason, setSelectedReason] = useState(REASONS[0]);
  const [customReason, setCustomReason] = useState('');
  const [managerPin, setManagerPin] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isKicking, setIsKicking] = useState(false);

  if (!isOpen) return null;

  const requiresManagerPin =
    currentUser?.role !== 'Admin' &&
    currentUser?.role !== 'Manager';

  const handleOpenDrawer = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);

    const reason = customReason.trim() ? customReason.trim() : selectedReason;

    if (requiresManagerPin) {
      const normalizedPin = managerPin.trim();

      if (!/^\d{4,12}$/.test(normalizedPin)) {
        playBeep('error');
        setErrorMsg('Enter a valid manager PIN.');
        return;
      }

      setIsKicking(true);

      try {
        const approval = await api.verifyManagerPin(
          normalizedPin,
          `Manual cash drawer access: ${reason}`
        );

        if (!approval.approved) {
          playBeep('error');
          setErrorMsg(approval.error || 'Manager approval was denied.');
          setIsKicking(false);
          return;
        }
      } catch (error: any) {
        playBeep('error');
        setErrorMsg(error?.message || 'Unable to verify manager approval.');
        setIsKicking(false);
        return;
      }
    } else {
      setIsKicking(true);
    }

    playBeep('click');

    try {
      const res = await hardwareStore.openCashDrawer({ reason });

      if (res.success) {
        playBeep('success');
        setManagerPin('');
        onClose();
      } else {
        playBeep('error');
        setErrorMsg(res.error || res.message || 'Failed to open cash drawer.');
      }
    } catch (error: any) {
      playBeep('error');
      setErrorMsg(error?.message || 'Failed to open cash drawer.');
    } finally {
      setIsKicking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 select-none animate-in fade-in duration-150">
      <div className="bg-[#111827] border border-slate-700 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden text-slate-100 flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shadow-xs">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white uppercase tracking-wider">
                Manual Cash Drawer Access
              </h2>
              <p className="text-xs text-slate-400">
                PB-015: Manual drawer opening requires logged audit trail
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleOpenDrawer} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-950/80 border border-rose-600/50 rounded-2xl text-rose-200 text-xs flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Reason for Drawer Access (Required Audit Record)
            </label>
            <div className="space-y-2">
              {REASONS.map(r => (
                <label
                  key={r}
                  className={`flex items-center space-x-3 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                    selectedReason === r && !customReason
                      ? 'bg-amber-500/10 border-amber-400/60 text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
                  }`}
                >
                  <input
                    type="radio"
                    name="drawerReason"
                    checked={selectedReason === r && !customReason}
                    onChange={() => {
                      setSelectedReason(r);
                      setCustomReason('');
                    }}
                    className="accent-amber-500"
                  />
                  <span>{r}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">
              Or Custom Notes:
            </label>
            <input
              type="text"
              value={customReason}
              onChange={e => setCustomReason(e.target.value)}
              placeholder="e.g. Audit requested by General Manager..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
            />
          </div>

          {requiresManagerPin && (
            <div className="bg-amber-950/40 border border-amber-700/50 p-4 rounded-2xl space-y-2">
              <div className="flex items-center space-x-2 text-amber-300 text-xs font-bold">
                <KeyRound className="w-4 h-4" />
                <span>Manager Authorization PIN Required</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Cashiers must receive approval from an active Manager or Admin before opening the till outside a cash sale.
              </p>
              <input
                type="password"
                inputMode="numeric"
                autoComplete="off"
                maxLength={12}
                value={managerPin}
                onChange={e => {
                  setManagerPin(e.target.value.replace(/\D/g, ''));
                  setErrorMsg(null);
                }}
                placeholder="Manager PIN"
                disabled={isKicking}
                className="w-full bg-slate-950 border border-amber-600/50 rounded-xl px-3 py-2 text-sm text-center font-mono text-white tracking-widest focus:outline-none disabled:opacity-60"
              />
            </div>
          )}

          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-400">
            Registered Terminal: <strong>REG-01</strong> | Operator: <strong>{currentUser?.name || 'Cashier'}</strong> ({currentUser?.role || 'Staff'})
          </div>

          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold uppercase cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                isKicking ||
                (requiresManagerPin && managerPin.trim().length < 4)
              }
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-wider shadow-md shadow-amber-500/20 cursor-pointer flex items-center space-x-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isKicking ? 'Triggering Pulse...' : 'Pop Drawer & Log'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
