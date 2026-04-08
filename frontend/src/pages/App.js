import React, { useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import './App.css';

// Context
import { AuthProvider, useAuth } from '../contexts/AuthContext'; // ProtectedRoute를 위해 useAuth 추가

// Components
import Onboarding from '../components/Onboarding/Onboarding';
import Login from '../components/Auth/Login';
import Register from '../components/Auth/Register';
import ChatLayout from '../components/Chat/ChatLayout';
import ExploreRooms from '../components/Rooms/ExploreRooms';
import NotFound from '../components/NotFound/NotFound';
import SharedLayout from '../components/layout/SharedLayout';

const AUTH_STORAGE_KEY = 'smartstudy-authenticated';

/**
 * 로그인 여부에 따라 라우팅을 보호하는 컴포넌트
 */
const ProtectedRoute = ({ children }) => {
  const { isLoggedIn } = useAuth();
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function AppRoutes() {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(() => sessionStorage.getItem(AUTH_STORAGE_KEY) === 'true');

  const handleLogin = () => {
    sessionStorage.setItem(AUTH_STORAGE_KEY, 'true');
    setIsLoggedIn(true);
    navigate('/explore', { replace: true });
  };

  const handleLogout = () => {
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    setIsLoggedIn(false);
    navigate('/onboarding', { replace: true });
  };

  return (
    <SharedLayout isLoggedIn={isLoggedIn} onLogout={handleLogout}>
      <Routes>
        {/* 기존 라우팅 로직 유지 (이미 로그인한 사용자가 로그인/회원가입 페이지 접근 방지) */}
        <Route path="/" element={isLoggedIn ? <Navigate to="/explore" replace /> : <Navigate to="/onboarding" replace />} />
        <Route path="/onboarding" element={isLoggedIn ? <Navigate to="/explore" replace /> : <Onboarding />} />
        <Route
          path="/login"
          element={isLoggedIn ? <Navigate to="/explore" replace /> : <Login onLoginSuccess={handleLogin} />}
        />
        <Route
          path="/register"
          element={isLoggedIn ? <Navigate to="/explore" replace /> : <Register onRegisterSuccess={handleLogin} />}
        />
        <Route path="/rooms/:roomId" element={<ProtectedRoute><ChatLayout /></ProtectedRoute>} />
        <Route path="/explore" element={<ProtectedRoute><ExploreRooms /></ProtectedRoute>} />
        {/* 404 Not Found 페이지 처리 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </SharedLayout>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
