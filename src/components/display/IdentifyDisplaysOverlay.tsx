import React, { useState, useEffect } from 'react';
import { bridgeClient } from '../../hardware/BridgeClient';
import { WindowsDisplayInfo } from '../../hardware/bridgeTypes';
import { Monitor } from 'lucide-react';

interface IdentifyDisplaysOverlayProps {
  currentDisplayNumber?: number; // 1 for cashier (Display A), 2 for customer (Display B)
}

export const IdentifyDisplaysOverlay: React.FC<IdentifyDisplaysOverlayProps> = ({
  currentDisplayNumber = 1,
}) => {
  const [visible, setVisible] = useState(false);
  const [displays, setDisplays] = useState<WindowsDisplayInfo[]>([]);

  useEffect(() => {
    bridgeClient
      .getDisplays()
      .then((res) => setDisplays(res.displays || []))
      .catch(() => {});

    // Listen for custom identify event
    const handleIdentify = (e: any) => {
      setVisible(true);
      setTimeout(() => setVisible(false), 3000);
    };

    window.addEventListener('kabira_identify_displays', handleIdentify);
    return () => window.removeEventListener('kabira_identify_displays', handleIdentify);
  }, []);

  if (!visible) return null;

  const isPrimary = currentDisplayNumber === 1;
  const displayLetter = isPrimary ? 'A' : 'B';
  const roleName = isPrimary ? 'Main POS (Cashier Monitor)' : 'Customer Display';

  const currentDisplay = displays.find((d) => (isPrimary ? d.primary : !d.primary)) || {
    id: `DISPLAY${currentDisplayNumber}`,
    name: `Display ${displayLetter} — ${roleName}`,
    width: 1920,
    height: 1080,
    primary: isPrimary,
    online: true,
  };

  return (
    <div
      id="identify-displays-overlay"
      className="fixed inset-0 z-[9999] pointer-events-none flex items-center justify-center bg-black/80 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="flex flex-col items-center justify-center p-12 rounded-3xl bg-neutral-950/95 border-4 border-[#C5A059] shadow-2xl text-center max-w-xl mx-auto space-y-5">
        {/* Large Letter Badge */}
        <div className="w-44 h-44 rounded-3xl bg-[#C5A059] text-black flex flex-col items-center justify-center font-black shadow-2xl border-4 border-white">
          <span className="text-xl font-bold uppercase tracking-widest text-neutral-900">
            DISPLAY
          </span>
          <span className="text-7xl font-black leading-none">{displayLetter}</span>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest text-[#C5A059]">
            <Monitor className="w-4 h-4" />
            <span>Windows Physical Monitor Identified</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-wide">
            DISPLAY {displayLetter} ({roleName})
          </h1>
          <p className="text-base font-semibold text-slate-300">
            {currentDisplay.width} &times; {currentDisplay.height} &bull; Primary:{' '}
            {currentDisplay.primary ? 'Yes' : 'No'}
          </p>
        </div>
      </div>
    </div>
  );
};
