const { UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const dynamoDb = require("../dynamodbClient");
const { HEADERS } = require("../utils/response");
const { ROLE, requireServerRole } = require("./serverAccess");

exports.handler = async (event) => {
  try {
    const { serverId, chId } = event.pathParameters || {};
    const access = await requireServerRole(event, serverId, ROLE.MODERATOR);
    if (access.response) return access.response;

    const body = JSON.parse(event.body || "{}");

    if (!access.server.channels) {
      return {
        statusCode: 404,
        headers: HEADERS,
        body: JSON.stringify({ message: "서버 또는 채널을 찾을 수 없습니다." }),
      };
    }

    const channels = access.server.channels;
    const channelIndex = channels.findIndex(ch => ch.chId === chId);

    if (channelIndex === -1) {
      return {
        statusCode: 404,
        headers: HEADERS,
        body: JSON.stringify({ message: "해당 채널을 찾을 수 없습니다." }),
      };
    }

    const updatedChannel = {
      ...channels[channelIndex],
      ...(body.name !== undefined && { name: body.name, label: body.label || body.name }),
      ...(body.topic !== undefined && { topic: body.topic }),
    };

    const updatedChannels = [...channels];
    updatedChannels[channelIndex] = updatedChannel;

    await dynamoDb.send(new UpdateCommand({
      TableName: process.env.SERVERS_TABLE,
      Key: { serverId },
      UpdateExpression: "SET channels = :channels, updatedAt = :updatedAt",
      ExpressionAttributeValues: {
        ":channels": updatedChannels,
        ":updatedAt": new Date().toISOString(),
      },
    }));

    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({ message: "채널 수정 완료", channel: updatedChannel }),
    };
  } catch (error) {
    console.error("updateChannel Error:", error);
    return {
      statusCode: 500,
      headers: HEADERS,
      body: JSON.stringify({ message: "채널 수정 실패", error: error.message }),
    };
  }
};
