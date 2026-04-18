const { GetCommand, PutCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const dynamoDb = require("../dynamodbClient");
const { verifyAccessToken } = require("../utils");

exports.handler = async (event) => {
  try {
    const { serverId } = event.pathParameters || {};
    const authHeader =
      event.headers?.Authorization || event.headers?.authorization || "";
    const { userId } = verifyAccessToken(authHeader);

    if (!userId) {
      return {
        statusCode: 401,
        headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
        body: JSON.stringify({ message: "인증이 필요합니다." }),
      };
    }

    if (!serverId) {
      return {
        statusCode: 400,
        headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
        body: JSON.stringify({ message: "serverId가 필요합니다." }),
      };
    }

    // 1. 서버 존재 여부 확인
    const serverResult = await dynamoDb.send(new GetCommand({
      TableName: process.env.SERVERS_TABLE,
      Key: { serverId },
    }));

    if (!serverResult.Item) {
      return {
        statusCode: 404,
        headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
        body: JSON.stringify({ message: "해당 서버를 찾을 수 없습니다." }),
      };
    }

    // 2. 이미 참여 중인지 ServerMembers 테이블에서 확인
    const membershipResult = await dynamoDb.send(new GetCommand({
      TableName: process.env.SERVER_MEMBERS_TABLE,
      Key: { userId, serverId },
    }));

    if (membershipResult.Item) {
      return {
        statusCode: 200,
        headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "이미 참여 중인 서버입니다.",
          serverId,
          alreadyMember: true,
        }),
      };
    }

    // 3. 정원 초과 체크
    const currentCount = serverResult.Item.currentCount || 0;
    const maxCapacity = serverResult.Item.maxCapacity || 10;
    if (currentCount >= maxCapacity) {
      return {
        statusCode: 403,
        headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
        body: JSON.stringify({ message: "서버 정원이 가득 찼습니다." }),
      };
    }

    // 4. Users 테이블에서 nickname 조회
    const userResult = await dynamoDb.send(new GetCommand({
      TableName: process.env.USERS_TABLE,
      Key: { userId },
    }));
    const nickname = userResult.Item?.nickname || "Unknown";

    // 5. ServerMembers 테이블에 멤버십 추가
    const joinedAt = new Date().toISOString();
    await dynamoDb.send(new PutCommand({
      TableName: process.env.SERVER_MEMBERS_TABLE,
      Item: { userId, serverId, nickname, role: "MEMBER", joinedAt },
    }));

    // 6. Servers 테이블의 members 배열과 currentCount 업데이트
    const currentMembers = Array.isArray(serverResult.Item.members) ? serverResult.Item.members : [];
    const newMembers = [...currentMembers, { userId, nickname, role: "MEMBER", joinedAt }];

    await dynamoDb.send(new UpdateCommand({
      TableName: process.env.SERVERS_TABLE,
      Key: { serverId },
      UpdateExpression: "SET members = :members, currentCount = :count",
      ExpressionAttributeValues: {
        ":members": newMembers,
        ":count": newMembers.length,
      },
    }));

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
      body: JSON.stringify({ message: "서버 참여 성공", serverId, alreadyMember: false }),
    };
  } catch (error) {
    console.error("joinServer Error:", error);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
      body: JSON.stringify({ message: "서버 참여 실패", error: error.message }),
    };
  }
};
