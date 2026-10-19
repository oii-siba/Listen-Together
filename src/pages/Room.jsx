import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ref, remove, set } from '../lib/db';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { usePlayback } from '../context/PlaybackContext';
import NowPlaying from '../components/NowPlaying';
import Queue from '../components/Queue';
import AddSong from '../components/AddSong';
import Participants from '../components/Participants';
import ShareBar from '../components/ShareBar';
import Splash from '../components/Splash';
import Chat from '../components/Chat';
import EmojiReactions from '../components/EmojiReactions';
import NotificationCenter from '../components/NotificationCenter';
import FriendsModal from '../components/FriendsModal';
import ProfileModal from '../components/ProfileModal';
import MenuBar from '../components/MenuBar';
import RoomQrModal from '../components/RoomQrModal';
import PrivacyModal from '../components/PrivacyModal';
import AndroidAppModal from '../components/AndroidAppModal';
import { Back, People, Play, QueueIcon, ChatIcon } from '../components/Icons';
import { isInstalled, triggerDirectInstall } from '../lib/pwa';

export default function Room() {
  const { roomId } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();

  const {
    activeRoomId,
    room,
    isHost,
    playback,
    hasVideo,
    queue,
    people,
    hostName,
    online,
    reconnectToast,
    retryConnection,
    blocked,
    unlockAudio,
    showVideo,
    setShowVideo,
    playerRef,
    joinRoom,
    leaveRoom,
    playItem,
    playNext,
    togglePlay,
    seekTo,
    addSong,
    removeFromQueue,
  } = usePlayback();

  const [tab, setTab] = useState('queue');
  const [toast, setToast] = useState('');
  const [showFriends, setShowFriends] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showAndroid, setShowAndroid] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [showHostSecurity, setShowHostSecurity] = useState(false);
  const [customPin, setCustomPin] = useState('');

  // Track PIN unlock in local session
  const [isPinUnlocked, setIsPinUnlocked] = useState(() => {
    try {
      return sessionStorage.getItem(`TT_ROOM_UNLOCKED_${roomId}`) === 'true';
    } catch {
      return false;
    }
  });

  const toastTimer = useRef(null);

  useEffect(() => {
    setInstalled(isInstalled());
    const onInstalled = () => setInstalled(true);
    window.addEventListener('tt-installed', onInstalled);
    return () => window.removeEventListener('tt-installed', onInstalled);
  }, []);

  const showToast = useCallback((msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 3500);
  }, []);

  // Sync active room in playback context and force resync on entry
  useEffect(() => {
    if (!roomId) return;

    // Check if room requires PIN and if this device is unlocked
    const storedUnlocked = (() => {
      try {
        return sessionStorage.getItem(`TT_ROOM_UNLOCKED_${roomId}`) === 'true';
      } catch {
        return false;
      }
    })();

    const isAuthorized = isHost || isPinUnlocked || storedUnlocked || !room?.roomPin;
    if (!isAuthorized) return; // Do NOT connect audio or join until PIN is unlocked!

    unlockAudio?.();
    if (activeRoomId !== roomId) {
      joinRoom(roomId);
    } else {
      try {
        playerRef.current?.resync();
      } catch {}
      const timer = setTimeout(() => {
        try {
          playerRef.current?.resync();
        } catch {}
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [roomId, activeRoomId, isHost, isPinUnlocked, room?.roomPin, joinRoom, playerRef, unlockAudio]);

  // Host Permission Controls
  const setAllowGuestAdd = (v) => set(ref(db, `rooms/${roomId}/allowGuestAdd`), v);
  const setAllowGuestChat = (v) => set(ref(db, `rooms/${roomId}/allowGuestChat`), v);
  const setAllowGuestReactions = (v) => set(ref(db, `rooms/${roomId}/allowGuestReactions`), v);

  const saveRoomPin = async () => {
    if (!isHost) return;
    const cleanPin = customPin.trim().slice(0, 6);
    await set(ref(db, `rooms/${roomId}/roomPin`), cleanPin || null);
    showToast(cleanPin ? `Room PIN set to: ${cleanPin}` : 'Room PIN removed (Open room)');
    setCustomPin('');
  };

  const handleUnlockPin = (e) => {
    e.preventDefault();
    if (room?.roomPin && pinInput.trim() === String(room.roomPin).trim()) {
      setIsPinUnlocked(true);
      try {
        sessionStorage.setItem(`TT_ROOM_UNLOCKED_${roomId}`, 'true');
      } catch {}
      setPinError('');
      joinRoom(roomId);
    } else {
      setPinError('Incorrect Room PIN. Please ask the host.');
    }
  };

  const handleKickUser = async (targetUid, targetName) => {
    if (!isHost) return;
    if (!window.confirm(`Remove ${targetName || 'this listener'} from the room?`)) return;
    try {
      await remove(ref(db, `rooms/${roomId}/presence/${targetUid}`));
      await set(ref(db, `rooms/${roomId}/kickedUsers/${targetUid}`), true);
      showToast(`${targetName || 'User'} was removed from room`);
    } catch {}
  };

  const clearQueue = async () => {
    if (!isHost) return;
    if (!window.confirm('Clear all upcoming songs from queue?')) return;
    try {
      await remove(ref(db, `rooms/${roomId}/queue`));
      showToast('Queue cleared ✓');
    } catch {}
  };

  async function handleLeave() {
    await leaveRoom();
    nav('/');
  }

  async function endRoom() {
    if (!window.confirm('End this room for everyone?')) return;
    try {
      await remove(ref(db, `rooms/${roomId}`));
    } catch {}
    await leaveRoom();
    nav('/');
  }

  /* ---------- render states ---------- */
  if (activeRoomId !== roomId || room === undefined) return <Splash text="Joining room…" />;

  if (room === null) {
    return (
      <div className="min-h-[100dvh] grid place-items-center px-6 text-center">
        <div>
          <p className="text-5xl">🎧</p>
          <h1 className="mt-4 text-xl font-bold">Room not found</h1>
          <p className="mt-1 text-sm text-white/55">The link may be wrong, or the host ended the room.</p>
          <Link to="/" className="inline-block mt-6 bg-accent text-black font-semibold rounded-full px-6 py-3">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  // Check if current user was kicked
  if (room.kickedUsers && user && room.kickedUsers[user.uid] && !isHost) {
    return (
      <div className="min-h-[100dvh] grid place-items-center px-6 text-center">
        <div>
          <p className="text-5xl">🛡️</p>
          <h1 className="mt-4 text-xl font-bold text-red-400">Access Restricted</h1>
          <p className="mt-1 text-sm text-white/55">You were removed from this room by the host.</p>
          <Link
            to="/"
            onClick={handleLeave}
            className="inline-block mt-6 bg-green-500 text-black font-extrabold rounded-full px-6 py-3"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  // Room Security PIN Gate
  const requiresPin = room.roomPin && !isHost && !isPinUnlocked;
  if (requiresPin) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center px-5 max-w-sm mx-auto text-center font-sans">
        <div className="w-16 h-16 rounded-3xl bg-green-500/10 border-2 border-green-500/40 grid place-items-center text-3xl shadow-[0_0_30px_rgba(34,197,94,0.3)]">
          🔒
        </div>
        <h1 className="mt-5 text-2xl font-black text-white">Protected Listening Room</h1>
        <p className="mt-2 text-xs text-white/60">
          This room is secured with a Passcode. Enter the PIN provided by the host to join:
        </p>

        <form onSubmit={handleUnlockPin} className="mt-6 w-full space-y-3">
          <input
            type="password"
            maxLength={6}
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            placeholder="Enter Room PIN"
            className="w-full text-center tracking-widest font-mono text-lg py-3.5 px-4 rounded-2xl bg-panel border border-white/15 text-white outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 placeholder:text-white/30 placeholder:tracking-normal placeholder:text-sm"
          />
          {pinError && <p className="text-xs text-red-400 font-medium">{pinError}</p>}
          <button
            type="submit"
            className="w-full py-3.5 rounded-full bg-green-500 text-black font-extrabold text-sm shadow-[0_0_20px_rgba(34,197,94,0.4)] hover:brightness-110 active:scale-95 transition"
          >
            Unlock &amp; Join Room
          </button>
        </form>

        <button
          type="button"
          onClick={handleLeave}
          className="mt-4 text-xs text-white/40 hover:text-white transition"
        >
          Cancel &amp; return home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] max-w-xl mx-auto px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-16">
      <header className="flex items-center gap-3 mb-4">
        {/* Back button navigates to Home while keeping music playing via Mini Player */}
        <button
          onClick={() => nav('/')}
          className="w-10 h-10 rounded-full bg-panel border border-white/10 grid place-items-center active:scale-90 transition text-white/80 hover:text-white"
          aria-label="Back to home"
          title="Back to Home (Playback continues in Mini Player)"
        >
          <Back size={20} />
        </button>

        <div className="flex items-center gap-2 min-w-0 flex-1">
          <img src="/logo.png" alt="" className="w-7 h-7 rounded-full border border-green-400 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-extrabold text-sm text-white leading-tight truncate flex items-center gap-1.5">
              <span>Tune<span className="text-green-400">Together</span></span>
              <span className="font-mono text-white/70">· {roomId}</span>
              {room.roomPin && <span className="text-[10px]" title="Secured with PIN">🔒</span>}
            </p>
            <p className="text-[11px] text-white/50 truncate">
              {isHost ? "👑 You're the host" : hostName ? `Hosted by ${hostName}` : 'Listening in sync'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <NotificationCenter user={user} roomId={roomId} />
          <button
            type="button"
            onClick={() => setShowFriends(true)}
            className="w-9 h-9 rounded-full bg-panel border border-white/10 flex items-center justify-center text-white/80 hover:text-white active:scale-95 transition"
            title="Friends"
          >
            <span className="text-sm">👥</span>
          </button>
          <button
            type="button"
            onClick={() => setShowQr(true)}
            className="w-9 h-9 rounded-full bg-panel border border-white/10 flex items-center justify-center text-white/80 hover:text-white active:scale-95 transition"
            title="Show Room QR Code Invite"
          >
            <span className="text-sm">📷</span>
          </button>
          {/* Front Direct Install App Button */}
          {!installed && (
            <button
              type="button"
              onClick={triggerDirectInstall}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-green-500/15 hover:bg-green-500/25 border border-green-500/40 text-green-300 hover:text-green-200 text-xs font-bold transition shadow-[0_0_10px_rgba(34,197,94,0.2)] active:scale-95"
              title="Direct Install App"
            >
              <span className="text-xs">📲</span>
              <span className="hidden sm:inline">Install</span>
            </button>
          )}
          <MenuBar
            user={user}
            roomId={roomId}
            onPlaySong={addSong}
            onOpenPrivacy={() => setShowPrivacy(true)}
            onOpenAndroid={() => setShowAndroid(true)}
          />
          <span className="flex items-center gap-1.5 text-xs text-white/70 bg-panel border border-white/10 rounded-full px-2.5 py-1.5 shrink-0">
            <span className={`w-2 h-2 rounded-full ${online ? 'bg-green-400 animate-pulse' : 'bg-red-500'}`} />
            {people.length} live
          </span>

          {/* Leave Room Button */}
          <button
            type="button"
            onClick={handleLeave}
            className="text-xs text-white/40 hover:text-red-400 px-2 py-1 rounded-full border border-white/10 hover:border-red-500/30 transition ml-0.5"
            title="Leave Room"
          >
            ✕
          </button>
        </div>
      </header>

      {/* Auto Reconnection Status Banner */}
      {!online && (
        <div className="mb-3 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-200 text-xs p-3.5 flex items-center justify-between gap-3 shadow-lg animate-pulse">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
            <span>Connection lost — auto-reconnecting. Audio will resync automatically.</span>
          </div>
          <button
            onClick={retryConnection}
            className="px-3 py-1 rounded-full bg-red-500/30 hover:bg-red-500/50 text-white font-bold text-[11px] whitespace-nowrap transition active:scale-95"
          >
            Retry Now
          </button>
        </div>
      )}

      {/* Reconnection Success Floating Banner */}
      {reconnectToast && (
        <div className="mb-3 rounded-2xl bg-green-500/20 border border-green-500/40 text-green-300 text-xs p-3 flex items-center gap-2 shadow-[0_0_15px_rgba(34,197,94,0.3)] animate-in fade-in duration-300">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-ping" />
          <span>{reconnectToast}</span>
        </div>
      )}

      {/* Autoplay unlock prompt if blocked by browser policy */}
      {blocked && (
        <button
          onClick={unlockAudio}
          className="mt-3 w-full flex items-center justify-center gap-2 bg-accent text-black font-bold rounded-full py-3.5 animate-pulse shadow-[0_0_20px_rgba(34,197,94,0.5)]"
        >
          <Play size={22} /> Tap to start the music
        </button>
      )}

      {/* Hero Glowing AirPods Player */}
      <NowPlaying
        playback={playback}
        playerRef={playerRef}
        isHost={isHost}
        user={user}
        onToggle={togglePlay}
        onNext={() => playNext().catch(() => {})}
        onSeek={seekTo}
      />

      {/* Live Floating Emoji Reactions Bar */}
      <EmojiReactions
        roomId={roomId}
        user={user}
        className="my-2"
        isHost={isHost}
        allowGuestReactions={room.allowGuestReactions !== false}
      />

      {/* Optional Video Clip Toggle */}
      {hasVideo && (
        <div className="flex items-center justify-end px-2 -mt-1 mb-3">
          <button
            type="button"
            onClick={() => setShowVideo((v) => !v)}
            className="text-xs text-white/55 hover:text-white flex items-center gap-1.5 px-3 py-1 rounded-full bg-panel2/70 border border-white/10 active:scale-95 transition"
          >
            <span>{showVideo ? '✕ Hide Video' : '📹 Watch Video Clip'}</span>
          </button>
        </div>
      )}

      <ShareBar roomId={roomId} />

      {/* Room Tabs: Queue, Live Chat, Listeners */}
      <div className="mt-5 flex gap-1 bg-panel rounded-full p-1">
        {[
          ['queue', QueueIcon, `Queue · ${queue.length}`],
          ['chat', ChatIcon, 'Live Chat'],
          ['people', People, `Listeners · ${people.length}`],
        ].map(([id, Icon, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-full py-2.5 text-xs sm:text-sm font-semibold transition ${
              tab === id ? 'bg-panel2 text-white shadow' : 'text-white/50 hover:text-white/80'
            }`}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {tab === 'queue' && (
          <div className="space-y-4">
            <AddSong canAdd={isHost || room.allowGuestAdd !== false} onAdd={addSong} isHost={isHost} user={user} />
            <Queue items={queue} isHost={isHost} uid={user.uid} onRemove={removeFromQueue} onPlayNow={playItem} />
          </div>
        )}
        {tab === 'chat' && (
          <Chat
            roomId={roomId}
            user={user}
            isHost={isHost}
            allowGuestChat={room.allowGuestChat !== false}
          />
        )}
        {tab === 'people' && (
          <Participants
            people={people}
            hostId={room.hostId}
            myUid={user.uid}
            onKick={handleKickUser}
          />
        )}
      </div>

      {/* Host Controls & Room Security Panel */}
      {isHost && (
        <div className="mt-6 bg-panel border border-white/10 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="text-base">👑</span>
              <h3 className="font-extrabold text-sm text-white">Host Controls &amp; Security</h3>
            </div>
            <button
              type="button"
              onClick={() => setShowHostSecurity((v) => !v)}
              className="text-xs text-green-400 font-bold hover:underline"
            >
              {showHostSecurity ? 'Collapse ▲' : 'Manage Permissions ▼'}
            </button>
          </div>

          {showHostSecurity && (
            <div className="space-y-3.5 pt-1 animate-in fade-in duration-200">
              {/* Permission 1: Add Songs */}
              <label className="flex items-center justify-between gap-3 text-xs sm:text-sm cursor-pointer">
                <div>
                  <p className="font-bold text-white">Allow listeners to add songs</p>
                  <p className="text-[11px] text-white/50">Turn off to keep full control of the queue</p>
                </div>
                <input
                  type="checkbox"
                  checked={room.allowGuestAdd !== false}
                  onChange={(e) => setAllowGuestAdd(e.target.checked)}
                  className="w-5 h-5 accent-green-500 rounded cursor-pointer"
                />
              </label>

              {/* Permission 2: Chat */}
              <label className="flex items-center justify-between gap-3 text-xs sm:text-sm cursor-pointer">
                <div>
                  <p className="font-bold text-white">Allow listeners to chat</p>
                  <p className="text-[11px] text-white/50">Pause chat to prevent spam</p>
                </div>
                <input
                  type="checkbox"
                  checked={room.allowGuestChat !== false}
                  onChange={(e) => setAllowGuestChat(e.target.checked)}
                  className="w-5 h-5 accent-green-500 rounded cursor-pointer"
                />
              </label>

              {/* Permission 3: Reactions */}
              <label className="flex items-center justify-between gap-3 text-xs sm:text-sm cursor-pointer">
                <div>
                  <p className="font-bold text-white">Allow emoji reactions</p>
                  <p className="text-[11px] text-white/50">Toggle floating screen reactions</p>
                </div>
                <input
                  type="checkbox"
                  checked={room.allowGuestReactions !== false}
                  onChange={(e) => setAllowGuestReactions(e.target.checked)}
                  className="w-5 h-5 accent-green-500 rounded cursor-pointer"
                />
              </label>

              {/* Room Security PIN */}
              <div className="pt-2 border-t border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>🛡️</span> Room PIN Code
                  </span>
                  {room.roomPin && (
                    <span className="text-[11px] font-mono font-bold text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
                      Active: {room.roomPin}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    value={customPin}
                    onChange={(e) => setCustomPin(e.target.value)}
                    maxLength={6}
                    placeholder={room.roomPin ? 'Change PIN or leave blank to remove' : 'Set 4-digit PIN (optional)'}
                    className="flex-1 bg-panel2 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-green-500 placeholder:text-white/35"
                  />
                  <button
                    type="button"
                    onClick={saveRoomPin}
                    className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition active:scale-95"
                  >
                    Save PIN
                  </button>
                </div>
              </div>

              {/* Clear Queue Button */}
              {queue.length > 0 && (
                <button
                  type="button"
                  onClick={clearQueue}
                  className="w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs font-bold transition border border-white/10"
                >
                  Clear Song Queue ({queue.length})
                </button>
              )}
            </div>
          )}

          <button
            onClick={endRoom}
            className="w-full rounded-2xl border border-red-500/40 text-red-300 py-3 text-xs sm:text-sm font-bold hover:bg-red-500/10 transition"
          >
            End room for everyone
          </button>
        </div>
      )}

      {/* Footer Links with Privacy & Android Support */}
      <div className="mt-8 pt-4 border-t border-white/5 flex flex-wrap items-center justify-center gap-4 text-xs text-white/45">
        <button
          type="button"
          onClick={() => setShowPrivacy(true)}
          className="hover:text-green-400 transition"
        >
          🔒 Privacy Policy
        </button>
        <span>·</span>
        <button
          type="button"
          onClick={() => setShowAndroid(true)}
          className="hover:text-green-400 transition"
        >
          📲 Android App Support
        </button>
        <span>·</span>
        <span>TuneTogether v2.0</span>
      </div>

      <p className="mt-4 text-xs text-white/35 text-center px-4">
        Keep this tab open and the screen on — mobile browsers stop YouTube audio when the screen locks.
      </p>

      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-6 z-40 bg-white text-black text-sm font-medium rounded-full px-5 py-3 shadow-xl max-w-[90vw] text-center">
          {toast}
        </div>
      )}

      {/* Friends Modal */}
      {showFriends && (
        <FriendsModal
          user={user}
          currentRoomId={roomId}
          people={people}
          onClose={() => setShowFriends(false)}
        />
      )}

      {/* Profile Modal */}
      {showProfile && (
        <ProfileModal
          user={user}
          onClose={() => setShowProfile(false)}
        />
      )}

      {/* Room QR Code Modal */}
      {showQr && (
        <RoomQrModal
          roomId={roomId}
          onClose={() => setShowQr(false)}
        />
      )}

      {/* Privacy Policy Modal */}
      {showPrivacy && (
        <PrivacyModal onClose={() => setShowPrivacy(false)} />
      )}

      {/* Android TWA & App Modal */}
      {showAndroid && (
        <AndroidAppModal onClose={() => setShowAndroid(false)} />
      )}
    </div>
  );
}
