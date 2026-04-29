const { GetCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const dynamoDb = require("../dynamodbClient");
const { verifyAccessToken } = require("../utils");

exports.handler = async (event) => {
  try {
    const { serverId } = event.pathParameters || {};
    const authHeader = event.headers?.Authorization || event.headers?.authorization || "";
    const { userId } = verifyAccessToken(authHeader);

    if (!userId) {
      return {
        statusCode: 401,
        headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
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
        headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
        body: JSON.stringify({ message: "해당 서버를 찾을 수 없습니다." }),
      };
    }

    if (serverResult.Item.hostId !== userId) {
      return {
        statusCode: 403,
        headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
        body: JSON.stringify({ message: "방장만 서버 설정을 수정할 수 있습니다." }),
      };
    }

    const body = JSON.parse(event.body || "{}");
    const updateExpressions = [];
    const expressionValues = {};
    const expressionNames = {};

    if (body.serverName !== undefined) {
      updateExpressions.push("#sn = :sn");
      expressionNames["#sn"] = "serverName";
      expressionValues[":sn"] = body.serverName;
    }
    if (body.description !== undefined) {
      updateExpressions.push("#desc = :desc");
      expressionNames["#desc"] = "description";
      expressionValues[":desc"] = body.description;
    }
    if (body.maxCapacity !== undefined) {
      updateExpressions.push("maxCapacity = :mc");
      expressionValues[":mc"] = body.maxCapacity;
    }
    if (body.isPrivate !== undefined) {
      updateExpressions.push("isPrivate = :ip");
      expressionValues[":ip"] = body.isPrivate;
    }
    if (body.password !== undefined) {
      updateExpressions.push("#pw = :pw");
      expressionNames["#pw"] = "password";
      expressionValues[":pw"] = body.password || null;
    }

    if (updateExpressions.length === 0) {
      return {
        statusCode: 400,
        headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
        body: JSON.stringify({ message: "수정할 항목이 없습니다." }),
      };
    }

    await dynamoDb.send(new UpdateCommand({
      TableName: process.env.SERVERS_TABLE,
      Key: { serverId },
      UpdateExpression: "SET " + updateExpressions.join(", "),
      ExpressionAttributeValues: expressionValues,
      ...(Object.keys(expressionNames).length > 0 && { ExpressionAttributeNames: expressionNames }),
      ReturnValues: "ALL_NEW",
    }));

    const updated = await dynamoDb.send(new GetCommand({
      TableName: process.env.SERVERS_TABLE,
      Key: { serverId },
    }));

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
      body: JSON.stringify({ message: "서버 설정 수정 완료", room: updated.Item }),
    };
  } catch (error) {
    console.error("updateServer Error:", error);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
      body: JSON.stringify({ message: "서버 설정 수정 실패", error: error.message }),
    };
  }
};