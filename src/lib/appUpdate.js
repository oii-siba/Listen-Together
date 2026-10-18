/**
 * In-App Version & Update Management System for TuneTogether
 * Supports: PWA Service Worker updates, Remote version.json checks, and Firebase version triggers
 */
import { ref, onValue } from './db';
import { db, isFirebaseConfigured } from '../firebase';

export const CURRENT_APP_VERSION = '1.0.1';

let updateInfoState = {
  isAvailable: false,
  forceUpdate: false,
  newVersion: CURRENT_APP_VERSION,
  currentVersion: CURRENT_APP_VERSION,
  title: 'নতুন আপডেট উপলব্ধ! 🚀',
  message: 'TuneTogether-এর নতুন ভার্সন এসেছে। নতুন ফিচার ও নিরবচ্ছিন্ন গান শোনার জন্য আপডেট করুন।',
  changelog: [
    '🎵 ব্যাক নেভিগেশন ও গান চালিয়ে রাখার অটো রি-সিঙ্ক',
    '⚡ মোবাইল ব্যাকগ্রাউন্ড পারফরম্যান্স ও স্টেবিলিটি',
    '🔒 ইনস্ট্যান্ট লাইভ ইন-অ্যাপ আপডেট সিস্টেম',
  ],
};

let waitingServiceWorker = null;
let swRegistration = null;

// Compare semver like '1.0.1' vs '1.0.0'
export function isNewerVersion(remote, local) {
  if (!remote || !local) return false;
  if (remote === local) return false;

  const rParts = remote.split('.').map((n) => parseInt(n, 10) || 0);
  const lParts = local.split('.').map((n) => parseInt(n, 10) || 0);

  for (let i = 0; i < Math.max(rParts.length, lParts.length); i++) {
    const r = rParts[i] || 0;
    const l = lParts[i] || 0;
    if (r > l) return true;
    if (r < l) return false;
  }
  return false;
}

export function getUpdateState() {
  return { ...updateInfoState };
}

function notifyUpdateAvailable(info) {
  updateInfoState = {
    ...updateInfoState,
    ...info,
    isAvailable: true,
  };
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('tt-app-update-available', {
        detail: updateInfoState,
      })
    );
  }
}

/**
 * Apply the update immediately: activates new Service Worker, purges stale caches, and reloads
 */
export async function applyAppUpdate() {
  try {
    // 1. Tell waiting service worker to skip waiting and activate immediately
    if (waitingServiceWorker) {
      waitingServiceWorker.postMessage({ type: 'SKIP_WAITING' });
    }

    // 2. Clear browser Cache Storage to guarantee 100% fresh bundles
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch (err) {
    console.warn('Error applying update:', err);
  } finally {
    // 3. Hard reload the page with cache busting
    setTimeout(() => {
      window.location.reload();
    }, 200);
  }
}

/**
 * Check remote version.json for newly published builds
 */
export async function checkRemoteVersion() {
  try {
    const res = await fetch(`/version.json?_t=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
    });

    if (!res.ok) return false;
    const data = await res.json();

    if (data && data.version) {
      const newer = isNewerVersion(data.version, CURRENT_APP_VERSION);
      const mustForce = data.forceUpdate === true && data.version !== CURRENT_APP_VERSION;

      if (newer || mustForce) {
        notifyUpdateAvailable({
          newVersion: data.version,
          forceUpdate: mustForce,
          title: data.title || updateInfoState.title,
          message: data.message || updateInfoState.message,
          changelog: Array.isArray(data.changelog) && data.changelog.length ? data.changelog : updateInfoState.changelog,
        });
        return true;
      }
    }
  } catch (e) {
    // Silent fail if offline
  }
  return false;
}

/**
 * Initialize Service Worker & Remote update listeners
 */
export function initAppUpdateSystem() {
  if (typeof window === 'undefined') return;

  // 1. Service Worker update listener
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((reg) => {
      swRegistration = reg;

      // Check if a worker is already waiting (e.g. from previous visit)
      if (reg.waiting) {
        waitingServiceWorker = reg.waiting;
        notifyUpdateAvailable({
          title: 'নতুন আপডেট প্রস্তুত! 🚀',
          message: 'একটি নতুন আপডেট ব্যাকগ্রাউন্ডে ডাউনলোড হয়েছে। অ্যাপটি রিলোড করে আপডেট সম্পূর্ণ করুন।',
        });
      }

      // Listen for newly installed workers
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            waitingServiceWorker = newWorker;
            notifyUpdateAvailable({
              title: 'নতুন আপডেট প্রস্তুত! 🚀',
              message: 'একটি নতুন আপডেট ব্যাকগ্রাউন্ডে ডাউনলোড হয়েছে। অ্যাপটি রিলোড করে আপডেট সম্পূর্ণ করুন।',
            });
          }
        });
      });
    });

    // Auto-reload when new controller takes over (after SKIP_WAITING)
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });

    // Periodically ask browser to check for sw.js updates
    setInterval(() => {
      swRegistration?.update?.().catch(() => {});
    }, 60 * 1000 * 5); // Every 5 minutes
  }

  // 2. Remote version.json checks
  checkRemoteVersion();

  // Check remote version when user returns to app
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      checkRemoteVersion();
      swRegistration?.update?.().catch(() => {});
    }
  });

  window.addEventListener('focus', () => {
    checkRemoteVersion();
  });

  // Check periodically (every 3 minutes)
  setInterval(() => {
    checkRemoteVersion();
  }, 180000);

  // 3. Realtime Firebase update listener (instant push to all active users)
  if (isFirebaseConfigured) {
    try {
      onValue(ref(db, 'app_config/update'), (snap) => {
        const val = snap.val();
        if (val && val.version) {
          const isNewer = isNewerVersion(val.version, CURRENT_APP_VERSION);
          const force = val.forceUpdate === true && val.version !== CURRENT_APP_VERSION;
          if (isNewer || force) {
            notifyUpdateAvailable({
              newVersion: val.version,
              forceUpdate: force,
              title: val.title || 'লাইভ আপডেট পাওয়া গেছে! 🚀',
              message: val.message || 'TuneTogether-এ জরুরি আপডেট এসেছে। অনুগ্রহ করে এখনই আপডেট করুন।',
              changelog: val.changelog || updateInfoState.changelog,
            });
          }
        }
      });
    } catch {}
  }
}
