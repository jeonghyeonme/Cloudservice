import React from "react";
import { useAuth } from "../../contexts/AuthContext";

/**
 * @title 채널 목록과 참여자 패널이 있는 서버 내부 사이드바
 * @param {string} serverName - 현재 서버 이름
 * @param {Array} channels - 채널 목록 ({chId, name, label} 형태)
 * @param {string} activeChannel - 현재 활성화된 채널 ID
 * @param {function} onChannelClick - 채널 클릭 시 실행 (채널 ID 전달)
 * @param {function} onAddChannelClick - 채널 추가 버튼 클릭 시 실행
 * @param {Array} members - 서버 멤버 목록 ({userId, nickname, role} 형태, getRoomDetail 응답에서 전달)
 * @param {string} hostId - 방장 userId (방장 태그 표시용)
 * @modified 하드코딩된 멤버 목록을 백엔드 members 배열 기반으로 동적 렌더링하도록 변경
 *           WebSocket 연동 전이라 현재 로그인 유저만 온라인으로 표시 (임시)
 */
const SidebarLeft = ({
  serverName,
  channels,
  activeChannel,
  onChannelClick,
  onAddChannelClick,
  members = [],
  hostId,
}) => {
  const { user } = useAuth();
  const currentNickname = user?.nickname;
  
  // WebSocket 미연동 상태: 현재 로그인한 유저만 온라인, 나머지는 오프라인으로 분류
  // TODO: WebSocket $connect/$disconnect 이벤트로 실제 온라인 상태 관리
  const onlineMembers = members.filter(m => m.nickname === currentNickname);
  const offlineMembers = members.filter(m => m.nickname !== currentNickname);

  return (
    <aside className="sidebar-left">
      <h2 className="logo">
        <span className="logo-text">{serverName}</span>
        <button
          type="button"
          className="logo-add-button"
          aria-label="채널 추가"
          onClick={onAddChannelClick}
        >
          +
        </button>
      </h2>

      <div className="channel-list">
        {channels && channels.length > 0 ? (
          channels.map((ch) => (
            <div
              key={ch.chId || ch.id}
              className={"channel" + (activeChannel === (ch.chId || ch.id) ? " active" : "")}
              onClick={() => onChannelClick(ch.chId || ch.id)}
            >
              <span className="hash">#</span>{" "}
              {ch.name || ch.label || "이름 없는 채널"}
            </div>
          ))
        ) : (
          <div className="no-channels-msg" style={{ padding: "0 20px", fontSize: "0.8rem", color: "#888" }}>
            채널을 불러오는 중...
          </div>
        )}
      </div>
      <div className="spacer" />

      <div className="member-panel">
        <div className="member-panel-header">참여자 — {onlineMembers.length}명 온라인</div>
        <div className="member-list">
          {onlineMembers.map((m) => (
            <div key={m.userId} className="member online">
              <div className="avatar-wrapper">
                <div className="avatar">{m.nickname?.charAt(0).toUpperCase()}</div>
                <div className="status-dot"></div>
              </div>
              <span className="name green-text">
                {m.nickname}
                {m.userId === hostId && <span className="bot-tag" style={{ marginLeft: "6px" }}>방장</span>}
              </span>
            </div>
          ))}

          {offlineMembers.length > 0 && (
            <>
              <div className="member-category mt-20">오프라인 — {offlineMembers.length}명</div>
              {offlineMembers.map((m) => (
                <div key={m.userId} className="member offline">
                  <div className="avatar-wrapper">
                    <div className="avatar">{m.nickname?.charAt(0).toUpperCase()}</div>
                  </div>
                  <span className="name">
                    {m.nickname}
                    {m.userId === hostId && <span className="bot-tag" style={{ marginLeft: "6px" }}>방장</span>}
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