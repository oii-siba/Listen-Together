import { useEffect, useState } from 'react';
import { fmtTime } from '../lib/utils';
import { Next, Pause, Play, Volume } from './Icons';

function SpotifyIcon({ size = 22, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.498 17.303c-.217.357-.681.472-1.038.255-2.846-1.74-6.429-2.133-10.648-1.168-.41.094-.816-.16-.91-.57-.093-.41.16-.816.57-.91 4.624-1.057 8.583-.604 11.77 1.354.358.217.473.681.256 1.039zm1.468-3.262c-.274.444-.858.587-1.303.313-3.259-2.003-8.227-2.585-12.083-1.414-.499.152-1.031-.132-1.183-.631-.152-.499.132-1.031.631-1.183 4.412-1.339 9.897-.685 13.623 1.611.444.274.587.859.315 1.304zm.126-3.41c-3.908-2.321-10.354-2.535-14.091-1.399-.6.182-1.24-.16-1.422-.76-.182-.6.16-1.24.76-1.422 4.301-1.306 11.417-1.054 15.898 1.606.539.32.715 1.018.395 1.557-.32.539-1.018.715-1.557.395z" />
    </svg>
  );
}

function PrevIcon({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
    </svg>
  );
}

export default function NowPlaying({ playback, playerRef, isHost, onToggle, onNext, onSeek }) {
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);
  const [scrub, setScrub] = useState(null);
  const [vol, setVol] = useState(100);

  useEffect(() => {
    const id = setInterval(() => {
      const p = playerRef.current;
      if (!p) return;
      setCur(p.getCurrentTime());
      setDur(p.getDuration());
    }, 250);
    return () => clearInterval(id);
  }, [playerRef]);

  const has = !!playback?.videoId;
  const isPlaying = !!playback?.isPlaying;
  const shown = scrub ?? cur;
  const max = dur > 0 ? dur : 1;
  const remaining = Math.max(0, dur - shown);

  const commit = () => {
    if (scrub != null) {
      onSeek(scrub);
      setScrub(null);
    }
  };

  const handlePrev = () => {
    if (!isHost) return;
    if (shown > 3) {
      onSeek(0);
    } else {
      onSeek(0);
    }
  };

  return (
    <div className="relative w-full max-w-md mx-auto my-4 rounded-[32px] overflow-hidden shadow-2xl bg-black border border-orange-500/30">
      {/* Background Image: AirPods Case with warm studio lighting */}
      <div className="relative w-full aspect-[9/13] sm:aspect-[9/14] overflow-hidden">
        <img
          src="/airpods_hero.jpg"
          alt="AirPods Hero Background"
          className="absolute inset-0 w-full h-full object-cover object-bottom"
        />

        {/* Cinematic Vignette Overlay matching reference */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#ff5500]/60 via-transparent to-black/70 pointer-events-none" />

        {/* Top Tagline matching reference style */}
        <div className="relative z-10 pt-7 px-6 text-center">
          <p className="text-white/95 text-base sm:text-lg font-bold tracking-tight drop-shadow-md">
            {has ? 'Now playing in sync' : 'La Misión para la racha,'}
          </p>
          <p className="text-white/80 text-xs sm:text-sm font-medium tracking-tight mt-0.5 drop-shadow">
            {has ? 'everyone hears the exact same moment.' : 'porque es un temazo.'}
          </p>
        </div>

        {/* GLOWING NEON HUD PLAYER CAPSULE floating above AirPods case */}
        <div className="absolute top-[22%] left-4 right-4 z-20">
          <div className="neon-orange-box rounded-[28px] bg-black/75 backdrop-blur-xl p-4 transition-all duration-300">
            {/* Top Row: Album Thumbnail + Title & Artist */}
            <div className="flex items-center gap-3.5">
              {has && playback.thumb ? (
                <img
                  src={playback.thumb}
                  alt={playback.title}
                  className="w-16 h-16 rounded-xl object-cover shadow-lg border border-orange-500/40 shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-orange-600 to-amber-700 flex items-center justify-center text-white/80 shrink-0 border border-orange-400/40 shadow-lg">
                  <span className="text-2xl">🎧</span>
                </div>
              )}

              <div className="min-w-0 flex-1">
                <h3 className="font-extrabold text-white text-base leading-tight line-clamp-1 drop-shadow">
                  {has ? playback.title || 'YouTube Song' : 'Select a Song'}
                </h3>
                <p className="text-xs text-white/70 truncate mt-0.5 font-medium">
                  {has
                    ? playback.addedByName
                      ? `Added by ${playback.addedByName}`
                      : 'Live in room'
                    : 'Search songs below'}
                </p>
              </div>
            </div>

            {/* Middle Row: Progress Slider with Left & Right Timestamps */}
            <div className="mt-3.5 px-0.5">
              <input
                type="range"
                min={0}
                max={max}
                step={1}
                value={Math.min(shown, max)}
                disabled={!isHost || !has}
                onChange={(e) => setScrub(Number(e.target.value))}
                onPointerUp={commit}
                onTouchEnd={commit}
                onKeyUp={commit}
                className="w-full h-1.5 rounded-full cursor-pointer transition disabled:cursor-default"
                aria-label="Seek"
              />
              <div className="flex justify-between text-[11px] font-semibold text-white/75 mt-1 tabular-nums px-0.5">
                <span>{fmtTime(shown)}</span>
                <span>-{fmtTime(remaining)}</span>
              </div>
            </div>

            {/* Bottom Row: Prev, Big Play/Pause, Next, Spotify Logo */}
            <div className="mt-2 flex items-center justify-between px-2 pt-1">
              <div className="w-6" /> {/* spacer to balance left */}

              <div className="flex items-center gap-5">
                {/* Previous */}
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={!isHost || !has}
                  className="text-white/80 hover:text-white active:scale-90 transition disabled:opacity-30 p-1"
                  aria-label="Previous"
                >
                  <PrevIcon size={24} />
                </button>

                {/* Big Center Play / Pause */}
                <button
                  type="button"
                  onClick={onToggle}
                  disabled={!isHost || !has}
                  className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition shadow-lg shadow-white/20 disabled:opacity-40"
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? (
                    <div className="flex gap-1 items-center justify-center">
                      <div className="w-1.5 h-5 bg-black rounded-sm" />
                      <div className="w-1.5 h-5 bg-black rounded-sm" />
                    </div>
                  ) : (
                    <div className="ml-1 w-0 h-0 border-y-[8px] border-y-transparent border-l-[14px] border-l-black" />
                  )}
                </button>

                {/* Next */}
                <button
                  type="button"
                  onClick={onNext}
                  disabled={!isHost || !has}
                  className="text-white/80 hover:text-white active:scale-90 transition disabled:opacity-30 p-1"
                  aria-label="Next"
                >
                  <Next size={24} />
                </button>
              </div>

              {/* Spotify / Branding Icon matching reference photo */}
              <div className="text-white/80 hover:text-accent transition">
                <SpotifyIcon size={24} className="text-white/90" />
              </div>
            </div>
          </div>
        </div>

        {/* Volume & Host Status Bar at the bottom of the card */}
        <div className="absolute bottom-3 left-4 right-4 z-20 flex items-center justify-between bg-black/60 backdrop-blur-md rounded-full px-4 py-2 border border-white/10 text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                isPlaying ? 'bg-orange-500 animate-ping' : 'bg-white/40'
              }`}
            />
            <span className="text-white/80 font-medium">
              {isHost ? 'You are Host' : 'Listening in Sync'}
            </span>
          </div>

          <div className="flex items-center gap-2 w-28">
            <Volume size={16} className="text-white/60 shrink-0" />
            <input
              type="range"
              min={0}
              max={100}
              value={vol}
              onChange={(e) => {
                const v = Number(e.target.value);
                setVol(v);
                playerRef.current?.setVolume(v);
              }}
              className="w-full h-1"
              aria-label="Volume"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
