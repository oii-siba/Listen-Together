export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 1. YouTube Live Suggestion API
    if (url.pathname === '/api/suggest') {
      const q = url.searchParams.get('q') || '';
      if (!q.trim()) {
        return new Response(JSON.stringify([]), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }
      try {
        const resp = await fetch(
          `https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(q)}`,
          {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            },
          }
        );
        const data = await resp.json();
        return new Response(JSON.stringify(data[1] || []), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      } catch (err) {
        return new Response(JSON.stringify([]), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }
    }

    // 2. YouTube Search API proxy
    if (url.pathname === '/api/search') {
      const q = url.searchParams.get('q') || '';
      if (!q.trim()) {
        return new Response(JSON.stringify([]), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }
      try {
        const resp = await fetch(
          `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`,
          {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
              'Accept-Language': 'en-US,en;q=0.9',
            },
          }
        );
        const html = await resp.text();
        const m = html.match(/var ytInitialData = (\{.+?\});<\/script>/);
        if (m) {
          const data = JSON.parse(m[1]);
          const contents =
            data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
          const results = [];
          for (const section of contents) {
            const items = section?.itemSectionRenderer?.contents || [];
            for (const item of items) {
              const vr = item.videoRenderer;
              if (vr && vr.videoId) {
                results.push({
                  videoId: vr.videoId,
                  title: vr.title?.runs?.[0]?.text || 'YouTube Song',
                  author: vr.ownerText?.runs?.[0]?.text || '',
                  duration: vr.lengthText?.simpleText || '',
                  views: vr.shortViewCountText?.simpleText || vr.viewCountText?.simpleText || '',
                  thumbnail:
                    vr.thumbnail?.thumbnails?.slice(-1)[0]?.url ||
                    `https://i.ytimg.com/vi/${vr.videoId}/mqdefault.jpg`,
                });
                if (results.length >= 15) break;
              }
            }
            if (results.length >= 15) break;
          }
          return new Response(JSON.stringify(results), {
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          });
        }
        return new Response(JSON.stringify([]), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }
    }

    // 3. For all other routes, serve static SPA assets safely
    if (env && env.ASSETS && typeof env.ASSETS.fetch === 'function') {
      return env.ASSETS.fetch(request);
    }

    return new Response('Loading assets...', { status: 200 });
  },
};
