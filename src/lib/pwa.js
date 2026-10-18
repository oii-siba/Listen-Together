// PWA Install helper and state management
import { ref, set, get, update, serverTimestamp } from './db';
import { db, isFirebaseConfigured } from '../firebase';

let deferredInstallPrompt = null;
let isAppInstalled = false;

export async function logAppInstall(user = null) {
  if (typeof window === 'undefined') return;

  // Prevent duplicate install counts for the same device
  try {
    const alreadyLogged = localStorage.getItem('TT_PWA_INSTALLED_LOGGED');
    if (alreadyLogged) return;
    localStorage.setItem('TT_PWA_INSTALLED_LOGGED', 'true');
  } catch {}

  const deviceId = (() => {
    try {
      let id = localStorage.getItem('TT_DEVICE_ID');
      if (!id) {
        id = 'dev-' + Math.random().toString(36).slice(2, 10);
        localStorage.setItem('TT_DEVICE_ID', id);
      }
      return id;
    } catch {
      return 'dev-' + Date.now();
    }
  })();

  const ua = window.navigator.userAgent.toLowerCase();
  const platform = /iphone|ipad|ipod/.test(ua)
    ? 'iOS Safari'
    : /android/.test(ua)
    ? 'Android'
    : /windows/.test(ua)
    ? 'Windows PC'
    : /macintosh|mac os x/.test(ua)
    ? 'Mac OS'
    : 'Web Browser';

  if (isFirebaseConfigured) {
    try {
      // 1. Record device install details
      const installEntryRef = ref(db, `app_installs/${deviceId}`);
      await set(installEntryRef, {
        deviceId,
        uid: user?.uid || null,
        userName: user?.displayName || user?.email || 'Guest Listener',
        platform,
        userAgent: window.navigator.userAgent.slice(0, 150),
        installedAt: serverTimestamp(),
        timestamp: Date.now(),
      });

      // 2. Increment global total install count
      const statsRef = ref(db, 'app_stats/installCount');
      const snap = await get(statsRef);
      const currentCount = snap.exists() ? Number(snap.val()) || 0 : 0;
      await set(statsRef, currentCount + 1);

      // 3. Update user profile if logged in
      if (user?.uid) {
        await update(ref(db, `users/${user.uid}/profile`), {
          hasInstalledApp: true,
          installedAt: serverTimestamp(),
        }).catch(() => {});
      }
    } catch (err) {
      console.warn('Failed to log app install:', err);
    }
  }
}

// Initialize as soon as script loads
if (typeof window !== 'undefined') {
  // Check if already running in standalone (installed) mode
  const checkStandalone = () => {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true ||
      document.referrer.includes('android-app://')
    );
  };

  isAppInstalled = checkStandalone();
  if (isAppInstalled) {
    // If running installed standalone, ensure it is recorded
    setTimeout(() => {
      logAppInstall();
    }, 1500);
  }

  // Listen to beforeinstallprompt globally (Chromium, Edge, Samsung Browser, Chrome Android)
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    window.deferredInstallPrompt = e;
    window.dispatchEvent(new CustomEvent('tt-install-available'));
  });

  // Listen to successful install event
  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    window.deferredInstallPrompt = null;
    isAppInstalled = true;
    window.dispatchEvent(new CustomEvent('tt-installed'));
    logAppInstall();
  });
}

/**
 * Check if the app is already installed and running standalone
 */
export function isInstalled() {
  if (typeof window === 'undefined') return false;
  return (
    isAppInstalled ||
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true ||
    document.referrer.includes('android-app://')
  );
}

/**
 * Check if the browser currently has a deferred install prompt ready
 */
export function canPromptDirectInstall() {
  return !!(deferredInstallPrompt || (typeof window !== 'undefined' && window.deferredInstallPrompt));
}

/**
 * Directly trigger the native browser install prompt dialog
 */
export async function triggerDirectInstall() {
  const prompt = deferredInstallPrompt || (typeof window !== 'undefined' ? window.deferredInstallPrompt : null);

  if (prompt) {
    try {
      prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice && choice.outcome === 'accepted') {
        deferredInstallPrompt = null;
        if (typeof window !== 'undefined') window.deferredInstallPrompt = null;
        isAppInstalled = true;
        window.dispatchEvent(new CustomEvent('tt-installed'));
        logAppInstall();
        return { success: true, outcome: 'accepted' };
      }
      return { success: false, outcome: 'dismissed' };
    } catch (err) {
      console.warn('Install prompt error:', err);
    }
  }

  // Detect iOS Safari
  const ua = typeof window !== 'undefined' ? window.navigator.userAgent.toLowerCase() : '';
  const isApple = /iphone|ipad|ipod/.test(ua);
  if (isApple) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tt-show-ios-guide'));
    }
    return { success: false, outcome: 'ios-guide' };
  }

  // Fallback for desktop Chrome/Edge/Firefox when prompt event is pending or triggered via address bar
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('tt-show-fallback-guide'));
  }
  return { success: false, outcome: 'fallback-guide' };
}
