import Avatar from './Avatar';
import { Star } from './Icons';

export default function Participants({ people, hostId, myUid }) {
  if (!people.length) return <p className="text-sm text-white/45 text-center py-8">Connecting…</p>;
  return (
    <ul className="space-y-2">
      {people.map((p) => (
        <li key={p.uid} className="flex items-center gap-3 bg-panel rounded-xl p-3">
          <Avatar name={p.name} photo={p.photo} size={40} ring={p.uid === hostId} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">
              {p.name}
              {p.uid === myUid && <span className="text-white/40 font-normal"> (you)</span>}
            </p>
          </div>
          {p.uid === hostId && (
            <span className="flex items-center gap-1 text-xs font-semibold text-accent bg-accent/10 rounded-full px-2.5 py-1">
              <Star size={14} /> Host
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
