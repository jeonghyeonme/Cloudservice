const { TextractClient, StartDocumentTextDetectionCommand, GetDocumentTextDetectionCommand } = require("@aws-sdk/client-textract");
const { RekognitionClient, DetectLabelsCommand, DetectTextCommand } = require("@aws-sdk/client-rekognition");
const { TranslateClient, TranslateTextCommand } = require("@aws-sdk/client-translate");
const { BedrockRuntimeClient, InvokeModelCommand } = require("@aws-sdk/client-bedrock-runtime");

const REGION = process.env.REGION || "us-east-1";
const RESOURCES_BUCKET = process.env.RESOURCES_BUCKET;

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

  // 추출된 텍스트 합치기
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
    const { s3ObjectKey, fileType, roomId } = body;

    if (!s3ObjectKey || !fileType) {
      return {
        statusCode: 400,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ message: "s3ObjectKey, fileType은 필수입니다." }),
      };
    }

    let result = {};

    // ── PDF/문서 → Textract 텍스트 추출 + Bedrock 요약 ──
    if (fileType.includes("pdf") || fileType.includes("document")) {
      const textractResponse = await textract.send(new StartDocumentTextDetectionCommand({
        DocumentLocation: {
          S3Object: { Bucket: RESOURCES_BUCKET, Name: s3ObjectKey },
        },
      }));

      const extractedText = await waitForTextract(textractResponse.JobId);
      const summary = await summarizeWithBedrock(extractedText);

      result = {
        type: "document",
        status: "COMPLETE",
        extractedText: extractedText.slice(0, 2000),
        summary,
      };
    }
    // ── 이미지 → Rekognition 라벨 + Translate 번역 ──
    else if (fileType.startsWith("image/")) {
      const labelsResponse = await rekognition.send(new DetectLabelsCommand({
        Image: { S3Object: { Bucket: RESOURCES_BUCKET, Name: s3ObjectKey } },
        MaxLabels: 10,
        MinConfidence: 70,
      }));

      const labels = labelsResponse.Labels.map(l => ({
        name: l.Name,
        confidence: Math.round(l.Confidence),
      }));

      // 이미지 내 텍스트 감지
      const textResponse = await rekognition.send(new DetectTextCommand({
        Image: { S3Object: { Bucket: RESOURCES_BUCKET, Name: s3ObjectKey } },
      }));

      const detectedTexts = textResponse.TextDetections
        .filter(t => t.Type === "LINE")
        .map(t => t.DetectedText);

      // 영어 라벨 → 한국어 번역
      const labelNames = labels.map(l => l.name).join(", ");
      let labelsKo = [];
      if (labelNames) {
        const translateResponse = await translate.send(new TranslateTextCommand({
          Text: labelNames,
          SourceLanguageCode: "en",
          TargetLanguageCode: "ko",
        }));
        labelsKo = translateResponse.TranslatedText.split(", ");
      }

      result = {
        type: "image",
        status: "COMPLETE",
        labels,
        labelsKo,
        detectedTexts,
      };
    }
    // ── 미지원 파일 ──
    else {
      result = {
        type: "unsupported",
        status: "SKIPPED",
        message: "지원하지 않는 파일 형식입니다. (PDF, 이미지만 분석 가능)",
      };
    }

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        message: "AI 분석 완료",
        roomId: roomId || null,
        s3ObjectKey,
        result,
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
