const { GetCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const dynamoDb = require("../dynamodbClient");
const { verifyAccessToken } = require("../utils");

const SERVERS_TABLE = process.env.SERVERS_TABLE;

exports.handler = async (event) => {
  try {
    const auth = verifyAccessToken(event.headers?.Authorization || event.headers?.authorization);
    if (auth.error) {
      return { statusCode: 401, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ message: auth.error }) };
    }

    const { serverId, linkId } = event.pathParameters || {};

    const getResult = await dynamoDb.send(new GetCommand({
      TableName: SERVERS_TABLE,
      Key: { serverId },
    }));

    const serverData = getResult.Item;
    if (!serverData) return { statusCode: 404, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ message: "서버 없음" }) };

    const links = serverData.links || [];
    const targetLink = links.find((l) => l.linkId === linkId);
    if (!targetLink) return { statusCode: 404, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ message: "링크 없음" }) };

    // 권한: 작성자 또는 방장만 삭제 가능
    if (targetLink.sharedBy !== auth.userId && serverData.hostId !== auth.userId) {
      return { statusCode: 403, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ message: "권한 없음" }) };
    }

    const updatedLinks = links.filter((l) => l.linkId !== linkId);

    await dynamoDb.send(new UpdateCommand({
      TableName: SERVERS_TABLE,
      Key: { serverId },
      UpdateExpression: "SET #links = :updatedLinks",
      ExpressionAttributeNames: { "#links": "links" },
      ExpressionAttributeValues: { ":updatedLinks": updatedLinks },
    }));

    return { statusCode: 200, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ message: "삭제 완료" }) };
  } catch (error) {
    return { statusCode: 500, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ error: error.message }) };
  }
};