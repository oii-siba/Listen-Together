import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { ref, push, onValue } from '../lib/db';
import { checkRateLimit } from '../lib/security';

const EMOJIS = ['❤️', '🔥', '🎶', '😂', '👏', '🚀'];

export default function EmojiReactions({ roomId, user, className = '', isHost = false, allowGuestReactions = true }) {
  const [activeReactions, setActiveReactions] = useState([]);

  // Listen for new reactions from Firebase / local sync
  useEffect(() => {
    if (!roomId) return;
    const reactionsRef = ref(db, `rooms/${roomId}/reactions`);
    const unsub = onValue(reactionsRef, (snap) => {
      const data = snap.val();
      if (!data) return;
      const list = Object.entries(data).map(([key, val]) => ({ key, ...val }));
      // Keep only recent ones within last 5 seconds
      const now = Date.now();
      const fresh = list.filter((r) => now - (r.timestamp || 0) < 5000);
      setActiveReactions(fresh);
    });

    let bc = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        bc = new BroadcastChannel('listen-together-sync');
        bc.onmessage = (e) => {
          if (e.data?.type === 'ROOM_REACTION' && e.data?.roomId === roomId) {
            setActiveReactions((prev) => [...prev, e.data.reaction]);
          }
        };
      } catch {}
    }

    return () => {
      unsub();
      if (bc) bc.close();
    };
  }, [roomId]);

  // Clean up old reactions periodically
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setActiveReactions((prev) => prev.filter((r) => now - (r.timestamp || 0) < 3000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const sendReaction = async (emoji) => {
    if (!roomId) return;
    if (!isHost && allowGuestReactions === false) return;

    // Spam Protection
    const rateCheck = checkRateLimit('reactions', 700, 8, 10000);
    if (!rateCheck.allowed) return;

    const offset = Math.floor(Math.random() * 70) + 15; // random x %
    const reaction = {
      emoji,
      senderName: user?.displayName || 'Friend',
      timestamp: Date.now(),
      xOffset: offset,
      id: Math.random().toString(36).substring(7),
    };

    // Instant local feedback
    setActiveReactions((prev) => [...prev, reaction]);

    // Cross-tab broadcast
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const bc = new BroadcastChannel('listen-together-sync');
        bc.postMessage({ type: 'ROOM_REACTION', roomId, reaction });
      } catch {}
    }

    try {
      await push(ref(db, `rooms/${roomId}/reactions`), reaction);
    } catch {}
  };

  return (
    <>
      {/* Floating Animated Reaction Particles Container - Renders on top of entire screen */}
      <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
        {activeReactions.map((r) => (
          <div
            key={r.key || r.id}
            style={{ left: `${r.xOffset || 50}%`, bottom: '120px' }}
            className="absolute animate-float-reaction flex flex-col items-center"
          >
            <span className="text-4xl filter drop-shadow-[0_0_16px_rgba(0,255,135,0.9)] select-none">
              {r.emoji}
            </span>
            <span className="text-[10px] font-bold text-white bg-black/85 border border-[#00FF87]/40 px-2.5 py-0.5 rounded-full backdrop-blur-md mt-1 shadow-neon-sm whitespace-nowrap">
              {r.senderName}
            </span>
          </div>
        ))}
      </div>

      {/* Emoji Picker Bar */}
      <div className={`relative ${className}`}>
        {!isHost && allowGuestReactions === false ? (
          <div className="flex items-center justify-center gap-1.5 px-3 py-2 bg-[#0A100D]/80 rounded-full border border-white/[0.08] text-[11px] text-[#9AA59F]">
            <span>🔒</span> Host paused emoji reactions
          </div>
        ) : (
          <div className="flex items-center justify-between gap-1.5 px-3.5 py-2 bg-[#0A100D]/90 backdrop-blur-xl rounded-full border border-white/[0.08] shadow-lg">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#00FF87] pl-1 shrink-0 flex items-center gap-1">
              <span>✨</span> React
            </span>
            <div className="flex items-center gap-1 sm:gap-2">
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => sendReaction(emoji)}
                  type="button"
                  className="w-8 h-8 rounded-full bg-white/[0.04] hover:bg-white/15 active:scale-125 hover:scale-110 transition-all flex items-center justify-center text-base"
                  title={`React with ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

