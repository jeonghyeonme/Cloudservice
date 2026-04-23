const { GetCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const dynamoDb = require("../dynamodbClient");

exports.handler = async (event) => {
  try {
    const serverId = event.pathParameters.serverId;
    const chId = event.pathParameters.chId;

    const serverData = await dynamoDb.send(new GetCommand({
      TableName: process.env.SERVERS_TABLE,
      Key: { serverId },
    }));

    if (!serverData.Item || !serverData.Item.channels) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "서버 또는 채널 정보를 찾을 수 없습니다." }),
      };
    }

    const currentChannels = serverData.Item.channels;
    const targetChannel = currentChannels.find((ch) => ch.chId === chId);

    if (targetChannel?.isDefault) {
      return {
        statusCode: 403,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Credentials": true,
        },
        body: JSON.stringify({ message: "기본 채널은 삭제할 수 없습니다." }),
      };
    }

const updatedChannels = currentChannels.filter((ch) => ch.chId !== chId);

    await dynamoDb.send(new UpdateCommand({
      TableName: process.env.SERVERS_TABLE,
      Key: { serverId },
      UpdateExpression: "SET channels = :updatedChannels",
      ExpressionAttributeValues: {
        ":updatedChannels": updatedChannels,
      },
    }));

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify({ message: "채널 삭제 성공" }),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "채널 삭제 실패", error: error.message }),
    };
  }
};
