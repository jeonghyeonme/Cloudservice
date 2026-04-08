import React from 'react';
import './ServerSidebar.css';

/**
 * 극좌측 서버 네비게이션 바
 * @param {string} activeView - 현재 활성화된 뷰 ('home', 'chat' 등)
 * @param {function} onHomeClick - 홈 아이콘 클릭 시 실행할 함수
 * @param {function} onServerClick - 서버 아이콘 클릭 시 실행할 함수
 * @param {function} onAddClick - + 버튼 클릭 시 실행할 함수 (모달 오픈 등)
 */
const ServerSidebar = ({ activeView, onHomeClick, onServerClick, onAddClick }) => {
  return (
    <nav className="server-nav">
      {/* 홈 아이콘 */}
      <div 
        className={`server-icon home-icon ${activeView === 'home' ? 'active' : ''}`} 
        onClick={onHomeClick} 
        title="홈으로"
      >
        <span>🏠</span>
      </div>
      
      <div className="server-separator"></div>
      
      {/* 스터디룸/서버 아이콘들 (현재는 더미 데이터) */}
      <div 
        className={`server-icon dummy-bg-1 ${activeView === 'chat' ? 'active-server' : ''}`} 
        onClick={onServerClick}
        title="스터디룸 입장"
      ></div>
      
      <div 
        className="server-icon dummy-bg-2" 
        onClick={onServerClick}
        title="스터디룸 입장"
      ></div>
      
      {/* 서버 추가 버튼 */}
      <div className="server-icon add-btn" onClick={onAddClick} title="서버 추가">
        +
      </div>
      
      <div className="spacer"></div>
    </nav>
  );
};

export default ServerSidebar;
