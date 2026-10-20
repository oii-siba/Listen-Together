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
        {/* Brand Logo & Name */}
        <Link to="/" className="flex items-center gap-2 sm:gap-2.5 group shrink-0 min-w-0">
          <div className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden p-0.5 border-2 border-green-400 shadow-[0_0_12px_rgba(34,197,94,0.7)] group-hover:scale-105 transition shrink-0">
            <img src="/logo.png" alt="TuneTogether Logo" className="w-full h-full object-cover rounded-full" />
          </div>
          <div className="font-extrabold text-base sm:text-xl tracking-tight leading-none">
            <span className="text-white">Tune</span>
            <span className="text-green-400 ml-0.5">Together</span>
          </div>
        </Link>

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
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-panel border border-white/10 flex items-center justify-center text-white/80 hover:text-white active:scale-95 transition"
                  title="Friends"
                >
                  <span className="text-xs sm:text-base">👥</span>
                </button>

                {/* Profile Avatar / Customization */}
                <button
                  type="button"
                  onClick={() => setShowProfile(true)}
                  className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden border border-green-400/80 shadow-[0_0_10px_rgba(34,197,94,0.4)] active:scale-95 transition hidden sm:inline-block"
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
                    className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-green-500/15 hover:bg-green-500/25 border border-green-500/40 text-green-300 hover:text-green-200 text-[11px] sm:text-xs font-bold transition shadow-[0_0_12px_rgba(34,197,94,0.2)] active:scale-95"
                    title="Direct Install App"
                  >
                    <span className="text-xs sm:text-sm">📲</span>
                    <span className="hidden md:inline">Install App</span>
                    <span className="md:hidden">Install</span>
                  </button>
                )}

                {/* Navigation Menu Bar Drawer Button */}
                <MenuBar user={user} onSignOut={onSignOut} onUpdateUser={onUpdateUser} />
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
