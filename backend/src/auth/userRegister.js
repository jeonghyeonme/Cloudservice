const { HEADERS } = require("../utils/response");
const { PutCommand, QueryCommand } = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");

const dynamoDb = require("../dynamodbClient");
const {
  hashPassword,
  createAccessToken,
  createRefreshToken,
  saveRefreshToken,
} = require("../utils");

const USERS_TABLE = process.env.USERS_TABLE;

// =========================
// 회원가입
// =========================
module.exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const { email, password, nickname, profileImageUrl } = body;

    // 필수값 검증
    if (!email || !password || !nickname) {
      return {
        statusCode: 422,
        headers: HEADERS,
        body: JSON.stringify({ detail: "필수요소를 입력해주세요." }),
      };
    }

    // 이메일 형식 검증
    if (!email.includes("@")) {
      return {
        statusCode: 422,
        headers: HEADERS,
        body: JSON.stringify({ detail: "값에 이상이 있습니다." }),
      };
    }

    // ✅ 이메일 중복 체크 (GSI email-index로 Query)
    const existing = await dynamoDb.send(new QueryCommand({
      TableName: USERS_TABLE,
      IndexName: "email-index",
      KeyConditionExpression: "email = :email",
      ExpressionAttributeValues: { ":email": email },
      Limit: 1,
    }));

    if (existing.Items && existing.Items.length > 0) {
      return {
        statusCode: 409,
        headers: HEADERS,
        body: JSON.stringify({ detail: "이미 가입된 이메일입니다." }),
      };
    }

    const userId    = uuidv4();
    const createdAt = new Date().toISOString();

    const item = {
      userId,
      email,
      password:        await hashPassword(password),
      nickname,
      profileImageUrl: profileImageUrl || null,
      status:          "ACTIVE",
      createdAt,
    };

    await dynamoDb.send(new PutCommand({
      TableName: USERS_TABLE,
      Item:      item,
    }));

    const accessToken  = createAccessToken({ sub: userId });
    const refreshToken = createRefreshToken({ sub: userId });

    await saveRefreshToken(userId, refreshToken);

    return {
      statusCode: 200,
      headers:    HEADERS,
      body: JSON.stringify({
        result:        "success",
        access_token:  accessToken,
        refresh_token: refreshToken,
      }),
    };

  } catch (error) {
    console.error("userRegister Error:", error);
    return {
      statusCode: 500,
      headers:    HEADERS,
      body: JSON.stringify({ detail: "서버 오류가 발생했습니다.", error: error.message }),
    };
  }
};