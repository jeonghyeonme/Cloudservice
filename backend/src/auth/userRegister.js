const { HEADERS } = require("../utils/response");
const { PutCommand } = require("@aws-sdk/lib-dynamodb");
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
    // event.body = API Gateway가 전달하는 요청 Body (문자열)
    // Python: user: User (Pydantic이 자동 파싱) → 여기선 직접 JSON.parse
    const body = JSON.parse(event.body || "{}");
    const { email, password, nickname, profileImageUrl } = body;

    // 필수값 검증 (Python: if not (user.email and user.password and user.nickname))
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

    const userId    = uuidv4();                  // 유저 고유 ID 생성
    const createdAt = new Date().toISOString();  // Python: datetime.utcnow().isoformat()

    const item = {
      userId,
      email,
      password:        await hashPassword(password),  // bcrypt 해시 (비가역)
      nickname,
      profileImageUrl: profileImageUrl || null,
      status:          "ACTIVE", // GSI 키로 사용 (bool 대신 String)
      createdAt,
    };

    // DynamoDB에 유저 저장 (Python: table.put_item(Item=item))
    await dynamoDb.send(new PutCommand({
      TableName: USERS_TABLE,
      Item:      item,
    }));

    // 토큰 발급 및 RefreshTokens 테이블에 저장
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
