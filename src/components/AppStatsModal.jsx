import { useState, useEffect } from 'react';
import { ref, onValue } from '../lib/db';
import { db, isFirebaseConfigured } from '../firebase';

export default function AppStatsModal({ onClose }) {
  const [installCount, setInstallCount] = useState(0);
  const [installsList, setInstallsList] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [onlineCount, setOnlineCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }

    // 1. Total Installs counter
    const statsRef = ref(db, 'app_stats/installCount');
    const unsubStats = onValue(statsRef, (snap) => {
      setInstallCount(Number(snap.val()) || 0);
    });

    // 2. Individual installs list
    const installsRef = ref(db, 'app_installs');
    const unsubInstalls = onValue(installsRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const list = Object.entries(data).map(([key, val]) => ({
          id: key,
          ...val,
        }));
        list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        setInstallsList(list);
      } else {
        setInstallsList([]);
      }
    });

    // 3. Total Users & Online users
    const usersRef = ref(db, 'users');
    const unsubUsers = onValue(usersRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const uids = Object.keys(data);
        setTotalUsers(uids.length);

        let online = 0;
        uids.forEach((uid) => {
          if (data[uid]?.presence?.online === true) {
            online += 1;
          }
        });
        setOnlineCount(online);
      }
      setLoading(false);
    });

    return () => {
      unsubStats();
      unsubInstalls();
      unsubUsers();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[350] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-panel border border-green-500/30 rounded-3xl p-5 sm:p-6 shadow-[0_0_50px_rgba(34,197,94,0.25)] relative text-white flex flex-col max-h-[90vh]">
        {/* Close Button */}
        <button
          onClick={onClose}
          type="button"
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-panel2 text-white/60 hover:text-white flex items-center justify-center transition"
          aria-label="Close"
        >
          ✕
        </button>

        {/* Header */}
        <div className="flex items-center gap-2.5 mb-4">
          <span className="text-2xl">📊</span>
          <div>
            <h2 className="text-lg font-extrabold text-white leading-tight">App Analytics &amp; Installs</h2>
            <p className="text-xs text-white/50">Real-time user &amp; PWA install metrics</p>
          </div>
        </div>

        {/* Big Metrics Grid */}
        <div className="grid grid-cols-3 gap-2.5 mb-5">
          {/* Metric 1: Total Installs */}
          <div className="bg-gradient-to-b from-green-500/20 to-panel2/80 border border-green-500/40 rounded-2xl p-3 text-center shadow-[0_0_15px_rgba(34,197,94,0.15)]">
            <span className="text-lg">📲</span>
            <p className="text-2xl font-black text-green-400 mt-0.5">
              {loading ? '…' : Math.max(installCount, installsList.length)}
            </p>
            <p className="text-[10px] uppercase font-bold text-white/60 tracking-wider">
              App Installs
            </p>
          </div>

          {/* Metric 2: Total Registered Users */}
          <div className="bg-panel2/80 border border-white/10 rounded-2xl p-3 text-center">
            <span className="text-lg">👥</span>
            <p className="text-2xl font-black text-white mt-0.5">
              {loading ? '…' : totalUsers}
            </p>
            <p className="text-[10px] uppercase font-bold text-white/60 tracking-wider">
              Total Users
            </p>
          </div>

          {/* Metric 3: Online Users */}
          <div className="bg-panel2/80 border border-white/10 rounded-2xl p-3 text-center">
            <span className="text-lg">🟢</span>
            <p className="text-2xl font-black text-emerald-400 mt-0.5">
              {loading ? '…' : onlineCount}
            </p>
            <p className="text-[10px] uppercase font-bold text-white/60 tracking-wider">
              Online Now
            </p>
          </div>
        </div>

        {/* Detailed Installs Feed */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white/70">
              Installed Devices ({installsList.length})
            </h3>
            <span className="text-[10px] text-green-400 font-mono">Live synced</span>
          </div>

          <div className="overflow-y-auto space-y-2 pr-1 flex-1">
            {installsList.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-2xl mb-1.5">📲</p>
                <p className="text-xs font-bold text-white/70">No installs recorded yet</p>
                <p className="text-[11px] text-white/40 mt-1 max-w-xs mx-auto">
                  When you or your friends tap "Install App" or add TuneTogether to the home screen, each install will appear here instantly!
                </p>
              </div>
            ) : (
              installsList.map((item) => (
                <div
                  key={item.id}
                  className="bg-panel2/60 border border-white/5 rounded-2xl p-3 flex items-center justify-between gap-3 hover:border-green-500/30 transition"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-8 h-8 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 flex items-center justify-center text-sm shrink-0">
                      {item.platform?.includes('iOS')
                        ? '🍎'
                        : item.platform?.includes('Android')
                        ? '🤖'
                        : '💻'}
                    </span>
                    <div className="min-w-0">
                      <p className="font-bold text-xs text-white truncate">{item.userName}</p>
                      <p className="text-[10.5px] text-white/50 truncate">
                        {item.platform} ·{' '}
                        {item.timestamp
                          ? new Date(item.timestamp).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Installed'}
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] font-bold text-green-400 bg-green-500/15 border border-green-500/30 px-2 py-0.5 rounded-full shrink-0">
                    Installed ✓
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Firebase Console Explanation Tip */}
        <div className="mt-4 pt-3 border-t border-white/10 text-center">
          <p className="text-[11px] text-white/50 leading-relaxed">
            🔥 <strong>Firebase Console-এ দেখতে:</strong> Firebase Console &gt; Realtime Database &gt;{' '}
            <code className="text-green-400 font-mono">/app_installs</code> অথবা{' '}
            <code className="text-green-400 font-mono">/app_stats/installCount</code>-এ সব ডাটা দেখতে পাবেন।
          </p>
        </div>
      </div>
    </div>
  );
}
