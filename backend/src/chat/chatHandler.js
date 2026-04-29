const {
  PutCommand,
  UpdateCommand,
  QueryCommand,
} = require("@aws-sdk/lib-dynamodb");
const {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
} = require("@aws-sdk/client-apigatewaymanagementapi");
const { v4: uuidv4 } = require("uuid");

const dynamoDb = require("../dynamodbClient");
const config   = require("../config");
const { verifyAccessToken } = require("../utils");

const SERVERS_TABLE     = process.env.SERVERS_TABLE;
const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE;
const MESSAGES_TABLE    = process.env.MESSAGES_TABLE;


// =========================
// WebSocket 클라이언트 생성
// =========================
function getApigwClient(event) {
  const domain = event.requestContext.domainName;
  const stage  = event.requestContext.stage;

  // 로컬(serverless-offline) 환경이거나 domainName에 localhost가 포함된 경우
  const isLocal = config.IS_OFFLINE || domain.includes("localhost") || domain.includes("127.0.0.1");
  
  const endpoint = isLocal
    ? "http://localhost:4001"
    : `https://${domain}/${stage}`;

  console.log("WebSocket Endpoint:", endpoint);

  return new ApiGatewayManagementApiClient({
    endpoint,
  });
}

// 특정 connectionId로 메시지 전송
async function sendToConnection(apigw, connectionId, data) {
  try {
    await apigw.send(new PostToConnectionCommand({
      ConnectionId: connectionId,
      Data:         Buffer.from(JSON.stringify(data)),
    }));
  } catch (error) {
    console.error(`Failed to send to ${connectionId}:`, error.message);
    
    // 410 Gone: 연결이 이미 끊긴 경우
    if (error.name === "GoneException" || error.$metadata?.httpStatusCode === 410) {
      await dynamoDb.send(new UpdateCommand({
        TableName: CONNECTIONS_TABLE,
        Key:       { connectionId },
        UpdateExpression: "SET serverId = :none",
        ExpressionAttributeValues: { ":none": "DISCONNECTED" }
      })).catch(() => {});
    }
  }
}


// =========================
// $connect — WebSocket 연결 시 호출
// =========================
async function onConnect(event) {
  const connectionId = event.requestContext.connectionId;
  const token = event.queryStringParameters?.token;

  if (!token) {
    console.log("Connection rejected: No token provided");
    return { statusCode: 403, body: "Forbidden: No token provided" };
  }

  const decoded = verifyAccessToken(token);
  if (decoded.error) {
    console.log("Connection rejected: Invalid token", decoded.error);
    return { statusCode: 403, body: `Forbidden: ${decoded.error}` };
  }

  await dynamoDb.send(new PutCommand({
    TableName: CONNECTIONS_TABLE,
    Item: {
      connectionId,
      userId:      decoded.userId,
      connectedAt: new Date().toISOString(),
      expiresAt:   Math.floor(Date.now() / 1000) + 3600, // 1시간 TTL
    },
  }));

  return { statusCode: 200 };
}


// =========================
// $disconnect — WebSocket 연결 해제 시 호출
// =========================
async function onDisconnect(event) {
  const connectionId = event.requestContext.connectionId;

  // Delete 대신 논리적으로 방에서 제외
  await dynamoDb.send(new UpdateCommand({
    TableName: CONNECTIONS_TABLE,
    Key:       { connectionId },
    UpdateExpression: "SET serverId = :none",
    ExpressionAttributeValues: { ":none": "DISCONNECTED" }
  })).catch(() => {});

  return { statusCode: 200 };
}


// =========================
// 방 생성 (WebSocket용 - 현재는 HTTP로 주로 처리하나 유지)
// =========================
async function createServer(body) {
  const serverId    = uuidv4();
  const createdAt = new Date().toISOString();

  await dynamoDb.send(new PutCommand({
    TableName: SERVERS_TABLE,
    Item: {
      serverId,
      serverName:     body.serverName,
      hostId:       body.hostId,
      maxCapacity:  body.maxCapacity ?? 10,
      currentCount: 0,
      status:       "ACTIVE",               
      createdAt,
      expiresAt:    Math.floor(Date.now() / 1000) + 86400, // 24시간 TTL
    },
  }));

  return {
    statusCode: 200,
    body: JSON.stringify({ action: "createServer", serverId }),
  };
}


// =========================
// 방 입장 (WebSocket 세션과 serverId 연결)
// =========================
async function joinServer(connectionId, body) {
  const { serverId, userId } = body;

  // 해당 connection에 serverId, userId 연결
  await dynamoDb.send(new UpdateCommand({
    TableName:                 CONNECTIONS_TABLE,
    Key:                       { connectionId },
    UpdateExpression:          "SET serverId = :r, userId = :u",
    ExpressionAttributeValues: { ":r": serverId, ":u": userId },
  }));

  // 방 인원 +1 (단순 카운터)
  await dynamoDb.send(new UpdateCommand({
    TableName:                 SERVERS_TABLE,
    Key:                       { serverId },
    UpdateExpression:          "SET currentCount = currentCount + :inc",
    ExpressionAttributeValues: { ":inc": 1 },
  }));

  return {
    statusCode: 200,
    body: JSON.stringify({ action: "joinServer", serverId }),
  };
}


