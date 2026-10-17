import { useState, useEffect } from 'react';
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

export default function FriendsModal({ user, currentRoomId, people = [], onClose }) {
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [friendCodeInput, setFriendCodeInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [msg, setMsg] = useState('');
  const [isError, setIsError] = useState(false);
  const [searching, setSearching] = useState(false);
  const [permState, setPermState] = useState(() => getBrowserNotificationPermission());

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


  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-panel border border-white/10 rounded-3xl p-5 sm:p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
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
                <span>🔔</span> ব্রাউজার নোটিফিকেশন
              </p>
              <p className="text-[10.5px] text-white/70 mt-0.5">
                ফ্রেন্ড রিকোয়েস্ট ও রুম ইনভাইট সরাসরি পেতে পারমিশন চালু করুন।
              </p>
            </div>
            <button
              onClick={handleRequestPermission}
              type="button"
              className="px-3 py-1.5 rounded-full bg-green-500 text-black font-extrabold text-[11px] active:scale-95 transition hover:brightness-110 shadow shrink-0"
            >
              চালু করুন
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
          <h3 className="text-xs font-bold uppercase tracking-wider text-white/60 mb-2.5">
            Your Friends ({friends.length})
          </h3>
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {friends.length === 0 ? (
              <p className="text-center text-xs text-white/40 py-6">No friends added yet. Share your code!</p>
            ) : (
              friends.map((f) => (
                <div
                  key={f.uid}
                  className="bg-panel2/60 border border-white/5 rounded-2xl p-3 flex items-center justify-between gap-3 hover:border-white/10 transition"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative">
                      <img
                        src={f.photo}
                        alt=""
                        className="w-9 h-9 rounded-full border border-white/10"
                      />
                      <span
                        className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-panel ${
                          f.status === 'online' ? 'bg-green-400 animate-pulse' : 'bg-white/30'
                        }`}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-xs text-white truncate">{f.name}</p>
                      <p className="text-[10px] text-white/50 truncate">
                        {f.status === 'online' ? `🎧 ${f.listeningTo || 'Listening'}` : 'Offline'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {currentRoomId && (
                      <button
                        type="button"
                        onClick={() => inviteFriend(f)}
                        className="px-3 py-1.5 rounded-full bg-green-500/20 border border-green-500/40 text-green-300 font-bold text-[11px] hover:bg-green-500 hover:text-black active:scale-95 transition"
                      >
                        Invite
                      </button>
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

              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
