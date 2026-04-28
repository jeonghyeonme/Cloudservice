import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { login as loginApi } from "../../lib/auth";
import { useAuth } from "../../contexts/AuthContext";
import { PATHS } from "../../constants/path";
import AuthShell from "./AuthShell";
import "./Auth.css";

const GoogleIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const successMessage = location.state?.successMessage || "";
  const registeredEmail = location.state?.registeredEmail || "";

  const [email, setEmail] = useState(registeredEmail);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await loginApi({ email, password });

      login({
        nickname: data.nickname,
        profileImageUrl: data.profileImageUrl,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
      });

      navigate(PATHS.explore, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="다시 만나서 반가워요"
      subtitle="계정에 로그인하여 학습을 이어가세요!"
      footer={
        <>
          아직 계정이 없으신가요?{" "}
          <Link to={PATHS.register} className="auth-link">
            회원가입
          </Link>
        </>
      }
    >
        <form onSubmit={handleLogin}>
          {successMessage && <p className="auth-success">{successMessage}</p>}

          <div className="form-group">
            <label className="form-label" htmlFor="email-or-phone">
              이메일 또는 전화번호
            </label>
            <input
              className="form-input"
              id="email-or-phone"
              type="text"
              placeholder="예: nathan@substratum.io"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="btn-neon" disabled={loading}>
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>

        <div className="auth-divider">
          <span>또는 다음으로 계속하기</span>
        </div>

        <button type="button" className="btn-secondary">
          <GoogleIcon /> Google 계정으로 로그인
        </button>
    </AuthShell>
  );
};

export default Login;
