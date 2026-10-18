import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import { loadYT } from '../lib/youtube';
import { serverNow } from '../lib/serverTime';

// High-precision, real-time synchronization settings
const DRIFT_THRESHOLD = 0.35; // 350ms: anything above 350ms is audibly noticeable delay between devices
const MIN_SEEK_COOLDOWN_MS = 1800; // 1.8s cooldown between seeks to allow YouTube buffer to settle cleanly
const SYNC_HEARTBEAT_MS = 600; // Check every 600ms for tight, real-time synchronization

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
  { playback, enabled, showVideo = false, onCloseVideo, onEnded, onError, onBlocked, onPlayingStart, children },
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
  const resumeTimer = useRef(null);

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
        if (absDiff > DRIFT_THRESHOLD) {
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

        // If difference exceeds 350ms AND cooldown passed or forced: seek to exact position
        if (absDiff > DRIFT_THRESHOLD && (force || timeSinceLastSeek > MIN_SEEK_COOLDOWN_MS)) {
          seek(yt, want);
        }
      }
    } else {
      // Paused state
      if (st === PLAYING || st === BUFFERING) {
        try {
          yt.pauseVideo();
        } catch {}
      }
      if (st !== CUED && st !== UNSTARTED && absDiff > 0.3) {
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

    // Same song: update play / pause status smoothly
    if (pb.isPlaying) {
      if (enabledRef.current) {
        const st = yt.getPlayerState();
        if (st !== PLAYING && st !== BUFFERING) {
          const cur = yt.getCurrentTime() || 0;
          if (Math.abs(want - cur) > DRIFT_THRESHOLD) {
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
            // When transitioning to PLAYING, snap sync if buffering caused a drift
            if (e.data === PLAYING) {
              onBlockedRef.current?.(false);
              const cur = ytRef.current?.getCurrentTime() || 0;
              const want = expectedPosition(stateRef.current);
              if (Math.abs(want - cur) > DRIFT_THRESHOLD) {
                seek(ytRef.current, want);
              }
              onPlayingStartRef.current?.(cur);
            }
            // If browser or mobile OS paused player while room is playing, auto-resume cleanly
            if (e.data === PAUSED) {
              const pb = stateRef.current;
              if (pb?.isPlaying && enabledRef.current) {
                if (!resumeTimer.current) {
                  resumeTimer.current = setTimeout(() => {
                    resumeTimer.current = null;
                    try {
                      ytRef.current?.playVideo();
                    } catch {}
                  }, 400);
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
