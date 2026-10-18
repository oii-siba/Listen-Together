import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Check, Copy } from './Icons';

export default function RoomQrModal({ roomId, onClose }) {
  const [qrUrl, setQrUrl] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const roomLink = `${window.location.origin}/room/${roomId}`;

  useEffect(() => {
    if (!roomId) return;

    const generateQrWithLogo = async () => {
      try {
        const canvas = document.createElement('canvas');
        const size = 600; // High resolution
        await QRCode.toCanvas(canvas, roomLink, {
          width: size,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#ffffff',
          },
          errorCorrectionLevel: 'H',
        });

        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.src = '/logo.png';
        await new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });

        if (img.complete && img.naturalWidth !== 0) {
          const logoSize = Math.floor(size * 0.22);
          const logoX = (size - logoSize) / 2;
          const logoY = (size - logoSize) / 2;
          const padding = 8;
          const badgeSize = logoSize + padding * 2;
          const badgeX = (size - badgeSize) / 2;
          const badgeY = (size - badgeSize) / 2;
          const radius = 18;

          // Background badge behind logo
          ctx.save();
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(badgeX, badgeY, badgeSize, badgeSize, radius);
          } else {
            ctx.rect(badgeX, badgeY, badgeSize, badgeSize);
          }
          ctx.fillStyle = '#000000';
          ctx.fill();
          ctx.lineWidth = 5;
          ctx.strokeStyle = '#22c55e';
          ctx.stroke();
          ctx.restore();

          // Circular logo drawing
          ctx.save();
          ctx.beginPath();
          const centerX = size / 2;
          const centerY = size / 2;
          const clipRadius = logoSize / 2;
          ctx.arc(centerX, centerY, clipRadius, 0, Math.PI * 2, true);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(img, logoX, logoY, logoSize, logoSize);
          ctx.restore();

          // Green accent border ring
          ctx.save();
          ctx.beginPath();
          ctx.arc(centerX, centerY, clipRadius, 0, Math.PI * 2, true);
          ctx.lineWidth = 4;
          ctx.strokeStyle = '#22c55e';
          ctx.stroke();
          ctx.restore();
        }

        setQrUrl(canvas.toDataURL('image/png'));
      } catch (err) {
        console.error('QR code generation failed:', err);
      }
    };

    generateQrWithLogo();
  }, [roomId, roomLink]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(roomLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      window.prompt('Copy room link:', roomLink);
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      window.prompt('Copy room code:', roomId);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-sm bg-panel border border-green-500/30 rounded-3xl p-6 shadow-[0_0_50px_rgba(34,197,94,0.2)] relative text-center">
        {/* Close button */}
        <button
          onClick={onClose}
          type="button"
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-panel2 text-white/60 hover:text-white flex items-center justify-center transition"
          aria-label="Close"
        >
          ✕
        </button>

        {/* Title */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/30 text-green-400 text-[11px] font-bold tracking-wider uppercase mb-3">
          <span>★</span> Scan to Join
        </div>
        <h2 className="text-xl font-extrabold text-white">Room QR Code</h2>
        <p className="text-xs text-white/60 mt-1 max-w-xs mx-auto">
          Friends can scan this QR code with their camera to enter and listen together in perfect sync.
        </p>

        {/* Glowing QR Card with Center TuneTogether Logo */}
        <div className="mt-5 p-4 bg-white rounded-2xl shadow-xl inline-block mx-auto border-4 border-green-400/40 relative group">
          {qrUrl ? (
            <div className="relative">
              <img
                src={qrUrl}
                alt={`QR Code for room ${roomId}`}
                className="w-56 h-56 object-contain rounded-lg"
              />
            </div>
          ) : (
            <div className="w-56 h-56 flex items-center justify-center text-black/50 text-xs font-bold animate-pulse">
              Generating TuneTogether QR Code…
            </div>
          )}
        </div>

        {/* Room Code Badge */}
        <div className="mt-4 flex items-center justify-center gap-2">
          <span className="text-xs text-white/50 font-bold uppercase tracking-wider">Room:</span>
          <span className="font-mono font-extrabold text-base text-green-400 bg-green-500/10 border border-green-500/30 px-3 py-1 rounded-full select-all">
            {roomId}
          </span>
          <button
            type="button"
            onClick={copyCode}
            className="p-1.5 rounded-full bg-panel2 border border-white/10 text-white/70 hover:text-white active:scale-95 transition"
            title="Copy Code"
          >
            {copiedCode ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
          </button>
        </div>

        {/* Action Buttons */}
        <div className="mt-5 space-y-2.5">
          {qrUrl && (
            <a
              href={qrUrl}
              download={`tunetogether-room-${roomId}.png`}
              className="w-full py-3 rounded-full bg-green-500 text-black font-extrabold text-xs flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(34,197,94,0.4)] hover:brightness-110 active:scale-95 transition"
            >
              <span>📥 Download QR Code</span>
            </a>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={copyLink}
              className="flex-1 py-2.5 rounded-full bg-panel2 border border-white/10 text-white font-bold text-xs hover:bg-white/10 active:scale-95 transition flex items-center justify-center gap-1.5"
            >
              {copiedLink ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
              <span>{copiedLink ? 'Link Copied!' : 'Copy Link'}</span>
            </button>

            <a
              href={`https://wa.me/?text=${encodeURIComponent(`Join my room on TuneTogether! 🎧\nRoom: ${roomId}\nLink: ${roomLink}`)}`}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2.5 rounded-full bg-[#25D366] text-black font-extrabold text-xs active:scale-95 transition hover:brightness-105 flex items-center justify-center gap-1.5 shadow"
            >
              <span>WhatsApp</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
