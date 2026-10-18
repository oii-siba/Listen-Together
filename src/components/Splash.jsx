import { Music } from './Icons';

export default function Splash({ text = 'Connecting to TuneTogether…' }) {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-4 bg-gradient-to-b from-[#050806] via-[#09120c] to-[#040805] text-white">
      {/* Ambient background glow */}
      <div className="absolute w-72 h-72 rounded-full bg-green-500/10 blur-3xl pointer-events-none" />

      <div className="relative flex flex-col items-center gap-5 z-10">
        {/* Glowing Logo / Audio Icon with pulsing rings */}
        <div className="relative">
          <div className="absolute -inset-3 rounded-3xl bg-green-500/20 blur-xl animate-pulse" />
          <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-[#122218] to-[#0a140e] border-2 border-green-500/50 shadow-[0_0_35px_rgba(34,197,94,0.4)] flex items-center justify-center text-green-400">
            <Music size={40} className="animate-bounce" />
          </div>

          {/* Animated orbiting dot */}
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500" />
          </span>
        </div>

        {/* Brand Name */}
        <div className="text-center">
          <h2 className="text-2xl font-black tracking-tight leading-none">
            Tune<span className="text-green-400">Together</span>
          </h2>
          <p className="text-[11px] font-bold text-green-400/80 tracking-widest uppercase mt-1">
            UltraSync Engine
          </p>
        </div>

        {/* Audio Waveform Animation Bars */}
        <div className="flex items-center gap-1.5 h-6">
          <span className="w-1 bg-green-400 rounded-full animate-[soundWave_0.8s_ease-in-out_infinite]" />
          <span className="w-1 bg-green-400 rounded-full animate-[soundWave_1.1s_ease-in-out_infinite_0.2s]" />
          <span className="w-1 bg-green-400 rounded-full animate-[soundWave_0.7s_ease-in-out_infinite_0.4s]" />
          <span className="w-1 bg-green-400 rounded-full animate-[soundWave_1.3s_ease-in-out_infinite_0.1s]" />
          <span className="w-1 bg-green-400 rounded-full animate-[soundWave_0.9s_ease-in-out_infinite_0.3s]" />
        </div>

        {/* Status text */}
        <p className="text-xs font-semibold text-white/60 animate-pulse text-center max-w-xs">
          {text}
        </p>
      </div>
    </div>
  );
}
