const { QueryCommand } = require("@aws-sdk/lib-dynamodb");

const dynamoDb = require("../dynamodbClient");
const {
  checkPassword,
  createAccessToken,
  createRefreshToken,
  saveRefreshToken,
} = require("../utils");

const USERS_TABLE = "Users";

const HEADERS = {
  "Access-Control-Allow-Origin":      "*",
  "Access-Control-Allow-Credentials": true,
};

// =========================
// 로그인
// =========================
module.exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const { email, password } = body;

    // 필수값 검증
    if (!email || !password) {
      return {
        statusCode: 422,
        headers: HEADERS,
        body: JSON.stringify({ detail: "필수요소를 입력해주세요." }),
      };
    }

    // email-index GSI로 이메일 조회
    // Python: table.query(IndexName='email-index', KeyConditionExpression=Key('email').eq(user.email))
    // Scan 대신 Query + GSI를 써야 효율적 (전체 테이블 탐색 방지)
    const response = await dynamoDb.send(new QueryCommand({
      TableName:                 USERS_TABLE,
      IndexName:                 "email-index",
      KeyConditionExpression:    "email = :email",
      ExpressionAttributeValues: { ":email": email },
    }));

    const items = response.Items;

    // 가입되지 않은 이메일
    if (!items || items.length === 0) {
      return {
        statusCode: 404,
        headers: HEADERS,
        body: JSON.stringify({ detail: "회원가입 되지 않은 아이디 입니다." }),
      };
    }

    const userData = items[0];

    // 비밀번호 검증 (bcrypt.compare 사용)
    const isValid = await checkPassword(password, userData.password);
    if (!isValid) {
      return {
        statusCode: 401,
        headers: HEADERS,
        body: JSON.stringify({ detail: "비밀번호가 틀렸습니다." }),
      };
    }

    // 로그인 성공 시 토큰 발급 및 DB 저장
    const accessToken  = createAccessToken({ sub: userData.userId });
    const refreshToken = createRefreshToken({ sub: userData.userId });

    await saveRefreshToken(userData.userId, refreshToken);

    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({
        result:          "success",
        nickname:        userData.nickname,
        profileImageUrl: userData.profileImageUrl,
        access_token:    accessToken,
        refresh_token:   refreshToken,
      }),
    };

  } catch (error) {
    console.error("userLogin Error:", error);
    return {
      statusCode: 500,
      headers: HEADERS,
      body: JSON.stringify({ detail: "서버 오류가 발생했습니다.", error: error.message }),
    };
  }
};
