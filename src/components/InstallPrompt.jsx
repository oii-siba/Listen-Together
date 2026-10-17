import { useState, useEffect } from 'react';
import { isInstalled, canPromptDirectInstall, triggerDirectInstall } from '../lib/pwa';

export default function InstallPrompt() {
  const [installed, setInstalled] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showFallbackGuide, setShowFallbackGuide] = useState(false);
  const [isPromptReady, setIsPromptReady] = useState(false);

  useEffect(() => {
    // Check if already running as installed app
    if (isInstalled()) {
      setInstalled(true);
      return;
    }

    setIsPromptReady(canPromptDirectInstall());

    // Check if user dismissed banner recently
    let isDismissed = false;
    try {
      isDismissed = sessionStorage.getItem('TT_INSTALL_DISMISSED') === 'true';
    } catch {}

    // Auto-display banner after 2.5s if not dismissed & not installed
    let timer = null;
    if (!isDismissed) {
      timer = setTimeout(() => {
        if (!isInstalled()) {
          setShowBanner(true);
        }
      }, 2500);
    }

    // Listen to PWA lifecycle events
    const onInstallAvailable = () => {
      setIsPromptReady(true);
      if (!isDismissed && !isInstalled()) {
        setShowBanner(true);
      }
    };

    const onAppInstalled = () => {
      setInstalled(true);
      setShowBanner(false);
      setShowIOSGuide(false);
      setShowFallbackGuide(false);
    };

    const onOpenInstall = async () => {
      const res = await triggerDirectInstall();
      if (res.outcome === 'accepted') {
        setShowBanner(false);
      }
    };

    const onShowIOS = () => setShowIOSGuide(true);
    const onShowFallback = () => setShowFallbackGuide(true);

    window.addEventListener('tt-install-available', onInstallAvailable);
    window.addEventListener('tt-installed', onAppInstalled);
    window.addEventListener('tt-open-install', onOpenInstall);
    window.addEventListener('tt-show-ios-guide', onShowIOS);
    window.addEventListener('tt-show-install-guide', onShowFallback);

    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener('tt-install-available', onInstallAvailable);
      window.removeEventListener('tt-installed', onAppInstalled);
      window.removeEventListener('tt-open-install', onOpenInstall);
      window.removeEventListener('tt-show-ios-guide', onShowIOS);
      window.removeEventListener('tt-show-install-guide', onShowFallback);
    };
  }, []);

  const handleInstallClick = async () => {
    const res = await triggerDirectInstall();
    if (res.outcome === 'accepted') {
      setShowBanner(false);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    try {
      sessionStorage.setItem('TT_INSTALL_DISMISSED', 'true');
    } catch {}
  };

  if (installed) return null;

  return (
    <>
      {/* Elegantly Adjusted Front Install Card - Top/Front placement on mobile & desktop */}
      {showBanner && (
        <aside 
          aria-label="Install App Prompt"
          className="fixed top-3 left-3 right-3 sm:left-auto sm:right-5 sm:max-w-md z-50 bg-[#0d1611]/95 border border-green-500/60 rounded-2xl p-3 sm:p-3.5 shadow-[0_16px_50px_rgba(0,0,0,0.9),0_0_20px_rgba(34,197,94,0.25)] backdrop-blur-2xl animate-in slide-in-from-top-4 duration-300 ring-1 ring-white/10"
        >
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <img
                src="/logo.png"
                alt="TuneTogether"
                className="w-11 h-11 rounded-xl border border-green-400 p-0.5 shadow-[0_0_12px_rgba(34,197,94,0.5)] object-cover bg-black"
              />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-white tracking-wide flex items-center gap-1.5">
                  <span>Install TuneTogether</span>
                  <span className="text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.2 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                    App
                  </span>
                </h4>
                <button
                  onClick={handleDismiss}
                  className="text-white/40 hover:text-white text-xs p-1 -mr-1 transition"
                  aria-label="Close"
                  title="Close for now"
                >
                  ✕
                </button>
              </div>
              <p className="text-[11px] text-white/70 leading-snug mt-0.5 font-medium line-clamp-1 sm:line-clamp-none">
                Direct app with full-screen music sync &amp; background play!
              </p>
              
              <div className="mt-2.5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="flex-1 sm:flex-initial px-4 py-1.5 rounded-full bg-gradient-to-r from-green-500 to-emerald-400 text-black font-extrabold text-xs hover:brightness-110 active:scale-95 transition shadow-[0_0_15px_rgba(34,197,94,0.6)] flex items-center justify-center gap-1.5"
                >
                  <span>📲</span>
                  <span>Direct Install</span>
                </button>
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="px-2.5 py-1.5 text-xs text-white/40 hover:text-white/80 transition font-medium"
                >
                  Later
                </button>
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* iOS Safari Guide Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-[#0d1410] border border-green-500/50 rounded-3xl p-6 text-center shadow-[0_20px_60px_rgba(0,0,0,0.9)]">
            <span className="text-4xl">📱</span>
            <h3 className="mt-3 text-base font-extrabold text-white">Install on iPhone / iPad</h3>
            <p className="text-xs text-white/60 mt-1">Apple Safari requires 2 quick taps to install:</p>

            <div className="mt-4 p-3.5 rounded-2xl bg-white/5 border border-white/10 text-left text-xs text-white/90 space-y-2.5">
              <div className="flex items-start gap-2.5">
                <span className="font-extrabold text-green-400 bg-green-500/20 w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px]">1</span>
                <p>Tap the <strong>Share button (⬆ or ⎙)</strong> at the bottom of Safari.</p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="font-extrabold text-green-400 bg-green-500/20 w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px]">2</span>
                <p>Scroll down and select <strong>"Add to Home Screen"</strong> (➕).</p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="font-extrabold text-green-400 bg-green-500/20 w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px]">3</span>
                <p>Tap <strong>Add</strong> at top-right to place it on your home screen!</p>
              </div>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-5 w-full py-2.5 rounded-full bg-green-500 text-black font-extrabold text-xs hover:brightness-110 active:scale-95 transition shadow-[0_0_15px_rgba(34,197,94,0.5)]"
            >
              Got it! ✓
            </button>
          </div>
        </div>
      )}

      {/* Fallback Desktop Browser Guide Modal */}
      {showFallbackGuide && (
        <div className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-[#0d1410] border border-green-500/50 rounded-3xl p-6 text-center shadow-[0_20px_60px_rgba(0,0,0,0.9)]">
            <span className="text-4xl">💻</span>
            <h3 className="mt-3 text-base font-extrabold text-white">Install TuneTogether</h3>
            <p className="text-xs text-white/60 mt-1">Install directly through your browser:</p>

            <div className="mt-4 p-3.5 rounded-2xl bg-white/5 border border-white/10 text-left text-xs text-white/90 space-y-2.5">
              <div className="flex items-start gap-2.5">
                <span className="font-extrabold text-green-400 bg-green-500/20 w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px]">1</span>
                <p>Look at your browser's <strong>address bar (top right)</strong>.</p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="font-extrabold text-green-400 bg-green-500/20 w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px]">2</span>
                <p>Click the <strong>Install App icon (🖥️ or ➕)</strong> or open Menu (⋮) &gt; <strong>"Install TuneTogether"</strong>.</p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="font-extrabold text-green-400 bg-green-500/20 w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px]">3</span>
                <p>Confirm <strong>Install</strong> to launch as a standalone desktop app!</p>
              </div>
            </div>

            <button
              onClick={() => setShowFallbackGuide(false)}
              className="mt-5 w-full py-2.5 rounded-full bg-green-500 text-black font-extrabold text-xs hover:brightness-110 active:scale-95 transition shadow-[0_0_15px_rgba(34,197,94,0.5)]"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
