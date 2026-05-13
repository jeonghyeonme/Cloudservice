const { QueryCommand, BatchWriteCommand } = require("@aws-sdk/lib-dynamodb");
const dynamoDb = require("../dynamodbClient");
const { ROLE, json, requireServerRole } = require("../servers/serverAccess");

function chunk(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

exports.handler = async (event) => {
  try {
    const { serverId } = event.pathParameters || {};
    const access = await requireServerRole(event, serverId, ROLE.HOST);
    if (access.response) return access.response;

    const result = await dynamoDb.send(new QueryCommand({
      TableName: process.env.INVITES_TABLE,
      IndexName: "serverId-createdAt-index",
      KeyConditionExpression: "serverId = :sid",
      ExpressionAttributeValues: { ":sid": serverId },
    }));

    const invites = result.Items || [];
    for (const group of chunk(invites, 25)) {
      await dynamoDb.send(new BatchWriteCommand({
        RequestItems: {
          [process.env.INVITES_TABLE]: group.map((invite) => ({
            DeleteRequest: { Key: { inviteId: invite.inviteId } },
          })),
        },
      }));
    }

    return json(200, { message: "서버 초대 코드가 초기화되었습니다.", deletedCount: invites.length });
  } catch (error) {
    console.error("resetInvites Error:", error);
    return json(500, { message: "초대 코드 초기화 실패", error: error.message });
  }
};
