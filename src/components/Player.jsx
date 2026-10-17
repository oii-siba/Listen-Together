import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import { loadYT } from '../lib/youtube';
import { serverNow } from '../lib/serverTime';

// Reliable, smooth synchronization settings
const HARD_DRIFT_THRESHOLD = 2.5; // 2.5s: Only hard seek if genuinely far behind or ahead
const MICRO_DRIFT_THRESHOLD = 0.75; // 750ms: Smooth 4% playback rate adjustment without audio stutter
const MIN_SEEK_COOLDOWN_MS = 3500; // 3.5s cooldown between hard seeks to avoid buffer loops
const SYNC_HEARTBEAT_MS = 1000; // Gentle 1-second check (stable, no browser thrashing)

const UNSTARTED = -1;
const ENDED = 0;
const PLAYING = 1;
const PAUSED = 2;
const BUFFERING = 3;
const CUED = 5;

// Where the song *should* be right now, based on the host's last write + global server clock.
export function expectedPosition(pb) {
  if (!pb) return 0;
  const base = pb.position || 0;
  if (!pb.isPlaying) return base;
  const updated = typeof pb.updatedAt === 'number' ? pb.updatedAt : serverNow();
  return base + Math.max(0, (serverNow() - updated) / 1000);
}

const Player = forwardRef(function Player(
  { playback, enabled, showVideo = false, onCloseVideo, onEnded, onError, onBlocked, children },
  ref
) {
  const wrapRef = useRef(null);
  const ytRef = useRef(null);
  const readyRef = useRef(false);
  const stateRef = useRef(playback);
  const enabledRef = useRef(enabled);
  const loadedId = useRef(null);
  const lastSeekAt = useRef(0);
  const notPlaying = useRef(0);
  const currentRate = useRef(1.0);

  const onEndedRef = useRef(onEnded);
  const onErrorRef = useRef(onError);
  const onBlockedRef = useRef(onBlocked);
  onEndedRef.current = onEnded;
  onErrorRef.current = onError;
  onBlockedRef.current = onBlocked;

  const seek = (yt, t) => {
    lastSeekAt.current = Date.now();
    try {
      yt.seekTo(Math.max(0, t), true);
    } catch {}
  };

  const setRate = (yt, rate) => {
    if (!yt) return;
    if (currentRate.current !== rate) {
      currentRate.current = rate;
      try {
        yt.setPlaybackRate(rate);
      } catch {}
    }
  };

  // Synchronize local player with the exact expected position without stutter
  const syncPlayback = useCallback((force = false) => {
    const yt = ytRef.current;
    const pb = stateRef.current;
    if (!yt || !readyRef.current || !pb || !pb.videoId) return;

    const st = yt.getPlayerState();
    const cur = yt.getCurrentTime() || 0;
    const want = expectedPosition(pb);
    const diff = want - cur; // positive => we are behind; negative => we are ahead
    const absDiff = Math.abs(diff);

    if (pb.isPlaying) {
      if (!enabledRef.current) return;
      if (st === ENDED) return;

      // If player paused or stopped unexpectedly, resume playback
      if (st !== PLAYING && st !== BUFFERING) {
        if (absDiff > HARD_DRIFT_THRESHOLD) {
          seek(yt, want);
        }
        try {
          yt.playVideo();
        } catch {}
        return;
      }

      // If currently playing:
      if (st === PLAYING) {
        const timeSinceLastSeek = Date.now() - lastSeekAt.current;

        // 1. If difference is large (> 2.5s) AND cooldown passed (> 3.5s) or forced: hard seek
        if (absDiff > HARD_DRIFT_THRESHOLD && (force || timeSinceLastSeek > MIN_SEEK_COOLDOWN_MS)) {
          seek(yt, want);
          setRate(yt, 1.0);
        }
        // 2. If slight drift (0.75s - 2.5s): dynamically adjust speed without ANY audio stutter
        else if (absDiff > MICRO_DRIFT_THRESHOLD) {
          if (diff > 0) {
            // We are slightly behind, run 4% faster to gently catch up
            setRate(yt, 1.04);
          } else {
            // We are slightly ahead, run 4% slower to gently let others catch up
            setRate(yt, 0.96);
          }
        }
        // 3. Perfect sync (< 750ms): normal speed, 100% continuous uninterrupted music
        else {
          setRate(yt, 1.0);
        }
      }
    } else {
      // Paused state
      setRate(yt, 1.0);
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
      setRate(yt, 1.0);
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

    // Same song: update play / pause status smoothly
    if (pb.isPlaying) {
      if (enabledRef.current) {
        const st = yt.getPlayerState();
        if (st !== PLAYING && st !== BUFFERING) {
          const cur = yt.getCurrentTime() || 0;
          if (Math.abs(want - cur) > HARD_DRIFT_THRESHOLD) {
            seek(yt, want);
          }
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
            // When transitioning to PLAYING, reset rate to normal and do NOT force-seek (prevents stutter feedback loop)
            if (e.data === PLAYING) {
              setRate(ytRef.current, 1.0);
              onBlockedRef.current?.(false);
            }
            // If browser or mobile OS paused player while room is playing, auto-resume
            if (e.data === PAUSED) {
              const pb = stateRef.current;
              if (pb?.isPlaying && enabledRef.current) {
                setTimeout(() => {
                  try {
                    ytRef.current?.playVideo();
                  } catch {}
                }, 150);
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

  // React immediately to room state changes from WebSocket/Firebase
  useEffect(() => {
    stateRef.current = playback;
    enabledRef.current = enabled;
    apply();
  }, [playback?.videoId, playback?.isPlaying, playback?.position, playback?.updatedAt, enabled, apply]);

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
    }),
    [syncPlayback]
  );

  return (
    <div
      className={
        showVideo
          ? 'fixed bottom-24 right-3 sm:right-6 w-72 sm:w-84 max-w-[calc(100vw-1.5rem)] aspect-video bg-black rounded-2xl overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.85)] border border-green-500/50 z-50 animate-in fade-in zoom-in-95 group'
          : 'fixed bottom-0 right-0 w-2 h-2 opacity-[0.01] pointer-events-none z-[1]'
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
