import { useState } from 'react';
import { useAuth } from '../AuthContext';
import { isInAppBrowser } from '../lib/utils';
import { Music } from '../components/Icons';

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
  const { signIn, signInDemo, isFirebaseConfigured } = useAuth();
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
    <div className="min-h-[100dvh] max-w-md mx-auto px-6 py-10 flex flex-col justify-center">
      <div className="text-center">
        <div className="mx-auto w-20 h-20 rounded-3xl bg-accent text-black grid place-items-center shadow-lg shadow-accent/20">
          <Music size={44} />
        </div>
        <h1 className="mt-6 text-3xl font-extrabold tracking-tight">Listen Together</h1>
        <p className="mt-2 text-white/60">Play a YouTube song — everyone with the link hears it at the same time.</p>
      </div>

      {/* Mode Badge */}
      <div className="mt-6 flex items-center justify-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
            isFirebaseConfigured
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isFirebaseConfigured ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
            }`}
          />
          {isFirebaseConfigured ? 'Firebase Connected' : 'Localhost Demo Mode (Broadcast Sync)'}
        </span>
      </div>

      <div className="mt-6 bg-panel rounded-2xl p-5 border border-white/5 shadow-xl">
        <p className="text-sm text-white/70">
          We use Google sign-in only to know who is in the room. We ask for just your <b>name</b>, <b>email</b> and{' '}
          <b>profile photo</b> — nothing else.
        </p>

        {isFirebaseConfigured ? (
          <button
            onClick={go}
            disabled={busy}
            className="mt-4 w-full flex items-center justify-center gap-3 bg-white text-black font-semibold rounded-full py-3.5 active:scale-[0.98] transition disabled:opacity-60 hover:bg-neutral-100"
          >
            <GoogleG />
            {busy ? 'Opening Google…' : 'Continue with Google'}
          </button>
        ) : (
          <div className="mt-4 space-y-2.5">
            <button
              onClick={() => signInDemo('Alex (Host)', 'demo-host')}
              className="w-full flex items-center justify-center gap-2 bg-accent text-black font-bold rounded-full py-3 active:scale-[0.98] transition hover:brightness-105 shadow-md shadow-accent/20"
            >
              <span>👑</span> Continue as Alex (Host)
            </button>
            <button
              onClick={() => signInDemo('Sam (Guest)', 'demo-guest')}
              className="w-full flex items-center justify-center gap-2 bg-panel2 text-white font-semibold rounded-full py-3 active:scale-[0.98] transition hover:bg-panel2/80 border border-white/10"
            >
              <span>🎧</span> Continue as Sam (Guest)
            </button>
          </div>
        )}

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      </div>

      {/* Demo Switch for quick multi-tab testing even when configured */}
      {isFirebaseConfigured && (
        <div className="mt-3 text-center">
          <button
            onClick={() => signInDemo('Alex (Demo Host)', 'demo-host')}
            className="text-xs text-white/40 hover:text-white/70 transition underline"
          >
            Or test quickly with a local demo user
          </button>
        </div>
      )}

      {/* Setup Guide Collapsible */}
      {!isFirebaseConfigured && (
        <div className="mt-4 bg-panel2/60 border border-white/10 rounded-2xl p-4 text-xs">
          <div
            onClick={() => setShowSetup((v) => !v)}
            className="flex items-center justify-between cursor-pointer text-white/80 font-medium"
          >
            <span>🛠️ How to connect real Firebase for phones</span>
            <span>{showSetup ? '▲' : '▼'}</span>
          </div>

          {showSetup && (
            <div className="mt-3 space-y-2 text-white/60 leading-relaxed border-t border-white/10 pt-3">
              <p>
                To sync across different phones anywhere on the internet, add your credentials to{' '}
                <code className="text-accent bg-black/40 px-1 py-0.5 rounded">.env</code>:
              </p>
              <ol className="list-decimal list-inside space-y-1 pl-1">
                <li>Create project at <span className="text-white/90">console.firebase.google.com</span></li>
                <li>Enable <span className="text-white/90">Google Sign-in</span> in Authentication</li>
                <li>Create a <span className="text-white/90">Realtime Database</span></li>
                <li>Copy values from Project Settings → Web App into <span className="text-white/90">.env</span></li>
              </ol>
              <p className="text-[11px] text-white/40 pt-1">
                Meanwhile, you can test complete synchronized playback between two browser tabs right now using the buttons above!
              </p>
            </div>
          )}
        </div>
      )}

      {(inApp || (error && isFirebaseConfigured)) && (
        <div className="mt-4 bg-amber-500/10 border border-amber-500/30 text-amber-200 rounded-2xl p-4 text-sm">
          <p>
            Google sign-in often doesn’t work inside in-app browsers (Instagram, Facebook, some chat apps). If it fails, open
            this page in <b>Chrome</b> or <b>Safari</b>.
          </p>
          <button onClick={copyLink} className="mt-2 underline font-medium">
            Copy link
          </button>
        </div>
      )}
    </div>
  );
}
