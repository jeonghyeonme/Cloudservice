const { QueryCommand } = require("@aws-sdk/lib-dynamodb");
const dynamoDb = require("../dynamodbClient");
const { ROLE, json, requireServerRole } = require("../servers/serverAccess");

exports.handler = async (event) => {
  try {
    const { serverId } = event.pathParameters || {};
    const access = await requireServerRole(event, serverId, ROLE.MODERATOR);
    if (access.response) return access.response;

    const result = await dynamoDb.send(new QueryCommand({
      TableName: process.env.INVITES_TABLE,
      IndexName: "serverId-createdAt-index",
      KeyConditionExpression: "serverId = :sid",
      ExpressionAttributeValues: { ":sid": serverId },
      ScanIndexForward: false,
    }));

    return json(200, { items: result.Items || [] });
  } catch (error) {
    console.error("listInvites Error:", error);
    return json(500, { message: "초대 코드 목록 조회 실패", error: error.message });
  }
};
