// backend/src/auth/userLogin.js
// Python: @router.post("/userLogin")

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
// Python: async def login(user: User)
// =========================
module.exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const { email, password } = body;

    // Python: if not user.email or not user.password
    if (!email || !password) {
      return {
        statusCode: 422,
        headers: HEADERS,
        body: JSON.stringify({ detail: "필수요소를 입력해주세요." }),
      };
    }

    // Python: table.query(IndexName='email-index', KeyConditionExpression=Key('email').eq(user.email))
    const response = await dynamoDb.send(new QueryCommand({
      TableName:                 USERS_TABLE,
      IndexName:                 "email-index",
      KeyConditionExpression:    "email = :email",
      ExpressionAttributeValues: { ":email": email },
    }));

    const items = response.Items;

    // Python: if not items
    if (!items || items.length === 0) {
      return {
        statusCode: 404,
        headers: HEADERS,
        body: JSON.stringify({ detail: "회원가입 되지 않은 아이디 입니다." }),
      };
    }

    const userData = items[0];

    // Python: if not check_password(user.password, user_data['password'])
    const isValid = await checkPassword(password, userData.password);
    if (!isValid) {
      return {
        statusCode: 401,
        headers: HEADERS,
        body: JSON.stringify({ detail: "비밀번호가 틀렸습니다." }),
      };
    }

    const accessToken  = createAccessToken({ sub: userData.userId });
    const refreshToken = createRefreshToken({ sub: userData.userId });

    // Python: save_refresh_token(user_data['userId'], refresh_token)
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
