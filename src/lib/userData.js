import { db, isFirebaseConfigured } from '../firebase';
import { ref, get, set, update, remove, onValue, serverTimestamp } from './db';



// Local storage fallback keys
const FAVORITES_KEY = 'TT_USER_FAVORITES';
const HISTORY_KEY = 'TT_USER_HISTORY';
const PROFILE_KEY = 'TT_USER_PROFILE';
const FRIENDS_KEY = 'TT_USER_FRIENDS';
const NOTIFICATIONS_KEY = 'TT_USER_NOTIFICATIONS';

function getLocal(key, defaultVal = []) {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : defaultVal;
  } catch {
    return defaultVal;
  }
}

function setLocal(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {}
}

// ---------------- FAVORITE SONGS ----------------
export function getFavoriteSongs(uid) {
  return getLocal(`${FAVORITES_KEY}_${uid}`, []);
}

export async function toggleFavoriteSong(uid, song) {
  if (!uid || !song || !song.videoId) return false;
  const list = getFavoriteSongs(uid);
  const exists = list.some((s) => s.videoId === song.videoId);

  let updated;
  if (exists) {
    updated = list.filter((s) => s.videoId !== song.videoId);
    if (isFirebaseConfigured) {
      remove(ref(db, `users/${uid}/favorites/${song.videoId}`)).catch(() => {});
    }
  } else {
    const item = {
      videoId: song.videoId,
      title: song.title || 'YouTube Song',
      thumb: song.thumb || song.thumbnail || `https://i.ytimg.com/vi/${song.videoId}/hqdefault.jpg`,
      savedAt: Date.now(),
    };
    updated = [item, ...list];
    if (isFirebaseConfigured) {
      set(ref(db, `users/${uid}/favorites/${song.videoId}`), item).catch(() => {});
    }
  }
  setLocal(`${FAVORITES_KEY}_${uid}`, updated);
  return !exists;
}

export function isSongFavorite(uid, videoId) {
  if (!uid || !videoId) return false;
  const list = getFavoriteSongs(uid);
  return list.some((s) => s.videoId === videoId);
}

// ---------------- LISTENING HISTORY ----------------
export function getListeningHistory(uid) {
  return getLocal(`${HISTORY_KEY}_${uid}`, []);
}

export function logSongHistory(uid, song) {
  if (!uid || !song || !song.videoId) return;
  const list = getListeningHistory(uid);
  const filtered = list.filter((s) => s.videoId !== song.videoId);
  const entry = {
    videoId: song.videoId,
    title: song.title || 'YouTube Song',
    thumb: song.thumb || song.thumbnail || `https://i.ytimg.com/vi/${song.videoId}/hqdefault.jpg`,
    playedAt: Date.now(),
  };
  const updated = [entry, ...filtered].slice(0, 30);
  setLocal(`${HISTORY_KEY}_${uid}`, updated);

  if (isFirebaseConfigured) {
    set(ref(db, `users/${uid}/history/${song.videoId}`), entry).catch(() => {});
  }
}

// ---------------- PROFILE CUSTOMIZATION ----------------
export function getUserProfile(uid, fallbackUser = {}) {
  const local = getLocal(`${PROFILE_KEY}_${uid}`, null);
  if (local) return local;
  return {
    displayName: fallbackUser.displayName || 'Music Fan',
    photoURL: fallbackUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${uid}`,
    bio: 'Vibing with friends on TuneTogether 🎧',
    favoriteGenre: 'Lo-Fi & Pop',
    friendCode: `TT-${(uid || 'USER').slice(0, 6).toUpperCase()}`,
  };
}

export async function saveUserProfile(uid, profileData) {
  if (!uid) return;
  setLocal(`${PROFILE_KEY}_${uid}`, profileData);
  if (isFirebaseConfigured) {
    set(ref(db, `users/${uid}/profile`), {
      ...profileData,
      updatedAt: serverTimestamp(),
    }).catch(() => {});
  }
}

export function getFriendCode(uid) {
  return `TT-${(uid || 'USER').slice(0, 6).toUpperCase()}`;
}

export async function registerUserDirectory(user) {
  if (!user || !user.uid) return null;
  const code = getFriendCode(user.uid);
  const entry = {
    uid: user.uid,
    friendCode: code,
    name: user.displayName || user.email?.split('@')[0] || 'TuneTogether User',
    photo: user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`,
    email: user.email || '',
    registeredAt: Date.now(),
  };

  // Local directory registry
  const dir = getLocal('TT_USER_DIRECTORY', {});
  dir[code] = entry;
  dir[user.uid] = entry;
  setLocal('TT_USER_DIRECTORY', dir);

  // Firebase directory registry
  if (isFirebaseConfigured) {
    try {
      await set(ref(db, `friend_directory/${code}`), entry);
      await set(ref(db, `friend_directory_uids/${user.uid}`), entry);
    } catch (err) {
      console.warn('Could not register friend directory:', err);
    }
  }
  return entry;
}

