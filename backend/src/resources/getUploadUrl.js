const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { v4: uuidv4 } = require("uuid");

const s3Client = new S3Client({ region: process.env.AWS_REGION || "us-east-1" });

// ── 허용 파일 타입 정의 ──────────────────────────────────
const ALLOWED_TYPES = {
  // 이미지
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'image/bmp': 'bmp',
  'image/tiff': 'tiff',
  // 문서
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'application/vnd.hancom.hwp': 'hwp',
  'application/haansofthwp': 'hwp',
  'application/x-hwp': 'hwp',
  // 텍스트/코드
  'text/plain': 'txt',
  'text/csv': 'csv',
  'text/html': 'html',
  'text/markdown': 'md',
  'application/json': 'json',
  'application/xml': 'xml',
  'text/xml': 'xml',
  // 압축
  'application/zip': 'zip',
  'application/x-zip-compressed': 'zip',
  'application/gzip': 'gz',
  'application/x-tar': 'tar',
  'application/x-7z-compressed': '7z',
  'application/x-rar-compressed': 'rar',
  // 기타
  'application/octet-stream': '*',
};

const ALLOWED_EXTENSIONS = [
  // 이미지
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff', 'ico',
  // 문서
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'hwp', 'hwpx',
  // 텍스트/코드
  'txt', 'csv', 'html', 'css', 'js', 'ts', 'jsx', 'tsx', 'md',
  'json', 'xml', 'yml', 'yaml', 'py', 'java', 'c', 'cpp', 'h',
  'sql', 'sh', 'bat', 'log', 'ini', 'cfg', 'env',
  // 압축
  'zip', 'gz', 'tar', '7z', 'rar',
];

const MAX_FILE_SIZE_MB = 10;

exports.handler = async (event) => {
  try {
    const { fileName, fileType } = event.queryStringParameters || {};

    if (!fileName || !fileType) {
      return {
        statusCode: 400,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ message: "fileName과 fileType 파라미터가 필요합니다." }),
      };
    }

    // ── 파일 확장자 검증 ──────────────────────────────
    const fileExtension = fileName.split('.').pop().toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
      return {
        statusCode: 400,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({
          message: `허용되지 않는 파일 확장자입니다: .${fileExtension}`,
          allowedExtensions: ALLOWED_EXTENSIONS,
        }),
      };
    }

    // ── 파일 MIME 타입 검증 ──────────────────────────
    if (!ALLOWED_TYPES[fileType]) {
      return {
        statusCode: 400,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({
          message: `허용되지 않는 파일 타입입니다: ${fileType}`,
        }),
      };
    }

    const uniqueId = uuidv4();
    const s3ObjectKey = `uploads/${uniqueId}.${fileExtension}`;
    const bucketName = process.env.RESOURCES_BUCKET;

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: s3ObjectKey,
      ContentType: fileType,
      ContentLength: MAX_FILE_SIZE_MB * 1024 * 1024,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });
    const fileUrl = `https://${bucketName}.s3.${process.env.AWS_REGION || "us-east-1"}.amazonaws.com/${s3ObjectKey}`;

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify({
        message: "업로드 URL 발급 성공",
        uploadUrl,
        fileUrl,
        s3ObjectKey,
      }),
    };
  } catch (error) {
    console.error("S3 URL 발급 에러:", error);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "URL 발급 실패", error: error.message }),
    };
  }
};