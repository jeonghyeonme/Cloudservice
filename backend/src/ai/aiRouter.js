const { TextractClient, StartDocumentTextDetectionCommand, GetDocumentTextDetectionCommand } = require("@aws-sdk/client-textract");
const { RekognitionClient, DetectLabelsCommand, DetectTextCommand } = require("@aws-sdk/client-rekognition");
const { TranslateClient, TranslateTextCommand } = require("@aws-sdk/client-translate");
const { BedrockRuntimeClient, InvokeModelCommand } = require("@aws-sdk/client-bedrock-runtime");

// [추가] DynamoDB, API Gateway WSS, UUID 모듈 임포트
const { PutCommand, QueryCommand } = require("@aws-sdk/lib-dynamodb");
const { ApiGatewayManagementApiClient, PostToConnectionCommand } = require("@aws-sdk/client-apigatewaymanagementapi");
const { v4: uuidv4 } = require("uuid");
const dynamoDb = require("../dynamodbClient"); // 작성해두신 공통 DB 클라이언트

const REGION = process.env.REGION || "us-east-1";
const RESOURCES_BUCKET = process.env.RESOURCES_BUCKET;

// [추가] DB 테이블명 및 웹소켓 엔드포인트 환경변수
const MESSAGES_TABLE = process.env.MESSAGES_TABLE;
const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE;
const WSS_ENDPOINT = process.env.WSS_ENDPOINT; // HTTP 핸들러이므로 환경변수로 주입받아야 합니다.

const textract    = new TextractClient({ region: REGION });
const rekognition = new RekognitionClient({ region: REGION });
const translate   = new TranslateClient({ region: REGION });
const bedrock     = new BedrockRuntimeClient({ region: REGION });

// Textract 결과 폴링 (비동기 작업 완료 대기)
async function waitForTextract(jobId) {
  let status = "IN_PROGRESS";
  let result;
  while (status === "IN_PROGRESS") {
    await new Promise(r => setTimeout(r, 3000));
    result = await textract.send(new GetDocumentTextDetectionCommand({ JobId: jobId }));
    status = result.JobStatus;
  }
  if (status !== "SUCCEEDED") {
    throw new Error(`Textract 작업 실패: ${status}`);
  }
  return result.Blocks
    .filter(b => b.BlockType === "LINE")
    .map(b => b.Text)
    .join("\n");
}

