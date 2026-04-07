import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

// Context
import { AuthProvider, useAuth } from '../contexts/AuthContext';

// Components
import Onboarding from '../components/Onboarding/Onboarding';
import Login from '../components/Auth/Login';
import Register from '../components/Auth/Register';
import ChatLayout from '../components/Chat/ChatLayout';
import ExploreRooms from '../components/Rooms/ExploreRooms';
import NotFound from '../components/NotFound/NotFound';

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
  const { isLoggedIn } = useAuth();

  return (
    <Routes>
      <Route 
        path="/" 
        element={isLoggedIn ? <Navigate to="/rooms" replace /> : <Navigate to="/onboarding" replace />} 
      />

      <Route 
        path="/rooms" 
        element={<ProtectedRoute><ExploreRooms /></ProtectedRoute>} 
      />

      <Route 
        path="/rooms/:roomId" 
        element={<ProtectedRoute><ChatLayout /></ProtectedRoute>} 
      />

      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route path="*" element={<NotFound />} />
    </Routes>
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
