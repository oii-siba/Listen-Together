import React from 'react';

export default function AudioVisualizer({ isPlaying = false, barCount = 28, className = '' }) {
  // Array of delays and base heights for varied rhythmic aesthetic
  const bars = React.useMemo(() => {
    return Array.from({ length: barCount }, (_, i) => {
      // Bell-shaped curve in the middle
      const centerFactor = 1 - Math.abs((i - barCount / 2) / (barCount / 2));
      const minHeight = 15 + Math.round(centerFactor * 25);
      const maxHeight = 65 + Math.round(centerFactor * 35);
      const duration = 0.5 + ((i % 5) * 0.12);
      const delay = (i * 0.04) % 0.6;
      return { id: i, minHeight, maxHeight, duration, delay };
    });
  }, [barCount]);

  return (
    <div className={`flex items-end justify-center gap-[3px] h-9 px-2 overflow-hidden ${className}`}>
      {bars.map((bar) => (
        <span
          key={bar.id}
          style={{
            height: isPlaying ? undefined : '12%',
            animationDuration: isPlaying ? `${bar.duration}s` : '0s',
            animationDelay: `${bar.delay}s`,
          }}
          className={`w-[3px] rounded-full transition-all duration-300 ${
            isPlaying
              ? 'animate-eq-bar bg-gradient-to-t from-[#00C96B] via-[#00FF87] to-white shadow-neon-sm'
              : 'bg-white/15'
          }`}
        />
      ))}
    </div>
  );
}
