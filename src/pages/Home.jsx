import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, serverTimestamp, set, get } from '../lib/db';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { parseRoomId, randomRoomId } from '../lib/utils';
import BrandHeader from '../components/BrandHeader';
import { Add } from '../components/Icons';
import QrScannerModal from '../components/QrScannerModal';
import PrivacyModal from '../components/PrivacyModal';
import AndroidAppModal from '../components/AndroidAppModal';
import { usePlayback } from '../context/PlaybackContext';

export default function Home() {
  const { user, signOut } = useAuth();
  const { online, reconnectToast, retryConnection, activeRoomId, playback, blocked, unlockAudio, joinRoom } = usePlayback() || {};
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [code, setCode] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showAndroid, setShowAndroid] = useState(false);
  const [roomAlert, setRoomAlert] = useState(() => {
    try {
      const endedMsg = sessionStorage.getItem('TT_ROOM_ENDED_NOTICE');
      if (endedMsg) {
        sessionStorage.removeItem('TT_ROOM_ENDED_NOTICE');
        return { type: 'ended', msg: endedMsg, icon: '🛑' };
      }
      const kickedMsg = sessionStorage.getItem('TT_KICKED_NOTICE');
      if (kickedMsg) {
        sessionStorage.removeItem('TT_KICKED_NOTICE');
        return { type: 'kicked', msg: kickedMsg, icon: '🛡️' };
      }
    } catch {}
    return null;
  });

  useEffect(() => {
    if (roomAlert) {
      const t = setTimeout(() => setRoomAlert(null), 6000);
      return () => clearTimeout(t);
    }
  }, [roomAlert]);

  async function createRoom() {
    setBusy(true);
    setError('');
    try {
      for (let i = 0; i < 3; i++) {
        const id = randomRoomId();
        try {
          await Promise.race([
            set(ref(db, `rooms/${id}`), {
              hostId: user.uid,
              allowGuestAdd: true,
              createdAt: serverTimestamp(),
              playback: { isPlaying: false, position: 0, updatedAt: serverTimestamp() },
            }),
            new Promise((_, reject) =>
              setTimeout(
                () =>
                  reject(
                    new Error(
                      'Realtime Database connection timed out. Please verify your Firebase configuration.'
                    )
                  ),
                7000
              )
            ),
          ]);
          joinRoom?.(id);
          nav(`/room/${id}`);
          return;
        } catch (e) {
          if (i === 2) throw e;
        }
      }
    } catch (err) {
      setError(
        err?.message ||
          'Could not create the room. Please check your Firebase Realtime Database setup and security rules.'
      );
    } finally {
      setBusy(false);
    }
  }

  async function join(e) {
    e.preventDefault();
    const id = parseRoomId(code);
    if (!id) {
      setError('Please paste a valid room link or code.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      // Check if room was closed by host before joining
      const [roomSnap, closedSnap] = await Promise.all([
        get(ref(db, `rooms/${id}`)).catch(() => null),
        get(ref(db, `closedRooms/${id}`)).catch(() => null),
      ]);
      const r = roomSnap?.val?.();
      const c = closedSnap?.val?.();
      if ((r && (r.ended || r.closed)) || (c && c.closed)) {
        setError('Room Closed: This room was closed by the host. 🔒');
        setBusy(false);
        return;
      }
      if (!roomSnap?.exists?.() && !c) {
        setError('Room not found. Please check the room code or link.');
        setBusy(false);
        return;
      }
    } catch {
      // Fallback to direct navigation if network precheck fails
    } finally {
      setBusy(false);
    }
    joinRoom?.(id);
    nav(`/room/${id}`);
  }

  return (
    <div className="min-h-[100dvh] max-w-md md:max-w-3xl lg:max-w-5xl xl:max-w-6xl mx-auto px-3.5 sm:px-6 lg:px-8 pt-2 pb-safe-player text-white font-sans">
      {/* Brand Header */}
      <BrandHeader user={user} onSignOut={signOut} showNav={true} />

      {/* Room Alert Notice Banner (Kicked or Ended) */}
      {roomAlert && (
        <div className="mt-3 rounded-2xl bg-gradient-to-r from-red-500/20 via-red-500/10 to-red-500/20 border border-red-500/30 text-red-200 text-xs p-3.5 flex items-center justify-between gap-3 shadow-lg animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-base shrink-0">{roomAlert.icon}</span>
            <div className="min-w-0">
              <p className="font-bold text-white text-xs truncate">{roomAlert.msg}</p>
              <p className="text-[10.5px] text-white/50">You can create your own room or explore songs below.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setRoomAlert(null)}
            className="text-white/40 hover:text-white text-sm px-1.5 py-0.5 rounded-full hover:bg-white/10 transition shrink-0"
          >
            ✕
          </button>
        </div>
      )}

      {/* Auto Reconnection Status Banner on Home */}
      {online === false && (
        <div className="mt-3 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-200 text-xs p-3 flex items-center justify-between gap-3 shadow-lg animate-pulse">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <span>Connection lost. Reconnecting…</span>
          </div>
          {retryConnection && (
            <button
              onClick={retryConnection}
              className="px-2.5 py-1 rounded-full bg-red-500/30 hover:bg-red-500/50 text-white font-bold text-[10px] transition active:scale-95"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {/* Reconnected confirmation */}
      {reconnectToast && (
        <div className="mt-3 rounded-2xl bg-green-500/20 border border-green-500/40 text-green-300 text-xs p-2.5 flex items-center gap-2 shadow-[0_0_12px_rgba(34,197,94,0.3)] animate-in fade-in duration-300">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-ping" />
          <span>{reconnectToast}</span>
        </div>
      )}

      {/* Persistent Active Room Recovery Card */}
      {activeRoomId && playback?.videoId && (
        <div className="mt-4 p-3.5 rounded-3xl bg-gradient-to-r from-[#0d2315] via-[#09170e] to-[#0d2315] border-2 border-green-500/60 shadow-[0_0_30px_rgba(34,197,94,0.3)] flex items-center justify-between gap-3 animate-in fade-in duration-300 ring-1 ring-white/10 max-w-xl mx-auto lg:mx-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative w-12 h-12 rounded-2xl overflow-hidden bg-black shrink-0 border border-green-400 shadow-md">
              <img src={playback.thumb || '/logo.png'} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-wider text-green-400">
                  Room · {activeRoomId}
                </span>
              </div>
              <h4 className="text-xs font-bold text-white truncate leading-tight mt-0.5">{playback.title || 'Music Playing'}</h4>
              <p className="text-[10px] text-white/50 truncate">Tap to re-enter listening session</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              unlockAudio?.();
              nav(`/room/${activeRoomId}`);
            }}
            className="px-3.5 py-2 rounded-full bg-green-500 text-black font-extrabold text-xs shrink-0 shadow-[0_0_15px_rgba(34,197,94,0.4)] hover:brightness-110 active:scale-95 transition"
          >
            Open Room ▶
          </button>
        </div>
      )}

      {/* Autoplay Audio Unlock Banner if browser suspended playback */}
      {blocked && activeRoomId && (
        <button
          type="button"
          onClick={unlockAudio}
          className="mt-3 w-full max-w-xl mx-auto py-3.5 px-4 rounded-full bg-gradient-to-r from-green-500 to-emerald-400 text-black font-extrabold text-xs flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(34,197,94,0.6)] animate-bounce active:scale-95 transition"
        >
          <span className="text-sm">▶</span>
          <span>Tap to resume playing music in sync!</span>
        </button>
      )}

      {/* Hero Section (Responsive: Mobile Single-Column, Desktop 2-Column Grid) */}
      <div className="mt-6 sm:mt-8 lg:mt-12 lg:grid lg:grid-cols-12 lg:gap-10 xl:gap-14 lg:items-center">
        {/* Left Column: Heading, Subtitle, and Room Actions */}
        <div className="lg:col-span-7 xl:col-span-7 text-center lg:text-left flex flex-col items-center lg:items-start">
          {/* Top Tagline Badge matching screenshot */}
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-green-500/10 border border-green-500/30 text-green-400 text-[11px] font-bold tracking-wider uppercase shadow-[0_0_12px_rgba(34,197,94,0.3)]">
            <span>★</span> ONE BEAT. ONE CONNECTION.
          </div>

          {/* Heading matching screenshot */}
          <h1 className="mt-4 sm:mt-5 text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.14]">
            Listen together,<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-emerald-400 to-green-300">
              in perfect sync.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-3.5 text-sm sm:text-base text-white/60 leading-relaxed max-w-sm lg:max-w-lg">
            Create a room, share the link on WhatsApp, and everyone hears the same YouTube song at the same moment, on any device.
          </p>

          <div className="w-full max-w-md mt-6 space-y-3.5">
            {/* Big Neon Green "Create a room" Button */}
            <button
              onClick={createRoom}
              disabled={busy}
              className="w-full py-4 rounded-full bg-green-500 text-black font-extrabold text-base flex items-center justify-center gap-2 shadow-[0_0_28px_rgba(34,197,94,0.6)] hover:brightness-110 active:scale-[0.98] transition disabled:opacity-50"
            >
              <Add size={22} className="stroke-[3]" />
              {busy ? 'Creating room…' : 'Create a room'}
            </button>

            {/* Join Room Form */}
            <form onSubmit={join} className="w-full flex items-center gap-2">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Paste room link or code"
                className="flex-1 min-w-0 bg-panel border border-white/10 rounded-full px-5 py-3 text-sm text-white outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 placeholder:text-white/35 transition"
              />
              <button
                type="submit"
                className="px-6 py-3 rounded-full bg-panel2 border border-white/10 font-bold text-sm text-white hover:bg-white/10 active:scale-95 transition shrink-0"
              >
                Join
              </button>
            </form>

            {/* Scan Room QR Code Button */}
            <button
              type="button"
              onClick={() => setShowScanner(true)}
              className="w-full py-3 rounded-full bg-gradient-to-r from-green-500/15 via-emerald-500/15 to-green-500/10 border border-green-500/30 text-green-400 font-extrabold text-xs flex items-center justify-center gap-2 hover:bg-green-500/25 active:scale-[0.98] transition shadow-[0_0_15px_rgba(34,197,94,0.15)]"
            >
              <span className="text-base">📷</span>
              <span>Scan Room QR Code to Join Instantly</span>
            </button>

            {error && <p className="mt-2 text-xs text-red-400 text-center lg:text-left">{error}</p>}
          </div>
        </div>

        {/* Right Column: Hero AirPods Neon Green HUD Preview */}
        <div className="lg:col-span-5 xl:col-span-5 mt-8 lg:mt-0 w-full max-w-sm sm:max-w-md mx-auto">
          <div className="relative w-full rounded-[28px] overflow-hidden bg-black border border-green-500/30 shadow-[0_0_35px_rgba(34,197,94,0.25)]">
            <div className="relative w-full aspect-[9/12] overflow-hidden">
              <img
                src="/airpods_green.jpg"
                alt="TuneTogether Earbuds"
                className="absolute inset-0 w-full h-full object-cover object-bottom"
              />

              {/* Ambient Glow Gradient */}
              <div className="absolute inset-0 bg-gradient-to-b from-[#052e16]/80 via-transparent to-black/85 pointer-events-none" />

              {/* Floating Neon Green HUD Player Capsule */}
              <div className="absolute top-[16%] left-4 right-4 z-20">
                <div className="neon-green-box rounded-[24px] bg-black/80 backdrop-blur-xl p-4 shadow-2xl">
                  {/* Row 1: Artwork + Title + Live badge */}
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white shrink-0 shadow-md">
                      <span className="text-xl">🎵</span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <span className="inline-block text-[10px] font-bold text-green-400 tracking-wider uppercase">
                        ● REAL-TIME SYNC
                      </span>
                      <h3 className="font-extrabold text-white text-base leading-tight truncate">TuneTogether Radio</h3>
                      <p className="text-xs text-white/50 truncate font-medium">Listen in sync with friends</p>
                    </div>
                  </div>

                  {/* Row 2: Progress Slider */}
                  <div className="mt-3">
                    <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full w-[65%]" />
                    </div>
                    <div className="flex justify-between text-[11px] font-semibold text-white/60 mt-1 tabular-nums px-0.5">
                      <span>2:05</span>
                      <span>-1:18</span>
                    </div>
                  </div>

                  {/* Row 3: Player Controls */}
                  <div className="mt-1 flex items-center justify-center gap-6">
                    <button className="text-white/70 hover:text-white transition">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
                      </svg>
                    </button>
                    <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-lg">
                      <div className="flex gap-1 items-center justify-center">
                        <div className="w-1 h-3.5 bg-black rounded-sm" />
                        <div className="w-1 h-3.5 bg-black rounded-sm" />
                      </div>
                    </div>
                    <button className="text-white/70 hover:text-white transition">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 1: HOW IT WORKS */}
      <section id="how-it-works" className="mt-16 sm:mt-20 scroll-mt-6">
        <div className="text-center">
          <p className="text-[11px] font-bold text-green-400 uppercase tracking-widest">HOW IT WORKS</p>
          <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Three taps to a shared playlist</h2>
        </div>

        <div className="mt-6 sm:mt-8 grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
          {/* Step 1 */}
          <div className="bg-panel border border-white/10 rounded-2xl p-4 sm:p-5 flex gap-3.5 items-start">
            <span className="w-7 h-7 rounded-full bg-green-500/20 text-green-400 font-extrabold text-sm flex items-center justify-center shrink-0 border border-green-500/30">
              1
            </span>
            <div>
              <h3 className="font-bold text-base text-white">Create a room</h3>
              <p className="text-xs text-white/55 mt-0.5 leading-relaxed">
                Start a room in one tap. You&apos;re the host and control what plays.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-panel border border-white/10 rounded-2xl p-4 sm:p-5 flex gap-3.5 items-start">
            <span className="w-7 h-7 rounded-full bg-green-500/20 text-green-400 font-extrabold text-sm flex items-center justify-center shrink-0 border border-green-500/30">
              2
            </span>
            <div>
              <h3 className="font-bold text-base text-white">Share the link</h3>
              <p className="text-xs text-white/55 mt-0.5 leading-relaxed">
                Send it on WhatsApp or anywhere else. Friends join straight from the browser.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-panel border border-white/10 rounded-2xl p-4 sm:p-5 flex gap-3.5 items-start">
            <span className="w-7 h-7 rounded-full bg-green-500/20 text-green-400 font-extrabold text-sm flex items-center justify-center shrink-0 border border-green-500/30">
              3
            </span>
            <div>
              <h3 className="font-bold text-base text-white">Add songs, press play</h3>
              <p className="text-xs text-white/55 mt-0.5 leading-relaxed">
                Paste any YouTube song or search by title. Everyone hears it at the same moment.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: WHY TUNETOGETHER */}
      <section className="mt-16 sm:mt-20">
        <div className="text-center">
          <p className="text-[11px] font-bold text-green-400 uppercase tracking-widest">WHY TUNETOGETHER</p>
          <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Built for listening with friends</h2>
        </div>

        <div className="mt-6 sm:mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          {/* Feature 1 */}
          <div className="bg-panel border border-white/10 rounded-2xl p-4 sm:p-5">
            <span className="text-lg">🔄</span>
            <h3 className="font-bold text-base text-white mt-1.5">Always in sync</h3>
            <p className="text-xs text-white/55 mt-0.5 leading-relaxed">
              Play, pause, and skip stay matched for everyone in the room with sub-second accuracy.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-panel border border-white/10 rounded-2xl p-4 sm:p-5">
            <span className="text-lg">🎵</span>
            <h3 className="font-bold text-base text-white mt-1.5">Shared queue</h3>
            <p className="text-xs text-white/55 mt-0.5 leading-relaxed">
              Everyone adds songs, so the playlist reflects the whole group.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-panel border border-white/10 rounded-2xl p-4 sm:p-5">
            <span className="text-lg">📱</span>
            <h3 className="font-bold text-base text-white mt-1.5">Any device</h3>
            <p className="text-xs text-white/55 mt-0.5 leading-relaxed">
              Phone, laptop, or tablet. No app to install, just open the link in any browser.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="bg-panel border border-white/10 rounded-2xl p-4 sm:p-5">
            <span className="text-lg">🛡️</span>
            <h3 className="font-bold text-base text-white mt-1.5">Host controls</h3>
            <p className="text-xs text-white/55 mt-0.5 leading-relaxed">
              The host keeps the room tidy and decides who can add or change songs.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION: GOOGLE SEO & FAQ (Frequently Asked Questions) */}
      <section className="mt-16 sm:mt-20">
        <div className="text-center">
          <p className="text-[11px] font-bold text-green-400 uppercase tracking-widest">
            FREQUENTLY ASKED QUESTIONS
          </p>
          <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            The Easiest Way to Listen Together
          </h2>
          <p className="mt-2 text-xs text-white/60 max-w-sm sm:max-w-md mx-auto">
            Listen to YouTube music in perfect real-time sync across multiple devices — no Bluetooth or extra apps required.
          </p>
        </div>

        <div className="mt-6 sm:mt-8 grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
          {/* FAQ 1 */}
          <div className="bg-panel/80 border border-white/10 rounded-2xl p-4 sm:p-5 shadow-sm">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <span className="text-green-400 font-extrabold">Q.</span> Can I listen to music together with friends on different phones?
            </h3>
            <p className="text-xs text-white/65 mt-2 leading-relaxed">
              Yes! Simply click <strong>"Create a room"</strong> on TuneTogether and share your room link or QR code with friends. The same song will play across all connected phones and computers at the exact same millisecond with zero delay.
            </p>
          </div>

          {/* FAQ 2 */}
          <div className="bg-panel/80 border border-white/10 rounded-2xl p-4 sm:p-5 shadow-sm">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <span className="text-green-400 font-extrabold">Q.</span> Do my friends need to install any app to listen?
            </h3>
            <p className="text-xs text-white/65 mt-2 leading-relaxed">
              No app required! TuneTogether runs entirely in any web browser (Chrome, Safari, Firefox). Anyone can join instantly on Android, iPhone, Windows, or Mac without downloading anything.
            </p>
          </div>

          {/* FAQ 3 */}
          <div className="bg-panel/80 border border-white/10 rounded-2xl p-4 sm:p-5">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <span className="text-green-400 font-extrabold">Q.</span> How do I play the same song on multiple devices at the same time?
            </h3>
            <p className="text-xs text-white/65 mt-2 leading-relaxed">
              Click <strong>"Create a room"</strong> on TuneTogether to start your room. Share your room link or QR code with friends. The same song will play across all connected phones and computers at the exact same millisecond with zero delay.
            </p>
          </div>

          {/* FAQ 4 */}
          <div className="bg-panel/80 border border-white/10 rounded-2xl p-4 sm:p-5">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <span className="text-green-400 font-extrabold">Q.</span> If the host pauses or plays, does it sync for everyone?
            </h3>
            <p className="text-xs text-white/65 mt-2 leading-relaxed">
              Yes! Whenever the host pauses (turns off) the song, playback stops instantly across all devices. When the host plays or seeks, every device resumes in perfect sync automatically.
            </p>
          </div>

          {/* FAQ 5 */}
          <div className="bg-panel/80 border border-white/10 rounded-2xl p-4 sm:p-5 md:col-span-2">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <span className="text-green-400 font-extrabold">Q.</span> How do I join and listen by scanning a QR code?
            </h3>
            <p className="text-xs text-white/65 mt-2 leading-relaxed">
              Tap <strong>"Scan Room QR Code"</strong> on the home screen and point your camera at the host's QR code. You'll jump straight into the room without typing room codes or links.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 3: BOTTOM CALL TO ACTION */}
      <section className="mt-16 sm:mt-20 rounded-[28px] bg-gradient-to-b from-[#0b1f13] to-panel border border-green-500/30 p-6 sm:p-8 text-center shadow-[0_0_30px_rgba(34,197,94,0.2)] max-w-2xl mx-auto">
        <h2 className="text-2xl font-extrabold text-white tracking-tight leading-tight">
          Your next listening party starts here
        </h2>
        <p className="text-xs text-white/60 mt-1.5">One room. One song. Everyone together.</p>
        <button
          onClick={createRoom}
          disabled={busy}
          className="mt-6 w-full py-3.5 rounded-full bg-green-500 text-black font-extrabold text-sm flex items-center justify-center gap-2 shadow-[0_0_22px_rgba(34,197,94,0.5)] hover:brightness-110 active:scale-95 transition"
        >
          <Add size={20} className="stroke-[3]" />
          {busy ? 'Creating…' : 'Create a room'}
        </button>
      </section>

      {/* Footer */}
      <footer className="mt-16 text-center border-t border-white/5 pt-6 flex flex-col items-center">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="" className="w-5 h-5 rounded-full" />
          <span className="font-bold text-sm tracking-tight">
            Tune<span className="text-green-400">Together</span>
          </span>
        </div>
        <p className="text-[11px] text-white/40 mt-1.5">© 2026 TuneTogether. One Beat, One Connection.</p>

        {/* Footer Quick Action Links */}
        <div className="mt-3 flex items-center justify-center gap-3 text-xs text-white/45">
          <button
            type="button"
            onClick={() => setShowPrivacy(true)}
            className="hover:text-green-400 transition"
          >
            🔒 Privacy Policy
          </button>
          <span>·</span>
          <button
            type="button"
            onClick={() => setShowAndroid(true)}
            className="hover:text-green-400 transition"
          >
            📲 Android App &amp; TWA
          </button>
        </div>
      </footer>

      {/* QR Code Camera Scanner Modal */}
      {showScanner && (
        <QrScannerModal
          onClose={() => setShowScanner(false)}
          onScanSuccess={(scannedRoomId) => {
            setShowScanner(false);
            nav(`/room/${scannedRoomId}`);
          }}
        />
      )}

      {/* Privacy Policy Modal */}
      {showPrivacy && (
        <PrivacyModal onClose={() => setShowPrivacy(false)} />
      )}

      {/* Android App & TWA Modal */}
      {showAndroid && (
        <AndroidAppModal onClose={() => setShowAndroid(false)} />
      )}
    </div>
  );
}
