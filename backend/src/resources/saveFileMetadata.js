const { UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");
const dynamoDb = require("../dynamodbClient");
const { verifyAccessToken } = require("../utils");

const ROOMS_TABLE = process.env.ROOMS_TABLE;

exports.handler = async (event) => {
  try {
    // 인증 확인
    const auth = verifyAccessToken(event.headers?.Authorization || event.headers?.authorization);
    if (auth.error) {
      return {
        statusCode: 401,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ message: auth.error }),
      };
    }

    const { roomId } = event.pathParameters || {};
    const body = JSON.parse(event.body || "{}");
    const { fileName, fileUrl, fileType, s3ObjectKey } = body;

    if (!roomId || !fileName || !fileUrl) {
      return {
        statusCode: 400,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ message: "roomId, fileName, fileUrl은 필수입니다." }),
      };
    }

    const fileItem = {
      fileId: uuidv4(),
      fileName,
      fileUrl,
      fileType: fileType || "unknown",
      s3ObjectKey: s3ObjectKey || "",
      uploadedBy: auth.userId,
      uploadedAt: new Date().toISOString(),
    };

    // Rooms 테이블의 files 배열에 추가
    await dynamoDb.send(new UpdateCommand({
      TableName: ROOMS_TABLE,
      Key: { roomId },
      UpdateExpression: "SET #files = list_append(if_not_exists(#files, :empty), :newFile)",
      ExpressionAttributeNames: { "#files": "files" },
      ExpressionAttributeValues: {
        ":newFile": [fileItem],
        ":empty": [],
      },
    }));

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "파일 메타데이터 저장 완료", file: fileItem }),
    };
  } catch (error) {
    console.error("saveFileMetadata Error:", error);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "파일 정보 저장 실패", error: error.message }),
    };
  }
};
