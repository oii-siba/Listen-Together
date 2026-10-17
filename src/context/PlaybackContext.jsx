import { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { db } from '../firebase';
import { ref, set, update, remove, onValue, onDisconnect, serverTimestamp } from '../lib/db';
import { serverNow } from '../lib/serverTime';
import { thumbFor } from '../lib/utils';
import { logRoomActivity } from '../lib/userData';
import Player from '../components/Player';

const PlaybackContext = createContext(null);

const toQueue = (q) =>
  Object.entries(q || {})
    .map(([key, v]) => ({ key, ...v }))
    .sort((a, b) => (a.key < b.key ? -1 : 1));

const toPeople = (p) =>
  Object.entries(p || {})
    .map(([uid, v]) => ({ uid, ...v }))
    .sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));

export function PlaybackProvider({ user, children }) {
  const [activeRoomId, setActiveRoomId] = useState(() => {
    try {
      return sessionStorage.getItem('TT_ACTIVE_ROOM') || null;
    } catch {
      return null;
    }
  });

  const [room, setRoom] = useState(undefined);
  const [online, setOnline] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const [showVideo, setShowVideo] = useState(false);

  const playerRef = useRef(null);
  const roomRef = useRef(null);
  const hostRef = useRef(false);
  const joinedAtRef = useRef(null);
  const startingRef = useRef(false);
  const lastAdvanceRef = useRef(0);
  const hasLoggedJoinRef = useRef(false);

  const exists = !!room;
  const isHost = exists && room.hostId === user?.uid;
  const playback = room?.playback || {};
  const hasVideo = !!playback.videoId;
  const queue = useMemo(() => toQueue(room?.queue), [room?.queue]);
  const people = useMemo(() => toPeople(room?.presence), [room?.presence]);
  const hostPresent = !!(room && room.presence && room.presence[room.hostId]);
  const hostName = people.find((p) => p.uid === room?.hostId)?.name;
  const oldestUid = people[0]?.uid;

  roomRef.current = room;
  hostRef.current = isHost;

  // Persist activeRoomId to sessionStorage
  useEffect(() => {
    try {
      if (activeRoomId) {
        sessionStorage.setItem('TT_ACTIVE_ROOM', activeRoomId);
      } else {
        sessionStorage.removeItem('TT_ACTIVE_ROOM');
      }
    } catch {}
  }, [activeRoomId]);

  // Subscribe to active room
  useEffect(() => {
    if (!activeRoomId) {
      setRoom(null);
      return;
    }
    setRoom(undefined);
    hasLoggedJoinRef.current = false;
    const unsub = onValue(
      ref(db, `rooms/${activeRoomId}`),
      (snap) => setRoom(snap.val()),
      () => setRoom(null)
    );
    return unsub;
  }, [activeRoomId]);

  // Presence & disconnect cleanup for active room
  useEffect(() => {
    if (!activeRoomId || !exists || !user?.uid) return undefined;
    const pRef = ref(db, `rooms/${activeRoomId}/presence/${user.uid}`);
    if (joinedAtRef.current == null) joinedAtRef.current = serverNow();

    const unsub = onValue(ref(db, '.info/connected'), (snap) => {
      const on = snap.val() === true;
      setOnline(on);
      if (on) {
        if (!hasLoggedJoinRef.current) {
          hasLoggedJoinRef.current = true;
          logRoomActivity(activeRoomId, {
            type: 'join',
            title: 'Listener Joined',
            body: `${user.displayName || 'Someone'} joined the room 🎧`,
            userName: user.displayName || 'Someone',
          });
        }
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
  }, [activeRoomId, user?.uid, exists]); // eslint-disable-line react-hooks/exhaustive-deps

  // Screen wake lock
  useEffect(() => {
    if (!activeRoomId) return undefined;
    let lock = null;
    const acquire = async () => {
      try {
        if ('wakeLock' in navigator) lock = await navigator.wakeLock.request('screen');
      } catch {}
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
  }, [activeRoomId]);

  /* ---------- Playback Controls ---------- */
  const playItem = useCallback(
    async (item) => {
      if (!activeRoomId) return;
      lastAdvanceRef.current = Date.now();
      await update(ref(db, `rooms/${activeRoomId}`), {
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
      logRoomActivity(activeRoomId, {
        type: 'now_playing',
        title: 'Now Playing',
        body: `Now playing "${item.title || 'a track'}" 🎶`,
        userName: item.addedByName || user?.displayName || 'Host',
      });
    },
    [activeRoomId, user?.displayName]
  );

  const playNext = useCallback(async () => {
    if (!activeRoomId) return;
    const r = roomRef.current;
    if (!r) return;
    const q = toQueue(r.queue);
    if (q.length) {
      await playItem(q[0]);
    } else {
      lastAdvanceRef.current = Date.now();
      await set(ref(db, `rooms/${activeRoomId}/playback`), {
        isPlaying: false,
        position: 0,
        updatedAt: serverTimestamp(),
      });
    }
  }, [activeRoomId, playItem]);

  const togglePlay = useCallback(() => {
    if (!activeRoomId || !hasVideo) return;
    const cur = playerRef.current?.getCurrentTime() ?? playback.position ?? 0;
    update(ref(db, `rooms/${activeRoomId}/playback`), {
      isPlaying: !playback.isPlaying,
      position: cur,
      updatedAt: serverTimestamp(),
    });
  }, [activeRoomId, hasVideo, playback.isPlaying, playback.position]);

  const seekTo = useCallback(
    (t) => {
      if (!activeRoomId || !hasVideo) return;
      update(ref(db, `rooms/${activeRoomId}/playback`), {
        isPlaying: !!playback.isPlaying,
        position: t,
        updatedAt: serverTimestamp(),
      });
    },
    [activeRoomId, hasVideo, playback.isPlaying]
  );

  const addSong = useCallback(
    async (song, playImmediately = false) => {
      if (!activeRoomId) return;
      const item = {
        videoId: song.videoId,
        title: song.title || 'YouTube video',
        thumb: song.thumbnail || thumbFor(song.videoId),
        addedBy: user?.uid,
        addedByName: user?.displayName || 'Someone',
      };
      const roomNow = roomRef.current;
      const currentPlayback = roomNow?.playback;
      const nothingPlaying = !currentPlayback || !currentPlayback.videoId;

      if ((playImmediately && isHost) || (nothingPlaying && isHost)) {
        await playItem(item);
      } else {
        const itemRef = ref(db, `rooms/${activeRoomId}/queue/${Date.now()}`);
        await set(itemRef, item);
      }

      logRoomActivity(activeRoomId, {
        type: 'song_added',
        title: 'Song Added',
        body: `${user?.displayName || 'Someone'} queued "${song.title || 'a track'}" 🎵`,
        userName: user?.displayName || 'Someone',
      });
    },
    [activeRoomId, isHost, playItem, user?.displayName, user?.uid]
  );

  const removeFromQueue = useCallback(
    async (key) => {
      if (!activeRoomId || !key) return;
      await remove(ref(db, `rooms/${activeRoomId}/queue/${key}`));
    },
    [activeRoomId]
  );

  const joinRoom = useCallback(
    (roomId) => {
      if (activeRoomId !== roomId) {
        setActiveRoomId(roomId);
      }
      try {
        playerRef.current?.resync();
      } catch {}
    },
    [activeRoomId]
  );

  const leaveRoom = useCallback(async () => {
    if (!activeRoomId) return;
    try {
      logRoomActivity(activeRoomId, {
        type: 'leave',
        title: 'Listener Left',
        body: `${user?.displayName || 'Someone'} left the room 👋`,
        userName: user?.displayName || 'Someone',
      });
      if (isHost) {
        const others = people.filter((p) => p.uid !== user?.uid);
        if (others.length) {
          await set(ref(db, `rooms/${activeRoomId}/hostId`), others[0].uid);
        } else {
          await remove(ref(db, `rooms/${activeRoomId}`));
        }
      }
      await remove(ref(db, `rooms/${activeRoomId}/presence/${user?.uid}`));
    } catch {}
    setActiveRoomId(null);
    setRoom(null);
  }, [activeRoomId, isHost, people, user?.displayName, user?.uid]);

  // Host auto-play next when queue is present
  useEffect(() => {
    if (!isHost || hasVideo || queue.length === 0 || startingRef.current) return;
    startingRef.current = true;
    playItem(queue[0])
      .catch(() => {})
      .finally(() => {
        startingRef.current = false;
      });
  }, [isHost, hasVideo, queue.length, playItem]);

  // Host pass on vanish
  useEffect(() => {
    if (!exists || isHost || hostPresent || oldestUid !== user?.uid || !activeRoomId) return undefined;
    const t = setTimeout(() => {
      set(ref(db, `rooms/${activeRoomId}/hostId`), user.uid).catch(() => {});
    }, 8000);
    return () => clearTimeout(t);
  }, [exists, isHost, hostPresent, oldestUid, user?.uid, activeRoomId]);
  const unlockAudio = useCallback(() => {
    try {
      playerRef.current?.resync();
    } catch {}
    setBlocked(false);
  }, []);

  const value = {
    activeRoomId,
    room,
    exists,
    isHost,
    playback,
    hasVideo,
    queue,
    people,
    hostName,
    online,
    blocked,
    setBlocked,
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
  };

  return (
    <PlaybackContext.Provider value={value}>
      {children}

      {/* Single, Persistent Global YouTube Player mounted forever across route changes */}
      {activeRoomId && (
        <Player
          ref={playerRef}
          playback={playback}
          enabled={true}
          showVideo={showVideo}
          onCloseVideo={() => setShowVideo(false)}
          onEnded={isHost ? playNext : undefined}
          onError={() => {}}
          onBlocked={setBlocked}
        />
      )}
    </PlaybackContext.Provider>
  );
}

export function usePlayback() {
  const ctx = useContext(PlaybackContext);
  if (!ctx) {
    throw new Error('usePlayback must be used within a PlaybackProvider');
  }
  return ctx;
}
