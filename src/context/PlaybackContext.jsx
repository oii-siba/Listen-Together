import { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { db } from '../firebase';
import { ref, set, update, remove, onValue, onDisconnect, serverTimestamp } from '../lib/db';
import { serverNow } from '../lib/serverTime';
import { thumbFor } from '../lib/utils';
import { logRoomActivity } from '../lib/userData';
import Player from '../components/Player';
import ExitConfirmModal from '../components/ExitConfirmModal';

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
      return localStorage.getItem('TT_ACTIVE_ROOM') || sessionStorage.getItem('TT_ACTIVE_ROOM') || null;
    } catch {
      return null;
    }
  });

  const [room, setRoom] = useState(undefined);
  const [online, setOnline] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const playerRef = useRef(null);
  const roomRef = useRef(null);
  const hostRef = useRef(false);
  const joinedAtRef = useRef(null);
  const startingRef = useRef(false);
  const lastAdvanceRef = useRef(0);
  const hasLoggedJoinRef = useRef(false);
  const audioAnchorRef = useRef(null);

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

  // Persist activeRoomId to localStorage and sessionStorage
  useEffect(() => {
    try {
      if (activeRoomId) {
        localStorage.setItem('TT_ACTIVE_ROOM', activeRoomId);
        sessionStorage.setItem('TT_ACTIVE_ROOM', activeRoomId);
      } else {
        localStorage.removeItem('TT_ACTIVE_ROOM');
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
      (snap) => {
        const val = snap.val();
        if (val === null) {
          try {
            localStorage.removeItem('TT_ACTIVE_ROOM');
            sessionStorage.removeItem('TT_ACTIVE_ROOM');
          } catch {}
          setActiveRoomId(null);
          setRoom(null);
        } else {
          setRoom(val);
        }
      },
      () => setRoom(null)
    );
    return unsub;
  }, [activeRoomId]);

  // Presence, disconnect cleanup & auto-reconnection resync
  const wasOfflineRef = useRef(false);
  const [reconnectToast, setReconnectToast] = useState('');

  // Retry / force reconnect function
  const retryConnection = useCallback(() => {
    try {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setOnline(false);
        return;
      }
      playerRef.current?.resync();
    } catch {}
  }, []);

  // Global browser network online/offline listeners
  useEffect(() => {
    const handleBrowserOnline = () => {
      setOnline(true);
      if (wasOfflineRef.current) {
        wasOfflineRef.current = false;
        setReconnectToast('🟢 Connected! Re-syncing music…');
        setTimeout(() => setReconnectToast(''), 3500);
        setTimeout(() => {
          playerRef.current?.resync();
        }, 300);
      }
    };

    const handleBrowserOffline = () => {
      setOnline(false);
      wasOfflineRef.current = true;
    };

    window.addEventListener('online', handleBrowserOnline);
    window.addEventListener('offline', handleBrowserOffline);

    return () => {
      window.removeEventListener('online', handleBrowserOnline);
      window.removeEventListener('offline', handleBrowserOffline);
    };
  }, []);

  useEffect(() => {
    if (!activeRoomId || !exists || !user?.uid) return undefined;
    const pRef = ref(db, `rooms/${activeRoomId}/presence/${user.uid}`);
    if (joinedAtRef.current == null) joinedAtRef.current = serverNow();

    const unsub = onValue(ref(db, '.info/connected'), (snap) => {
      const on = snap.val() === true;
      setOnline(on);
      if (on) {
        // If we were offline, trigger immediate resync of music playback
        if (wasOfflineRef.current) {
          wasOfflineRef.current = false;
          setReconnectToast('🟢 Reconnected! Re-syncing music…');
          setTimeout(() => setReconnectToast(''), 3500);
          setTimeout(() => {
            playerRef.current?.resync();
          }, 300);
        }

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
      } else {
        wasOfflineRef.current = true;
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

  // Auto-leave room immediately if listener was kicked by host
  useEffect(() => {
    if (activeRoomId && room?.kickedUsers && user?.uid && room.kickedUsers[user.uid] && !isHost) {
      leaveRoom();
    }
  }, [activeRoomId, room?.kickedUsers, user?.uid, isHost, leaveRoom]);

  /* ---------- Playback Controls ---------- */
  const playItem = useCallback(
    async (item) => {
      const r = roomRef.current;
      if (!activeRoomId || !hostRef.current || !r || r.hostId !== user?.uid) return;
      lastCalibratedSongId.current = null;
      lastAdvanceRef.current = Date.now();
      await update(ref(db, `rooms/${activeRoomId}`), {
        playback: {
          videoId: item.videoId,
          title: item.title || '',
          thumb: item.thumb || thumbFor(item.videoId),
          addedByName: item.addedByName || '',
          isPlaying: true,
          position: 0,
          hostTime: serverNow(),
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
    [activeRoomId, user?.displayName, user?.uid]
  );

  const playNext = useCallback(async () => {
    const r = roomRef.current;
    if (!activeRoomId || !isHost || !r || r.hostId !== user?.uid) return;
    const q = toQueue(r.queue);
    if (q.length) {
      await playItem(q[0]);
    } else {
      lastCalibratedSongId.current = null;
      lastAdvanceRef.current = Date.now();
      await set(ref(db, `rooms/${activeRoomId}/playback`), {
        isPlaying: false,
        position: 0,
        hostTime: serverNow(),
        updatedAt: serverTimestamp(),
      });
    }
  }, [activeRoomId, isHost, playItem, user?.uid]);

  const togglePlay = useCallback(() => {
    const r = roomRef.current;
    if (!activeRoomId || !hasVideo || !isHost || !r || r.hostId !== user?.uid) return;
    lastCalibratedSongId.current = null;
    const cur = playerRef.current?.getCurrentTime() ?? playback.position ?? 0;
    if (playback.isPlaying) {
      try {
        playerRef.current?.pause();
      } catch {}
    }
    update(ref(db, `rooms/${activeRoomId}/playback`), {
      isPlaying: !playback.isPlaying,
      position: cur,
      hostTime: serverNow(),
      updatedAt: serverTimestamp(),
    });
  }, [activeRoomId, hasVideo, isHost, playback.isPlaying, playback.position, user?.uid]);

  const seekTo = useCallback(
    (t) => {
      const r = roomRef.current;
      if (!activeRoomId || !hasVideo || !isHost || !r || r.hostId !== user?.uid) return;
      lastCalibratedSongId.current = null;
      update(ref(db, `rooms/${activeRoomId}/playback`), {
        isPlaying: !!playback.isPlaying,
        position: t,
        hostTime: serverNow(),
        updatedAt: serverTimestamp(),
      });
    },
    [activeRoomId, hasVideo, isHost, playback.isPlaying, user?.uid]
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
      setActiveRoomId(roomId);
      try {
        localStorage.setItem('TT_ACTIVE_ROOM', roomId);
        sessionStorage.setItem('TT_ACTIVE_ROOM', roomId);
      } catch {}
      setTimeout(() => {
        try {
          playerRef.current?.resync();
        } catch {}
      }, 80);
    },
    []
  );

  // When user navigates between pages (e.g., from /room/:id back to / or returns to /room/:id),
  // immediately ensure YouTube player is active, alive, and in sync!
  useEffect(() => {
    if (activeRoomId && playback?.isPlaying) {
      setBlocked(false);
      try {
        audioAnchorRef.current?.play()?.catch(() => {});
        playerRef.current?.resync();
      } catch {}
      const timer = setTimeout(() => {
        try {
          playerRef.current?.resync();
        } catch {}
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [location.pathname, activeRoomId, playback?.isPlaying]);

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
    try {
      localStorage.removeItem('TT_ACTIVE_ROOM');
      sessionStorage.removeItem('TT_ACTIVE_ROOM');
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


  // Host playback start calibration: calibrates server time to exact moment audio starts playing on host
  const lastCalibratedSongId = useRef(null);
  const handleHostPlayingStart = useCallback(
    (currentTime) => {
      if (!hostRef.current || !activeRoomId) return;
      const r = roomRef.current;
      const pb = r?.playback;
      if (!pb || !pb.isPlaying || !pb.videoId) return;

      // Calibrate once per track when host actually starts hearing audio
      if (lastCalibratedSongId.current === pb.videoId) return;
      lastCalibratedSongId.current = pb.videoId;

      // Anchor the room timestamp to the EXACT position when host starts hearing audio
      update(ref(db, `rooms/${activeRoomId}/playback`), {
        position: currentTime,
        hostTime: serverNow(),
        updatedAt: serverTimestamp(),
      }).catch(() => {});
    },
    [activeRoomId]
  );

  // Periodic Host Sync Pulse: periodically anchors the playback clock to eliminate multi-device drift
  useEffect(() => {
    if (!isHost || !activeRoomId || !playback?.isPlaying || !playback?.videoId) return;

    const interval = setInterval(() => {
      const p = playerRef.current;
      if (!p) return;
      const curTime = p.getCurrentTime?.();
      if (typeof curTime === 'number' && curTime > 0.5) {
        update(ref(db, `rooms/${activeRoomId}/playback`), {
          position: curTime,
          hostTime: serverNow(),
          updatedAt: serverTimestamp(),
        }).catch(() => {});
      }
    }, 8000); // Pulse every 8 seconds

    return () => clearInterval(interval);
  }, [isHost, activeRoomId, playback?.isPlaying, playback?.videoId, playerRef]);



  // Silent audio loop to maintain background audio priority on mobile and desktop
  useEffect(() => {
    const el = audioAnchorRef.current;
    if (!el) return;
    if (activeRoomId && playback?.isPlaying) {
      el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, [activeRoomId, playback?.isPlaying]);

  // Media Session API for Lock Screen & Notification Center background controls
  useEffect(() => {
    if (!('mediaSession' in navigator) || !activeRoomId) return;

    if (playback?.videoId && playback?.title) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: playback.title,
          artist: playback.addedByName ? `Queued by ${playback.addedByName}` : 'TuneTogether',
          album: `Room #${activeRoomId}`,
          artwork: [
            {
              src: playback.thumb || `https://i.ytimg.com/vi/${playback.videoId}/hqdefault.jpg`,
              sizes: '512x512',
              type: 'image/jpeg',
            },
          ],
        });
        navigator.mediaSession.playbackState = playback.isPlaying ? 'playing' : 'paused';
      } catch {}
    } else {
      try {
        navigator.mediaSession.metadata = null;
        navigator.mediaSession.playbackState = 'none';
      } catch {}
    }
  }, [activeRoomId, playback?.videoId, playback?.title, playback?.addedByName, playback?.thumb, playback?.isPlaying]);

  useEffect(() => {
    if (!('mediaSession' in navigator) || !activeRoomId) return;

    try {
      navigator.mediaSession.setActionHandler('play', () => {
        if (!hostRef.current) {
          try {
            audioAnchorRef.current?.play()?.catch(() => {});
            playerRef.current?.resync();
          } catch {}
          return;
        }
        const pb = roomRef.current?.playback;
        if (!pb?.isPlaying) {
          togglePlay();
        } else {
          try {
            playerRef.current?.resync();
          } catch {}
        }
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        if (!hostRef.current) return;
        const pb = roomRef.current?.playback;
        if (pb?.isPlaying) {
          togglePlay();
        }
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        if (hostRef.current) playNext();
      });
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (!hostRef.current) return;
        if (details.seekTime != null) seekTo(details.seekTime);
      });
    } catch {}

    return () => {
      try {
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('nexttrack', null);
        navigator.mediaSession.setActionHandler('seekto', null);
      } catch {}
    };
  }, [activeRoomId, togglePlay, playNext, seekTo]);

  // Prompt before accidentally closing tab or leaving site while audio is active
  useEffect(() => {
    const onBeforeUnload = (e) => {
      if (activeRoomId && playback?.isPlaying) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [activeRoomId, playback?.isPlaying]);

  // Auto-skip unplayable videos if embedding is restricted (error 100, 101, 150, 2)
  const handlePlayerError = useCallback(
    (errCode) => {
      console.warn('YouTube Player error code:', errCode);
      if (!hostRef.current || !activeRoomId) return;
      if (errCode === 100 || errCode === 101 || errCode === 150 || errCode === 2) {
        logRoomActivity(activeRoomId, {
          type: 'error',
          title: 'Track Skipped',
          body: 'This video cannot be played in embedded players. Moving to next track...',
          userName: 'System',
        });
        setTimeout(() => {
          if (hostRef.current) playNext();
        }, 1500);
      }
    },
    [activeRoomId, playNext]
  );

  // Unlock audio anchor on user interaction anywhere in the app
  useEffect(() => {
    const unlockOnGesture = () => {
      audioAnchorRef.current?.play()?.catch(() => {});
      try {
        playerRef.current?.resync();
      } catch {}
      setBlocked(false);
    };

    window.addEventListener('click', unlockOnGesture, { passive: true });
    window.addEventListener('touchstart', unlockOnGesture, { passive: true });
    window.addEventListener('pointerdown', unlockOnGesture, { passive: true });

    return () => {
      window.removeEventListener('click', unlockOnGesture);
      window.removeEventListener('touchstart', unlockOnGesture);
      window.removeEventListener('pointerdown', unlockOnGesture);
    };
  }, []);

  // Back button guard on Home page: Prevent accidental exit from website while song is playing
  useEffect(() => {
    if (!activeRoomId || !playback?.isPlaying || location.pathname !== '/') return;

    window.history.pushState({ app: 'tunetogether-home' }, '', '/');

    const onPopState = () => {
      if (!activeRoomId || !playback?.isPlaying) return;
      window.history.pushState({ app: 'tunetogether-home' }, '', '/');
      setShowExitConfirm(true);
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [activeRoomId, playback?.isPlaying, location.pathname]);

  const unlockAudio = useCallback(() => {
    try {
      audioAnchorRef.current?.play()?.catch(() => {});
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
    reconnectToast,
    retryConnection,
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

      {/* Hidden background audio pipeline anchor for mobile & desktop lock screen continuity */}
      <audio
        ref={audioAnchorRef}
        src="data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAP8A/w=="
        loop
        preload="auto"
        playsInline
        style={{ position: 'fixed', bottom: 0, right: 0, width: 1, height: 1, opacity: 0.01, pointerEvents: 'none' }}
      />

      {/* Single, Persistent Global YouTube Player mounted forever across route changes */}
      {activeRoomId && (
        <Player
          ref={playerRef}
          playback={playback}
          enabled={true}
          isHost={isHost}
          showVideo={showVideo}
          onCloseVideo={() => setShowVideo(false)}
          onEnded={isHost ? playNext : undefined}
          onError={handlePlayerError}
          onBlocked={setBlocked}
          onPlayingStart={handleHostPlayingStart}
        />
      )}

      {/* Modal explaining how to keep playing in background if user presses browser back button */}
      <ExitConfirmModal isOpen={showExitConfirm} onClose={() => setShowExitConfirm(false)} />
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
