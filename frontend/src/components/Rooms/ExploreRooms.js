import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './ExploreRooms.css';
import ServerSidebar from '../layout/ServerSidebar';
import CreateRoomModal from './CreateRoomModal';
import { MOCK_ROOMS } from '../../data/mockData';

const RoomCard = ({ room, onJoin }) => {
  const isFull = (room.maxMembers && room.currentMembers >= room.maxMembers) || room.status === 'FULL';
  const isLocked = room.isPrivate && isFull;
  const displayStatus = isFull ? 'FULL' : room.status;

  return (
    <div className={`room-card ${isFull ? 'room-full' : ''}`}>
      <div className="room-cover">
        <div className="room-cover-emoji">{room.emoji}</div>
        <span className={`room-badge badge-${displayStatus.toLowerCase()}`}>
          {displayStatus}
        </span>
      </div>

      <div className="room-body">
        <div className="room-title-row">
          <h3 className="room-name">{room.name}</h3>
          {room.maxMembers && (
            <span className="room-count">
              {room.currentMembers}/{room.maxMembers}
            </span>
          )}
        </div>
        <p className="room-desc">{room.description}</p>

        <div className="room-footer">
          <div className="member-avatars">
            {[...Array(Math.min(3, room.currentMembers))].map((_, i) => (
              <div key={i} className="mini-avatar" style={{ zIndex: 3 - i }} />
            ))}
            {room.currentMembers > 3 && (
              <span className="member-extra">+{room.currentMembers - 3}</span>
            )}
          </div>

          {isLocked ? (
            <button className="room-btn btn-locked" disabled>LOCKED</button>
          ) : isFull ? (
            <button className="room-btn btn-locked" disabled>FULL</button>
          ) : (
            <button className="room-btn btn-join" onClick={() => onJoin(room.id)}>
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
  const [searchQuery, setSearchQuery] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filteredRooms = MOCK_ROOMS.filter(room =>
    room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    room.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 방 입장 시 해당 ID의 주소로 이동
  const handleJoinRoom = (roomId) => {
    navigate(`/rooms/${roomId}`);
  };

  return (
    <div className="explore-container">
      <ServerSidebar 
        activeView="home" 
        onHomeClick={() => navigate('/rooms')} 
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
            <RoomCard key={room.id} room={room} onJoin={handleJoinRoom} />
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
