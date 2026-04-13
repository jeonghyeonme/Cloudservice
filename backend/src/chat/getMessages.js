const { QueryCommand } = require("@aws-sdk/lib-dynamodb");
const dynamoDb = require("../dynamodbClient"); // 공통 모듈 사용

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
      TableName: process.env.MESSAGES_TABLE, // 환경 변수 적용
      KeyConditionExpression: "roomId = :roomId",
      ExpressionAttributeValues: {
        ":roomId": roomId,
      },
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
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "메시지 조회 실패", error: error.message }),
    };
  }
};