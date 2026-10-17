import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './AuthContext';
import Splash from './components/Splash';
import Home from './pages/Home';
import Login from './pages/Login';
import Room from './pages/Room';

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return <Splash />;

  // Not signed in: show Login in place. The URL stays the same, so after Google
  // sign-in a guest lands straight in the room they were invited to.
  if (!user) return <Login />;

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/room/:roomId" element={<Room />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
