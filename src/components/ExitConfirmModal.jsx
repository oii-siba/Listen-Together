import { usePlayback } from '../context/PlaybackContext';

export default function ExitConfirmModal({ isOpen, onClose }) {
  const { activeRoomId, playback, leaveRoom } = usePlayback();

  if (!isOpen) return null;

  const handleExitAndStop = async () => {
    onClose();
    await leaveRoom();
    // Allow browser back
    window.history.back();
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-sm max-h-[92vh] overflow-y-auto bg-[#0d1410] border border-green-500/40 rounded-3xl p-5 sm:p-6 shadow-[0_20px_60px_rgba(0,0,0,0.9)] text-center animate-in zoom-in-95 duration-200">
        <div className="w-16 h-16 rounded-full bg-green-500/15 border border-green-500/30 text-3xl grid place-items-center mx-auto shadow-[0_0_20px_rgba(34,197,94,0.3)]">
          🎧
        </div>

        <h3 className="mt-4 text-lg font-extrabold text-white">
          Music is Still Playing!
        </h3>
        <p className="text-xs text-green-400 font-medium mt-1">
          Room #{activeRoomId} · {playback?.title || 'Now Playing'}
        </p>

        <div className="mt-4 p-3.5 rounded-2xl bg-white/5 border border-white/10 text-left space-y-2">
          <p className="text-xs text-white/90 leading-relaxed font-semibold">
            💡 Using other apps (WhatsApp, Facebook)?
          </p>
          <p className="text-[11px] text-white/60 leading-relaxed">
            Pressing your browser's <strong>Back</strong> button will leave the room and stop the music. To keep listening in the background, press your phone's <strong>Home</strong> button or minimize the app!
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3.5 rounded-full bg-green-500 text-black font-extrabold text-sm hover:brightness-110 active:scale-95 transition shadow-[0_0_20px_rgba(34,197,94,0.5)]"
          >
            🎵 Keep Listening
          </button>

          <button
            type="button"
            onClick={handleExitAndStop}
            className="w-full py-2.5 rounded-full bg-white/5 hover:bg-red-500/20 text-white/50 hover:text-red-400 text-xs font-semibold border border-white/10 transition active:scale-95"
          >
            ✕ Exit &amp; Stop Music
          </button>
        </div>
      </div>
    </div>
  );
}
