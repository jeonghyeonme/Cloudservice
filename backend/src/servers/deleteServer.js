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

    if (serverResult.Item.hostId !== userId) {
      return {
        statusCode: 403,
        headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
        body: JSON.stringify({ message: "방장만 삭제할 수 있습니다." }),
      };
    }

    await dynamoDb.send(new DeleteCommand({
      TableName: process.env.SERVERS_TABLE,
      Key: { serverId },
    }));

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
