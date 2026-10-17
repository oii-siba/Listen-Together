import { useState, useEffect } from 'react';
import {
  getFavoriteSongs,
  toggleFavoriteSong,
  getListeningHistory,
} from '../lib/userData';
import { useNavigate } from 'react-router-dom';

export default function FavoritesModal({ user, initialTab = 'favorites', roomId, onPlaySong, onClose }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [favorites, setFavorites] = useState([]);
  const [history, setHistory] = useState([]);
  const nav = useNavigate();

  useEffect(() => {
    if (!user?.uid) return;
    setFavorites(getFavoriteSongs(user.uid));
    setHistory(getListeningHistory(user.uid));
  }, [user?.uid]);

  const handleRemoveFavorite = async (song) => {
    if (!user?.uid) return;
    await toggleFavoriteSong(user.uid, song);
    setFavorites(getFavoriteSongs(user.uid));
  };

  const handlePlay = (song) => {
    if (onPlaySong) {
      onPlaySong(song);
      onClose();
    } else if (roomId) {
      // In room
      onClose();
    } else {
      // Not in room, open YouTube or create a room
      window.open(`https://www.youtube.com/watch?v=${song.videoId}`, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-panel border border-white/10 rounded-3xl p-5 sm:p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
        {/* Close Button */}
        <button
          onClick={onClose}
          type="button"
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-panel2 text-white/60 hover:text-white flex items-center justify-center transition"
        >
          ✕
        </button>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 mb-4 pr-10">
          <button
            type="button"
            onClick={() => setActiveTab('favorites')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'favorites'
                ? 'bg-green-500 text-black shadow'
                : 'bg-panel2 text-white/70 hover:text-white'
            }`}
          >
            <span>❤️ Favorites</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeTab === 'favorites' ? 'bg-black text-green-400' : 'bg-white/10 text-white/80'
              }`}
            >
              {favorites.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-green-500 text-black shadow'
                : 'bg-panel2 text-white/70 hover:text-white'
            }`}
          >
            <span>🕒 History</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeTab === 'history' ? 'bg-black text-green-400' : 'bg-white/10 text-white/80'
              }`}
            >
              {history.length}
            </span>
          </button>
        </div>

        {/* Content List */}
        <div className="max-h-80 overflow-y-auto space-y-2.5 pr-1">
          {activeTab === 'favorites' ? (
            favorites.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-3xl mb-1.5">💔</p>
                <p className="text-xs text-white/60 font-medium">No favorite songs saved yet.</p>
                <p className="text-[11px] text-white/35 mt-1">
                  Tap the heart ❤️ button on any song while listening to save it here!
                </p>
              </div>
            ) : (
              favorites.map((song) => (
                <div
                  key={song.videoId}
                  className="bg-panel2/60 border border-white/5 rounded-2xl p-2.5 flex items-center justify-between gap-3 hover:border-white/15 transition group"
                >
                  <img
                    src={song.thumb || `https://i.ytimg.com/vi/${song.videoId}/hqdefault.jpg`}
                    alt=""
                    className="w-12 h-12 rounded-xl object-cover shrink-0 border border-white/10"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-xs text-white truncate">{song.title}</p>
                    <p className="text-[10px] text-white/40 truncate mt-0.5">
                      Saved {new Date(song.savedAt || Date.now()).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handlePlay(song)}
                      className="px-3 py-1.5 rounded-full bg-green-500 text-black font-extrabold text-[11px] hover:brightness-110 active:scale-95 transition shadow"
                    >
                      {onPlaySong ? 'Play' : 'Listen'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveFavorite(song)}
                      className="w-7 h-7 rounded-full bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-400 flex items-center justify-center text-xs transition"
                      title="Remove from favorites"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )
          ) : history.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-3xl mb-1.5">🎧</p>
              <p className="text-xs text-white/60 font-medium">No listening history yet.</p>
              <p className="text-[11px] text-white/35 mt-1">
                Songs played in rooms will automatically appear here!
              </p>
            </div>
          ) : (
            history.map((song) => (
              <div
                key={song.videoId + (song.playedAt || '')}
                className="bg-panel2/60 border border-white/5 rounded-2xl p-2.5 flex items-center justify-between gap-3 hover:border-white/15 transition group"
              >
                <img
                  src={song.thumb || `https://i.ytimg.com/vi/${song.videoId}/hqdefault.jpg`}
                  alt=""
                  className="w-12 h-12 rounded-xl object-cover shrink-0 border border-white/10"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-xs text-white truncate">{song.title}</p>
                  <p className="text-[10px] text-white/40 truncate mt-0.5">
                    {song.playedAt
                      ? new Date(song.playedAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Recently played'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handlePlay(song)}
                  className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-green-500 hover:text-black font-extrabold text-[11px] active:scale-95 transition shadow text-white shrink-0"
                >
                  {onPlaySong ? 'Play' : 'Listen'}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
