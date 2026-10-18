import { useState } from 'react';
import { triggerDirectInstall, isInstalled } from '../lib/pwa';

export default function AndroidAppModal({ onClose }) {
  const [copied, setCopied] = useState(false);
  const installed = isInstalled();

  const handleInstall = async () => {
    await triggerDirectInstall();
  };

  const copyTwaGuide = () => {
    const text = `npx @bubblewrap/cli init --manifest=https://tunetogether.web.app/manifest.webmanifest\nnpx @bubblewrap/cli build`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg max-h-[88vh] bg-[#0c140f] border border-green-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col z-10 animate-in zoom-in-95 duration-200 text-white overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-2xl overflow-hidden p-0.5 border border-green-400/80 shadow-[0_0_15px_rgba(34,197,94,0.5)] bg-black shrink-0">
              <img src="/logo.png" alt="TuneTogether" className="w-full h-full object-cover rounded-xl" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-white leading-tight">Android App &amp; TWA</h2>
              <p className="text-[11px] text-green-400 font-semibold">Native Android Experience</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-white/60 hover:text-white flex items-center justify-center transition active:scale-90"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto py-4 space-y-4 pr-1 text-xs text-white/75 leading-relaxed custom-scrollbar">
          {/* Method 1: WebAPK 1-Tap Direct Install */}
          <div className="bg-gradient-to-br from-white/5 to-green-950/20 rounded-2xl p-4 border border-green-500/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-green-400">
                Method 1 · Recommended for Users
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500/20 text-green-300">
                1-Tap Install
              </span>
            </div>
            <h3 className="font-extrabold text-white text-sm mt-1.5">Direct Android WebAPK Installation</h3>
            <p className="mt-1 text-white/70">
              Google Chrome generates a native signed Android APK automatically on your device. The app appears in your Android App Drawer, plays uninterrupted full-screen, and enables background playback.
            </p>

            <button
              onClick={handleInstall}
              disabled={installed}
              className="mt-3.5 w-full py-3 rounded-full bg-green-500 text-black font-extrabold text-xs flex items-center justify-center gap-2 shadow-[0_0_18px_rgba(34,197,94,0.4)] hover:brightness-110 active:scale-95 transition disabled:opacity-50"
            >
              <span>📲</span>
              <span>{installed ? 'Already Installed on this device' : 'Install Android App Now'}</span>
            </button>
          </div>

          {/* Method 2: Trusted Web Activity (TWA / Bubblewrap) */}
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-cyan-400">
                Method 2 · For Developers &amp; Play Store
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300">
                TWA / APK
              </span>
            </div>
            <h3 className="font-extrabold text-white text-sm">Trusted Web Activity (TWA)</h3>
            <p className="text-white/70">
              TuneTogether is fully equipped with Google Digital Asset Links (<code className="text-green-300">.well-known/assetlinks.json</code>) and a standalone manifest. You can generate a Google Play Store release APK or AAB instantly using Google&apos;s Bubblewrap CLI:
            </p>

            <div className="bg-black/60 rounded-xl p-3 border border-white/10 font-mono text-[11px] text-green-400 relative">
              <pre className="overflow-x-auto whitespace-pre">
{`# 1. Initialize TWA with manifest
npx @bubblewrap/cli init --manifest=manifest.webmanifest

# 2. Build signed Android APK / AAB
npx @bubblewrap/cli build`}
              </pre>
              <button
                type="button"
                onClick={copyTwaGuide}
                className="absolute top-2 right-2 px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20 text-[10px] font-bold text-white transition"
              >
                {copied ? 'Copied ✓' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Android Features Highlights */}
          <div className="bg-white/5 rounded-2xl p-3.5 border border-white/10">
            <h4 className="font-bold text-white text-xs mb-2">Android Enhancements Included:</h4>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-white/70">
              <div className="flex items-center gap-1.5">
                <span className="text-green-400">✓</span> Fullscreen (No URL bar)
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-green-400">✓</span> Lock Screen Notification Media
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-green-400">✓</span> Hardware Back-Button Trap
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-green-400">✓</span> Digital Asset Links Ready
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-white/10 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="py-2 px-6 rounded-full bg-white/10 text-white font-bold text-xs hover:bg-white/20 active:scale-95 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
