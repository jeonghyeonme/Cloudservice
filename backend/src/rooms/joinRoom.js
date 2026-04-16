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
        headers: HEADERS,
        body: JSON.stringify({ message: "방을 찾을 수 없습니다." }) 
      };
    }

    // 2. RoomMembers 테이블에 멤버십 정보 저장
    await dynamoDb.send(new PutCommand({
      TableName: process.env.ROOM_MEMBERS_TABLE,
      Item: {
        userId: userId,
        roomId: roomId,
        role: "MEMBER",
        joinedAt: new Date().toISOString()
      },
      // 중복 가입 방지 (이미 userId와 roomId 조합이 있으면 에러 발생)
      ConditionExpression: "attribute_not_exists(userId) AND attribute_not_exists(roomId)"
    }));

    // 3. 정상 응답 (오류 유발 변수 제거)
    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({
        message: "방 참여 성공",
        roomId,
      }),
    };
  } catch (error) {
    console.error("joinRoom Error:", error);

    // 4. 중복 가입 에러 핸들링 (400 Bad Request)
    if (error.name === "ConditionalCheckFailedException") {
      return {
        statusCode: 400,
        headers: HEADERS,
        body: JSON.stringify({ message: "이미 참여 중인 방입니다." })
      };
    }

    // 5. 진짜 서버 에러 (500 Internal Server Error)
    return {
      statusCode: 500,
      headers: HEADERS,
      body: JSON.stringify({ message: "방 참여 중 오류 발생", error: error.message }),
    };
  }
};