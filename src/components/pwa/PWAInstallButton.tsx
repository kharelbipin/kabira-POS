import React, { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { Download, Share, PlusSquare, X, CheckCircle2, Smartphone } from 'lucide-react';

interface PWAInstallButtonProps {
  variant?: 'compact' | 'full' | 'banner';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'compact',
  className = '',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installing, setInstalling] = useState(false);

  // If already running as an installed PWA, hide the prompt
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    setInstalling(true);
    try {
      await install();
    } finally {
      setInstalling(false);
    }
  };

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    if (variant === 'compact') {
      return (
        <button
          id="pwa-install-btn-compact"
          onClick={handleInstallClick}
          disabled={installing}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs font-black uppercase tracking-wider shadow-sm transition-all cursor-pointer ${className}`}
          title="Install KaBiRa POS as Desktop or Mobile Application"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{installing ? 'Installing...' : 'Install App'}</span>
        </button>
      );
    }

    return (
      <div className={`p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 border border-sky-500/40 shadow-lg text-white ${className}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-sky-500/20 border border-sky-400/40 text-sky-400">
              <Download className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-black text-white flex items-center space-x-2">
                <span>Install KABIRA POS App</span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/30">
                  PWA
                </span>
              </h4>
              <p className="text-xs text-slate-300 mt-0.5">
                Run fullscreen like a native desktop app with offline support and fast register launching.
              </p>
            </div>
          </div>
          <button
            id="pwa-install-btn-full"
            onClick={handleInstallClick}
            disabled={installing}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-black uppercase tracking-wider shadow-md transition-all cursor-pointer shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>{installing ? 'Installing...' : 'Install App'}</span>
          </button>
        </div>
      </div>
    );
  }

  // iOS Safari flow (beforeinstallprompt is not supported by WebKit)
  if (isIOS) {
    return (
      <>
        <button
          id="pwa-install-ios-btn"
          onClick={() => setShowIOSGuide(true)}
          className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 border border-sky-500/30 text-xs font-bold transition-all cursor-pointer ${className}`}
          title="Install on iOS Safari"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Install on iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in">
            <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl text-white space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <div className="p-2 rounded-lg bg-sky-500/20 text-sky-400">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">Install on iPhone / iPad</h3>
                    <p className="text-[11px] text-slate-400">Add KABIRA POS to Home Screen</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-300">
                <div className="flex items-start space-x-3 p-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
                  <Share className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block">Step 1: Tap Share</strong>
                    <span>Tap the Safari <strong>Share</strong> button at the bottom (or top) of your screen.</span>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
                  <PlusSquare className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block">Step 2: Add to Home Screen</strong>
                    <span>Scroll down the action list and select <strong>Add to Home Screen</strong>.</span>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
                  <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block">Step 3: Launch Dedicated POS</strong>
                    <span>Open <strong>KABIRA POS</strong> from your home screen for maximized standalone register mode.</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-colors"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Fallback desktop indicator / helper button if ambient
  return null;
};
