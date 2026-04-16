const { QueryCommand, BatchGetItemCommand } = require("@aws-sdk/lib-dynamodb");
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

    // 1. 내가 가입한 방의 ID 목록만 쿼리 (Index 활용으로 매우 빠름)
    const membership = await dynamoDb.send(new QueryCommand({
      TableName: process.env.ROOM_MEMBERS_TABLE,
      KeyConditionExpression: "userId = :uid",
      ExpressionAttributeValues: { ":uid": userId }
    }));

    const myRoomIds = membership.Items?.map(item => item.roomId) || [];

    if (myRoomIds.length === 0) {
      return { statusCode: 200, body: JSON.stringify({ items: [] }) };
    }

    // 2. 방 ID 목록으로 실제 방 상세 정보 일괄 조회
    const roomsResult = await dynamoDb.send(new BatchGetItemCommand({
      RequestItems: {
        [process.env.ROOMS_TABLE]: {
          Keys: myRoomIds.map(id => ({ roomId: id }))
        }
      }
    }));

    const rooms = roomsResult.Responses[process.env.ROOMS_TABLE] || [];
    
    // 최신순 정렬
    rooms.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({ items: myRooms }),
    };
  } catch (error) {
    console.error("getMyRooms Error:", error);
    return {
      statusCode: 500,
      headers: HEADERS,
      body: JSON.stringify({ message: "내 방 조회 실패", error: error.message }),
    };
  }
};