import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { usePlayback } from '../context/PlaybackContext';
import FavoritesModal from './FavoritesModal';
import ProfileModal from './ProfileModal';

export default function BottomNav({ user, onUpdateUser }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { activeRoomId, addSong } = usePlayback() || {};

  const [showLibrary, setShowLibrary] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const isHome = location.pathname === '/';
  const isInsideRoom = location.pathname.startsWith('/room/');

  // Active tab state: 'home' | 'discover' | 'rooms' | 'library' | 'profile'
  const [activeTab, setActiveTab] = useState('home');

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

  // Tab index mapping for smooth sliding wave indicator
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
      {/* Mobile App Bottom Navigation - Style 4: Wave Animation (Creative) */}
      <nav
        aria-label="Mobile Navigation"
        className="fixed bottom-[max(0.6rem,env(safe-area-inset-bottom))] left-3 right-3 sm:left-auto sm:right-auto sm:w-[420px] sm:left-1/2 sm:-translate-x-1/2 z-40 md:hidden bg-[#071217]/95 backdrop-blur-2xl border border-cyan-500/25 rounded-[30px] px-2.5 pt-2 pb-2.5 shadow-[0_12px_45px_rgba(0,0,0,0.9),0_0_25px_rgba(6,182,212,0.18)] select-none overflow-hidden"
      >
        {/* Ambient Cyan/Teal Under-Glow */}
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-3/4 h-14 bg-cyan-500/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative grid grid-cols-5 items-center z-10">
          {/* Animated Wave Indicator (Slides smoothly to the active tab) */}
          <div
            className="absolute bottom-0 h-[18px] w-1/5 pointer-events-none transition-all duration-300 ease-out z-20"
            style={{ left: `${activeIndex * 20}%` }}
          >
            {/* SVG Fluid Wave Curve with Neon Glow matching Style 4 */}
            <svg
              viewBox="0 0 100 20"
              preserveAspectRatio="none"
              className="w-full h-full overflow-visible"
            >
              <defs>
                <linearGradient id="waveCyanGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.3" />
                  <stop offset="30%" stopColor="#22d3ee" stopOpacity="1" />
                  <stop offset="50%" stopColor="#38bdf8" stopOpacity="1" />
                  <stop offset="70%" stopColor="#22d3ee" stopOpacity="1" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.3" />
                </linearGradient>
                <filter id="neonWaveGlow" x="-20%" y="-40%" width="140%" height="180%">
                  <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#22d3ee" floodOpacity="0.9" />
                </filter>
              </defs>

              {/* Luminous Animated Wave Path */}
              <path
                d="M 0,2 Q 22,2 35,14 Q 50,18 65,14 Q 78,2 100,2"
                fill="none"
                stroke="url(#waveCyanGrad)"
                strokeWidth="3"
                strokeLinecap="round"
                filter="url(#neonWaveGlow)"
              />
            </svg>
          </div>

          {/* Continuous Glowing Bottom Border */}
          <div className="absolute -bottom-2.5 left-2 right-2 h-[2px] bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent pointer-events-none shadow-[0_0_8px_rgba(6,182,212,0.6)]" />

          {/* 1. Home Button */}
          <button
            type="button"
            onClick={handleHomeClick}
            className="group relative flex flex-col items-center justify-center py-1 transition-all active:scale-95"
            aria-label="Home"
          >
            {activeTab === 'home' && (
              <div className="absolute inset-x-1.5 top-0 bottom-1 rounded-2xl bg-gradient-to-b from-cyan-400/20 via-cyan-500/10 to-transparent pointer-events-none animate-in fade-in zoom-in-95 duration-200" />
            )}
            <div className={`relative flex flex-col items-center transition-all duration-200 ${
              activeTab === 'home'
                ? 'text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.7)]'
                : 'text-white/50 group-hover:text-white/85'
            }`}>
              {/* Home Icon */}
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill={activeTab === 'home' ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth={activeTab === 'home' ? '1.8' : '2'}
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`transition-transform duration-200 ${activeTab === 'home' ? 'scale-110' : 'group-hover:scale-105'}`}
              >
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              <span className={`text-[10px] mt-0.5 tracking-tight transition-colors ${
                activeTab === 'home'
                  ? 'text-cyan-300 font-black'
                  : 'text-white/50 group-hover:text-white/80 font-bold'
              }`}>
                Home
              </span>
            </div>
          </button>

          {/* 2. Discover Button */}
          <button
            type="button"
            onClick={handleDiscoverClick}
            className="group relative flex flex-col items-center justify-center py-1 transition-all active:scale-95"
            aria-label="Discover"
          >
            {activeTab === 'discover' && (
              <div className="absolute inset-x-1.5 top-0 bottom-1 rounded-2xl bg-gradient-to-b from-cyan-400/20 via-cyan-500/10 to-transparent pointer-events-none animate-in fade-in zoom-in-95 duration-200" />
            )}
            <div className={`relative flex flex-col items-center transition-all duration-200 ${
              activeTab === 'discover'
                ? 'text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.7)]'
                : 'text-white/50 group-hover:text-white/85'
            }`}>
              {/* Compass Icon */}
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`transition-transform duration-200 ${activeTab === 'discover' ? 'scale-110' : 'group-hover:scale-105'}`}
              >
                <circle cx="12" cy="12" r="10" />
                <polygon
                  points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"
                  fill={activeTab === 'discover' ? 'currentColor' : 'none'}
                />
              </svg>
              <span className={`text-[10px] mt-0.5 tracking-tight transition-colors ${
                activeTab === 'discover'
                  ? 'text-cyan-300 font-black'
                  : 'text-white/50 group-hover:text-white/80 font-bold'
              }`}>
                Discover
              </span>
            </div>
          </button>

          {/* 3. Rooms Button (Distinctive Cyan Glowing Circle in Style 4) */}
          <button
            type="button"
            onClick={handleRoomsClick}
            className="group relative flex flex-col items-center justify-center py-0.5 transition-all active:scale-95"
            aria-label="Rooms"
          >
            {activeTab === 'rooms' && (
              <div className="absolute inset-x-1 top-0 bottom-1 rounded-2xl bg-gradient-to-b from-cyan-400/20 via-cyan-500/10 to-transparent pointer-events-none animate-in fade-in zoom-in-95 duration-200" />
            )}
            <div className="relative flex flex-col items-center">
              {/* Glowing Cyan Circle with Plus Sign */}
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                activeTab === 'rooms' || isInsideRoom
                  ? 'border-cyan-400 bg-cyan-950/60 text-cyan-300 shadow-[0_0_18px_rgba(34,211,238,0.7)] scale-110'
                  : 'border-cyan-400/70 bg-cyan-950/30 text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.35)] group-hover:border-cyan-300 group-hover:scale-105'
              }`}>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </div>
              <span className={`text-[10px] mt-0.5 tracking-tight transition-colors ${
                activeTab === 'rooms' || isInsideRoom
                  ? 'text-cyan-300 font-black drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]'
                  : 'text-cyan-400/80 group-hover:text-cyan-300 font-bold'
              }`}>
                Rooms
              </span>
            </div>
          </button>

          {/* 4. Library Button (Favorites & History) */}
          <button
            type="button"
            onClick={handleLibraryClick}
            className="group relative flex flex-col items-center justify-center py-1 transition-all active:scale-95"
            aria-label="Library"
          >
            {activeTab === 'library' && (
              <div className="absolute inset-x-1.5 top-0 bottom-1 rounded-2xl bg-gradient-to-b from-cyan-400/20 via-cyan-500/10 to-transparent pointer-events-none animate-in fade-in zoom-in-95 duration-200" />
            )}
            <div className={`relative flex flex-col items-center transition-all duration-200 ${
              activeTab === 'library'
                ? 'text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.7)]'
                : 'text-white/50 group-hover:text-white/85'
            }`}>
              {/* Music Note Icon */}
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`transition-transform duration-200 ${activeTab === 'library' ? 'scale-110' : 'group-hover:scale-105'}`}
              >
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" fill={activeTab === 'library' ? 'currentColor' : 'none'} />
                <circle cx="18" cy="16" r="3" fill={activeTab === 'library' ? 'currentColor' : 'none'} />
              </svg>
              <span className={`text-[10px] mt-0.5 tracking-tight transition-colors ${
                activeTab === 'library'
                  ? 'text-cyan-300 font-black'
                  : 'text-white/50 group-hover:text-white/80 font-bold'
              }`}>
                Library
              </span>
            </div>
          </button>

          {/* 5. Profile Button */}
          <button
            type="button"
            onClick={handleProfileClick}
            className="group relative flex flex-col items-center justify-center py-1 transition-all active:scale-95"
            aria-label="Profile"
          >
            {activeTab === 'profile' && (
              <div className="absolute inset-x-1.5 top-0 bottom-1 rounded-2xl bg-gradient-to-b from-cyan-400/20 via-cyan-500/10 to-transparent pointer-events-none animate-in fade-in zoom-in-95 duration-200" />
            )}
            <div className={`relative flex flex-col items-center transition-all duration-200 ${
              activeTab === 'profile'
                ? 'text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.7)]'
                : 'text-white/50 group-hover:text-white/85'
            }`}>
              {/* User Avatar or Silhouette */}
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt=""
                  className={`w-5 h-5 rounded-full object-cover transition-all ${
                    activeTab === 'profile'
                      ? 'border-2 border-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.6)] scale-110'
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
                  className={`transition-transform duration-200 ${activeTab === 'profile' ? 'scale-110' : 'group-hover:scale-105'}`}
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" fill={activeTab === 'profile' ? 'currentColor' : 'none'} />
                </svg>
              )}
              <span className={`text-[10px] mt-0.5 tracking-tight transition-colors ${
                activeTab === 'profile'
                  ? 'text-cyan-300 font-black'
                  : 'text-white/50 group-hover:text-white/80 font-bold'
              }`}>
                Profile
              </span>
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
