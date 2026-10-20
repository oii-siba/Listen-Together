import { useState } from 'react';
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

  const handleHomeClick = () => {
    if (!isHome) {
      navigate('/');
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleDiscoverClick = () => {
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

  return (
    <>
      {/* Mobile App Bottom Navigation Bar (Hidden on desktop md+) */}
      <nav
        aria-label="Mobile Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-[#0a0f14]/95 backdrop-blur-2xl border-t border-white/10 px-2 pt-1.5 pb-[max(0.6rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(0,0,0,0.85)]"
      >
        <div className="grid grid-cols-5 items-center max-w-md mx-auto">
          {/* 1. Home */}
          <button
            type="button"
            onClick={handleHomeClick}
            className="group flex flex-col items-center justify-center py-1 transition-all active:scale-95"
            aria-label="Home"
          >
            <div className={`relative flex flex-col items-center transition-colors ${
              isHome ? 'text-white' : 'text-white/45 group-hover:text-white/80'
            }`}>
              {/* Home Icon */}
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill={isHome ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth={isHome ? '1.5' : '2'}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-transform group-hover:scale-105"
              >
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              <span className={`text-[10px] font-bold mt-0.5 tracking-tight ${
                isHome ? 'text-white font-black' : 'text-white/50'
              }`}>
                Home
              </span>

              {/* Glowing Indicator bar matching reference mockup */}
              {isHome && (
                <span className="w-6 h-0.5 rounded-full bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 shadow-[0_0_8px_rgba(168,85,247,0.8)] mt-0.5" />
              )}
            </div>
          </button>

          {/* 2. Discover */}
          <button
            type="button"
            onClick={handleDiscoverClick}
            className="group flex flex-col items-center justify-center py-1 transition-all active:scale-95"
            aria-label="Discover"
          >
            <div className="relative flex flex-col items-center text-white/45 group-hover:text-white/80 transition-colors">
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
                className="transition-transform group-hover:scale-105"
              >
                <circle cx="12" cy="12" r="10" />
                <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
              </svg>
              <span className="text-[10px] font-bold mt-0.5 tracking-tight text-white/50">
                Discover
              </span>
            </div>
          </button>

          {/* 3. Rooms (Prominent Center Action) */}
          <button
            type="button"
            onClick={handleRoomsClick}
            className="group flex flex-col items-center justify-center py-1 transition-all active:scale-95"
            aria-label="Rooms"
          >
            <div className={`relative flex flex-col items-center transition-colors ${
              isInsideRoom ? 'text-emerald-400' : 'text-white/55 group-hover:text-white'
            }`}>
              {/* Plus in Circle Icon */}
              <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 ${
                isInsideRoom
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-400/50 shadow-[0_0_10px_rgba(34,197,94,0.4)]'
                  : 'text-white/70'
              }`}>
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="16" />
                  <line x1="8" y1="12" x2="16" y2="12" />
                </svg>
              </div>
              <span className={`text-[10px] font-bold mt-0.5 tracking-tight ${
                isInsideRoom ? 'text-emerald-400 font-black' : 'text-white/50'
              }`}>
                Rooms
              </span>

              {isInsideRoom && (
                <span className="w-6 h-0.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] mt-0.5" />
              )}
            </div>
          </button>

          {/* 4. Library (Favorites & History) */}
          <button
            type="button"
            onClick={() => setShowLibrary(true)}
            className="group flex flex-col items-center justify-center py-1 transition-all active:scale-95"
            aria-label="Library"
          >
            <div className={`relative flex flex-col items-center transition-colors ${
              showLibrary ? 'text-white' : 'text-white/45 group-hover:text-white/80'
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
                className="transition-transform group-hover:scale-105"
              >
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
              <span className="text-[10px] font-bold mt-0.5 tracking-tight text-white/50">
                Library
              </span>
            </div>
          </button>

          {/* 5. Profile */}
          <button
            type="button"
            onClick={() => setShowProfile(true)}
            className="group flex flex-col items-center justify-center py-1 transition-all active:scale-95"
            aria-label="Profile"
          >
            <div className={`relative flex flex-col items-center transition-colors ${
              showProfile ? 'text-white' : 'text-white/45 group-hover:text-white/80'
            }`}>
              {/* User Avatar or Silhouette */}
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt=""
                  className="w-5 h-5 rounded-full object-cover border border-white/20 group-hover:border-emerald-400 transition"
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
                  className="transition-transform group-hover:scale-105"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              )}
              <span className="text-[10px] font-bold mt-0.5 tracking-tight text-white/50">
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
          onClose={() => setShowLibrary(false)}
        />
      )}

      {/* Profile Customization Modal */}
      {showProfile && user && (
        <ProfileModal
          user={user}
          onClose={() => setShowProfile(false)}
          onUpdateUser={onUpdateUser}
        />
      )}
    </>
  );
}
