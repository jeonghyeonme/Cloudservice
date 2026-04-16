import React from 'react';
import { useAuth } from "../../contexts/AuthContext";

const SidebarLeft = ({ roomName, channels, activeChannel, onChannelClick, members = [], hostId }) => {
  const { user } = useAuth();
  const currentNickname = user?.nickname;

  // 멤버를 온라인/오프라인으로 분류 (WebSocket 연결 전이라 일단 현재 유저만 온라인 처리)
  const onlineMembers = members.filter(m => m.nickname === currentNickname);
  const offlineMembers = members.filter(m => m.nickname !== currentNickname);

  return (
    <aside className="sidebar-left">
      <h2 className="logo">{roomName}</h2>
      <div className="channel-list">
        {channels && channels.length > 0 ? (
          channels.map(ch => (
            <div
              key={ch.chId || ch.id}
              className={"channel" + (activeChannel === (ch.chId || ch.id) ? " active" : "")}
              onClick={() => onChannelClick(ch.chId || ch.id)}
            >
              <span className="hash">#</span> {ch.name || ch.label || "이름 없는 채널"}
            </div>
          ))
        ) : (
          <div className="no-channels-msg" style={{ padding: '0 20px', fontSize: '0.8rem', color: '#888' }}>
            채널을 불러오는 중...
          </div>
        )}
      </div>
      <div className="spacer" />

      {/* 멤버 목록 */}
      <div className="member-panel">
        <div className="member-panel-header">
          참여자 — {onlineMembers.length}명 온라인
        </div>
        <div className="member-list">
          {onlineMembers.map(m => (
            <div key={m.userId} className="member online">
              <div className="avatar-wrapper">
                <div className="avatar">{m.nickname?.charAt(0).toUpperCase()}</div>
                <div className="status-dot"></div>
              </div>
              <span className="name green-text">
                {m.nickname}
                {m.userId === hostId && <span className="bot-tag" style={{ marginLeft: '6px' }}>방장</span>}
              </span>
            </div>
          ))}

          {offlineMembers.length > 0 && (
            <>
              <div className="member-category mt-20">오프라인 — {offlineMembers.length}명</div>
              {offlineMembers.map(m => (
                <div key={m.userId} className="member offline">
                  <div className="avatar-wrapper">
                    <div className="avatar">{m.nickname?.charAt(0).toUpperCase()}</div>
                  </div>
                  <span className="name">
                    {m.nickname}
                    {m.userId === hostId && <span className="bot-tag" style={{ marginLeft: '6px' }}>방장</span>}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </aside>
  );
};

export default SidebarLeft;