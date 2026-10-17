import { Link } from 'react-router-dom';

export default function BrandHeader({ user, onSignOut, showNav = true }) {
  return (
    <header className="flex items-center justify-between py-4 px-2">
      {/* Brand Logo & Name */}
      <Link to="/" className="flex items-center gap-2.5 group">
        <div className="relative w-9 h-9 rounded-full overflow-hidden p-0.5 border-2 border-green-400 shadow-[0_0_12px_rgba(34,197,94,0.7)] group-hover:scale-105 transition">
          <img src="/logo.png" alt="TuneTogether Logo" className="w-full h-full object-cover rounded-full" />
        </div>
        <div className="font-extrabold text-lg sm:text-xl tracking-tight leading-none">
          <span className="text-white">Tune</span>
          <span className="text-green-400 ml-0.5">Together</span>
        </div>
      </Link>

      {/* Right Action */}
      {showNav && (
        <div className="flex items-center gap-2">
          <a
            href="#how-it-works"
            className="text-xs font-semibold px-3.5 py-1.5 rounded-full bg-panel2/80 text-white/80 hover:text-white border border-green-500/20 active:scale-95 transition"
          >
            How it works
          </a>
          {user && (
            <button
              onClick={onSignOut}
              className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition"
              title="Sign Out"
            >
              Sign out
            </button>
          )}
        </div>
      )}
    </header>
  );
}
