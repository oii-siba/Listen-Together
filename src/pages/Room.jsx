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
  const [installed, setInstalled] = useState(false);
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

  // Sync active room in playback context
  useEffect(() => {
    if (roomId && activeRoomId !== roomId) {
      joinRoom(roomId);
    }
  }, [roomId, activeRoomId, joinRoom]);

  const setAllowGuestAdd = (v) => set(ref(db, `rooms/${roomId}/allowGuestAdd`), v);

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

  /* ---------- render ---------- */
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
            <p className="font-extrabold text-sm text-white leading-tight truncate">
              Tune<span className="text-green-400">Together</span> · <span className="font-mono text-white/70">{roomId}</span>
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
          <MenuBar user={user} roomId={roomId} onPlaySong={addSong} />
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

      {!online && (
        <div className="mb-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-200 text-sm px-4 py-2.5">
          Connection lost — reconnecting. The music will re-sync automatically.
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
      <EmojiReactions roomId={roomId} user={user} className="my-2" />

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
        {tab === 'chat' && <Chat roomId={roomId} user={user} />}
        {tab === 'people' && <Participants people={people} hostId={room.hostId} myUid={user.uid} />}
      </div>

      {isHost && (
        <div className="mt-6 bg-panel rounded-2xl p-4">
          <label className="flex items-center justify-between gap-3 text-sm">
            <span>Let guests add songs</span>
            <input
              type="checkbox"
              checked={room.allowGuestAdd !== false}
              onChange={(e) => setAllowGuestAdd(e.target.checked)}
              className="w-5 h-5"
            />
          </label>
          <button
            onClick={endRoom}
            className="mt-4 w-full rounded-full border border-red-500/40 text-red-300 py-2.5 text-sm font-semibold hover:bg-red-500/10 transition"
          >
            End room for everyone
          </button>
        </div>
      )}

      <p className="mt-6 text-xs text-white/35 text-center px-4">
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
    </div>
  );
}
