const { GetCommand } = require("@aws-sdk/lib-dynamodb");
const dynamoDb = require("../dynamodbClient");
const { verifyAccessToken } = require("../utils");
const { HEADERS } = require("../utils/response");

const ROLE = Object.freeze({
  HOST: "HOST",
  MODERATOR: "MODERATOR",
  MEMBER: "MEMBER",
});

const ROLE_WEIGHT = Object.freeze({
  [ROLE.MEMBER]: 1,
  [ROLE.MODERATOR]: 2,
  [ROLE.HOST]: 3,
});

function json(statusCode, payload) {
  return {
    statusCode,
    headers: HEADERS,
    body: JSON.stringify(payload),
  };
}

function parseBody(event) {
  try {
    return JSON.parse(event.body || "{}");
  } catch {
    return {};
  }
}

function getUserIdFromEvent(event) {
  const authHeader = event.headers?.Authorization || event.headers?.authorization || "";
  const { userId, error } = verifyAccessToken(authHeader);
  return { userId, error };
}

async function getServer(serverId) {
  const result = await dynamoDb.send(new GetCommand({
    TableName: process.env.SERVERS_TABLE,
    Key: { serverId },
  }));
  return result.Item || null;
}

async function getMembership(serverId, userId) {
  if (!serverId || !userId) return null;
  const result = await dynamoDb.send(new GetCommand({
    TableName: process.env.SERVER_MEMBERS_TABLE,
    Key: { userId, serverId },
  }));
  return result.Item || null;
}

function getRoleWeight(role) {
  return ROLE_WEIGHT[role] || 0;
}

function hasRoleAtLeast(role, minRole) {
  return getRoleWeight(role) >= getRoleWeight(minRole);
}

async function requireServerRole(event, serverId, minRole = ROLE.MEMBER) {
  const { userId, error } = getUserIdFromEvent(event);
  if (error || !userId) {
    return { response: json(401, { message: "인증이 필요합니다." }) };
  }

  if (!serverId) {
    return { response: json(400, { message: "serverId가 필요합니다." }) };
  }

  const server = await getServer(serverId);
  if (!server) {
    return { response: json(404, { message: "해당 서버를 찾을 수 없습니다." }) };
  }

  const membership = await getMembership(serverId, userId);
  const role = membership?.role || (server.hostId === userId ? ROLE.HOST : null);

  if (!role || !hasRoleAtLeast(role, minRole)) {
    return { response: json(403, { message: "해당 작업을 수행할 권한이 없습니다." }) };
  }

  return { userId, server, membership, role };
}

function normalizeMembers(server) {
  return Array.isArray(server?.members) ? server.members : [];
}

function isUserBanned(server, userId) {
  const bannedMembers = Array.isArray(server?.bannedMembers) ? server.bannedMembers : [];
  return bannedMembers.some((member) => member.userId === userId);
}

function canManageMember(actorRole, targetRole) {
  if (actorRole === ROLE.HOST) return targetRole !== ROLE.HOST;
  if (actorRole === ROLE.MODERATOR) return targetRole === ROLE.MEMBER;
  return false;
}

function getSafeUser(user = {}) {
  return {
    userId: user.userId,
    email: user.email,
    nickname: user.nickname,
    avatar: user.avatar,
    profileImageUrl: user.profileImageUrl,
    bio: user.bio,
  };
}

module.exports = {
  ROLE,
  json,
  parseBody,
  getUserIdFromEvent,
  getServer,
  getMembership,
  getRoleWeight,
  hasRoleAtLeast,
  requireServerRole,
  normalizeMembers,
  isUserBanned,
  canManageMember,
  getSafeUser,
};
