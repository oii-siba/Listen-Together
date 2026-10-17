import { useLocation, useNavigate } from 'react-router-dom';
import { usePlayback } from '../context/PlaybackContext';
import { Play, Pause, Next, Close } from './Icons';

export default function MiniPlayer() {
  const { activeRoomId, playback, isHost, togglePlay, playNext, leaveRoom } = usePlayback();
  const location = useLocation();
  const navigate = useNavigate();

  // If no room is active or no song is loaded, do not render
  if (!activeRoomId || !playback?.videoId) return null;

  // If the user is currently inside the active room, hide the mini player (full player is visible)
  if (location.pathname === `/room/${activeRoomId}`) return null;

  const handleOpenRoom = () => {
    navigate(`/room/${activeRoomId}`);
  };

  return (
    <aside
      aria-label="Now Playing Mini Player"
      className="fixed bottom-4 left-3 right-3 max-w-lg mx-auto z-40 bg-black/95 backdrop-blur-2xl border border-green-500/40 rounded-2xl p-2.5 shadow-[0_12px_45px_rgba(0,0,0,0.9)] animate-in slide-in-from-bottom-5 duration-200"
    >
      <div className="flex items-center gap-3">
        {/* Album Artwork (Click to expand) */}
        <div
          onClick={handleOpenRoom}
          className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-green-400/80 cursor-pointer group shadow-[0_0_12px_rgba(34,197,94,0.4)]"
          title="Open Room"
        >
          <img
            src={playback.thumb || `https://i.ytimg.com/vi/${playback.videoId}/hqdefault.jpg`}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition"
          />
          {playback.isPlaying && (
            <span className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
              <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-ping" />
            </span>
          )}
        </div>

        {/* Title & Room ID (Click to expand) */}
        <div onClick={handleOpenRoom} className="min-w-0 flex-1 cursor-pointer">
          <p className="font-extrabold text-xs text-white truncate hover:text-green-400 transition">
            {playback.title || 'Now Playing'}
          </p>
          <p className="text-[10px] text-green-400 font-medium flex items-center gap-1.5 truncate mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shrink-0" />
            <span className="truncate">Room #{activeRoomId}</span>
            <span className="text-white/40 shrink-0 font-normal">· Tap to open ↗</span>
          </p>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={togglePlay}
            className="w-9 h-9 rounded-full bg-green-500 text-black flex items-center justify-center hover:brightness-110 active:scale-95 transition shadow-[0_0_12px_rgba(34,197,94,0.5)]"
            title={playback.isPlaying ? 'Pause' : 'Play'}
          >
            {playback.isPlaying ? <Pause size={18} /> : <Play size={18} />}
          </button>

          {isHost && (
            <button
              type="button"
              onClick={playNext}
              className="w-8 h-8 rounded-full bg-panel2 border border-white/10 hover:bg-white/15 text-white/90 flex items-center justify-center active:scale-95 transition"
              title="Next Track"
            >
              <Next size={16} />
            </button>
          )}

          <button
            type="button"
            onClick={leaveRoom}
            className="w-7 h-7 rounded-full bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-400 flex items-center justify-center text-xs transition ml-0.5"
            title="Leave Room"
            aria-label="Leave Room"
          >
            <Close size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
