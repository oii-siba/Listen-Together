import { useState } from 'react';
import { Check, Copy, Share } from './Icons';

export default function ShareBar({ roomId }) {
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}/room/${roomId}`;
  const text = `Join me and listen to music together 🎧 ${link}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      window.prompt('Copy this link:', link);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  async function nativeShare() {
    try {
      await navigator.share({ title: 'Listen Together', text: 'Join me and listen to music together 🎧', url: link });
    } catch {
      /* cancelled */
    }
  }

  return (
    <div className="mt-4 bg-panel rounded-2xl p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-white/50">Room link</p>
          <p className="text-sm font-medium truncate">{link.replace(/^https?:\/\//, '')}</p>
        </div>
        <button
          onClick={copy}
          className="shrink-0 flex items-center gap-2 bg-panel2 rounded-full px-4 py-2.5 text-sm font-semibold active:scale-95 transition"
        >
          {copied ? <Check size={18} className="text-accent" /> : <Copy size={18} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <div className="mt-3 flex gap-2">
        <a
          href={`https://wa.me/?text=${encodeURIComponent(text)}`}
          target="_blank"
          rel="noreferrer"
          className="flex-1 text-center rounded-full bg-[#25D366] text-black font-semibold text-sm py-3 active:scale-95 transition"
        >
          Share on WhatsApp
        </a>
        {typeof navigator !== 'undefined' && navigator.share && (
          <button
            onClick={nativeShare}
            className="w-12 rounded-full bg-panel2 grid place-items-center active:scale-95 transition"
            aria-label="Share"
          >
            <Share size={20} />
          </button>
        )}
      </div>
    </div>
  );
}
