import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { usePlayback } from '../context/PlaybackContext';
import { getFavoriteSongs } from '../lib/userData';
import FavoritesModal from './FavoritesModal';
import ProfileModal from './ProfileModal';

export default function BottomNav({ user, onUpdateUser }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { activeRoomId, addSong } = usePlayback() || {};

  const [showLibrary, setShowLibrary] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [favCount, setFavCount] = useState(0);

  const isHome = location.pathname === '/';
  const isInsideRoom = location.pathname.startsWith('/room/');

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
      }, 100);
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
      const btn = document.getElementById('create-room-btn');
      if (btn) {
        btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        const formEl = document.querySelector('form');
        formEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else {
      navigate('/');
      setTimeout(() => {
        const btn = document.getElementById('create-room-btn');
        btn?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 200);
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

  return (
    <>
      {/* Mobile App Bottom Navigation Bar - Clean, Normal, No Animations */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-[#0a0f14]/95 backdrop-blur-xl border-t border-white/10 px-2 pt-2 pb-[max(0.6rem,env(safe-area-inset-bottom))] shadow-lg select-none"
      >
        <div className="grid grid-cols-5 items-center max-w-md mx-auto">
          {/* 1. Home */}
          <button
            type="button"
            onClick={handleHomeClick}
            className="flex flex-col items-center justify-center py-1 cursor-pointer"
            aria-label="Home"
          >
            <div className={`flex flex-col items-center ${activeTab === 'home' ? 'text-white' : 'text-white/45'}`}>
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill={activeTab === 'home' ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth={activeTab === 'home' ? '1.8' : '2'}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              <span className={`text-[10px] mt-1 tracking-tight ${activeTab === 'home' ? 'font-bold text-white' : 'font-medium text-white/50'}`}>
                Home
              </span>
              {/* Normal clean active underline */}
              {activeTab === 'home' && (
                <span className="w-5 h-0.5 rounded-full bg-green-400 mt-0.5" />
              )}
            </div>
          </button>

          {/* 2. Discover */}
          <button
            type="button"
            onClick={handleDiscoverClick}
            className="flex flex-col items-center justify-center py-1 cursor-pointer"
            aria-label="Discover"
          >
            <div className={`flex flex-col items-center ${activeTab === 'discover' ? 'text-white' : 'text-white/45'}`}>
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <polygon
                  points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"
                  fill={activeTab === 'discover' ? 'currentColor' : 'none'}
                />
              </svg>
              <span className={`text-[10px] mt-1 tracking-tight ${activeTab === 'discover' ? 'font-bold text-white' : 'font-medium text-white/50'}`}>
                Discover
              </span>
              {activeTab === 'discover' && (
                <span className="w-5 h-0.5 rounded-full bg-green-400 mt-0.5" />
              )}
            </div>
          </button>

          {/* 3. Rooms */}
          <button
            type="button"
            onClick={handleRoomsClick}
            className="flex flex-col items-center justify-center py-1 cursor-pointer"
            aria-label="Rooms"
          >
            <div className={`flex flex-col items-center ${activeTab === 'rooms' || isInsideRoom ? 'text-green-400' : 'text-white/45'}`}>
              <div className={`w-7 h-7 rounded-full border flex items-center justify-center ${
                activeTab === 'rooms' || isInsideRoom
                  ? 'border-green-400 bg-green-500/20 text-green-300'
                  : 'border-white/20 text-white/60'
              }`}>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </div>
              <span className={`text-[10px] mt-0.5 tracking-tight ${activeTab === 'rooms' || isInsideRoom ? 'font-bold text-green-400' : 'font-medium text-white/50'}`}>
                Rooms
              </span>
              {(activeTab === 'rooms' || isInsideRoom) && (
                <span className="w-5 h-0.5 rounded-full bg-green-400 mt-0.5" />
              )}
            </div>
          </button>

          {/* 4. Library */}
          <button
            type="button"
            onClick={handleLibraryClick}
            className="flex flex-col items-center justify-center py-1 cursor-pointer"
            aria-label="Library"
          >
            <div className={`flex flex-col items-center ${activeTab === 'library' ? 'text-white' : 'text-white/45'}`}>
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
                >
                  <path d="M9 18V5l12-2v13" />
                  <circle cx="6" cy="18" r="3" fill={activeTab === 'library' ? 'currentColor' : 'none'} />
                  <circle cx="18" cy="16" r="3" fill={activeTab === 'library' ? 'currentColor' : 'none'} />
                </svg>
                {favCount > 0 && (
                  <span className="absolute -top-1 -right-2 px-1 min-w-[14px] h-3.5 rounded-full bg-rose-500 text-white font-bold text-[8px] flex items-center justify-center">
                    {favCount > 9 ? '9+' : favCount}
                  </span>
                )}
              </div>
              <span className={`text-[10px] mt-1 tracking-tight ${activeTab === 'library' ? 'font-bold text-white' : 'font-medium text-white/50'}`}>
                Library
              </span>
              {activeTab === 'library' && (
                <span className="w-5 h-0.5 rounded-full bg-green-400 mt-0.5" />
              )}
            </div>
          </button>

          {/* 5. Profile */}
          <button
            type="button"
            onClick={handleProfileClick}
            className="flex flex-col items-center justify-center py-1 cursor-pointer"
            aria-label="Profile"
          >
            <div className={`flex flex-col items-center ${activeTab === 'profile' ? 'text-white' : 'text-white/45'}`}>
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt=""
                  className={`w-5 h-5 rounded-full object-cover ${activeTab === 'profile' ? 'border-2 border-green-400' : 'border border-white/20'}`}
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
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" fill={activeTab === 'profile' ? 'currentColor' : 'none'} />
                </svg>
              )}
              <span className={`text-[10px] mt-1 tracking-tight ${activeTab === 'profile' ? 'font-bold text-white' : 'font-medium text-white/50'}`}>
                Profile
              </span>
              {activeTab === 'profile' && (
                <span className="w-5 h-0.5 rounded-full bg-green-400 mt-0.5" />
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
