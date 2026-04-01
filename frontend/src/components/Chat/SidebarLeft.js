import React from 'react';

const SidebarLeft = ({ channels, activeChannel, onChannelClick }) => {
  return (
    <aside className="sidebar-left">
      <h2 className="logo">STUDYSUBSTRATUM</h2>
      <div className="channel-list">
        {channels.map(ch => (
          <div
            key={ch.id}
            className={"channel" + (activeChannel === ch.id ? " active" : "")}
            onClick={() => onChannelClick(ch.id)}
          >
            <span className="hash">#</span> {ch.label}
          </div>
        ))}
      </div>
      <div className="spacer" />

      {/* 멤버 목록 */}
      <div className="member-panel">
        <div className="member-panel-header">MEMBERS</div>
        <div className="member-list">
          <div className="member-category">ONLINE — 4</div>
          <div className="member online">
            <div className="avatar-wrapper"><div className="avatar">SM</div><div className="status-dot"></div></div>
            <span className="name green-text">StudyMaster_24</span>
          </div>
          <div className="member online">
            <div className="avatar-wrapper"><div className="avatar">A</div><div className="status-dot"></div></div>
            <span className="name">Aiden</span>
          </div>
          <div className="member online">
            <div className="avatar-wrapper"><div className="avatar">S</div><div className="status-dot"></div></div>
            <span className="name">Sarah M.</span>
          </div>
          <div className="member online">
            <div className="avatar-wrapper"><div className="avatar bg-ai">AI</div><div className="status-dot"></div></div>
            <span className="name">SAGE AI <span className="bot-tag">BOT</span></span>
          </div>
          <div className="member-category mt-20">OFFLINE — 2</div>
          <div className="member offline">
            <div className="avatar-wrapper"><div className="avatar dummy-offline"></div></div>
            <span className="name">Marcus_K</span>
          </div>
          <div className="member offline">
            <div className="avatar-wrapper"><div className="avatar dummy-offline"></div></div>
            <span className="name">JennyLee</span>
          </div>
        </div>
      </div>

      {/* 하단 내 프로필 */}
      <div className="my-profile">
        <div className="avatar my-avatar">SM</div>
        <div className="my-info">
          <span className="my-name">StudyMaster_24</span>
          <span className="my-status">Online</span>
        </div>
        <button className="my-settings" title="설정">⚙️</button>
      </div>
    </aside>
  );
};

export default SidebarLeft;
