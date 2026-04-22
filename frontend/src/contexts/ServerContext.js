import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "./AuthContext";
import { getMyServers } from "../lib/servers";

const ServerContext = createContext(null);

/**
 * @title 서버 입장/퇴장 추적 및 활성 서버 관리 컨텍스트
 * @modified Room→Server 마이그레이션, serverId/roomId 호환 처리
 */
export const ServerProvider = ({ children }) => {
  const { isLoggedIn } = useAuth();
  const [joinedServers, setJoinedServers] = useState([]);
  const [activeServerId, setActiveServerId] = useState(null);
  const [exploreServers, setExploreServers] = useState([]);

  // 서버 목록을 API로부터 가져오는 함수를 별도로 분리 (재사용 가능하게)
  const refreshJoinedServers = useCallback(async () => {
    try {
      const data = await getMyServers();
      const servers = Array.isArray(data?.items) ? data.items : [];
      setJoinedServers(
        servers.map((server) => ({
          serverId: server.serverId || server.roomId,
          serverName: server.serverName || server.roomName || server.title || "",
        }))
      );
    } catch (error) {
      console.error("내 서버 목록을 갱신하지 못했습니다.", error);
    }
  }, []);

  // 리스트에서 특정 서버를 즉시 제거하는 함수 (삭제 성공 시 사용)
  const removeServerFromList = useCallback((serverId) => {
    setJoinedServers((prev) => prev.filter((s) => s.serverId !== serverId));
    setExploreServers((prev) => prev.filter((s) => s.serverId !== serverId));
  }, []);

  const setPublicServers = useCallback((servers) => {
    setExploreServers(servers);
  }, []);

  // serverId 우선 사용, 기존 roomId 호환을 위해 fallback 처리
  // 백엔드 마이그레이션 완료 후에는 server.serverId만 사용하면 됨
  const upsertJoinedServer = useCallback((server) => {
    const id = server?.serverId || server?.roomId;
    if (!id) return;

    const normalizedServer = {
      serverId: id,
      serverName: server.serverName || server.roomName || server.title || "",
    };

    setJoinedServers((prev) => {
      const existingIndex = prev.findIndex((s) => s.serverId === normalizedServer.serverId);
      if (existingIndex === -1) return [...prev, normalizedServer];
      return prev.map((s, i) => i === existingIndex ? { ...s, ...normalizedServer } : s);
    });
  }, []);

  const clearJoinedServers = useCallback(() => {
    setJoinedServers([]);
    setActiveServerId(null);
  }, []);

  useEffect(() => {
    if (isLoggedIn) { refreshJoinedServers(); }
    else { clearJoinedServers(); }

    let isMounted = true;

    // 로그인 시 내가 참여 중인 서버 목록을 ServerMembers 테이블에서 조회
    // serverId/roomId 둘 다 호환 (백엔드 마이그레이션 과도기)
    getMyServers()
      .then((data) => {
        if (!isMounted) return;
        const servers = Array.isArray(data?.items) ? data.items : [];
        setJoinedServers(
          servers.map((server) => ({
            serverId: server.serverId || server.roomId,
            serverName: server.serverName || server.roomName || server.title || "",
          })),
        );
      })
      .catch((error) => {
        if (!isMounted) return;
        console.error("내 서버 목록을 불러오지 못했습니다.", error);
        setJoinedServers([]);
      });

    return () => { isMounted = false; };
  }, [isLoggedIn, clearJoinedServers]);

  const value = useMemo(
    () => ({
      joinedServers,
      exploreServers,
      activeServerId,
      setExploreServers,
      setActiveServerId,
      upsertJoinedServer,
      clearJoinedServers,
      refreshJoinedServers,
      removeServerFromList,
    }),
    [joinedServers, activeServerId, upsertJoinedServer, clearJoinedServers, refreshJoinedServers, removeServerFromList],
  );

  return <ServerContext.Provider value={value}>{children}</ServerContext.Provider>;
};

export const useServers = () => {
  const context = useContext(ServerContext);
  if (!context) throw new Error("useServers must be used within a ServerProvider");
  return context;
};