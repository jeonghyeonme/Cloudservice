import React from "react";

function handleRightClick(event, callback, payload) {
  event.preventDefault();
  event.stopPropagation();
  callback?.(event, payload);
}

/**
 * @title 채널 목록과 참여자 패널이 있는 서버 내부 사이드바
 * @param {string} serverName - 현재 서버 이름
 * @param {Array} channels - 채널 목록 (각 채널은 {id, name} 형태)
 * @param {string} activeChannel - 현재 활성화된 채널 ID
 * @param {function} onChannelClick - 채널 클릭 시 실행할 함수 (채널 ID 전달)
 * @param {function} onAddChannelClick - + 버튼 클릭 시 실행할 함수
 */

const SidebarLeft = ({
  serverName,
  channels,
  activeChannel,
  onChannelClick,
  onAddChannelClick,
  onServerContextMenu,
  onChannelContextMenu,
  contextMenuTargetId,
  contextMenuType,
}) => {
  return (
    <aside className="sidebar-left">
      <h2
        className="logo"
        onMouseDown={(event) => {
          if (event.button === 2) {
            handleRightClick(event, onServerContextMenu);
          }
        }}
        onContextMenu={(event) => handleRightClick(event, onServerContextMenu)}
      >
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
              className={
                "channel" +
                (activeChannel === (ch.chId || ch.id) ? " active" : "") +
                (contextMenuType === "channel" &&
                contextMenuTargetId === (ch.chId || ch.id)
                  ? " context-open"
                  : "")
              }
              onClick={() => onChannelClick(ch.chId || ch.id)}
              onMouseDown={(event) => {
                if (event.button === 2) {
                  handleRightClick(event, onChannelContextMenu, ch);
                }
              }}
              onContextMenu={(event) =>
                handleRightClick(event, onChannelContextMenu, ch)
              }
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
