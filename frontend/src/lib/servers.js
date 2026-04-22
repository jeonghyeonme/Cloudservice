import { ENDPOINTS } from "../constants/endpoint";
import { request } from "./request";

export function getServers() {
  return request(ENDPOINTS.rooms.list, {
    method: "GET",
  });
}

export function getMyServers() {
  return request(ENDPOINTS.rooms.mine, {
    method: "GET",
  });
}

export function createServer(payload) {
  return request(ENDPOINTS.rooms.list, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getServerDetail(serverId) {
  return request(`${ENDPOINTS.rooms.list}/${serverId}`, {
    method: "GET",
  });
}

export function updateServer(serverId, payload) {
  return request(`${ENDPOINTS.rooms.list}/${serverId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function getServerMessages(serverId) {
  return request(`${ENDPOINTS.rooms.list}/${serverId}/messages`, {
    method: "GET",
  });
}

export function joinServer(serverId) {
  return request(`${ENDPOINTS.rooms.list}/${serverId}/join`, {
    method: "POST",
  });
}

export function createChannel(serverId, payload) {
  return request(`${ENDPOINTS.rooms.list}/${serverId}/channels`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deleteChannel(serverId, channelId) {
  return request(`${ENDPOINTS.rooms.list}/${serverId}/channels/${channelId}`, {
    method: "DELETE",
  });
}
