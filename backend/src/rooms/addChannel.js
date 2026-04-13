const { UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");
const dynamoDb = require("../dynamodbClient");

exports.handler = async (event) => {
  try {
    const roomId = event.pathParameters.roomId;
    const body = JSON.parse(event.body || "{}");
    
    // 채널 이름이 안 들어왔을 경우의 기본값 처리
    const channelName = body.name || "새로운 채널";

    const newChannel = {
      chId: uuidv4(),
      name: channelName,
      type: "TEXT", // 추후 VOICE 채널 등 확장을 위한 필드
      createdAt: new Date().toISOString(),
    };

    // DynamoDB List에 원소 추가 (channels 필드가 없으면 빈 배열 []로 초기화 후 추가)
    const params = {
      TableName: process.env.ROOMS_TABLE,
      Key: { roomId: roomId },
      UpdateExpression: "SET channels = list_append(if_not_exists(channels, :emptyList), :newChannel)",
      ExpressionAttributeValues: {
        ":emptyList": [],
        ":newChannel": [newChannel],
      },
      ReturnValues: "ALL_NEW", // 업데이트 후의 최신 데이터 반환
    };

    const result = await dynamoDb.send(new UpdateCommand(params));

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify({
        message: "채널 생성 성공",
        channel: newChannel,
      }),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "채널 생성 실패", error: error.message }),
    };
  }
};