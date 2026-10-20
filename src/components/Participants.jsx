import { useState, useEffect, useRef } from 'react';
import Avatar from './Avatar';
import { Star, Check } from './Icons';
import { subscribeToFriends, sendFriendRequest } from '../lib/userData';

export default function Participants({ people, hostId, myUid, user, onKick, kickedUsers = {}, onUnban }) {
  const [friends, setFriends] = useState([]);
  const [requestStatus, setRequestStatus] = useState({});
  const [feedback, setFeedback] = useState(null);
  const feedbackTimerRef = useRef(null);

  // Subscribe to current user's friends list
  useEffect(() => {
    if (!myUid) return;
    const unsub = subscribeToFriends(myUid, (list) => {
      setFriends(list || []);
    });
    return unsub;
  }, [myUid]);

  const handleAddFriend = async (p) => {
    if (!user || !user.uid) {
      setFeedback({ type: 'error', text: 'You must be logged in to send friend requests.' });
      return;
    }

    setRequestStatus((prev) => ({ ...prev, [p.uid]: 'sending' }));

    try {
      const res = await sendFriendRequest(user, {
        uid: p.uid,
        name: p.name || 'Friend',
        photo: p.photo || `https://api.dicebear.com/7.x/bottts/svg?seed=${p.uid}`,
      });

      if (res?.success) {
        setRequestStatus((prev) => ({ ...prev, [p.uid]: 'sent' }));
        setFeedback({
          type: 'success',
          text: `Friend request sent to ${p.name || 'listener'}! Once accepted, you'll be friends.`,
        });
      } else if (res?.reason === 'ALREADY_FRIENDS') {
        setRequestStatus((prev) => ({ ...prev, [p.uid]: 'sent' }));
        setFeedback({
          type: 'info',
          text: `You and ${p.name || 'listener'} are already friends.`,
        });
      } else {
        setRequestStatus((prev) => ({ ...prev, [p.uid]: undefined }));
        setFeedback({
          type: 'error',
          text: 'Failed to send friend request. Please try again.',
        });
      }
    } catch (err) {
      console.error('Failed to send friend request:', err);
      setRequestStatus((prev) => ({ ...prev, [p.uid]: undefined }));
      setFeedback({
        type: 'error',
        text: 'An error occurred while sending the friend request.',
      });
    }

    clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => {
      setFeedback(null);
    }, 4500);
  };

  if (!people.length) return <p className="text-sm text-white/45 text-center py-8">Connecting…</p>;

  const isHost = myUid === hostId;
  const kickedEntries = Object.entries(kickedUsers || {}).filter(([_, val]) => val);

  return (
    <div className="space-y-4">
      {/* Feedback banner */}
      {feedback && (
        <div
          className={`flex items-center justify-between text-xs px-3.5 py-2.5 rounded-xl border transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
              : feedback.type === 'info'
              ? 'bg-sky-500/10 text-sky-300 border-sky-500/30'
              : 'bg-red-500/10 text-red-300 border-red-500/30'
          }`}
        >
          <span>{feedback.text}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="ml-2 text-white/50 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Active Listeners */}
      <ul className="space-y-2">
        {people.map((p) => {
          const isMe = p.uid === myUid;
          const isFriend = friends.some((f) => f.uid === p.uid);
          const reqState = requestStatus[p.uid];

          return (
            <li key={p.uid} className="flex items-center gap-3 glass-card rounded-2xl p-3 border border-white/10 hover:border-[#00FF87]/30 transition shadow-sm">
              <Avatar name={p.name} photo={p.photo} size={40} ring={p.uid === hostId} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-[#F5F7F5] truncate flex items-center gap-1.5">
                  <span>{p.name}</span>
                  {isMe && <span className="text-[#9AA59F] text-xs font-normal">(you)</span>}
                </p>
                <p className="text-[11px] text-[#9AA59F]">
                  {p.uid === hostId ? 'Room Host & Controller' : 'Listening in sync'}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {p.uid === hostId && (
                  <span className="flex items-center gap-1 text-xs font-black text-[#00FF87] bg-[#00FF87]/15 border border-[#00FF87]/30 rounded-full px-2.5 py-1 shadow-[0_0_8px_rgba(0,255,135,0.2)]">
                    <Star size={13} /> Host
                  </span>
                )}

                {!isMe && (
                  isFriend ? (
                    <span
                      className="flex items-center gap-1 text-[11px] font-bold text-[#00FF87] bg-[#00FF87]/15 border border-[#00FF87]/30 rounded-full px-2.5 py-1"
                      title="You are friends"
                    >
                      <Check size={12} /> Friend
                    </span>
                  ) : reqState === 'sent' ? (
                    <span
                      className="flex items-center gap-1 text-[11px] font-medium text-amber-300 bg-amber-500/15 border border-amber-500/25 rounded-full px-2.5 py-1"
                      title="Friend request sent"
                    >
                      Sent ⏳
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={reqState === 'sending'}
                      onClick={() => handleAddFriend(p)}
                      className="flex items-center gap-1 text-[11px] font-black text-[#020403] bg-[#00FF87] hover:brightness-110 rounded-full px-3 py-1 transition active:scale-95 disabled:opacity-50 shadow-[0_0_10px_rgba(0,255,135,0.3)] cursor-pointer"
                      title={`Send friend request to ${p.name || 'this listener'}`}
                    >
                      {reqState === 'sending' ? (
                        'Sending…'
                      ) : (
                        <>
                          <span className="text-xs font-black">+</span> Add Friend
                        </>
                      )}
                    </button>
                  )
                )}

                {isHost && !isMe && onKick && (
                  <button
                    type="button"
                    onClick={() => onKick(p.uid, p.name)}
                    className="text-[11px] font-bold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 px-2.5 py-1 rounded-full transition active:scale-95"
                    title="Remove listener from room"
                  >
                    Remove
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {/* Removed Listeners (Host-Only View) */}
      {isHost && kickedEntries.length > 0 && (
        <div className="mt-4 pt-3 border-t border-white/10">
          <div className="flex items-center justify-between mb-2.5 px-1">
            <p className="text-xs font-bold text-white/50 uppercase tracking-wider">
              Removed Listeners ({kickedEntries.length})
            </p>
            <span className="text-[10px] text-white/40">Only you can allow them back</span>
          </div>
          <ul className="space-y-2">
            {kickedEntries.map(([uid, info]) => {
              const name = typeof info === 'object' && info?.name ? info.name : 'Removed Listener';
              return (
                <li
                  key={uid}
                  className="flex items-center justify-between gap-3 bg-panel2/60 rounded-xl p-2.5 border border-white/5"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar name={name} size={32} />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-white/80 truncate">{name}</p>
                      <p className="text-[10px] text-red-400/80">Blocked from room</p>
                    </div>
                  </div>
                  {onUnban && (
                    <button
                      type="button"
                      onClick={() => onUnban(uid, name)}
                      className="text-[11px] font-bold text-green-400 hover:text-green-300 bg-green-500/10 hover:bg-green-500/20 border border-green-500/25 px-3 py-1 rounded-full transition active:scale-95 shadow-sm"
                      title="Unblock user and allow them to rejoin or be re-invited"
                    >
                      Allow Rejoin ✓
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
