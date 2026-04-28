import { ENDPOINTS } from "../constants/endpoint";
import { request } from "./request";

export function getServers() {
  return request(ENDPOINTS.servers.list, {
    method: "GET",
  });
}

export function getMyServers() {
  return request(ENDPOINTS.servers.mine, {
    method: "GET",
  });
}

export function createServer(payload) {
  return request(ENDPOINTS.servers.list, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getServerDetail(serverId) {
  return request(`${ENDPOINTS.servers.list}/${serverId}`, {
    method: "GET",
  });
}

export function updateServer(serverId, payload) {
  return request(`${ENDPOINTS.servers.list}/${serverId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteServer(serverId) {
  return request(`${ENDPOINTS.servers.list}/${serverId}`, {
    method: "DELETE",
  });
}

export function leaveServer(serverId) {
  return request(`${ENDPOINTS.servers.list}/${serverId}/leave`, {
    method: "POST",
  });
}

export function getServerMessages(serverId) {
  return request(`${ENDPOINTS.servers.list}/${serverId}/messages`, {
    method: "GET",
  });
}

export function joinServer(serverId, password) {
  const options = {
    method: "POST",
  };
  if (password) {
    options.body = JSON.stringify({ serverPassword: password });
  }
  return request(`${ENDPOINTS.servers.list}/${serverId}/join`, options);
}

export function createChannel(serverId, payload) {
  return request(`${ENDPOINTS.servers.list}/${serverId}/channels`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deleteChannel(serverId, channelId) {
  return request(`${ENDPOINTS.servers.list}/${serverId}/channels/${channelId}`, {
    method: "DELETE",
  });
}

export function updateChannel(serverId, channelId, payload) {
  return request(`${ENDPOINTS.servers.list}/${serverId}/channels/${channelId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}
