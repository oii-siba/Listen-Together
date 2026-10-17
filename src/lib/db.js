import * as rtdb from 'firebase/database';
import { db, isFirebaseConfigured } from '../firebase';

// Channel for cross-tab communication in local/demo mode
const channel = typeof window !== 'undefined' && 'BroadcastChannel' in window 
  ? new BroadcastChannel('listen-together-sync') 
  : null;

const listeners = new Map(); // path -> Set of callbacks

function getLocalStore() {
  try {
    const raw = localStorage.getItem('LT_LOCAL_STORE');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalStore(store) {
  try {
    localStorage.setItem('LT_LOCAL_STORE', JSON.stringify(store));
  } catch {
    // Ignore storage quota
  }
}

function getByPath(obj, path) {
  if (!path || path === '/') return obj;
  const parts = path.split('/').filter(Boolean);
  let cur = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = cur[p];
  }
  return cur;
}

function setByPath(obj, path, val) {
  const parts = path.split('/').filter(Boolean);
  if (parts.length === 0) return val;
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (!cur[p] || typeof cur[p] !== 'object') {
      cur[p] = {};
    }
    cur = cur[p];
  }
  const last = parts[parts.length - 1];
  if (val === undefined || val === null) {
    delete cur[last];
  } else {
    // Resolve serverTimestamp() sentinel if present
    const cleanVal = JSON.parse(JSON.stringify(val), (k, v) => 
      v === '.sv_timestamp' ? Date.now() : v
    );
    cur[last] = cleanVal;
  }
  return obj;
}

function notifyLocal(path) {
  const store = getLocalStore();
  listeners.forEach((callbacks, listenPath) => {
    if (path.startsWith(listenPath) || listenPath.startsWith(path) || path === '') {
      const val = getByPath(store, listenPath);
      const snap = {
        val: () => (val === undefined ? null : val),
        exists: () => val !== undefined && val !== null,
        key: listenPath.split('/').filter(Boolean).pop() || null,
      };
      callbacks.forEach((cb) => {
        try {
          cb(snap);
        } catch (e) {
          console.error('Listener error:', e);
        }
      });
    }
  });
}

if (channel) {
  channel.onmessage = (e) => {
    if (e.data && e.data.type === 'SYNC') {
      notifyLocal(e.data.path || '');
    }
  };
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'LT_LOCAL_STORE') {
      notifyLocal('');
    }
  });
}

function generatePushId() {
  const time = Date.now().toString(36).padStart(9, '0');
  const rand = Math.random().toString(36).substring(2, 9);
  return `-${time}${rand}`;
}

// ---------------- UNIFIED DB API ----------------

export function ref(database, path = '') {
  if (isFirebaseConfigured) {
    return rtdb.ref(database, path);
  }
  return {
    _isLocal: true,
    path: path.replace(/^\/+|\/+$/g, ''),
  };
}

export function set(refObj, value) {
  if (isFirebaseConfigured) {
    return rtdb.set(refObj, value);
  }
  const store = getLocalStore();
  setByPath(store, refObj.path, value);
  saveLocalStore(store);
  notifyLocal(refObj.path);
  if (channel) channel.postMessage({ type: 'SYNC', path: refObj.path });
  return Promise.resolve();
}

export function update(refObj, values) {
  if (isFirebaseConfigured) {
    return rtdb.update(refObj, values);
  }
  const store = getLocalStore();
  const current = getByPath(store, refObj.path) || {};
  const merged = { ...current, ...values };
  setByPath(store, refObj.path, merged);
  saveLocalStore(store);
  notifyLocal(refObj.path);
  if (channel) channel.postMessage({ type: 'SYNC', path: refObj.path });
  return Promise.resolve();
}

export function remove(refObj) {
  if (isFirebaseConfigured) {
    return rtdb.remove(refObj);
  }
  const store = getLocalStore();
  setByPath(store, refObj.path, null);
  saveLocalStore(store);
  notifyLocal(refObj.path);
  if (channel) channel.postMessage({ type: 'SYNC', path: refObj.path });
  return Promise.resolve();
}

export function push(refObj, value) {
  if (isFirebaseConfigured) {
    return rtdb.push(refObj, value);
  }
  const id = generatePushId();
  const itemPath = refObj.path ? `${refObj.path}/${id}` : id;
  const childRef = { _isLocal: true, path: itemPath, key: id };
  if (value !== undefined) {
    set(childRef, value);
  }
  return childRef;
}

export function onValue(refObj, callback, errorCallback) {
  if (isFirebaseConfigured) {
    return rtdb.onValue(refObj, callback, errorCallback);
  }
  
  // Special simulated paths
  if (refObj.path === '.info/connected') {
    callback({ val: () => true, exists: () => true });
    return () => {};
  }
  if (refObj.path === '.info/serverTimeOffset') {
    callback({ val: () => 0, exists: () => true });
    return () => {};
  }

  const p = refObj.path;
  if (!listeners.has(p)) {
    listeners.set(p, new Set());
  }
  listeners.get(p).add(callback);

  // Initial trigger
  const store = getLocalStore();
  const val = getByPath(store, p);
  const snap = {
    val: () => (val === undefined ? null : val),
    exists: () => val !== undefined && val !== null,
    key: p.split('/').filter(Boolean).pop() || null,
  };
  setTimeout(() => callback(snap), 0);

  return () => {
    const setCb = listeners.get(p);
    if (setCb) {
      setCb.delete(callback);
      if (setCb.size === 0) listeners.delete(p);
    }
  };
}

export function onDisconnect(refObj) {
  if (isFirebaseConfigured) {
    return rtdb.onDisconnect(refObj);
  }
  return {
    remove: () => Promise.resolve(),
    set: () => Promise.resolve(),
    update: () => Promise.resolve(),
    cancel: () => Promise.resolve(),
  };
}

export function serverTimestamp() {
  if (isFirebaseConfigured) {
    return rtdb.serverTimestamp();
  }
  return Date.now();
}
