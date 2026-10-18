import { useState, useEffect } from 'react';
import { getUpdateState, applyAppUpdate, CURRENT_APP_VERSION } from '../lib/appUpdate';

export default function AppUpdateModal() {
  const [updateInfo, setUpdateInfo] = useState(() => getUpdateState());
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const handleUpdate = (e) => {
      if (e.detail) {
        setUpdateInfo(e.detail);
        setIsDismissed(false);
      }
    };

    window.addEventListener('tt-app-update-available', handleUpdate);
    return () => window.removeEventListener('tt-app-update-available', handleUpdate);
  }, []);

  if (!updateInfo.isAvailable || (isDismissed && !updateInfo.forceUpdate)) {
    return null;
  }

  const handleUpdateClick = async () => {
    setIsUpdating(true);
    await applyAppUpdate(updateInfo.newVersion);
  };

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300 font-sans"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-sm bg-gradient-to-b from-[#0e1b12] to-[#070b08] border-2 border-green-500/50 rounded-3xl p-6 shadow-[0_20px_60px_rgba(34,197,94,0.3)] text-center animate-in zoom-in-95 duration-200 ring-1 ring-white/10 relative overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-20 bg-green-500/20 blur-2xl pointer-events-none rounded-full" />

        {/* Icon & Version Badges */}
        <div className="relative mb-3 flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-green-500/25 to-emerald-400/10 border border-green-500/40 grid place-items-center text-3xl shadow-[0_0_30px_rgba(34,197,94,0.4)] animate-bounce duration-1000">
            🚀
          </div>

          <div className="mt-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/15 border border-green-500/30 text-[11px] font-extrabold uppercase tracking-wider text-green-400">
            <span>v{updateInfo.currentVersion || CURRENT_APP_VERSION}</span>
            <span>➔</span>
            <span className="text-white">v{updateInfo.newVersion || '1.0.2'}</span>
          </div>
        </div>

        {/* Title & Message */}
        <h3 className="text-lg font-black text-white leading-tight">
          {updateInfo.title || 'নতুন আপডেট উপলব্ধ! 🚀'}
        </h3>
        <p className="mt-2 text-xs text-white/70 leading-relaxed px-1">
          {updateInfo.message ||
            'TuneTogether-এর নতুন ভার্সন এসেছে। নতুন ফিচার ও মিউজিক সিঙ্ক উপভোগ করতে এখনই আপডেট করুন।'}
        </p>

        {/* Changelog Highlights */}
        {updateInfo.changelog && updateInfo.changelog.length > 0 && (
          <div className="mt-4 p-3 rounded-2xl bg-white/[0.04] border border-white/10 text-left space-y-1.5">
            <p className="text-[10px] font-black uppercase tracking-wider text-green-400">
              ✨ নতুন যা যুক্ত হয়েছে (What&apos;s New):
            </p>
            {updateInfo.changelog.map((item, idx) => (
              <p key={idx} className="text-[11px] text-white/80 flex items-start gap-1.5">
                <span className="text-green-400 font-bold shrink-0">•</span>
                <span>{item}</span>
              </p>
            ))}
          </div>
        )}

        {/* Mandatory Warning if forceUpdate */}
        {updateInfo.forceUpdate && (
          <div className="mt-3 py-1.5 px-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-semibold">
            ⚠️ অ্যাপটি চালাতে এই আপডেটটি নেওয়া বাধ্যতামূলক।
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={handleUpdateClick}
            disabled={isUpdating}
            className="w-full py-3.5 px-4 rounded-full bg-green-500 text-black font-extrabold text-sm shadow-[0_0_25px_rgba(34,197,94,0.6)] hover:brightness-110 active:scale-95 transition flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer"
          >
            {isUpdating ? (
              <>
                <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                <span>আপডেট হচ্ছে... রিলোড হচ্ছে ⏳</span>
              </>
            ) : (
              <span>🚀 এখনই আপডেট করুন (Update Now)</span>
            )}
          </button>

          {!updateInfo.forceUpdate && (
            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              disabled={isUpdating}
              className="text-xs text-white/40 hover:text-white/80 py-1 transition disabled:opacity-30"
            >
              পরে মনে করিয়ে দিন (Remind me later)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
