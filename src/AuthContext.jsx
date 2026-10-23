import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signInAnonymously,
  updateProfile,
  signOut as fbSignOut,
} from 'firebase/auth';
import { auth, db, googleProvider, isFirebaseConfigured } from './firebase';
import { ref, set, onDisconnect, serverTimestamp, onValue } from './lib/db';
import { registerUserDirectory, getUserProfile, saveUserProfile } from './lib/userData';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('LT_DEMO_USER');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  // Safety fallback: Never keep the screen frozen on Splash longer than 1.5s
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (user && user.uid) {
      registerUserDirectory(user).catch(() => {});
    }
  }, [user]);

  // Global Realtime Presence tracking for verified user
  useEffect(() => {
    if (!user?.uid || user.isDemo) return;
    const userPresenceRef = ref(db, `users/${user.uid}/presence`);
    const connRef = ref(db, '.info/connected');

    let unsub = () => {};
    unsub = onValue(connRef, (snap) => {
      if (snap.val() === true) {
        onDisconnect(userPresenceRef)
          .set({
            online: false,
            lastSeen: serverTimestamp(),
          })
          .catch(() => {});

        set(userPresenceRef, {
          online: true,
          name: user.displayName || 'Friend',
          photo: user.photoURL || null,
          lastSeen: serverTimestamp(),
        }).catch(() => {});
      }
    });

    const heartbeat = setInterval(() => {
      set(userPresenceRef, {
        online: true,
        name: user.displayName || 'Friend',
        photo: user.photoURL || null,
        lastSeen: serverTimestamp(),
      }).catch(() => {});
    }, 25000);

    return () => {
      unsub();
      clearInterval(heartbeat);
      set(userPresenceRef, {
        online: false,
        lastSeen: serverTimestamp(),
      }).catch(() => {});
    };
  }, [user?.uid, user?.displayName, user?.photoURL, user?.isDemo]);

  useEffect(() => {
    if (isFirebaseConfigured) {
      let unsubProfile = () => {};
      const unsubAuth = onAuthStateChanged(auth, (u) => {
        unsubProfile();
        if (u) {
          try {
            localStorage.removeItem('LT_DEMO_USER');
          } catch {}

          const custom = getUserProfile(u.uid, u);
          const initialUser = {
            uid: u.uid,
            email: u.email,
            isAnonymous: u.isAnonymous,
            displayName: custom?.displayName || u.displayName || 'Music Fan',
            photoURL: custom?.photoURL || u.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.uid}`,
            bio: custom?.bio || '',
            favoriteGenre: custom?.favoriteGenre || 'Lo-Fi & Pop',
            friendCode: custom?.friendCode || `TT-${u.uid.slice(0, 6).toUpperCase()}`,
          };
          setUser(initialUser);
          registerUserDirectory(initialUser).catch(() => {});

          // Realtime profile subscription: sync profile across all tabs & devices
          const profileRef = ref(db, `users/${u.uid}/profile`);
          unsubProfile = onValue(profileRef, (snap) => {
            const data = snap.val();
            if (data && (data.displayName || data.photoURL || data.bio)) {
              setUser((prev) => {
                if (!prev || prev.uid !== u.uid) return prev;
                return {
                  ...prev,
                  ...data,
                  displayName: data.displayName || prev.displayName,
                  photoURL: data.photoURL || prev.photoURL,
                  bio: data.bio !== undefined ? data.bio : prev.bio,
                  favoriteGenre: data.favoriteGenre || prev.favoriteGenre,
                };
              });
            }
          });
        } else {
          setUser(null);
        }
        setLoading(false);
      });
      return () => {
        unsubAuth();
        unsubProfile();
      };
    } else {
      setLoading(false);
    }
  }, []);

  // Returns an error message string, or null on success / user-cancelled.
  const signIn = useCallback(async () => {
    if (!isFirebaseConfigured) {
      return 'Firebase is not yet configured in .env. Use Instant Demo Mode below to test in localhost, or add your Firebase credentials to .env!';
    }
    try {
      await signInWithPopup(auth, googleProvider);
      return null;
    } catch (e) {
      if (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request') return null;
      if (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment') {
        try {
          await signInWithRedirect(auth, googleProvider);
          return null;
        } catch (e2) {
          return e2.message || 'Sign-in failed.';
        }
      }
      if (e.code === 'auth/unauthorized-domain') {
        return 'This domain is not authorized in Firebase (Authentication → Settings → Authorized domains).';
      }
      return e.message || 'Sign-in failed.';
    }
  }, []);

  // Secure Guest / Demo Sign-In: uses real Firebase Anonymous Auth when configured
  const signInDemo = useCallback(async (customName = null) => {
    if (isFirebaseConfigured) {
      try {
        const cred = await signInAnonymously(auth);
        const anonUser = cred.user;
        const displayName = customName || `Guest-${anonUser.uid.slice(-4)}`;
        const photoURL = `https://api.dicebear.com/7.x/bottts/svg?seed=${anonUser.uid}`;
        try {
          await updateProfile(anonUser, { displayName, photoURL });
        } catch {}
        setUser({ ...anonUser, displayName, photoURL, isAnonymous: true });
        return null;
      } catch (err) {
        console.warn('Anonymous sign-in not enabled on Firebase, using local guest session:', err);
      }
    }

    // Isolated offline mode only when Firebase is not configured
    const safeUid = 'demo-' + Math.random().toString(36).substring(2, 9);
    const demoName = customName || `Guest-${safeUid.slice(-4)}`;
    const demoUser = {
      uid: safeUid,
      displayName: demoName,
      email: `${safeUid}@demo.local`,
      photoURL: `https://api.dicebear.com/7.x/bottts/svg?seed=${safeUid}`,
      isDemo: true,
    };
    try {
      localStorage.setItem('LT_DEMO_USER', JSON.stringify(demoUser));
    } catch {}
    setUser(demoUser);
    return null;
  }, []);

  const updateUserProfile = useCallback(async (profileData) => {
    if (!user?.uid) return;
    const newName = (profileData.displayName || '').trim() || user.displayName || 'Music Fan';
    const newPhoto = profileData.photoURL || user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`;
    
    const fullProfile = {
      ...getUserProfile(user.uid, user),
      ...profileData,
      displayName: newName,
      photoURL: newPhoto,
    };

    // 1. Immediately update local React user state across all components
    setUser((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        ...fullProfile,
        displayName: newName,
        photoURL: newPhoto,
      };
    });

    // 2. Persist locally and in Firebase Realtime Database
    await saveUserProfile(user.uid, fullProfile);

    // If demo session, keep LT_DEMO_USER synchronized in localStorage
    if (user.isDemo || localStorage.getItem('LT_DEMO_USER')) {
      try {
        const demoUser = {
          ...user,
          ...fullProfile,
          displayName: newName,
          photoURL: newPhoto,
        };
        localStorage.setItem('LT_DEMO_USER', JSON.stringify(demoUser));
      } catch {}
    }

    // 3. Update Firebase Auth currentUser profile if available
    if (auth.currentUser && !user.isDemo) {
      try {
        await updateProfile(auth.currentUser, {
          displayName: newName,
          photoURL: newPhoto,
        });
      } catch (e) {
        console.warn('Firebase Auth updateProfile error:', e);
      }
    }

    // 4. Update real-time global user presence
    if (!user.isDemo && isFirebaseConfigured) {
      set(ref(db, `users/${user.uid}/presence`), {
        online: true,
        name: newName,
        photo: newPhoto,
        lastSeen: serverTimestamp(),
      }).catch(() => {});
    }

    // 5. Update user directory so friends searching can find the user with the new display name
    await registerUserDirectory({
      ...user,
      ...fullProfile,
      displayName: newName,
      photoURL: newPhoto,
    }).catch(() => {});
  }, [user]);

  const signOut = useCallback(async () => {
    try {
      if (user?.uid && !user.isDemo) {
        await set(ref(db, `users/${user.uid}/presence`), {
          online: false,
          lastSeen: serverTimestamp(),
        }).catch(() => {});
      }
      localStorage.removeItem('LT_DEMO_USER');
      setUser(null);
      if (isFirebaseConfigured) {
        await fbSignOut(auth);
      }
    } catch {}
  }, [user?.uid, user?.isDemo]);

  const value = useMemo(
    () => ({ user, loading, signIn, signInDemo, signOut, updateUserProfile, isFirebaseConfigured }),
    [user, loading, signIn, signInDemo, signOut, updateUserProfile]
  );
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
