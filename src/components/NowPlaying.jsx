import { useEffect, useState } from 'react';
import { fmtTime } from '../lib/utils';
import { Next, Pause, Play, Volume } from './Icons';
import AudioVisualizer from './AudioVisualizer';
import { isSongFavorite, toggleFavoriteSong, logSongHistory } from '../lib/userData';

function PrevIcon({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
    </svg>
  );
}

export default function NowPlaying({ playback, playerRef, isHost, user, onToggle, onNext, onSeek }) {
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);
  const [scrub, setScrub] = useState(null);
  const [vol, setVol] = useState(100);
  const [isFav, setIsFav] = useState(false);

  useEffect(() => {
    const id = setInterval(() => {
      const p = playerRef.current;
      if (!p) return;
      setCur(p.getCurrentTime());
      setDur(p.getDuration());
    }, 250);
    return () => clearInterval(id);
  }, [playerRef]);

  // Sync favorite state and log history on song change
  useEffect(() => {
    if (!user?.uid || !playback?.videoId) return;
    setIsFav(isSongFavorite(user.uid, playback.videoId));
    logSongHistory(user.uid, {
      videoId: playback.videoId,
      title: playback.title || 'YouTube Song',
      thumb: playback.thumb,
    });
  }, [playback?.videoId, user?.uid, playback?.title, playback?.thumb]);

  const handleToggleFav = async () => {
    if (!user?.uid || !playback?.videoId) return;
    const nowFav = await toggleFavoriteSong(user.uid, {
      videoId: playback.videoId,
      title: playback.title,
      thumb: playback.thumb,
    });
    setIsFav(nowFav);
  };


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
    onSeek(0);
  };

  return (
    <div className="relative w-full max-w-md mx-auto my-4 rounded-[28px] overflow-hidden shadow-2xl bg-black border border-green-500/30">
      {/* Background Image: TuneTogether Earbuds Case with green ambient glow */}
      <div className="relative w-full aspect-[9/13] sm:aspect-[9/14] overflow-hidden">
        <img
          src="/airpods_green.jpg"
          alt="TuneTogether Earbuds"
          className="absolute inset-0 w-full h-full object-cover object-bottom"
        />

        {/* Cinematic Ambient Dark Green Vignette */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#052e16]/80 via-transparent to-black/85 pointer-events-none" />

        {/* Top Tagline */}
        <div className="relative z-10 pt-6 px-6 text-center">
          <p className="text-white/95 text-base sm:text-lg font-bold tracking-tight drop-shadow-md">
            {has ? 'Now playing in perfect sync' : 'Room is ready'}
          </p>
          <p className="text-green-400 text-xs sm:text-sm font-semibold tracking-tight mt-0.5 drop-shadow">
            {has ? 'one beat · one connection' : 'pick a song below to start listening together 🎵'}
          </p>
        </div>

        {/* GLOWING NEON GREEN HUD PLAYER CAPSULE */}
        <div className="absolute top-[20%] left-4 right-4 z-20">
          <div className="neon-green-box rounded-[26px] bg-black/80 backdrop-blur-xl p-4 transition-all duration-300">
            {/* Top Row: Album Thumbnail + Title & Artist */}
            <div className="flex items-center gap-3">
              {has && playback.thumb ? (
                <img
                  src={playback.thumb}
                  alt={playback.title}
                  className="w-14 h-14 rounded-xl object-cover shadow-lg border border-green-500/40 shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-white/40 shrink-0 shadow-inner">
                  <span className="text-2xl opacity-70">🎧</span>
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      has && isPlaying ? 'bg-green-400 animate-pulse' : 'bg-white/30'
                    }`}
                  />
                  <span
                    className={`text-[10px] font-bold tracking-wider uppercase ${
                      has && isPlaying ? 'text-green-400' : 'text-white/40'
                    }`}
                  >
                    {has
                      ? `LIVE · ${isHost ? 'HOST' : 'LISTENING'}`
                      : 'IDLE · NO SONG PLAYING'}
                  </span>
                </div>
                <h3 className="font-extrabold text-white text-base leading-tight line-clamp-1 drop-shadow mt-0.5">
                  {has ? playback.title || 'YouTube Song' : 'No song playing right now'}
                </h3>
                <p className="text-xs text-white/50 truncate mt-0.5 font-medium">
                  {has
                    ? playback.addedByName
                      ? `Added by ${playback.addedByName}`
                      : 'Live in room'
                    : isHost
                    ? 'Search or pick a song below to play 🎵'
                    : 'Waiting for host to pick a song 🎧'}
                </p>
              </div>

              {/* Favorite Song Heart Toggle */}
              {has && (
                <button
                  type="button"
                  onClick={handleToggleFav}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center active:scale-125 transition text-base shrink-0"
                  title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <span className={isFav ? 'text-red-500 scale-110 drop-shadow-[0_0_8px_rgba(239,68,68,0.7)]' : 'text-white/40'}>
                    {isFav ? '❤️' : '🤍'}
                  </span>
                </button>
              )}
            </div>

            {/* Audio Visualizer Equalizer Waves */}
            <div className="mt-2.5 -mb-1">
              <AudioVisualizer isPlaying={has && isPlaying} barCount={26} />
            </div>

            {/* Middle Row: Progress Slider with Left & Right Timestamps */}
            <div className="mt-2 px-0.5">
              <input
                type="range"
                min={0}
                max={max}
                step={1}
                value={has ? Math.min(shown, max) : 0}
                disabled={!isHost || !has}
                onChange={(e) => setScrub(Number(e.target.value))}
                onPointerUp={commit}
                onTouchEnd={commit}
                onKeyUp={commit}
                className="w-full h-1.5 rounded-full cursor-pointer transition disabled:cursor-default"
                aria-label="Seek"
              />
              <div className="flex justify-between text-[11px] font-semibold text-white/50 mt-1 tabular-nums px-0.5">
                <span>{has ? fmtTime(shown) : '0:00'}</span>
                <span>{has ? `-${fmtTime(remaining)}` : '0:00'}</span>
              </div>
            </div>

            {/* Bottom Row: Prev, Big Play/Pause, Next, Logo Icon */}
            <div className="mt-2 flex items-center justify-between px-2 pt-1">
              <div className="w-6" /> {/* spacer */}

              <div className="flex items-center gap-5">
                {/* Previous */}
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={!isHost || !has}
                  className="text-white/40 hover:text-white active:scale-90 transition disabled:opacity-20 p-1 disabled:cursor-not-allowed"
                  aria-label="Previous"
                >
                  <PrevIcon size={24} />
                </button>

                {/* Big Center Play / Pause */}
                <button
                  type="button"
                  onClick={onToggle}
                  disabled={!isHost || !has}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition shadow-lg ${
                    has
                      ? 'bg-white text-black hover:scale-105 active:scale-95 shadow-white/30 cursor-pointer'
                      : 'bg-white/10 text-white/30 cursor-not-allowed shadow-none'
                  }`}
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {has && isPlaying ? (
                    <div className="flex gap-1 items-center justify-center">
                      <div className="w-1.5 h-5 bg-black rounded-sm" />
                      <div className="w-1.5 h-5 bg-black rounded-sm" />
                    </div>
                  ) : (
                    <div
                      className={`ml-1 w-0 h-0 border-y-[8px] border-y-transparent border-l-[14px] ${
                        has ? 'border-l-black' : 'border-l-white/30'
                      }`}
                    />
                  )}
                </button>

                {/* Next */}
                <button
                  type="button"
                  onClick={onNext}
                  disabled={!isHost || !has}
                  className="text-white/40 hover:text-white active:scale-90 transition disabled:opacity-20 p-1 disabled:cursor-not-allowed"
                  aria-label="Next"
                >
                  <Next size={24} />
                </button>
              </div>

              {/* TuneTogether Icon */}
              <div className="w-6 h-6 rounded-full overflow-hidden border border-green-400/60 shadow-[0_0_8px_rgba(34,197,94,0.5)]">
                <img src="/logo.png" alt="" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        </div>


        {/* Volume & Status Bar at bottom of card */}
        <div className="absolute bottom-3 left-4 right-4 z-20 flex items-center justify-between bg-black/70 backdrop-blur-md rounded-full px-4 py-2 border border-white/10 text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                has && isPlaying ? 'bg-green-400 animate-ping' : 'bg-white/30'
              }`}
            />
            <span className="text-white/70 font-medium">
              {has ? (isHost ? 'You are Host' : 'Listening in Sync') : 'Room Idle'}
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
