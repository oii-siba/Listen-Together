import { useEffect, useState } from 'react';
import { fmtTime } from '../lib/utils';
import { Next, Pause, Play, Volume } from './Icons';

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
    }, 500);
    return () => clearInterval(id);
  }, [playerRef]);

  const has = !!playback?.videoId;
  const shown = scrub ?? cur;
  const max = dur > 0 ? dur : 1;

  const commit = () => {
    if (scrub != null) {
      onSeek(scrub);
      setScrub(null);
    }
  };

  return (
    <div className="mt-4 bg-panel rounded-2xl p-4">
      <div className="flex items-center gap-3">
        {has && playback.thumb ? (
          <img src={playback.thumb} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />
        ) : (
          <div className="w-14 h-14 rounded-lg bg-panel2 shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-wider text-accent font-semibold">Now playing</p>
          <p className="font-semibold leading-snug line-clamp-2">{has ? playback.title || 'YouTube video' : '—'}</p>
          {has && playback.addedByName && <p className="text-xs text-white/50 truncate">Added by {playback.addedByName}</p>}
        </div>
      </div>

      <div className="mt-4">
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
          className="w-full h-1.5 disabled:opacity-100"
          aria-label="Seek"
        />
        <div className="flex justify-between text-xs text-white/50 mt-1 tabular-nums">
          <span>{fmtTime(shown)}</span>
          <span>{fmtTime(dur)}</span>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-3">
        {isHost ? (
          <div className="flex items-center gap-3">
            <button
              onClick={onToggle}
              disabled={!has}
              className="w-14 h-14 rounded-full bg-accent text-black grid place-items-center active:scale-95 transition disabled:opacity-40"
              aria-label={playback?.isPlaying ? 'Pause for everyone' : 'Play for everyone'}
            >
              {playback?.isPlaying ? <Pause size={30} /> : <Play size={30} />}
            </button>
            <button
              onClick={onNext}
              disabled={!has}
              className="w-11 h-11 rounded-full bg-panel2 grid place-items-center active:scale-95 transition disabled:opacity-40"
              aria-label="Next song"
            >
              <Next size={24} />
            </button>
          </div>
        ) : (
          <p className="text-xs text-white/50 flex-1">🎧 The host controls play, pause &amp; skip</p>
        )}

        <div className="ml-auto flex items-center gap-2 w-28">
          <Volume size={18} className="text-white/60 shrink-0" />
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
            aria-label="Your volume"
          />
        </div>
      </div>
    </div>
  );
}
