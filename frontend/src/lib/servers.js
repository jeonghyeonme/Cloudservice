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

export function getServerMessages(serverId) {
  return request(`${ENDPOINTS.servers.list}/${serverId}/messages`, {
    method: "GET",
  });
}

export function joinServer(serverId) {
  return request(`${ENDPOINTS.servers.list}/${serverId}/join`, {
    method: "POST",
  });
}

export function createChannel(serverId, payload) {
  return request(`${ENDPOINTS.servers.list}/${serverId}/channels`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}