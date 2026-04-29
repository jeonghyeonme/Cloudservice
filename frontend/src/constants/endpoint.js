const API_HOST = process.env.REACT_APP_API_HOST || "http://localhost:4000/dev";

export const API_BASE_URL = API_HOST;
export const API_WS_URL =
  process.env.REACT_APP_WS_URL || "ws://localhost:4001";

export const ENDPOINTS = {
  auth: {
    register: "/userRegister",
    login: "/userLogin",
    refresh: "/token/refresh",
    logout: "/userLogout",
  },
  servers: {
    list: "/servers",
    mine: "/servers/me",
  },
};

export function createApiUrl(path) {
  return `${API_BASE_URL}${path}`;
}
