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
 */

export const ServerProvider = ({ children }) => {
  const { isLoggedIn } = useAuth();
  const [joinedServers, setJoinedServers] = useState([]);
  const [activeServerId, setActiveServerId] = useState(null);

  const upsertJoinedServer = useCallback((server) => {
    if (!server?.roomId) {
      return;
    }

    const normalizedServer = {
      roomId: server.roomId,
      roomName: server.roomName || server.title || "",
    };

    setJoinedServers((prevServers) => {
      const existingIndex = prevServers.findIndex(
        (prevServer) => prevServer.roomId === normalizedServer.roomId,
      );

      if (existingIndex === -1) {
        return [...prevServers, normalizedServer];
      }

      return prevServers.map((prevServer, index) =>
        index === existingIndex
          ? { ...prevServer, ...normalizedServer }
          : prevServer,
      );
    });
  }, []);

  const clearJoinedServers = useCallback(() => {
    setJoinedServers([]);
    setActiveServerId(null);
  }, []);

  const removeJoinedServer = useCallback((roomId) => {
    setJoinedServers((prevServers) =>
      prevServers.filter((server) => server.roomId !== roomId),
    );
    setActiveServerId((prevActiveId) =>
      prevActiveId === roomId ? null : prevActiveId,
    );
  }, []);

  useEffect(() => {
    if (!isLoggedIn) {
      clearJoinedServers();
      return;
    }

    let isMounted = true;

    getMyServers()
      .then((data) => {
        if (!isMounted) {
          return;
        }

        const servers = Array.isArray(data?.items) ? data.items : [];
        setJoinedServers(
          servers.map((server) => ({
            roomId: server.roomId,
            roomName: server.roomName || server.title || "",
          })),
        );
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }

        console.error("내 서버 목록을 불러오지 못했습니다.", error);
        setJoinedServers([]);
      });

    return () => {
      isMounted = false;
    };
  }, [isLoggedIn, clearJoinedServers]);

  const value = useMemo(
    () => ({
      joinedServers,
      activeServerId,
      setActiveServerId,
      upsertJoinedServer,
      removeJoinedServer,
      clearJoinedServers,
    }),
    [
      joinedServers,
      activeServerId,
      upsertJoinedServer,
      removeJoinedServer,
      clearJoinedServers,
    ],
  );

  return <ServerContext.Provider value={value}>{children}</ServerContext.Provider>;
};

export const useServers = () => {
  const context = useContext(ServerContext);

  if (!context) {
    throw new Error("useServers must be used within a ServerProvider");
  }

  return context;
};
