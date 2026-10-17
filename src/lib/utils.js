const ID_RE = /^[\w-]{11}$/;

export function parseYouTubeId(input = '') {
  const s = input.trim();
  if (!s) return null;
  if (ID_RE.test(s)) return s;
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
    const host = u.hostname.replace(/^(www\.|m\.|music\.)/, '');
    if (host === 'youtu.be') {
      const id = u.pathname.slice(1).split('/')[0];
      return ID_RE.test(id) ? id : null;
    }
    if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      const v = u.searchParams.get('v');
      if (v && ID_RE.test(v)) return v;
      const m = u.pathname.match(/^\/(embed|shorts|live|v)\/([\w-]{11})/);
      if (m) return m[2];
    }
  } catch {
    /* not a URL */
  }
  return null;
}

export const thumbFor = (id) => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;

// Title/author without needing an API key. status 401/404 => video can't be embedded / doesn't exist.
export async function fetchMeta(id) {
  try {
    const r = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}&format=json`
    );
    if (!r.ok) return { title: 'YouTube video', author: '', status: r.status };
    const j = await r.json();
    return { title: j.title, author: j.author_name, status: 200 };
  } catch {
    return { title: 'YouTube video', author: '', status: 0 };
  }
}

const ROOM_CHARS = 'abcdefghjkmnpqrstuvwxyz23456789';
export function randomRoomId(len = 8) {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, (b) => ROOM_CHARS[b % ROOM_CHARS.length]).join('');
}

// Accepts a full room link or just the room code.
export function parseRoomId(input = '') {
  const s = input.trim();
  const m = s.match(/\/room\/([a-z0-9]+)/i);
  if (m) return m[1].toLowerCase();
  if (/^[a-z0-9]{4,16}$/i.test(s)) return s.toLowerCase();
  return null;
}

export function fmtTime(sec = 0) {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function isInAppBrowser() {
  const ua = navigator.userAgent || '';
  return /FBAN|FBAV|Instagram|Line\/|MicroMessenger|Snapchat|Twitter|; wv\)/i.test(ua);
}
