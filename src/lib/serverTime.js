import { ref, onValue } from './db';
import { db } from '../firebase';

// Firebase tells us how far this device's clock is from the server clock.
let offset = 0;
let hasReceivedServerOffset = false;

try {
  const cached = localStorage.getItem('LT_SERVER_OFFSET');
  if (cached) offset = Number(cached) || 0;
} catch {}

onValue(ref(db, '.info/serverTimeOffset'), (snap) => {
  const val = snap.val();
  if (typeof val === 'number') {
    const diff = Math.abs(val - offset);
    offset = val;
    hasReceivedServerOffset = true;
    try {
      localStorage.setItem('LT_SERVER_OFFSET', String(val));
    } catch {}
    if (diff > 150 && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tt-clock-calibrated', { detail: { offset: val } }));
    }
  }
});

export const serverNow = () => Date.now() + offset;
export const getServerOffset = () => offset;
export const isClockSynced = () => hasReceivedServerOffset;
