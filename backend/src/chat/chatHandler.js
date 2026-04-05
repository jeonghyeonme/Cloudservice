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
// WebSocket 클라이언트 생성
// Python: get_apigw_client(domain, stage)
// 연결된 클라이언트에게 메시지를 push하기 위해 필요
// =========================
function getApigwClient(domain, stage) {
  return new ApiGatewayManagementApiClient({
    endpoint: `https://${domain}/${stage}`,
  });
}

// 특정 connectionId로 메시지 전송
// 전송 실패 시 (연결 끊김) Connections 테이블에서 해당 항목 삭제
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
// $connect — WebSocket 연결 시 호출
// Python: def on_connect(event)
// Connections 테이블에 connectionId 저장 + TTL 1시간 설정
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
// Python: def on_disconnect(event)
// Connections 테이블에서 해당 connectionId 삭제
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
// Python: def create_room(body)
// Rooms 테이블에 새 방 저장 + TTL 24시간 설정
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
      status:       "ACTIVE",               // GSI 키로 사용 (bool 대신 String)
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
// Python: def join_room(connection_id, body)
// Connections 테이블에 roomId/userId 저장
// Rooms 테이블의 currentCount 증가
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
// Python: def send_message(event, body)
// 1) Messages 테이블에 저장
// 2) roomId-index GSI로 같은 방 접속자 조회
// 3) 모든 접속자에게 브로드캐스트
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
    messageType:    body.messageType, // "TEXT" | "FILE" | "AI_RESULT"
    createdAt,
  };

  // TEXT 타입일 때만 content 저장
  if (body.messageType === "TEXT") {
    item.content = body.content;
  }

  // Messages 테이블에 저장
  await dynamoDb.send(new PutCommand({
    TableName: MESSAGES_TABLE,
    Item:      item,
  }));

  // roomId-index GSI로 같은 방 접속자 전체 조회
  // Scan 대신 Query + GSI 사용 (효율적)
  const response = await dynamoDb.send(new QueryCommand({
    TableName:                 CONNECTIONS_TABLE,
    IndexName:                 "roomId-index",
    KeyConditionExpression:    "roomId = :roomId",
    ExpressionAttributeValues: { ":roomId": roomId },
  }));

  const connections = response.Items || [];

  // 같은 방 모든 접속자에게 동시 브로드캐스트 (Promise.all = 병렬 처리)
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
// Python: def lambda_handler(event, context)
// routeKey로 어떤 동작인지 분기
// =========================
module.exports.handler = async (event) => {
  const routeKey = event.requestContext.routeKey;

  try {
    if (routeKey === "$connect")    return await onConnect(event);
    if (routeKey === "$disconnect") return await onDisconnect(event);

    // $connect/$disconnect 외의 라우트는 body 파싱 필요
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
