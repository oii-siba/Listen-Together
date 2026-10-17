import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { onDisconnect, onValue, push, ref, remove, serverTimestamp, set, update } from '../lib/db';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { serverNow } from '../lib/serverTime';
import { thumbFor } from '../lib/utils';
import Player from '../components/Player';
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
import { Back, People, Play, QueueIcon, ChatIcon } from '../components/Icons';


const toQueue = (q) =>
  Object.entries(q || {})
    .map(([key, v]) => ({ key, ...v }))
    .sort((a, b) => (a.key < b.key ? -1 : 1)); // push() keys are chronological

const toPeople = (p) =>
  Object.entries(p || {})
    .map(([uid, v]) => ({ uid, ...v }))
    .sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));

export default function Room() {
  const { roomId } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();

  const playerRef = useRef(null);
  const roomRef = useRef(null);
  const hostRef = useRef(false);
  const joinedAtRef = useRef(null);
  const startingRef = useRef(false);
  const lastAdvanceRef = useRef(0);
  const toastTimer = useRef(null);

  const [room, setRoom] = useState(undefined); // undefined = loading, null = missing / no access
  const [joined, setJoined] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [online, setOnline] = useState(true);
  const [tab, setTab] = useState('queue');
  const [toast, setToast] = useState('');
  const [showVideo, setShowVideo] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [showProfile, setShowProfile] = useState(false);


  const exists = !!room;
  const isHost = exists && room.hostId === user.uid;
  const playback = room?.playback || {};
  const hasVideo = !!playback.videoId;
  const queue = useMemo(() => toQueue(room?.queue), [room?.queue]);
  const people = useMemo(() => toPeople(room?.presence), [room?.presence]);
  const hostPresent = !!(room && room.presence && room.presence[room.hostId]);
  const hostName = people.find((p) => p.uid === room?.hostId)?.name;
  const oldestUid = people[0]?.uid;

  roomRef.current = room;
  hostRef.current = isHost;

  const showToast = useCallback((msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 3500);
  }, []);

  /* ---------- subscribe to the room ---------- */
  useEffect(() => {
    setRoom(undefined);
    const unsub = onValue(
      ref(db, `rooms/${roomId}`),
      (snap) => setRoom(snap.val()),
      () => setRoom(null)
    );
    return unsub;
  }, [roomId]);

  /* ---------- presence + connection status (reconnect-safe) ---------- */
  useEffect(() => {
    if (!exists) return undefined;
    const pRef = ref(db, `rooms/${roomId}/presence/${user.uid}`);
    if (joinedAtRef.current == null) joinedAtRef.current = serverNow();
    const unsub = onValue(ref(db, '.info/connected'), (snap) => {
      const on = snap.val() === true;
      setOnline(on);
      if (on) {
        onDisconnect(pRef)
          .remove()
          .then(() =>
            set(pRef, {
              name: user.displayName || user.email || 'Guest',
              photo: user.photoURL || null,
              joinedAt: joinedAtRef.current,
            })
          )
          .catch(() => {});
      }
    });
    return () => {
      unsub();
      remove(pRef).catch(() => {});
    };
  }, [roomId, user.uid, exists]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- keep screen awake + resync when returning to the tab ---------- */
  useEffect(() => {
    if (!joined) return undefined;
    let lock = null;
    const acquire = async () => {
      try {
        if ('wakeLock' in navigator) lock = await navigator.wakeLock.request('screen');
      } catch {
        /* not supported / denied */
      }
    };
    acquire();
    const onVis = () => {
      if (!document.hidden) {
        acquire();
        playerRef.current?.resync();
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      lock?.release?.().catch(() => {});
    };
  }, [joined]);

  /* ---------- host actions ---------- */
  const playItem = useCallback(
    async (item) => {
      lastAdvanceRef.current = Date.now();
      await update(ref(db, `rooms/${roomId}`), {
        playback: {
          videoId: item.videoId,
          title: item.title || '',
          thumb: item.thumb || thumbFor(item.videoId),
          addedByName: item.addedByName || '',
          isPlaying: true,
          position: 0,
          updatedAt: serverTimestamp(),
        },
        ...(item.key ? { [`queue/${item.key}`]: null } : {}),
      });
    },
    [roomId]
  );

  const playNext = useCallback(async () => {
    const r = roomRef.current;
    if (!r) return;
    const q = toQueue(r.queue);
    if (q.length) {
      await playItem(q[0]);
    } else {
      lastAdvanceRef.current = Date.now();
      await set(ref(db, `rooms/${roomId}/playback`), { isPlaying: false, position: 0, updatedAt: serverTimestamp() });
    }
  }, [roomId, playItem]);

  const togglePlay = () => {
    if (!hasVideo) return;
    const cur = playerRef.current?.getCurrentTime() ?? playback.position ?? 0;
    update(ref(db, `rooms/${roomId}/playback`), {
      isPlaying: !playback.isPlaying,
      position: cur,
      updatedAt: serverTimestamp(),
    });
  };

  const seekTo = (t) => {
    if (!hasVideo) return;
    update(ref(db, `rooms/${roomId}/playback`), {
      isPlaying: !!playback.isPlaying,
      position: t,
      updatedAt: serverTimestamp(),
    });
  };

  const setAllowGuestAdd = (v) => set(ref(db, `rooms/${roomId}/allowGuestAdd`), v);

  // Host: when nothing is playing and something is queued, start it.
  useEffect(() => {
    if (!isHost || hasVideo || queue.length === 0 || startingRef.current) return;
    startingRef.current = true;
    playItem(queue[0])
      .catch(() => {})
      .finally(() => {
        startingRef.current = false;
      });
  }, [isHost, hasVideo, queue.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // If the host vanished (closed the tab / lost internet), the longest-present guest takes over after a short grace period.
  useEffect(() => {
    if (!exists || isHost || hostPresent || oldestUid !== user.uid) return undefined;
    const t = setTimeout(() => {
      set(ref(db, `rooms/${roomId}/hostId`), user.uid)
        .then(() => showToast('The host left — you are the host now 👑'))
        .catch(() => {});
    }, 8000);
    return () => clearTimeout(t);
  }, [exists, isHost, hostPresent, oldestUid, user.uid, roomId, showToast]);

  /* ---------- everyone: add / remove songs ---------- */
  async function addSong(song, playImmediately = false) {
    const r = roomRef.current;
    const item = {
      videoId: song.videoId,
      title: song.title || 'YouTube video',
      thumb: song.thumbnail || thumbFor(song.videoId),
      addedBy: user.uid,
      addedByName: user.displayName || 'Someone',
    };
    if (playImmediately && hostRef.current) {
      await playItem(item);
    } else if (hostRef.current && !r?.playback?.videoId) {
      await playItem(item);
    } else {
      await push(ref(db, `rooms/${roomId}/queue`), item);
    }
  }

  const removeFromQueue = (key) => remove(ref(db, `rooms/${roomId}/queue/${key}`)).catch(() => {});

  /* ---------- player callbacks ---------- */
  const handleEnded = useCallback(() => {
    if (!hostRef.current) return;
    if (Date.now() - lastAdvanceRef.current < 3000) return; // guard against double "ended" events
    playNext().catch(() => {});
  }, [playNext]);

  const handleError = useCallback(() => {
    if (!hostRef.current) return;
    showToast("This video can't be played — skipping");
    playNext().catch(() => {});
  }, [playNext, showToast]);

  /* ---------- leave / end ---------- */
  async function leave() {
    try {
      if (isHost) {
        const others = people.filter((p) => p.uid !== user.uid);
        if (others.length) await set(ref(db, `rooms/${roomId}/hostId`), others[0].uid); // pass the crown
        else await remove(ref(db, `rooms/${roomId}`)); // nobody left: close the room
      }
    } catch {
      /* ignore */
    }
    nav('/');
  }

  async function endRoom() {
    if (!window.confirm('End this room for everyone?')) return;
    try {
      await remove(ref(db, `rooms/${roomId}`));
    } catch {
      /* ignore */
    }
    nav('/');
  }

  function joinNow() {
    // Must run inside the tap: this is what unlocks audio on mobile browsers.
    playerRef.current?.resync();
    setJoined(true);
  }

  /* ---------- render ---------- */
  if (room === undefined) return <Splash text="Joining room…" />;

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
    <div className="min-h-[100dvh] max-w-xl mx-auto px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-12">
      <header className="flex items-center gap-3 mb-4">
        <button
          onClick={leave}
          className="w-10 h-10 rounded-full bg-panel border border-white/10 grid place-items-center active:scale-90 transition text-white/80 hover:text-white"
          aria-label="Leave room"
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
          <NotificationCenter user={user} />
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
            onClick={() => setShowProfile(true)}
            className="w-9 h-9 rounded-full overflow-hidden border border-green-400 shadow-[0_0_8px_rgba(34,197,94,0.4)] active:scale-95 transition"
            title="Profile"
          >
            <img
              src={user?.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.uid}`}
              alt=""
              className="w-full h-full object-cover"
            />
          </button>
          <span className="flex items-center gap-1.5 text-xs text-white/70 bg-panel border border-white/10 rounded-full px-2.5 py-1.5 shrink-0">
            <span className={`w-2 h-2 rounded-full ${online ? 'bg-green-400 animate-pulse' : 'bg-red-500'}`} />
            {people.length} live
          </span>
        </div>
      </header>

      {!online && (
        <div className="mb-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-200 text-sm px-4 py-2.5">
          Connection lost — reconnecting. The music will re-sync automatically.
        </div>
      )}

      <Player
        ref={playerRef}
        playback={playback}
        enabled={joined}
        showVideo={showVideo}
        onEnded={handleEnded}
        onError={handleError}
        onBlocked={setBlocked}
      />

      {joined && blocked && (
        <button
          onClick={() => playerRef.current?.resync()}
          className="mt-3 w-full flex items-center justify-center gap-2 bg-accent text-black font-bold rounded-full py-3.5 animate-pulse"
        >
          <Play size={22} /> Tap to start the music
        </button>
      )}

      {/* Hero Glowing AirPods Player matching user reference */}
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

      {/* Optional Video Toggle */}
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
          <Chat roomId={roomId} user={user} />
        )}
        {tab === 'people' && (
          <Participants people={people} hostId={room.hostId} myUid={user.uid} />
        )}
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
          <button onClick={endRoom} className="mt-4 w-full rounded-full border border-red-500/40 text-red-300 py-2.5 text-sm font-semibold">
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

      {!joined && (
        <div className="fixed inset-0 z-50 bg-ink/95 backdrop-blur grid place-items-center px-6">
          <div className="w-full max-w-sm text-center">
            <p className="text-5xl">🎧</p>
            <h2 className="mt-4 text-2xl font-extrabold">
              {isHost ? 'Your room is ready' : hostName ? `${hostName} is playing music` : 'Join the room'}
            </h2>
            <p className="mt-2 text-sm text-white/60">
              Tap below to start listening. Your phone needs one tap before it allows sound.
            </p>
            <button
              onClick={joinNow}
              className="mt-8 w-full flex items-center justify-center gap-2 bg-accent text-black font-bold text-lg rounded-full py-4 active:scale-[0.98] transition"
            >
              <Play size={26} /> Tap to Join &amp; Start Listening
            </button>
            <p className="mt-4 text-xs text-white/40">{people.length} listening now</p>
          </div>
        </div>
      )}

      {/* Friends Modal */}
      {showFriends && (
        <FriendsModal
          user={user}
          currentRoomId={roomId}
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

