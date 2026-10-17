import { db, isFirebaseConfigured } from '../firebase';
import { ref, set, update, remove, onValue, serverTimestamp } from './db';


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

// ---------------- FRIENDS SYSTEM ----------------
export function getFriendsList(uid) {
  return getLocal(`${FRIENDS_KEY}_${uid}`, [
    {
      uid: 'bot-siba',
      name: 'Rohan (DJ)',
      photo: 'https://api.dicebear.com/7.x/bottts/svg?seed=rohan',
      status: 'online',
      listeningTo: 'Kesariya',
    },
    {
      uid: 'bot-priya',
      name: 'Priya',
      photo: 'https://api.dicebear.com/7.x/bottts/svg?seed=priya',
      status: 'online',
      listeningTo: 'Midnight Drive',
    },
  ]);
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

// ---------------- NOTIFICATIONS ----------------
export function getNotifications(uid) {
  return getLocal(`${NOTIFICATIONS_KEY}_${uid}`, [
    {
      id: 'notif-1',
      type: 'invite',
      title: 'Room Invite',
      body: 'Priya invited you to join "Lo-Fi Beats" room',
      roomId: 'kb23s9sh',
      timestamp: Date.now() - 1000 * 60 * 12,
      unread: true,
    },
    {
      id: 'notif-2',
      type: 'activity',
      title: 'Welcome to TuneTogether!',
      body: 'Listen to music in sync with friends across any device.',
      timestamp: Date.now() - 1000 * 60 * 60 * 2,
      unread: false,
    },
  ]);
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
