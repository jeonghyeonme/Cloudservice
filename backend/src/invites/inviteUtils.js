const crypto = require("crypto");
const { QueryCommand } = require("@aws-sdk/lib-dynamodb");
const dynamoDb = require("../dynamodbClient");

const INVITE_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const INVITE_CODE_LENGTH = 8;
const DEFAULT_EXPIRES_IN_HOURS = 24 * 7;
const MAX_EXPIRES_IN_HOURS = 24 * 30;

function createInviteCode() {
  let code = "";
  for (let i = 0; i < INVITE_CODE_LENGTH; i += 1) {
    const index = crypto.randomInt(0, INVITE_CODE_ALPHABET.length);
    code += INVITE_CODE_ALPHABET[index];
  }
  return code;
}

async function getInviteByCode(inviteCode) {
  const result = await dynamoDb.send(new QueryCommand({
    TableName: process.env.INVITES_TABLE,
    IndexName: "inviteCode-index",
    KeyConditionExpression: "inviteCode = :code",
    ExpressionAttributeValues: { ":code": String(inviteCode || "").trim().toUpperCase() },
    Limit: 1,
  }));
  return result.Items?.[0] || null;
}

function isInviteExpired(invite, nowSeconds = Math.floor(Date.now() / 1000)) {
  return Number(invite?.expiresAt || 0) <= nowSeconds;
}

function isInviteMaxedOut(invite) {
  if (invite?.maxUses === null || invite?.maxUses === undefined) return false;
  return Number(invite.useCount || 0) >= Number(invite.maxUses);
}

function getInviteValidity(invite) {
  if (!invite) return { valid: false, reason: "초대 코드를 찾을 수 없습니다." };
  if (invite.revokedAt) return { valid: false, reason: "취소된 초대 코드입니다." };
  if (isInviteExpired(invite)) return { valid: false, reason: "만료된 초대 코드입니다." };
  if (isInviteMaxedOut(invite)) return { valid: false, reason: "사용 횟수를 초과한 초대 코드입니다." };
  return { valid: true };
}

function normalizeInviteOptions(body = {}) {
  const requestedHours = Number(body.expiresInHours);
  const expiresInHours = Number.isFinite(requestedHours) && requestedHours > 0
    ? Math.min(Math.floor(requestedHours), MAX_EXPIRES_IN_HOURS)
    : DEFAULT_EXPIRES_IN_HOURS;

  const requestedMaxUses = Number(body.maxUses);
  const maxUses = Number.isFinite(requestedMaxUses) && requestedMaxUses > 0
    ? Math.floor(requestedMaxUses)
    : null;

  return { expiresInHours, maxUses };
}

module.exports = {
  createInviteCode,
  getInviteByCode,
  getInviteValidity,
  normalizeInviteOptions,
};
