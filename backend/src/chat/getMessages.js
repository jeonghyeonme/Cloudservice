const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, QueryCommand } = require("@aws-sdk/lib-dynamodb");

// 로컬(LocalStack) / 운영(AWS) 환경 분기
const client = process.env.IS_OFFLINE
  ? new DynamoDBClient({
      region: "us-east-1",
      endpoint: "http://localhost:4566",
      credentials: {
        accessKeyId: "test",
        secretAccessKey: "test",
      },
    })
  : new DynamoDBClient();

const dynamoDb = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
  try {
    const roomId = event.pathParameters.roomId;

    if (!roomId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "roomId가 필요합니다." }),
      };
    }

    const params = {
      TableName: "Messages",
      KeyConditionExpression: "roomId = :roomId",
      ExpressionAttributeValues: {
        ":roomId": roomId,
      },
      // 메시지 ID(타임스탬프 포함) 기준으로 오름차순 정렬 (과거 -> 최신)
      ScanIndexForward: true, 
    };

    const result = await dynamoDb.send(new QueryCommand(params));

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(result.Items),
    };
  } catch (error) {
    console.error("DynamoDB Query Error (Messages):", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "메시지 내역을 불러오는 중 오류가 발생했습니다.", error: error.message }),
    };
  }
};
