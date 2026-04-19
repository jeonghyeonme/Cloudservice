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

    const serverId = uuidv4();
    const createdAt = new Date().toISOString();

    // 호스트의 nickname을 Users 테이블에서 조회
    let hostNickname = "Unknown";
    if (hostId) {
      const userResult = await dynamoDb.send(new GetCommand({
        TableName: process.env.USERS_TABLE,
        Key: { userId: hostId },
      }));
      hostNickname = userResult.Item?.nickname || "Unknown";
    }

    // 1. Servers 테이블에 서버 생성
    const serverParams = {
      TableName: process.env.SERVERS_TABLE,
      Item: {
        serverId,
        status: "ACTIVE",
        createdAt,
        serverName: body.serverName || body.roomName || "기본 스터디 서버",
        description: body.description || "",
        hostId: hostId || null,
        hostNickname,
        maxCapacity: body.maxCapacity || 10,
        currentCount: hostId ? 1 : 0,
        isPrivate: body.isPrivate || false,
        password: body.password || null,
        channels: [
          { chId: uuidv4(), name: "일반", label: "일반", topic: "" },
        ],
        members: hostId
          ? [{ userId: hostId, nickname: hostNickname, role: "HOST", joinedAt: createdAt }]
          : [],
      },
    };

    await dynamoDb.send(new PutCommand(serverParams));

    // 2. ServerMembers 테이블에 방장 가입 처리
    if (hostId) {
      await dynamoDb.send(new PutCommand({
        TableName: process.env.SERVER_MEMBERS_TABLE,
        Item: {
          userId: hostId,
          serverId,
          nickname: hostNickname,
          role: "HOST",
          joinedAt: createdAt,
        },
      }));
    }

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "서버 생성 성공",
        serverId,
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
      body: JSON.stringify({ message: "서버 생성 실패", error: error.message }),
    };
  }
};
