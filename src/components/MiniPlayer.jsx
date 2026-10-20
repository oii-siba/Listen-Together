import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { usePlayback } from '../context/PlaybackContext';
import { fmtTime } from '../lib/utils';
import { Play, Pause, Next, Close, Volume } from './Icons';

function Rewind10Icon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 17l-5-5 5-5" />
      <path d="M18 17l-5-5 5-5" />
    </svg>
  );
}

function VolumeMuteIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  );
}

export default function MiniPlayer() {
  const {
    activeRoomId,
    playback,
    isHost,
    togglePlay,
    playNext,
    seekTo,
    leaveRoom,
    playerRef,
  } = usePlayback();

  const location = useLocation();
  const navigate = useNavigate();

  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);
  const [muted, setMuted] = useState(false);
  const [scrolledDown, setScrolledDown] = useState(false);
  const scrubBarRef = useRef(null);

  const isInsideRoom = location.pathname === `/room/${activeRoomId}`;

  // Poll player time for live progress bar
  useEffect(() => {
    const id = setInterval(() => {
      const p = playerRef.current;
      if (!p) return;
      setCur(p.getCurrentTime() || 0);
      setDur(p.getDuration() || 0);
      setMuted(p.isMuted?.() || false);
    }, 350);
    return () => clearInterval(id);
  }, [playerRef]);

  // Track scroll position inside room
  useEffect(() => {
    if (!isInsideRoom) {
      setScrolledDown(false);
      return;
    }
    const onScroll = () => {
      setScrolledDown(window.scrollY > 280);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [isInsideRoom]);

  // If no room is active or no song loaded, hide
  if (!activeRoomId || !playback?.videoId) return null;

  // Inside room: only show if user scrolled down past hero player
  if (isInsideRoom && !scrolledDown) return null;

  const handleOpenRoom = () => {
    try {
      playerRef.current?.resync();
    } catch {}
    if (!isInsideRoom) {
      navigate(`/room/${activeRoomId}`);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleScrub = (e) => {
    e.stopPropagation();
    if (!isHost || !scrubBarRef.current || dur <= 0) return;
    const rect = scrubBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, clickX / rect.width));
    seekTo(pct * dur);
  };

  const handleRewind10 = (e) => {
    e.stopPropagation();
    if (!isHost) return;
    const nextTime = Math.max(0, cur - 10);
    seekTo(nextTime);
  };

  const handleToggleMute = (e) => {
    e.stopPropagation();
    const p = playerRef.current;
    if (!p) return;
    if (muted) {
      p.unMute?.();
      setMuted(false);
    } else {
      p.mute?.();
      setMuted(true);
    }
  };

  const isPlaying = !!playback?.isPlaying;
  const effectiveCur = !isPlaying && typeof playback?.position === 'number' ? playback.position : cur;
  const progressPct = dur > 0 ? Math.min(100, Math.max(0, (effectiveCur / dur) * 100)) : 0;

  return (
    <aside
      aria-label="Global Mini Player Controls"
      className="fixed bottom-[calc(4.25rem+env(safe-area-inset-bottom))] md:bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-2.5 right-2.5 sm:left-4 sm:right-4 max-w-xl md:max-w-2xl lg:max-w-3xl mx-auto z-50 bg-[#0A100D]/95 backdrop-blur-2xl border border-[#00FF87]/35 rounded-[22px] shadow-[0_16px_50px_rgba(0,0,0,0.95),0_0_30px_rgba(0,255,135,0.18)] overflow-hidden animate-in slide-in-from-bottom-5 duration-250 select-none"
    >
      {/* Top Edge Interactive Scrubber / Progress Bar */}
      <div
        ref={scrubBarRef}
        onClick={isHost ? handleScrub : undefined}
        className={`w-full h-1.5 bg-white/10 transition-all relative group ${
          isHost ? 'hover:h-2 cursor-pointer' : 'cursor-default'
        }`}
        title={isHost ? 'Click to seek' : 'Progress'}
      >
        <div
          className="h-full bg-gradient-to-r from-[#00FF87] via-[#4ade80] to-[#00C96B] shadow-[0_0_12px_rgba(0,255,135,0.8)] relative"
          style={{ width: `${progressPct}%` }}
        >
          {isHost && (
            <span className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white opacity-0 group-hover:opacity-100 shadow transition-opacity" />
          )}
        </div>
      </div>

      <div className="flex items-center gap-2.5 sm:gap-3 p-2 sm:p-2.5">
        {/* Album Artwork with Spinning Vinyl Pulse */}
        <div
          onClick={handleOpenRoom}
          className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-xl overflow-hidden shrink-0 border border-[#00FF87]/70 cursor-pointer group shadow-[0_0_12px_rgba(0,255,135,0.35)]"
          title={isInsideRoom ? 'Scroll to Top' : 'Open Full Room'}
        >
          <img
            src={playback.thumb || `https://i.ytimg.com/vi/${playback.videoId}/hqdefault.jpg`}
            alt=""
            className={`w-full h-full object-cover transition ${playback.isPlaying ? 'scale-105' : 'grayscale-[20%]'}`}
          />
          {playback.isPlaying && (
            <span className="absolute inset-0 bg-[#00FF87]/15 flex items-center justify-center">
              <span className="w-2 h-2 rounded-full bg-[#00FF87] animate-ping" />
            </span>
          )}
        </div>

        {/* Title, Time, & Room ID (Click to Expand / Scroll) */}
        <div onClick={handleOpenRoom} className="min-w-0 flex-1 cursor-pointer">
          <p className="font-extrabold text-xs text-[#F5F7F5] truncate hover:text-[#00FF87] transition">
            {playback.title || 'Now Playing'}
          </p>
          <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] text-[#00FF87] font-medium mt-0.5 truncate">
            <span className="font-mono text-white/70">
              {fmtTime(cur)} / {fmtTime(dur)}
            </span>
            <span className="text-white/20">·</span>
            <span className="truncate flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00FF87] animate-pulse shrink-0" />
              Room #{activeRoomId}
            </span>
            <span className="text-white/40 shrink-0 font-normal hidden sm:inline">
              {isInsideRoom ? '· Scroll ↗' : '· Tap to open ↗'}
            </span>
          </div>
        </div>

        {/* Global Music Controls */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Rewind 10 Seconds (Host only, responsive on narrow screens) */}
          {isHost && (
            <button
              type="button"
              onClick={handleRewind10}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white hidden xs:flex items-center justify-center active:scale-95 transition"
              title="Rewind 10s"
            >
              <Rewind10Icon size={15} />
            </button>
          )}

          {/* Play / Pause Toggle Button (Host only) */}
          {isHost ? (
            <button
              type="button"
              onClick={togglePlay}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full neon-green-btn text-[#020403] flex items-center justify-center active:scale-90 transition cursor-pointer"
              title={playback.isPlaying ? 'Pause' : 'Play'}
            >
              {playback.isPlaying ? <Pause size={18} /> : <Play size={18} />}
            </button>
          ) : (
            <div className="px-2 sm:px-2.5 py-1 rounded-full bg-[#00FF87]/10 border border-[#00FF87]/25 flex items-center gap-1 text-[10px] text-[#00FF87] font-bold tracking-wider select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00FF87] animate-pulse" />
              <span>SYNC</span>
            </div>
          )}

          {/* Next Track Button (Host only) */}
          {isHost && (
            <button
              type="button"
              onClick={playNext}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-panel2 border border-white/10 hover:bg-white/15 text-white/90 flex items-center justify-center active:scale-95 transition"
              title="Next Track"
            >
              <Next size={15} />
            </button>
          )}

          {/* Mute / Unmute Button */}
          <button
            type="button"
            onClick={handleToggleMute}
            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs transition active:scale-95 ${
              muted
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white'
            }`}
            title={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? <VolumeMuteIcon size={15} /> : <Volume size={15} />}
          </button>

          {/* Close / Leave Room Button */}
          <button
            type="button"
            onClick={leaveRoom}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-400 flex items-center justify-center text-xs transition"
            title="Leave Room & Stop Music"
            aria-label="Leave Room"
          >
            <Close size={13} />
          </button>
        </div>
      </div>
    </aside>
  );
}
