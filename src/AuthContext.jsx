import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut as fbSignOut } from 'firebase/auth';
import { auth, googleProvider, isFirebaseConfigured } from './firebase';
import { registerUserDirectory } from './lib/userData';

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

  useEffect(() => {
    if (user) {
      registerUserDirectory(user).catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    if (isFirebaseConfigured) {
      const unsub = onAuthStateChanged(auth, (u) => {
        if (u) {
          try {
            localStorage.removeItem('LT_DEMO_USER');
          } catch {}
          registerUserDirectory(u).catch(() => {});
        }
        setUser(u);
        setLoading(false);
      });
      return unsub;
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

  const signInDemo = useCallback((name = null, uid = null) => {
    let savedUid = uid;
    if (!savedUid) {
      try {
        const existing = localStorage.getItem('LT_DEMO_UID');
        if (existing) {
          savedUid = existing;
        } else {
          savedUid = 'user-' + Math.random().toString(36).substring(2, 9);
          localStorage.setItem('LT_DEMO_UID', savedUid);
        }
      } catch {
        savedUid = 'user-' + Math.random().toString(36).substring(2, 9);
      }
    }
    const demoName = name || `Guest-${savedUid.slice(-4)}`;
    const demoUser = {
      uid: savedUid,
      displayName: demoName,
      email: `${savedUid}@demo.local`,
      photoURL: `https://api.dicebear.com/7.x/bottts/svg?seed=${savedUid}`,
      isDemo: true,
    };
    try {
      localStorage.setItem('LT_DEMO_USER', JSON.stringify(demoUser));
    } catch {}
    setUser(demoUser);
  }, []);

  const signOut = useCallback(async () => {
    try {
      localStorage.removeItem('LT_DEMO_USER');
    } catch {}
    setUser(null);
    if (isFirebaseConfigured) {
      await fbSignOut(auth);
    }
  }, []);

  const value = useMemo(
    () => ({ user, loading, signIn, signInDemo, signOut, isFirebaseConfigured }),
    [user, loading, signIn, signInDemo, signOut]
  );
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
