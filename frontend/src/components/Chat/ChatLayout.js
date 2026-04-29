import React, { useCallback, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PATHS } from "../../constants/path";
import { useServers } from "../../contexts/ServerContext";
import "./ChatLayout.css";
import ServerSidebar from "../layout/ServerSidebar";
import SidebarLeft from "./SidebarLeft";
import ChatWindow from "./ChatWindow";
import ResourceHub from "./ResourceHub";
import CreateServerModal from "../Servers/CreateServerModal";
import CreateChannelModal from "./CreateChannelModal";
import ContextMenu from "../common/ContextMenu";
import ConfirmModal from "../common/ConfirmModal";
import EntitySettingsModal from "../common/EntitySettingsModal";
import {
  createChannelDefaultValues,
  createChannelFields,
  createServerDefaultValues,
  createServerFields,
} from "../common/entityFormConfig";
import { useAuth } from "../../contexts/AuthContext";
import useChatServerData from "./hooks/useChatServerData";
import useChatOverlayState from "./hooks/useChatOverlayState";
import {
  buildChannelContextMenuItems,
  buildServerContextMenuItems,
} from "./utils/contextMenuFactories";
import { getServerId, getServerName } from "../../lib/serverEntity";

const ChatLayout = () => {
  const { serverId } = useParams();
  const navigate = useNavigate();
  const { user, logout, refreshToken } = useAuth();
  const { setActiveServerId, upsertJoinedServer, removeJoinedServer, clearJoinedServers } =
    useServers();
    
  const [isServerModalOpen, setIsServerModalOpen] = useState(false);
  const [isChannelModalOpen, setIsChannelModalOpen] = useState(false);

  const handleLogout = async () => {
    try {
      if (refreshToken) {
        const { logout: logoutApi } = await import("../../lib/auth");
        await logoutApi(refreshToken);
      }
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      clearJoinedServers();
      logout();
      navigate(PATHS.onboarding, { replace: true });
    }
  };

  const {
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
  } = useChatServerData({
    serverId,
    setActiveServerId,
    upsertJoinedServer,
    removeJoinedServer,
  });

  const {
    contextMenu,
    settingsModal,
    confirmModal,
    openContextMenu,
    closeContextMenu,
    openSettingsModal,
    closeSettingsModal,
    openConfirmModal,
    closeConfirmModal,
  } = useChatOverlayState();

  const isCurrentUserHost =
    Boolean(user?.userId) &&
    (currentServer?.hostId === user.userId ||
      (currentServer?.members || []).some(
        (member) => member?.userId === user.userId && member?.role === "HOST",
      ));

  const openServerSettings = useCallback(
    () =>
      openSettingsModal({
        type: "server",
        entityName: getServerName(currentServer),
      }),
    [currentServer, openSettingsModal],
  );

  const openChannelSettings = useCallback(
    (channel) =>
      openSettingsModal({
        type: "channel",
        channel,
        entityName: channel.name || channel.label || "현재 채널",
      }),
    [openSettingsModal],
  );

  const serverMenuItems = useMemo(
    () =>
      buildServerContextMenuItems({
        canDelete: isCurrentUserHost,
        onOpenSettings: openServerSettings,
        onOpenDeleteConfirm: () =>
          openConfirmModal({
            title: "정말로 삭제하시겠습니까?",
            description:
              "확인을 누르면 현재 서버가 삭제되고 서버 목록 화면으로 이동합니다.",
            onConfirm: async () => {
              await removeServer();
              closeConfirmModal();
            },
          }),
        onLeave: () =>
          openConfirmModal({
            title: "서버에서 나가시겠습니까?",
            description: "확인을 누르면 서버 목록에서 제외됩니다.",
            onConfirm: async () => {
              await leaveServer();
              closeConfirmModal();
            },
          }),
      }),
    [
      closeConfirmModal,
      isCurrentUserHost,
      openConfirmModal,
      openServerSettings,
      removeServer,
      leaveServer,
    ],
  );

  const handleServerSettingsSubmit = async (values) => {
    await saveServerSettings(values);
    closeSettingsModal();
  };

  const handleChannelSettingsSubmit = async (values) => {
    await saveChannelSettings(settingsModal?.channel, values);
    closeSettingsModal();
  };

  const handleCreateChannel = async (values) => {
    await createChannelInServer(values);
    setIsChannelModalOpen(false);
  };

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
        onLogout={handleLogout}
        contextMenuType={contextMenu?.type}
        contextMenuTargetId={contextMenu?.targetId}
        onServerContextMenu={(event, server) => {
          const sid = getServerId(server);
          const resolvedServer =
            getServerId(currentServer) === sid ? currentServer : server;
          openContextMenu(event, {
            type: "server",
            targetId: sid,
            title: getServerName(resolvedServer),
            items: serverMenuItems,
          });
        }}
      />

      <SidebarLeft
        serverName={getServerName(currentServer, "로딩 중...")}
        channels={currentServer?.channels || []}
        activeChannel={activeChannel}
        onChannelClick={setActiveChannel}
        onAddChannelClick={() => setIsChannelModalOpen(true)}
        contextMenuType={contextMenu?.type}
        contextMenuTargetId={contextMenu?.targetId}
        members={currentServer?.members || []}
        hostId={currentServer?.hostId}
        onServerContextMenu={(event) =>
          openContextMenu(event, {
            type: "server",
            targetId: serverId,
            title: getServerName(currentServer),
            items: serverMenuItems,
          })
        }
        onChannelContextMenu={(event, channel) =>
          openContextMenu(event, {
            type: "channel",
            targetId: channel.chId || channel.id,
            title: channel.name || channel.label || "현재 채널",
            items: buildChannelContextMenuItems({
              onOpenSettings: () => openChannelSettings(channel),
              onOpenDeleteConfirm: () =>
                openConfirmModal({
                  title: "정말로 삭제하시겠습니까?",
                  description: "확인을 누르면 현재 채널이 삭제됩니다.",
                  onConfirm: async () => {
                    await removeChannel(channel);
                    closeConfirmModal();
                  },
                }),
            }),
          })
        }
      />

      <main className="chat-content-wrapper" style={{ display: "flex", flex: 1, minWidth: 0 }}>
        <ChatWindow activeChannel={activeChannel} channels={currentServer.channels} />
        <ResourceHub serverResources={currentServer} setCurrentServer={setCurrentServer} />
      </main>

      {isServerModalOpen && (
        <CreateServerModal onClose={() => setIsServerModalOpen(false)} />
      )}

      <CreateChannelModal
        open={isChannelModalOpen}
        serverName={getServerName(currentServer)}
        onClose={() => setIsChannelModalOpen(false)}
        onSubmit={handleCreateChannel}
      />

      <ContextMenu
        open={Boolean(contextMenu)}
        position={contextMenu?.position}
        title={contextMenu?.title}
        items={contextMenu?.items || []}
        onClose={closeContextMenu}
      />

      <EntitySettingsModal
        open={settingsModal?.type === "server"}
        entityType="server"
        entityName={settingsModal?.entityName}
        fields={createServerFields(createServerDefaultValues(currentServer || {}))}
        onClose={closeSettingsModal}
        onSubmit={handleServerSettingsSubmit}
      />

      <EntitySettingsModal
        open={settingsModal?.type === "channel"}
        entityType="channel"
        entityName={settingsModal?.entityName}
        fields={createChannelFields(
          createChannelDefaultValues(settingsModal?.channel || {}),
        )}
        onClose={closeSettingsModal}
        onSubmit={handleChannelSettingsSubmit}
      />

      <ConfirmModal
        open={Boolean(confirmModal)}
        title={confirmModal?.title}
        description={confirmModal?.description}
        onCancel={closeConfirmModal}
        onConfirm={confirmModal?.onConfirm}
      />
    </div>
  );
};

export default ChatLayout;
