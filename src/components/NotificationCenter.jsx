import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getNotifications, markNotificationsRead } from '../lib/userData';

export default function NotificationCenter({ user }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const panelRef = useRef(null);
  const nav = useNavigate();

  useEffect(() => {
    if (!user) return;
    setNotifications(getNotifications(user.uid));
  }, [user]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [open]);

  const unreadCount = notifications.filter((n) => n.unread).length;

  const handleMarkRead = () => {
    if (!user) return;
    const updated = markNotificationsRead(user.uid);
    setNotifications(updated);
  };

  const handleJoin = (roomId) => {
    setOpen(false);
    nav(`/room/${roomId}`);
  };

  return (
    <div ref={panelRef} className="relative">
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative w-10 h-10 rounded-full bg-panel border border-white/10 flex items-center justify-center text-white/80 hover:text-white active:scale-95 transition"
        title="Notifications"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-green-500 text-black font-extrabold text-[10px] flex items-center justify-center shadow-[0_0_8px_rgba(34,197,94,0.8)] animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-88 bg-panel border border-white/10 rounded-2xl shadow-2xl p-4 z-50 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white">Notifications</span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full border border-green-500/30">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkRead}
                className="text-[11px] text-green-400 hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-72 overflow-y-auto space-y-2.5 pr-1">
            {notifications.length === 0 ? (
              <p className="text-center text-xs text-white/40 py-6">No notifications yet.</p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-3 rounded-xl border text-xs transition ${
                    n.unread
                      ? 'bg-green-500/10 border-green-500/30 text-white'
                      : 'bg-panel2/60 border-white/5 text-white/70'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-bold text-white text-[12px]">{n.title}</p>
                    <span className="text-[9px] text-white/40 shrink-0">
                      {n.timestamp ? new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                  <p className="text-white/60 mt-0.5 leading-relaxed">{n.body}</p>

                  {n.roomId && (
                    <button
                      type="button"
                      onClick={() => handleJoin(n.roomId)}
                      className="mt-2.5 w-full py-1.5 rounded-full bg-green-500 text-black font-extrabold text-[11px] hover:brightness-110 active:scale-95 transition flex items-center justify-center gap-1.5 shadow"
                    >
                      <span>Join Room ({n.roomId})</span>
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