export async function lookupUserByCodeOrId(searchTerm, peopleInRoom = []) {
  if (!searchTerm || typeof searchTerm !== 'string') return null;
  const raw = searchTerm.trim().toUpperCase();
  const withPrefix = raw.startsWith('TT-') ? raw : `TT-${raw}`;
  const rawTrimmed = searchTerm.trim();

  // 1. Try people currently present in the room
  if (Array.isArray(peopleInRoom)) {
    const match = peopleInRoom.find((p) => {
      const pCode = getFriendCode(p.uid);
      return (
        pCode === withPrefix ||
        p.uid?.toUpperCase() === raw ||
        p.uid === rawTrimmed ||
        (p.name && p.name.toLowerCase() === rawTrimmed.toLowerCase())
      );
    });
    if (match) {
      return {
        uid: match.uid,
        friendCode: getFriendCode(match.uid),
        name: match.name || 'Friend',
        photo: match.photo || `https://api.dicebear.com/7.x/bottts/svg?seed=${match.uid}`,
        email: match.email || '',
      };
    }
  }

  // 2. Try local storage directory
  const localDir = getLocal('TT_USER_DIRECTORY', {});
  if (localDir[withPrefix]) return localDir[withPrefix];
  if (localDir[raw]) return localDir[raw];
  if (localDir[rawTrimmed]) return localDir[rawTrimmed];

  // 3. Try Firebase friend_directory
  if (isFirebaseConfigured) {
    try {
      const snapCode = await get(ref(db, `friend_directory/${withPrefix}`));
      if (snapCode.exists()) return snapCode.val();

      const snapUid = await get(ref(db, `friend_directory_uids/${rawTrimmed}`));
      if (snapUid.exists()) return snapUid.val();

      const snapProfile = await get(ref(db, `users/${rawTrimmed}/profile`));
      if (snapProfile.exists()) {
        const p = snapProfile.val();
        return {
          uid: rawTrimmed,
          friendCode: p.friendCode || getFriendCode(rawTrimmed),
          name: p.displayName || 'TuneTogether User',
          photo: p.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${rawTrimmed}`,
          email: p.email || '',
        };
      }
    } catch (e) {
      console.warn('Firebase lookup error:', e);
      if (
        e?.message?.toLowerCase().includes('permission') ||
        e?.code === 'PERMISSION_DENIED'
      ) {
        throw new Error('FIREBASE_PERMISSION_DENIED');
      }
    }
  }

  return null;
}


// ---------------- FRIENDS SYSTEM ----------------
export function getFriendsList(uid) {
  const raw = getLocal(`${FRIENDS_KEY}_${uid}`, []);
  return raw.filter((f) => !f.uid?.startsWith('bot-'));
}

export function addFriend(uid, friend) {
  const list = getFriendsList(uid);
  if (list.some((f) => f.uid === friend.uid || f.friendCode === friend.friendCode)) return false;
  const updated = [...list, friend];
  setLocal(`${FRIENDS_KEY}_${uid}`, updated);
  if (isFirebaseConfigured) {
    set(ref(db, `users/${uid}/friends/${friend.uid}`), friend).catch(() => {});
  }
  return true;
}


export function removeFriend(uid, friendUid) {
  const list = getFriendsList(uid);
  const updated = list.filter((f) => f.uid !== friendUid);
  setLocal(`${FRIENDS_KEY}_${uid}`, updated);
  if (isFirebaseConfigured) {
    remove(ref(db, `users/${uid}/friends/${friendUid}`)).catch(() => {});
  }
  return updated;
}

// ---------------- NOTIFICATIONS ----------------
export function getNotifications(uid) {
  const raw = getLocal(`${NOTIFICATIONS_KEY}_${uid}`, []);
  return raw.filter((n) => !n.id?.startsWith('notif-'));
}

export function addNotification(uid, notif) {
  const list = getNotifications(uid);
  const updated = [
    { id: `n-${Date.now()}`, timestamp: Date.now(), unread: true, ...notif },
    ...list,
  ].slice(0, 20);
  setLocal(`${NOTIFICATIONS_KEY}_${uid}`, updated);
  return updated;
}

export async function sendRoomInvite(senderUser, targetUid, roomId) {
  if (!senderUser || !targetUid || !roomId) return false;
  const notif = {
    type: 'room_invite',
    title: '🎧 Room Invite',
    body: `${senderUser.displayName || 'A friend'} invited you to join room "${roomId}"`,
    senderUid: senderUser.uid,
    senderName: senderUser.displayName || 'Friend',
    senderPhoto:
      senderUser.photoURL ||
      `https://api.dicebear.com/7.x/bottts/svg?seed=${senderUser.uid}`,
    roomId,
    timestamp: Date.now(),
    unread: true,
  };

  // 1. Firebase push
  if (isFirebaseConfigured) {
    try {
      await push(ref(db, `users/${targetUid}/notifications`), {
        ...notif,
        timestamp: serverTimestamp(),
      });
    } catch (e) {
      console.warn('Firebase notification push error:', e);
    }
  }

  // 2. Local storage / cross-tab fallback
  addNotification(targetUid, notif);

  // 3. Broadcast channel for local/demo cross-tab sync
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    try {
      const bc = new BroadcastChannel('listen-together-sync');
      bc.postMessage({ type: 'ROOM_INVITE', targetUid, notif });
    } catch {}
  }

  return true;
}

export function subscribeToNotifications(uid, callback) {
  if (!uid) return () => {};

  // Initial trigger
  callback(getNotifications(uid));

  // Firebase Realtime Database onValue listener
  let fbUnsub = () => {};
  if (isFirebaseConfigured) {
    const notifRef = ref(db, `users/${uid}/notifications`);
    fbUnsub = onValue(notifRef, (snap) => {
      const data = snap.val();
      if (!data) {
        callback(getNotifications(uid));
        return;
      }
      const list = Object.entries(data)
        .map(([key, val]) => ({
          id: key,
          ...val,
        }))
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      callback(list);
    });
  }

  // Broadcast channel for instantaneous cross-tab alerts
  let bc = null;
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    try {
      bc = new BroadcastChannel('listen-together-sync');
      bc.onmessage = (e) => {
        if (e.data?.type === 'ROOM_INVITE' && e.data?.targetUid === uid) {
          callback(getNotifications(uid));
        }
      };
    } catch {}
  }

  return () => {
    fbUnsub();
    if (bc) bc.close();
  };
}

export async function markNotificationsRead(uid) {
  const list = getNotifications(uid);
  const updated = list.map((n) => ({ ...n, unread: false }));
  setLocal(`${NOTIFICATIONS_KEY}_${uid}`, updated);

  if (isFirebaseConfigured) {
    try {
      const snap = await get(ref(db, `users/${uid}/notifications`));
      if (snap.exists()) {
        const data = snap.val();
        const updates = {};
        Object.keys(data).forEach((k) => {
          updates[`${k}/unread`] = false;
        });
        await update(ref(db, `users/${uid}/notifications`), updates);
      }
    } catch (e) {
      console.warn('Could not mark notifications read in Firebase:', e);
    }
  }

  return updated;
}

// ---------------- AUDIO CHIME ----------------
export function playNotificationChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    const now = ctx.currentTime;
    // Harmonic pleasant two-tone chime (587Hz -> 880Hz)
    osc.frequency.setValueAtTime(587.33, now);
    osc.frequency.setValueAtTime(880, now + 0.12);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.45);
  } catch {}
}

