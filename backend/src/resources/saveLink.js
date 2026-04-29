const https = require("https");
const http = require("http");
const { UpdateCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { v4: uuidv4 } = require("uuid");
const dynamoDb = require("../dynamodbClient");
const { verifyAccessToken } = require("../utils");

const SERVERS_TABLE = process.env.SERVERS_TABLE;
const RESOURCES_BUCKET = process.env.RESOURCES_BUCKET;
const s3Client = new S3Client({ region: process.env.REGION || "us-east-1" });

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

// OG 이미지를 S3에 캐싱
function cacheOgImage(imageUrl) {
  return new Promise((resolve, reject) => {
    if (!imageUrl || !imageUrl.startsWith("http")) {
      return resolve(null);
    }

    const client = imageUrl.startsWith("https") ? https : http;
    client.get(imageUrl, { headers: { "User-Agent": "Mozilla/5.0" }, timeout: 8000 }, (res) => {
      // 리다이렉트 처리
      if ([301, 302, 303, 307].includes(res.statusCode) && res.headers.location) {
        return resolve(cacheOgImage(res.headers.location));
      }

      if (res.statusCode !== 200) {
        return resolve(null);
      }

      const contentType = res.headers["content-type"] || "image/jpeg";
      // 이미지 타입이 아니면 스킵
      if (!contentType.startsWith("image/")) {
        return resolve(null);
      }

      const chunks = [];
      let totalSize = 0;
      const MAX_SIZE = 2 * 1024 * 1024; // 2MB 제한

      res.on("data", (chunk) => {
        totalSize += chunk.length;
        if (totalSize > MAX_SIZE) {
          res.destroy();
          return resolve(null);
        }
        chunks.push(chunk);
      });

      res.on("end", async () => {
        try {
          const buffer = Buffer.concat(chunks);
          const ext = contentType.split("/")[1]?.split(";")[0] || "jpg";
          const s3Key = `og-cache/${uuidv4()}.${ext}`;

          await s3Client.send(new PutObjectCommand({
            Bucket: RESOURCES_BUCKET,
            Key: s3Key,
            Body: buffer,
            ContentType: contentType,
          }));

          const cachedUrl = `https://${RESOURCES_BUCKET}.s3.${process.env.REGION || "us-east-1"}.amazonaws.com/${s3Key}`;
          resolve(cachedUrl);
        } catch (err) {
          console.warn("OG 이미지 S3 캐싱 실패:", err.message);
          resolve(null);
        }
      });

      res.on("error", () => resolve(null));
    }).on("error", () => resolve(null))
      .on("timeout", () => resolve(null));
  });
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
    // 삭제 요청 처리
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
    // 링크 저장 로직
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

    // OG 이미지가 있으면 S3에 캐싱
    let cachedImageUrl = ogData.image;
    if (ogData.image) {
      const cached = await cacheOgImage(ogData.image);
      if (cached) {
        cachedImageUrl = cached;
      }
    }

    const linkItem = {
      linkId: uuidv4(),
      url,
      title: ogData.title,
      description: ogData.description,
      image: cachedImageUrl,
      originalImage: ogData.image,
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