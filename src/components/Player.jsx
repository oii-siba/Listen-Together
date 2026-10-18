import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import { loadYT } from '../lib/youtube';
import { serverNow } from '../lib/serverTime';

// High-precision, continuous synchronization settings
const SYNC_HEARTBEAT_MS = 400; // Check every 400ms for tight, real-time lock

const UNSTARTED = -1;
const ENDED = 0;
const PLAYING = 1;
const PAUSED = 2;
const BUFFERING = 3;
const CUED = 5;

let localNudge = 0;
try {
  const saved = localStorage.getItem('LT_SYNC_NUDGE');
  if (saved) localNudge = Number(saved) || 0;
} catch {}

export function getSyncNudge() {
  return localNudge;
}

export function setSyncNudge(ms) {
  localNudge = ms;
  try {
    localStorage.setItem('LT_SYNC_NUDGE', String(ms));
  } catch {}
}

// Where the song *should* be right now, canceling network transit skew via hostTime + global server clock + local nudge.
export function expectedPosition(pb) {
  if (!pb) return 0;
  const base = pb.position || 0;
  if (!pb.isPlaying) return base;
  const anchorTime =
    typeof pb.hostTime === 'number'
      ? pb.hostTime
      : typeof pb.updatedAt === 'number'
      ? pb.updatedAt
      : serverNow();
  return base + Math.max(0, (serverNow() - anchorTime) / 1000) + (localNudge / 1000);
}

