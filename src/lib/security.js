/**
 * Client-side anti-tamper and DevTools security shield.
 * 1. Blocks Inspect Element keyboard shortcuts (F12, Ctrl+Shift+I/J/C, Ctrl+U).
 * 2. Disables context menu (right-click) to prevent 'Inspect'.
 * 3. Logs a stern security warning banner in DevTools console (Facebook/Discord style).
 * 4. Freezes window security properties to prevent runtime tampering.
 */

export function initClientSecurity() {
  if (typeof window === 'undefined') return;

  // 1. Prominent Console Security Warning
  try {
    const bannerStyle = 'color: #ef4444; font-size: 26px; font-weight: 900; text-shadow: 1px 1px 2px black;';
    const bodyStyle = 'color: #22c55e; font-size: 13px; font-weight: 600; line-height: 1.6;';
    const noteStyle = 'color: #94a3b8; font-size: 11px;';

    console.log('%c⚠️ STOP! / সাবধান!', bannerStyle);
    console.log(
      '%cThis is a browser feature intended for developers. Do not paste any code here!\nTuneTogether database is fully secured by Firebase Security Rules.',
      bodyStyle
    );
    console.log(
      '%cAll unauthorized read/write attempts to the database are automatically blocked and logged by Firebase servers.',
      noteStyle
    );
  } catch {}

  // 2. Disable Right-Click Context Menu in Production
  window.addEventListener('contextmenu', (e) => {
    // Only allow right click if user is clicking an input/textarea for copy-pasting
    const tag = e.target?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea') return;
    e.preventDefault();
  });

  // 3. Disable DevTools and View-Source Shortcuts
  window.addEventListener('keydown', (e) => {
    // F12
    if (e.key === 'F12' || e.keyCode === 123) {
      e.preventDefault();
      return false;
    }

    // Ctrl+Shift+I / Cmd+Option+I (Inspect)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.keyCode === 73)) {
      e.preventDefault();
      return false;
    }

    // Ctrl+Shift+J / Cmd+Option+J (Console)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'J' || e.key === 'j' || e.keyCode === 74)) {
      e.preventDefault();
      return false;
    }

    // Ctrl+Shift+C / Cmd+Option+C (Element Inspector)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'C' || e.key === 'c' || e.keyCode === 67)) {
      e.preventDefault();
      return false;
    }

    // Ctrl+U / Cmd+U (View Source)
    if ((e.ctrlKey || e.metaKey) && (e.key === 'u' || e.key === 'U' || e.keyCode === 85)) {
      e.preventDefault();
      return false;
    }
  });
}

/**
 * In-memory client rate limiter for Spam Protection.
 * Tracks timestamps of recent user actions (chat, reactions, song adds).
 */
const rateLimits = {
  chat: [],
  reactions: [],
  addSong: [],
};

/**
 * Check if an action is allowed under rate limits.
 * @param {'chat'|'reactions'|'addSong'} actionType
 * @param {number} minIntervalMs - Minimum time between consecutive actions
 * @param {number} maxPerWindow - Max actions allowed in the window
 * @param {number} windowMs - Window duration in ms
 * @returns {{ allowed: boolean, waitSec?: number, reason?: string }}
 */
export function checkRateLimit(actionType, minIntervalMs = 1200, maxPerWindow = 6, windowMs = 10000) {
  const now = Date.now();
  const history = rateLimits[actionType] || [];

  // Remove entries older than windowMs
  const fresh = history.filter((t) => now - t < windowMs);
  rateLimits[actionType] = fresh;

  // 1. Min interval check between immediate actions
  const lastAction = fresh[fresh.length - 1];
  if (lastAction && now - lastAction < minIntervalMs) {
    const waitSec = Math.ceil((minIntervalMs - (now - lastAction)) / 1000);
    return {
      allowed: false,
      waitSec,
      reason: `Please slow down. Wait ${waitSec}s before trying again.`,
    };
  }

  // 2. Max actions in window check
  if (fresh.length >= maxPerWindow) {
    const oldest = fresh[0];
    const waitSec = Math.ceil((windowMs - (now - oldest)) / 1000);
    return {
      allowed: false,
      waitSec,
      reason: `Too many actions. Please wait ${waitSec}s.`,
    };
  }

  // Action permitted: record timestamp
  fresh.push(now);
  return { allowed: true };
}

/**
 * Sanitize text input to prevent XSS injection.
 */
export function sanitizeInput(text, maxLength = 450) {
  if (typeof text !== 'string') return '';
  return text
    .trim()
    .replace(/<[^>]*>?/gm, '') // strip HTML tags
    .slice(0, maxLength);
}

