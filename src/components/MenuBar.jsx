import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getFriendCode, getFriendsList, getFavoriteSongs, getListeningHistory, getNotifications } from '../lib/userData';
import FriendsModal from './FriendsModal';
import ProfileModal from './ProfileModal';
import FavoritesModal from './FavoritesModal';
import { triggerDirectInstall, isInstalled } from '../lib/pwa';

export default function MenuBar({ user, roomId, onSignOut, onUpdateUser, onPlaySong }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [favInitialTab, setFavInitialTab] = useState('favorites');
  const [copied, setCopied] = useState(false);

  const nav = useNavigate();
  const location = useLocation();

  const myCode = getFriendCode(user?.uid);
  const friendsCount = getFriendsList(user?.uid).length;
  const favoritesCount = getFavoriteSongs(user?.uid).length;
  const historyCount = getListeningHistory(user?.uid).length;
  const unreadNotifs = getNotifications(user?.uid).filter((n) => n.unread).length;

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const copyCode = () => {
    navigator.clipboard.writeText(myCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNav = (path) => {
    setIsOpen(false);
    nav(path);
  };

  const openFriends = () => {
    setIsOpen(false);
    setShowFriends(true);
  };

  const openProfile = () => {
    setIsOpen(false);
    setShowProfile(true);
  };

  const openFavs = (tab = 'favorites') => {
    setIsOpen(false);
    setFavInitialTab(tab);
    setShowFavorites(true);
  };

  return (
    <>
      {/* Menu Bar Trigger Button (Hamburger) */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="w-10 h-10 rounded-full bg-panel border border-white/10 flex items-center justify-center text-white/80 hover:text-white active:scale-95 transition hover:border-green-500/40 shadow"
        title="Open Navigation Menu"
        aria-label="Navigation Menu"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Slide-over Drawer Backdrop & Panel */}
      {isOpen && (
        <div className="fixed inset-0 z-[300] flex justify-end">
          {/* Backdrop */}
          <div
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
          />

          {/* Drawer Menu Panel */}
          <div className="relative w-full max-w-[310px] sm:max-w-xs h-full bg-[#0d1410]/95 border-l border-white/10 p-5 shadow-2xl flex flex-col justify-between z-10 backdrop-blur-2xl animate-in slide-in-from-right duration-250">
            {/* Top Section */}
            <div className="overflow-y-auto pr-1">
              {/* Header: Logo + Close Button */}
              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
                <div className="flex items-center gap-2.5">
                  <img
                    src="/logo.png"
                    alt="TuneTogether"
                    className="w-8 h-8 rounded-full border border-green-400 p-0.5"
                  />
                  <div>
                    <h2 className="font-extrabold text-sm text-white tracking-tight leading-none">
                      Tune<span className="text-green-400">Together</span>
                    </h2>
                    <p className="text-[10px] text-white/40 mt-0.5">One Beat. One Connection.</p>
                  </div>
                </div>

                <button
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-white/60 hover:text-white flex items-center justify-center transition text-sm"
                  aria-label="Close Menu"
                >
                  ✕
                </button>
              </div>

              {/* User Profile Card */}
              {user && (
                <div className="bg-panel2/80 border border-green-500/25 rounded-2xl p-3.5 mb-5 shadow-[0_0_15px_rgba(34,197,94,0.12)]">
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      <img
                        src={user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`}
                        alt=""
                        className="w-11 h-11 rounded-full border-2 border-green-400 object-cover"
                      />
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-panel animate-pulse" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-extrabold text-sm text-white truncate leading-tight">
                        {user.displayName || 'TuneTogether Fan'}
                      </p>
                      <p className="text-[10px] text-white/50 truncate mt-0.5">
                        {user.email || 'Online Listener'}
                      </p>
                    </div>
                  </div>

                  {/* Friend Code Pill with Instant Copy */}
                  <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between">
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-green-400/80">Friend Code</p>
                      <p className="text-xs font-mono font-extrabold text-white">{myCode}</p>
                    </div>
                    <button
                      type="button"
                      onClick={copyCode}
                      className="px-2.5 py-1 rounded-full bg-green-500/20 text-green-400 border border-green-500/30 font-bold text-[10px] hover:bg-green-500 hover:text-black transition active:scale-95"
                    >
                      {copied ? 'Copied! ✓' : 'Copy'}
                    </button>
                  </div>
                </div>
              )}

              {/* Navigation Menu List */}
              <nav className="space-y-1">
                {/* 1. Home / Explore */}
                <button
                  type="button"
                  onClick={() => handleNav('/')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
                    location.pathname === '/'
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : 'text-white/80 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-base">🏠</span>
                    <span>Home & Discover</span>
                  </div>
                  <span className="text-white/30 text-xs">→</span>
                </button>

                {/* 2. Active Room / Room Launcher */}
                {roomId ? (
                  <button
                    type="button"
                    onClick={() => handleNav(`/room/${roomId}`)}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold bg-green-500 text-black shadow-[0_0_14px_rgba(34,197,94,0.5)] transition"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-base">🎧</span>
                      <span>Current Room ({roomId})</span>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-black animate-pulse" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleNav('/')}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold text-white/80 hover:bg-white/5 hover:text-white transition"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-base">➕</span>
                      <span>Create or Join Room</span>
                    </div>
                    <span className="text-white/30 text-xs">→</span>
                  </button>
                )}

                {/* 3. Friends System */}
                <button
                  type="button"
                  onClick={openFriends}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold text-white/80 hover:bg-white/5 hover:text-white transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-base">👥</span>
                    <span>Friends & Directory</span>
                  </div>
                  {friendsCount > 0 && (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-white/10 text-white/80">
                      {friendsCount}
                    </span>
                  )}
                </button>

                {/* 4. Favorite Songs */}
                <button
                  type="button"
                  onClick={() => openFavs('favorites')}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold text-white/80 hover:bg-white/5 hover:text-white transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-base">❤️</span>
                    <span>Favorite Songs</span>
                  </div>
                  {favoritesCount > 0 && (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
                      {favoritesCount}
                    </span>
                  )}
                </button>

                {/* 5. Listening History */}
                <button
                  type="button"
                  onClick={() => openFavs('history')}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold text-white/80 hover:bg-white/5 hover:text-white transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-base">🕒</span>
                    <span>Listening History</span>
                  </div>
                  {historyCount > 0 && (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-white/10 text-white/70">
                      {historyCount}
                    </span>
                  )}
                </button>

                {/* 6. Profile Settings */}
                <button
                  type="button"
                  onClick={openProfile}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold text-white/80 hover:bg-white/5 hover:text-white transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-base">⚙️</span>
                    <span>Profile Customization</span>
                  </div>
                  <span className="text-white/30 text-xs">→</span>
                </button>

                {/* 7. Install App */}
                <button
                  type="button"
                  onClick={async () => {
                    setIsOpen(false);
                    await triggerDirectInstall();
                  }}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold text-green-400 bg-green-500/10 border border-green-500/25 hover:bg-green-500/20 transition active:scale-95 shadow-[0_0_10px_rgba(34,197,94,0.15)]"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-base">📲</span>
                    <span>Install App on Device</span>
                  </div>
                  <span className="text-[10px] font-extrabold bg-green-500 text-black px-2 py-0.5 rounded-full">
                    FREE
                  </span>
                </button>
              </nav>
            </div>

            {/* Bottom Footer Section */}
            <div className="pt-4 border-t border-white/10 mt-4 space-y-3">
              {onSignOut && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onSignOut();
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/25 font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95"
                >
                  <span>🚪</span>
                  <span>Sign Out</span>
                </button>
              )}

              <p className="text-[10px] text-white/35 text-center font-medium">
                TuneTogether v2.0 · Live YouTube Sync
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Friends Modal */}
      {showFriends && (
        <FriendsModal
          user={user}
          currentRoomId={roomId}
          onClose={() => setShowFriends(false)}
        />
      )}

      {/* Profile Modal */}
      {showProfile && (
        <ProfileModal
          user={user}
          onClose={() => setShowProfile(false)}
          onUpdateUser={onUpdateUser}
        />
      )}

      {/* Favorites & History Modal */}
      {showFavorites && (
        <FavoritesModal
          user={user}
          initialTab={favInitialTab}
          roomId={roomId}
          onPlaySong={onPlaySong}
          onClose={() => setShowFavorites(false)}
        />
      )}
    </>
  );
}
