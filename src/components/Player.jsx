import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import { loadYT } from '../lib/youtube';
import { serverNow } from '../lib/serverTime';

// Ultra-tight synchronization settings
const HARD_DRIFT_THRESHOLD = 0.45; // 450ms: Hard seek immediately
const MICRO_DRIFT_THRESHOLD = 0.15; // 150ms: Smooth playback rate adjustment
const SYNC_HEARTBEAT_MS = 250; // Check sync 4 times a second (was 1000ms)

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

const Player = forwardRef(function Player({ playback, enabled, onEnded, onError, onBlocked, children }, ref) {
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
    if (currentRate.current !== rate) {
      currentRate.current = rate;
      try {
        yt.setPlaybackRate(rate);
      } catch {}
    }
  };

  // Synchronize local player with the exact expected position
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

      // If player paused or stopped unexpectedly, resume
      if (st !== PLAYING && st !== BUFFERING) {
        if (absDiff > HARD_DRIFT_THRESHOLD) seek(yt, want);
        yt.playVideo();
        return;
      }

      // If currently playing:
      if (st === PLAYING) {
        const timeSinceLastSeek = Date.now() - lastSeekAt.current;

        // 1. If difference is large (> 450ms) or forced (e.g. just finished buffering): hard seek
        if (absDiff > HARD_DRIFT_THRESHOLD && (force || timeSinceLastSeek > 800)) {
          seek(yt, want);
          setRate(yt, 1.0);
        }
        // 2. If slight drift (150ms - 450ms): dynamically adjust speed without audio stutter
        else if (absDiff > MICRO_DRIFT_THRESHOLD) {
          if (diff > 0) {
            // We are slightly behind, run 5% faster to catch up
            setRate(yt, 1.05);
          } else {
            // We are slightly ahead, run 5% slower to let the other catch up
            setRate(yt, 0.95);
          }
        }
        // 3. Perfect sync (< 150ms): normal speed
        else {
          setRate(yt, 1.0);
        }
      }
    } else {
      // Paused state
      setRate(yt, 1.0);
      if (st === PLAYING || st === BUFFERING) {
        yt.pauseVideo();
      }
      if (st !== CUED && st !== UNSTARTED && absDiff > 0.2) {
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
        yt.stopVideo();
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
        yt.loadVideoById({ videoId: pb.videoId, startSeconds: want });
      } else {
        yt.cueVideoById({ videoId: pb.videoId, startSeconds: pb.isPlaying ? want : pb.position || 0 });
      }
      return;
    }

    syncPlayback(false);
  }, [syncPlayback]);

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
            // CRITICAL FIX: As soon as video finishes buffering and transitions to PLAYING,
            // immediately snap directly to the exact live second to eliminate the 1-3s buffer lag!
            if (e.data === PLAYING) {
              syncPlayback(true);
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
  }, [apply, syncPlayback]);

  // React immediately to room state changes from WebSocket
  useEffect(() => {
    stateRef.current = playback;
    enabledRef.current = enabled;
    apply();
  }, [playback?.videoId, playback?.isPlaying, playback?.position, playback?.updatedAt, enabled, apply]);

  // High-frequency sync heartbeat (every 250ms)
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
    <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-lg shadow-black/40">
      <div ref={wrapRef} className="absolute inset-0 pointer-events-none [&_iframe]:w-full [&_iframe]:h-full" />
      {!playback?.videoId && (
        <div className="absolute inset-0 grid place-items-center bg-panel text-white/50 text-sm text-center px-6">
          Nothing playing yet — search or add a YouTube song below 🎵
        </div>
      )}
      {children}
    </div>
  );
});

export default Player;
