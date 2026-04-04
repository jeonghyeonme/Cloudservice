const jwt = require("jsonwebtoken");

const config = require("../config");
const { deleteRefreshToken } = require("../utils");

const HEADERS = {
  "Access-Control-Allow-Origin":      "*",
  "Access-Control-Allow-Credentials": true,
};

// =========================
// 로그아웃
// FastAPI는 Authorization 헤더에서 자동 추출 → 여기선 직접 파싱
// =========================
module.exports.handler = async (event) => {
  try {
    // Authorization: Bearer <refresh_token> 헤더에서 추출
    const authHeader   = event.headers?.Authorization || event.headers?.authorization || "";
    const refreshToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!refreshToken) {
      return {
        statusCode: 401,
        headers: HEADERS,
        body: JSON.stringify({ detail: "리프레시 토큰이 없습니다." }),
      };
    }

    const payload = jwt.verify(refreshToken, config.JWT_SECRET_KEY, {
      algorithms: [config.HASHING_ALGORITHM],
    });
    const userId = payload.sub;

    await deleteRefreshToken(userId, refreshToken);

    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({ result: "success" }),
    };

  } catch (error) {
    console.error("userLogout Error:", error);
    return {
      statusCode: 401,
      headers: HEADERS,
      body: JSON.stringify({ detail: "유효하지 않은 토큰입니다.", error: error.message }),
    };
  }
};
