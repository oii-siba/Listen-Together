import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  subscribeToNotifications,
  markNotificationsRead,
  markNotificationAsRead,
  subscribeToRoomActivity,
  playNotificationChime,
  acceptFriendRequest,
  updateNotificationStatus,
  getBrowserNotificationPermission,
  requestBrowserNotificationPermission,
  showNativeNotification,
} from '../lib/userData';

function parseNotificationTimestamp(raw) {
  if (!raw) return null;
  if (typeof raw === 'number') {
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof raw === 'string') {
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof raw === 'object') {
    if (typeof raw.toMillis === 'function') {
      const d = new Date(raw.toMillis());
      return isNaN(d.getTime()) ? null : d;
    }
    if (typeof raw.toDate === 'function') {
      const d = raw.toDate();
      return isNaN(d?.getTime?.()) ? null : d;
    }
    if (typeof raw.seconds === 'number') {
      const d = new Date(raw.seconds * 1000);
      return isNaN(d.getTime()) ? null : d;
    }
  }
  return null;
}

function formatNotificationDateTime(timestamp) {
  const d = parseNotificationTimestamp(timestamp);
  if (!d) return null;

  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();

  const isCurrentYear = d.getFullYear() === now.getFullYear();

  let dateStr = '';
  if (isToday) {
    dateStr = 'Today';
  } else if (isYesterday) {
    dateStr = 'Yesterday';
  } else if (isCurrentYear) {
    dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } else {
    dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  const timeStr = d.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const tooltip = d.toLocaleString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return { dateStr, timeStr, tooltip };
}

export default function NotificationCenter({ user, roomId }) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(roomId ? 'activity' : 'invites');
  const [notifications, setNotifications] = useState([]);
  const [roomActivities, setRoomActivities] = useState([]);
  const [activeToast, setActiveToast] = useState(null);
  const [permState, setPermState] = useState(() => getBrowserNotificationPermission());
  const knownIdsRef = useRef(null);
  const isInitialSyncedRef = useRef(false);
  const toastTimerRef = useRef(null);
  const panelRef = useRef(null);
  const nav = useNavigate();

  // Switch default tab if roomId changes
  useEffect(() => {
    if (roomId) {
      setActiveTab('activity');
    }
  }, [roomId]);

  // Check browser notification permission status on mount
  useEffect(() => {
    setPermState(getBrowserNotificationPermission());
  }, []);

  // Subscribe to personal notifications (friend invites, friend requests, etc.)
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeToNotifications(user.uid, (list, initialFbLoaded) => {
      setNotifications(list);

      // On initial sync, register all existing notifications as known so they NEVER trigger repeated toasts on app open
      if (!isInitialSyncedRef.current) {
        if (initialFbLoaded) {
          isInitialSyncedRef.current = true;
          knownIdsRef.current = new Set(list.map((n) => n.id));

          // Only show toast on app open if a notification arrived very recently (last 15 seconds) AND was never seen
          const veryRecent = list.find(
            (n) =>
              n.unread &&
              !n.seen &&
              n.timestamp &&
              Date.now() - n.timestamp < 15000 &&
              (n.roomId || n.type === 'friend_request' || n.type === 'friend_accepted')
          );
          if (veryRecent) {
            setActiveToast(veryRecent);
            markNotificationAsRead(user.uid, veryRecent.id);
            playNotificationChime();
            clearTimeout(toastTimerRef.current);
            toastTimerRef.current = setTimeout(() => {
              setActiveToast(null);
            }, 8000);
          }
        } else {
          if (!knownIdsRef.current) knownIdsRef.current = new Set();
          list.forEach((n) => knownIdsRef.current.add(n.id));
        }
        return;
      }

      // Detect genuinely NEW notifications arriving live while the app is actively running
      const newAlerts = list.filter(
        (n) =>
          n.unread &&
          !n.seen &&
          knownIdsRef.current &&
          !knownIdsRef.current.has(n.id) &&
          (n.roomId || n.type === 'friend_request' || n.type === 'friend_accepted')
      );

      // Update known IDs set
      if (knownIdsRef.current) {
        list.forEach((n) => knownIdsRef.current.add(n.id));
      }

      if (newAlerts.length > 0) {
        const latest = newAlerts[0];
        setActiveToast(latest);
        // Mark as seen and read immediately in Firebase so re-opening the app later NEVER triggers it again
        markNotificationAsRead(user.uid, latest.id);
        playNotificationChime();

        // Native Browser Notification (OS / desktop level banner)
        const nativeTitle =
          latest.type === 'friend_request'
            ? `👥 Friend Request: ${latest.senderName}`
            : latest.type === 'friend_accepted'
            ? `🎉 Friend Connected: ${latest.senderName}`
            : `🎧 Room Invite: ${latest.senderName}`;

        showNativeNotification(nativeTitle, {
          body:
            latest.body ||
            (latest.roomId ? `Click to join room "${latest.roomId}"` : 'Open TuneTogether to view'),
          icon: latest.senderPhoto || '/logo.png',
          onClick: () => {
            if (latest.roomId) {
              handleJoin(latest.roomId, latest.id);
            } else {
              setOpen(true);
              setActiveTab('invites');
            }
          },
        });

        clearTimeout(toastTimerRef.current);
        toastTimerRef.current = setTimeout(() => {
          setActiveToast(null);
        }, 10000);
      }
    });
    return unsub;
  }, [user?.uid]);

  // Subscribe to live room activity when roomId is available
  useEffect(() => {
    if (!roomId) {
      setRoomActivities([]);
      return;
    }
    const unsub = subscribeToRoomActivity(roomId, (activities) => {
      setRoomActivities(activities);
    });
    return unsub;
  }, [roomId]);

  // Click outside to close dropdown
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

  const handleMarkRead = async () => {
    if (!user?.uid) return;
    const updated = await markNotificationsRead(user.uid);
    setNotifications(updated);
  };

  const handleJoin = (targetRoomId, notifId = null) => {
    const id = notifId || activeToast?.id;
    if (id && user?.uid) {
      markNotificationAsRead(user.uid, id);
    }
    setOpen(false);
    setActiveToast(null);
    nav(`/room/${targetRoomId}`);
  };

  const handleDismissToast = () => {
    if (activeToast?.id && user?.uid) {
      markNotificationAsRead(user.uid, activeToast.id);
    }
    setActiveToast(null);
  };

  const handleAccept = async (notif) => {
    if (!user) return;
    await acceptFriendRequest(user, notif);
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, status: 'accepted', unread: false, seen: true } : n))
    );
    if (activeToast?.id === notif.id) {
      setActiveToast((prev) => (prev ? { ...prev, accepted: true } : null));
      setTimeout(() => setActiveToast(null), 2500);
    }
  };

  const handleDecline = (notif) => {
    if (!user) return;
    updateNotificationStatus(user.uid, notif.id, 'declined');
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, status: 'declined', unread: false, seen: true } : n))
    );
    if (activeToast?.id === notif.id) {
      setActiveToast(null);
    }
  };

  const handleRequestPermission = async () => {
    const res = await requestBrowserNotificationPermission();
    setPermState(res);
    if (res === 'granted') {
      playNotificationChime();
      showNativeNotification('🔔 Notifications Enabled!', {
        body: 'TuneTogether will now alert you when friends invite you to rooms or send friend requests.',
      });
    }
  };

  const toggleOpen = () => {
    setOpen((prev) => {
      const next = !prev;
      if (next && unreadCount > 0) {
        setActiveTab('invites');
        handleMarkRead();
      }
      return next;
    });
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'join':
        return '🎧';
      case 'leave':
        return '👋';
      case 'song_added':
        return '🎵';
      case 'now_playing':
        return '▶️';
      case 'reaction':
        return '❤️';
      default:
        return '⚡';
    }
  };

  return (
    <>
      {/* Instant Floating Banner Toast when an invite or friend request arrives */}
      {activeToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[300] max-w-sm w-[92vw] bg-black/95 border-2 border-green-400 rounded-2xl p-3.5 shadow-[0_0_30px_rgba(34,197,94,0.7)] backdrop-blur-xl animate-in slide-in-from-top-4 duration-200 flex items-center justify-between gap-3">
          <img
            src={activeToast.senderPhoto || `https://api.dicebear.com/7.x/bottts/svg?seed=${activeToast.senderUid}`}
            alt=""
            className="w-10 h-10 rounded-full border-2 border-green-400 shrink-0 object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-extrabold text-white truncate">
              {activeToast.type === 'friend_request'
                ? `${activeToast.senderName} sent a friend request! 👥`
                : activeToast.type === 'friend_accepted'
                ? `${activeToast.senderName} accepted your request! 🎉`
                : `${activeToast.senderName} invited you! 🎧`}
            </p>
            <p className="text-[11px] text-white/70 truncate">
              {activeToast.type === 'friend_request'
                ? `Code: ${activeToast.senderCode || 'Friend'}`
                : activeToast.type === 'friend_accepted'
                ? 'You are now friends!'
                : `Room: ${activeToast.roomId}`}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {activeToast.type === 'friend_request' ? (
              activeToast.accepted ? (
                <span className="text-xs font-extrabold text-green-400 bg-green-500/20 px-3 py-1.5 rounded-full">
                  Friends ✓
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleAccept(activeToast)}
                  className="px-3.5 py-1.5 rounded-full bg-green-500 text-black font-extrabold text-xs active:scale-95 transition shadow-lg hover:brightness-110"
                >
                  Accept
                </button>
              )
            ) : activeToast.roomId ? (
              <button
                type="button"
                onClick={() => handleJoin(activeToast.roomId, activeToast.id)}
                className="px-3.5 py-1.5 rounded-full bg-green-500 text-black font-extrabold text-xs active:scale-95 transition shadow-lg hover:brightness-110"
              >
                Join Now
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleDismissToast}
              className="text-white/40 hover:text-white p-1 text-xs"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div ref={panelRef} className="relative">
        {/* Bell Button */}
        <button
          type="button"
          onClick={toggleOpen}
          className="relative w-10 h-10 rounded-full bg-panel border border-white/10 flex items-center justify-center text-white/80 hover:text-white active:scale-95 transition"
          title="Notifications & Activity"
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
          <>
            {/* Mobile backdrop overlay to tap outside and dismiss */}
            <div
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] sm:hidden"
              onClick={() => setOpen(false)}
            />

            <div className="fixed left-1/2 -translate-x-1/2 top-16 z-50 w-[94vw] max-w-sm sm:absolute sm:left-auto sm:right-0 sm:translate-x-0 sm:top-full sm:mt-2 sm:w-80 md:w-96 max-h-[85vh] overflow-y-auto bg-panel/95 border border-white/15 rounded-2xl shadow-[0_12px_45px_rgba(0,0,0,0.85)] p-4 backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150">
              {/* Browser Notification Permission Banner (if not yet granted) */}
              {permState === 'default' && (
                <div className="mb-3 p-3 rounded-2xl bg-gradient-to-r from-green-500/15 to-emerald-500/10 border border-green-500/30 flex items-center justify-between gap-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">🔔</span>
                      <p className="text-xs font-bold text-white">Browser Notifications</p>
                    </div>
                    <p className="text-[10.5px] text-white/70 mt-0.5 leading-snug">
                      Get instant alerts when friends invite you, even while in another tab.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleRequestPermission}
                    className="px-3 py-1.5 rounded-full bg-green-500 text-black font-extrabold text-[11px] hover:brightness-110 active:scale-95 transition shadow shrink-0"
                  >
                    Enable
                  </button>
                </div>
              )}

              {permState === 'denied' && (
                <div className="mb-3 p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-amber-300 text-[11px]">
                    <span>⚠️</span> Notifications Blocked in Browser
                  </div>
                  <p className="text-[10px] text-white/60 mt-0.5 leading-snug">
                    Click the lock icon (🔒) in your browser address bar and allow Notifications.
                  </p>
                </div>
              )}

              {/* Header with Tabs and Close Button */}
              <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3 gap-2">
                <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/5 min-w-0">
                <button
                  type="button"
                  onClick={() => setActiveTab('invites')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    activeTab === 'invites'
                      ? 'bg-green-500 text-black shadow'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  <span>Requests & Invites</span>
                  {unreadCount > 0 && (
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded-full font-extrabold ${
                        activeTab === 'invites'
                          ? 'bg-black text-green-400'
                          : 'bg-green-500/20 text-green-400'
                      }`}
                    >
                      {unreadCount}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('activity')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    activeTab === 'activity'
                      ? 'bg-green-500 text-black shadow'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  <span>Room Activity</span>
                  {roomId && (
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  )}
                </button>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {activeTab === 'invites' && unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkRead}
                    className="text-[11px] text-green-400 hover:underline shrink-0 font-medium"
                  >
                    Mark read
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/15 text-white/60 hover:text-white flex items-center justify-center text-xs transition active:scale-95"
                  aria-label="Close"
                  title="Close"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Tab 1: Invites & Personal Notifications */}
            {activeTab === 'invites' && (
              <div className="max-h-72 overflow-y-auto space-y-2.5 pr-1">
                {notifications.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-2xl mb-1">📬</p>
                    <p className="text-xs text-white/50 font-medium">No new invites or requests.</p>
                    <p className="text-[11px] text-white/30 mt-0.5">When friends invite you, they'll appear here.</p>
                  </div>
                ) : (
                  notifications.map((n) => {
                    const dt = formatNotificationDateTime(n.timestamp);
                    return (
                      <div
                        key={n.id}
                        className={`p-3 rounded-xl border text-xs transition ${
                          n.unread
                            ? 'bg-green-500/10 border-green-500/30 text-white'
                            : 'bg-panel2/60 border-white/5 text-white/70'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            {n.senderPhoto && (
                              <img
                                src={n.senderPhoto}
                                alt=""
                                className="w-5 h-5 rounded-full border border-green-400/50 shrink-0 object-cover"
                              />
                            )}
                            <p className="font-bold text-white text-[12px] truncate">{n.title}</p>
                          </div>
                          {dt && (
                            <div
                              className="text-right shrink-0 select-none leading-tight"
                              title={dt.tooltip}
                            >
                              <span
                                className={`text-[10px] font-semibold block sm:inline ${
                                  n.unread ? 'text-green-400' : 'text-white/75'
                                }`}
                              >
                                {dt.dateStr}
                              </span>
                              <span className="hidden sm:inline text-white/30 mx-1">•</span>
                              <span className="text-[9px] text-white/45 block sm:inline">
                                {dt.timeStr}
                              </span>
                            </div>
                          )}
                        </div>
                        <p className="text-white/70 mt-1 leading-relaxed text-[11px]">{n.body}</p>

                        {/* Action Buttons depending on type */}
                        {n.type === 'friend_request' ? (
                          n.status === 'accepted' ? (
                            <div className="mt-2 text-right">
                              <span className="text-[10px] font-bold text-green-400 bg-green-500/15 border border-green-500/30 px-2.5 py-0.5 rounded-full">
                                ✓ Friends now
                              </span>
                            </div>
                          ) : n.status === 'declined' ? (
                            <div className="mt-2 text-right">
                              <span className="text-[10px] font-bold text-white/40 bg-white/5 px-2.5 py-0.5 rounded-full">
                                Declined
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 mt-2.5">
                              <button
                                type="button"
                                onClick={() => handleAccept(n)}
                                className="flex-1 py-1.5 rounded-full bg-green-500 text-black font-extrabold text-[11px] hover:brightness-110 active:scale-95 transition shadow"
                              >
                                Accept Friend
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDecline(n)}
                                className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white font-bold text-[11px] active:scale-95 transition"
                              >
                                Decline
                              </button>
                            </div>
                          )
                        ) : n.type === 'friend_accepted' ? (
                          <div className="mt-2">
                            <span className="text-[10px] font-bold text-green-400 bg-green-500/15 border border-green-500/30 px-2.5 py-0.5 rounded-full">
                              🎉 Connected as friends
                            </span>
                          </div>
                        ) : n.roomId ? (
                          <button
                            type="button"
                            onClick={() => handleJoin(n.roomId, n.id)}
                            className="mt-2.5 w-full py-1.5 rounded-full bg-green-500 text-black font-extrabold text-[11px] hover:brightness-110 active:scale-95 transition flex items-center justify-center gap-1.5 shadow"
                          >
                            <span>Join Room ({n.roomId})</span>
                          </button>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Tab 2: Live Room Activity */}
            {activeTab === 'activity' && (
              <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                {!roomId ? (
                  <div className="text-center py-8">
                    <p className="text-2xl mb-1">🎧</p>
                    <p className="text-xs text-white/50 font-medium">Not currently in a room.</p>
                    <p className="text-[11px] text-white/30 mt-0.5">
                      Join or create a room to see real-time listener joins, songs added, and playback events!
                    </p>
                  </div>
                ) : roomActivities.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-2xl mb-1">🎶</p>
                    <p className="text-xs text-white/50 font-medium">No room activity yet.</p>
                    <p className="text-[11px] text-white/30 mt-0.5">
                      Add a song to the queue or send a reaction to get things rolling!
                    </p>
                  </div>
                ) : (
                  roomActivities.map((act) => {
                    const dt = formatNotificationDateTime(act.timestamp);
                    return (
                      <div
                        key={act.id || act.timestamp}
                        className="p-2.5 rounded-xl bg-panel2/50 border border-white/5 hover:border-green-500/30 transition flex items-start gap-2.5 text-xs"
                      >
                        <div className="w-7 h-7 rounded-full bg-black/50 border border-white/10 flex items-center justify-center shrink-0 text-sm">
                          {getActivityIcon(act.type)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-1">
                            <p className="font-semibold text-white text-[11px] truncate">
                              {act.title || 'Room Update'}
                            </p>
                            {dt && (
                              <div
                                className="text-right shrink-0 select-none leading-tight"
                                title={dt.tooltip}
                              >
                                <span className="text-[9.5px] font-medium text-white/70 block sm:inline">
                                  {dt.dateStr}
                                </span>
                                <span className="hidden sm:inline text-white/30 mx-1">•</span>
                                <span className="text-[8.5px] text-white/40 block sm:inline">
                                  {dt.timeStr}
                                </span>
                              </div>
                            )}
                          </div>
                          <p className="text-white/60 text-[10px] leading-relaxed mt-0.5">
                            {act.body}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Panel Footer: Permission status & toggle */}
            <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    permState === 'granted'
                      ? 'bg-green-400 shadow-[0_0_8px_rgba(34,197,94,0.8)]'
                      : permState === 'denied'
                      ? 'bg-amber-400'
                      : 'bg-white/40'
                  }`}
                />
                <span className="text-[11px] text-white/70 font-medium">
                  {permState === 'granted'
                    ? 'Notifications: Enabled ✓'
                    : permState === 'denied'
                    ? 'Notifications: Blocked'
                    : 'Notifications: Off'}
                </span>
              </div>

              {permState !== 'granted' && permState !== 'unsupported' ? (
                <button
                  type="button"
                  onClick={handleRequestPermission}
                  className="text-[11px] text-green-400 hover:text-green-300 font-bold underline transition"
                >
                  Turn On
                </button>
              ) : (
                <span className="text-[10px] text-white/40">Sound & Banners Active</span>
              )}
            </div>
          </div>
        </>
      )}
    </div>
    </>
  );
}


