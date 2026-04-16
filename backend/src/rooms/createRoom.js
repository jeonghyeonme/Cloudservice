const { PutCommand } = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");
const dynamoDb = require("../dynamodbClient");
const { verifyAccessToken } = require("../utils");

module.exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");

    const authHeader =
      event.headers?.Authorization || event.headers?.authorization || "";
    const { userId: hostId } = verifyAccessToken(authHeader);

    const roomId = uuidv4();
    const createdAt = new Date().toISOString();

    // 1. Rooms 테이블에 방 생성 데이터 Put
    const roomParams = {
      TableName: process.env.ROOMS_TABLE,
      Item: {
        roomId,
        status: "ACTIVE",
        createdAt,
        roomName: body.roomName || "기본 스터디룸",
        description: body.description || "",
        hostId: hostId || null,
        maxCapacity: body.maxCapacity || 10,
        currentCount: hostId ? 1 : 0, // 호스트가 있으면 1명, 없으면 0명으로 초기화
        members: hostId
          ? [{ userId: hostId, role: "HOST", joinedAt: createdAt }]
          : [],
      },
    };

    await dynamoDb.send(new PutCommand(roomParams));

    // 2. RoomMembers 테이블에 방장(호스트) 자동 가입 처리 (추가된 부분)
    if (hostId) {
      const memberParams = {
        TableName: process.env.ROOM_MEMBERS_TABLE,
        Item: {
          userId: hostId,
          roomId: roomId,
          role: "HOST", // 방장이므로 권한은 HOST
          joinedAt: createdAt
        }
      };
      await dynamoDb.send(new PutCommand(memberParams));
    }

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "방 생성 성공",
        roomId,
      }),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      headers: { // 프론트엔드에서 에러 메시지를 읽을 수 있도록 CORS 헤더 추가
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: "방 생성 실패", error: error.message }),
    };
  }
};