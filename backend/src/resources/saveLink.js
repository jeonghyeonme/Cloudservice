const { UpdateCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");
const dynamoDb = require("../dynamodbClient");
const { verifyAccessToken } = require("../utils");
const { getLinkPreview } = require("./linkPreview");
const { HEADERS } = require("../utils/response");

const SERVERS_TABLE = process.env.SERVERS_TABLE;

const response = (statusCode, body) => ({
  statusCode,
  headers: HEADERS,
  body: JSON.stringify(body),
});

exports.handler = async (event) => {
  try {
    const auth = verifyAccessToken(
      event.headers?.Authorization || event.headers?.authorization
    );

    if (auth.error) {
      return response(401, { message: auth.error });
    }

    const { serverId } = event.pathParameters || {};

    if (!serverId) {
      return response(400, { message: "serverId는 필수입니다." });
    }

    const body = JSON.parse(event.body || "{}");

    // ──────────────────────────────────────────
    // 🗑 링크 삭제
    // ──────────────────────────────────────────
    if (body.action === "delete") {
      const { linkId } = body;

      if (!linkId) {
        return response(400, { message: "linkId는 필수입니다." });
      }

      const getResult = await dynamoDb.send(
        new GetCommand({
          TableName: SERVERS_TABLE,
          Key: { serverId },
        })
      );

      const serverData = getResult.Item;

      if (!serverData) {
        return response(404, { message: "서버 없음" });
      }

      const links = serverData.links || [];
      const targetLink = links.find((link) => link.linkId === linkId);

      if (!targetLink) {
        return response(404, { message: "링크 없음" });
      }

      if (targetLink.sharedBy !== auth.userId && serverData.hostId !== auth.userId) {
        return response(403, { message: "권한 없음" });
      }

      const updatedLinks = links.filter((link) => link.linkId !== linkId);

      await dynamoDb.send(
        new UpdateCommand({
          TableName: SERVERS_TABLE,
          Key: { serverId },
          UpdateExpression: "SET #links = :updatedLinks",
          ExpressionAttributeNames: {
            "#links": "links",
          },
          ExpressionAttributeValues: {
            ":updatedLinks": updatedLinks,
          },
        })
      );

      return response(200, { message: "링크 삭제 완료" });
    }

    // ──────────────────────────────────────────
    // ✏️ 링크 수정
    // ──────────────────────────────────────────
    if (body.action === "update") {
      const { linkId, url } = body;

      if (!linkId || !url) {
        return response(400, { message: "linkId, url은 필수입니다." });
      }

      const getResult = await dynamoDb.send(
        new GetCommand({
          TableName: SERVERS_TABLE,
          Key: { serverId },
        })
      );

      const serverData = getResult.Item;

      if (!serverData) {
        return response(404, { message: "서버 없음" });
      }

      const links = serverData.links || [];
      const targetIndex = links.findIndex((link) => link.linkId === linkId);

      if (targetIndex === -1) {
        return response(404, { message: "링크 없음" });
      }

      const targetLink = links[targetIndex];

      if (targetLink.sharedBy !== auth.userId && serverData.hostId !== auth.userId) {
        return response(403, { message: "권한 없음" });
      }

      let preview;

      try {
        preview = await getLinkPreview(url);
      } catch (err) {
        return response(400, {
          message: "URL 미리보기 정보를 가져올 수 없습니다.",
          error: err.message,
        });
      }

      const updatedLink = {
        ...targetLink,
        url: preview.url,
        title: preview.title,
        description: preview.description,
        image: preview.image,
        siteName: preview.siteName,
        updatedAt: new Date().toISOString(),
      };

      links[targetIndex] = updatedLink;

      await dynamoDb.send(
        new UpdateCommand({
          TableName: SERVERS_TABLE,
          Key: { serverId },
          UpdateExpression: "SET #links = :updatedLinks",
          ExpressionAttributeNames: {
            "#links": "links",
          },
          ExpressionAttributeValues: {
            ":updatedLinks": links,
          },
        })
      );

      return response(200, {
        message: "링크 수정 완료",
        link: updatedLink,
      });
    }

    // ──────────────────────────────────────────
    // 💾 링크 저장
    // ──────────────────────────────────────────
    const { url } = body;

    if (!url) {
      return response(400, { message: "url은 필수입니다." });
    }

    let preview;

    try {
      preview = await getLinkPreview(url);
    } catch (err) {
      return response(400, {
        message: "URL 미리보기 정보를 가져올 수 없습니다.",
        error: err.message,
      });
    }

    const linkItem = {
      linkId: uuidv4(),
      url: preview.url,
      title: preview.title,
      description: preview.description,
      image: preview.image,
      siteName: preview.siteName,
      sharedBy: auth.userId,
      sharedAt: new Date().toISOString(),
    };

    await dynamoDb.send(
      new UpdateCommand({
        TableName: SERVERS_TABLE,
        Key: { serverId },
        UpdateExpression:
          "SET #links = list_append(if_not_exists(#links, :empty), :newLink)",
        ConditionExpression: "attribute_exists(serverId)",
        ExpressionAttributeNames: {
          "#links": "links",
        },
        ExpressionAttributeValues: {
          ":newLink": [linkItem],
          ":empty": [],
        },
      })
    );

    return response(200, {
      message: "링크 저장 완료",
      link: linkItem,
    });
  } catch (error) {
    console.error("saveLink Error:", error);

    return response(500, {
      message: "링크 처리 실패",
      error: error.message,
    });
  }
};