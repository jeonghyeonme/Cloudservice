const { PutCommand } = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");
const dynamoDb = require("../dynamodbClient");
const { ROLE, json, parseBody, requireServerRole } = require("../servers/serverAccess");
const { createInviteCode, getInviteByCode, normalizeInviteOptions } = require("./inviteUtils");

async function createUniqueInviteCode() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const inviteCode = createInviteCode();
    const existing = await getInviteByCode(inviteCode);
    if (!existing) return inviteCode;
  }
  throw new Error("초대 코드 생성에 실패했습니다. 다시 시도해 주세요.");
}

exports.handler = async (event) => {
  try {
    const { serverId } = event.pathParameters || {};
    const access = await requireServerRole(event, serverId, ROLE.MODERATOR);
    if (access.response) return access.response;

    const body = parseBody(event);
    const { expiresInHours, maxUses } = normalizeInviteOptions(body);
    const inviteId = uuidv4();
    const inviteCode = await createUniqueInviteCode();
    const createdAt = new Date().toISOString();
    const expiresAt = Math.floor(Date.now() / 1000) + expiresInHours * 60 * 60;

    const invite = {
      inviteId,
      inviteCode,
      serverId,
      serverName: access.server.serverName || access.server.title || "서버",
      createdBy: access.userId,
      createdByRole: access.role,
      createdAt,
      expiresAt,
      useCount: 0,
    };

    if (maxUses !== null) {
      invite.maxUses = maxUses;
    }

    await dynamoDb.send(new PutCommand({
      TableName: process.env.INVITES_TABLE,
      Item: invite,
      ConditionExpression: "attribute_not_exists(inviteId)",
    }));

    return json(201, {
      message: "초대 코드 생성 완료",
      invite,
    });
  } catch (error) {
    console.error("createInvite Error:", error);
    return json(500, { message: "초대 코드 생성 실패", error: error.message });
  }
};
