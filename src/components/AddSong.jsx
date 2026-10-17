import { useEffect, useRef, useState } from 'react';
import { fetchMeta, parseYouTubeId, thumbFor } from '../lib/utils';
import { getYouTubeSuggestions, searchYouTube } from '../lib/youtube';
import { Search } from './Icons';
import { getFavoriteSongs, toggleFavoriteSong, getListeningHistory, isSongFavorite } from '../lib/userData';

const QUICK_TAGS = [
  'Arijit Singh',
  'Trending Songs',
  'Lofi Beats',
  'Bollywood Hits',
  'Bengali Songs',
  'English Hits',
  'Punjabi Hits',
];

const CURATED_TRENDING = [
  { videoId: 'BddP6PYo2gs', title: 'Kesariya - Brahmāstra | Ranbir & Alia | Arijit Singh', author: 'Sony Music India', thumbnail: 'https://i.ytimg.com/vi/BddP6PYo2gs/hqdefault.jpg', duration: '4:28' },
  { videoId: 'jfKfPfyJRdk', title: 'lofi hip hop radio 📚 - beats to relax/study to', author: 'Lofi Girl', thumbnail: 'https://i.ytimg.com/vi/jfKfPfyJRdk/hqdefault.jpg', duration: 'LIVE' },
  { videoId: '4NRXx6U8ABQ', title: 'The Weeknd - Blinding Lights (Official Audio)', author: 'The Weeknd', thumbnail: 'https://i.ytimg.com/vi/4NRXx6U8ABQ/hqdefault.jpg', duration: '3:20' },
  { videoId: 'HqUeSIs8588', title: 'Apna Bana Le - Bhediya | Varun Dhawan, Kriti Sanon', author: 'Zee Music Company', thumbnail: 'https://i.ytimg.com/vi/HqUeSIs8588/hqdefault.jpg', duration: '4:21' },
  { videoId: 'JGwWNGJdvx8', title: 'Ed Sheeran - Shape of You (Official Music Video)', author: 'Ed Sheeran', thumbnail: 'https://i.ytimg.com/vi/JGwWNGJdvx8/hqdefault.jpg', duration: '3:53' },
];

