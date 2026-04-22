import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PATHS } from "../../../constants/path";
import {
  createChannel,
  getServerDetail,
  getServerMessages,
} from "../../../lib/servers";

function normalizeServerWithMessages(serverData, messagesData) {
  const messages = Array.isArray(messagesData)
    ? messagesData
    : messagesData?.items || [];
  const channels = serverData?.channels || [
    { id: "ch-general", name: "일반", label: "일반" },
  ];

  return {
    ...serverData,
    channels: channels.map((channel, index) => ({
      ...channel,
      label: channel.label || channel.name,
      messages: index === 0 ? messages : [],
    })),
  };
}

function useChatServerData({
  serverId,
  setActiveServerId,
  upsertJoinedServer,
  removeJoinedServer,
}) {
  const navigate = useNavigate();
  const [currentServer, setCurrentServer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeChannel, setActiveChannel] = useState("");

  useEffect(() => {
    let isMounted = true;

    setLoading(true);
    setActiveServerId(serverId);

    Promise.all([getServerDetail(serverId), getServerMessages(serverId)])
      .then(([serverData, messagesData]) => {
        if (!isMounted) {
          return;
        }

        const normalizedServer = normalizeServerWithMessages(
          serverData,
          messagesData,
        );

        upsertJoinedServer(serverData);
        setCurrentServer(normalizedServer);
        setActiveChannel(
          normalizedServer.channels[0]?.id || normalizedServer.channels[0]?.chId || "",
        );
        setLoading(false);
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }

        console.error("서버 정보를 가져오는 중 오류 발생:", error);
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [serverId, setActiveServerId, upsertJoinedServer]);
  const applyServerUpdate = (updatedServer) => {
    setCurrentServer((prev) => ({
      ...prev,
      ...updatedServer,
      channels: updatedServer.channels || prev?.channels || [],
    }));
    upsertJoinedServer(updatedServer);
  };

  const createChannelInServer = async (values) => {
    const trimmedName = values.name.trim();

    if (!trimmedName) {
      throw new Error("채널 이름을 입력해 주세요.");
    }

    const response = await createChannel(serverId, {
      name: trimmedName,
      topic: values.topic?.trim() || "",
    });

    const newChannel = {
      ...response.channel,
      label: response.channel.label || response.channel.name,
      topic: values.topic?.trim() || "새 채널에 대한 첫 대화를 시작해보세요.",
      messages: [],
    };

    setCurrentServer((prev) => ({
      ...prev,
      channels: [...(prev?.channels || []), newChannel],
    }));
    setActiveChannel(newChannel.chId || newChannel.id);
  };

  const saveServerSettings = async (values) => {
    const trimmedName = values.serverName.trim();

    if (!trimmedName) {
      throw new Error("서버 이름을 입력해 주세요.");
    }

    applyServerUpdate({
      ...currentServer,
      roomName: trimmedName,
      description: values.description?.trim() || "",
      maxCapacity: Number(values.maxParticipants),
      isPrivate: values.privacy === "Private",
      updatedAt: new Date().toISOString(),
    });
  };

  const saveChannelSettings = async (channel, values) => {
    const trimmedName = values.name.trim();

    if (!trimmedName || !channel) {
      throw new Error("채널 이름을 입력해 주세요.");
    }

    setCurrentServer((prev) => ({
      ...prev,
      channels: (prev?.channels || []).map((item) =>
        (item.chId || item.id) === (channel.chId || channel.id)
          ? {
              ...item,
              name: trimmedName,
              label: trimmedName,
              topic: values.topic?.trim() || "",
              updatedAt: new Date().toISOString(),
            }
          : item,
      ),
    }));
  };

  const removeServer = async () => {
    removeJoinedServer(serverId);
    navigate(PATHS.explore);
  };

  const removeChannel = async (channel) => {
    const channelId = channel.chId || channel.id;

    setCurrentServer((prev) => {
      const updatedChannels = (prev?.channels || []).filter(
        (item) => (item.chId || item.id) !== channelId,
      );

      setActiveChannel((prevActiveChannel) => {
        if (prevActiveChannel !== channelId) {
          return prevActiveChannel;
        }

        return updatedChannels[0]?.chId || updatedChannels[0]?.id || "";
      });

      return {
        ...prev,
        channels: updatedChannels,
      };
    });
  };

  return {
    currentServer,
    loading,
    activeChannel,
    setActiveChannel,
    createChannelInServer,
    saveServerSettings,
    saveChannelSettings,
    removeServer,
    removeChannel,
  };
}

export default useChatServerData;
