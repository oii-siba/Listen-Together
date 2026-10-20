import { Close, Play } from './Icons';

function ArrowUp({ size = 15, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M18 15l-6-6-6 6" />
    </svg>
  );
}

function ArrowDown({ size = 15, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export default function Queue({ items = [], isHost, uid, onRemove, onPlayNow, onVote }) {
  if (!items.length) {
    return (
      <div className="text-center py-12 glass-card border border-white/10 rounded-[28px] p-6 shadow-xl">
        <div className="w-12 h-12 rounded-2xl bg-[#00FF87]/15 border border-[#00FF87]/30 flex items-center justify-center text-2xl text-[#00FF87] mx-auto mb-3 shadow-[0_0_15px_rgba(0,255,135,0.25)]">
          🎵
        </div>
        <p className="text-sm font-bold text-[#F5F7F5]">Queue is empty</p>
        <p className="text-xs text-[#9AA59F] mt-1">Add songs from the search tab above. Friends can vote on what plays next!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Jukebox Queue Banner */}
      <div className="flex items-center justify-between px-1 text-xs text-[#9AA59F]">
        <span className="font-bold text-[#F5F7F5] flex items-center gap-1.5">
          <span>🗳️</span> Song Queue ({items.length})
        </span>
        <span className="text-[11px] text-[#00FF87] font-semibold flex items-center gap-1">
          <span>▲</span> Vote decides next song
        </span>
      </div>

      <ul className="space-y-2">
        {items.map((it, i) => {
          const canRemove = isHost || it.addedBy === uid;
          const myVote = it.votes?.[uid];
          const isTopVoted = i === 0 && (it.score || 0) > 0;

          return (
            <li
              key={it.key}
              className={`flex items-center gap-2.5 glass-card rounded-2xl p-2.5 transition shadow-sm ${
                isTopVoted
                  ? 'border-[#00FF87]/50 bg-gradient-to-r from-[#00FF87]/15 via-[#101814] to-[#0A100D]'
                  : 'border-white/10 hover:border-[#00FF87]/30'
              }`}
            >
              {/* Jukebox Voting Controls */}
              <div className="flex flex-col items-center justify-center bg-black/40 border border-white/10 rounded-xl px-1.5 py-1 shrink-0">
                <button
                  type="button"
                  onClick={() => onVote?.(it.key, 'up')}
                  className={`p-1 rounded-lg transition active:scale-75 ${
                    myVote === 1
                      ? 'text-green-400 bg-green-500/25 shadow-[0_0_12px_rgba(34,197,94,0.4)]'
                      : 'text-white/40 hover:text-green-400 hover:bg-white/5'
                  }`}
                  title="Upvote (plays sooner)"
                  aria-label="Upvote song"
                >
                  <ArrowUp size={15} />
                </button>

                <span
                  className={`text-[11px] font-black leading-tight tabular-nums py-0.5 ${
                    (it.score || 0) > 0
                      ? 'text-green-400'
                      : (it.score || 0) < 0
                      ? 'text-red-400'
                      : 'text-white/45'
                  }`}
                >
                  {(it.score || 0) > 0 ? `+${it.score}` : it.score || 0}
                </span>

                <button
                  type="button"
                  onClick={() => onVote?.(it.key, 'down')}
                  className={`p-1 rounded-lg transition active:scale-75 ${
                    myVote === -1
                      ? 'text-red-400 bg-red-500/25 shadow-[0_0_12px_rgba(239,68,68,0.4)]'
                      : 'text-white/40 hover:text-red-400 hover:bg-white/5'
                  }`}
                  title="Downvote (plays later)"
                  aria-label="Downvote song"
                >
                  <ArrowDown size={15} />
                </button>
              </div>

              {/* Song Thumbnail */}
              <div className="relative w-14 h-11 rounded-xl overflow-hidden bg-black shrink-0 border border-white/10">
                <img src={it.thumb} alt="" className="w-full h-full object-cover" />
                <span className="absolute bottom-0.5 left-0.5 px-1 rounded bg-black/75 text-[9px] font-black text-white/80 tabular-nums">
                  #{i + 1}
                </span>
              </div>

              {/* Title & Added By */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-xs font-bold text-white line-clamp-1 leading-snug">{it.title}</p>
                  {isTopVoted && (
                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-green-500/20 text-green-300 border border-green-500/40">
                      🔥 Next Up
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-white/45 truncate mt-0.5">
                  Added by <span className="text-white/70 font-medium">{it.addedByName || 'Friend'}</span>
                </p>
              </div>

              {/* Action Buttons: Play Now (Host Only) & Remove */}
              <div className="flex items-center gap-1 shrink-0">
                {isHost && (
                  <button
                    type="button"
                    onClick={() => onPlayNow(it)}
                    className="w-8 h-8 rounded-full bg-green-500/15 hover:bg-green-500 text-green-400 hover:text-black border border-green-500/30 grid place-items-center active:scale-90 transition shadow-sm"
                    aria-label="Play now"
                    title="Play now"
                  >
                    <Play size={16} />
                  </button>
                )}

                {canRemove && (
                  <button
                    type="button"
                    onClick={() => onRemove(it.key)}
                    className="w-8 h-8 rounded-full hover:bg-red-500/15 text-white/40 hover:text-red-400 grid place-items-center active:scale-90 transition"
                    aria-label="Remove from queue"
                    title="Remove from queue"
                  >
                    <Close size={18} />
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
