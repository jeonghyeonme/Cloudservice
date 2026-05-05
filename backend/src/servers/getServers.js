const { QueryCommand } = require("@aws-sdk/lib-dynamodb");
const dynamoDb = require("../dynamodbClient");
const { HEADERS } = require("../utils/response");

exports.handler = async (event) => {
  try {
    const { limit = "20", lastKey } = event.queryStringParameters || {};

    const params = {
      TableName: process.env.SERVERS_TABLE,
      IndexName: "status-createdAt-index",
      KeyConditionExpression: "#st = :status",
      ExpressionAttributeNames:  { "#st": "status" },
      ExpressionAttributeValues: { ":status": "ACTIVE" },
      ScanIndexForward: false,
      Limit: parseInt(limit),
    };

    if (lastKey) {
      params.ExclusiveStartKey = JSON.parse(decodeURIComponent(lastKey));
    }

    const result = await dynamoDb.send(new QueryCommand(params));

    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({
        items: result.Items,
        lastKey: result.LastEvaluatedKey ? encodeURIComponent(JSON.stringify(result.LastEvaluatedKey)) : null,
      }),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      headers: HEADERS,
      body: JSON.stringify({ message: "서버 목록 조회 실패", error: error.message }),
    };
  }
};
