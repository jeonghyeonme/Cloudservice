const { DeleteCommand } = require("@aws-sdk/lib-dynamodb");
const dynamoDb = require("../dynamodbClient");

exports.handler = async (event) => {
  const { roomId } = event.pathParameters;
  // hostId 검증 로직 추가 필요 (Authorization 헤더에서 userId 추출)
  
  await dynamoDb.send(new DeleteCommand({
    TableName: process.env.ROOMS_TABLE,
    Key: { roomId },
  }));

  return {
    statusCode: 200,
    headers: { "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify({ message: "방 삭제 성공" }),
  };
};