// ChatLayout.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './ChatLayout.css';
import ServerSidebar from '../layout/ServerSidebar';
import SidebarLeft from './SidebarLeft';
import ChatWindow from './ChatWindow';
import ResourceHub from './ResourceHub';
import CreateRoomModal from '../Rooms/CreateRoomModal';
// import { MOCK_ROOMS } from '../../data/mockData';

const ChatLayout = () => {
  const { roomId } = useParams(); // URL에서 roomId 추출 (예: /rooms/1 -> roomId = '1')
  const navigate = useNavigate();

  const [currentRoom, setCurrentRoom] = useState(null);
  const [loading, setLoading] = useState(true); // 로딩 상태 추가
  
  const [activeChannel, setActiveChannel] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`http://localhost:4000/dev/rooms`) // 전체를 가져와서 찾거나, 상세 API가 있다면 그걸 사용
      .then(res => res.json())
      .then(data => {
        // 배열 중에서 현재 URL의 roomId와 일치하는 방을 찾습니다.
        const foundRoom = data.find(r => r.roomId === roomId);
        
        if (foundRoom) {
          // 서버 데이터에 channels가 없을 경우를 대비해 기본값(Empty Array)을 넣어줍니다.
          const roomWithChannels = {
            ...foundRoom,
            channels: foundRoom.channels || [{ id: 'general', name: '일반' }] 
          };
          setCurrentRoom(roomWithChannels);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("방 정보 불러오기 실패:", err);
        setLoading(false);
      });
  }, [roomId]);

  // 방 정보가 로드되면 첫 번째 채널 활성화
  useEffect(() => {
    if (currentRoom && currentRoom.channels && currentRoom.channels.length > 0) {
      setActiveChannel(currentRoom.channels[0].id);
    }
  }, [currentRoom]);

  // 로딩 중일 때 처리
  if (loading) return <div style={{ color: 'white', padding: '20px' }}>방 정보를 가져오는 중...</div>;

  // 진짜로 방이 없을 때 처리 (서버에도 없을 때)
  if (!currentRoom) {
    return (
      <div style={{ padding: '20px', color: 'white' }}>
        <h3>방을 찾을 수 없습니다. (ID: {roomId})</h3>
        <button onClick={() => navigate('/explore')}>목록으로 돌아가기</button>
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
        roomName={currentRoom?.title || "로딩 중..."} // 방 제목을 넘겨줌
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
