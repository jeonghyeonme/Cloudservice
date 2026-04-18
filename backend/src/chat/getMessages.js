const { QueryCommand } = require("@aws-sdk/lib-dynamodb");
const dynamoDb = require("../dynamodbClient");

exports.handler = async (event) => {
  try {
    const serverId = event.pathParameters.serverId;

    if (!serverId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "serverId가 필요합니다." }),
      };
    }

    const params = {
      TableName: process.env.MESSAGES_TABLE,
      KeyConditionExpression: "roomId = :serverId",
      ExpressionAttributeValues: {
        ":serverId": serverId,
      },
      ScanIndexForward: true,
    };

    const result = await dynamoDb.send(new QueryCommand(params));

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(result.Items),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "메시지 조회 실패", error: error.message }),
    };
  }
};
