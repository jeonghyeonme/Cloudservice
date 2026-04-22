import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getServerPath } from "../../constants/path";
import { getServers, joinServer } from "../../lib/servers";
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

const ServerCard = ({ server, onJoin }) => {
  const name = server.roomName || server.title || "제목 없음";
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
        {/* 이미지가 있으면 <img> 태그를, 없으면 기존처럼 이모지를 보여줌 */}
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
  const { logout } = useAuth();
  const { clearJoinedServers, setActiveServerId, upsertJoinedServer } =
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
  const handleLogout = () => {
    console.log("로그아웃 로직 실행");
    clearJoinedServers();
    logout();
    navigate(PATHS.onboarding);
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
    const title = server.roomName || server.title || "";
    const description = server.description || "";
    return (
      title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // 서버 입장 시 해당 ID의 주소로 이동
  const handleJoinServer = async (server) => {
    try {
      await joinServer(server.roomId);
      upsertJoinedServer(server);
      navigate(getServerPath(server.roomId));
    } catch (error) {
      console.error("서버 참여 실패:", error);
      alert(error.message || "서버 입장 중 오류가 발생했습니다.");
    }
  };

  const handleDirectJoin = () => {
    if (!inviteCode.trim()) {
      alert("코드 혹은 주소를 입력해주세요!");
      return;
    }
  };

  const resolveServerForMenu = (server) =>
    servers.find((item) => item.roomId === server.roomId) || server;

  const handleOpenServerMenu = (event, server) => {
    const resolvedServer = resolveServerForMenu(server);

    openContextMenu(event, {
      type: "server",
      targetId: resolvedServer.roomId,
      title: resolvedServer.roomName || resolvedServer.title || "현재 서버",
      items: buildServerContextMenuItems({
        canDelete: true,
        onOpenSettings: () =>
          openSettingsModal({
            type: "server",
            server: resolvedServer,
            entityName:
              resolvedServer.roomName || resolvedServer.title || "현재 서버",
          }),
        onOpenDeleteConfirm: () =>
          openConfirmModal({
            title: "정말로 삭제하시겠습니까?",
            description:
              "프론트 화면에서만 서버가 목록에서 사라집니다. 새로고침하면 원래 데이터가 다시 보일 수 있습니다.",
            onConfirm: async () => {
              setServers((prev) =>
                prev.filter((item) => item.roomId !== resolvedServer.roomId),
              );
              closeConfirmModal();
            },
          }),
      }),
    });
  };

  const handleServerSettingsSubmit = async (values) => {
    const trimmedName = values.serverName.trim();

    if (!trimmedName) {
      throw new Error("서버 이름을 입력해 주세요.");
    }

    setServers((prev) =>
      prev.map((server) =>
        server.roomId === settingsModal?.server?.roomId
          ? {
              ...server,
              roomName: trimmedName,
              description: values.description?.trim() || "",
              maxCapacity: Number(values.maxParticipants),
              isPrivate: values.privacy === "Private",
              updatedAt: new Date().toISOString(),
            }
          : server,
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
              key={server.roomId}
              server={server}
              onJoin={handleJoinServer}
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
    </div>
  );
};

export default ExploreServers;