// ---------------- ROOM ACTIVITY ----------------
export async function logRoomActivity(roomId, activity) {
  if (!roomId || !activity) return;
  const entry = {
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: activity.type || 'activity',
    title: activity.title || 'Room Activity',
    body: activity.body || '',
    userName: activity.userName || 'Someone',
    timestamp: Date.now(),
  };

  // Local storage cache
  const localKey = `TT_ROOM_ACTIVITY_${roomId}`;
  const localList = getLocal(localKey, []);
  setLocal(localKey, [entry, ...localList].slice(0, 40));

  if (isFirebaseConfigured) {
    try {
      await push(ref(db, `rooms/${roomId}/activity`), {
        ...entry,
        timestamp: serverTimestamp(),
      });
    } catch (e) {
      console.warn('Could not log room activity to Firebase:', e);
    }
  }

  // Cross-tab broadcast
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    try {
      const bc = new BroadcastChannel('listen-together-sync');
      bc.postMessage({ type: 'ROOM_ACTIVITY', roomId, activity: entry });
    } catch {}
  }
}

export function subscribeToRoomActivity(roomId, callback) {
  if (!roomId) return () => {};

  const localKey = `TT_ROOM_ACTIVITY_${roomId}`;
  // Initial local emit
  callback(getLocal(localKey, []));

  let fbUnsub = () => {};
  if (isFirebaseConfigured) {
    const actRef = ref(db, `rooms/${roomId}/activity`);
    fbUnsub = onValue(actRef, (snap) => {
      const data = snap.val();
      if (!data) {
        callback(getLocal(localKey, []));
        return;
      }
      const list = Object.entries(data)
        .map(([key, val]) => ({
          id: key,
          ...val,
        }))
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      callback(list.slice(0, 40));
    });
  }

  let bc = null;
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    try {
      bc = new BroadcastChannel('listen-together-sync');
      bc.onmessage = (e) => {
        if (e.data?.type === 'ROOM_ACTIVITY' && e.data?.roomId === roomId) {
          callback(getLocal(localKey, []));
        }
      };
    } catch {}
  }

  return () => {
    fbUnsub();
    if (bc) bc.close();
  };
}


