// ChatLayout.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PATHS } from '../../constants/path';
import { getRoomDetail, getRoomMessages } from '../../lib/rooms';
import './ChatLayout.css';
import ServerSidebar from '../layout/ServerSidebar';
import SidebarLeft from './SidebarLeft';
import ChatWindow from './ChatWindow';
import ResourceHub from './ResourceHub';
import CreateRoomModal from '../Rooms/CreateRoomModal';

const ChatLayout = () => {
  const { roomId } = useParams(); // URL에서 roomId 추출
  const navigate = useNavigate();

  const [currentRoom, setCurrentRoom] = useState(null);
  const [loading, setLoading] = useState(true); 
  
  const [activeChannel, setActiveChannel] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    
    // 방 상세 정보와 메시지 이력을 병렬로 호출
    Promise.all([
      getRoomDetail(roomId),
      getRoomMessages(roomId)
    ])
      .then(([roomData, messagesData]) => {
        // messages가 배열인지 items 안에 있는지 처리
        const messages = Array.isArray(messagesData) ? messagesData : (messagesData?.items || []);
        
        if (roomData) {
          const channels = roomData.channels || [{ id: 'ch-general', name: '일반', label: '일반' }];
          
          const roomWithChannels = {
            ...roomData,
            channels: channels.map((ch, idx) => ({
              ...ch,
              label: ch.label || ch.name,
              messages: idx === 0 ? messages : []
            }))
          };
          
          setCurrentRoom(roomWithChannels);
          if (channels.length > 0) {
            setActiveChannel(channels[0].id || channels[0].chId);
          }
        }
        setLoading(false);
      })
  }, [roomId]);

  // 로딩 중일 때 처리
  if (loading) return <div style={{ color: 'white', padding: '20px' }}>방 정보를 가져오는 중...</div>;

  // 진짜로 방이 없을 때 처리 (서버에도 없을 때)
  if (!currentRoom) {
    return (
      <div style={{ padding: '20px', color: 'white' }}>
        <h3>방을 찾을 수 없습니다. (ID: {roomId})</h3>
        <button onClick={() => navigate(PATHS.explore)}>목록으로 돌아가기</button>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <ServerSidebar 
        activeView="chat" 
        onServerClick={() => {}} 
        onAddClick={() => setIsModalOpen(true)}
      />

      <SidebarLeft 
        roomName={currentRoom?.roomName || currentRoom?.title || "로딩 중..."} // 방 제목을 넘겨줌
        channels={currentRoom?.channels || []} 
        activeChannel={activeChannel} 
        onChannelClick={setActiveChannel}
      />

      <main className="chat-content-wrapper" style={{ display: 'flex', flex: 1, minWidth: 0 }}>
        <ChatWindow 
          activeChannel={activeChannel} 
          channels={currentRoom.channels} 
        />
        <ResourceHub roomResources={currentRoom} />
      </main>

      {isModalOpen && (
        <CreateRoomModal onClose={() => setIsModalOpen(false)} />
      )}
    </div>
  );
};

export default ChatLayout;
