const { PutCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");
const dynamoDb = require("../dynamodbClient");
const { verifyAccessToken } = require("../utils");
const { HEADERS } = require("../utils/response");

exports.handler = async (event) => {
  try {
    const { roomId } = event.pathParameters || {};
    const authHeader = event.headers?.Authorization || event.headers?.authorization || "";
    const { userId } = verifyAccessToken(authHeader);

    if (!userId) {
      return {
        statusCode: 401,
        headers: HEADERS,
        body: JSON.stringify({ message: "인증이 필요합니다." }),
      };
    }
    if (!roomId) {
      return { 
        statusCode: 400, 
        headers: HEADERS,
        body: JSON.stringify({ message: "roomId 누락" }) 
      };
    }

    // 1. 방 존재 여부 먼저 확인
    const room = await dynamoDb.send(new GetCommand({
      TableName: process.env.ROOMS_TABLE,
      Key: { roomId }
    }));

    if (!room.Item) {
      return { 
        statusCode: 404, 
        headers: HEADERS, // 추가됨
        body: JSON.stringify({ message: "방을 찾을 수 없습니다." }) 
      };
    }

    // 2. RoomMembers 테이블에 멤버십 정보 저장 (배열 업데이트 대신 Put)
    await dynamoDb.send(new PutCommand({
      TableName: process.env.ROOM_MEMBERS_TABLE,
      Item: {
        userId: userId,
        roomId: roomId,
        role: "MEMBER",
        joinedAt: new Date().toISOString()
      },
      // 중복 가입 방지
      ConditionExpression: "attribute_not_exists(userId) AND attribute_not_exists(roomId)"
    }));

    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({
        message: alreadyMember ? "이미 참여 중인 방입니다." : "방 참여 성공",
        roomId,
      }),
    };
  } catch (error) {
    console.error("joinRoom Error:", error);
    return {
      statusCode: 500,
      headers: HEADERS,
      body: JSON.stringify({ message: "방 참여 중 오류 발생", error: error.message }),
    };
  }
};