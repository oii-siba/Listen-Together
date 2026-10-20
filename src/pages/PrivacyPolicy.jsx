import { Link } from 'react-router-dom';
import { Back } from '../components/Icons';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-[100dvh] max-w-2xl lg:max-w-3xl mx-auto px-4 sm:px-6 pt-safe pb-safe text-white font-sans">
      {/* Top Bar */}
      <header className="flex items-center gap-3 pb-6 border-b border-white/10">
        <Link
          to="/"
          className="w-10 h-10 rounded-full bg-panel border border-white/10 grid place-items-center active:scale-95 transition text-white/80 hover:text-white"
          aria-label="Back to Home"
        >
          <Back size={20} />
        </Link>
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="TuneTogether" className="w-7 h-7 rounded-full border border-green-400" />
          <h1 className="text-lg font-black tracking-tight text-white">
            Tune<span className="text-green-400">Together</span> Privacy Policy
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="mt-8 space-y-8">
        <div className="rounded-2xl bg-panel border border-green-500/30 p-5 shadow-[0_0_25px_rgba(34,197,94,0.1)]">
          <p className="text-xs font-bold text-green-400 uppercase tracking-widest">Effective Date: October 2026</p>
          <h2 className="text-2xl font-extrabold text-white mt-1.5">Your Privacy Is Our Priority</h2>
          <p className="text-xs text-white/70 mt-2 leading-relaxed">
            TuneTogether is committed to protecting your privacy. This Privacy Policy explains what information we collect, how it is used, and how we protect your personal data when you use TuneTogether to listen to synchronized YouTube music with your friends.
          </p>
        </div>

        {/* Section 1 */}
        <section className="space-y-3">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-green-500/20 text-green-400 text-xs font-black flex items-center justify-center border border-green-500/30">
              1
            </span>
            Information We Collect
          </h3>
          <div className="bg-panel/70 border border-white/10 rounded-2xl p-4 text-xs text-white/70 leading-relaxed space-y-2">
            <p>
              When you sign in using <strong>Google Sign-In (Firebase Authentication)</strong>, we receive your basic public profile details:
            </p>
            <ul className="list-disc list-inside space-y-1 text-white/80 pl-2">
              <li><strong>Display Name</strong> (to identify you in the room and chat)</li>
              <li><strong>Email Address</strong> (for account authentication)</li>
              <li><strong>Profile Photo URL</strong> (displayed to your friends in the active listening room)</li>
              <li><strong>Unique Firebase UID</strong> (to safely manage your friends, favorites, and history)</li>
            </ul>
            <p className="text-[11px] text-white/50 pt-1">
              We do <strong>not</strong> collect or store your Google account password. Authentication is handled securely through Google OAuth 2.0.
            </p>
          </div>
        </section>

        {/* Section 2 */}
        <section className="space-y-3">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-green-500/20 text-green-400 text-xs font-black flex items-center justify-center border border-green-500/30">
              2
            </span>
            YouTube API Services &amp; Music Playback
          </h3>
          <div className="bg-panel/70 border border-white/10 rounded-2xl p-4 text-xs text-white/70 leading-relaxed space-y-2">
            <p>
              TuneTogether uses the <strong>YouTube IFrame Player API</strong> to stream music. By using TuneTogether, you also agree to be bound by the{' '}
              <a
                href="https://www.youtube.com/t/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-400 hover:underline font-semibold"
              >
                YouTube Terms of Service
              </a>{' '}
              and the{' '}
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-400 hover:underline font-semibold"
              >
                Google Privacy Policy
              </a>.
            </p>
            <p>
              TuneTogether does not download, rip, or host any audio or video files on its servers. All audio streams originate directly from YouTube CDN to the user&apos;s browser in accordance with YouTube Developer Policies.
            </p>
          </div>
        </section>

        {/* Section 3 */}
        <section className="space-y-3">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-green-500/20 text-green-400 text-xs font-black flex items-center justify-center border border-green-500/30">
              3
            </span>
            Realtime Room Data &amp; Ephemeral Sessions
          </h3>
          <div className="bg-panel/70 border border-white/10 rounded-2xl p-4 text-xs text-white/70 leading-relaxed space-y-2">
            <p>
              To synchronize music and facilitate group chat:
            </p>
            <ul className="list-disc list-inside space-y-1 text-white/80 pl-2">
              <li><strong>Playback Timestamp &amp; State:</strong> We store the current song ID, position, and play/pause state in Google Firebase Realtime Database.</li>
              <li><strong>Room Chat &amp; Emoji Reactions:</strong> Live chat messages are shared only with users inside the same room code. Chat messages are temporary and deleted when the room is ended.</li>
              <li><strong>Room Presence:</strong> When you disconnect or leave a room, your presence is automatically removed using Firebase onDisconnect hooks.</li>
            </ul>
          </div>
        </section>

        {/* Section 4 */}
        <section className="space-y-3">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-green-500/20 text-green-400 text-xs font-black flex items-center justify-center border border-green-500/30">
              4
            </span>
            Local Storage &amp; Cookies
          </h3>
          <div className="bg-panel/70 border border-white/10 rounded-2xl p-4 text-xs text-white/70 leading-relaxed space-y-2">
            <p>
              TuneTogether uses standard HTML5 LocalStorage and SessionStorage strictly for local application preferences:
            </p>
            <ul className="list-disc list-inside space-y-1 text-white/80 pl-2">
              <li>Your custom sync timing offset calibration (Sync Nudge)</li>
              <li>Recent song search queries on your device</li>
              <li>PWA application install prompt preferences</li>
              <li>Active listening room recovery on page refresh</li>
            </ul>
            <p className="text-[11px] text-white/50 pt-1">
              We do <strong>not</strong> use tracking cookies or sell your activity to third-party ad networks.
            </p>
          </div>
        </section>

        {/* Section 5 */}
        <section className="space-y-3">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-green-500/20 text-green-400 text-xs font-black flex items-center justify-center border border-green-500/30">
              5
            </span>
            Room Security &amp; Spam Protection
          </h3>
          <div className="bg-panel/70 border border-white/10 rounded-2xl p-4 text-xs text-white/70 leading-relaxed space-y-2">
            <p>
              We implement proactive measures to ensure a safe and spam-free experience:
            </p>
            <ul className="list-disc list-inside space-y-1 text-white/80 pl-2">
              <li><strong>Host Authority:</strong> The room host retains full permission control over song queues, chat permissions, and ending sessions.</li>
              <li><strong>Automated Rate Limiting:</strong> Chat messages, reactions, and song queue additions are rate-limited to prevent flooding and abuse.</li>
              <li><strong>Anti-Tampering:</strong> Critical playback states and database rules enforce authentication and parameter bounds.</li>
            </ul>
          </div>
        </section>

        {/* Section 6 */}
        <section className="space-y-3">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-green-500/20 text-green-400 text-xs font-black flex items-center justify-center border border-green-500/30">
              6
            </span>
            Data Deletion &amp; Contact Us
          </h3>
          <div className="bg-panel/70 border border-white/10 rounded-2xl p-4 text-xs text-white/70 leading-relaxed space-y-2">
            <p>
              You have the right to request deletion of your account and personal history at any time. Simply sign out or clear your history from the Profile &amp; Collection menu.
            </p>
            <p>
              If you have any questions or feedback regarding this Privacy Policy, please contact our team at{' '}
              <a href="mailto:tunetogether.support@gmail.com" className="text-green-400 font-bold hover:underline">
                tunetogether.support@gmail.com
              </a>.
            </p>
          </div>
        </section>

        <div className="pt-6 border-t border-white/10 text-center">
          <Link
            to="/"
            className="inline-block py-3 px-8 rounded-full bg-green-500 text-black font-extrabold text-sm shadow-[0_0_20px_rgba(34,197,94,0.4)] hover:brightness-110 active:scale-95 transition"
          >
            Back to TuneTogether
          </Link>
        </div>
      </main>
    </div>
  );
}
