import { Close, Play } from './Icons';

export default function Queue({ items, isHost, uid, onRemove, onPlayNow }) {
  if (!items.length) {
    return <p className="text-sm text-white/45 text-center py-8">Queue is empty. Add a song above.</p>;
  }
  return (
    <ul className="space-y-2">
      {items.map((it, i) => {
        const canRemove = isHost || it.addedBy === uid;
        return (
          <li key={it.key} className="flex items-center gap-3 bg-panel rounded-xl p-2">
            <span className="w-5 text-center text-xs text-white/40 tabular-nums">{i + 1}</span>
            <img src={it.thumb} alt="" className="w-14 h-10 rounded-md object-cover shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium line-clamp-2 leading-snug">{it.title}</p>
              <p className="text-xs text-white/45 truncate">{it.addedByName}</p>
            </div>
            {isHost && (
              <button
                onClick={() => onPlayNow(it)}
                className="w-9 h-9 rounded-full bg-panel2 grid place-items-center text-accent active:scale-90 transition"
                aria-label="Play now"
              >
                <Play size={20} />
              </button>
            )}
            {canRemove && (
              <button
                onClick={() => onRemove(it.key)}
                className="w-9 h-9 rounded-full grid place-items-center text-white/50 active:scale-90 transition"
                aria-label="Remove from queue"
              >
                <Close size={20} />
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
