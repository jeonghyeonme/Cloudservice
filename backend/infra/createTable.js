// backend/infra/createTable.js
// Python: test/create_table.py 변환
// 실행: node infra/createTable.js

const {
  DynamoDBClient,
  CreateTableCommand,
  UpdateTableCommand,
  UpdateTimeToLiveCommand,
  DescribeTableCommand,
} = require("@aws-sdk/client-dynamodb");

// LocalStack 연결 (Python: boto3.client('dynamodb', endpoint_url=...))
const client = new DynamoDBClient({
  region:   "ap-northeast-1",
  endpoint: "http://localhost:4566",
  credentials: { accessKeyId: "test", secretAccessKey: "test" },
});

// sleep 유틸 (Python: time.sleep(2))
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));


// =========================
// 1. Users 테이블
// =========================
async function createUsersTable() {
  await client.send(new CreateTableCommand({
    TableName: "Users",
    KeySchema: [
      { AttributeName: "userId", KeyType: "HASH" },
    ],
    AttributeDefinitions: [
      { AttributeName: "userId", AttributeType: "S" },
    ],
    BillingMode: "PAY_PER_REQUEST",
  }));
  console.log("✅ Users 테이블 생성 완료");
}


// =========================
// 2. Rooms 테이블 (GSI + TTL 포함)
// =========================
async function createRoomsTable() {
  await client.send(new CreateTableCommand({
    TableName: "Rooms",
    KeySchema: [
      { AttributeName: "roomId", KeyType: "HASH" },
    ],
    AttributeDefinitions: [
      { AttributeName: "roomId",    AttributeType: "S" },
      { AttributeName: "status",    AttributeType: "S" },
      { AttributeName: "createdAt", AttributeType: "S" },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "status-createdAt-index",
        KeySchema: [
          { AttributeName: "status",    KeyType: "HASH"  },
          { AttributeName: "createdAt", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
      },
    ],
    BillingMode: "PAY_PER_REQUEST",
  }));

  await client.send(new UpdateTimeToLiveCommand({
    TableName: "Rooms",
    TimeToLiveSpecification: { Enabled: true, AttributeName: "expiresAt" },
  }));

  console.log("✅ Rooms 테이블 생성 + TTL 설정 완료");
}


// =========================
// 3. Connections 테이블 (GSI + TTL 포함)
// =========================
async function createConnectionsTable() {
  await client.send(new CreateTableCommand({
    TableName: "Connections",
    KeySchema: [
      { AttributeName: "connectionId", KeyType: "HASH" },
    ],
    AttributeDefinitions: [
      { AttributeName: "connectionId", AttributeType: "S" },
      { AttributeName: "roomId",       AttributeType: "S" },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "roomId-index",
        KeySchema: [
          { AttributeName: "roomId", KeyType: "HASH" },
        ],
        Projection: { ProjectionType: "ALL" },
      },
    ],
    BillingMode: "PAY_PER_REQUEST",
  }));

  await client.send(new UpdateTimeToLiveCommand({
    TableName: "Connections",
    TimeToLiveSpecification: { Enabled: true, AttributeName: "expiresAt" },
  }));

  console.log("✅ Connections 테이블 생성 + TTL 설정 완료");
}


// =========================
// 4. Messages 테이블
// =========================
async function createMessagesTable() {
  await client.send(new CreateTableCommand({
    TableName: "Messages",
    KeySchema: [
      { AttributeName: "roomId",    KeyType: "HASH"  },
      { AttributeName: "messageId", KeyType: "RANGE" },
    ],
    AttributeDefinitions: [
      { AttributeName: "roomId",    AttributeType: "S" },
      { AttributeName: "messageId", AttributeType: "S" },
    ],
    BillingMode: "PAY_PER_REQUEST",
  }));

  console.log("✅ Messages 테이블 생성 완료");
}


// =========================
// 5. RefreshTokens 테이블 (TTL 포함)
// =========================
async function createRefreshTokensTable() {
  await client.send(new CreateTableCommand({
    TableName: "RefreshTokens",
    KeySchema: [
      { AttributeName: "userId",       KeyType: "HASH"  },
      { AttributeName: "refreshToken", KeyType: "RANGE" },
    ],
    AttributeDefinitions: [
      { AttributeName: "userId",       AttributeType: "S" },
      { AttributeName: "refreshToken", AttributeType: "S" },
    ],
    BillingMode: "PAY_PER_REQUEST",
  }));

  await client.send(new UpdateTimeToLiveCommand({
    TableName: "RefreshTokens",
    TimeToLiveSpecification: { Enabled: true, AttributeName: "expiresAt" },
  }));

  console.log("✅ RefreshTokens 테이블 생성 + TTL 설정 완료");
}


// =========================
// 6. Users GSI 추가 (email-index)
// Python: dynamodb.update_table(...) + while 루프로 ACTIVE 대기
// =========================
async function addEmailGSI() {
  await client.send(new UpdateTableCommand({
    TableName: "Users",
    AttributeDefinitions: [
      { AttributeName: "email", AttributeType: "S" },
    ],
    GlobalSecondaryIndexUpdates: [
      {
        Create: {
          IndexName: "email-index",
          KeySchema: [
            { AttributeName: "email", KeyType: "HASH" },
          ],
          Projection: { ProjectionType: "ALL" },
        },
      },
    ],
  }));

  console.log("⏳ Users GSI (email-index) 생성 중...");

  // Python: while True: time.sleep(2) → status == 'ACTIVE'이면 break
  while (true) {
    const desc   = await client.send(new DescribeTableCommand({ TableName: "Users" }));
    const gsiList = desc.Table.GlobalSecondaryIndexes || [];
    const gsi     = gsiList.find((g) => g.IndexName === "email-index");
    const status  = gsi?.IndexStatus;

    console.log("GSI 상태:", status);

    if (status === "ACTIVE") break;

    await sleep(2000); // Python: time.sleep(2)
  }

  console.log("✅ Users GSI (email-index) 생성 완료");
}


// =========================
// 전체 실행
// =========================
async function run() {
  console.log("\n🚀 모든 테이블 생성을 시작합니다...\n");

  try {
    await createUsersTable();
    await createRoomsTable();
    await createConnectionsTable();
    await createMessagesTable();
    await createRefreshTokensTable();

    console.log("\n✅ 모든 테이블 생성 요청 완료\n");

    await addEmailGSI();

    console.log("\n🎉 모든 설정이 완료되었습니다!\n");

  } catch (error) {
    // 이미 테이블이 존재하는 경우 무시
    if (error.name === "ResourceInUseException") {
      console.log("⚠️  이미 존재하는 테이블이 있습니다. 스킵합니다.");
    } else {
      console.error("❌ 에러 발생:", error.message);
    }
  }
}

run();
