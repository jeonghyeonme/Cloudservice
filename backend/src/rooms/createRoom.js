const { PutCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");
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

    // ✅ 호스트의 nickname을 Users 테이블에서 조회
    let hostNickname = "Unknown";
    if (hostId) {
      const userResult = await dynamoDb.send(new GetCommand({
        TableName: process.env.USERS_TABLE,
        Key: { userId: hostId },
      }));
      hostNickname = userResult.Item?.nickname || "Unknown";
    }

    // 1. Rooms 테이블에 방 생성
    const roomParams = {
      TableName: process.env.ROOMS_TABLE,
      Item: {
        roomId,
        status: "ACTIVE",
        createdAt,
        roomName: body.roomName || "기본 스터디룸",
        description: body.description || "",
        hostId: hostId || null,
        hostNickname,
        maxCapacity: body.maxCapacity || 10,
        currentCount: hostId ? 1 : 0,
        members: hostId
          ? [{ userId: hostId, nickname: hostNickname, role: "HOST", joinedAt: createdAt }]
          : [],
      },
    };

    await dynamoDb.send(new PutCommand(roomParams));

    // 2. RoomMembers 테이블에 방장 가입 처리
    if (hostId) {
      const memberParams = {
        TableName: process.env.ROOM_MEMBERS_TABLE,
        Item: {
          userId: hostId,
          roomId: roomId,
          nickname: hostNickname,
          role: "HOST",
          joinedAt: createdAt,
        },
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
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: "방 생성 실패", error: error.message }),
    };
  }
};