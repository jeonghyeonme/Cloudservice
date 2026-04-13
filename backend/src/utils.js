const bcrypt = require("bcryptjs");
const jwt    = require("jsonwebtoken");
const {
  PutCommand,
  GetCommand,
  UpdateCommand,
} = require("@aws-sdk/lib-dynamodb");

const config   = require("./config");
const dynamoDb = require("./dynamodbClient");

// 환경 변수에서 테이블 명을 가져오도록 수정 (하드코딩 제거)
const REFRESH_TOKENS_TABLE = process.env.REFRESH_TOKENS_TABLE;

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
// 물리적 삭제(Delete) 대신 논리적 삭제(Update)로 우회
// =========================
async function saveRefreshToken(userId, refreshToken) {
  const expiresAt = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60; // 7일 TTL

  await dynamoDb.send(new PutCommand({
    TableName: REFRESH_TOKENS_TABLE,
    Item: {
      userId,
      refreshToken,
      isRevoked: false, // 새로 추가: 초기 상태는 폐기되지 않음
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
  // DeleteCommand 대신 UpdateCommand 사용
  await dynamoDb.send(new UpdateCommand({
    TableName: REFRESH_TOKENS_TABLE,
    Key: { userId, refreshToken },
    UpdateExpression: "SET isRevoked = :revoked",
    ExpressionAttributeValues: { ":revoked": true },
  }));
}


// =========================
// Refresh Token 검증 + Access Token 재발급
// =========================
async function validateRefreshTokenAndGenerateAccessToken(refreshToken) {
  try {
    const payload = jwt.verify(refreshToken, config.JWT_SECRET_KEY, {
      algorithms: [config.HASHING_ALGORITHM],
    });

    // scope가 refresh_token인지 확인
    if (payload.scope !== "refresh_token") {
      return { error: "리프레시 토큰이 유효하지 않습니다." };
    }

    const userId = payload.sub;
    if (!userId) {
      return { error: "리프레시 토큰이 유효하지 않습니다." };
    }

    // DB 검증 시 isRevoked(폐기 상태)인지 체크 로직 추가
    const stored = await getRefreshToken(userId, refreshToken);
    if (!stored || stored.isRevoked === true) {
      return { error: "리프레시 토큰이 유효하지 않습니다(로그아웃 됨)." };
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