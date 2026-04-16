import { createApiUrl } from "../constants/endpoint";

export async function request(path, options = {}) {
  const url = createApiUrl(path);

  // localStorage에서 토큰 가져오기
  const accessToken = localStorage.getItem("accessToken");
  const authHeader = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};

  let response;

  try {
    response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...authHeader, // 인증 헤더 자동 주입
        ...(options.headers || {}),
      },
      ...options,
    });
  } catch (error) {
    throw new Error("서버에 연결할 수 없습니다. 백엔드가 실행 중인지 확인해 주세요.");
  }

  const contentType = response.headers.get("content-type") || "";
  const isJsonResponse = contentType.includes("application/json");
  const payload = isJsonResponse ? await response.json() : await response.text();

  if (!response.ok) {
    // 백엔드에서 보낸 JSON 에러 메시지를 우선적으로 파싱
    const errorData = await response.json().catch(() => ({})); 
    
    // 백엔드가 보낸 message가 있으면 그걸 띄우고, 없으면 기본 메시지 띄움
    throw new Error(errorData.message || "요청에 실패했습니다."); 
  }

  if (!isJsonResponse) {
    throw new Error("서버 응답 형식이 올바르지 않습니다. API 주소를 확인해 주세요.");
  }

  return payload;
}
