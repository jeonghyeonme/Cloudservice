const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, QueryCommand } = require("@aws-sdk/lib-dynamodb");

// 로컬(LocalStack) / 운영(AWS) 환경 분기
const client = process.env.IS_OFFLINE
  ? new DynamoDBClient({
      region: "us-east-1",
    })
  : new DynamoDBClient();

const dynamoDb = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
  try {
    const { limit = "20", lastKey } = event.queryStringParameters || {};

    const params = {
      TableName: process.env.ROOMS_TABLE,
      IndexName: "status-createdAt-index",       // GSI 사용
      KeyConditionExpression: "#st = :status",
      ExpressionAttributeNames:  { "#st": "status" },
      ExpressionAttributeValues: { ":status": "ACTIVE" },
      ScanIndexForward: false,   // createdAt 내림차순 (최신순)
      Limit: parseInt(limit),
    };

    // 페이지네이션 지원
    if (lastKey) {
      params.ExclusiveStartKey = JSON.parse(decodeURIComponent(lastKey));
    }

    const result = await dynamoDb.send(new QueryCommand(params));

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        items: result.Items,
        lastKey: result.LastEvaluatedKey
          ? encodeURIComponent(JSON.stringify(result.LastEvaluatedKey))
          : null,
      }),
    };
  } catch (error) {
    console.error("DynamoDB Scan Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "방 목록을 불러오는 중 오류가 발생했습니다.", error: error.message }),
    };
  }
};