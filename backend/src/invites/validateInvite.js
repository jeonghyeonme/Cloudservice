const { GetCommand } = require("@aws-sdk/lib-dynamodb");
const dynamoDb = require("../dynamodbClient");
const { json } = require("../servers/serverAccess");
const { getInviteByCode, getInviteValidity } = require("./inviteUtils");

exports.handler = async (event) => {
  try {
    const rawCode = event.pathParameters?.inviteCode || event.queryStringParameters?.inviteCode || "";
    const inviteCode = String(rawCode).trim().toUpperCase();

    if (!inviteCode) {
      return json(400, { valid: false, message: "inviteCode가 필요합니다." });
    }

    const invite = await getInviteByCode(inviteCode);
    const validity = getInviteValidity(invite);

    if (!validity.valid) {
      return json(404, { valid: false, message: validity.reason });
    }

    const serverResult = await dynamoDb.send(new GetCommand({
      TableName: process.env.SERVERS_TABLE,
      Key: { serverId: invite.serverId },
    }));

    if (!serverResult.Item || serverResult.Item.status !== "ACTIVE") {
      return json(404, { valid: false, message: "초대 대상 서버를 찾을 수 없습니다." });
    }

    const server = serverResult.Item;
    return json(200, {
      valid: true,
      invite: {
        inviteCode: invite.inviteCode,
        serverId: invite.serverId,
        serverName: server.serverName || server.title || invite.serverName,
        description: server.description || "",
        currentCount: server.currentCount || 0,
        maxCapacity: server.maxCapacity || 0,
        expiresAt: invite.expiresAt,
        maxUses: invite.maxUses,
        useCount: invite.useCount || 0,
      },
    });
  } catch (error) {
    console.error("validateInvite Error:", error);
    return json(500, { valid: false, message: "초대 코드 검증 실패", error: error.message });
  }
};
