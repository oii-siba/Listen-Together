import { useState, useEffect } from 'react';
import { getFriendsList, addFriend, removeFriend, addNotification } from '../lib/userData';

export default function FriendsModal({ user, currentRoomId, onClose }) {
  const [friends, setFriends] = useState([]);
  const [friendCodeInput, setFriendCodeInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [msg, setMsg] = useState('');

  const myCode = `TT-${(user?.uid || 'USER').slice(0, 6).toUpperCase()}`;

  useEffect(() => {
    if (!user) return;
    setFriends(getFriendsList(user.uid));
  }, [user]);

  const copyMyCode = () => {
    navigator.clipboard.writeText(myCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddFriend = (e) => {
    e.preventDefault();
    const clean = friendCodeInput.trim();
    if (!clean) return;

    if (clean === myCode) {
      setMsg('You cannot add your own code!');
      return;
    }

    const newFriend = {
      uid: `friend-${Math.random().toString(36).substring(7)}`,
      friendCode: clean.toUpperCase(),
      name: clean.length > 8 ? clean.split('@')[0] : `Friend (${clean})`,
      photo: `https://api.dicebear.com/7.x/bottts/svg?seed=${clean}`,
      status: 'online',
      listeningTo: 'TuneTogether Room',
    };

    const success = addFriend(user.uid, newFriend);
    if (success) {
      setFriends(getFriendsList(user.uid));
      setFriendCodeInput('');
      setMsg('Friend added successfully! 🎉');
    } else {
      setMsg('This friend is already in your list.');
    }
    setTimeout(() => setMsg(''), 3000);
  };

  const handleRemoveFriend = (friendUid) => {
    const updated = removeFriend(user.uid, friendUid);
    setFriends(updated);
  };

  const inviteFriend = (friend) => {
    if (!currentRoomId) return;
    // Send simulated in-app notification to that friend / record
    setMsg(`Room invite sent to ${friend.name}! 🚀`);
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
        <form onSubmit={handleAddFriend} className="flex gap-2 mb-5">
          <input
            value={friendCodeInput}
            onChange={(e) => setFriendCodeInput(e.target.value)}
            placeholder="Enter Friend Code or Email…"
            className="flex-1 bg-panel2 border border-white/10 rounded-full px-4 py-2.5 text-xs text-white outline-none focus:border-green-500 placeholder:text-white/35 transition"
          />
          <button
            type="submit"
            disabled={!friendCodeInput.trim()}
            className="px-4 py-2.5 rounded-full bg-panel2 border border-white/10 font-bold text-xs text-white hover:bg-white/10 active:scale-95 transition disabled:opacity-40"
          >
            Add Friend
          </button>
        </form>

        {msg && (
          <p className="text-xs text-center font-medium text-green-400 bg-green-500/10 border border-green-500/20 py-1.5 rounded-xl mb-4">
            {msg}
          </p>
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
