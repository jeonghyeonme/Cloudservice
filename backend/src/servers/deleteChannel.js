const { UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const dynamoDb = require("../dynamodbClient");
const { HEADERS } = require("../utils/response");
const { ROLE, requireServerRole } = require("./serverAccess");

exports.handler = async (event) => {
  try {
    const serverId = event.pathParameters.serverId;
    const chId = event.pathParameters.chId;
    const access = await requireServerRole(event, serverId, ROLE.MODERATOR);
    if (access.response) return access.response;

    if (!access.server.channels) {
      return {
        statusCode: 404,
        headers: HEADERS,
        body: JSON.stringify({ message: "서버 또는 채널 정보를 찾을 수 없습니다." }),
      };
    }

    const currentChannels = access.server.channels;
    const targetChannel = currentChannels.find((ch) => ch.chId === chId);

    if (!targetChannel) {
      return {
        statusCode: 404,
        headers: HEADERS,
        body: JSON.stringify({ message: "해당 채널을 찾을 수 없습니다." }),
      };
    }

    if (targetChannel?.isDefault) {
      return {
        statusCode: 403,
        headers: HEADERS,
        body: JSON.stringify({ message: "기본 채널은 삭제할 수 없습니다." }),
      };
    }

    const updatedChannels = currentChannels.filter((ch) => ch.chId !== chId);

    await dynamoDb.send(new UpdateCommand({
      TableName: process.env.SERVERS_TABLE,
      Key: { serverId },
      UpdateExpression: "SET channels = :updatedChannels, updatedAt = :updatedAt",
      ExpressionAttributeValues: {
        ":updatedChannels": updatedChannels,
        ":updatedAt": new Date().toISOString(),
      },
    }));

    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({ message: "채널 삭제 성공" }),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      headers: HEADERS,
      body: JSON.stringify({ message: "채널 삭제 실패", error: error.message }),
    };
  }
};
