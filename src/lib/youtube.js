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
  try {
    const doc = new DOMParser().parseFromString(s, 'text/html');
    return doc.documentElement.textContent || '';
  } catch {
    return s;
  }
}

// Live YouTube Auto-suggestions
export async function getYouTubeSuggestions(q) {
  if (!q || !q.trim() || q.trim().length < 2) return [];
  try {
    const res = await fetch(`/api/suggest?q=${encodeURIComponent(q.trim())}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data.slice(0, 7);
    }
  } catch (err) {
    // ignore suggestion errors
  }
  return [];
}

// Deep YouTube search
export async function searchYouTube(q) {
  const query = q.trim();
  if (!query) return [];

  // 1. Primary: Edge / Local Search Proxy
  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data.map((item) => ({
          videoId: item.videoId,
          title: decode(item.title),
          author: decode(item.author),
          duration: item.duration || '',
          views: item.views || '',
          thumbnail: item.thumbnail || `https://i.ytimg.com/vi/${item.videoId}/mqdefault.jpg`,
        }));
      }
    }
  } catch (err) {
    console.warn('Search proxy error:', err);
  }

  // 2. Fallback: YouTube Data API v3 if key exists
  if (KEY) {
    try {
      const params = new URLSearchParams({
        part: 'snippet',
        type: 'video',
        videoEmbeddable: 'true',
        maxResults: '15',
        q: query,
        key: KEY,
      });
      const r = await fetch(`https://www.googleapis.com/youtube/v3/search?${params.toString()}`);
      if (r.ok) {
        const j = await r.json();
        return (j.items || []).map((i) => ({
          videoId: i.id.videoId,
          title: decode(i.snippet.title),
          author: decode(i.snippet.channelTitle),
          duration: '',
          views: '',
          thumbnail: i.snippet.thumbnails?.high?.url || i.snippet.thumbnails?.medium?.url || `https://i.ytimg.com/vi/${i.id.videoId}/mqdefault.jpg`,
        }));
      }
    } catch (err) {
      console.warn('YouTube API search error:', err);
    }
  }

  return [];
}