// =========================
// 메시지 전송
// =========================
async function sendMessage(event, body) {
  const apigw = getApigwClient(event);
  const { serverId, channelId } = body;

  const messageId = uuidv4();
  const createdAt = new Date().toISOString();

  const item = {
    serverId,
    channelId:      channelId || "ch-general",
    messageId,
    senderId:       body.senderId,
    senderNickname: body.senderNickname,
    messageType:    body.messageType,
    createdAt,
  };

  if (body.messageType === "TEXT") {
    item.content = body.content;
  }

  // 1. DB 저장
  await dynamoDb.send(new PutCommand({
    TableName: MESSAGES_TABLE,
    Item:      item,
  }));

  // 2. 같은 서버 접속자 전체 조회
  const response = await dynamoDb.send(new QueryCommand({
    TableName:                 CONNECTIONS_TABLE,
    IndexName:                 "serverId-index",
    KeyConditionExpression:    "serverId = :serverId",
    ExpressionAttributeValues: { ":serverId": serverId },
  }));

  const connections = response.Items || [];
  console.log(`Broadcasting message to ${connections.length} connections in server ${serverId}`);

  // 3. 브로드캐스트
  await Promise.all(
    connections.map((conn) =>
      sendToConnection(apigw, conn.connectionId, {
        action: "receiveMessage",
        data:   item,
      })
    )
  );

  return { statusCode: 200 };
}


// =========================
// 메시지 수정
// =========================
async function updateMessage(event, body) {
  const apigw = getApigwClient(event);
  const { serverId, messageId, senderId, content, channelId } = body;

  const updatedAt = new Date().toISOString();

  const result = await dynamoDb.send(new UpdateCommand({
    TableName: MESSAGES_TABLE,
    Key: { serverId, messageId },
    UpdateExpression: "SET content = :content, updatedAt = :updatedAt, isEdited = :isEdited",
    ConditionExpression: "senderId = :senderId",
    ExpressionAttributeValues: {
      ":content": content,
      ":updatedAt": updatedAt,
      ":isEdited": true,
      ":senderId": senderId,
    },
    ReturnValues: "ALL_NEW",
  }));

  const updatedMessage = result.Attributes;

  const response = await dynamoDb.send(new QueryCommand({
    TableName: CONNECTIONS_TABLE,
    IndexName: "serverId-index",
    KeyConditionExpression: "serverId = :serverId",
    ExpressionAttributeValues: { ":serverId": serverId },
  }));

  const connections = response.Items || [];

  await Promise.all(
    connections.map((conn) =>
      sendToConnection(apigw, conn.connectionId, {
        action: "messageUpdated",
        data:   { ...updatedMessage, channelId }, // channelId가 키가 아니므로 body에서 가져와 전달
      })
    )
  );

  return { statusCode: 200 };
}


// =========================
// 메시지 삭제
// =========================
async function deleteMessage(event, body) {
  const apigw = getApigwClient(event);
  const { serverId, messageId, senderId, channelId } = body;

  const deletedAt = new Date().toISOString();

  const result = await dynamoDb.send(new UpdateCommand({
    TableName: MESSAGES_TABLE,
    Key: { serverId, messageId },
    UpdateExpression: "SET isDeleted = :isDeleted, deletedAt = :deletedAt, content = :content",
    ConditionExpression: "senderId = :senderId",
    ExpressionAttributeValues: {
      ":isDeleted": true,
      ":deletedAt": deletedAt,
      ":content": "삭제된 메시지입니다.",
      ":senderId": senderId,
    },
    ReturnValues: "ALL_NEW",
  }));

  const deletedMessage = result.Attributes;

  const response = await dynamoDb.send(new QueryCommand({
    TableName: CONNECTIONS_TABLE,
    IndexName: "serverId-index",
    KeyConditionExpression: "serverId = :serverId",
    ExpressionAttributeValues: { ":serverId": serverId },
  }));

  const connections = response.Items || [];

  await Promise.all(
    connections.map((conn) =>
      sendToConnection(apigw, conn.connectionId, {
        action: "messageDeleted",
        data:   { ...deletedMessage, channelId },
      })
    )
  );

  return { statusCode: 200 };
}


// =========================
// 리소스 업데이트 알림
// =========================
async function resourceUpdated(event, body) {
  const apigw = getApigwClient(event);
  const { serverId, resourceType, resource } = body;

  const response = await dynamoDb.send(new QueryCommand({
    TableName: CONNECTIONS_TABLE,
    IndexName: "serverId-index",
    KeyConditionExpression: "serverId = :serverId",
    ExpressionAttributeValues: { ":serverId": serverId },
  }));

  const connections = response.Items || [];

  await Promise.all(
    connections.map((conn) =>
      sendToConnection(apigw, conn.connectionId, {
        action: "resourceUpdated",
        data: {
          serverId,
          resourceType: resourceType || "unknown",
          resource: resource || null,
          updatedAt: new Date().toISOString(),
        },
      })
    )
  );

  return { statusCode: 200 };
}


// =========================
// 메인 핸들러
// =========================
module.exports.handler = async (event) => {
  const routeKey = event.requestContext.routeKey;

  try {
    if (routeKey === "$connect")    return await onConnect(event);
    if (routeKey === "$disconnect") return await onDisconnect(event);

    const body = JSON.parse(event.body || "{}");

    if (routeKey === "createServer")  return await createServer(body);
    if (routeKey === "joinServer")    return await joinServer(event.requestContext.connectionId, body);
    if (routeKey === "sendMessage") return await sendMessage(event, body);
    if (routeKey === "updateMessage") return await updateMessage(event, body);
    if (routeKey === "deleteMessage") return await deleteMessage(event, body);
    if (routeKey === "resourceUpdated") return await resourceUpdated(event, body);

    return { statusCode: 200 };

  } catch (error) {
    console.error("chatHandler Error:", error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
