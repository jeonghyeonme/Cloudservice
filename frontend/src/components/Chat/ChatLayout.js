// ChatLayout.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './ChatLayout.css';
import ServerSidebar from '../layout/ServerSidebar';
import SidebarLeft from './SidebarLeft';
import ChatWindow from './ChatWindow';
import ResourceHub from './ResourceHub';
import CreateRoomModal from '../Rooms/CreateRoomModal';
import { MOCK_ROOMS } from '../../data/mockData';

const ChatLayout = () => {
  const { roomId } = useParams(); // URL에서 roomId 추출 (예: /rooms/1 -> roomId = '1')
  const navigate = useNavigate();
  
  const [activeChannel, setActiveChannel] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 1. 현재 roomId에 해당하는 방 정보를 찾습니다.
  const currentRoom = MOCK_ROOMS.find(room => room.id === roomId);

  // 2. 방이 바뀌면 첫 번째 채널을 기본 활성화 채널로 설정합니다.
  useEffect(() => {
    if (currentRoom && currentRoom.channels.length > 0) {
      setActiveChannel(currentRoom.channels[0].id);
    }
  }, [currentRoom]);

  // 3. 만약 잘못된 roomId라면 방 목록으로 튕겨냅니다.
  if (!currentRoom) {
    return (
      <div style={{ padding: '20px', color: 'white' }}>
        <h3>방을 찾을 수 없습니다.</h3>
        <button onClick={() => navigate('/rooms')}>목록으로 돌아가기</button>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <ServerSidebar 
        activeView="chat" 
        onHomeClick={() => navigate('/rooms')} 
        onServerClick={() => {}} 
        onAddClick={() => setIsModalOpen(true)}
      />

      <SidebarLeft 
        channels={currentRoom.channels} 
        activeChannel={activeChannel} 
        onChannelClick={setActiveChannel} 
      />

      <main className="chat-content-wrapper" style={{ display: 'flex', flex: 1, minWidth: 0 }}>
        <ChatWindow 
          activeChannel={activeChannel} 
          channels={currentRoom.channels} 
        />
        <ResourceHub />
      </main>

      {isModalOpen && (
        <CreateRoomModal onClose={() => setIsModalOpen(false)} />
      )}
    </div>
  );
};

export default ChatLayout;
