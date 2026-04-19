const { GetCommand, DeleteCommand } = require("@aws-sdk/lib-dynamodb");
const dynamoDb = require("../dynamodbClient");
const { verifyAccessToken } = require("../utils");

exports.handler = async (event) => {
  try {
    const { roomId } = event.pathParameters || {};
    const authHeader =
      event.headers?.Authorization || event.headers?.authorization || "";
    const { userId, error } = verifyAccessToken(authHeader);

    // 1. 인증 실패
    if (error || !userId) {
      return {
        statusCode: 401,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Credentials": true,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: "인증이 필요합니다." }),
      };
    }

    if (!roomId) {
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Credentials": true,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: "roomId가 필요합니다." }),
      };
    }

    // 2. 방 정보 조회하여 hostId 확인
    const roomResult = await dynamoDb.send(
      new GetCommand({
        TableName: process.env.ROOMS_TABLE,
        Key: { roomId },
      })
    );

    if (!roomResult.Item) {
      return {
        statusCode: 404,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Credentials": true,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: "해당 방을 찾을 수 없습니다." }),
      };
    }

    // 3. 방장 권한 검증
    if (roomResult.Item.hostId !== userId) {
      return {
        statusCode: 403,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Credentials": true,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: "방장만 삭제할 수 있습니다." }),
      };
    }

    // 4. 방 삭제
    await dynamoDb.send(
      new DeleteCommand({
        TableName: process.env.ROOMS_TABLE,
        Key: { roomId },
      })
    );

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: "방 삭제 성공", roomId }),
    };
  } catch (error) {
    console.error("deleteRoom Error:", error);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: "방 삭제 실패", error: error.message }),
    };
  }
};