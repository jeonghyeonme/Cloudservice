const { GetCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { S3Client, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const dynamoDb = require("../dynamodbClient");
const { verifyAccessToken } = require("../utils");

const SERVERS_TABLE = process.env.SERVERS_TABLE;
const RESOURCES_BUCKET = process.env.RESOURCES_BUCKET;
const s3Client = new S3Client({ region: process.env.REGION });

exports.handler = async (event) => {
  try {
    const auth = verifyAccessToken(event.headers?.Authorization || event.headers?.authorization);
    if (auth.error) {
      return { statusCode: 401, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ message: auth.error }) };
    }

    const { serverId, fileId } = event.pathParameters || {};

    const getResult = await dynamoDb.send(new GetCommand({
      TableName: SERVERS_TABLE,
      Key: { serverId },
    }));

    const serverData = getResult.Item;
    const files = serverData?.files || [];
    const targetFile = files.find((f) => f.fileId === fileId);

    if (!targetFile) return { statusCode: 404, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ message: "파일 없음" }) };

    // 권한 체크
    if (targetFile.uploadedBy !== auth.userId && serverData.hostId !== auth.userId) {
      return { statusCode: 403, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ message: "권한 없음" }) };
    }

    // S3 실제 객체 삭제
    if (targetFile.s3ObjectKey) {
      await s3Client.send(new DeleteObjectCommand({
        Bucket: RESOURCES_BUCKET,
        Key: targetFile.s3ObjectKey,
      }));
    }

    const updatedFiles = files.filter((f) => f.fileId !== fileId);

    await dynamoDb.send(new UpdateCommand({
      TableName: SERVERS_TABLE,
      Key: { serverId },
      UpdateExpression: "SET #files = :updatedFiles",
      ExpressionAttributeNames: { "#files": "files" },
      ExpressionAttributeValues: { ":updatedFiles": updatedFiles },
    }));

    return { statusCode: 200, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ message: "삭제 완료" }) };
  } catch (error) {
    return { statusCode: 500, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ error: error.message }) };
  }
};