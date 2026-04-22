import React, { useState } from "react";
import "./JoinServerModal.css"

const JoinServerModal = ({ server, onClose, onSubmit }) => {
  const [serverPassword, setserverPassword] = useState("");
  const [error, setError] = useState("");

  if (!server) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try { await onSubmit(server.isPrivate ? serverPassword : null); } 
    catch (err) { setError(err.message || "비밀번호가 올바르지 않습니다."); }
  };

  // 이미지에 있던 규칙 리스트 예시 (데이터에 없으면 기본값으로 표시)
  const rules = server?.rules || [];

  return (
    <div className="join-modal-overlay">
      <div className="join-modal-content">
        <button className="close-x" onClick={onClose}>&times;</button>
        
        {server.isPrivate && <div className="private-badge">Private</div>}
        
        <header className="modal-header">
          <p className="server-desc-small">{server?.description}</p>
          <h2 className="server-name-large">{server?.serverName || server?.title}</h2>
        </header>

        <div className="server-stats">
          <div className="host-profile">
            <div className="avatar-circle" />
            <span><strong>{server?.hostName || "관리자"}</strong> 호스트님</span>
          </div>
          <div className="member-status">
            <span className="dot">●</span> 멤버 {server?.currentCount || 0} / {server?.maxCapacity || 12} 명
          </div>
        </div>

        <div className="rules-box">
          <p className="rules-title">이 규칙은 지켜주세요-!</p>
          <ul className="rules-list">
            {rules.length > 0 ? (
              rules.map((rule, idx) => (
              <li key={idx}>
                <span className="rule-icon">{rule.icon}</span>
                {rule.text}
              </li>
              ))
            ) : (
            <p style={{ fontSize: '12px', color: '#666' }}>설정된 규칙이 없습니다.</p>
            )}
          </ul>
        </div>

        <form onSubmit={handleSubmit} className="join-input-section">
          {server.isPrivate && (
            <div className="password-field">
              <label className="input-label">비밀번호</label>
              <input
                type="password"
                className={`pw-input ${error ? "input-error" : ""}`}
                placeholder="********"
                value={serverPassword}
                onChange={(e) => setserverPassword(e.target.value)}
                required
              />
              {error && <p className="error-msg-text">{error}</p>}
            </div>
          )}
          
          <div className="button-group">
            <button type="button" className="btn-cancel" onClick={onClose}>취소</button>
            <button type="submit" className="btn-enter">접속하기</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default JoinServerModal;