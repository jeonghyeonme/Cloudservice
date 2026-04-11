const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand } = require("@aws-sdk/lib-dynamodb");

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
      TableName: "Rooms",
      Key: {
        roomId: roomId,
      },
    };

    const result = await dynamoDb.send(new GetCommand(params));

    if (!result.Item) {
      return {
        statusCode: 404,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Credentials": true,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ message: "해당 방을 찾을 수 없습니다." }),
      };
    }

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(result.Item),
    };
  } catch (error) {
    console.error("DynamoDB Get Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "방 정보를 불러오는 중 오류가 발생했습니다.", error: error.message }),
    };
  }
};
