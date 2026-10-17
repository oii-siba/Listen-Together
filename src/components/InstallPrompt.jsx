import { useState, useEffect } from 'react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // Check if already running as installed standalone app
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    if (isStandalone) return;

    // Check if user dismissed recently
    try {
      const dismissed = sessionStorage.getItem('TT_INSTALL_DISMISSED');
      if (dismissed) return;
    } catch {}

    // Detect iOS Safari
    const ua = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(ua);
    setIsIOS(isAppleDevice);

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Show install banner after 3 seconds on page
      setTimeout(() => setShowBanner(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Also listen to custom trigger from MenuBar
    const handleManualTrigger = () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(() => {
          setDeferredPrompt(null);
          setShowBanner(false);
        });
      } else if (isAppleDevice) {
        setShowIOSGuide(true);
      } else {
        setShowBanner(true);
      }
    };
    window.addEventListener('tt-open-install', handleManualTrigger);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('tt-open-install', handleManualTrigger);
    };
  }, [deferredPrompt]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setShowBanner(false);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIOSGuide(true);
    } else {
      // Fallback guide
      alert("To install, tap your browser's menu (⋮) and select 'Install app' or 'Add to Home screen'.");
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    try {
      sessionStorage.setItem('TT_INSTALL_DISMISSED', 'true');
    } catch {}
  };

  return (
    <>
      {/* Floating Bottom-Left Install Banner */}
      {showBanner && (
        <div className="fixed bottom-24 left-3 right-3 sm:left-6 sm:right-auto sm:max-w-sm z-40 bg-[#0d1611]/95 border border-green-500/50 rounded-2xl p-3.5 shadow-[0_12px_40px_rgba(0,0,0,0.85)] backdrop-blur-2xl animate-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-start gap-3">
            <img
              src="/logo.png"
              alt="TuneTogether"
              className="w-10 h-10 rounded-xl border border-green-400 p-0.5 shrink-0 shadow-[0_0_10px_rgba(34,197,94,0.4)]"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold text-white">Install TuneTogether</h4>
                <button
                  onClick={handleDismiss}
                  className="text-white/40 hover:text-white text-xs px-1"
                  aria-label="Dismiss"
                >
                  ✕
                </button>
              </div>
              <p className="text-[11px] text-white/60 leading-snug mt-0.5">
                Install as a real app for full-screen sync, zero browser bars &amp; background playback!
              </p>
              <div className="mt-2.5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="px-3.5 py-1.5 rounded-full bg-green-500 text-black font-extrabold text-xs hover:brightness-110 active:scale-95 transition shadow-[0_0_12px_rgba(34,197,94,0.5)]"
                >
                  📲 Install App
                </button>
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="px-2.5 py-1.5 text-xs text-white/40 hover:text-white/70"
                >
                  Not now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* iOS Safari Guide Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-[#0d1410] border border-green-500/40 rounded-3xl p-6 text-center shadow-2xl">
            <span className="text-3xl">📱</span>
            <h3 className="mt-3 text-base font-extrabold text-white">Install on iPhone / iPad</h3>
            <p className="text-xs text-white/60 mt-1">Apple requires adding to Home Screen through Safari:</p>

            <div className="mt-4 p-3 rounded-2xl bg-white/5 border border-white/10 text-left text-xs text-white/80 space-y-2">
              <p className="flex items-center gap-2">
                <span className="font-bold text-green-400">1.</span> Tap the <strong>Share (⬆)</strong> button at the bottom of Safari.
              </p>
              <p className="flex items-center gap-2">
                <span className="font-bold text-green-400">2.</span> Scroll down and tap <strong>"Add to Home Screen"</strong> (➕).
              </p>
              <p className="flex items-center gap-2">
                <span className="font-bold text-green-400">3.</span> Tap <strong>Add</strong> at the top right!
              </p>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-5 w-full py-2.5 rounded-full bg-green-500 text-black font-bold text-xs"
            >
              Got it! ✓
            </button>
          </div>
        </div>
      )}
    </>
  );
}
