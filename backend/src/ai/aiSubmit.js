const { SQSClient, SendMessageCommand } = require("@aws-sdk/client-sqs");
const { HEADERS } = require("../utils/response");

const REGION = process.env.REGION || "us-east-1";
const AI_QUEUE_URL = process.env.AI_QUEUE_URL;

const sqs = new SQSClient({ region: REGION });

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const { s3ObjectKey, fileType, serverId, fileName, requestId } = body;

    // 필수 파라미터 검증
    if (!s3ObjectKey || !fileType) {
      return {
        statusCode: 400,
        headers: HEADERS,
        body: JSON.stringify({ message: "s3ObjectKey, fileType은 필수입니다." }),
      };
    }

    if (!AI_QUEUE_URL) {
      console.error("AI_QUEUE_URL 환경변수가 설정되지 않았습니다.");
      return {
        statusCode: 500,
        headers: HEADERS,
        body: JSON.stringify({ message: "서버 설정 오류" }),
      };
    }

    // SQS에 작업 enqueue
    await sqs.send(new SendMessageCommand({
      QueueUrl: AI_QUEUE_URL,
      MessageBody: JSON.stringify({
        s3ObjectKey,
        fileType,
        serverId,
        fileName,
        requestId,
        submittedAt: new Date().toISOString(),
      }),
    }));

    // 즉시 202 Accepted 응답
    return {
      statusCode: 202,
      headers: HEADERS,
      body: JSON.stringify({
        message: "AI 분석 요청이 접수되었습니다. 완료되면 채팅창에 자동으로 결과가 표시됩니다.",
        requestId,
      }),
    };
  } catch (error) {
    console.error("aiSubmit 오류:", error);
    return {
      statusCode: 500,
      headers: HEADERS,
      body: JSON.stringify({
        message: "AI 분석 요청 처리 중 오류가 발생했습니다.",
        error: error.message,
      }),
    };
  }
};