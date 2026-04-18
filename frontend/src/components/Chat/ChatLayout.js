import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PATHS } from "../../constants/path";
import { getServerDetail, getServerMessages } from "../../lib/servers";
import { useServers } from "../../contexts/ServerContext";
import "./ChatLayout.css";
import ServerSidebar from "../layout/ServerSidebar";
import SidebarLeft from "./SidebarLeft";
import ChatWindow from "./ChatWindow";
import ResourceHub from "./ResourceHub";
import CreateServerModal from "../Servers/CreateServerModal";
import { createChannel } from "../../lib/servers";
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
        // messages가 배열인지 items 안에 있는지 처리
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

  // 로딩 중일 때 처리
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
        onAddClick={() => setIsServerModalOpen(true)}
      />

      <SidebarLeft
        serverName={currentServer?.roomName || currentServer?.title || "로딩 중..."}
        channels={currentServer?.channels || []}
        activeChannel={activeChannel}
        onChannelClick={setActiveChannel}
        onAddChannelClick={() => setIsChannelModalOpen(true)}
      />

      <main
        className="chat-content-wrapper"
        style={{ display: "flex", flex: 1, minWidth: 0 }}
      >
        <ChatWindow
          activeChannel={activeChannel}
          channels={currentServer.channels}
        />
        <ResourceHub serverResources={currentServer} />
      </main>

      {isServerModalOpen && (
        <CreateServerModal onClose={() => setIsServerModalOpen(false)} />
      )}

      <CreateChannelModal
        open={isChannelModalOpen}
        serverName={currentServer?.roomName || currentServer?.title || "현재 서버"}
        onClose={() => setIsChannelModalOpen(false)}
        onSubmit={async (values) => {
          const trimmedName = values.name.trim();

          if (!trimmedName) {
            throw new Error("채널 이름을 입력해 주세요.");
          }

          const response = await createChannel(serverId, { name: trimmedName });
          const newChannel = {
            ...response.channel,
            label: response.channel.name,
            topic:
              values.topic?.trim() || "새 채널에 대한 첫 대화를 시작해보세요.",
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
