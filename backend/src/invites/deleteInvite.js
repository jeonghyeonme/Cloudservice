const { GetCommand, DeleteCommand } = require("@aws-sdk/lib-dynamodb");
const dynamoDb = require("../dynamodbClient");
const { ROLE, json, requireServerRole } = require("../servers/serverAccess");

exports.handler = async (event) => {
  try {
    const { serverId, inviteId } = event.pathParameters || {};
    const access = await requireServerRole(event, serverId, ROLE.MODERATOR);
    if (access.response) return access.response;

    const result = await dynamoDb.send(new GetCommand({
      TableName: process.env.INVITES_TABLE,
      Key: { inviteId },
    }));

    if (!result.Item || result.Item.serverId !== serverId) {
      return json(404, { message: "초대 코드를 찾을 수 없습니다." });
    }

    await dynamoDb.send(new DeleteCommand({
      TableName: process.env.INVITES_TABLE,
      Key: { inviteId },
    }));

    return json(200, { message: "초대 코드 삭제 완료", inviteId });
  } catch (error) {
    console.error("deleteInvite Error:", error);
    return json(500, { message: "초대 코드 삭제 실패", error: error.message });
  }
};
