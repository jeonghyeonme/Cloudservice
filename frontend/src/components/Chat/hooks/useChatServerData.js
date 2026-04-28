import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PATHS } from "../../../constants/path";
import {
  createChannel,
  deleteChannel,
  getServerDetail,
  getServerMessages,
  updateServer,
  deleteServer,
  leaveServer as leaveServerApi,
} from "../../../lib/servers";
import { normalizeServer } from "../../../lib/serverEntity";

function normalizeServerWithMessages(serverData, messagesData) {
  const normalizedServer = normalizeServer(serverData);
  const messages = Array.isArray(messagesData)
    ? messagesData
    : messagesData?.items || [];
  const channels = normalizedServer.channels || [
    { id: "ch-general", name: "일반", label: "일반", isDefault: true },
  ];

  return {
    ...normalizedServer,
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

    getServerDetail(serverId)
      .then(async (serverData) => {
        const messagesData = await getServerMessages(serverId).catch((error) => {
          console.error("메시지 정보를 가져오는 중 오류 발생:", error);
          return [];
        });

        if (!isMounted) {
          return;
        }

        const normalizedServer = normalizeServerWithMessages(
          serverData,
          messagesData,
        );

        upsertJoinedServer(normalizedServer);
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
    const normalizedServer = normalizeServer(updatedServer);

    setCurrentServer((prev) => ({
      ...prev,
      ...normalizedServer,
      channels: normalizedServer.channels || prev?.channels || [],
    }));
    upsertJoinedServer(normalizedServer);
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
      isDefault: response.channel.isDefault || false,
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

    const updatedServer = await updateServer(serverId, {
      serverName: trimmedName,
      description: values.description?.trim() || "",
      maxCapacity: Number(values.maxParticipants),
      isPrivate: values.privacy === "Private",
    });

    applyServerUpdate(updatedServer);
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
    await deleteServer(serverId);
    removeJoinedServer(serverId);
    navigate(PATHS.explore);
  };

  const leaveServer = async () => {
    await leaveServerApi(serverId);
    removeJoinedServer(serverId);
    navigate(PATHS.explore);
  };

  const removeChannel = async (channel) => {
    const channelId = channel.chId || channel.id;

    if (channel.isDefault) {
      alert("기본채널은 삭제가 불가합니다.");
      return;
    }

    try {
      await deleteChannel(serverId, channelId);
    } catch (error) {
      if (error.message?.includes("기본채널")) {
        alert("기본채널은 삭제가 불가합니다.");
        return;
      }

      throw error;
    }

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
    setCurrentServer,
    loading,
    activeChannel,
    setActiveChannel,
    createChannelInServer,
    saveServerSettings,
    saveChannelSettings,
    removeServer,
    leaveServer,
    removeChannel,
  };
}

export default useChatServerData;
