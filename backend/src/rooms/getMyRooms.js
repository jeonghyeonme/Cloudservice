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

    // 1. 내가 가입한 방의 ID 목록만 쿼리 (Index 활용으로 매우 빠름)
    const membership = await dynamoDb.send(new QueryCommand({
      TableName: process.env.ROOM_MEMBERS_TABLE,
      KeyConditionExpression: "userId = :uid",
      ExpressionAttributeValues: { ":uid": userId }
    }));

    const myRoomIds = membership.Items?.map(item => item.roomId) || [];

    // 가입한 방이 없을 경우 (빈 배열 반환 시에도 CORS 헤더 필수)
    if (myRoomIds.length === 0) {
      return { 
        statusCode: 200, 
        headers: HEADERS, 
        body: JSON.stringify({ items: [] }) 
      };
    }

    // 2. 방 ID 목록으로 실제 방 상세 정보 일괄 조회
    const uniqueRoomIds = [...new Set(myRoomIds)]; // 중복 ID 안전하게 제거
    const roomsResult = await dynamoDb.send(new BatchGetCommand({
      RequestItems: {
        [process.env.ROOMS_TABLE]: {
          Keys: uniqueRoomIds.map(id => ({ roomId: id }))
        }
      }
    }));

    // 데이터를 담는 변수명은 'rooms'
    const rooms = roomsResult.Responses[process.env.ROOMS_TABLE] || [];
    
    // 최신순 정렬
    rooms.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    return {
      statusCode: 200,
      headers: HEADERS,
      // [수정 완료] myRooms가 아닌 rooms를 반환하도록 수정! ✅
      body: JSON.stringify({ items: rooms }), 
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