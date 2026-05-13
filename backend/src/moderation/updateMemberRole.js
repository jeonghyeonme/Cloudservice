const { GetCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const dynamoDb = require("../dynamodbClient");
const { ROLE, json, parseBody, requireServerRole, normalizeMembers } = require("../servers/serverAccess");

const ALLOWED_TARGET_ROLES = new Set([ROLE.MODERATOR, ROLE.MEMBER]);

exports.handler = async (event) => {
  try {
    const { serverId, targetUserId } = event.pathParameters || {};
    const access = await requireServerRole(event, serverId, ROLE.HOST);
    if (access.response) return access.response;

    const body = parseBody(event);
    const nextRole = String(body.role || "").toUpperCase();

    if (!ALLOWED_TARGET_ROLES.has(nextRole)) {
      return json(400, { message: "role은 MODERATOR 또는 MEMBER만 가능합니다." });
    }

    if (!targetUserId || targetUserId === access.userId) {
      return json(400, { message: "대상 멤버를 올바르게 지정해 주세요." });
    }

    if (targetUserId === access.server.hostId) {
      return json(403, { message: "방장 권한은 이 API로 변경할 수 없습니다." });
    }

    const targetMembership = await dynamoDb.send(new GetCommand({
      TableName: process.env.SERVER_MEMBERS_TABLE,
      Key: { userId: targetUserId, serverId },
    }));

    if (!targetMembership.Item) {
      return json(404, { message: "대상 멤버를 찾을 수 없습니다." });
    }

    await dynamoDb.send(new UpdateCommand({
      TableName: process.env.SERVER_MEMBERS_TABLE,
      Key: { userId: targetUserId, serverId },
      UpdateExpression: "SET #role = :role, updatedAt = :updatedAt",
      ExpressionAttributeNames: { "#role": "role" },
      ExpressionAttributeValues: {
        ":role": nextRole,
        ":updatedAt": new Date().toISOString(),
      },
    }));

    const updatedMembers = normalizeMembers(access.server).map((member) => (
      member.userId === targetUserId ? { ...member, role: nextRole } : member
    ));

    await dynamoDb.send(new UpdateCommand({
      TableName: process.env.SERVERS_TABLE,
      Key: { serverId },
      UpdateExpression: "SET members = :members",
      ExpressionAttributeValues: { ":members": updatedMembers },
    }));

    return json(200, {
      message: "멤버 권한이 변경되었습니다.",
      member: { ...targetMembership.Item, role: nextRole },
    });
  } catch (error) {
    console.error("updateMemberRole Error:", error);
    return json(500, { message: "멤버 권한 변경 실패", error: error.message });
  }
};
