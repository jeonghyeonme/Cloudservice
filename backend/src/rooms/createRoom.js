const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");

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

module.exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    
    // roomId: uuid 대신 랜덤 문자열 사용
    const roomId = "room_" + Math.random().toString(36).substr(2, 9);
    const createdAt = new Date().toISOString();

    const params = {
      TableName: "Rooms",
      Item: {
        roomId: roomId,
        status: "ACTIVE",                           // GSI 키 (String)
        createdAt: createdAt,
        roomName: body.roomName || "기본 스터디룸",
        description: body.description || "열공합시다!",
      },
    };

    // Rooms 테이블에 저장
    await dynamoDb.send(new PutCommand(params));

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify({
        message: "✅ 스터디룸이 완벽하게 DB에 저장되었습니다!",
        createdRoom: params.Item,
      }),
    };
  } catch (error) {
    console.error("DynamoDB Put Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "방 생성 중 에러가 발생했습니다.", error: error.message }),
    };
  }
};