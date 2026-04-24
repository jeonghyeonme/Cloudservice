import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getServerPath } from "../../constants/path";
import { getServers, joinServer, updateServer, leaveServer, deleteServer } from "../../lib/servers";
import "./ExploreServers.css";
import ServerSidebar from "../layout/ServerSidebar";
import CreateServerModal from "./CreateServerModal";
import { useAuth } from "../../contexts/AuthContext";
import { PATHS } from "../../constants/path";
import { useServers } from "../../contexts/ServerContext";
import ContextMenu from "../common/ContextMenu";
import ConfirmModal from "../common/ConfirmModal";
import EntitySettingsModal from "../common/EntitySettingsModal";
import useChatOverlayState from "../Chat/hooks/useChatOverlayState";
import {
  createServerDefaultValues,
  createServerFields,
} from "../common/entityFormConfig";
import { buildServerContextMenuItems } from "../Chat/utils/contextMenuFactories";
import JoinServerModal from "./JoinServerModal";

const ServerCard = ({ server, onJoin }) => {
  const name = server.serverName || server.title || "제목 없음";
  const description = server.description;
  const currentMembers = Number(server.currentCount) || 0;
  const maxMembers = server.maxCapacity || 12;
  const coverImage = server.imageUrl || server.coverImage;
  const emoji = "📚";

  const isFull =
    (maxMembers && currentMembers >= maxMembers) || server.status === "FULL";
  const isLocked = server.isPrivate && isFull;
  const displayStatus = isFull ? "FULL" : server.status;

  return (
    <div className={`servers-card ${isFull ? "servers-full" : ""}`}>
      <div className="servers-cover">
        {coverImage ? (
          <img src={coverImage} alt={name} className="servers-cover-img" />
        ) : (
          <div className="servers-cover-emoji">{emoji}</div>
        )}

        <span className={`servers-badge badge-${displayStatus.toLowerCase()}`}>
          {displayStatus}
        </span>
      </div>

      <div className="servers-body">
        <div className="servers-title-row">
          <h3 className="servers-name">{name}</h3>
          {maxMembers && (
            <span className="servers-count">
              {currentMembers}/{maxMembers}
            </span>
          )}
        </div>
        <p className="servers-desc">{description}</p>

        <div className="servers-footer">
          <div className="member-avatars">
            {[...Array(Math.min(3, currentMembers))].map((_, i) => (
              <div key={i} className="mini-avatar" style={{ zIndex: 3 - i }} />
            ))}
            {currentMembers > 3 && (
              <span className="member-extra">+{currentMembers - 3}</span>
            )}
          </div>

          {isLocked ? (
            <button className="servers-btn btn-locked" disabled>
              LOCKED
            </button>
          ) : isFull ? (
            <button className="servers-btn btn-locked" disabled>
              FULL
            </button>
          ) : (
            <button
              className="servers-btn btn-join"
              onClick={() => onJoin(server)}
            >
              JOIN
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const ExploreServers = () => {
  const navigate = useNavigate();
  const { logout, refreshToken, user } = useAuth();
  const { clearJoinedServers, setActiveServerId, upsertJoinedServer, removeJoinedServer } =
    useServers();
  const [servers, setServers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
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
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [selectedServer, setSelectedServer] = useState(null);

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

  useEffect(() => {
    setActiveServerId(null);
    getServers()
      .then((data) => setServers(data.items || []))
      .catch((err) => {
        console.error("데이터 로드 실패!", err);
        setServers([]);
      });
  }, [setActiveServerId]);

  const filteredServers = servers.filter((server) => {
    const title = server.serverName || server.title || "";
    const description = server.description || "";
    return (
      title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const executeJoin = async (server, password = null) => {
    const sid = server.serverId || server.roomId;
    try {
      await joinServer(sid, password);
      upsertJoinedServer(server);
      navigate(getServerPath(sid));
    } catch (error) {
      console.error("서버 참여 실패:", error);
      throw error;
    }
  };

  const handleJoinClick = (server) => {
    if (server.isPrivate) {
      setSelectedServer(server);
      setIsJoinModalOpen(true);
    } else {
      executeJoin(server);
    }
  };

  const handleDirectJoin = () => {
    if (!inviteCode.trim()) {
      alert("코드 혹은 주소를 입력해주세요!");
      return;
    }
  };

  const resolveServerForMenu = (server) => {
    const sid = server.serverId || server.roomId;
    return servers.find((item) => (item.serverId || item.roomId) === sid) || server;
  };

  const handleOpenServerMenu = (event, server) => {
    const resolvedServer = resolveServerForMenu(server);
    const sid = resolvedServer.serverId || resolvedServer.roomId;
    const isHost = user?.userId === resolvedServer.hostId;

    openContextMenu(event, {
      type: "server",
      targetId: sid,
      title: resolvedServer.roomName || resolvedServer.serverName || resolvedServer.title || "현재 서버",
      items: buildServerContextMenuItems({
        canDelete: isHost,
        onOpenSettings: () =>
          openSettingsModal({
            type: "server",
            server: resolvedServer,
            entityName:
              resolvedServer.roomName || resolvedServer.serverName || resolvedServer.title || "현재 서버",
          }),
        onOpenDeleteConfirm: () =>
          openConfirmModal({
            title: "정말로 삭제하시겠습니까?",
            description: "확인을 누르면 서버가 영구적으로 삭제됩니다.",
            onConfirm: async () => {
              await deleteServer(sid);
              setServers((prev) =>
                prev.filter((item) => (item.serverId || item.roomId) !== sid),
              );
              removeJoinedServer(sid);
              closeConfirmModal();
            },
          }),
        onLeave: () =>
          openConfirmModal({
            title: "서버에서 나가시겠습니까?",
            description: "확인을 누르면 서버 목록에서 제외됩니다.",
            onConfirm: async () => {
              await leaveServer(sid);
              removeJoinedServer(sid);
              closeConfirmModal();
            },
          }),
      }),
    });
  };

  const handleServerSettingsSubmit = async (values) => {
    const sid = settingsModal?.server?.serverId || settingsModal?.server?.roomId;
    const trimmedName = values.serverName.trim();

    if (!trimmedName) {
      throw new Error("서버 이름을 입력해 주세요.");
    }

    const updatedServer = await updateServer(sid, {
      serverName: trimmedName,
      description: values.description?.trim() || "",
      maxCapacity: Number(values.maxParticipants),
      isPrivate: values.privacy === "Private",
    });
    const resolvedServer = updatedServer.room || updatedServer;

    setServers((prev) =>
      prev.map((server) =>
        (server.serverId || server.roomId) === sid ? resolvedServer : server,
      ),
    );
    closeSettingsModal();
  };

  return (
    <div className="explore-container">
      <ServerSidebar
        activeView="home"
        onServerClick={() => {}}
        onAddClick={() => setIsModalOpen(true)}
        onLogout={handleLogout}
        contextMenuType={contextMenu?.type}
        contextMenuTargetId={contextMenu?.targetId}
        onServerContextMenu={handleOpenServerMenu}
      />

      <div className="explore-main">
        <div className="explore-topbar">
          <span className="topbar-title">서버 탐색</span>
        </div>

        <div className="explore-hero">
          <h1 className="hero-title">
            새로운 <span className="accent">서버</span>를 찾거나{" "}
            <span className="accent">생성</span>해보세요!
          </h1>
        </div>

        <div className="search-bar">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="서버 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="invite-bar">
          <span className="invite-icon">🔗</span>
          <input
            type="text"
            placeholder="초대 코드 또는 URL 입력"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
          />
          <button className="join-directly-btn" onClick={handleDirectJoin}>
            즉시 입장
          </button>
        </div>

        <div className="servers-grid">
          {filteredServers.map((server) => (
            <ServerCard
              key={server.serverId || server.roomId}
              server={server}
              onJoin={handleJoinClick}
            />
          ))}

          <div
            className="servers-card create-card"
            onClick={() => setIsModalOpen(true)}
          >
            <div className="create-plus">+</div>
            <p className="create-label">서버 만들기</p>
            <p className="create-sub">새로운 학습 세션 시작하기</p>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <CreateServerModal onClose={() => setIsModalOpen(false)} />
      )}

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
        fields={createServerFields(
          createServerDefaultValues(settingsModal?.server || {}),
        )}
        onClose={closeSettingsModal}
        onSubmit={handleServerSettingsSubmit}
      />

      <ConfirmModal
        open={Boolean(confirmModal)}
        title={confirmModal?.title}
        description={confirmModal?.description}
        onCancel={closeConfirmModal}
        onConfirm={confirmModal?.onConfirm}
      />

      {isJoinModalOpen && (
        <JoinServerModal
          server={selectedServer}
          onClose={() => setIsJoinModalOpen(false)}
          onSubmit={(password) => executeJoin(selectedServer, password)}
        />
      )}
    </div>
  );
};

export default ExploreServers;
