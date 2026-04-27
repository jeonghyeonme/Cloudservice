import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register as registerApi } from "../../lib/auth";
import { PATHS } from "../../constants/path";
import AuthShell from "./AuthShell";
import "./Auth.css";

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
    <AuthShell
      title="새 계정 만들기"
      subtitle="아래에 정보를 입력하여 시작하세요."
      footer={
        <>
          이미 계정이 있으신가요?{" "}
          <Link to={PATHS.login} className="auth-link">
            로그인
          </Link>
        </>
      }
    >
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
    </AuthShell>
  );
};

export default Register;
