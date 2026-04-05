const {
  PutCommand,
  DeleteCommand,
  UpdateCommand,
  QueryCommand,
} = require("@aws-sdk/lib-dynamodb");
const {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
} = require("@aws-sdk/client-apigatewaymanagementapi");
const { v4: uuidv4 } = require("uuid");

const dynamoDb = require("../dynamodbClient");

const ROOMS_TABLE       = "Rooms";
const CONNECTIONS_TABLE = "Connections";
const MESSAGES_TABLE    = "Messages";


// =========================
// WebSocket으로 메시지 보내기
// =========================
function getApigwClient(domain, stage) {
  return new ApiGatewayManagementApiClient({
    endpoint: `https://${domain}/${stage}`,
  });
}

async function sendToConnection(apigw, connectionId, data) {
  try {
    await apigw.send(new PostToConnectionCommand({
      ConnectionId: connectionId,
      Data:         Buffer.from(JSON.stringify(data)),
    }));
  } catch {
    // 연결 끊기면 DB에서 삭제
    await dynamoDb.send(new DeleteCommand({
      TableName: CONNECTIONS_TABLE,
      Key:       { connectionId },
    }));
  }
}


// =========================
// $connect
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
// $disconnect
// =========================
async function onDisconnect(event) {
  const connectionId = event.requestContext.connectionId;

  await dynamoDb.send(new DeleteCommand({
    TableName: CONNECTIONS_TABLE,
    Key:       { connectionId },
  }));

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
      maxCapacity:  body.maxCapacity ?? 10,  // Python: body.get('maxCapacity', 10)
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

  // Python: connections_table.update_item(... SET roomId = :r, userId = :u ...)
  await dynamoDb.send(new UpdateCommand({
    TableName:                 CONNECTIONS_TABLE,
    Key:                       { connectionId },
    UpdateExpression:          "SET roomId = :r, userId = :u",
    ExpressionAttributeValues: { ":r": roomId, ":u": userId },
  }));

  // Python: rooms_table.update_item(... SET currentCount = currentCount + :inc ...)
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

  await dynamoDb.send(new PutCommand({
    TableName: MESSAGES_TABLE,
    Item:      item,
  }));

  const response = await dynamoDb.send(new QueryCommand({
    TableName:                 CONNECTIONS_TABLE,
    IndexName:                 "roomId-index",
    KeyConditionExpression:    "roomId = :roomId",
    ExpressionAttributeValues: { ":roomId": roomId },
  }));

  const connections = response.Items || [];

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
// 메인 핸들러
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
