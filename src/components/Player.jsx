import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import { loadYT } from '../lib/youtube';
import { serverNow } from '../lib/serverTime';

const DRIFT = 1.5; // seconds of drift tolerated before auto-seek
const UNSTARTED = -1;
const ENDED = 0;
const PLAYING = 1;
const PAUSED = 2;
const BUFFERING = 3;
const CUED = 5;

// Where the song *should* be right now, based on the host's last write + server clock.
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

  const onEndedRef = useRef(onEnded);
  const onErrorRef = useRef(onError);
  const onBlockedRef = useRef(onBlocked);
  onEndedRef.current = onEnded;
  onErrorRef.current = onError;
  onBlockedRef.current = onBlocked;

  const seek = (yt, t) => {
    lastSeekAt.current = Date.now();
    yt.seekTo(Math.max(0, t), true);
  };

  // Make the local player match the shared room state.
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

    if (loadedId.current !== pb.videoId) {
      loadedId.current = pb.videoId;
      lastSeekAt.current = Date.now();
      if (pb.isPlaying && enabledRef.current) {
        yt.loadVideoById({ videoId: pb.videoId, startSeconds: want });
      } else {
        yt.cueVideoById({ videoId: pb.videoId, startSeconds: pb.isPlaying ? want : pb.position || 0 });
      }
      return;
    }

    const st = yt.getPlayerState();
    const cur = yt.getCurrentTime() || 0;
    const recentlySeeked = Date.now() - lastSeekAt.current < 1500;

    if (pb.isPlaying) {
      if (!enabledRef.current) return;
      if (st === ENDED) return;
      if (st !== PLAYING && st !== BUFFERING) {
        if (Math.abs(cur - want) > 1) seek(yt, want);
        yt.playVideo();
      } else if (!recentlySeeked && Math.abs(cur - want) > DRIFT) {
        seek(yt, want);
      }
    } else {
      if (st === PLAYING || st === BUFFERING) yt.pauseVideo();
      if (st !== CUED && st !== UNSTARTED && !recentlySeeked && Math.abs(cur - (pb.position || 0)) > 0.5) {
        seek(yt, pb.position || 0);
      }
    }
  }, []);

  // Create the YouTube player once.
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
            if (e.data === PLAYING) apply(); // quick drift correction right after buffering
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
      } catch {
        /* ignore */
      }
      ytRef.current = null;
      if (wrapRef.current) wrapRef.current.innerHTML = '';
    };
  }, [apply]);

  // React to room state changes.
  useEffect(() => {
    stateRef.current = playback;
    enabledRef.current = enabled;
    apply();
  }, [playback?.videoId, playback?.isPlaying, playback?.position, playback?.updatedAt, enabled, apply]);

  // Heartbeat: drift correction + autoplay-blocked detection.
  useEffect(() => {
    const id = setInterval(() => {
      const yt = ytRef.current;
      const pb = stateRef.current;
      if (!yt || !readyRef.current) return;
      apply();
      if (pb?.videoId && pb.isPlaying && enabledRef.current) {
        const st = yt.getPlayerState();
        if (st === PLAYING || st === BUFFERING) {
          notPlaying.current = 0;
          onBlockedRef.current?.(false);
        } else if (st === UNSTARTED || st === CUED || st === PAUSED) {
          notPlaying.current += 1;
          if (notPlaying.current >= 3) onBlockedRef.current?.(true);
        }
      } else {
        notPlaying.current = 0;
        onBlockedRef.current?.(false);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [apply]);

  useImperativeHandle(
    ref,
    () => ({
      // Call this from a tap handler: unlocks audio on mobile and jumps to the live position.
      resync() {
        enabledRef.current = true;
        try {
          ytRef.current?.unMute?.();
        } catch {
          /* ignore */
        }
        apply();
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
    [apply]
  );

  return (
    <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-lg shadow-black/40">
      {/* pointer-events-none: nobody can tap the video and desync themselves */}
      <div ref={wrapRef} className="absolute inset-0 pointer-events-none [&_iframe]:w-full [&_iframe]:h-full" />
      {!playback?.videoId && (
        <div className="absolute inset-0 grid place-items-center bg-panel text-white/50 text-sm text-center px-6">
          Nothing playing yet — add a YouTube song below 🎵
        </div>
      )}
      {children}
    </div>
  );
});

export default Player;
