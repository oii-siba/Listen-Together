import { useState } from 'react';

export default function Avatar({ name = '?', photo, size = 40, ring = false }) {
  const [failed, setFailed] = useState(false);
  const style = { width: size, height: size };
  const cls = `rounded-full shrink-0 ${ring ? 'ring-2 ring-accent' : ''}`;
  if (photo && !failed) {
    return (
      <img
        src={photo}
        alt={name}
        style={style}
        className={`${cls} object-cover`}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <div style={style} className={`${cls} bg-panel2 grid place-items-center text-sm font-bold text-accent`}>
      {(name || '?').trim().charAt(0).toUpperCase() || '?'}
    </div>
  );
}
