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

const ROOMS_TABLE       = process.env.ROOMS_TABLE;
const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE;
const MESSAGES_TABLE    = process.env.MESSAGES_TABLE;


// =========================
// WebSocket 클라이언트 생성
// =========================
function getApigwClient(domain, stage) {
  return new ApiGatewayManagementApiClient({
    endpoint: `https://${domain}/${stage}`,
  });
}

// 특정 connectionId로 메시지 전송
async function sendToConnection(apigw, connectionId, data) {
  try {
    await apigw.send(new PostToConnectionCommand({
      ConnectionId: connectionId,
      Data:         Buffer.from(JSON.stringify(data)),
    }));
  } catch {
    // 연결 끊김 시 Delete 대신 roomId를 'DISCONNECTED'로 바꿔서 방에서 빼냅니다.
    await dynamoDb.send(new UpdateCommand({
      TableName: CONNECTIONS_TABLE,
      Key:       { connectionId },
      UpdateExpression: "SET roomId = :none",
      ExpressionAttributeValues: { ":none": "DISCONNECTED" }
    })).catch(() => {}); // 혹시 모를 권한 에러 무시
  }
}


// =========================
// $connect — WebSocket 연결 시 호출
// =========================
async function onConnect(event) {
  const connectionId = event.requestContext.connectionId;

  await dynamoDb.send(new PutCommand({
    TableName: CONNECTIONS_TABLE,
    Item: {
      connectionId,
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
    UpdateExpression: "SET roomId = :none",
    ExpressionAttributeValues: { ":none": "DISCONNECTED" }
  })).catch(() => {});

  return { statusCode: 200 };
}


// =========================
// 방 생성
// =========================
async function createRoom(body) {
  const roomId    = uuidv4();
  const createdAt = new Date().toISOString();

  await dynamoDb.send(new PutCommand({
    TableName: ROOMS_TABLE,
    Item: {
      roomId,
      roomName:     body.roomName,
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
    body: JSON.stringify({ action: "createRoom", roomId }),
  };
}


// =========================
// 방 입장
// =========================
async function joinRoom(connectionId, body) {
  const { roomId, userId } = body;

  // 해당 connection에 roomId, userId 연결
  await dynamoDb.send(new UpdateCommand({
    TableName:                 CONNECTIONS_TABLE,
    Key:                       { connectionId },
    UpdateExpression:          "SET roomId = :r, userId = :u",
    ExpressionAttributeValues: { ":r": roomId, ":u": userId },
  }));

  // 방 인원 +1
  await dynamoDb.send(new UpdateCommand({
    TableName:                 ROOMS_TABLE,
    Key:                       { roomId },
    UpdateExpression:          "SET currentCount = currentCount + :inc",
    ExpressionAttributeValues: { ":inc": 1 },
  }));

  return {
    statusCode: 200,
    body: JSON.stringify({ action: "joinRoom", roomId }),
  };
}


// =========================
// 메시지 전송
// =========================
async function sendMessage(event, body) {
  const connectionId = event.requestContext.connectionId;
  const domain       = event.requestContext.domainName;
  const stage        = event.requestContext.stage;

  const apigw   = getApigwClient(domain, stage);
  const { roomId } = body;

  const messageId = uuidv4();
  const createdAt = new Date().toISOString();

  const item = {
    roomId,
    messageId,
    senderId:       body.senderId,
    senderNickname: body.senderNickname,
    messageType:    body.messageType,
    createdAt,
  };

  if (body.messageType === "TEXT") {
    item.content = body.content;
  }

  // Messages 테이블에 저장
  await dynamoDb.send(new PutCommand({
    TableName: MESSAGES_TABLE,
    Item:      item,
  }));

  // roomId-index GSI로 같은 방 접속자 전체 조회
  const response = await dynamoDb.send(new QueryCommand({
    TableName:                 CONNECTIONS_TABLE,
    IndexName:                 "roomId-index",
    KeyConditionExpression:    "roomId = :roomId",
    ExpressionAttributeValues: { ":roomId": roomId },
  }));

  const connections = response.Items || [];

  // 같은 방 모든 접속자에게 동시 브로드캐스트
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
// 메인 핸들러 — API Gateway WebSocket 라우팅
// =========================
module.exports.handler = async (event) => {
  const routeKey = event.requestContext.routeKey;

  try {
    if (routeKey === "$connect")    return await onConnect(event);
    if (routeKey === "$disconnect") return await onDisconnect(event);

    const body = JSON.parse(event.body || "{}");

    if (routeKey === "createRoom")  return await createRoom(body);
    if (routeKey === "joinRoom")    return await joinRoom(event.requestContext.connectionId, body);
    if (routeKey === "sendMessage") return await sendMessage(event, body);

    return { statusCode: 200 };

  } catch (error) {
    console.error("chatHandler Error:", error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};