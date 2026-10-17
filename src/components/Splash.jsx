import { Music } from './Icons';

export default function Splash({ text = 'Loading…' }) {
  return (
    <div className="min-h-[100dvh] grid place-items-center">
      <div className="flex flex-col items-center gap-3 text-white/70">
        <div className="w-14 h-14 rounded-2xl bg-accent/15 text-accent grid place-items-center animate-pulse">
          <Music size={30} />
        </div>
        <p className="text-sm">{text}</p>
      </div>
    </div>
  );
}
