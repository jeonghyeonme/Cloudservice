import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AuthActionButton from '../common/AuthActionButton';
import './SharedLayout.css';

const SharedLayout = ({ children, isLoggedIn, onLogout }) => {
  const location = useLocation();
  const navigate = useNavigate();

  // 로그인, 회원가입 페이지에서는 버튼 영역을 렌더링하지 않음
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  const handleLoginClick = () => navigate('/login');
  const handleRegisterClick = () => navigate('/register');
  const handleLogoClick = () => navigate('/'); 

  return (
    <div className="App shared-layout-container">
      <nav className="global-navbar">
        <div className="navbar-logo" onClick={handleLogoClick} style={{ cursor: 'pointer' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>SmartStudy</h2>
        </div>
        
        {!isAuthPage && (
          <div className="navbar-actions">
            {isLoggedIn ? (
              <AuthActionButton onClick={onLogout}>로그아웃</AuthActionButton>
            ) : (
              <>
                <AuthActionButton variant="solid" onClick={handleLoginClick}>
                  로그인
                </AuthActionButton>
                <AuthActionButton onClick={handleRegisterClick}>회원가입</AuthActionButton>
              </>
            )}
          </div>
        )}
      </nav>

      <main className="layout-content">
        {children}
      </main>
    </div>
  );
};

export default SharedLayout;