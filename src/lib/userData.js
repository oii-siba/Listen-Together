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
  const updated = [{ id: `n-${Date.now()}`, timestamp: Date.now(), unread: true, ...notif }, ...list].slice(0, 20);
  setLocal(`${NOTIFICATIONS_KEY}_${uid}`, updated);
  return updated;
}

export function markNotificationsRead(uid) {
  const list = getNotifications(uid);
  const updated = list.map((n) => ({ ...n, unread: false }));
  setLocal(`${NOTIFICATIONS_KEY}_${uid}`, updated);
  return updated;
}
