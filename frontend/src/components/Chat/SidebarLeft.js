import React from "react";

const SidebarLeft = ({ roomName, channels, activeChannel, onChannelClick }) => {
  return (
    <aside className="sidebar-left">
      <h2 className="logo">
        <span className="logo-text">{roomName}</span>
        <button type="button" className="logo-add-button" aria-label="채널 추가">
          +
        </button>
      </h2>

      <div className="channel-list">
        {channels && channels.length > 0 ? (
          channels.map((ch) => (
            <div
              key={ch.chId || ch.id}
              className={
                "channel" +
                (activeChannel === (ch.chId || ch.id) ? " active" : "")
              }
              onClick={() => onChannelClick(ch.chId || ch.id)}
            >
              <span className="hash">#</span>{" "}
              {ch.name || ch.label || "이름 없는 채널"}
            </div>
          ))
        ) : (
          <div
            className="no-channels-msg"
            style={{ padding: "0 20px", fontSize: "0.8rem", color: "#888" }}
          >
            채널을 불러오는 중...
          </div>
        )}
      </div>
      <div className="spacer" />

      {/* 멤버 목록 */}
      <div className="member-panel">
        <div className="member-panel-header">참여자 — 1명 온라인</div>
        <div className="member-list">
          <div className="member online">
            <div className="avatar-wrapper">
              <div className="avatar"></div>
              <div className="status-dot"></div>
            </div>
            <span className="name green-text">사용자</span>
            {/* <span className="my-name">사용자</span> */}
          </div>

          <div className="member-category mt-20">오프라인 — 1명</div>
          <div className="member offline">
            <div className="avatar-wrapper">
              <div className="avatar dummy-offline">AI</div>
            </div>
            <span className="name">
              SAGE AI <span className="bot-tag">봇</span>
            </span>
          </div>
        </div>
      </div>

      {/* 하단 내 프로필 */}
      {/* <div className="my-profile">
        <div className="avatar my-avatar"></div>
        <div className="my-info">
          <span className="my-name">사용자</span>
          <span className="my-status">온라인</span>
        </div>
        <button className="my-settings" title="설정">⚙️</button>
      </div> */}
    </aside>
  );
};
export default SidebarLeft;
