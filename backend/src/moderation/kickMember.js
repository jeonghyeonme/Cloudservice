const { GetCommand, DeleteCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const dynamoDb = require("../dynamodbClient");
const { ROLE, json, requireServerRole, normalizeMembers, canManageMember } = require("../servers/serverAccess");

exports.handler = async (event) => {
  try {
    const { serverId, targetUserId } = event.pathParameters || {};
    const access = await requireServerRole(event, serverId, ROLE.MODERATOR);
    if (access.response) return access.response;

    if (!targetUserId || targetUserId === access.userId) {
      return json(400, { message: "자기 자신은 강퇴할 수 없습니다." });
    }

    const target = await dynamoDb.send(new GetCommand({
      TableName: process.env.SERVER_MEMBERS_TABLE,
      Key: { userId: targetUserId, serverId },
    }));

    if (!target.Item) {
      return json(404, { message: "대상 멤버를 찾을 수 없습니다." });
    }

    const targetRole = target.Item.role || ROLE.MEMBER;
    if (!canManageMember(access.role, targetRole)) {
      return json(403, { message: "동급 또는 상위 권한의 멤버는 강퇴할 수 없습니다." });
    }

    await dynamoDb.send(new DeleteCommand({
      TableName: process.env.SERVER_MEMBERS_TABLE,
      Key: { userId: targetUserId, serverId },
    }));

    const updatedMembers = normalizeMembers(access.server).filter((member) => member.userId !== targetUserId);
    await dynamoDb.send(new UpdateCommand({
      TableName: process.env.SERVERS_TABLE,
      Key: { serverId },
      UpdateExpression: "SET members = :members, currentCount = :count",
      ExpressionAttributeValues: {
        ":members": updatedMembers,
        ":count": updatedMembers.length,
      },
    }));

    return json(200, { message: "멤버를 강퇴했습니다.", userId: targetUserId });
  } catch (error) {
    console.error("kickMember Error:", error);
    return json(500, { message: "멤버 강퇴 실패", error: error.message });
  }
};
