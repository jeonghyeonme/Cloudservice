const { GetCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const dynamoDb = require("../dynamodbClient");

exports.handler = async (event) => {
  try {
    const { serverId, chId } = event.pathParameters || {};
    const body = JSON.parse(event.body || "{}");

    const serverResult = await dynamoDb.send(new GetCommand({
      TableName: process.env.SERVERS_TABLE,
      Key: { serverId },
    }));

    if (!serverResult.Item || !serverResult.Item.channels) {
      return {
        statusCode: 404,
        headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
        body: JSON.stringify({ message: "서버 또는 채널을 찾을 수 없습니다." }),
      };
    }

    const channels = serverResult.Item.channels;
    const channelIndex = channels.findIndex(ch => ch.chId === chId);

    if (channelIndex === -1) {
      return {
        statusCode: 404,
        headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
        body: JSON.stringify({ message: "해당 채널을 찾을 수 없습니다." }),
      };
    }

    // 기존 채널 정보에 수정사항 반영
    const updatedChannel = {
      ...channels[channelIndex],
      ...(body.name !== undefined && { name: body.name, label: body.name }),
      ...(body.topic !== undefined && { topic: body.topic }),
    };

    const updatedChannels = [...channels];
    updatedChannels[channelIndex] = updatedChannel;

    await dynamoDb.send(new UpdateCommand({
      TableName: process.env.SERVERS_TABLE,
      Key: { serverId },
      UpdateExpression: "SET channels = :channels",
      ExpressionAttributeValues: { ":channels": updatedChannels },
    }));

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
      body: JSON.stringify({ message: "채널 수정 완료", channel: updatedChannel }),
    };
  } catch (error) {
    console.error("updateChannel Error:", error);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
      body: JSON.stringify({ message: "채널 수정 실패", error: error.message }),
    };
  }
};