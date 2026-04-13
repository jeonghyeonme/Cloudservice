const { GetCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const dynamoDb = require("../dynamodbClient");

exports.handler = async (event) => {
  try {
    const roomId = event.pathParameters.roomId;
    const chId = event.pathParameters.chId;

    // 1. 현재 Room 데이터 조회
    const getParams = {
      TableName: process.env.ROOMS_TABLE,
      Key: { roomId: roomId },
    };
    const roomData = await dynamoDb.send(new GetCommand(getParams));

    if (!roomData.Item || !roomData.Item.channels) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "방 또는 채널 정보를 찾을 수 없습니다." }),
      };
    }

    // 2. 삭제하려는 채널(chId)을 제외한 새로운 배열 생성
    const currentChannels = roomData.Item.channels;
    const updatedChannels = currentChannels.filter((ch) => ch.chId !== chId);

    // 3. 업데이트된 배열로 기존 channels 덮어쓰기
    const updateParams = {
      TableName: process.env.ROOMS_TABLE,
      Key: { roomId: roomId },
      UpdateExpression: "SET channels = :updatedChannels",
      ExpressionAttributeValues: {
        ":updatedChannels": updatedChannels,
      },
    };

    await dynamoDb.send(new UpdateCommand(updateParams));

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify({ message: "채널 삭제 성공" }),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "채널 삭제 실패", error: error.message }),
    };
  }
};