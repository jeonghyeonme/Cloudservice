const { UpdateCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");
const { S3Client, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { v4: uuidv4 } = require("uuid");
const dynamoDb = require("../dynamodbClient");
const { verifyAccessToken } = require("../utils");

const SERVERS_TABLE = process.env.SERVERS_TABLE;
const RESOURCES_BUCKET = process.env.RESOURCES_BUCKET;
const s3Client = new S3Client({ region: process.env.REGION || "us-east-1" });

exports.handler = async (event) => {
  try {
    const auth = verifyAccessToken(event.headers?.Authorization || event.headers?.authorization);
    if (auth.error) {
      return { statusCode: 401, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ message: auth.error }) };
    }

    const { serverId } = event.pathParameters || {};
    const body = JSON.parse(event.body || "{}");

    // ──────────────────────────────────────────
    // 🚧 삭제 요청인 경우
    // ──────────────────────────────────────────
    if (body.action === "delete") {
      const { fileId } = body;
      const getResult = await dynamoDb.send(new GetCommand({ TableName: SERVERS_TABLE, Key: { serverId } }));
      const serverData = getResult.Item;
      if (!serverData) return { statusCode: 404, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ message: "서버 없음" }) };

      const files = serverData.files || [];
      const targetFile = files.find(f => f.fileId === fileId);
      if (!targetFile) return { statusCode: 404, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ message: "파일 없음" }) };

      if (targetFile.uploadedBy !== auth.userId && serverData.hostId !== auth.userId) {
        return { statusCode: 403, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ message: "권한 없음" }) };
      }

      if (targetFile.s3ObjectKey) {
        try {
          await s3Client.send(new DeleteObjectCommand({ Bucket: RESOURCES_BUCKET, Key: targetFile.s3ObjectKey }));
        } catch (e) { console.warn("S3 파일 삭제 실패:", e); }
      }

      const updatedFiles = files.filter(f => f.fileId !== fileId);
      await dynamoDb.send(new UpdateCommand({
        TableName: SERVERS_TABLE, Key: { serverId },
        UpdateExpression: "SET #files = :updatedFiles",
        ExpressionAttributeNames: { "#files": "files" },
        ExpressionAttributeValues: { ":updatedFiles": updatedFiles }
      }));
      return { statusCode: 200, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ message: "파일 삭제 완료" }) };
    }

    // ──────────────────────────────────────────
    // 💾 파일 저장 요청인 경우
    // ──────────────────────────────────────────
    const { fileName, fileUrl, fileType, s3ObjectKey } = body;
    if (!serverId || !fileName || !fileUrl) {
      return { statusCode: 400, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ message: "필수값 누락" }) };
    }

    const fileItem = {
      fileId: uuidv4(), fileName, fileUrl, fileType: fileType || "unknown", s3ObjectKey: s3ObjectKey || "",
      uploadedBy: auth.userId, uploadedAt: new Date().toISOString(),
    };

    await dynamoDb.send(new UpdateCommand({
      TableName: SERVERS_TABLE, Key: { serverId },
      UpdateExpression: "SET #files = list_append(if_not_exists(#files, :empty), :newFile)",
      ExpressionAttributeNames: { "#files": "files" },
      ExpressionAttributeValues: { ":newFile": [fileItem], ":empty": [] },
    }));

    return { statusCode: 200, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ message: "저장 완료", file: fileItem }) };

  } catch (error) {
    return { statusCode: 500, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ error: error.message }) };
  }
};