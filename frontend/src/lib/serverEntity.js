export function getServerId(server) {
  return server?.serverId || "";
}

export function getServerName(server, fallback = "현재 서버") {
  return server?.serverName || server?.title || fallback;
}

export function getServerHostName(server, fallback = "관리자") {
  return server?.hostNickname || fallback;
}

export function normalizeServer(server = {}) {
  return {
    ...server,
    serverId: getServerId(server),
    serverName: getServerName(server, ""),
    hostNickname: getServerHostName(server, ""),
  };
}

export function normalizeServers(servers = []) {
  return servers.map((server) => normalizeServer(server));
}
