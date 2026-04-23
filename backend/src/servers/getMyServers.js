const { QueryCommand, BatchGetCommand } = require("@aws-sdk/lib-dynamodb");
const dynamoDb = require("../dynamodbClient");
const { verifyAccessToken } = require("../utils");
const { HEADERS } = require("../utils/response");

exports.handler = async (event) => {
  try {
    const authHeader = event.headers?.Authorization || event.headers?.authorization || "";
    const { userId } = verifyAccessToken(authHeader);

    if (!userId) {
      return {
        statusCode: 401,
        headers: HEADERS,
        body: JSON.stringify({ message: "인증이 필요합니다." }),
      };
    }

    // 1. 내가 가입한 서버의 ID 목록 쿼리
    const membership = await dynamoDb.send(new QueryCommand({
      TableName: process.env.SERVER_MEMBERS_TABLE,
      KeyConditionExpression: "userId = :uid",
      ExpressionAttributeValues: { ":uid": userId },
    }));

    const myServerIds = membership.Items?.map(item => item.serverId) || [];

    if (myServerIds.length === 0) {
      return {
        statusCode: 200,
        headers: HEADERS,
        body: JSON.stringify({ items: [] }),
      };
    }

    // 2. 서버 ID 목록으로 실제 서버 상세 정보 일괄 조회
    const uniqueServerIds = [...new Set(myServerIds)];
    const serversResult = await dynamoDb.send(new BatchGetCommand({
      RequestItems: {
        [process.env.SERVERS_TABLE]: {
          Keys: uniqueServerIds.map(id => ({ serverId: id })),
        },
      },
    }));

    const servers = serversResult.Responses[process.env.SERVERS_TABLE] || [];
    servers.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({ items: servers }),
    };
  } catch (error) {
    console.error("getMyServers Error:", error);
    return {
      statusCode: 500,
      headers: HEADERS,
      body: JSON.stringify({ message: "내 서버 조회 실패", error: error.message }),
    };
  }
};
