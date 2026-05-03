const http = require("http");
const https = require("https");
const dns = require("dns").promises;
const net = require("net");
const cheerio = require("cheerio");

const MAX_HTML_SIZE = 100 * 1024;
const TIMEOUT_MS = 5000;
const MAX_REDIRECTS = 3;

function normalizeUrl(rawUrl) {
  const parsed = new URL(rawUrl);

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("http 또는 https URL만 허용됩니다.");
  }

  parsed.hash = "";
  return parsed.toString();
}

function isPrivateIp(ip) {
  if (net.isIP(ip) === 4) {
    return (
      ip.startsWith("10.") ||
      ip.startsWith("127.") ||
      ip.startsWith("169.254.") ||
      ip.startsWith("192.168.") ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip) ||
      ip === "0.0.0.0"
    );
  }

  if (net.isIP(ip) === 6) {
    return ip === "::1" || ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("fe80");
  }

  return true;
}

async function validateUrlSecurity(url) {
  const parsed = new URL(url);

  const records = await dns.lookup(parsed.hostname, { all: true });

  if (!records.length) {
    throw new Error("도메인을 확인할 수 없습니다.");
  }

  for (const record of records) {
    if (isPrivateIp(record.address)) {
      throw new Error("내부망 또는 로컬 주소는 허용되지 않습니다.");
    }
  }
}

function fetchHtml(url, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const client = parsed.protocol === "https:" ? https : http;

    const req = client.get(
      url,
      {
        timeout: TIMEOUT_MS,
        headers: {
          "User-Agent": "Mozilla/5.0",
          Accept: "text/html,application/xhtml+xml",
        },
      },
      (res) => {
        const statusCode = res.statusCode || 0;

        if ([301, 302, 303, 307, 308].includes(statusCode) && res.headers.location) {
          if (redirectCount >= MAX_REDIRECTS) {
            return reject(new Error("리다이렉트 횟수 초과"));
          }

          const nextUrl = new URL(res.headers.location, url).toString();

          try {
            const normalized = normalizeUrl(nextUrl);
            return resolve(fetchHtml(normalized, redirectCount + 1));
          } catch (err) {
            return reject(err);
          }
        }

        const contentType = res.headers["content-type"] || "";
        if (!contentType.includes("text/html")) {
          return reject(new Error("HTML 문서가 아닙니다."));
        }

        let data = "";
        let size = 0;

        res.setEncoding("utf8");

        res.on("data", (chunk) => {
          size += Buffer.byteLength(chunk);

          if (size > MAX_HTML_SIZE) {
            req.destroy();
            return reject(new Error("HTML 크기 제한 초과"));
          }

          data += chunk;
        });

        res.on("end", () => resolve(data));
      }
    );

    req.on("timeout", () => {
      req.destroy();
      reject(new Error("요청 시간 초과"));
    });

    req.on("error", reject);
  });
}

function parseOgTags(html, pageUrl) {
  const $ = cheerio.load(html);

  const getMeta = (...names) => {
    for (const name of names) {
      const value =
        $(`meta[property="${name}"]`).attr("content") ||
        $(`meta[name="${name}"]`).attr("content");

      if (value) return value.trim();
    }

    return "";
  };

  const title =
    getMeta("og:title", "twitter:title") ||
    $("title").first().text().trim() ||
    "제목 없음";

  const description =
    getMeta("og:description", "twitter:description", "description");

  let image = getMeta("og:image", "twitter:image");
  if (image) {
    image = new URL(image, pageUrl).toString();
  }

  const siteName = getMeta("og:site_name") || new URL(pageUrl).hostname;

  return {
    title,
    description,
    image,
    siteName,
  };
}

async function getLinkPreview(rawUrl) {
  const normalizedUrl = normalizeUrl(rawUrl);

  await validateUrlSecurity(normalizedUrl);

  const html = await fetchHtml(normalizedUrl);
  const ogData = parseOgTags(html, normalizedUrl);

  return {
    url: normalizedUrl,
    ...ogData,
  };
}

module.exports = {
  getLinkPreview,
  normalizeUrl,
  validateUrlSecurity,
};