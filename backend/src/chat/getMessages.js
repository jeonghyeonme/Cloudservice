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
      ScanIndexForward: false, // 🔥 최신순
    };

    if (keyword && keyword.trim()) {
      params.FilterExpression = "contains(#content, :keyword)";
      params.ExpressionAttributeNames = {
        "#content": "content",
      };
      params.ExpressionAttributeValues[":keyword"] = keyword.trim();
    }

    const result = await dynamoDb.send(new QueryCommand(params));

    let items = result.Items || [];

    // 🔥 정렬 보정 (timestamp 기준 내림차순)
    items.sort((a, b) => {
      const t1 = new Date(a.timestamp || a.createdAt).getTime();
      const t2 = new Date(b.timestamp || b.createdAt).getTime();
      return t2 - t1;
    });

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(items), // 🔥 기존 형태 유지
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