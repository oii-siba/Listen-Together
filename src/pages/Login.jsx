import { useState } from 'react';
import { useAuth } from '../AuthContext';
import { isInAppBrowser } from '../lib/utils';

function GoogleG() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

export default function Login() {
  const { signIn, isFirebaseConfigured } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inApp = isInAppBrowser();

  async function go() {
    setBusy(true);
    setError('');
    const err = await signIn();
    if (err) setError(err);
    setBusy(false);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      window.prompt('Copy this link and open it in Chrome / Safari:', window.location.href);
    }
  }

  return (
    <div className="min-h-[100dvh] max-w-md mx-auto px-4 sm:px-6 py-8 sm:py-10 flex flex-col justify-center text-[#F5F7F5] font-sans pt-safe pb-safe relative">
      <div className="text-center flex flex-col items-center">
        {/* TuneTogether Official Logo with glowing emerald aura */}
        <div className="relative w-24 h-24 rounded-full overflow-hidden p-1 border-2 border-[#00FF87] shadow-[0_0_35px_rgba(0,255,135,0.65)] animate-pulse bg-black">
          <img src="/logo.png" alt="TuneTogether Logo" className="w-full h-full object-cover rounded-full" />
        </div>

        {/* Brand Tagline Badge */}
        <div className="mt-5 inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#00FF87]/10 border border-[#00FF87]/30 text-[#00FF87] text-[10.5px] font-bold tracking-wider uppercase shadow-[0_0_12px_rgba(0,255,135,0.2)]">
          ★ MUSIC BRINGS US CLOSER
        </div>

        <h1 className="mt-3.5 text-3xl sm:text-4xl font-black tracking-tight">
          Tune<span className="text-[#00FF87] neon-text-glow">Together</span>
        </h1>
        <p className="mt-1.5 text-sm text-[#9AA59F] max-w-xs leading-relaxed">
          Listen to YouTube songs together in real-time sync with friends.
        </p>
      </div>

      <div className="mt-8 glass-card rounded-[32px] p-6 sm:p-7 border border-white/10 shadow-2xl">
        <p className="text-xs text-[#9AA59F] text-center leading-relaxed">
          Sign in with Google to create rooms, invite friends, and save favorites.
        </p>

        <button
          onClick={go}
          disabled={busy}
          className="mt-5 w-full flex items-center justify-center gap-3 bg-white text-black font-extrabold rounded-full py-3.5 active:scale-[0.98] transition disabled:opacity-60 hover:bg-neutral-100 shadow-[0_0_20px_rgba(255,255,255,0.25)] cursor-pointer text-sm"
        >
          <GoogleG />
          <span>{busy ? 'Connecting to Google…' : 'Continue with Google'}</span>
        </button>

        {error && <p className="mt-3 text-xs text-red-400 text-center font-medium">{error}</p>}
      </div>


      {(inApp || (error && isFirebaseConfigured)) && (
        <div className="mt-5 bg-amber-500/10 border border-amber-500/30 text-amber-200 rounded-2xl p-4 text-xs">
          <p>
            Google sign-in often doesn’t work inside in-app browsers (Instagram, WhatsApp, Facebook). Open this link directly in <b>Chrome</b> or <b>Safari</b>.
          </p>
          <button onClick={copyLink} className="mt-2 text-green-400 underline font-semibold">
            Copy link
          </button>
        </div>
      )}
    </div>
  );
}
