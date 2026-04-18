import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PATHS } from "../../constants/path";
import { getServerDetail, getServerMessages, createChannel } from "../../lib/servers";
import { useServers } from "../../contexts/ServerContext";
import "./ChatLayout.css";
import ServerSidebar from "../layout/ServerSidebar";
import SidebarLeft from "./SidebarLeft";
import ChatWindow from "./ChatWindow";
import ResourceHub from "./ResourceHub";
import CreateServerModal from "../Servers/CreateServerModal";
import CreateChannelModal from "./CreateChannelModal";

const ChatLayout = () => {
  const { serverId } = useParams();
  const navigate = useNavigate();
  const { setActiveServerId, upsertJoinedServer } = useServers();

  const [currentServer, setCurrentServer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeChannel, setActiveChannel] = useState("");
  const [isServerModalOpen, setIsServerModalOpen] = useState(false);
  const [isChannelModalOpen, setIsChannelModalOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    setActiveServerId(serverId);

    Promise.all([getServerDetail(serverId), getServerMessages(serverId)])
      .then(([serverData, messagesData]) => {
        const messages = Array.isArray(messagesData)
          ? messagesData
          : messagesData?.items || [];
        if (serverData) {
          const channels = serverData.channels || [
            { id: "ch-general", name: "일반", label: "일반" },
          ];

          const serverWithChannels = {
            ...serverData,
            channels: channels.map((ch, idx) => ({
              ...ch,
              label: ch.label || ch.name,
              messages: idx === 0 ? messages : [],
            })),
          };
          // serverId 우선 사용, 기존 roomId 호환을 위해 fallback 처리
          // 백엔드 마이그레이션 완료 후에는 server.serverId만 사용하면 됨
          upsertJoinedServer(serverData);
          setCurrentServer(serverWithChannels);
          if (channels.length > 0) {
            setActiveChannel(channels[0].id || channels[0].chId);
          }
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("서버 정보를 가져오는 중 오류 발생:", err);
        setLoading(false);
      });
  }, [serverId, setActiveServerId, upsertJoinedServer]);

  if (loading)
    return (
      <div style={{ color: "white", padding: "20px" }}>
        서버 정보를 가져오는 중...
      </div>
    );

  if (!currentServer) {
    return (
      <div style={{ padding: "20px", color: "white" }}>
        <h3>서버를 찾을 수 없습니다. (ID: {serverId})</h3>
        <button onClick={() => navigate(PATHS.explore)}>목록으로 돌아가기</button>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <ServerSidebar
        activeView="chat"
        onServerClick={() => {}}
        onAddClick={() => setIsServerModalOpen(true)}
      />

      {/* 백엔드 getServerDetail 응답의 members 배열과 hostId를 SidebarLeft에 전달 */}
      {/* 채널 추가 버튼 클릭 시 CreateChannelModal 오픈 */}
      <SidebarLeft
        serverName={currentServer?.serverName || currentServer?.roomName || currentServer?.title || "로딩 중..."}
        channels={currentServer?.channels || []}
        activeChannel={activeChannel}
        onChannelClick={setActiveChannel}
        onAddChannelClick={() => setIsChannelModalOpen(true)}
        members={currentServer?.members || []}
        hostId={currentServer?.hostId}
      />

      <main className="chat-content-wrapper" style={{ display: "flex", flex: 1, minWidth: 0 }}>
        <ChatWindow activeChannel={activeChannel} channels={currentServer.channels} />
        <ResourceHub roomResources={currentServer} />
      </main>

      {isServerModalOpen && (
        <CreateServerModal onClose={() => setIsServerModalOpen(false)} />
      )}

      {/* 채널 생성 모달 — POST /servers/{serverId}/channels API 호출 후 로컬 state 즉시 반영 */}
      <CreateChannelModal
        open={isChannelModalOpen}
        serverName={currentServer?.serverName || currentServer?.roomName || currentServer?.title || "현재 서버"}
        onClose={() => setIsChannelModalOpen(false)}
        onSubmit={async (values) => {
          const trimmedName = values.name.trim();
          if (!trimmedName) throw new Error("채널 이름을 입력해 주세요.");

          const response = await createChannel(serverId, { name: trimmedName });
          const newChannel = {
            ...response.channel,
            label: response.channel.name,
            topic: values.topic?.trim() || "새 채널에 대한 첫 대화를 시작해보세요.",
            messages: [],
          };

          setCurrentServer((prev) => ({
            ...prev,
            channels: [...(prev?.channels || []), newChannel],
          }));
          setActiveChannel(newChannel.chId || newChannel.id);
          setIsChannelModalOpen(false);
        }}
      />
    </div>
  );
};

export default ChatLayout;