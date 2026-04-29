const { GetCommand, DeleteCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const dynamoDb = require("../dynamodbClient");
const { verifyAccessToken } = require("../utils");

exports.handler = async (event) => {
  try {
    const { serverId } = event.pathParameters || {};
    const authHeader = event.headers?.Authorization || event.headers?.authorization || "";
    const { userId } = verifyAccessToken(authHeader);

    if (!userId) {
      return {
        statusCode: 401,
        headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
        body: JSON.stringify({ message: "인증이 필요합니다." }),
      };
    }

    // 서버 존재 확인
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

    // 방장은 나갈 수 없음
    if (serverResult.Item.hostId === userId) {
      return {
        statusCode: 403,
        headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
        body: JSON.stringify({ message: "방장은 서버를 나갈 수 없습니다. 서버를 삭제해주세요." }),
      };
    }

    // ServerMembers에서 삭제
    await dynamoDb.send(new DeleteCommand({
      TableName: process.env.SERVER_MEMBERS_TABLE,
      Key: { userId, serverId },
    }));

    // Servers.members 배열에서 제거 + currentCount 감소
    const currentMembers = Array.isArray(serverResult.Item.members) ? serverResult.Item.members : [];
    const updatedMembers = currentMembers.filter(m => m.userId !== userId);

    await dynamoDb.send(new UpdateCommand({
      TableName: process.env.SERVERS_TABLE,
      Key: { serverId },
      UpdateExpression: "SET members = :members, currentCount = :count",
      ExpressionAttributeValues: {
        ":members": updatedMembers,
        ":count": Math.max(0, updatedMembers.length),
      },
    }));

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
      body: JSON.stringify({ message: "서버에서 나갔습니다.", serverId }),
    };
  } catch (error) {
    console.error("leaveServer Error:", error);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
      body: JSON.stringify({ message: "서버 나가기 실패", error: error.message }),
    };
  }
};