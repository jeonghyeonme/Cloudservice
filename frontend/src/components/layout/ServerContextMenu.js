import React from 'react';
import './ServerContextMenu.css';

const ServerContextMenu = ({ x, y, server, isHost, onClose, onSettings, onDelete, onLeave }) => {
  return (
    <>
      <div className="context-menu-backdrop" onClick={onClose} />
      <div className="server-context-menu" style={{ top: y, left: x }}>
        <div className="context-menu-header">{server.serverName}</div>
        
        {/* 호스트일 때만 '설정' 메뉴 노출 */}
        {isHost && (
          <button className="context-menu-item" onClick={() => onSettings(server)}>
            <span className="menu-icon">⚙️</span> 서버 설정
          </button>
        )}

        <div className="context-menu-divider" />

        {/* 🔴 조건부 렌더링: 호스트면 삭제, 아니면 나가기 */}
        {isHost ? (
          <button className="context-menu-item danger" onClick={() => onDelete(server)}>
            <span className="menu-icon">🗑️</span> 서버 삭제
          </button>
        ) : (
          <button className="context-menu-item danger" onClick={() => onLeave(server)}>
            <span className="menu-icon">🚪</span> 서버 나가기
          </button>
        )}
      </div>
    </>
  );
};

export default ServerContextMenu;