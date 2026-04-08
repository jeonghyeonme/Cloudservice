import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Auth.css';

const TerminalIcon = () => (
  <svg 
    className="terminal-icon" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <polyline points="4 17 10 11 4 5"></polyline>
    <line x1="12" y1="19" x2="20" y2="19"></line>
  </svg>
);

const Register = ({ onRegisterSuccess }) => {
  const navigate = useNavigate();

  const handleRegister = (e) => {
    e.preventDefault();
    if (onRegisterSuccess) {
      onRegisterSuccess();
      return;
    }

    navigate('/login');
  };

  return (
    <div className="auth-container">
      <button 
        onClick={() => navigate(-1)} 
        style={{
          position: 'absolute',
          top: '32px',
          left: '32px',
          background: 'none',
          border: 'none',
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '14px',
          fontWeight: 600,
          transition: 'color 0.2s',
        }}
        onMouseOver={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
        onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
        뒤로가기
      </button>

      <div className="auth-header">
        <div className="auth-icon-wrapper">
          <TerminalIcon />
        </div>
        <h1 className="auth-title">새 계정 만들기</h1>
        <p className="auth-subtitle">아래에 정보를 입력하여 시작하세요.</p>
      </div>

      <div className="auth-card">
        <form onSubmit={handleRegister}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">
              이메일 주소
            </label>
            <input 
              className="form-input"
              id="email" 
              type="email" 
              placeholder="name@example.com"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="username">
              사용자 이름
            </label>
            <input 
              className="form-input"
              id="username" 
              type="text" 
              placeholder="neon_nomad_88"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">
              비밀번호
            </label>
            <input 
              className="form-input"
              id="password" 
              type="password" 
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" className="btn-neon">
            계속하기
          </button>
        </form>
      </div>

      <div className="auth-footer">
        이미 계정이 있으신가요? <Link to="/login" className="auth-link">로그인</Link>
      </div>
    </div>
  );
};

export default Register;
