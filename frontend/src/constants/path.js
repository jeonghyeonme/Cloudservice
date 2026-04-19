/**
 * @description 앱 라우팅 경로 상수 및 동적 경로 생성 유틸
 * @modified Room→Server 마이그레이션으로 /rooms → /servers 경로 변경
 */

export const PATHS = {
  home: "/",
  onboarding: "/onboarding",
  login: "/login",
  register: "/register",
  explore: "/explore",
  server: "/servers/:serverId",
};

export function getServerPath(serverId) {
  return `/servers/${serverId}`;
}