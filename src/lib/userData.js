import { db, isFirebaseConfigured } from '../firebase';
import { ref, get, set, update, remove, push, onValue, serverTimestamp } from './db';



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

export function subscribeToFriends(uid, callback) {
  if (!uid) return () => {};

  const emit = (fbData) => {
    const localList = getFriendsList(uid);
    const fbList = fbData
      ? Object.entries(fbData).map(([key, val]) => ({ uid: key, ...val }))
      : [];
    const map = new Map();
    [...fbList, ...localList].forEach((item) => {
      if (item && item.uid && !item.uid.startsWith('bot-')) {
        map.set(item.uid, item);
      }
    });
    const merged = Array.from(map.values());
    setLocal(`${FRIENDS_KEY}_${uid}`, merged);
    callback(merged);
  };

  // Initial local emit
  emit(null);

  let fbUnsub = () => {};
  if (isFirebaseConfigured) {
    const friendsRef = ref(db, `users/${uid}/friends`);
    fbUnsub = onValue(
      friendsRef,
      (snap) => {
        emit(snap.val());
      },
      (err) => {
        console.warn('Firebase friends subscription error:', err);
        emit(null);
      }
    );
  }

  let bc = null;
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    try {
      bc = new BroadcastChannel('listen-together-sync');
      bc.onmessage = (e) => {
        if (
          (e.data?.type === 'FRIENDS_UPDATED' || e.data?.type === 'FRIEND_REQUEST') &&
          e.data?.targetUid === uid
        ) {
          emit(null);
        }
      };
    } catch {}
  }

  const handleStorage = (e) => {
    if (e.key === 'TT_FRIENDS_PING' || e.key === `${FRIENDS_KEY}_${uid}`) {
      emit(null);
    }
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', handleStorage);
  }

  return () => {
    fbUnsub();
    if (bc) bc.close();
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', handleStorage);
    }
  };
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

export async function sendFriendRequest(senderUser, targetUser) {
  if (!senderUser || !targetUser || !targetUser.uid) return { success: false, reason: 'INVALID' };
  if (senderUser.uid === targetUser.uid) return { success: false, reason: 'SELF' };

  const currentFriends = getFriendsList(senderUser.uid);
  if (currentFriends.some((f) => f.uid === targetUser.uid)) {
    return { success: false, reason: 'ALREADY_FRIENDS' };
  }

  const notifId = `freq-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const notif = {
    id: notifId,
    type: 'friend_request',
    title: '👥 Friend Request',
    body: `${senderUser.displayName || 'Someone'} sent you a friend request!`,
    senderUid: senderUser.uid,
    senderName: senderUser.displayName || 'Friend',
    senderPhoto:
      senderUser.photoURL ||
      `https://api.dicebear.com/7.x/bottts/svg?seed=${senderUser.uid}`,
    senderCode: getFriendCode(senderUser.uid),
    targetUid: targetUser.uid,
    timestamp: Date.now(),
    unread: true,
    status: 'pending',
  };

  // 1. Firebase write with direct key so notif.id is the key
  if (isFirebaseConfigured) {
    try {
      await set(ref(db, `users/${targetUser.uid}/notifications/${notifId}`), {
        ...notif,
        timestamp: serverTimestamp(),
      });
    } catch (e) {
      console.warn('Firebase friend request set error:', e);
    }
  }

  // 2. Local storage
  addNotification(targetUser.uid, notif);

  // 3. Broadcast channel
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    try {
      const bc = new BroadcastChannel('listen-together-sync');
      bc.postMessage({ type: 'FRIEND_REQUEST', targetUid: targetUser.uid, notif });
    } catch {}
  }

  // 4. Storage event ping
  try {
    localStorage.setItem(
      'TT_INVITE_PING',
      JSON.stringify({ targetUid: targetUser.uid, timestamp: Date.now() })
    );
  } catch {}

  // 5. In-window event dispatch
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('tt-notification', { detail: { targetUid: targetUser.uid, notif } }));
    } catch {}
  }

  return { success: true };
}

