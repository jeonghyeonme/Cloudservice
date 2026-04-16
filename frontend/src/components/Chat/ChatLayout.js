import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PATHS } from "../../constants/path";
import { getRoomDetail, getRoomMessages } from "../../lib/rooms";
import { useAuth } from "../../contexts/AuthContext";
import { useRooms } from "../../contexts/RoomContext";
import "./ChatLayout.css";
import ServerSidebar from "../layout/ServerSidebar";
import SidebarLeft from "./SidebarLeft";
import ChatWindow from "./ChatWindow";
import ResourceHub from "./ResourceHub";
import CreateRoomModal from "../Rooms/CreateRoomModal";

const ChatLayout = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { logout, refreshToken } = useAuth();
  const { setActiveRoomId, upsertJoinedRoom, clearJoinedRooms } = useRooms();

  const [currentRoom, setCurrentRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeChannel, setActiveChannel] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleLogout = async () => {
    try {
      if (refreshToken) {
        const { logout: logoutApi } = await import("../../lib/auth");
        await logoutApi(refreshToken);
      }
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      clearJoinedRooms();
      logout();
      navigate(PATHS.onboarding, { replace: true });
    }
  };

  useEffect(() => {
    setLoading(true);
    setActiveRoomId(roomId);

    Promise.all([getRoomDetail(roomId), getRoomMessages(roomId)])
      .then(([roomData, messagesData]) => {
        const messages = Array.isArray(messagesData)
          ? messagesData
          : messagesData?.items || [];

        if (roomData) {
          const channels = roomData.channels || [
            { id: "ch-general", name: "일반", label: "일반" },
          ];

          const roomWithChannels = {
            ...roomData,
            channels: channels.map((ch, idx) => ({
              ...ch,
              label: ch.label || ch.name,
              messages: idx === 0 ? messages : [],
            })),
          };
          upsertJoinedRoom(roomData);

          setCurrentRoom(roomWithChannels);
          if (channels.length > 0) {
            setActiveChannel(channels[0].id || channels[0].chId);
          }
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("방 정보를 가져오는 중 오류 발생:", err);
        setLoading(false);
      });
  }, [roomId, setActiveRoomId, upsertJoinedRoom]);

  if (loading)
    return (
      <div style={{ color: "white", padding: "20px" }}>
        방 정보를 가져오는 중...
      </div>
    );

  if (!currentRoom) {
    return (
      <div style={{ padding: "20px", color: "white" }}>
        <h3>방을 찾을 수 없습니다. (ID: {roomId})</h3>
        <button onClick={() => navigate(PATHS.explore)}>
          목록으로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <ServerSidebar
        activeView="chat"
        onServerClick={() => {}}
        onAddClick={() => setIsModalOpen(true)}
        onLogout={handleLogout}
      />

      <SidebarLeft
        roomName={currentRoom?.roomName || currentRoom?.title || "로딩 중..."}
        channels={currentRoom?.channels || []}
        activeChannel={activeChannel}
        onChannelClick={setActiveChannel}
        members={currentRoom?.members || []}
        hostId={currentRoom?.hostId}
      />

      <main
        className="chat-content-wrapper"
        style={{ display: "flex", flex: 1, minWidth: 0 }}
      >
        <ChatWindow
          activeChannel={activeChannel}
          channels={currentRoom.channels}
        />
        <ResourceHub roomResources={currentRoom} />
      </main>

      {isModalOpen && <CreateRoomModal onClose={() => setIsModalOpen(false)} />}
    </div>
  );
};

export default ChatLayout;