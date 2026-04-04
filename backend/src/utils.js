// Python 라이브러리 → Node.js 대응표
// passlib.pbkdf2_sha256  →  bcrypt  (단방향 해시)
// python-jose jwt        →  jsonwebtoken
// datetime.utcnow()      →  new Date()
// timedelta(days=7)      →  7 * 24 * 60 * 60  (초 단위)

const bcrypt = require("bcryptjs");
const jwt    = require("jsonwebtoken");
const {
  PutCommand,
  GetCommand,
  DeleteCommand,
} = require("@aws-sdk/lib-dynamodb");

const config   = require("./config");
const dynamoDb = require("./dynamodbClient");

const REFRESH_TOKENS_TABLE = "RefreshTokens";

// =========================
// 비밀번호 처리
// =========================
async function hashPassword(originalPassword) {
  const password = originalPassword + config.SALT;
  // bcrypt saltRounds=10 은 pbkdf2_sha256 와 비슷한 보안 수준
  return bcrypt.hash(password, 10);
}

async function checkPassword(originalPassword, hashedPassword) {
  const password = originalPassword + config.SALT;
  return bcrypt.compare(password, hashedPassword);
}


// =========================
// JWT 생성
// =========================
function createAccessToken(data) {
  return jwt.sign(
    { ...data, scope: "access_token" },
    config.JWT_SECRET_KEY,
    {
      algorithm: config.HASHING_ALGORITHM,
      expiresIn: "7d",  // ← 추후 15m으로 변경 권장
    }
  );
}

function createRefreshToken(data) {
  return jwt.sign(
    { ...data, scope: "refresh_token" },
    config.JWT_SECRET_KEY,
    {
      algorithm: config.HASHING_ALGORITHM,
      expiresIn: "7d",
    }
  );
}


// =========================
// Access Token 검증
// Python: jwt.decode() + scope 체크 + sub 추출
// =========================
function verifyAccessToken(token) {
  // Authorization: Bearer <token> 헤더에서 토큰 추출
  const raw = token?.startsWith("Bearer ") ? token.slice(7) : token;

  try {
    const payload = jwt.verify(raw, config.JWT_SECRET_KEY, {
      algorithms: [config.HASHING_ALGORITHM],
    });

    if (payload.scope !== "access_token") {
      return { error: "자격 증명을 확인할 수 없습니다." };
    }

    return { userId: payload.sub };

  } catch {
    return { error: "자격 증명을 확인할 수 없습니다." };
  }
}


// =========================
// Refresh Token DB 처리
// Python: table.put_item / get_item / delete_item
// =========================
async function saveRefreshToken(userId, refreshToken) {
  const expiresAt = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60; // 7일 TTL

  await dynamoDb.send(new PutCommand({
    TableName: REFRESH_TOKENS_TABLE,
    Item: {
      userId,
      refreshToken,
      createdAt: new Date().toISOString(),
      expiresAt,
    },
  }));
}

async function getRefreshToken(userId, refreshToken) {
  const result = await dynamoDb.send(new GetCommand({
    TableName: REFRESH_TOKENS_TABLE,
    Key: { userId, refreshToken },
  }));

  return result.Item || null;
}

async function deleteRefreshToken(userId, refreshToken) {
  await dynamoDb.send(new DeleteCommand({
    TableName: REFRESH_TOKENS_TABLE,
    Key: { userId, refreshToken },
  }));
}


// =========================
// Refresh 검증 + Access 재발급
// Python: validate_refresh_token_and_generate_access_token()
// =========================
async function validateRefreshTokenAndGenerateAccessToken(refreshToken) {
  try {
    const payload = jwt.verify(refreshToken, config.JWT_SECRET_KEY, {
      algorithms: [config.HASHING_ALGORITHM],
    });

    if (payload.scope !== "refresh_token") {
      return { error: "리프레시 토큰이 유효하지 않습니다." };
    }

    const userId = payload.sub;
    if (!userId) {
      return { error: "리프레시 토큰이 유효하지 않습니다." };
    }

    // DB 검증 (Python: stored = get_refresh_token(user_id, refresh_token))
    const stored = await getRefreshToken(userId, refreshToken);
    if (!stored) {
      return { error: "리프레시 토큰이 유효하지 않습니다." };
    }

    // 새 Access Token 발급
    const newAccessToken = createAccessToken({ sub: userId });
    return { accessToken: newAccessToken };

  } catch {
    return { error: "리프레시 토큰이 유효하지 않습니다." };
  }
}


module.exports = {
  hashPassword,
  checkPassword,
  createAccessToken,
  createRefreshToken,
  verifyAccessToken,
  saveRefreshToken,
  getRefreshToken,
  deleteRefreshToken,
  validateRefreshTokenAndGenerateAccessToken,
};