export async function acceptFriendRequest(currentUser, requestNotif) {
  if (!currentUser || !requestNotif || !requestNotif.senderUid) return false;

  const friendA = {
    uid: requestNotif.senderUid,
    friendCode: requestNotif.senderCode || getFriendCode(requestNotif.senderUid),
    name: requestNotif.senderName || 'Friend',
    photo: requestNotif.senderPhoto || `https://api.dicebear.com/7.x/bottts/svg?seed=${requestNotif.senderUid}`,
    status: 'online',
    listeningTo: 'TuneTogether',
  };

  const friendB = {
    uid: currentUser.uid,
    friendCode: getFriendCode(currentUser.uid),
    name: currentUser.displayName || 'Friend',
    photo: currentUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.uid}`,
    status: 'online',
    listeningTo: 'TuneTogether',
  };

  // 1. Add User A to User B's friends
  addFriend(currentUser.uid, friendA);

  // 2. Add User B to User A's friends (both local & Firebase)
  addFriend(requestNotif.senderUid, friendB);
  if (isFirebaseConfigured) {
    try {
      await set(ref(db, `users/${requestNotif.senderUid}/friends/${currentUser.uid}`), friendB);
    } catch (e) {
      console.warn('Firebase add friend error:', e);
    }
  }

  // 3. Send acceptance notification back to User A
  const acceptId = `facc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const acceptNotif = {
    id: acceptId,
    type: 'friend_accepted',
    title: '🎉 Friend Request Accepted',
    body: `${currentUser.displayName || 'Friend'} accepted your friend request! You are now friends.`,
    senderUid: currentUser.uid,
    senderName: currentUser.displayName || 'Friend',
    senderPhoto: currentUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.uid}`,
    timestamp: Date.now(),
    unread: true,
  };

  if (isFirebaseConfigured) {
    try {
      await set(ref(db, `users/${requestNotif.senderUid}/notifications/${acceptId}`), {
        ...acceptNotif,
        timestamp: serverTimestamp(),
      });
    } catch (e) {
      console.warn('Firebase accept notification error:', e);
    }
  }
  addNotification(requestNotif.senderUid, acceptNotif);

  // 4. Update the notification status in Current User's list
  updateNotificationStatus(currentUser.uid, requestNotif.id, 'accepted');

  // 5. Broadcast channel & storage event so both screens update live
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    try {
      const bc = new BroadcastChannel('listen-together-sync');
      bc.postMessage({ type: 'FRIENDS_UPDATED', targetUid: requestNotif.senderUid });
      bc.postMessage({ type: 'FRIENDS_UPDATED', targetUid: currentUser.uid });
      bc.postMessage({ type: 'FRIEND_ACCEPTED', targetUid: requestNotif.senderUid, notif: acceptNotif });
    } catch {}
  }
  try {
    localStorage.setItem('TT_FRIENDS_PING', Date.now().toString());
    localStorage.setItem(
      'TT_INVITE_PING',
      JSON.stringify({ targetUid: requestNotif.senderUid, timestamp: Date.now() })
    );
  } catch {}

  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('tt-notification', { detail: { targetUid: requestNotif.senderUid, notif: acceptNotif } }));
      window.dispatchEvent(new CustomEvent('tt-notification', { detail: { targetUid: currentUser.uid } }));
    } catch {}
  }

  return true;
}

export function updateNotificationStatus(uid, notifId, status) {
  const list = getNotifications(uid);
  const updated = list.map((n) =>
    n.id === notifId ? { ...n, status, unread: false } : n
  );
  setLocal(`${NOTIFICATIONS_KEY}_${uid}`, updated);

  if (isFirebaseConfigured) {
    try {
      update(ref(db, `users/${uid}/notifications/${notifId}`), {
        status,
        unread: false,
      }).catch(() => {});
    } catch {}
  }
  return updated;
}

// ---------------- NOTIFICATIONS ----------------
export function getNotifications(uid) {
  const raw = getLocal(`${NOTIFICATIONS_KEY}_${uid}`, []);
  return raw.filter((n) => !n.id?.startsWith('notif-fake-'));
}

export function addNotification(uid, notif) {
  const list = getNotifications(uid);
  const updated = [
    { id: notif.id || `n-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, timestamp: Date.now(), unread: true, ...notif },
    ...list,
  ].slice(0, 30);
  setLocal(`${NOTIFICATIONS_KEY}_${uid}`, updated);
  return updated;
}

