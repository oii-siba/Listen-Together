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

      {/* Slide-over Drawer Backdrop & Panel (Left Aligned) */}
      {isOpen && (
        <div className="fixed inset-0 z-[300] flex justify-start">
          {/* Backdrop with ultra smooth blur */}
          <div
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300"
          />

          {/* Drawer Menu Panel */}
          <aside
            aria-label="Side Navigation Menu"
            className="relative w-full max-w-[min(340px,calc(100vw-1.5rem))] sm:max-w-[360px] h-full bg-gradient-to-b from-[#09110d] via-[#050907] to-[#020503] border-r border-emerald-500/30 p-4 sm:p-5 shadow-[20px_0_60px_rgba(0,0,0,0.95),0_0_40px_rgba(16,185,129,0.2)] flex flex-col justify-between z-10 backdrop-blur-2xl animate-in slide-in-from-left duration-300 ring-1 ring-white/10 overflow-hidden font-sans"
          >
            {/* Ambient Background Glows */}
            <div className="absolute -top-16 -right-16 w-52 h-52 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-20 -left-16 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Scrollable Main Section */}
            <div className="overflow-y-auto pr-1 -mr-1 space-y-4 relative z-10 custom-scrollbar">
              {/* Header: Glowing Brand Emblem & Close Button */}
              <div className="flex items-center justify-between pb-3.5 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="relative w-10 h-10 rounded-full p-0.5 bg-gradient-to-tr from-emerald-500 to-green-400 shadow-[0_0_18px_rgba(34,197,94,0.6)] flex items-center justify-center shrink-0">
                    <img
                      src="/logo.png"
                      alt="TuneTogether"
                      className="w-full h-full object-cover rounded-full"
                    />
                  </div>
                  <div>
                    <h2 className="font-extrabold text-base text-white tracking-tight leading-none flex items-center">
                      <span>Tune</span>
                      <span className="text-emerald-400 ml-0.5">Together</span>
                    </h2>
                    <p className="text-[9.5px] text-emerald-400/80 font-bold tracking-widest uppercase mt-1">
                      UltraSync Music Room
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/15 text-white/70 hover:text-white border border-white/10 flex items-center justify-center transition-all duration-200 active:scale-90 shadow-sm"
                  aria-label="Close Menu"
                >
                  ✕
                </button>
              </div>

              {/* User Profile VIP Card matching mockup */}
              {user && (
                <div className="rounded-[22px] bg-[#0c1510]/95 border border-emerald-500/35 p-3.5 backdrop-blur-xl shadow-[0_0_25px_rgba(16,185,129,0.15)] relative overflow-hidden group">
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      <img
                        src={user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`}
                        alt=""
                        className="w-12 h-12 rounded-2xl border-2 border-emerald-400 object-cover shadow-[0_0_14px_rgba(16,185,129,0.4)]"
                      />
                      <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[#0c1510] shadow-sm animate-pulse" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="font-black text-sm text-white truncate leading-tight">
                          {user.displayName || 'Music Fan'}
                        </p>
                        <span className="text-amber-400 text-xs" title="Verified Member">★</span>
                      </div>
                      <p className="text-[11px] text-white/50 truncate mt-0.5 font-medium">
                        {user.email || 'Online Listener'}
                      </p>
                    </div>
                  </div>

                  {/* Friend Code with Copy Box matching mockup */}
                  <div className="mt-3 pt-2.5 border-t border-white/10">
                    <p className="text-[9px] font-extrabold uppercase tracking-widest text-emerald-400/90 mb-1.5">
                      Your Friend Code
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-black/60 border border-white/10 rounded-xl px-3 py-2 font-mono font-black text-xs text-white tracking-wider truncate select-all">
                        {myCode}
                      </div>
                      <button
                        type="button"
                        onClick={copyCode}
                        className="px-3.5 py-2 rounded-xl border border-emerald-400/60 bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-300 font-extrabold text-xs transition-all duration-200 active:scale-95 shadow-[0_0_15px_rgba(16,185,129,0.25)] flex items-center gap-1.5 shrink-0 cursor-pointer"
                        title="Copy friend code to clipboard"
                      >
                        <span>{copied ? '✓' : '📋'}</span>
                        <span>{copied ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 1: DISCOVER & ROOMS */}
              <div className="space-y-1.5 pt-1">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-white/45 px-1.5">
                  Discover &amp; Rooms
                </p>

                {/* 1. Home & Discover */}
                <button
                  type="button"
                  onClick={() => handleNav('/')}
                  className={`w-full group flex items-center justify-between p-2.5 sm:p-3 rounded-2xl text-xs font-bold transition-all duration-200 active:scale-98 ${
                    location.pathname === '/'
                      ? 'bg-gradient-to-r from-emerald-500/25 via-green-500/15 to-emerald-500/25 border-2 border-emerald-400/80 shadow-[0_0_22px_rgba(34,197,94,0.3)] text-emerald-300'
                      : 'bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.08] hover:border-emerald-500/40 text-white/90'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500/25 to-green-400/15 border border-emerald-400/40 text-emerald-300 flex items-center justify-center text-sm shadow-sm group-hover:scale-105 transition-transform shrink-0">
                      🏠
                    </span>
                    <div className="text-left min-w-0">
                      <p className="font-extrabold text-white text-xs truncate">Home &amp; Discover</p>
                      <p className="text-[10px] text-white/45 font-medium truncate">Browse &amp; create sync rooms</p>
                    </div>
                  </div>
                  <span className="text-white/30 group-hover:text-white group-hover:translate-x-0.5 transition-all text-sm shrink-0">
                    ›
                  </span>
                </button>

                {/* 2. Active Room or Create/Join Room */}
                {roomId ? (
                  <button
                    type="button"
                    onClick={() => handleNav(`/room/${roomId}`)}
                    className="w-full group flex items-center justify-between p-2.5 sm:p-3 rounded-2xl text-xs font-bold bg-gradient-to-r from-green-500 to-emerald-400 text-black shadow-[0_0_20px_rgba(34,197,94,0.5)] transition-all duration-200 active:scale-98"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-9 h-9 rounded-xl bg-black/20 flex items-center justify-center text-sm shrink-0">
                        🎧
                      </span>
                      <div className="text-left min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-black text-black text-xs truncate">Current Room</p>
                          <span className="text-[9px] uppercase font-mono font-black bg-black/20 px-1.5 py-0.5 rounded-md shrink-0">
                            {roomId}
                          </span>
                        </div>
                        <p className="text-[10px] text-black/75 font-semibold truncate">Active playback &amp; chat</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="w-1.5 h-3 bg-black rounded-full animate-bounce" />
                      <span className="w-1.5 h-4 bg-black rounded-full animate-bounce [animation-delay:0.15s]" />
                      <span className="w-1.5 h-2 bg-black rounded-full animate-bounce [animation-delay:0.3s]" />
                    </div>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleNav('/')}
                    className="w-full group flex items-center justify-between p-2.5 sm:p-3 rounded-2xl text-xs font-bold bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.08] hover:border-emerald-500/40 text-white/90 transition-all duration-200 active:scale-98"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/40 text-blue-300 flex items-center justify-center text-sm group-hover:scale-105 transition-transform shrink-0">
                        ➕
                      </span>
                      <div className="text-left min-w-0">
                        <p className="font-extrabold text-white text-xs truncate">Create or Join Room</p>
                        <p className="text-[10px] text-white/45 font-medium truncate">Party code or instant room</p>
                      </div>
                    </div>
                    <span className="text-white/30 group-hover:text-white group-hover:translate-x-0.5 transition-all text-sm shrink-0">
                      ›
                    </span>
                  </button>
                )}
              </div>

              {/* SECTION 2: SOCIAL & COLLECTION */}
              <div className="space-y-1.5 pt-1">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-white/45 px-1.5">
                  Social &amp; Collection
                </p>

                {/* 3. Friends & Directory */}
                <button
                  type="button"
                  onClick={openFriends}
                  className="w-full group flex items-center justify-between p-2.5 sm:p-3 rounded-2xl text-xs font-bold bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.08] hover:border-blue-500/40 text-white/90 transition-all duration-200 active:scale-98"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-400/40 text-blue-300 flex items-center justify-center text-sm group-hover:scale-105 transition-transform shrink-0">
                      👥
                    </span>
                    <div className="text-left min-w-0">
                      <p className="font-extrabold text-white text-xs truncate">Friends &amp; Directory</p>
                      <p className="text-[10px] text-white/45 font-medium truncate">Send &amp; accept requests</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {friendsCount > 0 && (
                      <span className="w-5 h-5 rounded-full bg-blue-500 text-white font-black text-[10px] flex items-center justify-center shadow-sm">
                        {friendsCount}
                      </span>
                    )}
                    <span className="text-white/30 group-hover:text-white group-hover:translate-x-0.5 transition-all text-sm">
                      ›
                    </span>
                  </div>
                </button>

                {/* 4. Favorite Songs */}
                <button
                  type="button"
                  onClick={() => openFavs('favorites')}
                  className="w-full group flex items-center justify-between p-2.5 sm:p-3 rounded-2xl text-xs font-bold bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.08] hover:border-rose-500/40 text-white/90 transition-all duration-200 active:scale-98"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-400/40 text-rose-300 flex items-center justify-center text-sm group-hover:scale-105 transition-transform shrink-0">
                      💖
                    </span>
                    <div className="text-left min-w-0">
                      <p className="font-extrabold text-white text-xs truncate">Favorite Songs</p>
                      <p className="text-[10px] text-white/45 font-medium truncate">Your curated tracks</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {favoritesCount > 0 && (
                      <span className="w-5 h-5 rounded-full bg-rose-500 text-white font-black text-[10px] flex items-center justify-center shadow-sm">
                        {favoritesCount}
                      </span>
                    )}
                    <span className="text-white/30 group-hover:text-white group-hover:translate-x-0.5 transition-all text-sm">
                      ›
                    </span>
                  </div>
                </button>

                {/* 5. Listening History */}
                <button
                  type="button"
                  onClick={() => openFavs('history')}
                  className="w-full group flex items-center justify-between p-2.5 sm:p-3 rounded-2xl text-xs font-bold bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.08] hover:border-amber-500/40 text-white/90 transition-all duration-200 active:scale-98"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 flex items-center justify-center text-sm group-hover:scale-105 transition-transform shrink-0">
                      🕒
                    </span>
                    <div className="text-left min-w-0">
                      <p className="font-extrabold text-white text-xs truncate">Listening History</p>
                      <p className="text-[10px] text-white/45 font-medium truncate">Recently played songs</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {historyCount > 0 && (
                      <span className="w-5 h-5 rounded-full bg-amber-500 text-white font-black text-[10px] flex items-center justify-center shadow-sm">
                        {historyCount}
                      </span>
                    )}
                    <span className="text-white/30 group-hover:text-white group-hover:translate-x-0.5 transition-all text-sm">
                      ›
                    </span>
                  </div>
                </button>
              </div>

              {/* SECTION 3: SETTINGS & APP */}
              <div className="space-y-1.5 pt-1">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-white/45 px-1.5">
                  Settings &amp; App
                </p>

                {/* 6. Profile Customization */}
                <button
                  type="button"
                  onClick={openProfile}
                  className="w-full group flex items-center justify-between p-2.5 sm:p-3 rounded-2xl text-xs font-bold bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.08] hover:border-purple-500/40 text-white/90 transition-all duration-200 active:scale-98"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-400/40 text-purple-300 flex items-center justify-center text-sm group-hover:scale-105 transition-transform shrink-0">
                      👤
                    </span>
                    <div className="text-left min-w-0">
                      <p className="font-extrabold text-white text-xs truncate">Profile Customization</p>
                      <p className="text-[10px] text-white/45 font-medium truncate">Avatar, display name &amp; more</p>
                    </div>
                  </div>
                  <span className="text-white/30 group-hover:text-white group-hover:translate-x-0.5 transition-all text-sm shrink-0">
                    ›
                  </span>
                </button>

                {/* 7. Settings (App Updates, Version & Info) */}
                <button
                  type="button"
                  onClick={handleCheckUpdate}
                  className="w-full group flex items-center justify-between p-2.5 sm:p-3 rounded-2xl text-xs font-bold bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.08] hover:border-emerald-500/40 text-white/90 transition-all duration-200 active:scale-98"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-9 h-9 rounded-xl bg-slate-500/20 border border-slate-400/40 text-slate-300 flex items-center justify-center text-sm group-hover:scale-105 transition-transform shrink-0">
                      ⚙️
                    </span>
                    <div className="text-left min-w-0">
                      <p className="font-extrabold text-white text-xs truncate">Settings &amp; Updates</p>
                      <p className="text-[10px] text-white/45 font-medium truncate">App preferences &amp; version v{CURRENT_APP_VERSION}</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 shrink-0">
                    Check
                  </span>
                </button>
                {updateToast && (
                  <p className="text-[11px] text-emerald-400 font-semibold text-center mt-1 animate-in fade-in duration-200">
                    {updateToast}
                  </p>
                )}

                {/* 8. Privacy Policy */}
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    if (onOpenPrivacy) onOpenPrivacy();
                    else setShowPrivacy(true);
                  }}
                  className="w-full group flex items-center justify-between p-2.5 sm:p-3 rounded-2xl text-xs font-bold bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.08] hover:border-emerald-500/40 text-white/90 transition-all duration-200 active:scale-98"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 flex items-center justify-center text-sm group-hover:scale-105 transition-transform shrink-0">
                      🔒
                    </span>
                    <div className="text-left min-w-0">
                      <p className="font-extrabold text-white text-xs truncate">Privacy Policy</p>
                      <p className="text-[10px] text-white/45 font-medium truncate">Data collection &amp; safety</p>
                    </div>
                  </div>
                  <span className="text-white/30 group-hover:text-white group-hover:translate-x-0.5 transition-all text-sm shrink-0">
                    ›
                  </span>
                </button>

                {/* 9. Android App & TWA Support */}
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    if (onOpenAndroid) onOpenAndroid();
                    else setShowAndroid(true);
                  }}
                  className="w-full group flex items-center justify-between p-2.5 sm:p-3 rounded-2xl text-xs font-bold bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.08] hover:border-green-500/40 text-white/90 transition-all duration-200 active:scale-98"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-9 h-9 rounded-xl bg-green-500/20 border border-green-400/40 text-green-300 flex items-center justify-center text-sm group-hover:scale-105 transition-transform shrink-0">
                      📲
                    </span>
                    <div className="text-left min-w-0">
                      <p className="font-extrabold text-white text-xs truncate">Android App &amp; TWA</p>
                      <p className="text-[10px] text-white/45 font-medium truncate">Native APK &amp; install guide</p>
                    </div>
                  </div>
                  <span className="text-white/30 group-hover:text-white group-hover:translate-x-0.5 transition-all text-sm shrink-0">
                    ›
                  </span>
                </button>

                {/* 10. Install App on Device VIP Card (if not installed) */}
                {!appInstalled && (
                  <button
                    type="button"
                    onClick={async () => {
                      setIsOpen(false);
                      await triggerDirectInstall();
                    }}
                    className="w-full group relative overflow-hidden flex items-center justify-between p-3 rounded-2xl text-xs font-bold bg-gradient-to-r from-emerald-500/20 via-green-500/15 to-emerald-500/20 border border-emerald-400/40 hover:border-emerald-300 transition-all duration-300 active:scale-98 shadow-[0_0_20px_rgba(34,197,94,0.2)]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-9 h-9 rounded-xl bg-emerald-500 text-black flex items-center justify-center text-base shadow-[0_0_10px_rgba(34,197,94,0.5)] group-hover:scale-105 transition-transform shrink-0">
                        ⚡
                      </span>
                      <div className="text-left min-w-0">
                        <p className="font-black text-emerald-300 text-xs truncate">Install App on Device</p>
                        <p className="text-[10px] text-white/60 font-medium truncate">Full screen &amp; zero delay</p>
                      </div>
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-500 text-black px-2 py-0.5 rounded-full shadow-sm shrink-0">
                      Free App
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* Bottom Section: Glowing Red Sign Out & UltraSync Engine Status matching mockup */}
            <div className="pt-3.5 border-t border-white/10 mt-3 space-y-2.5 relative z-10">
              {onSignOut && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onSignOut();
                  }}
                  className="w-full py-2.5 sm:py-3 px-4 rounded-2xl border-2 border-red-500/50 bg-red-500/10 hover:bg-red-500/20 text-red-300 hover:text-white font-extrabold text-xs flex items-center justify-center gap-2 transition-all duration-200 active:scale-95 shadow-[0_0_20px_rgba(239,68,68,0.25)]"
                >
                  <span className="text-sm">🚪</span>
                  <span>Sign Out</span>
                </button>
              )}

              <div className="flex items-center justify-between text-[11px] text-white/40 font-medium px-1">
                <span>TuneTogether v{CURRENT_APP_VERSION}</span>
                <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                  UltraSync Engine Online
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
