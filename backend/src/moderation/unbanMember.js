const { UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const dynamoDb = require("../dynamodbClient");
const { ROLE, json, requireServerRole } = require("../servers/serverAccess");

exports.handler = async (event) => {
  try {
    const { serverId, targetUserId } = event.pathParameters || {};
    const access = await requireServerRole(event, serverId, ROLE.MODERATOR);
    if (access.response) return access.response;

    const bannedMembers = Array.isArray(access.server.bannedMembers) ? access.server.bannedMembers : [];
    const updatedBannedMembers = bannedMembers.filter((member) => member.userId !== targetUserId);

    await dynamoDb.send(new UpdateCommand({
      TableName: process.env.SERVERS_TABLE,
      Key: { serverId },
      UpdateExpression: "SET bannedMembers = :bannedMembers",
      ExpressionAttributeValues: { ":bannedMembers": updatedBannedMembers },
    }));

    return json(200, { message: "멤버 차단을 해제했습니다.", userId: targetUserId });
  } catch (error) {
    console.error("unbanMember Error:", error);
    return json(500, { message: "멤버 차단 해제 실패", error: error.message });
  }
};
