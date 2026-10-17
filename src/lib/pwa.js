// PWA Install helper and state management

let deferredInstallPrompt = null;
let isAppInstalled = false;

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

  // Listen to beforeinstallprompt globally (Chromium, Edge, Samsung Browser, Chrome Android)
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the default mini-infobar so our custom direct UI triggers it
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
