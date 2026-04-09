export const PATHS = {
  home: "/",
  onboarding: "/onboarding",
  login: "/login",
  register: "/register",
  explore: "/explore",
  room: "/rooms/:roomId",
};

export function getRoomPath(roomId) {
  return `/rooms/${roomId}`;
}
