const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { v4: uuidv4 } = require("uuid");

// S3 클라이언트 초기화 (Lambda 실행 역할의 권한을 자동 사용함)
const s3Client = new S3Client({ region: process.env.AWS_REGION || "us-east-1" });

exports.handler = async (event) => {
  try {
    // 프론트엔드에서 쿼리스트링으로 파일명과 타입(MIME)을 전달받음
    const { fileName, fileType } = event.queryStringParameters || {};

    if (!fileName || !fileType) {
      return {
        statusCode: 400,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ message: "fileName과 fileType 파라미터가 필요합니다." }),
      };
    }

    // 파일 이름 중복 방지를 위해 고유한 S3 객체 키(경로) 생성
    // 예: uploads/123e4567-e89b-12d3.../my_photo.png
    const fileExtension = fileName.split('.').pop();
    const uniqueId = uuidv4();
    const s3ObjectKey = `uploads/${uniqueId}.${fileExtension}`;

    // S3 버킷 이름 (환경 변수로 관리)
    const bucketName = process.env.RESOURCES_BUCKET; 

    // 업로드 커맨드 생성
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: s3ObjectKey,
      ContentType: fileType, // 프론트엔드에서 올리는 파일의 타입과 반드시 일치해야 함
    });

    // 만료 시간이 5분(300초)인 임시 업로드 URL 생성
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

    // 프론트엔드에서 나중에 접근할 때 사용할 실제 파일의 퍼블릭 URL
    const fileUrl = `https://${bucketName}.s3.${process.env.AWS_REGION || "us-east-1"}.amazonaws.com/${s3ObjectKey}`;

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify({
        message: "업로드 URL 발급 성공",
        uploadUrl: uploadUrl, // 프론트엔드가 파일 PUT 요청을 보낼 주소
        fileUrl: fileUrl,     // DB에 저장하고 채팅창에 보여줄 파일 주소
        s3ObjectKey: s3ObjectKey
      }),
    };
  } catch (error) {
    console.error("S3 URL 발급 에러:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "URL 발급 실패", error: error.message }),
    };
  }
};