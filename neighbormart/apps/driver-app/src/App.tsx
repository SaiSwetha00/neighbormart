import { Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getToken } from './services/auth';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import QueuePage from './pages/QueuePage';
import ActiveDeliveryPage from './pages/ActiveDeliveryPage';
import EarningsPage from './pages/EarningsPage';
import RatingsPage from './pages/RatingsPage';
import BottomNav from './components/BottomNav';

export default function App() {
  const [authed, setAuthed] = useState(!!getToken());

  useEffect(() => {
    const t = getToken();
    setAuthed(!!t);
  }, []);

  if (!authed) return <LoginPage onLogin={() => setAuthed(true)} />;

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 relative pb-20">
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/queue" element={<QueuePage />} />
        <Route path="/active" element={<ActiveDeliveryPage />} />
        <Route path="/earnings" element={<EarningsPage />} />
        <Route path="/ratings" element={<RatingsPage />} />
      </Routes>
      <BottomNav />
    </div>
  );
}
