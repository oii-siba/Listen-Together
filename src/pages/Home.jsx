import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, serverTimestamp, set } from '../lib/db';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { parseRoomId, randomRoomId } from '../lib/utils';
import Avatar from '../components/Avatar';
import { Add, Logout, Music } from '../components/Icons';

export default function Home() {
  const { user, signOut } = useAuth();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [code, setCode] = useState('');

  async function createRoom() {
    setBusy(true);
    setError('');
    try {
      for (let i = 0; i < 3; i++) {
        const id = randomRoomId();
        try {
          await Promise.race([
            set(ref(db, `rooms/${id}`), {
              hostId: user.uid,
              allowGuestAdd: true,
              createdAt: serverTimestamp(),
              playback: { isPlaying: false, position: 0, updatedAt: serverTimestamp() },
            }),
            new Promise((_, reject) =>
              setTimeout(
                () =>
                  reject(
                    new Error(
                      'Realtime Database connection timed out. Please make sure you clicked "Create Database" under Build → Realtime Database in Firebase Console.'
                    )
                  ),
                7000
              )
            ),
          ]);
          nav(`/room/${id}`);
          return;
        } catch (e) {
          if (i === 2) throw e;
        }
      }
    } catch (err) {
      setError(
        err?.message ||
          'Could not create the room. Please check your Firebase Realtime Database setup and security rules.'
      );
    } finally {
      setBusy(false);
    }
  }

  function join(e) {
    e.preventDefault();
    const id = parseRoomId(code);
    if (!id) {
      setError('Paste a valid room link or code.');
      return;
    }
    nav(`/room/${id}`);
  }

  return (
    <div className="min-h-[100dvh] max-w-md mx-auto px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-10">
      <header className="flex items-center gap-3">
        <Avatar name={user.displayName || 'You'} photo={user.photoURL} size={44} />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-white/50">Signed in as</p>
          <p className="font-semibold truncate">{user.displayName || user.email}</p>
        </div>
        <button
          onClick={signOut}
          className="w-11 h-11 rounded-full bg-panel grid place-items-center text-white/70 active:scale-90 transition"
          aria-label="Sign out"
        >
          <Logout size={20} />
        </button>
      </header>

      <div className="mt-12 text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-accent/15 text-accent grid place-items-center">
          <Music size={34} />
        </div>
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight">Start listening together</h1>
        <p className="mt-1 text-sm text-white/55">Create a room, share the link, and everyone hears the same song live.</p>
      </div>

      <button
        onClick={createRoom}
        disabled={busy}
        className="mt-8 w-full flex items-center justify-center gap-2 bg-accent text-black font-bold text-lg rounded-full py-4 active:scale-[0.98] transition disabled:opacity-60"
      >
        <Add size={26} />
        {busy ? 'Creating…' : 'Create Room'}
      </button>

      <div className="my-6 flex items-center gap-3 text-xs text-white/35">
        <div className="h-px flex-1 bg-white/10" />
        OR JOIN A ROOM
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <form onSubmit={join} className="flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Paste room link or code"
          className="flex-1 min-w-0 bg-panel rounded-full px-5 py-3.5 text-sm outline-none focus:ring-2 focus:ring-accent placeholder:text-white/35"
        />
        <button className="px-6 rounded-full bg-panel2 font-semibold text-sm active:scale-95 transition">Join</button>
      </form>

      {error && <p className="mt-4 text-sm text-red-400 text-center">{error}</p>}
    </div>
  );
}
