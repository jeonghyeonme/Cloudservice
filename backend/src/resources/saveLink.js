const https = require("https");
const http = require("http");
// 🔥 GetCommand가 정상적으로 포함되었습니다
const { UpdateCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");
const dynamoDb = require("../dynamodbClient");
const { verifyAccessToken } = require("../utils");

const SERVERS_TABLE = process.env.SERVERS_TABLE;

function fetchHtml(url, maxRedirects = 3) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    client.get(url, { headers: { "User-Agent": "Mozilla/5.0" }, timeout: 5000 }, (res) => {
      if ([301, 302, 303, 307].includes(res.statusCode) && res.headers.location && maxRedirects > 0) {
        const redirectUrl = res.headers.location.startsWith("http")
          ? res.headers.location
          : new URL(res.headers.location, url).href;
        return resolve(fetchHtml(redirectUrl, maxRedirects - 1));
      }
      let data = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => resolve(data.slice(0, 50000)));
    }).on("error", reject)
      .on("timeout", () => reject(new Error("요청 시간 초과")));
  });
}

function parseOgTags(html) {
  const getTag = (property) => {
    const regex = new RegExp(`<meta[^>]*property=["']og:${property}["'][^>]*content=["']([^"']*)["']`, "i");
    const altRegex = new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:${property}["']`, "i");
    const match = html.match(regex) || html.match(altRegex);
    return match ? match[1] : null;
  };
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
    const auth = verifyAccessToken(event.headers?.Authorization || event.headers?.authorization);
    if (auth.error) {
      return {
        statusCode: 401,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ message: auth.error }),
      };
    }

    const { serverId } = event.pathParameters || {};
    const body = JSON.parse(event.body || "{}");

    // ──────────────────────────────────────────
    // 🚧 삭제 요청 최우선 처리 (URL 검사 전에 실행)
    // ──────────────────────────────────────────
    if (body.action === "delete") {
      const { linkId } = body;
      const getResult = await dynamoDb.send(new GetCommand({ TableName: SERVERS_TABLE, Key: { serverId } }));
      const serverData = getResult.Item;
      if (!serverData) return { statusCode: 404, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ message: "서버 없음" }) };

      const links = serverData.links || [];
      const targetLink = links.find((l) => l.linkId === linkId);
      if (!targetLink) return { statusCode: 404, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ message: "링크 없음" }) };

      if (targetLink.sharedBy !== auth.userId && serverData.hostId !== auth.userId) {
        return { statusCode: 403, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ message: "권한 없음" }) };
      }

      const updatedLinks = links.filter((l) => l.linkId !== linkId);
      await dynamoDb.send(new UpdateCommand({
        TableName: SERVERS_TABLE, Key: { serverId },
        UpdateExpression: "SET #links = :updatedLinks",
        ExpressionAttributeNames: { "#links": "links" },
        ExpressionAttributeValues: { ":updatedLinks": updatedLinks }
      }));
      return { statusCode: 200, headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ message: "링크 삭제 완료" }) };
    }

    // ──────────────────────────────────────────
    // 💾 링크 저장 로직
    // ──────────────────────────────────────────
    const { url } = body;

    if (!serverId || !url) {
      return {
        statusCode: 400,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ message: "serverId, url은 필수입니다." }),
      };
    }

    try { new URL(url); } catch {
      return {
        statusCode: 400,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ message: "유효하지 않은 URL입니다." }),
      };
    }

    let ogData = { title: "제목 없음", description: "", image: "", siteName: "" };
    try {
      const html = await fetchHtml(url);
      ogData = parseOgTags(html);
    } catch (err) {
      console.warn("OG 파싱 실패:", err.message);
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

    await dynamoDb.send(new UpdateCommand({
      TableName: SERVERS_TABLE,
      Key: { serverId },
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