import { useState, useEffect } from 'react';
import { getUpdateState, downloadAndInstallUpdate, CURRENT_APP_VERSION } from '../lib/appUpdate';

export default function AppUpdateModal() {
  const [updateInfo, setUpdateInfo] = useState(() => getUpdateState());
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadedMB, setDownloadedMB] = useState('0.00');
  const [downloadStatus, setDownloadStatus] = useState('');
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

  const handleStartDownload = async () => {
    setIsDownloading(true);
    setDownloadProgress(5);
    setDownloadedMB('0.05');
    setDownloadStatus('📡 সার্ভার কানেক্ট হচ্ছে...');

    await downloadAndInstallUpdate(updateInfo, (info) => {
      if (info) {
        if (typeof info.progress === 'number') setDownloadProgress(info.progress);
        if (info.downloadedMB) setDownloadedMB(info.downloadedMB);
        if (info.status) setDownloadStatus(info.status);
      }
    });
  };

  const totalMB = Number(updateInfo.sizeMB) || 1.2;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300 font-sans"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-sm bg-gradient-to-b from-[#0e1b12] to-[#070b08] border-2 border-green-500/50 rounded-3xl p-6 shadow-[0_20px_60px_rgba(34,197,94,0.3)] text-center animate-in zoom-in-95 duration-200 ring-1 ring-white/10 relative overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-20 bg-green-500/20 blur-2xl pointer-events-none rounded-full" />

        {isDownloading ? (
          /* ================= Active Download & Install View ================= */
          <div className="py-2 animate-in fade-in zoom-in-95 duration-200">
            {/* Animated Download Icon with Pulse Ring */}
            <div className="relative mb-4 flex justify-center">
              <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-tr from-green-500/20 to-emerald-400/10 border-2 border-green-500/40 grid place-items-center text-4xl shadow-[0_0_35px_rgba(34,197,94,0.5)]">
                <span className="animate-pulse">{downloadProgress >= 100 ? '✅' : '📥'}</span>
              </div>
            </div>

            <h3 className="text-lg font-black text-white leading-tight">
              {downloadProgress >= 100 ? 'আপডেট সম্পন্ন হয়েছে! 🎉' : 'আপডেট ডাউনলোড হচ্ছে...'}
            </h3>

            {/* Percentage Display */}
            <div className="mt-3 flex items-baseline justify-center gap-1.5">
              <span className="text-4xl font-black text-white tracking-tight">{downloadProgress}%</span>
              <span className="text-xs font-bold text-white/50 uppercase">সম্পন্ন</span>
            </div>

            {/* Live Downloaded MB vs Total MB */}
            <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/15 border border-green-500/30 text-xs font-bold text-green-300">
              <span>📦</span>
              <span>
                {downloadedMB} MB / {totalMB} MB
              </span>
            </div>

            {/* Sleek Progress Bar */}
            <div className="mt-5 w-full h-3 rounded-full bg-white/10 overflow-hidden p-0.5 border border-white/15 relative">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-green-400 to-teal-300 shadow-[0_0_20px_rgba(34,197,94,0.8)] transition-all duration-300 ease-out"
                style={{ width: `${downloadProgress}%` }}
              />
            </div>

            {/* Dynamic Status Text */}
            <div className="mt-4 p-3 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center gap-2 text-xs text-white/80">
              {downloadProgress < 100 && (
                <span className="w-3.5 h-3.5 border-2 border-green-400 border-t-transparent rounded-full animate-spin shrink-0" />
              )}
              <span className="truncate">{downloadStatus || 'ডাউনলোড হচ্ছে...'}</span>
            </div>

            {/* Safety Notice */}
            <p className="mt-4 text-[10px] text-white/45 leading-relaxed px-2">
              ⚠️ অনুগ্রহ করে পেজটি বন্ধ বা রিফ্রেশ করবেন না। ডাউনলোড শেষ হলে নতুন ভার্সন নিয়ে অ্যাপটি স্বয়ংক্রিয়ভাবে রিস্টার্ট হবে।
            </p>
          </div>
        ) : (
          /* ================= Update Available Dialog View ================= */
          <>
            {/* Icon & Version Badges */}
            <div className="relative mb-3 flex flex-col items-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-green-500/25 to-emerald-400/10 border border-green-500/40 grid place-items-center text-3xl shadow-[0_0_30px_rgba(34,197,94,0.4)] animate-bounce duration-1000">
                🚀
              </div>

              <div className="mt-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/15 border border-green-500/30 text-[11px] font-extrabold uppercase tracking-wider text-green-400">
                <span>v{updateInfo.currentVersion || CURRENT_APP_VERSION}</span>
                <span>➔</span>
                <span className="text-white">v{updateInfo.newVersion || '1.0.3'}</span>
              </div>
            </div>

            {/* Title & Message */}
            <h3 className="text-lg font-black text-white leading-tight">
              {updateInfo.title || 'নতুন আপডেট উপলব্ধ! 🚀'}
            </h3>
            <p className="mt-2 text-xs text-white/70 leading-relaxed px-1">
              {updateInfo.message ||
                'TuneTogether-এর নতুন ভার্সন এসেছে। নতুন ফিচার ও নিরবচ্ছিন্ন গান শোনার জন্য আপডেট করুন।'}
            </p>

            {/* Prominent Download Size & Speed Card */}
            <div className="mt-3.5 p-3 rounded-2xl bg-gradient-to-r from-green-500/15 via-emerald-500/10 to-transparent border border-green-500/30 flex items-center justify-between text-left">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-green-500/20 border border-green-500/40 grid place-items-center text-lg shadow-[0_0_12px_rgba(34,197,94,0.3)]">
                  📦
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-green-400">
                    ডাউনলোড প্যাকেজ
                  </p>
                  <p className="text-sm font-black text-white">
                    {updateInfo.size || `${totalMB} MB`}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-green-500/20 text-green-300 border border-green-500/30">
                ⚡ লাইভ ইনস্টল
              </span>
            </div>

            {/* Changelog Highlights */}
            {updateInfo.changelog && updateInfo.changelog.length > 0 && (
              <div className="mt-3.5 p-3 rounded-2xl bg-white/[0.04] border border-white/10 text-left space-y-1.5">
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
                ⚠️ অ্যাপটি ব্যবহার চালিয়ে যেতে এই আপডেটটি নেওয়া আবশ্যক।
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-5 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={handleStartDownload}
                className="w-full py-3.5 px-4 rounded-full bg-green-500 text-black font-extrabold text-sm shadow-[0_0_25px_rgba(34,197,94,0.6)] hover:brightness-110 active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>⬇️ ডাউনলোড ও আপডেট করুন ({updateInfo.size || `${totalMB} MB`})</span>
              </button>

              {!updateInfo.forceUpdate && (
                <button
                  type="button"
                  onClick={() => setIsDismissed(true)}
                  className="text-xs text-white/40 hover:text-white/80 py-1 transition"
                >
                  পরে মনে করিয়ে দিন (Remind me later)
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