export async function sendRoomInvite(senderUser, targetUid, roomId) {
  if (!senderUser || !targetUid || !roomId) return false;
  const notifId = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const notif = {
    id: notifId,
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

  // 1. Firebase set
  if (isFirebaseConfigured) {
    try {
      await set(ref(db, `users/${targetUid}/notifications/${notifId}`), {
        ...notif,
        timestamp: serverTimestamp(),
      });
    } catch (e) {
      console.warn('Firebase notification set error:', e);
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

  // 4. Trigger localStorage storage event across all tabs/windows
  try {
    localStorage.setItem(
      'TT_INVITE_PING',
      JSON.stringify({ targetUid, timestamp: Date.now() })
    );
  } catch {}

  // 5. In-window custom event
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('tt-notification', { detail: { targetUid, notif } }));
    } catch {}
  }

  return true;
}

function mergeNotifications(fbData, uid) {
  const fbList = fbData
    ? Object.entries(fbData).map(([key, val]) => ({ id: key, ...val }))
    : [];
  const localList = getNotifications(uid);
  const map = new Map();
  [...fbList, ...localList].forEach((item) => {
    const key = item.id || `${item.timestamp}_${item.roomId}`;
    if (!map.has(key)) map.set(key, item);
  });
  return Array.from(map.values()).sort(
    (a, b) => (b.timestamp || 0) - (a.timestamp || 0)
  );
}

export function subscribeToNotifications(uid, callback) {
  if (!uid) return () => {};

  let currentFbData = null;

  const emit = () => {
    callback(mergeNotifications(currentFbData, uid));
  };

  // Initial trigger
  emit();

  // Firebase Realtime Database onValue listener
  let fbUnsub = () => {};
  if (isFirebaseConfigured) {
    const notifRef = ref(db, `users/${uid}/notifications`);
    fbUnsub = onValue(
      notifRef,
      (snap) => {
        currentFbData = snap.val();
        emit();
      },
      (err) => {
        console.warn('Firebase notifications subscription error:', err);
        emit();
      }
    );
  }

  // Broadcast channel for instantaneous cross-tab alerts
  let bc = null;
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    try {
      bc = new BroadcastChannel('listen-together-sync');
      bc.onmessage = (e) => {
        if (
          (e.data?.type === 'ROOM_INVITE' ||
            e.data?.type === 'FRIEND_REQUEST' ||
            e.data?.type === 'FRIEND_ACCEPTED' ||
            e.data?.type === 'NOTIFICATION') &&
          e.data?.targetUid === uid
        ) {
          emit();
        }
      };
    } catch {}
  }

  // Storage listener for cross-window / multi-tab sync
  const handleStorage = (e) => {
    if (
      e.key === 'TT_INVITE_PING' ||
      e.key === 'TT_FRIENDS_PING' ||
      e.key === `${NOTIFICATIONS_KEY}_${uid}`
    ) {
      emit();
    }
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', handleStorage);
  }

  // Same-window in-app event
  const handleCustomEvent = (e) => {
    if (!e.detail?.targetUid || e.detail.targetUid === uid) {
      emit();
    }
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('tt-notification', handleCustomEvent);
  }

  return () => {
    fbUnsub();
    if (bc) bc.close();
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('tt-notification', handleCustomEvent);
    }
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

// ---------------- AUDIO CHIME & AUTOPLAY UNLOCK ----------------
let sharedAudioCtx = null;
function getAudioContext() {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    sharedAudioCtx = new AudioCtx();
  }
  return sharedAudioCtx;
}

