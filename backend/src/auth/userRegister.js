// backend/src/auth/userRegister.js
// Python: @router.post("/userRegister")
// FastAPI + Pydantic → serverless Lambda handler

const { PutCommand } = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");

const dynamoDb = require("../dynamodbClient");
const {
  hashPassword,
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
// 회원가입
// Python: async def register(user: User)
// =========================
module.exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const { email, password, nickname, profileImageUrl } = body;

    // Python: if not (user.email and user.password and user.nickname)
    if (!email || !password || !nickname) {
      return {
        statusCode: 422,
        headers: HEADERS,
        body: JSON.stringify({ detail: "필수요소를 입력해주세요." }),
      };
    }

    // Python: if '@' not in user.email
    if (!email.includes("@")) {
      return {
        statusCode: 422,
        headers: HEADERS,
        body: JSON.stringify({ detail: "값에 이상이 있습니다." }),
      };
    }

    const userId    = uuidv4();              // Python: str(uuid.uuid4())
    const createdAt = new Date().toISOString(); // Python: datetime.utcnow().isoformat()

    const item = {
      userId,
      email,
      password:        await hashPassword(password), // Python: hash_password(user.password)
      nickname,
      profileImageUrl: profileImageUrl || null,
      status:          "ACTIVE",
      createdAt,
    };

    // Python: table.put_item(Item=item)
    await dynamoDb.send(new PutCommand({
      TableName: USERS_TABLE,
      Item:      item,
    }));

    const accessToken  = createAccessToken({ sub: userId });
    const refreshToken = createRefreshToken({ sub: userId });

    // Python: save_refresh_token(user_id, refresh_token)
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
