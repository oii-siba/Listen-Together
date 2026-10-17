let apiPromise = null;

// Loads the YouTube IFrame Player API once.
export function loadYT() {
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
  if (!apiPromise) {
    apiPromise = new Promise((resolve) => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (prev) prev();
        resolve(window.YT);
      };
      const s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      s.async = true;
      document.head.appendChild(s);
    });
  }
  return apiPromise;
}

const KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
export const searchEnabled = true;

function decode(s = '') {
  const t = document.createElement('textarea');
  t.innerHTML = s;
  return t.value;
}

export async function searchYouTube(q) {
  // 1. Try local dev server proxy (works with zero API keys)
  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data.map((item) => ({
          videoId: item.videoId,
          title: decode(item.title),
          author: decode(item.author),
        }));
      }
    }
  } catch (err) {
    console.warn('Local search proxy error:', err);
  }

  // 2. Fallback to YouTube Data API v3 if key exists
  if (KEY) {
    try {
      const params = new URLSearchParams({
        part: 'snippet',
        type: 'video',
        videoEmbeddable: 'true',
        maxResults: '8',
        q,
        key: KEY,
      });
      const r = await fetch(`https://www.googleapis.com/youtube/v3/search?${params.toString()}`);
      if (r.ok) {
        const j = await r.json();
        return (j.items || []).map((i) => ({
          videoId: i.id.videoId,
          title: decode(i.snippet.title),
          author: decode(i.snippet.channelTitle),
        }));
      }
    } catch (err) {
      console.warn('YouTube API search error:', err);
    }
  }

  return [];
}