// Unlock audio on first user touch/click anywhere in window
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    try {
      const ctx = getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
    } catch {}
    window.removeEventListener('click', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
    window.removeEventListener('touchstart', unlockAudio);
  };
  window.addEventListener('click', unlockAudio, { once: true, passive: true });
  window.addEventListener('keydown', unlockAudio, { once: true, passive: true });
  window.addEventListener('touchstart', unlockAudio, { once: true, passive: true });
}

export function playNotificationChime() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    const now = ctx.currentTime;
    // Harmonic pleasant two-tone chime (587.33Hz D5 -> 880Hz A5)
    osc.frequency.setValueAtTime(587.33, now);
    osc.frequency.setValueAtTime(880, now + 0.12);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.45);
  } catch {}
}

// ---------------- BROWSER NATIVE NOTIFICATIONS ----------------
export function getBrowserNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission; // 'default' | 'granted' | 'denied'
}

export async function requestBrowserNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  try {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const perm = await Notification.requestPermission();
    return perm;
  } catch (e) {
    console.warn('Error requesting notification permission:', e);
    return Notification.permission;
  }
}

export function showNativeNotification(title, options = {}) {
  if (typeof window === 'undefined' || !('Notification' in window)) return null;
  if (Notification.permission !== 'granted') return null;

  try {
    const notif = new Notification(title, {
      body: options.body || '',
      icon: options.icon || options.photo || '/logo.png',
      badge: '/logo.png',
      tag: options.tag || `tt-${Date.now()}`,
      silent: true, // Audio chime already handles pleasant tone
      ...options,
    });

    notif.onclick = () => {
      try {
        window.focus();
      } catch {}
      if (typeof options.onClick === 'function') {
        options.onClick();
      }
      notif.close();
    };

    return notif;
  } catch (e) {
    console.warn('Could not show native notification:', e);
    return null;
  }
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

  // Trigger storage event across tabs
  try {
    localStorage.setItem(
      'TT_ACTIVITY_PING',
      JSON.stringify({ roomId, timestamp: Date.now() })
    );
  } catch {}
}

function mergeRoomActivities(fbData, roomId) {
  const localKey = `TT_ROOM_ACTIVITY_${roomId}`;
  const localList = getLocal(localKey, []);
  const fbList = fbData
    ? Object.entries(fbData).map(([key, val]) => ({ id: key, ...val }))
    : [];
  const map = new Map();
  [...fbList, ...localList].forEach((item) => {
    const key = item.id || `${item.timestamp}_${item.type}_${item.body}`;
    if (!map.has(key)) map.set(key, item);
  });
  return Array.from(map.values())
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
    .slice(0, 40);
}

export function subscribeToRoomActivity(roomId, callback) {
  if (!roomId) return () => {};

  let currentFbData = null;

  const emit = () => {
    callback(mergeRoomActivities(currentFbData, roomId));
  };

  // Initial local emit
  emit();

  let fbUnsub = () => {};
  if (isFirebaseConfigured) {
    const actRef = ref(db, `rooms/${roomId}/activity`);
    fbUnsub = onValue(
      actRef,
      (snap) => {
        currentFbData = snap.val();
        emit();
      },
      (err) => {
        console.warn('Firebase room activity listener error:', err);
        emit();
      }
    );
  }

  let bc = null;
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    try {
      bc = new BroadcastChannel('listen-together-sync');
      bc.onmessage = (e) => {
        if (e.data?.type === 'ROOM_ACTIVITY' && e.data?.roomId === roomId) {
          emit();
        }
      };
    } catch {}
  }

  const handleStorage = (e) => {
    if (e.key === 'TT_ACTIVITY_PING' || e.key === `TT_ROOM_ACTIVITY_${roomId}`) {
      emit();
    }
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', handleStorage);
  }

  return () => {
    fbUnsub();
    if (bc) bc.close();
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', handleStorage);
    }
  };
}


