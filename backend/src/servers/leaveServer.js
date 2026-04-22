const { DeleteCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const dynamoDb = require("../dynamodbClient");
const { verifyAccessToken } = require("../utils");

exports.handler = async (event) => {
  try {
    const { serverId } = event.pathParameters;
    const { userId } = verifyAccessToken(event.headers?.Authorization);

    // 멤버 테이블에서 내 데이터 삭제
    await dynamoDb.send(new DeleteCommand({
      TableName: process.env.SERVER_MEMBERS_TABLE,
      Key: { userId, serverId },
    }));

    // 서버 테이블의 현재 인원수(currentCount) -1 감소
    await dynamoDb.send(new UpdateCommand({
      TableName: process.env.SERVERS_TABLE,
      Key: { serverId },
      UpdateExpression: "SET currentCount = currentCount - :val",
      ExpressionAttributeValues: { ":val": 1 },
    }));

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Credentials": true },
      body: JSON.stringify({ message: "서버에서 나갔습니다." }),
    };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};