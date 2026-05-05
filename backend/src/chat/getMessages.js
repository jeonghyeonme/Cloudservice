const { QueryCommand } = require("@aws-sdk/lib-dynamodb");
const dynamoDb = require("../dynamodbClient");

exports.handler = async (event) => {
  try {
    const serverId = event.pathParameters.serverId;
    const { keyword } = event.queryStringParameters || {};

    if (!serverId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "serverId가 필요합니다." }),
      };
    }

    const params = {
      TableName: process.env.MESSAGES_TABLE,
      KeyConditionExpression: "serverId = :serverId",
      ExpressionAttributeValues: {
        ":serverId": serverId,
      },
      ScanIndexForward: true,
    };

    if (keyword && keyword.trim()) {
      params.FilterExpression =
        "contains(#content, :keyword) AND #messageType = :messageType AND (attribute_not_exists(#isDeleted) OR #isDeleted = :isDeleted)";
      params.ExpressionAttributeNames = {
        "#content": "content",
        "#messageType": "messageType",
        "#isDeleted": "isDeleted",
      };
      params.ExpressionAttributeValues[":keyword"] = keyword.trim();
      params.ExpressionAttributeValues[":messageType"] = "TEXT";
      params.ExpressionAttributeValues[":isDeleted"] = false;
    }

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
    console.error("getMessages Error:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "메시지 조회 실패",
        error: error.message,
      }),
    };
  }
};