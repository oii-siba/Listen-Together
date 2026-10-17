import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { ref, push, onValue } from '../lib/db';

const EMOJIS = ['❤️', '🔥', '🎶', '😂', '👏', '🚀'];

export default function EmojiReactions({ roomId, user, className = '' }) {
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
    return unsub;
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
    const offset = Math.floor(Math.random() * 70) + 15; // random x %
    const reaction = {
      emoji,
      senderName: user?.displayName || 'Friend',
      timestamp: Date.now(),
      xOffset: offset,
      id: Math.random().toString(36).substring(7),
    };
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
            <span className="text-4xl filter drop-shadow-[0_0_16px_rgba(34,197,94,0.95)] select-none">
              {r.emoji}
            </span>
            <span className="text-[10px] font-bold text-white bg-black/80 border border-green-500/40 px-2 py-0.5 rounded-full backdrop-blur-md mt-1 shadow-xl whitespace-nowrap">
              {r.senderName}
            </span>
          </div>
        ))}
      </div>

      {/* Emoji Picker Bar */}
      <div className={`relative ${className}`}>
        <div className="flex items-center justify-between gap-1.5 px-3 py-2 bg-panel/90 backdrop-blur-md rounded-full border border-white/10 shadow-lg">
          <span className="text-[11px] font-bold uppercase tracking-wider text-green-400 pl-1 shrink-0 flex items-center gap-1">
            <span>✨</span> React
          </span>
          <div className="flex items-center gap-1 sm:gap-2">
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => sendReaction(emoji)}
                type="button"
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 active:scale-125 hover:scale-110 transition-all flex items-center justify-center text-base"
                title={`React with ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

