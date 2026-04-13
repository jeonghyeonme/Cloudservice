const { GetCommand } = require("@aws-sdk/lib-dynamodb");
const dynamoDb = require("../dynamodbClient");

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
      TableName: process.env.ROOMS_TABLE, // 환경 변수 적용
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
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "방 상세 조회 실패", error: error.message }),
    };
  }
};