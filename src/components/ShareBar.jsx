import { useState } from 'react';
import { Check, Copy, Share } from './Icons';
import RoomQrModal from './RoomQrModal';

export default function ShareBar({ roomId }) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const link = `${window.location.origin}/room/${roomId}`;
  const text = `Join my room on TuneTogether! 🎧\nRoom Code: ${roomId}\nLink: ${link}`;

  async function copyLink() {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(link);
      } else {
        const ta = document.createElement('textarea');
        ta.value = link;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
    } catch {}
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 1800);
  }

  async function copyCode() {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(roomId);
      } else {
        const ta = document.createElement('textarea');
        ta.value = roomId;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
    } catch {}
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 1800);
  }

  async function nativeShare() {
    try {
      await navigator.share({
        title: 'Listen Together',
        text: `Join my room on TuneTogether! 🎧 Room Code: ${roomId}`,
        url: link,
      });
    } catch {
      /* cancelled */
    }
  }

  return (
    <div className="mt-4 bg-[#0A100D] rounded-3xl p-4 border border-white/[0.08] space-y-3 shadow-xl">
      {/* Room Code Card (Prominent) */}
      <div className="flex items-center justify-between gap-3 bg-[#101814] rounded-2xl p-3 border border-[#00FF87]/30 shadow-neon-sm">
        <div className="min-w-0">
          <p className="text-[10px] uppercase font-bold tracking-wider text-[#00FF87]">Room Code</p>
          <p className="text-lg font-mono font-extrabold text-[#F5F7F5] tracking-widest mt-0.5 select-all">
            {roomId}
          </p>
        </div>
        <button
          type="button"
          onClick={copyCode}
          className="shrink-0 flex items-center gap-1.5 bg-[#00FF87] hover:bg-[#00C96B] text-black font-extrabold rounded-full px-3.5 py-2 text-xs active:scale-95 transition shadow-neon-sm"
        >
          {copiedCode ? <Check size={14} className="stroke-[3]" /> : <Copy size={14} className="stroke-[2.5]" />}
          <span>{copiedCode ? 'Code Copied! ✓' : 'Copy Code'}</span>
        </button>
      </div>

      {/* Room Link Card */}
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-[#9AA59F] font-medium">Room link</p>
          <p className="text-xs text-white/80 font-mono truncate mt-0.5">
            {link.replace(/^https?:\/\//, '')}
          </p>
        </div>
        <button
          type="button"
          onClick={copyLink}
          className="shrink-0 flex items-center gap-1.5 bg-[#101814] hover:bg-white/10 rounded-full px-3 py-1.5 text-xs font-semibold text-white/90 active:scale-95 transition border border-white/[0.08]"
        >
          {copiedLink ? <Check size={14} className="text-[#00FF87]" /> : <Copy size={14} />}
          <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
        </button>
      </div>

      {/* Share Actions with QR Code */}
      <div className="pt-1 flex gap-2">
        <button
          type="button"
          onClick={() => setShowQr(true)}
          className="flex-1 text-center rounded-full bg-gradient-to-r from-[#00FF87]/15 to-[#00C96B]/15 border border-[#00FF87]/30 text-[#00FF87] font-extrabold text-xs py-3 active:scale-95 transition hover:bg-[#00FF87]/25 shadow-neon-sm flex items-center justify-center gap-1.5"
        >
          <span>📷</span>
          <span>QR Code Invite</span>
        </button>

        <a
          href={`https://wa.me/?text=${encodeURIComponent(text)}`}
          target="_blank"
          rel="noreferrer"
          className="flex-1 text-center rounded-full bg-[#25D366] text-black font-extrabold text-xs py-3 active:scale-95 transition hover:brightness-105 shadow flex items-center justify-center gap-1.5"
        >
          <span>WhatsApp</span>
        </a>

        {typeof navigator !== 'undefined' && navigator.share && (
          <button
            type="button"
            onClick={nativeShare}
            className="w-12 rounded-full bg-[#101814] border border-white/[0.08] grid place-items-center active:scale-95 transition text-white hover:bg-white/10 shrink-0"
            aria-label="Share"
          >
            <Share size={18} />
          </button>
        )}
      </div>

      {/* QR Code Modal */}
      {showQr && <RoomQrModal roomId={roomId} onClose={() => setShowQr(false)} />}
    </div>
  );
}
