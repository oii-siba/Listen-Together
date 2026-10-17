import { useState } from 'react';
import { fetchMeta, parseYouTubeId, thumbFor } from '../lib/utils';
import { searchEnabled, searchYouTube } from '../lib/youtube';
import { Search } from './Icons';

export default function AddSong({ canAdd, onAdd }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  if (!canAdd) {
    return (
      <p className="text-sm text-white/50 bg-panel rounded-xl px-4 py-3">
        The host has turned off adding songs for guests.
      </p>
    );
  }

  const isUrl = Boolean(parseYouTubeId(q.trim()));

  async function submit(e) {
    e.preventDefault();
    const input = q.trim();
    if (!input) return;
    setMsg('');
    setResults([]);
    setBusy(true);
    try {
      const id = parseYouTubeId(input);
      if (id) {
        setMsg('Fetching song details…');
        const meta = await fetchMeta(id);
        if (meta.status === 404) {
          setMsg('Video not found. Check the link.');
          return;
        }
        if (meta.status === 401) {
          setMsg("This video can't be played on other sites (embedding disabled). Try another version.");
          return;
        }
        await onAdd({ videoId: id, title: meta.title, author: meta.author });
        setQ('');
        setMsg('Added to queue ✓');
      } else if (searchEnabled) {
        setMsg('Searching YouTube…');
        const list = await searchYouTube(input);
        setResults(list);
        if (!list.length) {
          setMsg('No matching songs found. Try a different search term.');
        } else {
          setMsg(`Found ${list.length} results. Tap a song to play!`);
        }
      } else {
        setMsg('Paste a YouTube link.');
      }
    } catch {
      setMsg('Something went wrong searching. Try again.');
    } finally {
      setBusy(false);
    }
  }

  async function pick(r) {
    setBusy(true);
    try {
      await onAdd(r);
      setResults([]);
      setQ('');
      setMsg(`Added "${r.title.slice(0, 30)}…" ✓`);
    } catch {
      setMsg('Could not add that song.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <form onSubmit={submit} className="flex gap-2">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search song name or paste link…"
            inputMode="text"
            className="w-full bg-panel2 rounded-full pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-accent placeholder:text-white/35 transition"
          />
        </div>
        <button
          disabled={busy || !q.trim()}
          className="px-5 rounded-full bg-accent text-black font-bold text-sm active:scale-95 transition disabled:opacity-40 hover:brightness-105 shadow-md shadow-accent/20 shrink-0"
        >
          {busy ? '…' : isUrl ? 'Add' : 'Search'}
        </button>
      </form>

      {msg && <p className="text-xs text-white/60 mt-2 px-1">{msg}</p>}

      {results.length > 0 && (
        <div className="mt-3 bg-panel border border-white/10 rounded-2xl p-2 max-h-80 overflow-y-auto space-y-1">
          <div className="flex items-center justify-between px-2 py-1 text-xs text-white/50 border-b border-white/5 pb-2 mb-1">
            <span>Search Results</span>
            <button
              type="button"
              onClick={() => setResults([])}
              className="text-white/40 hover:text-white/80 transition"
            >
              ✕ Close
            </button>
          </div>
          <ul className="space-y-1">
            {results.map((r) => (
              <li key={r.videoId}>
                <button
                  type="button"
                  onClick={() => pick(r)}
                  disabled={busy}
                  className="w-full flex items-center gap-3 bg-panel2/60 hover:bg-panel2 rounded-xl p-2 text-left active:scale-[0.99] transition border border-transparent hover:border-white/10"
                >
                  <img
                    src={thumbFor(r.videoId)}
                    alt=""
                    className="w-16 h-11 rounded-lg object-cover shrink-0 shadow-sm"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-white/90 line-clamp-1">{r.title}</span>
                    <span className="block text-xs text-white/50 truncate mt-0.5">{r.author}</span>
                  </div>
                  <span className="text-xs bg-accent/20 text-accent font-medium px-2.5 py-1 rounded-full shrink-0">
                    + Play
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
