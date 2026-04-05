const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, ScanCommand } = require("@aws-sdk/lib-dynamodb");

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
    const params = {
      TableName: process.env.ROOMS_TABLE,
    };

    // ScanCommand: 테이블 전체 조회
    // ⚠️ 데이터가 많아지면 성능 저하 → status-createdAt-index GSI + QueryCommand로 교체 권장
    const result = await dynamoDb.send(new ScanCommand(params));

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify(result.Items),
    };
  } catch (error) {
    console.error("DynamoDB Scan Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "방 목록을 불러오는 중 오류가 발생했습니다.", error: error.message }),
    };
  }
};