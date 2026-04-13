import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register as registerApi } from "../../lib/auth";
import { PATHS } from "../../constants/path";
import "./Auth.css";

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

const Register = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await registerApi({
        email,
        password,
        nickname,
      });

      navigate(PATHS.login, {
        replace: true,
        state: {
          registeredEmail: email,
          successMessage: "회원가입이 완료되었습니다. 로그인해 주세요.",
        },
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <button
        onClick={() => navigate(PATHS.onboarding)}
        style={{
          position: "absolute",
          top: "32px",
          left: "32px",
          background: "none",
          border: "none",
          color: "var(--text-secondary)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          fontSize: "14px",
          fontWeight: 600,
          transition: "color 0.2s",
        }}
        onMouseOver={(e) =>
          (e.currentTarget.style.color = "var(--text-primary)")
        }
        onMouseOut={(e) =>
          (e.currentTarget.style.color = "var(--text-secondary)")
        }
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="nickname">
              닉네임
            </label>
            <input
              className="form-input"
              id="nickname"
              type="text"
              placeholder="테스터"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="btn-neon" disabled={loading}>
            {loading ? "가입 중..." : "계속하기"}
          </button>
        </form>
      </div>

      <div className="auth-footer">
        이미 계정이 있으신가요?{" "}
        <Link to={PATHS.login} className="auth-link">
          로그인
        </Link>
      </div>
    </div>
  );
};

export default Register;
