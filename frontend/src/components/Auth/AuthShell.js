import React from "react";
import { useNavigate } from "react-router-dom";
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

function AuthShell({ title, subtitle, footer, children }) {
  const navigate = useNavigate();

  return (
    <div className="auth-container">
      <button
        type="button"
        className="auth-back-button"
        onClick={() => navigate(PATHS.onboarding)}
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
        <h1 className="auth-title">{title}</h1>
        <p className="auth-subtitle">{subtitle}</p>
      </div>

      <div className="auth-card">{children}</div>

      {footer ? <div className="auth-footer">{footer}</div> : null}
    </div>
  );
}

export default AuthShell;
