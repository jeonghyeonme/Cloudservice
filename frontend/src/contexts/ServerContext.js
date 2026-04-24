import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { getMyServers } from "../lib/servers";
import { useAuth } from "./AuthContext";

const ServerContext = createContext();

export const ServerProvider = ({ children }) => {
  const { isLoggedIn } = useAuth();
  const [joinedServers, setJoinedServers] = useState([]);
  const [exploreServers, setExploreServers] = useState([]); // ExploreServers 페이지용 공유 상태
  const [activeServerId, setActiveServerId] = useState(null);

  const refreshJoinedServers = useCallback(async () => {
    try {
      const data = await getMyServers();
      setJoinedServers(data.items || []);
    } catch (error) {
      console.error("Failed to refresh joined servers:", error);
    }
  }, []);

  const upsertJoinedServer = useCallback((server) => {
    setJoinedServers((prev) => {
      const exists = prev.find((s) => (s.serverId || s.roomId) === (server.serverId || server.roomId));
      if (exists) {
        return prev.map((s) => ((s.serverId || s.roomId) === (server.serverId || server.roomId) ? { ...s, ...server } : s));
      }
      return [...prev, server];
    });
  }, []);

  const removeJoinedServer = useCallback((serverId) => {
    setJoinedServers((prev) => prev.filter((s) => (s.serverId || s.roomId) !== serverId));
  }, []);

  const removeServerFromList = useCallback((serverId) => {
    setJoinedServers((prev) => prev.filter((s) => s.serverId !== serverId));
  }, []);

  const clearJoinedServers = useCallback(() => {
    setJoinedServers([]);
    setActiveServerId(null);
  }, []);

  useEffect(() => {
    let isMounted = true;
    if (!isLoggedIn) {
      clearJoinedServers();
      return;
    }

    getMyServers()
      .then((data) => {
        if (isMounted) setJoinedServers(data.items || []);
      })
      .catch((err) => {
        console.error("Failed to load joined servers:", err);
        if (isMounted) setJoinedServers([]);
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
      removeJoinedServer,
      clearJoinedServers,
      refreshJoinedServers,
      removeServerFromList,
    }),
    [
      joinedServers,
      exploreServers,
      activeServerId,
      upsertJoinedServer,
      removeJoinedServer,
      clearJoinedServers,
      refreshJoinedServers,
      removeServerFromList,
    ],
  );

  return <ServerContext.Provider value={value}>{children}</ServerContext.Provider>;
};

export const useServers = () => {
  const context = useContext(ServerContext);
  if (!context) throw new Error("useServers must be used within a ServerProvider");
  return context;
};
