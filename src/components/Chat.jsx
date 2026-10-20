import { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { ref, push, onValue, serverTimestamp } from '../lib/db';
import { checkRateLimit, sanitizeInput } from '../lib/security';

export default function Chat({ roomId, user, isHost = false, allowGuestChat = true }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [spamNotice, setSpamNotice] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!roomId) return;
    const chatRef = ref(db, `rooms/${roomId}/chat`);
    const unsub = onValue(chatRef, (snap) => {
      const data = snap.val();
      if (!data) {
        setMessages([]);
        return;
      }
      const list = Object.entries(data)
        .map(([key, val]) => ({ key, ...val }))
        .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      setMessages(list);
    });
    return unsub;
  }, [roomId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const sendMessage = async (e) => {
    e?.preventDefault();
    const clean = sanitizeInput(text, 450);
    if (!clean || sending) return;

    if (!isHost && allowGuestChat === false) {
      setSpamNotice('The host has paused live chat for guests.');
      setTimeout(() => setSpamNotice(''), 3000);
      return;
    }

    // Spam Protection check
    const rateCheck = checkRateLimit('chat', 1200, 5, 10000);
    if (!rateCheck.allowed) {
      setSpamNotice(`🛡️ ${rateCheck.reason}`);
      setTimeout(() => setSpamNotice(''), 3500);
      return;
    }

    setSending(true);

    const msg = {
      senderUid: user.uid,
      senderName: user.displayName || 'Music Fan',
      senderPhoto: user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`,
      text: clean,
      createdAt: serverTimestamp(),
    };

    try {
      await push(ref(db, `rooms/${roomId}/chat`), msg);
      setText('');
      setSpamNotice('');
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  const sendQuick = (txt) => {
    setText(txt);
  };

  return (
    <div className="flex flex-col h-[420px] bg-[#0A100D] border border-white/[0.08] rounded-3xl overflow-hidden shadow-2xl">
      {/* Chat Header */}
      <div className="px-4 py-3 bg-[#101814] border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#00FF87] animate-pulse shadow-neon-sm" />
          <h3 className="font-bold text-xs uppercase tracking-wider text-[#F5F7F5]">Live Room Chat</h3>
        </div>
        <span className="text-[11px] text-[#9AA59F]">{messages.length} messages</span>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-[#9AA59F]/60">
            <span className="text-3xl mb-1">💬</span>
            <p className="text-xs font-medium">No messages yet.</p>
            <p className="text-[11px] text-white/30">Say hi to everyone in the room!</p>
          </div>
        ) : (
          messages.map((m) => {
            const isMe = m.senderUid === user.uid;
            return (
              <div key={m.key} className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                {!isMe && (
                  <img
                    src={m.senderPhoto || `https://api.dicebear.com/7.x/bottts/svg?seed=${m.senderUid}`}
                    alt=""
                    className="w-6 h-6 rounded-full border border-white/10 shrink-0 mb-1"
                  />
                )}
                <div
                  className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                    isMe
                      ? 'bg-[#00FF87] text-black font-semibold rounded-br-none shadow-neon-sm'
                      : 'bg-[#101814] border border-white/[0.08] text-[#F5F7F5] rounded-bl-none shadow'
                  }`}
                >
                  {!isMe && (
                    <p className="text-[10px] font-bold text-[#00FF87] mb-0.5 truncate">{m.senderName}</p>
                  )}
                  <p className="break-words select-text">{m.text}</p>
                  <p
                    className={`text-[9px] mt-1 text-right ${
                      isMe ? 'text-black/60 font-semibold' : 'text-[#9AA59F]'
                    }`}
                  >
                    {m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'now'}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick chips */}
      <div className="px-3 py-1.5 flex gap-1.5 overflow-x-auto border-t border-white/[0.06] bg-[#101814]/70 no-scrollbar">
        {['🎵 Love this song!', '🔥 Volume up!', '👏 Next song please', '❤️ Vibes!'].map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => sendQuick(q)}
            className="text-[10px] px-2.5 py-1 rounded-full bg-white/[0.04] hover:bg-white/10 text-white/70 whitespace-nowrap active:scale-95 transition border border-white/[0.05]"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Spam & Security Warning Banner */}
      {spamNotice && (
        <div className="px-3 py-1.5 bg-amber-500/15 border-t border-amber-500/30 text-amber-300 text-[11px] font-semibold text-center animate-pulse">
          {spamNotice}
        </div>
      )}

      {/* Message Input Form */}
      {!isHost && allowGuestChat === false ? (
        <div className="p-3 bg-[#101814] border-t border-white/[0.08] text-center text-xs text-[#9AA59F]">
          🔒 The host has paused live chat for listeners.
        </div>
      ) : (
        <form onSubmit={sendMessage} className="p-2.5 bg-[#101814] border-t border-white/[0.08] flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={450}
            placeholder="Send a message to everyone…"
            className="flex-1 bg-[#0A100D] border border-white/[0.08] rounded-full px-4 py-2 text-xs text-[#F5F7F5] outline-none focus:border-[#00FF87] placeholder:text-white/35 transition"
          />
          <button
            type="submit"
            disabled={!text.trim() || sending}
            className="px-4 py-2 rounded-full bg-[#00FF87] hover:bg-[#00C96B] text-black font-bold text-xs active:scale-95 transition disabled:opacity-40 shadow-neon-sm"
          >
            Send
          </button>
        </form>
      )}
    </div>
  );
}