// Bedrock Claude로 요약 생성
async function summarizeWithBedrock(text) {
  const prompt = `다음 문서 내용을 한국어로 간결하게 요약해주세요. 핵심 포인트를 불렛으로 정리해주세요.\n\n${text.slice(0, 4000)}`;
  const response = await bedrock.send(new InvokeModelCommand({
    modelId: "anthropic.claude-3-haiku-20240307-v1:0",
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify({
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    }),
  }));
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  return responseBody.content[0].text;
}

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const { s3ObjectKey, fileType, serverId, fileName } = body;

    if (!s3ObjectKey || !fileType) {
      return {
        statusCode: 400,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ message: "s3ObjectKey, fileType은 필수입니다." }),
      };
    }

    let result = {};

    // ── 1. PDF/문서 → Textract + Bedrock 요약 ──
    if (fileType.includes("pdf") || fileType.includes("document")) {
      const textractResponse = await textract.send(new StartDocumentTextDetectionCommand({
        DocumentLocation: { S3Object: { Bucket: RESOURCES_BUCKET, Name: s3ObjectKey } },
      }));
      const extractedText = await waitForTextract(textractResponse.JobId);
      const summary = await summarizeWithBedrock(extractedText);

      result = {
        type: "document",
        status: "COMPLETE",
        fileName: fileName || s3ObjectKey.split("/").pop(),
        extractedText: extractedText.slice(0, 2000),
        summary,
      };
    }
    // ── 2. 이미지 → Rekognition + Translate ──
    else if (fileType.startsWith("image/")) {
      const labelsResponse = await rekognition.send(new DetectLabelsCommand({
        Image: { S3Object: { Bucket: RESOURCES_BUCKET, Name: s3ObjectKey } },
        MaxLabels: 10,
        MinConfidence: 70,
      }));
      const labels = labelsResponse.Labels.map(l => ({ name: l.Name, confidence: Math.round(l.Confidence) }));

      const textResponse = await rekognition.send(new DetectTextCommand({
        Image: { S3Object: { Bucket: RESOURCES_BUCKET, Name: s3ObjectKey } },
      }));
      const detectedTexts = textResponse.TextDetections.filter(t => t.Type === "LINE").map(t => t.DetectedText);

      const labelNames = labels.map(l => l.name).join(", ");
      let labelsKo = [];
      if (labelNames) {
        const translateResponse = await translate.send(new TranslateTextCommand({
          Text: labelNames, SourceLanguageCode: "en", TargetLanguageCode: "ko",
        }));
        labelsKo = translateResponse.TranslatedText.split(", ");
      }

      result = {
        type: "image",
        status: "COMPLETE",
        fileName: fileName || s3ObjectKey.split("/").pop(),
        labels, labelsKo, detectedTexts,
      };
    } else {
      result = {
        type: "unsupported",
        status: "SKIPPED",
        message: "지원하지 않는 파일 형식입니다. (PDF, 이미지만 분석 가능)",
      };
    }

    // ── [추가된 로직] DB에 메시지 저장 및 브로드캐스트 ──
    if (serverId && result.status === "COMPLETE") {
      const messageId = uuidv4();
      const createdAt = new Date().toISOString();

      // 프론트엔드 ChatWindow에 맞게 데이터 구조화
      const messageItem = {
        serverId,
        messageId,
        senderId: "system-ai",         // 고정된 AI ID
        senderNickname: "AI 스터디 조교", // 대화창에 표시될 이름
        messageType: "ai-summary",     // 프론트엔드 CSS 트리거용 타입
        content: JSON.stringify(result), // 결과 객체를 문자열로 담음 (프론트에서 JSON.parse)
        createdAt,
      };

      // 1. Messages 테이블에 저장
      await dynamoDb.send(new PutCommand({
        TableName: MESSAGES_TABLE,
        Item: messageItem,
      }));

      // 2. 같은 방(serverId) 접속자에게 실시간 브로드캐스트
      if (WSS_ENDPOINT) {
        const apigw = new ApiGatewayManagementApiClient({ endpoint: WSS_ENDPOINT });
        
        const response = await dynamoDb.send(new QueryCommand({
          TableName: CONNECTIONS_TABLE,
          IndexName: "serverId-index",
          KeyConditionExpression: "serverId = :serverId",
          ExpressionAttributeValues: { ":serverId": serverId },
        }));

        const connections = response.Items || [];

        await Promise.all(
          connections.map(async (conn) => {
            try {
              await apigw.send(new PostToConnectionCommand({
                ConnectionId: conn.connectionId,
                Data: Buffer.from(JSON.stringify({
                  action: "receiveMessage",
                  data: messageItem
                })),
              }));
            } catch (err) {
              console.log(`Failed to send AI summary to connection: ${conn.connectionId}`);
              // 연결이 끊겼거나 문제가 생긴 커넥션은 무시 (chatHandler와 동일 로직)
            }
          })
        );
      } else {
        console.warn("WSS_ENDPOINT가 설정되지 않아 브로드캐스트를 생략합니다.");
      }
    }

    // HTTP 응답 (REST를 호출한 클라이언트에게 완료되었음을 알림)
    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        message: "AI 분석 완료 및 채팅방 전송 성공",
        serverId: serverId || null,
        s3ObjectKey,
      }),
    };
  } catch (error) {
    console.error("AI Router Error:", error);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "AI 분석 실패", error: error.message }),
    };
  }
};