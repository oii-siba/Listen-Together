import { useEffect, useRef, useState } from 'react';
import { fetchMeta, parseYouTubeId, thumbFor } from '../lib/utils';
import { getYouTubeSuggestions, searchYouTube } from '../lib/youtube';
import { Search } from './Icons';

const QUICK_TAGS = [
  'Arijit Singh',
  'Trending Songs',
  'Lofi Beats',
  'Bollywood Hits',
  'Bengali Songs',
  'English Hits',
  'Punjabi Hits',
];

export default function AddSong({ canAdd, onAdd, isHost }) {
  const [q, setQ] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [recent, setRecent] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('LT_RECENT_SEARCHES') || '[]');
    } catch {
      return [];
    }
  });

  const wrapperRef = useRef(null);
  const debounceTimer = useRef(null);

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

  const isUrl = Boolean(parseYouTubeId(q.trim()));

  return (
    <div ref={wrapperRef} className="relative">
      {/* Search Input Bar */}
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

      {/* Status / feedback message */}
      {msg && <p className="text-xs text-white/60 mt-2.5 px-1">{msg}</p>}

      {/* YouTube Search Results List */}
      {results.length > 0 && (
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
            {results.map((r) => (
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
                <div className="flex flex-col gap-1 shrink-0">
                  {isHost ? (
                    <>
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
                    </>
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
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
