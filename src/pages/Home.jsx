import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, serverTimestamp, set } from '../lib/db';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { parseRoomId, randomRoomId } from '../lib/utils';
import BrandHeader from '../components/BrandHeader';
import { Add } from '../components/Icons';
import QrScannerModal from '../components/QrScannerModal';

export default function Home() {
  const { user, signOut } = useAuth();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [code, setCode] = useState('');
  const [showScanner, setShowScanner] = useState(false);

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

  function join(e) {
    e.preventDefault();
    const id = parseRoomId(code);
    if (!id) {
      setError('Please paste a valid room link or code.');
      return;
    }
    nav(`/room/${id}`);
  }

  return (
    <div className="min-h-[100dvh] max-w-md mx-auto px-5 pt-2 pb-28 text-white font-sans">
      {/* Brand Header */}
      <BrandHeader user={user} onSignOut={signOut} showNav={true} />

      {/* Hero Section */}
      <div className="mt-8 text-center flex flex-col items-center">
        {/* Top Tagline Badge matching screenshot */}
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-green-500/10 border border-green-500/30 text-green-400 text-[11px] font-bold tracking-wider uppercase shadow-[0_0_12px_rgba(34,197,94,0.3)]">
          <span>★</span> ONE BEAT. ONE CONNECTION.
        </div>

        {/* Heading matching screenshot */}
        <h1 className="mt-5 text-3xl sm:text-4xl font-extrabold tracking-tight leading-[1.15]">
          Listen together,<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-emerald-400 to-green-300">
            in perfect sync.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mt-3.5 text-sm text-white/60 leading-relaxed max-w-xs">
          Create a room, share the link on WhatsApp, and everyone hears the same YouTube song at the same moment, on any device.
        </p>

        {/* Big Neon Green "Create a room" Button */}
        <button
          onClick={createRoom}
          disabled={busy}
          className="mt-6 w-full py-4 rounded-full bg-green-500 text-black font-extrabold text-base flex items-center justify-center gap-2 shadow-[0_0_28px_rgba(34,197,94,0.6)] hover:brightness-110 active:scale-[0.98] transition disabled:opacity-50"
        >
          <Add size={22} className="stroke-[3]" />
          {busy ? 'Creating room…' : 'Create a room'}
        </button>

        {/* Join Room Form */}
        <form onSubmit={join} className="mt-3.5 w-full flex items-center gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Paste room link or code"
            className="flex-1 min-w-0 bg-panel border border-white/10 rounded-full px-5 py-3 text-sm text-white outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 placeholder:text-white/35 transition"
          />
          <button
            type="submit"
            className="px-6 py-3 rounded-full bg-panel2 border border-white/10 font-bold text-sm text-white hover:bg-white/10 active:scale-95 transition"
          >
            Join
          </button>
        </form>

        {/* Scan Room QR Code Button */}
        <button
          type="button"
          onClick={() => setShowScanner(true)}
          className="mt-3 w-full py-3 rounded-full bg-gradient-to-r from-green-500/15 via-emerald-500/15 to-green-500/10 border border-green-500/30 text-green-400 font-extrabold text-xs flex items-center justify-center gap-2 hover:bg-green-500/25 active:scale-[0.98] transition shadow-[0_0_15px_rgba(34,197,94,0.15)]"
        >
          <span className="text-base">📷</span>
          <span>Scan Room QR Code to Join Instantly</span>
        </button>

        {error && <p className="mt-3 text-xs text-red-400 text-center">{error}</p>}
      </div>

      {/* Hero AirPods Neon Green HUD Preview matching reference image */}
      <div className="relative mt-10 w-full rounded-[28px] overflow-hidden bg-black border border-green-500/30 shadow-[0_0_35px_rgba(34,197,94,0.25)]">
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

      {/* SECTION 1: HOW IT WORKS */}
      <section id="how-it-works" className="mt-16 scroll-mt-6">
        <div className="text-center">
          <p className="text-[11px] font-bold text-green-400 uppercase tracking-widest">HOW IT WORKS</p>
          <h2 className="mt-1 text-2xl font-extrabold text-white tracking-tight">Three taps to a shared playlist</h2>
        </div>

        <div className="mt-6 space-y-3">
          {/* Step 1 */}
          <div className="bg-panel border border-white/10 rounded-2xl p-4 flex gap-3.5 items-start">
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
          <div className="bg-panel border border-white/10 rounded-2xl p-4 flex gap-3.5 items-start">
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
          <div className="bg-panel border border-white/10 rounded-2xl p-4 flex gap-3.5 items-start">
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
      <section className="mt-16">
        <div className="text-center">
          <p className="text-[11px] font-bold text-green-400 uppercase tracking-widest">WHY TUNETOGETHER</p>
          <h2 className="mt-1 text-2xl font-extrabold text-white tracking-tight">Built for listening with friends</h2>
        </div>

        <div className="mt-6 space-y-3">
          {/* Feature 1 */}
          <div className="bg-panel border border-white/10 rounded-2xl p-4">
            <span className="text-lg">🔄</span>
            <h3 className="font-bold text-base text-white mt-1.5">Always in sync</h3>
            <p className="text-xs text-white/55 mt-0.5 leading-relaxed">
              Play, pause, and skip stay matched for everyone in the room with sub-second accuracy.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-panel border border-white/10 rounded-2xl p-4">
            <span className="text-lg">🎵</span>
            <h3 className="font-bold text-base text-white mt-1.5">Shared queue</h3>
            <p className="text-xs text-white/55 mt-0.5 leading-relaxed">
              Everyone adds songs, so the playlist reflects the whole group.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-panel border border-white/10 rounded-2xl p-4">
            <span className="text-lg">📱</span>
            <h3 className="font-bold text-base text-white mt-1.5">Any device</h3>
            <p className="text-xs text-white/55 mt-0.5 leading-relaxed">
              Phone, laptop, or tablet. No app to install, just open the link in any browser.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="bg-panel border border-white/10 rounded-2xl p-4">
            <span className="text-lg">🛡️</span>
            <h3 className="font-bold text-base text-white mt-1.5">Host controls</h3>
            <p className="text-xs text-white/55 mt-0.5 leading-relaxed">
              The host keeps the room tidy and decides who can add or change songs.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION: GOOGLE SEO & FAQ (Frequently Asked Questions) */}
      <section className="mt-16">
        <div className="text-center">
          <p className="text-[11px] font-bold text-green-400 uppercase tracking-widest">
            FREQUENTLY ASKED QUESTIONS
          </p>
          <h2 className="mt-1 text-2xl font-extrabold text-white tracking-tight">
            The Easiest Way to Listen Together
          </h2>
          <p className="mt-2 text-xs text-white/60 max-w-sm mx-auto">
            Listen to YouTube music in perfect real-time sync across multiple devices — no Bluetooth or extra apps required.
          </p>
        </div>

        <div className="mt-6 space-y-3">
          {/* FAQ 1 */}
          <div className="bg-panel/80 border border-white/10 rounded-2xl p-4">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <span className="text-green-400 font-extrabold">Q.</span> How do I play the same song on multiple devices at the same time?
            </h3>
            <p className="text-xs text-white/65 mt-2 leading-relaxed">
              Click <strong>"Create a room"</strong> on TuneTogether to start your room. Share your room link or QR code with friends. The same song will play across all connected phones and computers at the exact same millisecond with zero delay.
            </p>
          </div>

          {/* FAQ 2 */}
          <div className="bg-panel/80 border border-white/10 rounded-2xl p-4">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <span className="text-green-400 font-extrabold">Q.</span> If the host pauses or plays, does it sync for everyone?
            </h3>
            <p className="text-xs text-white/65 mt-2 leading-relaxed">
              Yes! Whenever the host pauses (turns off) the song, playback stops instantly across all devices. When the host plays or seeks, every device resumes in perfect sync automatically.
            </p>
          </div>

          {/* FAQ 3 */}
          <div className="bg-panel/80 border border-white/10 rounded-2xl p-4">
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
      <section className="mt-16 rounded-[28px] bg-gradient-to-b from-[#0b1f13] to-panel border border-green-500/30 p-6 text-center shadow-[0_0_30px_rgba(34,197,94,0.2)]">
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
    </div>
  );
}
