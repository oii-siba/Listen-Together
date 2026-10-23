import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../AuthContext';
import {
  getUserProfile,
  saveUserProfile,
  getFavoriteSongs,
  toggleFavoriteSong,
  getListeningHistory,
  getFriendsList,
  getFriendCode,
} from '../lib/userData';

const AVATAR_PRESETS = [
  'https://api.dicebear.com/7.x/bottts/svg?seed=music1',
  'https://api.dicebear.com/7.x/bottts/svg?seed=neonbeat',
  'https://api.dicebear.com/7.x/bottts/svg?seed=synthwave',
  'https://api.dicebear.com/7.x/bottts/svg?seed=djparty',
  'https://api.dicebear.com/7.x/bottts/svg?seed=bassboost',
  'https://api.dicebear.com/7.x/bottts/svg?seed=alex',
];

export default function ProfileModal({ user, onClose, onUpdateUser }) {
  const { updateUserProfile } = useAuth() || {};
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'favorites' | 'history' | 'friends'
  
  // Initialize directly from saved profile or user props without blank flash
  const initial = getUserProfile(user?.uid, user);
  const [profile, setProfile] = useState(initial);
  const [name, setName] = useState(() => initial?.displayName || user?.displayName || 'Music Fan');
  const [bio, setBio] = useState(() => initial?.bio || 'Vibing with friends on TuneTogether 🎧');
  const [selectedPhoto, setSelectedPhoto] = useState(
    () => initial?.photoURL || user?.photoURL || AVATAR_PRESETS[0]
  );
  const [genre, setGenre] = useState(() => initial?.favoriteGenre || 'Lo-Fi & Pop');
  const [customUrl, setCustomUrl] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const fileInputRef = useRef(null);

  const [favoritesList, setFavoritesList] = useState(() => getFavoriteSongs(user?.uid));
  const [historyList, setHistoryList] = useState(() => getListeningHistory(user?.uid));
  const [friendsList, setFriendsList] = useState(() => getFriendsList(user?.uid));

  // Only re-sync when the user UID changes (never wipe out edits on background re-renders)
  useEffect(() => {
    if (!user?.uid) return;
    const p = getUserProfile(user.uid, user);
    setProfile(p);
    setFavoritesList(getFavoriteSongs(user.uid));
    setHistoryList(getListeningHistory(user.uid));
    setFriendsList(getFriendsList(user.uid));
  }, [user?.uid]);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 256;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setSelectedPhoto(dataUrl);
      };
      img.src = readerEvent.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleApplyUrl = () => {
    if (customUrl.trim()) {
      setSelectedPhoto(customUrl.trim());
      setShowUrlInput(false);
      setCustomUrl('');
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    const updated = {
      ...profile,
      displayName: name.trim() || 'Music Fan',
      bio: bio.trim(),
      photoURL: selectedPhoto || AVATAR_PRESETS[0],
      favoriteGenre: genre,
    };
    try {
      if (updateUserProfile) {
        await updateUserProfile(updated);
      }
      if (user?.uid) {
        await saveUserProfile(user.uid, updated);
      }
      setProfile(updated);
      if (onUpdateUser && onUpdateUser !== updateUserProfile) {
        onUpdateUser(updated);
      }
      setSavedMsg(true);
      setTimeout(() => {
        setSavedMsg(false);
        setSaving(false);
        onClose();
      }, 900);
    } catch (err) {
      console.error('Save profile error:', err);
      setSaving(false);
    }
  };

  const copyFriendCode = () => {
    const code = profile.friendCode || (user?.uid ? getFriendCode(user.uid) : 'TT-USER');
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleRemoveFavorite = async (song) => {
    if (!user?.uid) return;
    await toggleFavoriteSong(user.uid, song);
    setFavoritesList(getFavoriteSongs(user.uid));
  };

  const myCode = profile.friendCode || (user?.uid ? getFriendCode(user.uid) : 'TT-USER');

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-panel border border-white/10 rounded-3xl p-5 sm:p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          type="button"
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-panel2 text-white/60 hover:text-white flex items-center justify-center transition active:scale-95 z-10"
          aria-label="Close"
        >
          ✕
        </button>

        {/* Modal Header */}
        <div className="mb-4">
          <h2 className="text-lg font-extrabold text-white">
            {activeTab === 'profile'
              ? 'Customize Profile'
              : activeTab === 'favorites'
              ? 'Favorite Songs'
              : activeTab === 'history'
              ? 'Listening History'
              : 'Your Friends'}
          </h2>
          <p className="text-xs text-white/50">
            {activeTab === 'profile'
              ? 'Personalize your identity, photo & preferences'
              : activeTab === 'favorites'
              ? 'Songs you saved to favorites'
              : activeTab === 'history'
              ? 'Recently played tracks'
              : 'Friends connected with your code'}
          </p>
        </div>

        {/* Interactive Stats Row (Click to View) */}
        <div className="grid grid-cols-3 gap-2 mb-4 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab((prev) => (prev === 'favorites' ? 'profile' : 'favorites'))}
            className={`border rounded-2xl p-2.5 text-center transition active:scale-95 group cursor-pointer ${
              activeTab === 'favorites'
                ? 'bg-green-500/20 border-green-400 shadow-[0_0_15px_rgba(34,197,94,0.4)] ring-1 ring-green-400'
                : 'bg-panel2/60 border-white/5 hover:border-green-500/30 hover:bg-panel2/90'
            }`}
            title="Click to view Favorite Songs"
          >
            <p className="text-lg font-extrabold text-green-400 group-hover:scale-105 transition">
              {favoritesList.length}
            </p>
            <p className="text-[10px] text-white/60 uppercase font-bold tracking-wider mt-0.5">
              Favorites
            </p>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab((prev) => (prev === 'history' ? 'profile' : 'history'))}
            className={`border rounded-2xl p-2.5 text-center transition active:scale-95 group cursor-pointer ${
              activeTab === 'history'
                ? 'bg-green-500/20 border-green-400 shadow-[0_0_15px_rgba(34,197,94,0.4)] ring-1 ring-green-400'
                : 'bg-panel2/60 border-white/5 hover:border-green-500/30 hover:bg-panel2/90'
            }`}
            title="Click to view Listening History"
          >
            <p className="text-lg font-extrabold text-green-400 group-hover:scale-105 transition">
              {historyList.length}
            </p>
            <p className="text-[10px] text-white/60 uppercase font-bold tracking-wider mt-0.5">
              Listened
            </p>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab((prev) => (prev === 'friends' ? 'profile' : 'friends'))}
            className={`border rounded-2xl p-2.5 text-center transition active:scale-95 group cursor-pointer ${
              activeTab === 'friends'
                ? 'bg-green-500/20 border-green-400 shadow-[0_0_15px_rgba(34,197,94,0.4)] ring-1 ring-green-400'
                : 'bg-panel2/60 border-white/5 hover:border-green-500/30 hover:bg-panel2/90'
            }`}
            title="Click to view Friends"
          >
            <p className="text-lg font-extrabold text-green-400 group-hover:scale-105 transition">
              {friendsList.length}
            </p>
            <p className="text-[10px] text-white/60 uppercase font-bold tracking-wider mt-0.5">
              Friends
            </p>
          </button>
        </div>

        {/* TAB 1: Profile Customization View */}
        {activeTab === 'profile' && (
          <div className="overflow-y-auto pr-1 flex-1 space-y-4">
            {/* Hidden File Picker Input for Photo Upload */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />

            {/* Avatar Preview & Photo Actions */}
            <div className="p-3 bg-panel2/60 border border-white/5 rounded-2xl">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-white/60 mb-2">
                Profile Photo / Avatar
              </label>

              <div className="flex items-center gap-3">
                {/* Active Photo Preview */}
                <div className="relative w-16 h-16 rounded-2xl overflow-hidden border-2 border-green-400 shrink-0 shadow-[0_0_16px_rgba(34,197,94,0.4)] bg-black/40">
                  <img
                    src={selectedPhoto || AVATAR_PRESETS[0]}
                    alt="Profile Avatar"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = AVATAR_PRESETS[0];
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition"
                    title="Change Photo"
                  >
                    📷
                  </button>
                </div>

                {/* Upload & Option Buttons */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-xl bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 text-green-300 font-bold text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                    >
                      <span>📷</span>
                      <span>Upload Photo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowUrlInput((v) => !v)}
                      className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 font-bold text-xs transition active:scale-95 cursor-pointer"
                    >
                      <span>🌐</span>
                      <span>Link URL</span>
                    </button>

                    {user?.photoURL && user.photoURL !== selectedPhoto && (
                      <button
                        type="button"
                        onClick={() => setSelectedPhoto(user.photoURL)}
                        className="px-2.5 py-1.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 font-bold text-xs transition active:scale-95 cursor-pointer"
                        title="Use original Google account photo"
                      >
                        Google Photo
                      </button>
                    )}
                  </div>

                  <p className="text-[10px] text-white/40">
                    Upload your picture, enter an image URL, or pick an avatar below.
                  </p>
                </div>
              </div>

              {/* Paste URL Input Drawer */}
              {showUrlInput && (
                <div className="mt-2.5 flex items-center gap-2 pt-2 border-t border-white/5">
                  <input
                    type="url"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    placeholder="https://example.com/photo.jpg"
                    className="flex-1 bg-black/50 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-green-500 placeholder:text-white/30"
                  />
                  <button
                    type="button"
                    onClick={handleApplyUrl}
                    className="px-3 py-1.5 rounded-xl bg-green-500 text-black font-extrabold text-xs active:scale-95 transition"
                  >
                    Apply
                  </button>
                </div>
              )}

              {/* Preset Avatars Row */}
              <div className="mt-3 pt-2.5 border-t border-white/5">
                <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider block mb-1.5">
                  Or pick a fun avatar:
                </span>
                <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {AVATAR_PRESETS.map((url, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedPhoto(url)}
                      className={`relative w-10 h-10 rounded-xl border-2 transition shrink-0 ${
                        selectedPhoto === url
                          ? 'border-green-400 scale-105 shadow-[0_0_10px_rgba(34,197,94,0.6)]'
                          : 'border-white/10 hover:border-white/40 opacity-70'
                      }`}
                    >
                      <img src={url} alt="" className="w-full h-full rounded-lg object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Edit Form */}
            <form onSubmit={handleSave} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-white/60 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  maxLength={40}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-panel2 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-green-500 placeholder:text-white/35 transition"
                  placeholder="Your display name"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-white/60 mb-1">
                  Bio / Status
                </label>
                <input
                  type="text"
                  maxLength={120}
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
                  className="w-full bg-panel2 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-green-500 transition cursor-pointer"
                >
                  <option value="Lo-Fi & Pop">Lo-Fi & Pop</option>
                  <option value="Bollywood & Punjabi">Bollywood & Punjabi</option>
                  <option value="EDM & Dance">EDM & Dance</option>
                  <option value="Hip-Hop & R&B">Hip-Hop & R&B</option>
                  <option value="Acoustic & Indie">Acoustic & Indie</option>
                  <option value="Bengali Hits">Bengali Hits</option>
                </select>
              </div>

              {/* Friend Code & Email Info */}
              <div className="p-3 bg-panel2/40 border border-white/5 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider block">
                      Your Friend Code
                    </span>
                    <span className="font-mono font-bold text-xs text-green-400">
                      {myCode}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={copyFriendCode}
                    className="px-2.5 py-1 rounded-lg bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 text-green-300 font-bold text-[11px] flex items-center gap-1 transition active:scale-95 cursor-pointer"
                  >
                    <span>{copiedCode ? '✓' : '📋'}</span>
                    <span>{copiedCode ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                {user?.email && (
                  <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
                    <span className="text-white/40">Account:</span>
                    <span className="text-white/70 font-medium truncate max-w-[200px]">
                      {user.email}
                    </span>
                  </div>
                )}
              </div>

              {savedMsg && (
                <p className="text-xs text-center font-bold text-green-400 py-1 animate-in fade-in duration-200">
                  Profile updated successfully! ✓
                </p>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 rounded-full bg-green-500 text-black font-extrabold text-sm active:scale-95 transition hover:brightness-110 shadow-[0_0_20px_rgba(34,197,94,0.4)] mt-2 cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>Saving Profile…</span>
                  </>
                ) : (
                  <span>Save Profile</span>
                )}
              </button>
            </form>
          </div>
        )}

        {/* TAB 2: Favorites List View */}
        {activeTab === 'favorites' && (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
              <span className="text-xs font-bold text-white/70">Saved Songs</span>
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className="text-xs text-green-400 hover:text-green-300 font-bold underline"
              >
                ← Edit Profile
              </button>
            </div>

            <div className="overflow-y-auto space-y-2 pr-1 flex-1">
              {favoritesList.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-3xl mb-2">❤️</p>
                  <p className="text-xs font-bold text-white/70">No favorite songs yet</p>
                  <p className="text-[11px] text-white/40 mt-1 max-w-xs mx-auto">
                    While listening in any room, tap the heart icon on a song to save it to your favorites.
                  </p>
                </div>
              ) : (
                favoritesList.map((song) => (
                  <div
                    key={song.videoId}
                    className="p-2.5 rounded-2xl bg-panel2/70 border border-white/5 hover:border-green-500/30 transition flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={song.thumb || `https://i.ytimg.com/vi/${song.videoId}/hqdefault.jpg`}
                        alt=""
                        className="w-11 h-11 rounded-xl object-cover shrink-0 border border-white/10"
                      />
                      <div className="min-w-0">
                        <p className="font-bold text-xs text-white truncate group-hover:text-green-400 transition">
                          {song.title}
                        </p>
                        <p className="text-[10px] text-white/40 font-mono mt-0.5">
                          ID: {song.videoId}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <a
                        href={`https://www.youtube.com/watch?v=${song.videoId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-full bg-white/5 hover:bg-white/15 text-white/80 hover:text-white transition"
                        title="Watch on YouTube"
                      >
                        ▶
                      </a>
                      <button
                        type="button"
                        onClick={() => handleRemoveFavorite(song)}
                        className="p-2 rounded-full bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-400 transition"
                        title="Remove from favorites"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 3: Listening History List View */}
        {activeTab === 'history' && (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
              <span className="text-xs font-bold text-white/70">Recent Tracks ({historyList.length})</span>
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className="text-xs text-green-400 hover:text-green-300 font-bold underline"
              >
                ← Edit Profile
              </button>
            </div>

            <div className="overflow-y-auto space-y-2 pr-1 flex-1">
              {historyList.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-3xl mb-2">🎧</p>
                  <p className="text-xs font-bold text-white/70">No listening history yet</p>
                  <p className="text-[11px] text-white/40 mt-1 max-w-xs mx-auto">
                    Songs played in rooms you join will automatically appear here.
                  </p>
                </div>
              ) : (
                historyList.map((song, i) => (
                  <div
                    key={`${song.videoId}_${i}`}
                    className="p-2.5 rounded-2xl bg-panel2/70 border border-white/5 hover:border-green-500/30 transition flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={song.thumb || `https://i.ytimg.com/vi/${song.videoId}/hqdefault.jpg`}
                        alt=""
                        className="w-11 h-11 rounded-xl object-cover shrink-0 border border-white/10"
                      />
                      <div className="min-w-0">
                        <p className="font-bold text-xs text-white truncate group-hover:text-green-400 transition">
                          {song.title}
                        </p>
                        <p className="text-[10px] text-white/40 mt-0.5">
                          {song.playedAt
                            ? new Date(song.playedAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'Recently played'}
                        </p>
                      </div>
                    </div>

                    <a
                      href={`https://www.youtube.com/watch?v=${song.videoId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-full bg-white/5 hover:bg-white/15 text-white/80 hover:text-white transition shrink-0"
                      title="Play on YouTube"
                    >
                      ▶
                    </a>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 4: Friends List View */}
        {activeTab === 'friends' && (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
              <span className="text-xs font-bold text-white/70">Friends ({friendsList.length})</span>
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className="text-xs text-green-400 hover:text-green-300 font-bold underline"
              >
                ← Edit Profile
              </button>
            </div>

            <div className="overflow-y-auto space-y-2 pr-1 flex-1">
              {friendsList.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-3xl mb-2">👥</p>
                  <p className="text-xs font-bold text-white/70">No friends added yet</p>
                  <p className="text-[11px] text-white/40 mt-1 max-w-xs mx-auto">
                    Share your Friend Code from the Friends menu to connect with buddies.
                  </p>
                </div>
              ) : (
                friendsList.map((friend) => (
                  <div
                    key={friend.uid}
                    className="p-3 rounded-2xl bg-panel2/70 border border-white/5 hover:border-green-500/30 transition flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={friend.photo || `https://api.dicebear.com/7.x/bottts/svg?seed=${friend.uid}`}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover border border-green-400/50 shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="font-bold text-xs text-white truncate">{friend.name}</p>
                        <p className="text-[10px] text-green-400 font-mono font-bold mt-0.5">
                          {friend.friendCode || 'Connected'}
                        </p>
                      </div>
                    </div>

                    <span className="text-[10px] font-bold text-green-400 bg-green-500/15 border border-green-500/30 px-2.5 py-1 rounded-full shrink-0">
                      Friend ✓
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
