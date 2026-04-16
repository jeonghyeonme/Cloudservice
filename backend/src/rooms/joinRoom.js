const { GetCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const dynamoDb = require("../dynamodbClient");
const { verifyAccessToken } = require("../utils");

// 방 참여 시 유저 정보 저장 핸들러
exports.handler = async (event) => {
  try {
    const { roomId } = event.pathParameters || {};
    const authHeader =
      event.headers?.Authorization || event.headers?.authorization || "";
    const { userId } = verifyAccessToken(authHeader);

    if (!userId) {
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

    const roomResult = await dynamoDb.send(
      new GetCommand({
        TableName: process.env.ROOMS_TABLE,
        Key: { roomId },
      }),
    );

    const room = roomResult.Item;

    if (!room) {
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

    const members = Array.isArray(room.members) ? room.members : [];
    const alreadyMember = members.some((member) => member?.userId === userId);

    if (!alreadyMember) {
      const nextMembers = [
        ...members,
        { userId, role: "MEMBER", joinedAt: new Date().toISOString() },
      ];

      await dynamoDb.send(
        new UpdateCommand({
          TableName: process.env.ROOMS_TABLE,
          Key: { roomId },
          UpdateExpression: "SET members = :members, currentCount = :count",
          ExpressionAttributeValues: {
            ":members": nextMembers,
            ":count": nextMembers.length,
          },
        }),
      );
    }

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: alreadyMember ? "이미 참여 중인 방입니다." : "방 참여 성공",
        roomId,
      }),
    };
  } catch (error) {
    console.error("joinRoom Error:", error);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: "방 참여 실패", error: error.message }),
    };
  }
};
