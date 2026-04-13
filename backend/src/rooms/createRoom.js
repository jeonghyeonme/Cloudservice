const { PutCommand } = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");
const dynamoDb = require("../dynamodbClient");

module.exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const roomId = uuidv4();
    const createdAt = new Date().toISOString();

    const params = {
      TableName: process.env.ROOMS_TABLE,
      Item: {
        roomId,
        status: "ACTIVE",
        createdAt,
        roomName: body.roomName || "기본 스터디룸",
        description: body.description || "",
        hostId: body.hostId || null,
        maxCapacity: body.maxCapacity || 10,
        currentCount: 0,
      },
    };

    await dynamoDb.send(new PutCommand(params));

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: "방 생성 성공",
        roomId: roomId
      }),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "방 생성 실패", error: error.message }),
    };
  }
};