import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './ExploreRooms.css';
import ServerSidebar from '../layout/ServerSidebar';
import CreateRoomModal from './CreateRoomModal';
// import { MOCK_ROOMS } from '../../data/mockData'; // 하드코딩 데이터

const RoomCard = ({ room, onJoin }) => {
  const name = room.title || "제목 없음";           
  const roomId = room.roomId;        
  const description = room.description;
  const currentMembers = Number(room.currentParticipants) || 0;
  const maxMembers = 12;             // JSON에 없으니 일단 12
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
  const [rooms, setRooms] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetch('http://localhost:4000/dev/rooms') // 전체를 가져와서 찾거나, 상세 API가 있다면 그걸 사용
      .then(res => res.json())
      .then(data => setRooms(data))
      .catch(err => console.error("데이터 로드 실패!", err));
  }, []);

  const filteredRooms = rooms.filter(room =>{
    const title = room.title || ""; 
    const description = room.description || "";
    return title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    description.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // 방 입장 시 해당 ID의 주소로 이동
  const handleJoinRoom = (roomId) => {
    navigate(`/rooms/${roomId}`);
  };

  return (
    <div className="explore-container">
      <ServerSidebar 
        activeView="home" 
        onHomeClick={() => navigate('/explore')} 
        onServerClick={() => {}} // 이미 홈임
        onAddClick={() => setIsModalOpen(true)}
      />

      <div className="explore-main">
        <div className="explore-topbar">
          <span className="topbar-title">EXPLORE ROOMS</span>
          <div className="topbar-icons">
            <button className="icon-btn">🔔</button>
            <button className="icon-btn">⚙️</button>
          </div>
        </div>

        <div className="explore-hero">
          <h1 className="hero-title">
            서버를 <span className="accent">생성</span>하거나 <span className="accent">가입</span>해보세요!
          </h1>
        </div>

        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search Study Rooms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="invite-bar">
          <span className="invite-icon">🔗</span>
          <input
            type="text"
            placeholder="Enter Invite Code/URL"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
          />
          <button className="join-directly-btn">JOIN DIRECTLY</button>
        </div>

        <div className="rooms-grid">
          {filteredRooms.map(room => (
            <RoomCard key={room.roomId} room={room} onJoin={handleJoinRoom} />
          ))}

          <div className="room-card create-card" onClick={() => setIsModalOpen(true)}>
            <div className="create-plus">+</div>
            <p className="create-label">CREATE ROOM</p>
            <p className="create-sub">START A NEW STUDY SESSION</p>
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
