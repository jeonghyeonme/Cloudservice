import { ENDPOINTS } from "../constants/endpoint";
import { request } from "./request";

export function getRooms() {
  return request(ENDPOINTS.rooms.list, {
    method: "GET",
  });
}

export function createRoom(payload) {
  return request(ENDPOINTS.rooms.list, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
