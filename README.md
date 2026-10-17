# Listen Together 🎧

Host plays a YouTube song → shares a link → everyone who opens it (after Google login) hears the **same song at the same moment** on their own phone.

**Stack:** React + Vite + Tailwind CSS · Firebase Auth (Google) · Firebase Realtime Database · YouTube IFrame API · Firebase Hosting. No custom server.

## How the sync works

The host never streams audio. Each phone plays the YouTube video itself. The host only writes a tiny state object to the database:

```
rooms/{roomId}/playback = { videoId, isPlaying, position, updatedAt (server time) }
```

Every guest computes `expected = position + (serverNow - updatedAt)` and, if their player drifts more than **1.5 s**, auto-seeks. `serverNow` uses Firebase's `.info/serverTimeOffset`, so phones with wrong clocks still sync.

## 1. Firebase setup (free Spark plan is enough)

1. https://console.firebase.google.com → **Add project**.
2. **Build → Authentication → Get started → Sign-in method → Google → Enable** (set a support email).
3. **Authentication → Settings → Authorized domains** → add your hosting domain (`your-project.web.app` is added by default) and any custom domain. `localhost` is allowed by default.
4. **Build → Realtime Database → Create database** (any region). Copy the database URL.
5. **Project settings → Your apps → Web (`</>`)** → register app → copy the config values.
6. Copy `.env.example` to `.env` and fill in the values.
7. Rules: Realtime Database → **Rules** tab → paste the contents of `database.rules.json` → **Publish** (or deploy them with the CLI, step 3 below).

## 2. Run locally

```bash
npm install
npm run dev
```

Open the printed URL. `npm run dev` uses `--host`, so you can also open the "Network" URL from a phone on the same Wi-Fi.
(Google sign-in on a LAN IP is blocked unless the IP is in Authorized domains, so for phone testing prefer the deployed site.)

## 3. Deploy to Firebase Hosting

```bash
npm install -g firebase-tools
firebase login
firebase use --add            # pick your project
npm run build
firebase deploy               # deploys hosting + database rules
```

`firebase.json` already rewrites all routes to `index.html`, so `/room/abc123` links work.

## 4. Test with two phones

1. Phone A: open the deployed site → **Continue with Google** → **Create Room** → tap **Tap to Join & Start Listening**.
2. Paste a YouTube link in the box → **Add**. It starts playing.
3. Tap **Share on WhatsApp** (or Copy) and open the link on Phone B. Sign in with a different Google account → tap **Tap to Join & Start Listening**.
4. Both phones should play the same second of the song. Pause/seek/skip on Phone A and watch Phone B follow.
5. Turn Wi-Fi off on Phone B for a few seconds → red banner → turn it back on → it re-syncs.
6. Close Phone A's tab → after ~8 s Phone B becomes host.

## Optional: search by song name

Pasting links works with no extra setup. For search-by-name, create a **YouTube Data API v3** key in Google Cloud Console, put it in `VITE_YOUTUBE_API_KEY`, and **restrict it** (HTTP referrers = your domain, API = YouTube Data API v3 only). Vite env vars end up in the public bundle, so the referrer restriction is what keeps the key safe. Search uses 100 quota units per query (10,000/day free).

## Security rules summary (`database.rules.json`)

- Only signed-in users can read rooms.
- Only the host can change playback, settings or the host.
- Guests can add songs only if the host allows it, and can only remove their own.
- Each user can only write their own presence entry.
- If the host's presence is gone, a guest can claim host (the rules check that).

## Known limits (browser/YouTube, not bugs)

- **Screen lock / background tab stops audio.** The YouTube iframe can't play in the background on mobile browsers. The app keeps the screen awake (Wake Lock) while you're in the room and resyncs when you come back.
- **Autoplay needs one tap.** That's the "Tap to Join" button. If a phone still blocks a later song, a green "Tap to start the music" button appears.
- **Some videos can't be embedded** (owner disabled it). The app rejects them when you add them, and the host auto-skips if one fails.
- **Google login inside in-app browsers** (Instagram, Facebook…) is blocked by Google. The login page warns users to open the link in Chrome/Safari.
- Sync accuracy is typically within ~1 s; buffering on a slow connection can add a moment before the drift correction kicks in.

## Project structure

```
src/
  main.jsx, App.jsx, AuthContext.jsx, firebase.js
  lib/        serverTime.js · youtube.js · utils.js
  pages/      Login.jsx · Home.jsx · Room.jsx
  components/ Player · NowPlaying · Queue · AddSong · Participants · ShareBar · Avatar · Icons · Splash
database.rules.json · firebase.json · .env.example
```
