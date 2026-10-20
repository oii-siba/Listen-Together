import { Music } from './Icons';

export default function Splash({ text = 'Connecting to TuneTogether…' }) {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-4 bg-[#020403] text-[#F5F7F5]">
      {/* Ambient background glow */}
      <div className="absolute w-72 h-72 rounded-full bg-[#00FF87]/10 blur-3xl pointer-events-none" />

      <div className="relative flex flex-col items-center gap-5 z-10">
        {/* Glowing Logo / Audio Icon with pulsing rings */}
        <div className="relative">
          <div className="absolute -inset-3 rounded-3xl bg-[#00FF87]/20 blur-xl animate-pulse" />
          <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-[#101814] to-[#0A100D] border-2 border-[#00FF87]/50 shadow-neon-md flex items-center justify-center text-[#00FF87]">
            <Music size={40} className="animate-bounce" />
          </div>

          {/* Animated orbiting dot */}
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00FF87] opacity-75" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-[#00FF87]" />
          </span>
        </div>

        {/* Brand Name */}
        <div className="text-center">
          <h2 className="text-2xl font-black tracking-tight leading-none text-[#F5F7F5]">
            Tune<span className="text-[#00FF87]">Together</span>
          </h2>
          <p className="text-[11px] font-bold text-[#00FF87]/80 tracking-widest uppercase mt-1">
            UltraSync Engine
          </p>
        </div>

        {/* Audio Waveform Animation Bars */}
        <div className="flex items-center gap-1.5 h-6">
          <span className="w-1 bg-[#00FF87] rounded-full animate-[soundWave_0.8s_ease-in-out_infinite]" />
          <span className="w-1 bg-[#00FF87] rounded-full animate-[soundWave_1.1s_ease-in-out_infinite_0.2s]" />
          <span className="w-1 bg-[#00FF87] rounded-full animate-[soundWave_0.7s_ease-in-out_infinite_0.4s]" />
          <span className="w-1 bg-[#00FF87] rounded-full animate-[soundWave_1.3s_ease-in-out_infinite_0.1s]" />
          <span className="w-1 bg-[#00FF87] rounded-full animate-[soundWave_0.9s_ease-in-out_infinite_0.3s]" />
        </div>

        {/* Status text */}
        <p className="text-xs font-semibold text-[#9AA59F] animate-pulse text-center max-w-xs">
          {text}
        </p>
      </div>
    </div>
  );
}