export default function AddSong({ canAdd, onAdd, isHost, user }) {
  const [q, setQ] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [subTab, setSubTab] = useState('search'); // 'search' | 'favorites' | 'history' | 'trending'
  const [favList, setFavList] = useState([]);
  const [histList, setHistList] = useState([]);

  const [recent, setRecent] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('LT_RECENT_SEARCHES') || '[]');
    } catch {
      return [];
    }
  });

  const wrapperRef = useRef(null);
  const debounceTimer = useRef(null);

  // Sync favorites & history when tab changes
  useEffect(() => {
    if (!user?.uid) return;
    if (subTab === 'favorites') {
      setFavList(getFavoriteSongs(user.uid));
    } else if (subTab === 'history') {
      setHistList(getListeningHistory(user.uid));
    }
  }, [subTab, user?.uid]);

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Fetch live YouTube suggestions as user types
  useEffect(() => {
    const trimmed = q.trim();
    if (!trimmed || parseYouTubeId(trimmed) || trimmed.length < 2) {
      setSuggestions([]);
      return;
    }
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(async () => {
      const list = await getYouTubeSuggestions(trimmed);
      setSuggestions(list);
      setShowSuggestions(list.length > 0);
    }, 200);

    return () => clearTimeout(debounceTimer.current);
  }, [q]);

  if (!canAdd) {
    return (
      <p className="text-sm text-white/50 bg-panel rounded-xl px-4 py-3">
        The host has turned off adding songs for guests.
      </p>
    );
  }

  function saveRecent(term) {
    if (!term || term.length < 2) return;
    setRecent((prev) => {
      const next = [term, ...prev.filter((item) => item.toLowerCase() !== term.toLowerCase())].slice(0, 6);
      try {
        localStorage.setItem('LT_RECENT_SEARCHES', JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  async function executeSearch(searchTerm) {
    const term = searchTerm.trim();
    if (!term) return;
    setSubTab('search');
    setShowSuggestions(false);
    setMsg('');
    setBusy(true);

    const directId = parseYouTubeId(term);
    if (directId) {
      setMsg('Loading video info…');
      try {
        const meta = await fetchMeta(directId);
        if (meta.status === 404) {
          setMsg('Video not found. Please check the link.');
          return;
        }
        if (meta.status === 401) {
          setMsg("This video cannot be played on other sites (embedding disabled). Try another version.");
          return;
        }
        await onAdd({ videoId: directId, title: meta.title, author: meta.author, thumbnail: thumbFor(directId) });
        setQ('');
        setMsg('Added to queue ✓');
      } catch {
        setMsg('Failed to add video.');
      } finally {
        setBusy(false);
      }
      return;
    }

    saveRecent(term);
    setMsg(`Searching YouTube for "${term}"…`);
    try {
      const list = await searchYouTube(term);
      setResults(list);
      if (!list || list.length === 0) {
        setMsg(`No YouTube results found for "${term}". Try other keywords.`);
      } else {
        setMsg(`Found ${list.length} YouTube results:`);
      }
    } catch (e) {
      setMsg('Search failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    executeSearch(q);
  }

  async function handlePick(song, playNow = false) {
    setBusy(true);
    try {
      await onAdd(song, playNow);
      setMsg(playNow ? `Playing "${song.title.slice(0, 30)}…" ▶` : `Added "${song.title.slice(0, 30)}…" to queue ✓`);
    } catch {
      setMsg('Could not add that song.');
    } finally {
      setBusy(false);
    }
  }

  async function handleFavToggle(song) {
    if (!user?.uid) return;
    await toggleFavoriteSong(user.uid, song);
    setFavList(getFavoriteSongs(user.uid));
  }

  const isUrl = Boolean(parseYouTubeId(q.trim()));

  return (
    <div ref={wrapperRef} className="relative">
      {/* Search Navigation Sub-Tabs */}
      <div className="flex items-center gap-1.5 mb-2.5 overflow-x-auto no-scrollbar text-xs">
        {[
          { id: 'search', label: '🔍 Search' },
          { id: 'trending', label: '🔥 Trending' },
          { id: 'favorites', label: `❤️ Favorites (${getFavoriteSongs(user?.uid).length})` },
          { id: 'history', label: `🕒 History (${getListeningHistory(user?.uid).length})` },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSubTab(t.id)}
            className={`px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition active:scale-95 ${
              subTab === t.id
                ? 'bg-green-500 text-black shadow-[0_0_12px_rgba(34,197,94,0.4)]'
                : 'bg-panel2/80 text-white/60 hover:text-white border border-white/5'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search Input Bar (Shown when on 'search' tab) */}
      {subTab === 'search' && (
        <>
          <form onSubmit={handleSubmit} className="flex gap-2 relative">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onFocus={() => {
                  if (suggestions.length > 0) setShowSuggestions(true);
                }}
                placeholder="Search any song, artist, album or paste link…"
                inputMode="search"
                className="w-full bg-panel2 rounded-full pl-10 pr-9 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-accent placeholder:text-white/35 transition"
              />
              {q && (
                <button
                  type="button"
                  onClick={() => {
                    setQ('');
                    setSuggestions([]);
                    setShowSuggestions(false);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white p-1 text-xs"
                  aria-label="Clear"
                >
                  ✕
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={busy || !q.trim()}
              className="px-5 rounded-full bg-accent text-black font-bold text-sm active:scale-95 transition disabled:opacity-40 hover:brightness-105 shadow-md shadow-accent/20 shrink-0 flex items-center gap-1.5"
            >
              {busy ? (
                <span className="inline-block w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : isUrl ? (
                'Add'
              ) : (
                'Search'
              )}
            </button>
          </form>

          {/* Live YouTube Auto-suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1.5 bg-[#1f1f23] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden backdrop-blur-md">
              <div className="px-3 py-1.5 text-[11px] font-semibold text-white/40 border-b border-white/5 uppercase tracking-wider">
                YouTube Suggestions
              </div>
              <ul className="py-1">
                {suggestions.map((item, idx) => (
                  <li key={idx}>
                    <button
                      type="button"
                      onClick={() => {
                        setQ(item);
                        executeSearch(item);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-white/90 hover:bg-white/10 active:bg-white/15 transition"
                    >
                      <Search size={15} className="text-white/30 shrink-0" />
                      <span className="truncate">{item}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Quick Category Chips */}
          {!results.length && !busy && (
            <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
              {QUICK_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    setQ(tag);
                    executeSearch(tag);
                  }}
                  className="px-3 py-1 rounded-full bg-panel2/80 hover:bg-panel2 text-white/75 hover:text-white whitespace-nowrap border border-white/5 active:scale-95 transition"
                >
                  {tag}
                </button>
              ))}
            </div>
          )}

          {/* Recent Searches */}
          {!results.length && !busy && recent.length > 0 && (
            <div className="mt-2.5 flex items-center gap-2 overflow-x-auto text-[11px] text-white/40">
              <span className="shrink-0">Recent:</span>
              {recent.map((term, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setQ(term);
                    executeSearch(term);
                  }}
                  className="text-white/60 hover:text-white underline truncate shrink-0"
                >
                  {term}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setRecent([]);
                  localStorage.removeItem('LT_RECENT_SEARCHES');
                }}
                className="text-white/30 hover:text-red-400 shrink-0 ml-1"
              >
                Clear
              </button>
            </div>
          )}
        </>
      )}

      {/* TRENDING TAB */}
      {subTab === 'trending' && (
        <div className="bg-panel border border-white/10 rounded-2xl p-3 space-y-2">
          <div className="flex items-center justify-between pb-1.5 border-b border-white/5">
            <span className="text-xs font-bold text-white uppercase tracking-wider">🔥 Trending Hits</span>
            <span className="text-[11px] text-white/40">Popular worldwide</span>
          </div>
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {CURATED_TRENDING.map((s) => (
              <div key={s.videoId} className="flex items-center gap-3 bg-panel2/60 hover:bg-panel2 p-2 rounded-xl border border-white/5 transition">
                <img src={s.thumbnail} alt="" className="w-16 h-12 rounded-lg object-cover shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-white line-clamp-1">{s.title}</p>
                  <p className="text-[11px] text-white/50">{s.author} · {s.duration}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handlePick(s, isHost)}
                  className="px-3 py-1.5 rounded-full bg-green-500 text-black font-extrabold text-xs active:scale-95 transition shadow hover:brightness-110 shrink-0"
                >
                  {isHost ? '▶ Play' : '+ Add'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FAVORITES TAB */}
      {subTab === 'favorites' && (
        <div className="bg-panel border border-white/10 rounded-2xl p-3 space-y-2">
          <div className="flex items-center justify-between pb-1.5 border-b border-white/5">
            <span className="text-xs font-bold text-white uppercase tracking-wider">❤️ Your Favorite Songs</span>
            <span className="text-[11px] text-white/40">{favList.length} saved</span>
          </div>
          {favList.length === 0 ? (
            <p className="text-center text-xs text-white/40 py-8">
              No favorite songs yet. Tap the heart ❤️ on any song to save it here!
            </p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {favList.map((s) => (
                <div key={s.videoId} className="flex items-center gap-3 bg-panel2/60 hover:bg-panel2 p-2 rounded-xl border border-white/5 transition">
                  <img src={s.thumb} alt="" className="w-14 h-12 rounded-lg object-cover shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-white line-clamp-1">{s.title}</p>
                    <p className="text-[10px] text-white/40">Saved {new Date(s.savedAt || Date.now()).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handlePick(s, isHost)}
                      className="px-3 py-1.5 rounded-full bg-green-500 text-black font-extrabold text-xs active:scale-95 transition shadow hover:brightness-110"
                    >
                      {isHost ? '▶ Play' : '+ Add'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFavToggle(s)}
                      className="p-1 text-xs text-red-400 hover:text-white"
                      title="Remove"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* HISTORY TAB */}
      {subTab === 'history' && (
        <div className="bg-panel border border-white/10 rounded-2xl p-3 space-y-2">
          <div className="flex items-center justify-between pb-1.5 border-b border-white/5">
            <span className="text-xs font-bold text-white uppercase tracking-wider">🕒 Listening History</span>
            <span className="text-[11px] text-white/40">{histList.length} played</span>
          </div>
          {histList.length === 0 ? (
            <p className="text-center text-xs text-white/40 py-8">
              No listening history yet. Songs played in your rooms will appear here!
            </p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {histList.map((s, idx) => (
                <div key={`${s.videoId}_${idx}`} className="flex items-center gap-3 bg-panel2/60 hover:bg-panel2 p-2 rounded-xl border border-white/5 transition">
                  <img src={s.thumb} alt="" className="w-14 h-12 rounded-lg object-cover shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-white line-clamp-1">{s.title}</p>
                    <p className="text-[10px] text-white/40">
                      Played {new Date(s.playedAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handlePick(s, isHost)}
                    className="px-3 py-1.5 rounded-full bg-green-500 text-black font-extrabold text-xs active:scale-95 transition shadow hover:brightness-110 shrink-0"
                  >
                    Replay
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Status / feedback message */}
      {msg && <p className="text-xs text-white/60 mt-2.5 px-1">{msg}</p>}

      {/* YouTube Search Results List */}
      {subTab === 'search' && results.length > 0 && (
        <div className="mt-3 bg-panel border border-white/10 rounded-2xl p-2.5 max-h-[460px] overflow-y-auto space-y-2 shadow-xl">
          <div className="flex items-center justify-between px-2 py-1 text-xs text-white/50 border-b border-white/5 pb-2">
            <span className="font-medium text-white/80">YouTube Results ({results.length})</span>
            <button
              type="button"
              onClick={() => setResults([])}
              className="text-white/40 hover:text-white text-xs px-2 py-0.5 rounded-md hover:bg-white/5 transition"
            >
              ✕ Close
            </button>
          </div>

          <div className="space-y-2">
            {results.map((r) => {
              const isFav = isSongFavorite(user?.uid, r.videoId);
              return (
                <div
                  key={r.videoId}
                  className="flex items-center gap-3 bg-panel2/60 hover:bg-panel2 p-2 rounded-xl border border-transparent hover:border-white/10 transition group"
                >
                  {/* 16:9 Thumbnail with Duration Badge */}
                  <div className="relative w-24 h-14 rounded-lg overflow-hidden shrink-0 bg-black/50">
                    <img
                      src={r.thumbnail}
                      alt={r.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    {r.duration && (
                      <span className="absolute bottom-1 right-1 bg-black/85 text-[10px] font-semibold text-white px-1 py-0.2 rounded">
                        {r.duration}
                      </span>
                    )}
                  </div>

                  {/* Video Info */}
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-semibold text-white/90 line-clamp-2 leading-snug group-hover:text-accent transition">
                      {r.title}
                    </h4>
                    <p className="text-xs text-white/50 truncate mt-0.5">
                      {r.author}
                      {r.views && ` • ${r.views}`}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleFavToggle(r)}
                      className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center text-xs transition"
                      title={isFav ? 'Favorited' : 'Add to Favorites'}
                    >
                      {isFav ? '❤️' : '🤍'}
                    </button>

                    {isHost ? (
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          onClick={() => handlePick(r, true)}
                          disabled={busy}
                          className="text-xs bg-accent text-black font-bold px-2.5 py-1 rounded-full active:scale-95 transition shadow-sm hover:brightness-105"
                        >
                          ▶ Play
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePick(r, false)}
                          disabled={busy}
                          className="text-[11px] bg-white/10 text-white/80 font-medium px-2 py-0.5 rounded-full active:scale-95 transition hover:bg-white/15"
                        >
                          + Queue
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handlePick(r, false)}
                        disabled={busy}
                        className="text-xs bg-accent/20 text-accent font-semibold px-3 py-1.5 rounded-full active:scale-95 transition hover:bg-accent hover:text-black"
                      >
                        + Add
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