const Player = forwardRef(function Player(
  { playback, enabled, isHost = false, showVideo = false, onCloseVideo, onEnded, onError, onBlocked, onPlayingStart, children },
  ref
) {
  const wrapRef = useRef(null);
  const ytRef = useRef(null);
  const readyRef = useRef(false);
  const stateRef = useRef(playback);
  const enabledRef = useRef(enabled);
  const isHostRef = useRef(isHost);
  const loadedId = useRef(null);
  const lastSeekAt = useRef(0);
  const notPlaying = useRef(0);
  const resumeTimer = useRef(null);
  const initialBufferDone = useRef(null);

  isHostRef.current = isHost;
  const onEndedRef = useRef(onEnded);
  const onErrorRef = useRef(onError);
  const onBlockedRef = useRef(onBlocked);
  const onPlayingStartRef = useRef(onPlayingStart);
  onEndedRef.current = onEnded;
  onErrorRef.current = onError;
  onBlockedRef.current = onBlocked;
  onPlayingStartRef.current = onPlayingStart;

  const seek = (yt, t) => {
    lastSeekAt.current = Date.now();
    try {
      yt.seekTo(Math.max(0, t), true);
    } catch {}
  };

  // Adjust playback speed smoothly without pausing or cutting audio
  const setRate = (yt, rate) => {
    try {
      const curRate = yt.getPlaybackRate?.() || 1;
      if (curRate !== rate) {
        yt.setPlaybackRate?.(rate);
      }
    } catch {}
  };

  // Seamless synchronization: eliminates "on/off" audio interruptions completely
  const syncPlayback = useCallback((force = false) => {
    const yt = ytRef.current;
    const pb = stateRef.current;
    if (!yt || !readyRef.current || !pb || !pb.videoId) return;

    const st = yt.getPlayerState?.();
    const cur = yt.getCurrentTime?.() || 0;
    const want = expectedPosition(pb);
    const diff = want - cur; // positive => we are behind; negative => we are ahead
    const absDiff = Math.abs(diff);

    if (pb.isPlaying) {
      if (!enabledRef.current) return;
      if (st === ENDED) return;

      // If player paused or stopped unexpectedly while room is playing:
      if (st !== PLAYING && st !== BUFFERING) {
        if (absDiff > 2.5) {
          seek(yt, want);
        }
        try {
          yt.playVideo();
        } catch {}
        return;
      }

      // If currently playing:
      if (st === PLAYING) {
        // Host device is the reference clock: always plays at 1.0x uninterrupted
        if (isHostRef.current) {
          setRate(yt, 1);
          return;
        }

        // Guest synchronization logic:
        const timeSinceLastSeek = Date.now() - lastSeekAt.current;

        // 1. Audible real drift (> 0.55s): snap immediately to expected position
        // 4000ms cooldown ensures it settles cleanly without looping or getting stuck
        if (absDiff > 0.55 && (force || timeSinceLastSeek > 4000)) {
          seek(yt, want);
          setRate(yt, 1);
          return;
        }

        // 2. Seamless micro-sync for minor differences:
        if (diff > 0.15) {
          setRate(yt, 1.25);
        } else if (diff < -0.15) {
          setRate(yt, 0.75);
        } else if (absDiff <= 0.05) {
          setRate(yt, 1);
        }
      }
    } else {
      // Room is paused
      setRate(yt, 1);
      if (st === PLAYING || st === BUFFERING) {
        try {
          yt.pauseVideo();
        } catch {}
      }
      if (st !== CUED && st !== UNSTARTED && absDiff > 0.5) {
        seek(yt, pb.position || 0);
      }
    }
  }, []);

  // Main apply function for new video or state update
  const apply = useCallback(() => {
    const yt = ytRef.current;
    const pb = stateRef.current;
    if (!yt || !readyRef.current) return;

    if (!pb || !pb.videoId) {
      if (loadedId.current) {
        try {
          yt.stopVideo();
        } catch {}
        loadedId.current = null;
      }
      return;
    }

    const want = expectedPosition(pb);

    // If new song selected
    if (loadedId.current !== pb.videoId) {
      loadedId.current = pb.videoId;
      lastSeekAt.current = Date.now();
      if (pb.isPlaying && enabledRef.current) {
        yt.loadVideoById({ videoId: pb.videoId, startSeconds: Math.max(0, want) });
      } else {
        yt.cueVideoById({
          videoId: pb.videoId,
          startSeconds: pb.isPlaying ? Math.max(0, want) : Math.max(0, pb.position || 0),
        });
      }
      return;
    }

    // Same song: update play / pause status smoothly without seeking
    if (pb.isPlaying) {
      if (enabledRef.current) {
        const st = yt.getPlayerState?.();
        if (st !== PLAYING && st !== BUFFERING) {
          try {
            yt.playVideo();
          } catch {}
        }
      }
    } else {
      try {
        yt.pauseVideo();
      } catch {}
    }
  }, []);

  // Create YouTube player instance
  useEffect(() => {
    let destroyed = false;
    loadYT().then((YT) => {
      if (destroyed || !wrapRef.current) return;
      const el = document.createElement('div');
      wrapRef.current.appendChild(el);
      ytRef.current = new YT.Player(el, {
        width: '100%',
        height: '100%',
        playerVars: {
          controls: 0,
          disablekb: 1,
          playsinline: 1,
          rel: 0,
          modestbranding: 1,
          fs: 0,
          iv_load_policy: 3,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            readyRef.current = true;
            apply();
          },
          onStateChange: (e) => {
            if (e.data === ENDED) onEndedRef.current?.();
            // Transitioning to PLAYING:
            if (e.data === PLAYING) {
              onBlockedRef.current?.(false);
              const cur = ytRef.current?.getCurrentTime?.() || 0;
              // Guest initial buffer alignment: ONLY once when song starts playing!
              if (!isHostRef.current && initialBufferDone.current !== loadedId.current) {
                initialBufferDone.current = loadedId.current;
                const want = expectedPosition(stateRef.current);
                if (Math.abs(want - cur) > 0.25) {
                  seek(ytRef.current, want);
                }
              }
              onPlayingStartRef.current?.(cur);
            }
            // Auto-resume cleanly only if still paused after 1.2s
            if (e.data === PAUSED) {
              const pb = stateRef.current;
              if (pb?.isPlaying && enabledRef.current) {
                if (!resumeTimer.current) {
                  resumeTimer.current = setTimeout(() => {
                    resumeTimer.current = null;
                    const yt = ytRef.current;
                    if (yt && stateRef.current?.isPlaying && enabledRef.current) {
                      const st = yt.getPlayerState?.();
                      if (st === PAUSED) {
                        try {
                          yt.playVideo();
                        } catch {}
                      }
                    }
                  }, 1200);
                }
              }
            }
          },
          onAutoplayBlocked: () => onBlockedRef.current?.(true),
          onError: (e) => onErrorRef.current?.(e.data),
        },
      });
    });
    return () => {
      destroyed = true;
      readyRef.current = false;
      loadedId.current = null;
      try {
        ytRef.current?.destroy();
      } catch {}
      ytRef.current = null;
      if (wrapRef.current) wrapRef.current.innerHTML = '';
    };
  }, [apply]);

  // React immediately to room state changes from WebSocket/Firebase (only track change or play/pause)
  useEffect(() => {
    stateRef.current = playback;
    enabledRef.current = enabled;
    apply();
  }, [playback?.videoId, playback?.isPlaying, enabled, apply]);

  // Stable sync heartbeat (every 1000ms instead of aggressive 250ms)
  useEffect(() => {
    const id = setInterval(() => {
      const yt = ytRef.current;
      const pb = stateRef.current;
      if (!yt || !readyRef.current) return;

      syncPlayback(false);

      if (pb?.videoId && pb.isPlaying && enabledRef.current) {
        const st = yt.getPlayerState();
        if (st === PLAYING || st === BUFFERING) {
          notPlaying.current = 0;
          onBlockedRef.current?.(false);
        } else if (st === UNSTARTED || st === CUED || st === PAUSED) {
          notPlaying.current += 1;
          if (notPlaying.current >= 4) onBlockedRef.current?.(true);
        }
      } else {
        notPlaying.current = 0;
        onBlockedRef.current?.(false);
      }
    }, SYNC_HEARTBEAT_MS);

    return () => clearInterval(id);
  }, [syncPlayback]);

  // Ensure audio stays alive when tab is minimized or switched to another app
  useEffect(() => {
    const handleVis = () => {
      const yt = ytRef.current;
      const pb = stateRef.current;
      if (!yt || !pb || !pb.videoId || !pb.isPlaying) return;

      try {
        const st = yt.getPlayerState();
        if (st !== PLAYING && st !== BUFFERING) {
          yt.playVideo();
        }
      } catch {}

      if (!document.hidden) {
        syncPlayback(true);
      }
    };

    document.addEventListener('visibilitychange', handleVis);
    window.addEventListener('blur', handleVis);
    window.addEventListener('focus', handleVis);
    return () => {
      document.removeEventListener('visibilitychange', handleVis);
      window.removeEventListener('blur', handleVis);
      window.removeEventListener('focus', handleVis);
    };
  }, [syncPlayback]);

  useImperativeHandle(
    ref,
    () => ({
      resync() {
        enabledRef.current = true;
        try {
          ytRef.current?.unMute?.();
        } catch {}
        syncPlayback(true);
      },
      getCurrentTime: () => {
        const t = ytRef.current?.getCurrentTime?.();
        return Number.isFinite(t) ? t : 0;
      },
      getDuration: () => {
        const d = ytRef.current?.getDuration?.();
        return Number.isFinite(d) ? d : 0;
      },
      setVolume: (v) => ytRef.current?.setVolume?.(v),
      isMuted: () => ytRef.current?.isMuted?.() || false,
      mute: () => ytRef.current?.mute?.(),
      unMute: () => ytRef.current?.unMute?.(),
    }),
    [syncPlayback]
  );

  return (
    <div
      className={
        showVideo
          ? 'fixed bottom-24 right-3 sm:right-6 w-72 sm:w-84 max-w-[calc(100vw-1.5rem)] aspect-video bg-black rounded-2xl overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.85)] border border-green-500/50 z-50 animate-in fade-in zoom-in-95 group'
          : 'fixed -bottom-[400px] -right-[400px] w-[240px] h-[240px] opacity-[0.01] pointer-events-none z-[1]'
      }
    >
      <div ref={wrapRef} className="absolute inset-0 [&_iframe]:w-full [&_iframe]:h-full" />
      {showVideo && (
        <button
          type="button"
          onClick={onCloseVideo}
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/80 hover:bg-black text-white/80 hover:text-white flex items-center justify-center text-xs z-10 border border-white/20 transition shadow"
          title="Hide Video Clip"
          aria-label="Hide Video Clip"
        >
          ✕
        </button>
      )}
      {showVideo && !playback?.videoId && (
        <div className="absolute inset-0 grid place-items-center bg-panel text-white/50 text-sm text-center px-6">
          Nothing playing yet — search or add a YouTube song below 🎵
        </div>
      )}
      {showVideo && children}
    </div>
  );
});

export default Player;
