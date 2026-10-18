export default function PrivacyModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg max-h-[85vh] bg-[#0d1611] border border-green-500/40 rounded-3xl p-6 shadow-2xl flex flex-col z-10 animate-in zoom-in-95 duration-200 text-white overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-green-500/20 text-green-400 flex items-center justify-center text-sm border border-green-500/30">
              🔒
            </span>
            <div>
              <h2 className="font-extrabold text-base text-white leading-tight">Privacy Policy</h2>
              <p className="text-[10px] text-green-400 font-semibold">TuneTogether Data &amp; Security</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-white/60 hover:text-white flex items-center justify-center transition active:scale-90"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto py-4 space-y-4 pr-1 text-xs text-white/75 leading-relaxed custom-scrollbar">
          <div className="bg-white/5 rounded-2xl p-3.5 border border-white/10">
            <h3 className="font-bold text-white text-xs mb-1">1. Account &amp; Profile Data</h3>
            <p>
              We use Google Sign-In to verify your identity. Only your Display Name, Avatar, and Email are used to render your active presence to your friends in the listening room. We never access your Google account password.
            </p>
          </div>

          <div className="bg-white/5 rounded-2xl p-3.5 border border-white/10">
            <h3 className="font-bold text-white text-xs mb-1">2. YouTube Streaming &amp; Terms</h3>
            <p>
              TuneTogether plays music through the official YouTube IFrame Player API. No songs or videos are downloaded or hosted on our servers. By using TuneTogether, you adhere to the YouTube Terms of Service and Google Privacy Policy.
            </p>
          </div>

          <div className="bg-white/5 rounded-2xl p-3.5 border border-white/10">
            <h3 className="font-bold text-white text-xs mb-1">3. Ephemeral Room Sessions</h3>
            <p>
              Playback states, queue items, emoji reactions, and room chats are strictly tied to the room code. When a host ends the room, all room session data is permanently removed.
            </p>
          </div>

          <div className="bg-white/5 rounded-2xl p-3.5 border border-white/10">
            <h3 className="font-bold text-white text-xs mb-1">4. Spam Protection &amp; Anti-Abuse</h3>
            <p>
              Automated client-side rate limiters protect the room against spam messages, queue flooding, and reaction storms. Hosts retain full rights to manage permissions and participants.
            </p>
          </div>

          <div className="bg-white/5 rounded-2xl p-3.5 border border-white/10">
            <h3 className="font-bold text-white text-xs mb-1">5. Contact &amp; Inquiries</h3>
            <p>
              For privacy requests or data deletion questions, email us at <span className="text-green-400 font-bold">support@tunetogether.app</span>.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-between shrink-0">
          <a
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-green-400 hover:underline font-semibold"
          >
            Open Full Page Policy ↗
          </a>
          <button
            onClick={onClose}
            className="py-2 px-5 rounded-full bg-green-500 text-black font-extrabold text-xs hover:brightness-110 active:scale-95 transition"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
