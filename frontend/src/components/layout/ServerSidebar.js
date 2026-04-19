import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getServerPath, PATHS } from "../../constants/path";
import { useAuth } from "../../contexts/AuthContext"; //
import { useServers } from "../../contexts/ServerContext";
import "./ServerSidebar.css";

/**
 * @title 극좌측 서버 네비게이션 바
 * @param {string} activeView - 현재 활성화된 뷰 ('home', 'chat' 등)
 * @param {function} onServerClick - 서버 아이콘 클릭 시 실행할 함수
 * @param {function} onAddClick - + 버튼 클릭 시 실행할 함수
 * @param {function} onLogout - 로그아웃 함수
 */
const ServerSidebar = ({ activeView, onServerClick, onAddClick, onLogout }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { joinedServers, activeServerId } = useServers();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const initial = user?.nickname ? user.nickname.charAt(0) : "프"; // 닉네임의 첫 글자 추출 (정보가 없으면 '?' 표시)

  // 메뉴 바깥 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    setIsProfileMenuOpen(false);
    if (onLogout) onLogout();
  };

  const handleProfileEdit = () => {
    setIsProfileMenuOpen(false);
    navigate(PATHS.profileEdit || "/profile/edit");
  };

  return (
    <nav className="server-nav">
      {joinedServers.map((server) => {
        const serverName = server.serverName || server.title || "";
        const serverInitial = serverName
          ? serverName.trim().charAt(0).toUpperCase()
          : "?";
        const isActiveServer =
          activeView === "chat" && server.serverId === activeServerId;

        return (
          <div
            key={server.serverId}
            className={`server-icon server-entry-icon ${isActiveServer ? "active-server" : ""}`}
            onClick={() => navigate(getServerPath(server.serverId))}
            title={serverName || "접속한 서버"}
          >
            {serverInitial}
          </div>
        );
      })}

      {/* 서버 추가 버튼 */}
      <div
        className="server-icon add-btn"
        onClick={onAddClick}
        title="서버 추가"
      >
        +
      </div>

      <div className="spacer"></div>

      {/* 하단 프로필 아바타 + 팝업 메뉴 */}
      <div className="profile-wrapper" ref={menuRef}>
        {/* 설정 팝업 메뉴 */}
        {isProfileMenuOpen && (
          <div className="profile-popup">
            <div className="profile-popup-title">
              {user?.nickname || "사용자"}님
            </div>
            <div className="profile-popup-divider" />
            <button className="profile-popup-item" onClick={handleProfileEdit}>
              <span className="popup-icon">✏️</span>
              프로필 편집
              <span className="popup-arrow">›</span>
            </button>
            <div className="profile-popup-divider" />
            <button
              className="profile-popup-item danger"
              onClick={handleLogout}
            >
              <span className="popup-icon">🚪</span>
              로그아웃
            </button>
          </div>
        )}

        {/* 프로필 아바타 버튼 */}
        <div
          className="server-icon profile-icon"
          onClick={() => setIsProfileMenuOpen((prev) => !prev)}
          title={user?.nickname || "프로필"}
        >
          {initial}
        </div>
      </div>
    </nav>
  );
};

export default ServerSidebar;
