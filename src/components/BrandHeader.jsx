import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import NotificationCenter from './NotificationCenter';
import FriendsModal from './FriendsModal';
import ProfileModal from './ProfileModal';
import MenuBar from './MenuBar';
import { isInstalled, triggerDirectInstall } from '../lib/pwa';

export default function BrandHeader({ user, onSignOut, showNav = true, onUpdateUser }) {
  const [showFriends, setShowFriends] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    setInstalled(isInstalled());
    const onInstalled = () => setInstalled(true);
    window.addEventListener('tt-installed', onInstalled);
    return () => window.removeEventListener('tt-installed', onInstalled);
  }, []);

  return (
    <>
      <header className="flex items-center justify-between py-3 sm:py-4 px-1 sm:px-2 w-full">
        {/* Left: Menu Bar Drawer Button + Brand Logo & Name */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0">
          {user && (
            <MenuBar user={user} onSignOut={onSignOut} onUpdateUser={onUpdateUser} />
          )}
          <Link to="/" className="flex items-center gap-2.5 sm:gap-3 group shrink-0 min-w-0">
            <div className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden p-0.5 border border-[#00FF87] shadow-[0_0_14px_rgba(0,255,135,0.45)] group-hover:scale-105 transition shrink-0 bg-black">
              <img src="/logo.png" alt="TuneTogether Logo" className="w-full h-full object-cover rounded-full" />
            </div>
            <div className="flex flex-col leading-none">
              <div className="font-extrabold text-base sm:text-xl tracking-tight">
                <span className="text-[#F5F7F5]">Tune</span>
                <span className="text-[#00FF87] ml-0.5">Together</span>
              </div>
              <span className="text-[8.5px] font-semibold text-[#9AA59F] tracking-[0.14em] uppercase mt-0.5 hidden xs:inline-block">
                MUSIC BRINGS US CLOSER
              </span>
            </div>
          </Link>
        </div>

        {/* Right Actions */}
        {showNav && (
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {user ? (
              <>
                {/* Notification Center */}
                <NotificationCenter user={user} />

                {/* Friends Button */}
                <button
                  type="button"
                  onClick={() => setShowFriends(true)}
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#0A100D]/90 border border-white/10 hover:border-[#00FF87]/40 flex items-center justify-center text-white/80 hover:text-white active:scale-95 transition shadow-md"
                  title="Friends"
                >
                  <span className="text-xs sm:text-base">👥</span>
                </button>

                {/* Profile Avatar / Customization */}
                <button
                  type="button"
                  onClick={() => setShowProfile(true)}
                  className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden border border-[#00FF87]/70 shadow-[0_0_12px_rgba(0,255,135,0.35)] active:scale-95 transition hidden sm:inline-block hover:scale-105"
                  title="Customize Profile"
                >
                  <img
                    src={user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`}
                    alt={user.displayName || 'User'}
                    className="w-full h-full object-cover"
                  />
                </button>

                {/* Front Direct Install App Button */}
                {!installed && (
                  <button
                    type="button"
                    onClick={triggerDirectInstall}
                    className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full bg-[#00FF87]/15 hover:bg-[#00FF87]/25 border border-[#00FF87]/40 text-[#00FF87] hover:text-white text-[11px] sm:text-xs font-bold transition shadow-[0_0_14px_rgba(0,255,135,0.25)] active:scale-95"
                    title="Direct Install App"
                  >
                    <span className="text-xs sm:text-sm">📲</span>
                    <span className="hidden md:inline">Install App</span>
                    <span className="md:hidden">Install</span>
                  </button>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2">
                {!installed && (
                  <button
                    type="button"
                    onClick={triggerDirectInstall}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 text-green-300 hover:text-green-200 text-xs font-bold transition shadow-[0_0_12px_rgba(34,197,94,0.2)] active:scale-95"
                    title="Direct Install App"
                  >
                    <span className="text-sm">📲</span>
                    <span>Install App</span>
                  </button>
                )}
                <a
                  href="#how-it-works"
                  className="text-xs font-semibold px-3.5 py-1.5 rounded-full bg-panel2/80 text-white/80 hover:text-white border border-green-500/20 active:scale-95 transition hidden xs:inline-block"
                >
                  How it works
                </a>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Friends Modal */}
      {showFriends && (
        <FriendsModal
          user={user}
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
    </>
  );
}
