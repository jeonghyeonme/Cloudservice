const { GetCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");
const dynamoDb = require("../dynamodbClient");

exports.handler = async (event) => {
  try {
    const serverId = event.pathParameters.serverId;
    const body = JSON.parse(event.body || "{}");
    const { name, label, topic } = body;

    if (!name) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "채널 이름은 필수입니다." }),
      };
    }

    const serverData = await dynamoDb.send(new GetCommand({
      TableName: process.env.SERVERS_TABLE,
      Key: { serverId },
    }));

    if (!serverData.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "서버를 찾을 수 없습니다." }),
      };
    }

    const currentChannels = serverData.Item.channels || [];
    const newChannel = {
      chId: uuidv4(),
      name,
      label: label || name,
      topic: topic || "새 채널에 대한 첫 대화를 시작해보세요.",
    };

    await dynamoDb.send(new UpdateCommand({
      TableName: process.env.SERVERS_TABLE,
      Key: { serverId },
      UpdateExpression: "SET channels = :updatedChannels",
      ExpressionAttributeValues: {
        ":updatedChannels": [...currentChannels, newChannel],
      },
    }));

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify({ message: "채널 추가 성공", channel: newChannel }),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "채널 추가 실패", error: error.message }),
    };
  }
};
