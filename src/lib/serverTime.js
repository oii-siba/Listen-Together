import { ref, onValue } from './db';
import { db } from '../firebase';

// Firebase tells us how far this device's clock is from the server clock.
let offset = 0;
onValue(ref(db, '.info/serverTimeOffset'), (snap) => {
  offset = snap.val() || 0;
});

export const serverNow = () => Date.now() + offset;
