const { GetCommand, DeleteCommand } = require("@aws-sdk/lib-dynamodb");
const dynamoDb = require("../dynamodbClient");
const { verifyAccessToken } = require("../utils");

exports.handler = async (event) => {
  try {
    const { serverId } = event.pathParameters || {};
    const authHeader =
      event.headers?.Authorization || event.headers?.authorization || "";
    const { userId, error } = verifyAccessToken(authHeader);

    if (error || !userId) {
      return {
        statusCode: 401,
        headers: { 
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Credentials": true,
          "Content-Type": "application/json" 
        },
        body: JSON.stringify({ message: "인증이 필요합니다." }),
      };
    }

    const serverResult = await dynamoDb.send(new GetCommand({
      TableName: process.env.SERVERS_TABLE,
      Key: { serverId },
    }));

    if (!serverResult.Item) {
      return {
        statusCode: 404,
        headers: { 
          "Access-Control-Allow-Origin": "*", 
          "Content-Type": "application/json" 
        },
        body: JSON.stringify({ message: "해당 서버를 찾을 수 없습니다." }),
      };
    }

    if (serverResult.Item.hostId !== userId) {
      return {
        statusCode: 403,
        headers: {
          "Access-Control-Allow-Origin": "*", 
          "Content-Type": "application/json" 
        },
        body: JSON.stringify({ message: "서버 삭제는 호스트만 가능합니다." }),
      };
    }

    await dynamoDb.send(new DeleteCommand({
      TableName: process.env.SERVERS_TABLE,
      Key: { serverId },
    }));

    // ServerMembers 테이블에서 해당 서버의 모든 멤버 데이터 삭제
    try {
      const members = await dynamoDb.send(new QueryCommand({
        TableName: process.env.SERVER_MEMBERS_TABLE,
        IndexName: "serverId-index", // serverId로 검색 가능한 인덱스가 있다고 가정
        KeyConditionExpression: "serverId = :sid",
        ExpressionAttributeValues: { ":sid": serverId },
      }));

      if (members.Items && members.Items.length > 0) {
        // 배치 삭제 처리
        const deleteRequests = members.Items.map(member => ({
          DeleteRequest: { Key: { userId: member.userId, serverId: member.serverId } }
        }));
        
        await dynamoDb.send(new BatchWriteCommand({
          RequestItems: { [process.env.SERVER_MEMBERS_TABLE]: deleteRequests }
        }));
      }
    } catch (memberErr) {
      console.warn("멤버 데이터 삭제 중 경고 (무시 가능):", memberErr);
    }

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
      body: JSON.stringify({ message: "서버 삭제 성공", serverId }),
    };
  } catch (error) {
    console.error("deleteServer Error:", error);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
      body: JSON.stringify({ message: "서버 삭제 실패", error: error.message }),
    };
  }
};
