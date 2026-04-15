import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRoomPath } from '../../constants/path';
import { getRooms } from '../../lib/rooms';
import './ExploreRooms.css';
import ServerSidebar from '../layout/ServerSidebar';
import CreateRoomModal from './CreateRoomModal';
import { useAuth } from '../../contexts/AuthContext'; 
import { PATHS } from '../../constants/path';
import AuthActionButton from '../common/AuthActionButton';
// import { MOCK_ROOMS } from '../../data/mockData'; // 하드코딩 데이터

const RoomCard = ({ room, onJoin }) => {
  const name = room.title || room.roomName || "제목 없음";          
  const roomId = room.roomId;        
  const description = room.description || "설명이 없습니다.";
  const currentMembers = Number(room.currentCount) || Number(room.currentParticipants) || 0;
  const maxMembers = Number(room.maxCapacity) || 12;            // JSON에 없으니 일단 12
  const coverImage = room.imageUrl || room.coverImage;
  const emoji = "📚";                // 기본 이모지
  

  const isFull = (maxMembers && currentMembers >= maxMembers) || room.status === 'FULL';
  const isLocked = room.isPrivate && isFull;
  const displayStatus = isFull ? 'FULL' : room.status;

  return (
    <div className={`room-card ${isFull ? 'room-full' : ''}`}>
      <div className="room-cover">
        {/* 이미지가 있으면 <img> 태그를, 없으면 기존처럼 이모지를 보여줌 */}
        {coverImage ? (
          <img src={coverImage} alt={name} className="room-cover-img" />
        ) : (
          <div className="room-cover-emoji">{emoji}</div>
        )}
        
        <span className={`room-badge badge-${displayStatus.toLowerCase()}`}>
          {displayStatus}
        </span>
      </div>

      <div className="room-body">
        <div className="room-title-row">
          <h3 className="room-name">{name}</h3>
          {maxMembers && (
            <span className="room-count">
              {currentMembers}/{maxMembers}
            </span>
          )}
        </div>
        <p className="room-desc">{description}</p>

        <div className="room-footer">
          <div className="member-avatars">
            {[...Array(Math.min(3, currentMembers))].map((_, i) => (
              <div key={i} className="mini-avatar" style={{ zIndex: 3 - i }} />
            ))}
            {currentMembers > 3 && (
              <span className="member-extra">+{currentMembers - 3}</span>
            )}
          </div>

          {isLocked ? (
            <button className="room-btn btn-locked" disabled>LOCKED</button>
          ) : isFull ? (
            <button className="room-btn btn-locked" disabled>FULL</button>
          ) : (
            <button className="room-btn btn-join" onClick={() => onJoin(roomId)}>
              JOIN
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const ExploreRooms = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const handleLogout = () => { 
    console.log("로그아웃 로직 실행");
    logout();
    navigate(PATHS.onboarding);
  }

  useEffect(() => {
    getRooms()
    .then(data => {
      // data.items가 배열인지 확인하고 저장
      setRooms(data.items || []); 
    })
    .catch(err => {
      console.error("데이터 로드 실패!", err);
      setRooms([]);
    });
  }, []);

  const filteredRooms = rooms.filter(room => {
    const name = (room.title || room.roomName || "").toLowerCase(); // 두 필드 모두 확인
    const description = (room.description || "").toLowerCase();
    const query = searchQuery.toLowerCase();
    return name.includes(query) || description.includes(query);
  });

  // 방 입장 시 해당 ID의 주소로 이동
  const handleJoinRoom = (roomId) => {
    navigate(getRoomPath(roomId));
  };

  return (
    <div className="explore-container">
      <ServerSidebar 
        activeView="home" 
        onServerClick={() => {}} // 이미 홈임
        onAddClick={() => setIsModalOpen(true)}
        onLogout={handleLogout}
      />

      <div className="explore-main">
        <div className="explore-topbar">
          <span className="topbar-title">스터디룸 탐색</span>
          {/* <div className="topbar-icons">
            <button className="icon-btn">🔔</button>
            <button className="icon-btn">⚙️</button>
          </div> */}
        </div>

        <div className="explore-hero">
          <h1 className="hero-title">
            새로운 <span className="accent">스터디룸</span>을 찾거나 <span className="accent">생성</span>해보세요!
          </h1>
        </div>

        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="스터디룸 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="invite-bar">
          <span className="invite-icon">🔗</span>
          <input
            type="text"
            placeholder="초대 코드 또는 URL 입력"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
          />
          <button className="join-directly-btn">즉시 입장</button>
        </div>

        <div className="rooms-grid">
          {filteredRooms.map(room => (
            <RoomCard key={room.roomId} room={room} onJoin={handleJoinRoom} />
          ))}

          <div className="room-card create-card" onClick={() => setIsModalOpen(true)}>
            <div className="create-plus">+</div>
            <p className="create-label">방 만들기</p>
            <p className="create-sub">새로운 학습 세션 시작하기</p>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <CreateRoomModal onClose={() => setIsModalOpen(false)} />
      )}
    </div>
  );
};

export default ExploreRooms;
