// backend/src/auth/tokenRefresh.js
// Python: @router.post("/token/refresh")

const { validateRefreshTokenAndGenerateAccessToken } = require("../utils");

const HEADERS = {
  "Access-Control-Allow-Origin":      "*",
  "Access-Control-Allow-Credentials": true,
};

// =========================
// Access Token 재발급
// Python: async def refresh_access_token(refresh_token: str = Depends(oauth2_scheme_refresh))
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

    // Python: new_access_token = validate_refresh_token_and_generate_access_token(refresh_token)
    const result = await validateRefreshTokenAndGenerateAccessToken(refreshToken);

    if (result.error) {
      return {
        statusCode: 401,
        headers: HEADERS,
        body: JSON.stringify({ detail: result.error }),
      };
    }

    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({
        result:       "success",
        access_token: result.accessToken,
        token_type:   "bearer",
      }),
    };

  } catch (error) {
    console.error("tokenRefresh Error:", error);
    return {
      statusCode: 401,
      headers: HEADERS,
      body: JSON.stringify({ detail: "유효하지 않은 토큰입니다.", error: error.message }),
    };
  }
};
