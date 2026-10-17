import { useState, useEffect } from 'react';
import { getUserProfile, saveUserProfile, getFavoriteSongs, getListeningHistory, getFriendsList } from '../lib/userData';

const AVATAR_PRESETS = [
  'https://api.dicebear.com/7.x/bottts/svg?seed=music1',
  'https://api.dicebear.com/7.x/bottts/svg?seed=neonbeat',
  'https://api.dicebear.com/7.x/bottts/svg?seed=synthwave',
  'https://api.dicebear.com/7.x/bottts/svg?seed=djparty',
  'https://api.dicebear.com/7.x/bottts/svg?seed=bassboost',
  'https://api.dicebear.com/7.x/bottts/svg?seed=alex',
];

export default function ProfileModal({ user, onClose, onUpdateUser }) {
  const [profile, setProfile] = useState(() => getUserProfile(user?.uid, user));
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState('');
  const [genre, setGenre] = useState('');
  const [savedMsg, setSavedMsg] = useState(false);

  const favorites = getFavoriteSongs(user?.uid);
  const history = getListeningHistory(user?.uid);
  const friends = getFriendsList(user?.uid);

  useEffect(() => {
    if (!user) return;
    const p = getUserProfile(user.uid, user);
    setProfile(p);
    setName(p.displayName || user.displayName || 'Music Fan');
    setBio(p.bio || 'Vibing with friends on TuneTogether 🎧');
    setSelectedPhoto(p.photoURL || user.photoURL || AVATAR_PRESETS[0]);
    setGenre(p.favoriteGenre || 'Lo-Fi & Pop');
  }, [user]);

  const handleSave = async (e) => {
    e.preventDefault();
    const updated = {
      ...profile,
      displayName: name.trim() || 'Music Fan',
      bio: bio.trim(),
      photoURL: selectedPhoto,
      favoriteGenre: genre,
    };
    await saveUserProfile(user.uid, updated);
    setProfile(updated);
    if (onUpdateUser) {
      onUpdateUser(updated);
    }
    setSavedMsg(true);
    setTimeout(() => {
      setSavedMsg(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-panel border border-white/10 rounded-3xl p-5 sm:p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          type="button"
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-panel2 text-white/60 hover:text-white flex items-center justify-center transition"
        >
          ✕
        </button>

        <h2 className="text-lg font-extrabold text-white mb-1">Customize Profile</h2>
        <p className="text-xs text-white/50 mb-5">Personalize your TuneTogether identity</p>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          <div className="bg-panel2/60 border border-white/5 rounded-2xl p-2.5 text-center">
            <p className="text-lg font-extrabold text-green-400">{favorites.length}</p>
            <p className="text-[10px] text-white/50 uppercase font-bold tracking-wider mt-0.5">Favorites</p>
          </div>
          <div className="bg-panel2/60 border border-white/5 rounded-2xl p-2.5 text-center">
            <p className="text-lg font-extrabold text-green-400">{history.length}</p>
            <p className="text-[10px] text-white/50 uppercase font-bold tracking-wider mt-0.5">Listened</p>
          </div>
          <div className="bg-panel2/60 border border-white/5 rounded-2xl p-2.5 text-center">
            <p className="text-lg font-extrabold text-green-400">{friends.length}</p>
            <p className="text-[10px] text-white/50 uppercase font-bold tracking-wider mt-0.5">Friends</p>
          </div>
        </div>

        {/* Avatar Selection */}
        <div className="mb-4">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-white/60 mb-2">
            Select Avatar
          </label>
          <div className="flex items-center gap-3 overflow-x-auto pb-1 no-scrollbar">
            {AVATAR_PRESETS.map((url, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedPhoto(url)}
                className={`relative w-12 h-12 rounded-full border-2 transition shrink-0 ${
                  selectedPhoto === url
                    ? 'border-green-400 scale-110 shadow-[0_0_12px_rgba(34,197,94,0.6)]'
                    : 'border-white/10 hover:border-white/40 opacity-70'
                }`}
              >
                <img src={url} alt="" className="w-full h-full rounded-full" />
              </button>
            ))}
          </div>
        </div>

        {/* Edit Form */}
        <form onSubmit={handleSave} className="space-y-3.5">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-white/60 mb-1">
              Display Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-panel2 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-green-500 placeholder:text-white/35 transition"
              placeholder="Your name"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-white/60 mb-1">
              Bio / Status
            </label>
            <input
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full bg-panel2 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-green-500 placeholder:text-white/35 transition"
              placeholder="e.g. Vibing to Lo-Fi 🎧"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-white/60 mb-1">
              Favorite Genre / Vibe
            </label>
            <select
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className="w-full bg-panel2 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-green-500 transition"
            >
              <option value="Lo-Fi & Pop">Lo-Fi & Pop</option>
              <option value="Bollywood & Punjabi">Bollywood & Punjabi</option>
              <option value="EDM & Dance">EDM & Dance</option>
              <option value="Hip-Hop & R&B">Hip-Hop & R&B</option>
              <option value="Acoustic & Indie">Acoustic & Indie</option>
              <option value="Bengali Hits">Bengali Hits</option>
            </select>
          </div>

          {savedMsg && (
            <p className="text-xs text-center font-bold text-green-400 py-1">
              Profile updated successfully! ✓
            </p>
          )}

          <button
            type="submit"
            className="w-full py-3 rounded-full bg-green-500 text-black font-extrabold text-sm active:scale-95 transition hover:brightness-110 shadow-[0_0_20px_rgba(34,197,94,0.4)] mt-2"
          >
            Save Profile
          </button>
        </form>
      </div>
    </div>
  );
}
