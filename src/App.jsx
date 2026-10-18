import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import Splash from './components/Splash';
import Home from './pages/Home';
import Login from './pages/Login';
import Room from './pages/Room';
import PrivacyPolicy from './pages/PrivacyPolicy';
import { PlaybackProvider } from './context/PlaybackContext';
import MiniPlayer from './components/MiniPlayer';
import InstallPrompt from './components/InstallPrompt';
import { isInstalled, logAppInstall } from './lib/pwa';

export default function App() {
  const { user, loading } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (isInstalled()) {
      logAppInstall(user);
    }
  }, [user]);

  // Allow Privacy Policy page to be viewed publicly without requiring login
  if (location.pathname === '/privacy') {
    return <PrivacyPolicy />;
  }

  if (loading) return <Splash />;

  // Not signed in: show Login in place. The URL stays the same, so after Google
  // sign-in a guest lands straight in the room they were invited to.
  if (!user) return <Login />;

  return (
    <PlaybackProvider user={user}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/room/:roomId" element={<Room />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <MiniPlayer />
      <InstallPrompt />
    </PlaybackProvider>
  );
}
