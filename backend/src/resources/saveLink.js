const https = require("https");
const http = require("http");
const { UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");
const dynamoDb = require("../dynamodbClient");
const { verifyAccessToken } = require("../utils");

const ROOMS_TABLE = process.env.ROOMS_TABLE;

// 외부 URL에서 HTML을 가져오는 함수 (외부 패키지 없이 Node.js 내장 모듈 사용)
function fetchHtml(url, maxRedirects = 3) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;

    client.get(url, { headers: { "User-Agent": "Mozilla/5.0" }, timeout: 5000 }, (res) => {
      // 리다이렉트 처리
      if ([301, 302, 303, 307].includes(res.statusCode) && res.headers.location && maxRedirects > 0) {
        const redirectUrl = res.headers.location.startsWith("http")
          ? res.headers.location
          : new URL(res.headers.location, url).href;
        return resolve(fetchHtml(redirectUrl, maxRedirects - 1));
      }

      let data = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => resolve(data.slice(0, 50000))); // 50KB 제한
    }).on("error", reject)
      .on("timeout", () => reject(new Error("요청 시간 초과")));
  });
}

// HTML에서 OpenGraph 메타 태그 파싱
function parseOgTags(html) {
  const getTag = (property) => {
    const regex = new RegExp(`<meta[^>]*property=["']og:${property}["'][^>]*content=["']([^"']*)["']`, "i");
    const altRegex = new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:${property}["']`, "i");
    const match = html.match(regex) || html.match(altRegex);
    return match ? match[1] : null;
  };

  // og:title이 없으면 <title> 태그에서 추출
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const fallbackTitle = titleMatch ? titleMatch[1].trim() : null;

  return {
    title: getTag("title") || fallbackTitle || "제목 없음",
    description: getTag("description") || "",
    image: getTag("image") || "",
    siteName: getTag("site_name") || "",
  };
}

exports.handler = async (event) => {
  try {
    // 인증 확인
    const auth = verifyAccessToken(event.headers?.Authorization || event.headers?.authorization);
    if (auth.error) {
      return {
        statusCode: 401,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ message: auth.error }),
      };
    }

    const { roomId } = event.pathParameters || {};
    const body = JSON.parse(event.body || "{}");
    const { url } = body;

    if (!roomId || !url) {
      return {
        statusCode: 400,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ message: "roomId, url은 필수입니다." }),
      };
    }

    // URL 유효성 검사
    try { new URL(url); } catch {
      return {
        statusCode: 400,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ message: "유효하지 않은 URL입니다." }),
      };
    }

    // HTML 가져오기 + OG 태그 파싱
    let ogData = { title: "제목 없음", description: "", image: "", siteName: "" };
    try {
      const html = await fetchHtml(url);
      ogData = parseOgTags(html);
    } catch (err) {
      console.warn("OG 파싱 실패 (URL은 그대로 저장):", err.message);
    }

    const linkItem = {
      linkId: uuidv4(),
      url,
      title: ogData.title,
      description: ogData.description,
      image: ogData.image,
      siteName: ogData.siteName,
      sharedBy: auth.userId,
      sharedAt: new Date().toISOString(),
    };

    // Rooms 테이블의 links 배열에 추가
    await dynamoDb.send(new UpdateCommand({
      TableName: ROOMS_TABLE,
      Key: { roomId },
      UpdateExpression: "SET #links = list_append(if_not_exists(#links, :empty), :newLink)",
      ExpressionAttributeNames: { "#links": "links" },
      ExpressionAttributeValues: {
        ":newLink": [linkItem],
        ":empty": [],
      },
    }));

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "링크 저장 완료", link: linkItem }),
    };
  } catch (error) {
    console.error("saveLink Error:", error);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "링크 저장 실패", error: error.message }),
    };
  }
};
