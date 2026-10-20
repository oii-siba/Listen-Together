import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, serverTimestamp, set, get } from '../lib/db';
import { db, auth } from '../firebase';
import { useAuth } from '../AuthContext';
import { parseRoomId, randomRoomId } from '../lib/utils';
import BrandHeader from '../components/BrandHeader';
import { Add, Play } from '../components/Icons';
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

  const createRoomRef = useRef();

  async function createRoom() {
    if (busy) return;
    setBusy(true);
    setError('');
    const id = randomRoomId();
    const uid = user?.uid || auth?.currentUser?.uid || 'guest-' + Math.random().toString(36).slice(2, 8);

    const roomPayload = {
      hostId: uid,
      allowGuestAdd: true,
      createdAt: serverTimestamp(),
      playback: { isPlaying: false, position: 0, updatedAt: serverTimestamp() },
    };

    // Optimistically prime playback context with room data to ensure zero latency
    joinRoom?.(id, roomPayload);

    try {
      await Promise.race([
        set(ref(db, `rooms/${id}`), roomPayload),
        new Promise((resolve) => setTimeout(resolve, 2000)),
      ]);
      nav(`/room/${id}`);
    } catch (err) {
      console.warn('Room write network fallback, navigating to room:', err);
      nav(`/room/${id}`);
    } finally {
      setBusy(false);
    }
  }

  createRoomRef.current = createRoom;

  // Global event listener to trigger room creation from MenuBar or BottomNav
  useEffect(() => {
    const handleCreate = () => {
      createRoomRef.current?.();
    };
    window.addEventListener('tt-create-room', handleCreate);
    return () => window.removeEventListener('tt-create-room', handleCreate);
  }, []);

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
    <div className="min-h-[100dvh] max-w-md md:max-w-3xl lg:max-w-5xl xl:max-w-6xl mx-auto px-3.5 sm:px-6 lg:px-8 pt-2 pb-safe-player text-[#F5F7F5] font-sans">
      {/* Top Navigation */}
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
        <div className="mt-3 rounded-2xl bg-[#00FF87]/20 border border-[#00FF87]/40 text-[#00FF87] text-xs p-2.5 flex items-center gap-2 shadow-[0_0_12px_rgba(0,255,135,0.3)] animate-in fade-in duration-300">
          <span className="w-2 h-2 rounded-full bg-[#00FF87] animate-ping" />
          <span>{reconnectToast}</span>
        </div>
      )}

      {/* Section 4.E: Persistent Active Room Recovery Card ("Now Playing Together") */}
      {activeRoomId && playback?.videoId && (
        <div className="mt-4 p-4 sm:p-5 rounded-[28px] glass-card border border-[#00FF87]/40 shadow-[0_0_35px_rgba(0,255,135,0.25)] flex items-center justify-between gap-4 animate-in fade-in duration-300 ring-1 ring-white/10 max-w-xl mx-auto lg:mx-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-black shrink-0 border border-[#00FF87] shadow-[0_0_16px_rgba(0,255,135,0.35)]">
              <img src={playback.thumb || '/logo.png'} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#00FF87] animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-wider text-[#00FF87]">
                  NOW PLAYING TOGETHER · {activeRoomId}
                </span>
              </div>
              <h4 className="text-sm font-bold text-white truncate leading-tight mt-1">{playback.title || 'Music Playing'}</h4>
              <p className="text-[11px] text-[#9AA59F] truncate mt-0.5">Tap to re-enter listening session</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              unlockAudio?.();
              nav(`/room/${activeRoomId}`);
            }}
            className="px-4 py-2.5 rounded-full neon-green-btn text-[#020403] font-black text-xs shrink-0 shadow-lg active:scale-95 transition"
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
          className="mt-3 w-full max-w-xl mx-auto py-3.5 px-4 rounded-full neon-green-btn text-[#020403] font-black text-xs flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(0,255,135,0.6)] animate-bounce active:scale-95 transition"
        >
          <span className="text-sm">▶</span>
          <span>Tap to resume playing music in sync!</span>
        </button>
      )}

      {/* SECTION 4.B & 4.C: Hero Section with Cinematic Earbuds Centerpiece */}
      <div className="mt-6 sm:mt-8 lg:mt-12 lg:grid lg:grid-cols-12 lg:gap-10 xl:gap-14 lg:items-center">
        {/* Left Column: Headline, Subtitle, and Create/Join Room Glass Card */}
        <div className="lg:col-span-7 xl:col-span-7 text-center lg:text-left flex flex-col items-center lg:items-start">
          {/* Top Tagline Badge */}
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#00FF87]/10 border border-[#00FF87]/30 text-[#00FF87] text-[11px] font-bold tracking-wider uppercase shadow-[0_0_14px_rgba(0,255,135,0.25)]">
            <span>★</span> ONE BEAT. ONE CONNECTION.
          </div>

          {/* Main Headline */}
          <h1 className="mt-4 sm:mt-5 text-3xl sm:text-4xl lg:text-5xl xl:text-[54px] font-black tracking-tight leading-[1.12]">
            Listen together,<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00FF87] via-[#4ade80] to-[#00C96B] neon-text-glow">
              in perfect sync.
            </span>
          </h1>

          {/* Supporting Text */}
          <p className="mt-3.5 text-sm sm:text-base text-[#9AA59F] leading-relaxed max-w-sm lg:max-w-lg">
            Create a room, invite your friends and enjoy music together in real time. Zero latency audio across every device.
          </p>

          {/* SECTION 4.D: Create/Join Room Glassmorphism Card */}
          <div className="w-full max-w-md mt-6 glass-card rounded-[32px] p-5 sm:p-6 border border-white/10 shadow-2xl relative overflow-hidden text-left">
            {/* Real-time sync status header */}
            <div className="flex items-center justify-between mb-3.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#00FF87]/15 border border-[#00FF87]/35 text-[#00FF87] text-[10.5px] font-extrabold tracking-wider uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00FF87] animate-pulse" />
                <span>REAL-TIME SYNC • ACTIVE</span>
              </div>
              <span className="text-[11px] text-[#9AA59F] font-medium hidden xs:inline">Zero Delay Audio</span>
            </div>

            <h2 className="text-base sm:text-lg font-extrabold text-[#F5F7F5] tracking-tight">
              Start a listening session
            </h2>
            <p className="text-xs text-[#9AA59F] mt-0.5 leading-relaxed">
              Create your room in one tap or paste a link from a friend.
            </p>

            {/* Primary Action: Big Neon Green "Create a room" Button */}
            <button
              id="create-room-btn"
              onClick={createRoom}
              disabled={busy}
              className="mt-4 w-full py-3.5 sm:py-4 rounded-full neon-green-btn text-[#020403] font-black text-sm sm:text-base flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-50 cursor-pointer"
            >
              <Add size={20} className="stroke-[3]" />
              <span>{busy ? 'Creating room…' : 'Create a Room'}</span>
            </button>

            {/* Secondary Action: Join Room Form */}
            <form onSubmit={join} className="mt-3 w-full flex items-center gap-2">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Paste room link or code"
                className="flex-1 min-w-0 bg-[#0A100D] border border-white/10 rounded-full px-4 sm:px-5 py-3 text-xs sm:text-sm text-white outline-none focus:border-[#00FF87] focus:ring-1 focus:ring-[#00FF87] placeholder:text-[#9AA59F]/40 transition"
              />
              <button
                type="submit"
                disabled={busy || !code.trim()}
                className="px-5 sm:px-6 py-3 rounded-full bg-[#101814] border border-white/15 hover:border-[#00FF87]/40 font-bold text-xs sm:text-sm text-[#F5F7F5] hover:text-white active:scale-95 transition shrink-0 disabled:opacity-40"
              >
                Join
              </button>
            </form>

            {/* Scan Room QR Code Button */}
            <button
              type="button"
              onClick={() => setShowScanner(true)}
              className="mt-2.5 w-full py-2.5 rounded-full bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 hover:border-[#00FF87]/30 text-[#9AA59F] hover:text-[#00FF87] text-[11px] sm:text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition"
            >
              <span className="text-sm">📷</span>
              <span>Scan Room QR Code</span>
            </button>

            {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
          </div>
        </div>

        {/* SECTION 4.C: Right Column — Cinematic Wireless Earbud Charging Case Centerpiece */}
        <div className="lg:col-span-5 xl:col-span-5 mt-8 lg:mt-0 w-full max-w-sm sm:max-w-md mx-auto">
          <div className="relative w-full rounded-[36px] overflow-hidden bg-black border border-white/15 shadow-[0_0_50px_rgba(0,0,0,0.95),0_0_35px_rgba(0,255,135,0.22)]">
            {/* Top Status Indicators */}
            <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/80 border border-[#00FF87]/40 text-[#00FF87] text-[10px] font-extrabold tracking-wider backdrop-blur-md shadow-lg">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00FF87] animate-pulse" />
                LOSSLESS AUDIO
              </span>
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/70 border border-white/10 text-[10px] font-semibold text-[#9AA59F] backdrop-blur-md">
                <span>🎧 SMART CASE</span>
              </div>
            </div>

            {/* Centerpiece Image of Luxury Charging Case */}
            <div className="relative w-full aspect-[9/14] overflow-hidden bg-black">
              <img
                src="/earbuds_case.png"
                alt="TuneTogether Wireless Earbud Player"
                className="absolute inset-0 w-full h-full object-cover object-center select-none"
              />

              {/* Ambient Vignette Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/50 pointer-events-none" />

              {/* Interactive Luminous Screen Overlay on Case Lid */}
              {activeRoomId && playback?.videoId ? (
                /* Dynamic overlay when room audio is active */
                <div className="absolute top-[38%] left-[16%] right-[16%] h-[16%] z-20 flex flex-col justify-between p-2 rounded-2xl bg-black/90 border border-[#00FF87]/60 shadow-[0_0_20px_rgba(0,255,135,0.35)] backdrop-blur-md">
                  <div className="flex items-center gap-2 min-w-0">
                    <img
                      src={playback.thumb || '/logo.png'}
                      alt=""
                      className="w-8 h-8 rounded-lg object-cover border border-[#00FF87]/40 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-extrabold text-white truncate leading-tight">
                        {playback.title}
                      </p>
                      <p className="text-[9px] text-[#00FF87] font-semibold truncate">
                        Room · {activeRoomId} (Live)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[8px] text-white/60">
                    <span>In perfect sync</span>
                    <button
                      type="button"
                      onClick={() => nav(`/room/${activeRoomId}`)}
                      className="text-[#00FF87] font-bold underline hover:brightness-110"
                    >
                      Open Room ▶
                    </button>
                  </div>
                </div>
              ) : (
                /* Clickable play showcase overlay matching reference image */
                <div
                  onClick={createRoom}
                  className="absolute top-[37%] left-[15%] right-[15%] h-[17%] z-20 cursor-pointer group rounded-2xl flex items-center justify-center transition-all hover:bg-[#00FF87]/5"
                  title="Click to start a room"
                >
                  <div className="w-10 h-10 rounded-full bg-white/10 group-hover:bg-[#00FF87] text-white group-hover:text-black flex items-center justify-center shadow-lg border border-white/20 group-hover:border-[#00FF87] transition-all transform group-hover:scale-110">
                    <Play size={18} className="translate-x-0.5 fill-current" />
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Audio Status Footer */}
            <div className="p-4 bg-gradient-to-b from-transparent to-[#0A100D]/95 border-t border-white/10 flex items-center justify-between text-xs text-[#9AA59F]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#00FF87] shadow-[0_0_8px_rgba(0,255,135,0.8)] animate-pulse" />
                <span className="font-semibold text-white/80">Spatial Sound Engine</span>
              </div>
              <span className="text-[11px] font-mono text-[#00FF87]">0.0ms Latency</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 1: HOW IT WORKS */}
      <section id="how-it-works" className="mt-16 sm:mt-24 scroll-mt-6">
        <div className="text-center">
          <p className="text-[11px] font-extrabold text-[#00FF87] uppercase tracking-widest">HOW IT WORKS</p>
          <h2 className="mt-1 text-2xl sm:text-3xl lg:text-4xl font-black text-[#F5F7F5] tracking-tight">
            Three taps to a shared playlist
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-[#9AA59F] max-w-sm sm:max-w-md mx-auto">
            Everything runs in your browser without requiring extra software or complicated setup.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          {/* Step 1 */}
          <div className="glass-card glass-card-hover rounded-[26px] p-5 sm:p-6 flex gap-4 items-start border border-white/10">
            <span className="w-9 h-9 rounded-2xl bg-[#00FF87]/15 text-[#00FF87] font-black text-sm flex items-center justify-center shrink-0 border border-[#00FF87]/30 shadow-[0_0_12px_rgba(0,255,135,0.25)]">
              1
            </span>
            <div>
              <h3 className="font-bold text-base text-[#F5F7F5]">Create a room</h3>
              <p className="text-xs text-[#9AA59F] mt-1 leading-relaxed">
                Start a room in one tap. You&apos;re the host with complete master playback and queue controls.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="glass-card glass-card-hover rounded-[26px] p-5 sm:p-6 flex gap-4 items-start border border-white/10">
            <span className="w-9 h-9 rounded-2xl bg-[#00FF87]/15 text-[#00FF87] font-black text-sm flex items-center justify-center shrink-0 border border-[#00FF87]/30 shadow-[0_0_12px_rgba(0,255,135,0.25)]">
              2
            </span>
            <div>
              <h3 className="font-bold text-base text-[#F5F7F5]">Share link or QR</h3>
              <p className="text-xs text-[#9AA59F] mt-1 leading-relaxed">
                Send it on WhatsApp, Telegram, or show the QR code. Friends join instantly with zero app download.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="glass-card glass-card-hover rounded-[26px] p-5 sm:p-6 flex gap-4 items-start border border-white/10">
            <span className="w-9 h-9 rounded-2xl bg-[#00FF87]/15 text-[#00FF87] font-black text-sm flex items-center justify-center shrink-0 border border-[#00FF87]/30 shadow-[0_0_12px_rgba(0,255,135,0.25)]">
              3
            </span>
            <div>
              <h3 className="font-bold text-base text-[#F5F7F5]">Listen in perfect sync</h3>
              <p className="text-xs text-[#9AA59F] mt-1 leading-relaxed">
                Search or paste any YouTube music track. Everyone hears every beat together at the exact same millisecond.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: WHY TUNETOGETHER */}
      <section className="mt-16 sm:mt-24">
        <div className="text-center">
          <p className="text-[11px] font-extrabold text-[#00FF87] uppercase tracking-widest">WHY TUNETOGETHER</p>
          <h2 className="mt-1 text-2xl sm:text-3xl lg:text-4xl font-black text-[#F5F7F5] tracking-tight">
            Built for listening with friends
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-[#9AA59F] max-w-sm sm:max-w-md mx-auto">
            Engineered for high fidelity audio synchronization across distances.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {/* Feature 1 */}
          <div className="glass-card glass-card-hover rounded-[24px] p-5 border border-white/10">
            <div className="w-10 h-10 rounded-xl bg-[#00FF87]/15 border border-[#00FF87]/30 flex items-center justify-center text-lg text-[#00FF87] shadow-[0_0_12px_rgba(0,255,135,0.2)]">
              🔄
            </div>
            <h3 className="font-bold text-base text-[#F5F7F5] mt-3">Always in sync</h3>
            <p className="text-xs text-[#9AA59F] mt-1 leading-relaxed">
              Play, pause, seek, and track transitions stay matched across all connected devices with sub-second precision.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="glass-card glass-card-hover rounded-[24px] p-5 border border-white/10">
            <div className="w-10 h-10 rounded-xl bg-[#00FF87]/15 border border-[#00FF87]/30 flex items-center justify-center text-lg text-[#00FF87] shadow-[0_0_12px_rgba(0,255,135,0.2)]">
              🎵
            </div>
            <h3 className="font-bold text-base text-[#F5F7F5] mt-3">Shared queue</h3>
            <p className="text-xs text-[#9AA59F] mt-1 leading-relaxed">
              Everyone in the room can search YouTube and add songs to the collaborative shared queue.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="glass-card glass-card-hover rounded-[24px] p-5 border border-white/10">
            <div className="w-10 h-10 rounded-xl bg-[#00FF87]/15 border border-[#00FF87]/30 flex items-center justify-center text-lg text-[#00FF87] shadow-[0_0_12px_rgba(0,255,135,0.2)]">
              📱
            </div>
            <h3 className="font-bold text-base text-[#F5F7F5] mt-3">Cross platform</h3>
            <p className="text-xs text-[#9AA59F] mt-1 leading-relaxed">
              Android, iPhone, iPad, Windows, or Mac. Runs directly in Chrome, Safari, or as an installable PWA.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="glass-card glass-card-hover rounded-[24px] p-5 border border-white/10">
            <div className="w-10 h-10 rounded-xl bg-[#00FF87]/15 border border-[#00FF87]/30 flex items-center justify-center text-lg text-[#00FF87] shadow-[0_0_12px_rgba(0,255,135,0.2)]">
              🛡️
            </div>
            <h3 className="font-bold text-base text-[#F5F7F5] mt-3">Host controls</h3>
            <p className="text-xs text-[#9AA59F] mt-1 leading-relaxed">
              The host maintains full control over playback, room access PINs, permissions, and participants.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION: GOOGLE SEO & FAQ */}
      <section className="mt-16 sm:mt-24">
        <div className="text-center">
          <p className="text-[11px] font-extrabold text-[#00FF87] uppercase tracking-widest">
            FREQUENTLY ASKED QUESTIONS
          </p>
          <h2 className="mt-1 text-2xl sm:text-3xl lg:text-4xl font-black text-[#F5F7F5] tracking-tight">
            The Easiest Way to Listen Together
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-[#9AA59F] max-w-sm sm:max-w-md mx-auto">
            Listen to YouTube music in perfect real-time sync across multiple devices — zero delay, no Bluetooth needed.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {/* FAQ 1 */}
          <div className="glass-card rounded-[24px] p-5 border border-white/10">
            <h3 className="font-bold text-sm text-[#F5F7F5] flex items-center gap-2">
              <span className="text-[#00FF87] font-black">Q.</span> Can I listen to music together with friends on different phones?
            </h3>
            <p className="text-xs text-[#9AA59F] mt-2 leading-relaxed">
              Yes! Simply click <strong>"Create a Room"</strong> on TuneTogether and share your room link or QR code with friends. The same song will play across all connected phones and computers at the exact same millisecond with zero delay.
            </p>
          </div>

          {/* FAQ 2 */}
          <div className="glass-card rounded-[24px] p-5 border border-white/10">
            <h3 className="font-bold text-sm text-[#F5F7F5] flex items-center gap-2">
              <span className="text-[#00FF87] font-black">Q.</span> Do my friends need to install any app to listen?
            </h3>
            <p className="text-xs text-[#9AA59F] mt-2 leading-relaxed">
              No app required! TuneTogether runs entirely in any web browser (Chrome, Safari, Firefox). Anyone can join instantly on Android, iPhone, Windows, or Mac without downloading anything.
            </p>
          </div>

          {/* FAQ 3 */}
          <div className="glass-card rounded-[24px] p-5 border border-white/10">
            <h3 className="font-bold text-sm text-[#F5F7F5] flex items-center gap-2">
              <span className="text-[#00FF87] font-black">Q.</span> How do I play the same song on multiple devices at the same time?
            </h3>
            <p className="text-xs text-[#9AA59F] mt-2 leading-relaxed">
              Click <strong>"Create a Room"</strong> on TuneTogether to start your room. Share your room link or QR code with friends. When you play, the song synchronizes automatically across everyone’s speakers.
            </p>
          </div>

          {/* FAQ 4 */}
          <div className="glass-card rounded-[24px] p-5 border border-white/10">
            <h3 className="font-bold text-sm text-[#F5F7F5] flex items-center gap-2">
              <span className="text-[#00FF87] font-black">Q.</span> If the host pauses or plays, does it sync for everyone?
            </h3>
            <p className="text-xs text-[#9AA59F] mt-2 leading-relaxed">
              Yes! Whenever the host pauses the song, playback stops instantly across all devices. When the host plays or seeks to a new minute, every device jumps and resumes in sync automatically.
            </p>
          </div>

          {/* FAQ 5 */}
          <div className="glass-card rounded-[24px] p-5 border border-white/10 md:col-span-2">
            <h3 className="font-bold text-sm text-[#F5F7F5] flex items-center gap-2">
              <span className="text-[#00FF87] font-black">Q.</span> How do I join and listen by scanning a QR code?
            </h3>
            <p className="text-xs text-[#9AA59F] mt-2 leading-relaxed">
              Tap <strong>"Scan Room QR Code"</strong> on the home screen and point your camera at the host's QR code. You'll jump straight into the room without typing room codes or links.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 3: BOTTOM CALL TO ACTION */}
      <section className="mt-16 sm:mt-24 rounded-[32px] glass-card border border-[#00FF87]/30 p-6 sm:p-10 text-center shadow-[0_0_40px_rgba(0,255,135,0.2)] max-w-2xl mx-auto relative overflow-hidden">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#00FF87]/15 border border-[#00FF87]/30 text-[#00FF87] text-[10.5px] font-extrabold uppercase tracking-wider mb-3">
          ★ ONE BEAT. ONE CONNECTION.
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-[#F5F7F5] tracking-tight leading-tight">
          Your next listening party starts here
        </h2>
        <p className="text-xs sm:text-sm text-[#9AA59F] mt-1.5 max-w-md mx-auto">
          One room. One song. Everyone listening together in real-time sync.
        </p>
        <button
          onClick={createRoom}
          disabled={busy}
          className="mt-6 w-full py-4 rounded-full neon-green-btn text-[#020403] font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg active:scale-95 transition"
        >
          <Add size={20} className="stroke-[3]" />
          <span>{busy ? 'Creating room…' : 'Create a Room'}</span>
        </button>
      </section>

      {/* Footer */}
      <footer className="mt-16 text-center border-t border-white/5 pt-8 flex flex-col items-center">
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="" className="w-5 h-5 rounded-full border border-[#00FF87]/50" />
          <span className="font-extrabold text-sm tracking-tight">
            Tune<span className="text-[#00FF87]">Together</span>
          </span>
        </div>
        <p className="text-[11px] text-[#9AA59F]/60 mt-1.5">© 2026 TuneTogether. One Beat, One Connection.</p>

        {/* Footer Quick Action Links */}
        <div className="mt-3 flex items-center justify-center gap-3 text-xs text-[#9AA59F]/70">
          <button
            type="button"
            onClick={() => setShowPrivacy(true)}
            className="hover:text-[#00FF87] transition cursor-pointer"
          >
            🔒 Privacy Policy
          </button>
          <span>·</span>
          <button
            type="button"
            onClick={() => setShowAndroid(true)}
            className="hover:text-[#00FF87] transition cursor-pointer"
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
