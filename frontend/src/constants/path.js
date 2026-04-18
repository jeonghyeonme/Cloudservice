export const PATHS = {
  home: "/",
  onboarding: "/onboarding",
  login: "/login",
  register: "/register",
  explore: "/explore",
  server: "/rooms/:serverId",
};

export function getServerPath(serverId) {
  return `/rooms/${serverId}`;
}
