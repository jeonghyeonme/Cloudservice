import { ENDPOINTS } from "../constants/endpoint";
import { request } from "./request";

export function getRooms() {
  return request(ENDPOINTS.rooms.list, {
    method: "GET",
  });
}

export function getMyRooms() {
  return request(ENDPOINTS.rooms.mine, {
    method: "GET",
  });
}

export function createRoom(payload) {
  return request(ENDPOINTS.rooms.list, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getRoomDetail(roomId) {
  return request(`${ENDPOINTS.rooms.list}/${roomId}`, {
    method: "GET",
  });
}

export function getRoomMessages(roomId) {
  return request(`${ENDPOINTS.rooms.list}/${roomId}/messages`, {
    method: "GET",
  });
}

export function joinRoom(roomId) {
  return request(`${ENDPOINTS.rooms.list}/${roomId}/join`, {
    method: "POST",
  });
}
