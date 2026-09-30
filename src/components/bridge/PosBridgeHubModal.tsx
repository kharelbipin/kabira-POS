import React from 'react';
import { X } from 'lucide-react';
import { HardwareDeviceManager } from '../admin/HardwareDeviceManager';

interface PosBridgeHubModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PosBridgeHubModal: React.FC<PosBridgeHubModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="pos-bridge-hub-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pos-bridge-title"
      className="fixed inset-0 z-50 flex items-center justify-center
                 bg-black/80 backdrop-blur-sm p-4 select-none
                 animate-in fade-in duration-150"
    >
      <div
        className="bg-[#0B0F19] border border-slate-700/80
                   rounded-3xl shadow-2xl w-full max-w-5xl
                   overflow-hidden text-slate-100 flex flex-col
                   max-h-[92vh]"
      >
        {/* Modal Header */}
        <div
          className="bg-slate-900 border-b border-slate-800
                     px-6 py-4 flex items-center justify-between shrink-0"
        >
          <div>
            <h2
              id="pos-bridge-title"
              className="text-base font-bold text-white uppercase
                         tracking-wider font-mono"
            >
              Hardware Bridge Control Hub
            </h2>

            <p className="text-xs text-slate-400">
              Direct connection to KaBiRa Local Hardware Bridge on
              127.0.0.1:5055
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Hardware Bridge Control Hub"
            className="p-1.5 rounded-xl bg-slate-800 text-slate-400
                       hover:text-white hover:bg-slate-700
                       transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hardware Device Manager */}
        <div className="flex-1 overflow-y-auto p-6">
          <HardwareDeviceManager />
        </div>
      </div>
    </div>
  );
};
