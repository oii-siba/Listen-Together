import Avatar from './Avatar';
import { Star } from './Icons';

export default function Participants({ people, hostId, myUid, onKick, kickedUsers = {}, onUnban }) {
  if (!people.length) return <p className="text-sm text-white/45 text-center py-8">Connecting…</p>;

  const isHost = myUid === hostId;
  const kickedEntries = Object.entries(kickedUsers || {}).filter(([_, val]) => val);

  return (
    <div className="space-y-4">
      {/* Active Listeners */}
      <ul className="space-y-2">
        {people.map((p) => (
          <li key={p.uid} className="flex items-center gap-3 bg-panel rounded-xl p-3 border border-white/5">
            <Avatar name={p.name} photo={p.photo} size={40} ring={p.uid === hostId} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate flex items-center gap-1.5">
                <span>{p.name}</span>
                {p.uid === myUid && <span className="text-white/40 text-xs font-normal">(you)</span>}
              </p>
              <p className="text-[11px] text-white/40">
                {p.uid === hostId ? 'Room Host & Controller' : 'Listening in sync'}
              </p>
            </div>
            {p.uid === hostId ? (
              <span className="flex items-center gap-1 text-xs font-semibold text-green-400 bg-green-500/10 border border-green-500/20 rounded-full px-2.5 py-1">
                <Star size={14} /> Host
              </span>
            ) : (
              isHost && onKick && (
                <button
                  type="button"
                  onClick={() => onKick(p.uid, p.name)}
                  className="text-[11px] font-bold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 px-2.5 py-1 rounded-full transition active:scale-95"
                  title="Remove listener from room"
                >
                  Remove
                </button>
              )
            )}
          </li>
        ))}
      </ul>

      {/* Removed Listeners (Host-Only View) */}
      {isHost && kickedEntries.length > 0 && (
        <div className="mt-4 pt-3 border-t border-white/10">
          <div className="flex items-center justify-between mb-2.5 px-1">
            <p className="text-xs font-bold text-white/50 uppercase tracking-wider">
              Removed Listeners ({kickedEntries.length})
            </p>
            <span className="text-[10px] text-white/40">Only you can allow them back</span>
          </div>
          <ul className="space-y-2">
            {kickedEntries.map(([uid, info]) => {
              const name = typeof info === 'object' && info?.name ? info.name : 'Removed Listener';
              return (
                <li
                  key={uid}
                  className="flex items-center justify-between gap-3 bg-panel2/60 rounded-xl p-2.5 border border-white/5"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar name={name} size={32} />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-white/80 truncate">{name}</p>
                      <p className="text-[10px] text-red-400/80">Blocked from room</p>
                    </div>
                  </div>
                  {onUnban && (
                    <button
                      type="button"
                      onClick={() => onUnban(uid, name)}
                      className="text-[11px] font-bold text-green-400 hover:text-green-300 bg-green-500/10 hover:bg-green-500/20 border border-green-500/25 px-3 py-1 rounded-full transition active:scale-95 shadow-sm"
                      title="Unblock user and allow them to rejoin or be re-invited"
                    >
                      Allow Rejoin ✓
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
