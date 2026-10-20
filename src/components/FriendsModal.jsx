import { useState, useEffect, useMemo, useCallback } from 'react';
import { ref, onValue, remove } from '../lib/db';
import { db } from '../firebase';
import {
  getFriendsList,
  subscribeToFriends,
  removeFriend,
  lookupUserByCodeOrId,
  registerUserDirectory,
  getFriendCode,
  sendRoomInvite,
  sendFriendRequest,
  acceptFriendRequest,
  updateNotificationStatus,
  subscribeToNotifications,
  getBrowserNotificationPermission,
  requestBrowserNotificationPermission,
} from '../lib/userData';

export default function FriendsModal({
  user,
  currentRoomId,
  people = [],
  isHost = false,
  kickedUsers = {},
  onClose,
}) {
  const [friends, setFriends] = useState([]);
  const [presenceMap, setPresenceMap] = useState({});
  const [pendingRequests, setPendingRequests] = useState([]);
  const [friendCodeInput, setFriendCodeInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [msg, setMsg] = useState('');
  const [isError, setIsError] = useState(false);
  const [searching, setSearching] = useState(false);
  const [permState, setPermState] = useState(() => getBrowserNotificationPermission());
  const [roomHostId, setRoomHostId] = useState(null);
  const [liveKickedUsers, setLiveKickedUsers] = useState(kickedUsers || {});

  // Subscribe to real-time room host & kicked users state if currentRoomId is provided
  useEffect(() => {
    if (!currentRoomId) return;
    const unsubHost = onValue(ref(db, `rooms/${currentRoomId}/hostId`), (snap) => {
      setRoomHostId(snap.val());
    });
    const unsubKicked = onValue(ref(db, `rooms/${currentRoomId}/kickedUsers`), (snap) => {
      setLiveKickedUsers(snap.val() || {});
    });
    return () => {
      unsubHost();
      unsubKicked();
    };
  }, [currentRoomId]);

  const isRoomHost = isHost || (user?.uid && roomHostId === user.uid);

  const myCode = getFriendCode(user?.uid);

  useEffect(() => {
    if (!user) return;
    registerUserDirectory(user).catch(() => {});
    // Realtime subscription to friends list
    const unsubFriends = subscribeToFriends(user.uid, (list) => {
      setFriends(list);
    });

    // Realtime subscription to pending friend requests
    const unsubNotifs = subscribeToNotifications(user.uid, (list) => {
      const pending = list.filter(
        (n) => n.type === 'friend_request' && n.status === 'pending'
      );
      setPendingRequests(pending);
    });

    return () => {
      unsubFriends();
      unsubNotifs();
    };
  }, [user]);

  // Real-time subscription to each friend's online presence
  useEffect(() => {
    if (!friends || friends.length === 0) return;
    const unsubs = [];
    friends.forEach((f) => {
      if (!f?.uid) return;
      const pRef = ref(db, `users/${f.uid}/presence`);
      const unsub = onValue(pRef, (snap) => {
        const val = snap.val();
        setPresenceMap((prev) => ({
          ...prev,
          [f.uid]: val,
        }));
      });
      unsubs.push(unsub);
    });

    return () => {
      unsubs.forEach((u) => {
        try {
          u();
        } catch {}
      });
    };
  }, [friends]);

  // Check if a friend is actually online right now
  const isFriendOnline = useCallback(
    (friend) => {
      if (!friend?.uid) return false;
      // If already connected inside the same room:
      if (people.some((p) => p.uid === friend.uid)) return true;
      // Live Firebase presence:
      const p = presenceMap[friend.uid];
      return Boolean(p && p.online === true);
    },
    [people, presenceMap]
  );

  // Sort friends: Online friends at the top
  const sortedFriends = useMemo(() => {
    return [...friends].sort((a, b) => {
      const aOn = isFriendOnline(a);
      const bOn = isFriendOnline(b);
      if (aOn === bOn) return (a.name || '').localeCompare(b.name || '');
      return aOn ? -1 : 1;
    });
  }, [friends, isFriendOnline]);

  const copyMyCode = () => {
    navigator.clipboard.writeText(myCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRequestPermission = async () => {
    const res = await requestBrowserNotificationPermission();
    setPermState(res);
  };

  const handleAddFriend = async (e) => {
    e.preventDefault();
    const raw = friendCodeInput.trim();
    if (!raw) return;

    const normalized = raw.toUpperCase();
    const withPrefix = normalized.startsWith('TT-') ? normalized : `TT-${normalized}`;

    // 1. Self check
    if (
      withPrefix === myCode ||
      raw === user?.uid ||
      (user?.email && raw.toLowerCase() === user.email.toLowerCase())
    ) {
      setIsError(true);
      setMsg('You cannot send a friend request to yourself!');
      return;
    }

    setSearching(true);
    setIsError(false);
    setMsg('Searching user directory…');

    try {
      const found = await lookupUserByCodeOrId(raw, people);
      if (!found || !found.uid) {
        setIsError(true);
        setMsg(`❌ User not found! No user exists with code "${raw}". Please check the Friend Code.`);
        return;
      }

      if (found.uid === user.uid) {
        setIsError(true);
        setMsg('You cannot send a friend request to yourself!');
        return;
      }

      const already = friends.some(
        (f) => f.uid === found.uid || f.friendCode === found.friendCode
      );
      if (already) {
        setIsError(true);
        setMsg(`"${found.name}" is already in your friends list!`);
        return;
      }

      const res = await sendFriendRequest(user, found);
      if (res.success) {
        setFriendCodeInput('');
        setIsError(false);
        setMsg(`Friend request sent to ${found.name}! 🚀 (They received a notification to accept)`);
        setTimeout(() => setMsg(''), 5000);
      } else if (res.reason === 'ALREADY_FRIENDS') {
        setIsError(true);
        setMsg(`"${found.name}" is already your friend!`);
      } else {
        setIsError(true);
        setMsg('Could not send friend request. Please try again.');
      }
    } catch (err) {
      setIsError(true);
      if (err?.message === 'FIREBASE_PERMISSION_DENIED') {
        setMsg('⚠️ Firebase Database rules need to be updated in Firebase Console. Please update database.rules.json in Firebase Console.');
      } else {
        setMsg('Failed to find user. Please check the code.');
      }
    } finally {
      setSearching(false);
    }
  };

  const handleAcceptRequest = async (notif) => {
    await acceptFriendRequest(user, notif);
    setMsg(`Accepted ${notif.senderName}'s friend request! 🎉 You are now friends.`);
    setIsError(false);
    setTimeout(() => setMsg(''), 4000);
  };

  const handleDeclineRequest = (notif) => {
    updateNotificationStatus(user.uid, notif.id, 'declined');
    setMsg(`Declined request.`);
    setIsError(false);
    setTimeout(() => setMsg(''), 2500);
  };

  const handleRemoveFriend = (friendUid) => {
    const updated = removeFriend(user.uid, friendUid);
    setFriends(updated);
  };

  const inviteFriend = async (friend) => {
    if (!currentRoomId || !friend?.uid) return;
    const isKicked = Boolean(liveKickedUsers && liveKickedUsers[friend.uid]);
    if (isKicked && !isRoomHost) {
      setMsg(`🚫 ${friend.name} was removed by the host. Only the host can re-invite them.`);
      setIsError(true);
      setTimeout(() => setMsg(''), 4000);
      return;
    }
    if (!isFriendOnline(friend)) {
      setMsg(`⚠️ ${friend.name} is currently offline. You can only invite friends who are online!`);
      setIsError(true);
      setTimeout(() => setMsg(''), 3500);
      return;
    }
    try {
      await sendRoomInvite(user, friend.uid, currentRoomId);
      setMsg(`Room invite sent to ${friend.name}! 🚀`);
      setIsError(false);
    } catch {
      setMsg(`Could not send invite to ${friend.name}.`);
      setIsError(true);
    }
    setTimeout(() => setMsg(''), 3000);
  };

  const reInviteFriend = async (friend) => {
    if (!currentRoomId || !friend?.uid) return;
    try {
      // 1. Host unblocks user
      await remove(ref(db, `rooms/${currentRoomId}/kickedUsers/${friend.uid}`));
      // 2. Host sends room invite
      await sendRoomInvite(user, friend.uid, currentRoomId);
      setMsg(`Unblocked & re-invited ${friend.name} back to the room! 🎉`);
      setIsError(false);
    } catch {
      setMsg(`Could not re-invite ${friend.name}.`);
      setIsError(true);
    }
    setTimeout(() => setMsg(''), 3500);
  };


  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-md max-h-[92vh] overflow-y-auto bg-panel border border-white/10 rounded-3xl p-4 sm:p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
        {/* Close Button */}
        <button
          onClick={onClose}
          type="button"
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-panel2 text-white/60 hover:text-white flex items-center justify-center transition"
        >
          ✕
        </button>

        {/* Title */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">👥</span>
          <div>
            <h2 className="text-lg font-extrabold text-white">Friends System</h2>
            <p className="text-xs text-white/50">Listen in sync with your squad</p>
          </div>
        </div>

        {/* Permission Banner if default */}
        {permState === 'default' && (
          <div className="bg-gradient-to-r from-green-500/15 to-emerald-500/10 border border-green-500/30 rounded-2xl p-3 mb-4 flex items-center justify-between gap-2.5">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>🔔</span> Browser Notifications
              </p>
              <p className="text-[10.5px] text-white/70 mt-0.5">
                Enable notifications to get alerted when friends accept or invite you.
              </p>
            </div>
            <button
              onClick={handleRequestPermission}
              type="button"
              className="px-3 py-1.5 rounded-full bg-green-500 text-black font-extrabold text-[11px] active:scale-95 transition hover:brightness-110 shadow shrink-0"
            >
              Enable
            </button>
          </div>
        )}

        {/* My Friend Code Box */}
        <div className="bg-panel2/80 border border-green-500/30 rounded-2xl p-3.5 mb-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-bold text-green-400 tracking-wider">Your Friend Code</p>
            <p className="text-base font-extrabold font-mono text-white mt-0.5">{myCode}</p>
          </div>
          <button
            onClick={copyMyCode}
            type="button"
            className="px-4 py-2 rounded-full bg-green-500 text-black font-extrabold text-xs active:scale-95 transition hover:brightness-110 shadow"
          >
            {copied ? 'Copied! ✓' : 'Copy Code'}
          </button>
        </div>

        {/* Add Friend Form */}
        <form onSubmit={handleAddFriend} className="flex gap-2 mb-4">
          <input
            value={friendCodeInput}
            onChange={(e) => setFriendCodeInput(e.target.value)}
            placeholder="Enter friend's Code (e.g. TT-A1B2C3)…"
            className="flex-1 bg-panel2 border border-white/10 rounded-full px-4 py-2.5 text-xs text-white outline-none focus:border-green-500 placeholder:text-white/35 transition"
          />
          <button
            type="submit"
            disabled={!friendCodeInput.trim() || searching}
            className="px-4 py-2.5 rounded-full bg-panel2 border border-white/10 font-bold text-xs text-white hover:bg-white/10 active:scale-95 transition disabled:opacity-40 flex items-center gap-1.5"
          >
            {searching ? (
              <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'Add Friend'
            )}
          </button>
        </form>

        {msg && (
          <div
            className={`text-xs text-center font-medium py-2 px-3 rounded-xl mb-4 transition border ${
              isError
                ? 'bg-red-500/10 border-red-500/30 text-red-300'
                : 'bg-green-500/10 border-green-500/20 text-green-400'
            }`}
          >
            {msg}
          </div>
        )}


        {/* Pending Friend Requests if any */}
        {pendingRequests.length > 0 && (
          <div className="mb-5 bg-green-500/10 border border-green-500/30 rounded-2xl p-3.5 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-green-400 mb-2.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span>📬</span>
                <span>Incoming Friend Requests</span>
              </span>
              <span className="text-[10px] bg-green-500 text-black px-2 py-0.5 rounded-full font-extrabold">
                {pendingRequests.length}
              </span>
            </h3>
            <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
              {pendingRequests.map((req) => (
                <div
                  key={req.id}
                  className="bg-black/40 border border-white/5 rounded-xl p-2.5 flex items-center justify-between gap-2.5"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <img
                      src={req.senderPhoto || `https://api.dicebear.com/7.x/bottts/svg?seed=${req.senderUid}`}
                      alt=""
                      className="w-8 h-8 rounded-full border border-green-400/60 shrink-0 object-cover"
                    />
                    <div className="min-w-0">
                      <p className="font-bold text-xs text-white truncate">{req.senderName}</p>
                      <p className="text-[10px] text-white/50 truncate font-mono">
                        {req.senderCode || ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleAcceptRequest(req)}
                      className="px-3 py-1 rounded-full bg-green-500 text-black font-extrabold text-[11px] hover:brightness-110 active:scale-95 transition shadow"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeclineRequest(req)}
                      className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white/60 hover:text-white font-bold text-[11px] transition"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Friends List */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white/60">
              Your Friends ({friends.length})
            </h3>
            {friends.length > 0 && (
              <span className="text-[11px] font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full">
                {friends.filter(isFriendOnline).length} Online
              </span>
            )}
          </div>
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {sortedFriends.length === 0 ? (
              <p className="text-center text-xs text-white/40 py-6">No friends added yet. Share your code!</p>
            ) : (
              sortedFriends.map((f) => {
                const on = isFriendOnline(f);
                const inRoom = Boolean(currentRoomId && people.some((p) => p.uid === f.uid));
                const isKicked = Boolean(currentRoomId && liveKickedUsers && liveKickedUsers[f.uid]);

                return (
                  <div
                    key={f.uid}
                    className={`border rounded-2xl p-3 flex items-center justify-between gap-3 transition ${
                      on
                        ? 'bg-panel2/80 border-white/10 hover:border-green-500/30'
                        : 'bg-panel2/30 border-white/5 opacity-70'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative">
                        <img
                          src={f.photo || `https://api.dicebear.com/7.x/bottts/svg?seed=${f.uid}`}
                          alt=""
                          className={`w-9 h-9 rounded-full border ${on ? 'border-green-400/50' : 'border-white/10 grayscale-[35%]'}`}
                        />
                        <span
                          className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-panel ${
                            on ? 'bg-green-400 animate-pulse' : 'bg-white/30'
                          }`}
                        />
                      </div>
                      <div className="min-w-0">
                        <p className={`font-bold text-xs truncate ${on ? 'text-white' : 'text-white/70'}`}>
                          {f.name}
                        </p>
                        <p className="text-[10px] truncate">
                          {on ? (
                            <span className="text-green-400 font-medium">
                              {inRoom ? '🎧 In this room' : '● Online'}
                            </span>
                          ) : (
                            <span className="text-white/40 font-medium">Offline</span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {currentRoomId && (
                        inRoom ? (
                          <span className="text-[10.5px] font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-2.5 py-1 rounded-full">
                            In Room ✓
                          </span>
                        ) : isKicked ? (
                          isRoomHost ? (
                            <button
                              type="button"
                              onClick={() => reInviteFriend(f)}
                              className="px-3 py-1.5 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 text-black font-extrabold text-[10.5px] hover:brightness-110 active:scale-95 transition shadow-[0_0_12px_rgba(34,197,94,0.4)] flex items-center gap-1"
                              title="Unblock user and invite them back to the room"
                            >
                              Re-invite 🔄
                            </button>
                          ) : (
                            <span
                              className="text-[10px] font-bold text-red-400/90 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-full cursor-not-allowed"
                              title="This friend was removed by the room host. Only the host can re-invite them."
                            >
                              🚫 Removed by Host
                            </span>
                          )
                        ) : on ? (
                          <button
                            type="button"
                            onClick={() => inviteFriend(f)}
                            className="px-3.5 py-1.5 rounded-full bg-green-500 text-black font-extrabold text-[11px] hover:brightness-110 active:scale-95 transition shadow-[0_0_12px_rgba(34,197,94,0.4)]"
                          >
                            Invite 🚀
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled
                            title="Cannot invite: Friend is currently offline"
                            className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/30 font-bold text-[11px] cursor-not-allowed"
                          >
                            Offline
                          </button>
                        )
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveFriend(f.uid)}
                        className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 text-white/40 hover:text-red-400 flex items-center justify-center text-xs transition"
                        title="Remove Friend"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
