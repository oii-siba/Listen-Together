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
  const [showSetup, setShowSetup] = useState(!isFirebaseConfigured);
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
    <div className="min-h-[100dvh] max-w-md mx-auto px-6 py-10 flex flex-col justify-center text-white font-sans">
      <div className="text-center flex flex-col items-center">
        {/* TuneTogether Official Logo with glowing aura */}
        <div className="relative w-24 h-24 rounded-full overflow-hidden p-1 border-2 border-green-400 shadow-[0_0_35px_rgba(34,197,94,0.7)] animate-pulse">
          <img src="/logo.png" alt="TuneTogether Logo" className="w-full h-full object-cover rounded-full" />
        </div>

        {/* Brand Tagline Badge */}
        <div className="mt-5 inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-green-500/10 border border-green-500/30 text-green-400 text-[10px] font-bold tracking-wider uppercase">
          ★ ONE BEAT. ONE CONNECTION.
        </div>

        <h1 className="mt-3 text-3xl font-extrabold tracking-tight">
          Tune<span className="text-green-400">Together</span>
        </h1>
        <p className="mt-1.5 text-sm text-white/60 max-w-xs">
          Listen to YouTube songs together in real-time with friends.
        </p>
      </div>

      <div className="mt-8 bg-panel rounded-[24px] p-6 border border-white/10 shadow-xl">
        <p className="text-xs text-white/70 text-center leading-relaxed">
          Sign in with Google to enter or create rooms. We only request your <b>name</b>, <b>email</b>, and <b>profile photo</b>.
        </p>

        <button
          onClick={go}
          disabled={busy}
          className="mt-5 w-full flex items-center justify-center gap-3 bg-white text-black font-bold rounded-full py-3.5 active:scale-[0.98] transition disabled:opacity-60 hover:bg-neutral-100 shadow-md"
        >
          <GoogleG />
          {busy ? 'Connecting to Google…' : 'Continue with Google'}
        </button>

        {error && <p className="mt-3 text-xs text-red-400 text-center">{error}</p>}
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
