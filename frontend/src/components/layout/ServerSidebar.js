import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getServerPath, PATHS } from "../../constants/path";
import { useAuth } from "../../contexts/AuthContext";
import { useServers } from "../../contexts/ServerContext";
import { deleteServer, leaveServer } from "../../lib/servers";
import ServerContextMenu from "./ServerContextMenu";
import FormModal from "../common/FormModal";
import "./ServerSidebar.css";
 
const ServerSidebar = ({ activeView, onServerClick, onAddClick, onLogout }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { joinedServers, activeServerId, removeServerFromList } = useServers();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const menuRef = useRef(null);
  const initial = user?.nickname ? user.nickname.charAt(0) : "프";
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [targetServer, setTargetServer] = useState(null);
 
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
 
  const handleContextMenu = (e, server) => {
    e.preventDefault();
    setContextMenu({ x: e.pageX, y: e.pageY, server });
    setIsProfileMenuOpen(false);
  };
 
  const handleDeleteClick = (server) => {
    setTargetServer(server);
    setIsDeleteModalOpen(true);
    setContextMenu(null);
  };
 
  const handleFinalDelete = async () => {
    try {
      await deleteServer(targetServer.serverId);
      removeServerFromList(targetServer.serverId);
      setIsDeleteModalOpen(false);
      setTargetServer(null);
      alert("서버가 성공적으로 삭제되었습니다.");
      if (activeServerId === targetServer.serverId) navigate("/");
    } catch (error) {
      alert("삭제 실패: " + error.message);
    }
  };
 
  const handleLeave = async (server) => {
    const confirmLeave = window.confirm(`'${server.serverName}' 서버에서 나가시겠습니까?`);
    if (confirmLeave) {
      try {
        await leaveServer(server.serverId);
        removeServerFromList(server.serverId);
        alert("서버에서 퇴장했습니다.");
        if (activeServerId === server.serverId) navigate("/");
      } catch (error) {
        console.error("나가기 실패:", error);
        alert(error.message || "서버에서 나가는 중 오류가 발생했습니다.");
      }
    }
    setContextMenu(null);
  };
 
  const handleLogout = () => {
    setIsProfileMenuOpen(false);
    if (onLogout) onLogout();
  };
 
  const handleProfileEdit = () => {
    setIsProfileMenuOpen(false);
    navigate(PATHS.profileEdit || "/profile/edit");
  };
 
  return (
    <>
      {/* ✅ FormModal을 nav 밖으로 분리 → portal처럼 최상위에서 렌더링 */}
      {isDeleteModalOpen && targetServer && (
        <FormModal
          open={isDeleteModalOpen}
          title="서버 삭제"
          onClose={() => {
            setIsDeleteModalOpen(false);
            setTargetServer(null);
          }}
          onSubmit={handleFinalDelete}
          submitLabel="서버 삭제"
          variant="danger"
        >
          <div className="delete-confirm-content">
            <p style={{ color: "#dbdee1", lineHeight: "1.5" }}>
              정말로 <strong>{targetServer.serverName}</strong> 서버를 삭제하시겠습니까?<br />
              이 작업은 취소할 수 없으며, 모든 데이터가 영구적으로 삭제됩니다.
            </p>
          </div>
        </FormModal>
      )}
 
      <nav className="server-nav">
        {joinedServers.map((server) => {
          const serverName = server.serverName || server.title || "";
          const serverInitial = serverName ? serverName.trim().charAt(0).toUpperCase() : "?";
          const isActiveServer = activeView === "chat" && server.serverId === activeServerId;
 
          return (
            <div
              key={server.serverId}
              className={`server-icon server-entry-icon ${isActiveServer ? "active-server" : ""}`}
              onClick={() => navigate(getServerPath(server.serverId))}
              onContextMenu={(e) => handleContextMenu(e, server)}
              title={serverName || "접속한 서버"}
            >
              {serverInitial}
            </div>
          );
        })}
 
        <div className="server-icon add-btn" onClick={onAddClick} title="서버 추가">+</div>
 
        <div className="spacer"></div>
 
        {/* 컨텍스트 메뉴 */}
        {contextMenu && (
          <ServerContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            server={contextMenu.server}
            isHost={user?.userId === contextMenu.server.hostId}
            onClose={() => setContextMenu(null)}
            onDelete={handleDeleteClick}
            onLeave={handleLeave}
            onSettings={(server) => {
              console.log("서버 설정 열기:", server.serverName);
              setContextMenu(null);
            }}
          />
        )}
 
        {/* 하단 프로필 */}
        <div className="profile-wrapper" ref={menuRef}>
          {isProfileMenuOpen && (
            <div className="profile-popup">
              <div className="profile-popup-title">{user?.nickname || "사용자"}님</div>
              <div className="profile-popup-divider" />
              <button className="profile-popup-item" onClick={handleProfileEdit}>
                <span className="popup-icon">✏️</span>
                프로필 편집
                <span className="popup-arrow">›</span>
              </button>
              <div className="profile-popup-divider" />
              <button className="profile-popup-item danger" onClick={handleLogout}>
                <span className="popup-icon">🚪</span>
                로그아웃
              </button>
            </div>
          )}
          <div
            className="server-icon profile-icon"
            onClick={() => setIsProfileMenuOpen((prev) => !prev)}
            title={user?.nickname || "프로필"}
          >
            {initial}
          </div>
        </div>
      </nav>
    </>
  );
};
 
export default ServerSidebar;