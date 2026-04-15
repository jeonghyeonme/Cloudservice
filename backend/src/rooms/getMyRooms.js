const { ScanCommand } = require("@aws-sdk/lib-dynamodb");
const dynamoDb = require("../dynamodbClient");
const { verifyAccessToken } = require("../utils");

// 내 유저 정보 기반으로 소속된 스터디룸 조회 핸들러
exports.handler = async (event) => {
  try {
    const authHeader =
      event.headers?.Authorization || event.headers?.authorization || "";
    const { userId } = verifyAccessToken(authHeader);

    if (!userId) {
      return {
        statusCode: 401,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Credentials": true,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: "인증이 필요합니다." }),
      };
    }

    const result = await dynamoDb.send(
      new ScanCommand({
        TableName: process.env.ROOMS_TABLE,
      }),
    );

    const items = result.Items || [];
    const myRooms = items.filter((room) => {
      if (room.hostId === userId) {
        return true;
      }

      if (!Array.isArray(room.members)) {
        return false;
      }

      return room.members.some((member) => member?.userId === userId);
    });

    myRooms.sort((a, b) => {
      const aDate = new Date(a.createdAt || 0).getTime();
      const bDate = new Date(b.createdAt || 0).getTime();
      return bDate - aDate;
    });

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ items: myRooms }),
    };
  } catch (error) {
    console.error("getMyRooms Error:", error);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "내 스터디룸 조회 실패",
        error: error.message,
      }),
    };
  }
};
