import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

function youtubeSearchPlugin() {
  return {
    name: 'youtube-search-plugin',
    configureServer(server) {
      server.middlewares.use('/api/search', async (req, res) => {
        try {
          const url = new URL(req.url, 'http://localhost');
          const q = url.searchParams.get('q');
          if (!q) {
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify([]));
          }
          const resp = await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`, {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept-Language': 'en-US,en;q=0.9',
            },
          });
          const html = await resp.text();
          const m = html.match(/var ytInitialData = (\{.+?\});<\/script>/);
          if (m) {
            const data = JSON.parse(m[1]);
            const contents =
              data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents?.[0]
                ?.itemSectionRenderer?.contents || [];
            const results = [];
            for (const item of contents) {
              const vr = item.videoRenderer;
              if (vr && vr.videoId) {
                results.push({
                  videoId: vr.videoId,
                  title: vr.title?.runs?.[0]?.text || 'Unknown Title',
                  author: vr.ownerText?.runs?.[0]?.text || '',
                });
                if (results.length >= 8) break;
              }
            }
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify(results));
          }
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify([]));
        } catch (err) {
          console.error('Search error:', err);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: err.message }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), youtubeSearchPlugin()],
});
