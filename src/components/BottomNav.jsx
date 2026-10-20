import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { usePlayback } from '../context/PlaybackContext';
import { getFavoriteSongs } from '../lib/userData';
import FavoritesModal from './FavoritesModal';
import ProfileModal from './ProfileModal';

export default function BottomNav({ user, onUpdateUser }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { activeRoomId, playback, addSong } = usePlayback() || {};

  const [showLibrary, setShowLibrary] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [favCount, setFavCount] = useState(0);

  const isHome = location.pathname === '/';
  const isInsideRoom = location.pathname.startsWith('/room/');
  const isPlaying = !!playback?.isPlaying;

  // Active tab state: 'home' | 'discover' | 'rooms' | 'library' | 'profile'
  const [activeTab, setActiveTab] = useState('home');

  useEffect(() => {
    if (user?.uid) {
      try {
        const favs = getFavoriteSongs(user.uid);
        setFavCount(Array.isArray(favs) ? favs.length : 0);
      } catch {}
    }
  }, [user?.uid, showLibrary]);

  useEffect(() => {
    if (showProfile) {
      setActiveTab('profile');
    } else if (showLibrary) {
      setActiveTab('library');
    } else if (isInsideRoom) {
      setActiveTab('rooms');
    } else if (isHome) {
      setActiveTab('home');
    }
  }, [showProfile, showLibrary, isInsideRoom, isHome]);

  const handleHomeClick = () => {
    setActiveTab('home');
    setShowLibrary(false);
    setShowProfile(false);
    if (!isHome) {
      navigate('/');
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleDiscoverClick = () => {
    setActiveTab('discover');
    setShowLibrary(false);
    setShowProfile(false);
    if (!isHome) {
      navigate('/');
      setTimeout(() => {
        const el = document.getElementById('how-it-works') || document.getElementById('why-tunetogether');
        el?.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    } else {
      const el = document.getElementById('how-it-works') || document.getElementById('why-tunetogether');
      el?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleRoomsClick = () => {
    setActiveTab('rooms');
    setShowLibrary(false);
    setShowProfile(false);
    if (isInsideRoom) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (isHome) {
      const formEl = document.querySelector('form') || document.getElementById('room-actions');
      if (formEl) {
        formEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const input = formEl.querySelector('input');
        input?.focus();
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else {
      navigate('/');
    }
  };

  const handleLibraryClick = () => {
    setActiveTab('library');
    setShowProfile(false);
    setShowLibrary(true);
  };

  const handleProfileClick = () => {
    setActiveTab('profile');
    setShowLibrary(false);
    setShowProfile(true);
  };

  // Tab index mapping for fluid sliding wave
  const tabIndices = {
    home: 0,
    discover: 1,
    rooms: 2,
    library: 3,
    profile: 4,
  };
  const activeIndex = tabIndices[activeTab] ?? 0;

  return (
    <>
      {/* Mobile App Bottom Navigation - Ultra Professional Style 4 (Wave Animation) */}
      <nav
        aria-label="Mobile Navigation Bar"
        className="fixed bottom-[max(0.65rem,env(safe-area-inset-bottom))] left-3 right-3 sm:left-auto sm:right-auto sm:w-[420px] sm:left-1/2 sm:-translate-x-1/2 z-40 md:hidden bg-gradient-to-b from-[#0b1920]/95 via-[#061217]/98 to-[#03090c]/98 backdrop-blur-3xl border border-cyan-500/30 rounded-[32px] px-2 pt-2.5 pb-2 shadow-[0_20px_50px_rgba(0,0,0,0.95),0_0_35px_rgba(6,182,212,0.22),inset_0_1px_1px_rgba(255,255,255,0.25)] select-none overflow-hidden transition-all duration-300"
      >
        {/* Subtle Ambient Background Gradient Lighting */}
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-48 h-20 bg-cyan-500/15 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-3/4 h-16 bg-teal-500/15 rounded-full blur-2xl pointer-events-none" />

        {/* Top Edge Specular Rim Light */}
        <div className="absolute inset-x-6 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />

        {/* Continuous Luminous Base Track along bottom */}
        <div className="absolute bottom-0 inset-x-4 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent pointer-events-none" />

        <div className="relative grid grid-cols-5 items-center z-10">
          {/* Fluid Sliding Wave Indicator (Style 4 Signature Wave Dip) */}
          <div
            className="absolute bottom-[-2px] h-[22px] w-1/5 pointer-events-none transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] z-20"
            style={{ left: `${activeIndex * 20}%` }}
          >
            {/* SVG Fluid Wave Curve with Neon Cyan Glow */}
            <svg
              viewBox="0 0 100 24"
              preserveAspectRatio="none"
              className="w-full h-full overflow-visible"
            >
              <defs>
                <linearGradient id="proWaveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.2" />
                  <stop offset="25%" stopColor="#22d3ee" stopOpacity="0.9" />
                  <stop offset="50%" stopColor="#38bdf8" stopOpacity="1" />
                  <stop offset="75%" stopColor="#22d3ee" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.2" />
                </linearGradient>
                <filter id="proWaveGlow" x="-30%" y="-50%" width="160%" height="200%">
                  <feDropShadow dx="0" dy="0" stdDeviation="3.5" floodColor="#22d3ee" floodOpacity="0.95" />
                  <feDropShadow dx="0" dy="0" stdDeviation="1.5" floodColor="#38bdf8" floodOpacity="1" />
                </filter>
              </defs>

              {/* Luminous Animated Fluid Wave Dip Path */}
              <path
                d="M 0,2 Q 22,2 35,16 Q 50,21 65,16 Q 78,2 100,2"
                fill="none"
                stroke="url(#proWaveGrad)"
                strokeWidth="3.2"
                strokeLinecap="round"
                filter="url(#proWaveGlow)"
              />
            </svg>
          </div>

          {/* 1. Home Button */}
          <button
            type="button"
            onClick={handleHomeClick}
            className="group relative flex flex-col items-center justify-center py-1.5 transition-all duration-200 active:scale-90"
            aria-label="Home"
          >
            {/* Active Aura Background */}
            <div className={`absolute inset-x-1.5 top-0 bottom-1 rounded-2xl transition-all duration-300 pointer-events-none ${
              activeTab === 'home'
                ? 'bg-gradient-to-b from-cyan-400/20 via-cyan-500/10 to-transparent opacity-100 scale-100 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]'
                : 'opacity-0 scale-90'
            }`} />

            <div className={`relative flex flex-col items-center transition-all duration-300 ${
              activeTab === 'home'
                ? 'text-cyan-400 -translate-y-0.5'
                : 'text-white/45 group-hover:text-white/80'
            }`}>
              {/* Home Icon */}
              <div className="relative">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill={activeTab === 'home' ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  strokeWidth={activeTab === 'home' ? '1.8' : '2'}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`transition-all duration-300 ${
                    activeTab === 'home'
                      ? 'scale-110 drop-shadow-[0_0_12px_rgba(34,211,238,0.85)]'
                      : 'group-hover:scale-105'
                  }`}
                >
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </div>

              <span className={`text-[10px] mt-1 tracking-tight transition-all duration-300 ${
                activeTab === 'home'
                  ? 'text-cyan-300 font-extrabold drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]'
                  : 'text-white/50 group-hover:text-white/80 font-semibold'
              }`}>
                Home
              </span>

              {/* Active Breathing Dot */}
              {activeTab === 'home' && (
                <span className="w-1 h-1 rounded-full bg-cyan-300 shadow-[0_0_6px_#22d3ee] animate-pulse mt-0.5" />
              )}
            </div>
          </button>

          {/* 2. Discover Button */}
          <button
            type="button"
            onClick={handleDiscoverClick}
            className="group relative flex flex-col items-center justify-center py-1.5 transition-all duration-200 active:scale-90"
            aria-label="Discover"
          >
            {/* Active Aura Background */}
            <div className={`absolute inset-x-1.5 top-0 bottom-1 rounded-2xl transition-all duration-300 pointer-events-none ${
              activeTab === 'discover'
                ? 'bg-gradient-to-b from-cyan-400/20 via-cyan-500/10 to-transparent opacity-100 scale-100 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]'
                : 'opacity-0 scale-90'
            }`} />

            <div className={`relative flex flex-col items-center transition-all duration-300 ${
              activeTab === 'discover'
                ? 'text-cyan-400 -translate-y-0.5'
                : 'text-white/45 group-hover:text-white/80'
            }`}>
              {/* Compass Icon */}
              <div className="relative">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`transition-all duration-300 ${
                    activeTab === 'discover'
                      ? 'scale-110 drop-shadow-[0_0_12px_rgba(34,211,238,0.85)]'
                      : 'group-hover:scale-105'
                  }`}
                >
                  <circle cx="12" cy="12" r="10" />
                  <polygon
                    points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"
                    fill={activeTab === 'discover' ? 'currentColor' : 'none'}
                  />
                </svg>
              </div>

              <span className={`text-[10px] mt-1 tracking-tight transition-all duration-300 ${
                activeTab === 'discover'
                  ? 'text-cyan-300 font-extrabold drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]'
                  : 'text-white/50 group-hover:text-white/80 font-semibold'
              }`}>
                Discover
              </span>

              {/* Active Breathing Dot */}
              {activeTab === 'discover' && (
                <span className="w-1 h-1 rounded-full bg-cyan-300 shadow-[0_0_6px_#22d3ee] animate-pulse mt-0.5" />
              )}
            </div>
          </button>

          {/* 3. Rooms Center Button (Signature Neon Halo + Equalizer in Style 4) */}
          <button
            type="button"
            onClick={handleRoomsClick}
            className="group relative flex flex-col items-center justify-center py-1 transition-all duration-200 active:scale-90"
            aria-label="Rooms"
          >
            {/* Active Aura Background */}
            <div className={`absolute inset-x-1 top-0 bottom-1 rounded-2xl transition-all duration-300 pointer-events-none ${
              activeTab === 'rooms' || isInsideRoom
                ? 'bg-gradient-to-b from-cyan-400/25 via-cyan-500/10 to-transparent opacity-100 scale-100 shadow-[inset_0_1px_1px_rgba(255,255,255,0.25)]'
                : 'opacity-0 scale-90'
            }`} />

            <div className="relative flex flex-col items-center">
              {/* Outer Glowing Neon Ring */}
              <div className={`relative w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                activeTab === 'rooms' || isInsideRoom
                  ? 'border-cyan-400 bg-gradient-to-tr from-cyan-950 via-teal-900 to-cyan-800 text-cyan-200 shadow-[0_0_22px_rgba(34,211,238,0.85)] scale-110 -translate-y-0.5'
                  : 'border-cyan-400/70 bg-cyan-950/40 text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.4)] group-hover:border-cyan-300 group-hover:scale-105'
              }`}>
                {/* Playing Equalizer Animation inside Room, or Plus Sign */}
                {isInsideRoom && isPlaying ? (
                  <div className="flex items-center gap-0.5">
                    <span className="w-1 h-2.5 bg-cyan-300 rounded-full animate-bounce [animation-delay:0s]" />
                    <span className="w-1 h-4 bg-cyan-200 rounded-full animate-bounce [animation-delay:0.15s]" />
                    <span className="w-1 h-2 bg-cyan-300 rounded-full animate-bounce [animation-delay:0.3s]" />
                  </div>
                ) : (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="transition-transform group-hover:rotate-90 duration-300"
                  >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                )}

                {/* Pulsing Active Beacon when connected to room */}
                {isInsideRoom && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-black shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse" />
                )}
              </div>

              <span className={`text-[10px] mt-0.5 tracking-tight transition-all duration-300 ${
                activeTab === 'rooms' || isInsideRoom
                  ? 'text-cyan-300 font-extrabold drop-shadow-[0_0_8px_rgba(34,211,238,0.7)]'
                  : 'text-cyan-400/80 group-hover:text-cyan-300 font-semibold'
              }`}>
                Rooms
              </span>

              {/* Active Breathing Dot */}
              {(activeTab === 'rooms' || isInsideRoom) && (
                <span className="w-1 h-1 rounded-full bg-cyan-300 shadow-[0_0_6px_#22d3ee] animate-pulse mt-0.5" />
              )}
            </div>
          </button>

          {/* 4. Library Button (Favorites & History) */}
          <button
            type="button"
            onClick={handleLibraryClick}
            className="group relative flex flex-col items-center justify-center py-1.5 transition-all duration-200 active:scale-90"
            aria-label="Library"
          >
            {/* Active Aura Background */}
            <div className={`absolute inset-x-1.5 top-0 bottom-1 rounded-2xl transition-all duration-300 pointer-events-none ${
              activeTab === 'library'
                ? 'bg-gradient-to-b from-cyan-400/20 via-cyan-500/10 to-transparent opacity-100 scale-100 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]'
                : 'opacity-0 scale-90'
            }`} />

            <div className={`relative flex flex-col items-center transition-all duration-300 ${
              activeTab === 'library'
                ? 'text-cyan-400 -translate-y-0.5'
                : 'text-white/45 group-hover:text-white/80'
            }`}>
              {/* Music Note Icon with Badge */}
              <div className="relative">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`transition-all duration-300 ${
                    activeTab === 'library'
                      ? 'scale-110 drop-shadow-[0_0_12px_rgba(34,211,238,0.85)]'
                      : 'group-hover:scale-105'
                  }`}
                >
                  <path d="M9 18V5l12-2v13" />
                  <circle cx="6" cy="18" r="3" fill={activeTab === 'library' ? 'currentColor' : 'none'} />
                  <circle cx="18" cy="16" r="3" fill={activeTab === 'library' ? 'currentColor' : 'none'} />
                </svg>

                {/* Subtle Saved Favorites Badge Pill */}
                {favCount > 0 && (
                  <span className="absolute -top-1 -right-2 px-1 min-w-[14px] h-3.5 rounded-full bg-rose-500 text-white font-extrabold text-[8px] flex items-center justify-center shadow-sm">
                    {favCount > 9 ? '9+' : favCount}
                  </span>
                )}
              </div>

              <span className={`text-[10px] mt-1 tracking-tight transition-all duration-300 ${
                activeTab === 'library'
                  ? 'text-cyan-300 font-extrabold drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]'
                  : 'text-white/50 group-hover:text-white/80 font-semibold'
              }`}>
                Library
              </span>

              {/* Active Breathing Dot */}
              {activeTab === 'library' && (
                <span className="w-1 h-1 rounded-full bg-cyan-300 shadow-[0_0_6px_#22d3ee] animate-pulse mt-0.5" />
              )}
            </div>
          </button>

          {/* 5. Profile Button */}
          <button
            type="button"
            onClick={handleProfileClick}
            className="group relative flex flex-col items-center justify-center py-1.5 transition-all duration-200 active:scale-90"
            aria-label="Profile"
          >
            {/* Active Aura Background */}
            <div className={`absolute inset-x-1.5 top-0 bottom-1 rounded-2xl transition-all duration-300 pointer-events-none ${
              activeTab === 'profile'
                ? 'bg-gradient-to-b from-cyan-400/20 via-cyan-500/10 to-transparent opacity-100 scale-100 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]'
                : 'opacity-0 scale-90'
            }`} />

            <div className={`relative flex flex-col items-center transition-all duration-300 ${
              activeTab === 'profile'
                ? 'text-cyan-400 -translate-y-0.5'
                : 'text-white/45 group-hover:text-white/80'
            }`}>
              {/* User Avatar with Glowing Status Ring */}
              <div className="relative">
                {user?.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt=""
                    className={`w-5 h-5 rounded-full object-cover transition-all duration-300 ${
                      activeTab === 'profile'
                        ? 'border-2 border-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.85)] scale-110'
                        : 'border border-white/20 group-hover:border-white/60'
                    }`}
                  />
                ) : (
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`transition-all duration-300 ${
                      activeTab === 'profile'
                        ? 'scale-110 drop-shadow-[0_0_12px_rgba(34,211,238,0.85)]'
                        : 'group-hover:scale-105'
                    }`}
                  >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" fill={activeTab === 'profile' ? 'currentColor' : 'none'} />
                  </svg>
                )}
              </div>

              <span className={`text-[10px] mt-1 tracking-tight transition-all duration-300 ${
                activeTab === 'profile'
                  ? 'text-cyan-300 font-extrabold drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]'
                  : 'text-white/50 group-hover:text-white/80 font-semibold'
              }`}>
                Profile
              </span>

              {/* Active Breathing Dot */}
              {activeTab === 'profile' && (
                <span className="w-1 h-1 rounded-full bg-cyan-300 shadow-[0_0_6px_#22d3ee] animate-pulse mt-0.5" />
              )}
            </div>
          </button>
        </div>
      </nav>

      {/* Library (Favorites & History) Modal */}
      {showLibrary && user && (
        <FavoritesModal
          user={user}
          initialTab="favorites"
          roomId={activeRoomId}
          onPlaySong={addSong}
          onClose={() => {
            setShowLibrary(false);
            if (isInsideRoom) setActiveTab('rooms');
            else if (isHome) setActiveTab('home');
          }}
        />
      )}

      {/* Profile Customization Modal */}
      {showProfile && user && (
        <ProfileModal
          user={user}
          onClose={() => {
            setShowProfile(false);
            if (isInsideRoom) setActiveTab('rooms');
            else if (isHome) setActiveTab('home');
          }}
          onUpdateUser={onUpdateUser}
        />
      )}
    </>
  );
}
