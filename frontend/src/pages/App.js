import React, { useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import './App.css';

// Context
import { AuthProvider, useAuth } from '../contexts/AuthContext';

// Components
import Onboarding from '../components/Onboarding/Onboarding';
import Login from '../components/Auth/Login';
import Register from '../components/Auth/Register';
import AuthActionButton from '../components/common/AuthActionButton';

const AUTH_STORAGE_KEY = 'smartstudy-authenticated';

function Home({ onLogout }) {
  return (
    <div className="App">
      <header className="app-shell">
        <nav className="app-shell__nav">
          <div className="app-shell__brand">
            <span className="app-shell__badge">LIVE SESSION</span>
            <h1>SmartStudy Workspace</h1>
          </div>
          <AuthActionButton onClick={onLogout}>로그아웃</AuthActionButton>
        </nav>

        <main className="app-shell__hero">
          <section className="app-shell__panel">
            <span className="app-shell__eyebrow">CONNECTED</span>
            <h2>학습 흐름을 끊지 않는 협업 공간에 입장했어요.</h2>
            <p>
              로그인한 사용자에게만 로그아웃 버튼이 노출되며, 온보딩 상단 액션과 동일한 공통 컴포넌트로
              관리됩니다. 현재 페이지의 네온 브루탈리즘 톤과 맞도록 동일한 질감과 인터랙션을 유지했습니다.
            </p>
          </section>
        </main>
      </header>
    </div>
  );
}

function AppRoutes() {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(() => sessionStorage.getItem(AUTH_STORAGE_KEY) === 'true');

  const handleLogin = () => {
    sessionStorage.setItem(AUTH_STORAGE_KEY, 'true');
    setIsLoggedIn(true);
    navigate('/', { replace: true });
  };

  const handleLogout = () => {
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    setIsLoggedIn(false);
    navigate('/onboarding', { replace: true });
  };

  return (
    <Routes>
      <Route path="/" element={isLoggedIn ? <Home onLogout={handleLogout} /> : <Navigate to="/onboarding" replace />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route
        path="/login"
        element={isLoggedIn ? <Navigate to="/" replace /> : <Login onLoginSuccess={handleLogin} />}
      />
      <Route
        path="/register"
        element={isLoggedIn ? <Navigate to="/" replace /> : <Register onRegisterSuccess={handleLogin} />}
      />
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
