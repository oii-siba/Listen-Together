import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getFriendCode, getFriendsList, getFavoriteSongs, getListeningHistory, getNotifications } from '../lib/userData';
import FriendsModal from './FriendsModal';
import ProfileModal from './ProfileModal';
import FavoritesModal from './FavoritesModal';
import PrivacyModal from './PrivacyModal';
import AndroidAppModal from './AndroidAppModal';
import { triggerDirectInstall, isInstalled } from '../lib/pwa';
import { checkRemoteVersion, CURRENT_APP_VERSION } from '../lib/appUpdate';

export default function MenuBar({ user, roomId, onSignOut, onUpdateUser, onPlaySong, onOpenPrivacy, onOpenAndroid, className = '' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showAndroid, setShowAndroid] = useState(false);
  const [favInitialTab, setFavInitialTab] = useState('favorites');
  const [copied, setCopied] = useState(false);
  const [appInstalled, setAppInstalled] = useState(false);
  const [updateToast, setUpdateToast] = useState('');

  const nav = useNavigate();
  const location = useLocation();

  const myCode = getFriendCode(user?.uid);
  const friendsCount = getFriendsList(user?.uid).length;
  const favoritesCount = getFavoriteSongs(user?.uid).length;
  const historyCount = getListeningHistory(user?.uid).length;
  const unreadNotifs = getNotifications(user?.uid).filter((n) => n.unread).length;

  useEffect(() => {
    setAppInstalled(isInstalled());
    const onInstalled = () => setAppInstalled(true);
    window.addEventListener('tt-installed', onInstalled);
    return () => window.removeEventListener('tt-installed', onInstalled);
  }, []);

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

  const handleCheckUpdate = async () => {
    setUpdateToast('Checking for updates... ⏳');
    const hasUpdate = await checkRemoteVersion();
    if (!hasUpdate) {
      setUpdateToast(`✓ You are on the latest version (v${CURRENT_APP_VERSION})`);
      setTimeout(() => setUpdateToast(''), 3500);
    } else {
      setIsOpen(false);
      setUpdateToast('');
    }
  };

  return (
    <>
      {/* Sleek, Professional Circular Menu Bar Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`group relative w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-panel hover:bg-panel2 border border-white/15 hover:border-green-500/50 flex flex-col items-center justify-center gap-1 text-white hover:text-green-400 active:scale-95 transition-all duration-300 shadow-sm shrink-0 backdrop-blur-xl ${className}`}
        title="Navigation Menu"
        aria-label="Navigation Menu"
      >
        <span className="w-3.5 sm:w-4.5 h-[2px] bg-current rounded-full transition-all duration-300 group-hover:bg-green-400" />
        <span className="w-2.5 sm:w-3.5 h-[2px] bg-current rounded-full transition-all duration-300 group-hover:w-4.5 group-hover:bg-green-400" />
        <span className="w-3.5 sm:w-4.5 h-[2px] bg-current rounded-full transition-all duration-300 group-hover:bg-green-400" />
      </button>

      {/* Slide-over Drawer Backdrop & Panel */}
      {isOpen && (
        <div className="fixed inset-0 z-[300] flex justify-end">
          {/* Backdrop with ultra smooth blur */}
          <div
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300"
          />

          {/* Drawer Menu Panel */}
          <aside
            aria-label="Side Navigation Menu"
            className="relative w-full max-w-[min(320px,calc(100vw-2rem))] sm:max-w-sm h-full bg-gradient-to-b from-[#0e1712] via-[#09100c] to-[#040805] border-l border-emerald-500/25 p-4 sm:p-6 shadow-[-20px_0_60px_rgba(0,0,0,0.95),0_0_35px_rgba(16,185,129,0.15)] flex flex-col justify-between z-10 backdrop-blur-2xl animate-in slide-in-from-right duration-300 ring-1 ring-white/10 overflow-hidden"
          >
            {/* Ambient Background Glows */}
            <div className="absolute -top-16 -right-16 w-48 h-48 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-16 -left-16 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Scrollable Main Section */}
            <div className="overflow-y-auto pr-1 -mr-1 space-y-5 relative z-10 custom-scrollbar">
              {/* Header: Brand & Close */}
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="relative w-9 h-9 rounded-2xl overflow-hidden p-0.5 border border-emerald-400/80 shadow-[0_0_15px_rgba(34,197,94,0.5)] bg-black">
                    <img
                      src="/logo.png"
                      alt="TuneTogether"
                      className="w-full h-full object-cover rounded-xl"
                    />
                  </div>
                  <div>
                    <h2 className="font-black text-base text-white tracking-tight leading-none flex items-center gap-1.5">
                      <span>Tune</span>
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-green-300">Together</span>
                    </h2>
                    <p className="text-[10px] text-emerald-400/70 font-semibold tracking-wide uppercase mt-1">
                      UltraSync Music Room
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-white/60 hover:text-white border border-white/10 flex items-center justify-center transition-all duration-200 active:scale-90"
                  aria-label="Close Menu"
                >
                  ✕
                </button>
              </div>

              {/* User Profile VIP Card */}
              {user && (
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/[0.08] via-white/[0.03] to-emerald-950/40 border border-emerald-500/30 p-3.5 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.5)] group">
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      <img
                        src={user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`}
                        alt=""
                        className="w-12 h-12 rounded-2xl border-2 border-emerald-400/90 object-cover shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                      />
                      <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[#0e1712] shadow-sm animate-pulse" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="font-extrabold text-sm text-white truncate leading-tight">
                          {user.displayName || 'TuneTogether Fan'}
                        </p>
                        <span className="text-[10px]" title="Active Member">⭐</span>
                      </div>
                      <p className="text-[11px] text-white/50 truncate mt-0.5 font-medium">
                        {user.email || 'Online Listener'}
                      </p>
                    </div>
                  </div>

                  {/* Friend Code with Copy Button */}
                  <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between">
                    <div>
                      <p className="text-[9px] font-extrabold uppercase tracking-widest text-emerald-400/90">
                        Your Friend Code
                      </p>
                      <p className="text-xs font-mono font-black text-white tracking-wider mt-0.5">
                        {myCode}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={copyCode}
                      className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500/25 to-green-500/20 text-emerald-300 border border-emerald-400/40 font-bold text-[10px] hover:from-emerald-500 hover:to-green-500 hover:text-black transition-all duration-200 active:scale-95 shadow-[0_0_12px_rgba(16,185,129,0.2)] flex items-center gap-1"
                    >
                      <span>{copied ? '✓' : '📋'}</span>
                      <span>{copied ? 'Copied!' : 'Copy Code'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* SECTION 1: DISCOVER & LISTEN */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-white/40 px-2">
                  Discover &amp; Rooms
                </p>

                {/* 1. Home / Discover */}
                <button
                  type="button"
                  onClick={() => handleNav('/')}
                  className={`w-full group flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all duration-200 ${
                    location.pathname === '/'
                      ? 'bg-gradient-to-r from-emerald-500/25 to-green-500/15 text-emerald-300 border border-emerald-500/40 shadow-[0_0_15px_rgba(34,197,94,0.2)]'
                      : 'text-white/80 hover:bg-white/5 hover:text-white border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-sm shadow-sm group-hover:scale-110 transition-transform">
                      🏠
                    </span>
                    <div className="text-left">
                      <p className="font-extrabold text-white text-xs">Home &amp; Discover</p>
                      <p className="text-[10px] text-white/40 font-medium">Browse &amp; create sync rooms</p>
                    </div>
                  </div>
                  <span className="text-white/30 text-xs group-hover:translate-x-1 transition-transform">→</span>
                </button>

                {/* 2. Current Room (if in room) or Create Room */}
                {roomId ? (
                  <button
                    type="button"
                    onClick={() => handleNav(`/room/${roomId}`)}
                    className="w-full group flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold bg-gradient-to-r from-green-500 to-emerald-400 text-black shadow-[0_0_20px_rgba(34,197,94,0.5)] transition-all duration-200 active:scale-95"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-xl bg-black/20 flex items-center justify-center text-sm">
                        🎧
                      </span>
                      <div className="text-left">
                        <div className="flex items-center gap-1.5">
                          <p className="font-black text-black text-xs">Current Room</p>
                          <span className="text-[9px] uppercase font-mono font-black bg-black/20 px-1.5 py-0.5 rounded-md">
                            {roomId}
                          </span>
                        </div>
                        <p className="text-[10px] text-black/75 font-semibold">Active playback &amp; chat</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-3 bg-black rounded-full animate-bounce" />
                      <span className="w-1.5 h-4 bg-black rounded-full animate-bounce [animation-delay:0.15s]" />
                      <span className="w-1.5 h-2 bg-black rounded-full animate-bounce [animation-delay:0.3s]" />
                    </div>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleNav('/')}
                    className="w-full group flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold text-white/80 hover:bg-white/5 hover:text-white transition-all duration-200"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center text-sm group-hover:scale-110 transition-transform">
                        ➕
                      </span>
                      <div className="text-left">
                        <p className="font-extrabold text-white text-xs">Create or Join Room</p>
                        <p className="text-[10px] text-white/40 font-medium">Party code or instant room</p>
                      </div>
                    </div>
                    <span className="text-white/30 text-xs group-hover:translate-x-1 transition-transform">→</span>
                  </button>
                )}
              </div>

              {/* SECTION 2: SOCIAL & LIBRARY */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-white/40 px-2">
                  Social &amp; Collection
                </p>

                {/* 3. Friends System */}
                <button
                  type="button"
                  onClick={openFriends}
                  className="w-full group flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold text-white/80 hover:bg-white/5 hover:text-white transition-all duration-200"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center text-sm group-hover:scale-110 transition-transform">
                      👥
                    </span>
                    <div className="text-left">
                      <p className="font-extrabold text-white text-xs">Friends &amp; Directory</p>
                      <p className="text-[10px] text-white/40 font-medium">Send &amp; accept requests</p>
                    </div>
                  </div>
                  {friendsCount > 0 ? (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      {friendsCount}
                    </span>
                  ) : (
                    <span className="text-white/30 text-xs group-hover:translate-x-1 transition-transform">→</span>
                  )}
                </button>

                {/* 4. Favorite Songs */}
                <button
                  type="button"
                  onClick={() => openFavs('favorites')}
                  className="w-full group flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold text-white/80 hover:bg-white/5 hover:text-white transition-all duration-200"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center text-sm group-hover:scale-110 transition-transform">
                      ❤️
                    </span>
                    <div className="text-left">
                      <p className="font-extrabold text-white text-xs">Favorite Songs</p>
                      <p className="text-[10px] text-white/40 font-medium">Your curated tracks</p>
                    </div>
                  </div>
                  {favoritesCount > 0 ? (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      {favoritesCount}
                    </span>
                  ) : (
                    <span className="text-white/30 text-xs group-hover:translate-x-1 transition-transform">→</span>
                  )}
                </button>

                {/* 5. Listening History */}
                <button
                  type="button"
                  onClick={() => openFavs('history')}
                  className="w-full group flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold text-white/80 hover:bg-white/5 hover:text-white transition-all duration-200"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center text-sm group-hover:scale-110 transition-transform">
                      🕒
                    </span>
                    <div className="text-left">
                      <p className="font-extrabold text-white text-xs">Listening History</p>
                      <p className="text-[10px] text-white/40 font-medium">Recently played songs</p>
                    </div>
                  </div>
                  {historyCount > 0 ? (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {historyCount}
                    </span>
                  ) : (
                    <span className="text-white/30 text-xs group-hover:translate-x-1 transition-transform">→</span>
                  )}
                </button>
              </div>

              {/* SECTION 3: APP & PREFERENCES */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-white/40 px-2">
                  Settings &amp; App
                </p>

                {/* 6. Profile Customization */}
                <button
                  type="button"
                  onClick={openProfile}
                  className="w-full group flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold text-white/80 hover:bg-white/5 hover:text-white transition-all duration-200"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center text-sm group-hover:scale-110 transition-transform">
                      ⚙️
                    </span>
                    <div className="text-left">
                      <p className="font-extrabold text-white text-xs">Profile Customization</p>
                      <p className="text-[10px] text-white/40 font-medium">Avatar &amp; display name</p>
                    </div>
                  </div>
                  <span className="text-white/30 text-xs group-hover:translate-x-1 transition-transform">→</span>
                </button>

                {/* 7. Android App & TWA Support */}
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    if (onOpenAndroid) onOpenAndroid();
                    else setShowAndroid(true);
                  }}
                  className="w-full group flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold text-white/80 hover:bg-white/5 hover:text-white transition-all duration-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative w-8 h-8 rounded-xl overflow-hidden p-0.5 border border-green-400/60 shadow-sm bg-black shrink-0 group-hover:scale-110 transition-transform">
                      <img src="/logo.png" alt="TuneTogether" className="w-full h-full object-cover rounded-lg" />
                    </div>
                    <div className="text-left">
                      <p className="font-extrabold text-white text-xs">Android App &amp; TWA</p>
                      <p className="text-[10px] text-white/40 font-medium">Native APK &amp; TWA guide</p>
                    </div>
                  </div>
                  <span className="text-white/30 text-xs group-hover:translate-x-1 transition-transform">→</span>
                </button>

                {/* 8. Privacy Policy */}
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    if (onOpenPrivacy) onOpenPrivacy();
                    else setShowPrivacy(true);
                  }}
                  className="w-full group flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold text-white/80 hover:bg-white/5 hover:text-white transition-all duration-200"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-xl bg-slate-500/15 border border-slate-500/30 text-slate-300 flex items-center justify-center text-sm group-hover:scale-110 transition-transform">
                      🔒
                    </span>
                    <div className="text-left">
                      <p className="font-extrabold text-white text-xs">Privacy Policy</p>
                      <p className="text-[10px] text-white/40 font-medium">Data collection &amp; safety</p>
                    </div>
                  </div>
                  <span className="text-white/30 text-xs group-hover:translate-x-1 transition-transform">→</span>
                </button>

                {/* 9. Install App on Device (VIP Highlight Card) */}
                {!appInstalled && (
                  <button
                    type="button"
                    onClick={async () => {
                      setIsOpen(false);
                      await triggerDirectInstall();
                    }}
                    className="w-full group relative overflow-hidden flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold bg-gradient-to-r from-emerald-500/20 via-green-500/15 to-emerald-500/20 border border-emerald-400/40 hover:border-emerald-300 transition-all duration-300 active:scale-95 shadow-[0_0_20px_rgba(34,197,94,0.2)] hover:shadow-[0_0_25px_rgba(34,197,94,0.35)]"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-xl bg-emerald-500 text-black flex items-center justify-center text-base shadow-[0_0_10px_rgba(34,197,94,0.5)] group-hover:scale-110 transition-transform">
                        📲
                      </span>
                      <div className="text-left">
                        <div className="flex items-center gap-1.5">
                          <p className="font-black text-emerald-300 text-xs">Install App on Device</p>
                        </div>
                        <p className="text-[10px] text-white/60 font-medium">Full screen &amp; background play</p>
                      </div>
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-500 text-black px-2 py-0.5 rounded-full shadow-sm">
                      Free App
                    </span>
                  </button>
                )}

                {/* Check for App Updates Button */}
                <button
                  type="button"
                  onClick={handleCheckUpdate}
                  className="w-full flex items-center justify-between p-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-green-500/40 transition-all duration-200 active:scale-98 group"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-xl bg-green-500/15 border border-green-500/30 text-green-400 flex items-center justify-center text-sm shadow-sm group-hover:scale-110 transition-transform">
                      🔄
                    </span>
                    <div className="text-left">
                      <p className="font-bold text-white text-xs">Check for App Updates</p>
                      <p className="text-[10px] text-white/50">Version v{CURRENT_APP_VERSION}</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-green-400 font-bold bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
                    Check
                  </span>
                </button>
                {updateToast && (
                  <p className="text-[11px] text-green-400 font-semibold text-center mt-1 animate-in fade-in duration-200">
                    {updateToast}
                  </p>
                )}
              </div>
            </div>

            {/* Bottom Footer Section */}
            <div className="pt-4 border-t border-white/10 mt-3 space-y-3 relative z-10">
              {onSignOut && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onSignOut();
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/25 font-bold text-xs flex items-center justify-center gap-2 transition-all duration-200 active:scale-95 shadow-sm"
                >
                  <span>🚪</span>
                  <span>Sign Out</span>
                </button>
              )}

              <div className="flex items-center justify-between text-[10px] text-white/40 font-medium px-1">
                <span>TuneTogether v2.0</span>
                <span className="flex items-center gap-1 text-emerald-400/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  UltraSync Engine
                </span>
              </div>
            </div>
          </aside>
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

      {/* Privacy Policy Modal */}
      {showPrivacy && (
        <PrivacyModal onClose={() => setShowPrivacy(false)} />
      )}

      {/* Android App & TWA Modal */}
      {showAndroid && (
        <AndroidAppModal onClose={() => setShowAndroid(false)} />
      )}

    </>
  );
}
