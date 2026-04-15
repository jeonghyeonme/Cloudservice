const {
  DynamoDBClient,
  CreateTableCommand,
  UpdateTableCommand,
  UpdateTimeToLiveCommand,
  DescribeTableCommand,
} = require("@aws-sdk/client-dynamodb");

// LocalStack 연결
// Python: boto3.client('dynamodb', endpoint_url='http://localhost:4566')
// const client = new DynamoDBClient({
//   region:   "us-east-1",
// });

const client = new DynamoDBClient({
  region: "us-east-1",
  // 1. 도커로 실행 중인 로컬 주소를 지정합니다. (보통 LocalStack은 4566, DynamoDB Local은 8000)
  endpoint: "http://localhost:4566", 
  
  // 2. 로컬에서는 실제 키가 필요 없으므로 아무 값이나 넣어줍니다. (안 넣으면 에러 날 수 있음)
  credentials: {
    accessKeyId: "local",
    secretAccessKey: "local",
  },
});

// sleep 유틸 (Python: time.sleep(2))
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));


// =========================
// 1. Users 테이블
// PK: userId / GSI: email-index (email로 조회 시 사용)
// ⚠️ GSI는 CreateTable 시 포함 불가 → 아래 addEmailGSI()에서 별도 추가
// =========================
async function createUsersTable() {
  // Python: dynamodb.create_table(TableName='Users', ...)
  await client.send(new CreateTableCommand({
    TableName: "smartstudy-Users",
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
// 2. Rooms 테이블
// PK: roomId / GSI: status-createdAt-index (방 목록 최신순 조회)
// TTL: expiresAt (24시간 후 자동 삭제)
// status는 GSI 키라 String 타입 사용 ("ACTIVE")
// =========================
async function createRoomsTable() {
  await client.send(new CreateTableCommand({
    TableName: "smartstudy-Rooms",
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
        // Python: GSI 설정도 boto3와 동일한 구조, 키 이름만 camelCase로 변경
        IndexName: "status-createdAt-index",
        KeySchema: [
          { AttributeName: "status",    KeyType: "HASH"  }, // GSI-PK
          { AttributeName: "createdAt", KeyType: "RANGE" }, // GSI-SK (최신순 정렬)
        ],
        Projection: { ProjectionType: "ALL" },
      },
    ],
    BillingMode: "PAY_PER_REQUEST",
  }));

  // TTL 활성화 — Python: update_time_to_live(...)
  await client.send(new UpdateTimeToLiveCommand({
    TableName: "smartstudy-Rooms",
    TimeToLiveSpecification: { Enabled: true, AttributeName: "expiresAt" },
  }));

  console.log("✅ Rooms 테이블 생성 + TTL 설정 완료");
}


// =========================
// 3. Connections 테이블
// PK: connectionId / GSI: roomId-index (방별 접속자 조회 → 브로드캐스트)
// TTL: expiresAt (1시간 후 자동 삭제)
// =========================
async function createConnectionsTable() {
  await client.send(new CreateTableCommand({
    TableName: "smartstudy-Connections",
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
    TableName: "smartstudy-Connections",
    TimeToLiveSpecification: { Enabled: true, AttributeName: "expiresAt" },
  }));

  console.log("✅ Connections 테이블 생성 + TTL 설정 완료");
}


// =========================
// 4. Messages 테이블
// PK: roomId (방별 파티션) / SK: messageId (메시지 고유 ID)
// =========================
async function createMessagesTable() {
  await client.send(new CreateTableCommand({
    TableName: "smartstudy-Messages",
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
// 5. RefreshTokens 테이블
// PK: userId / SK: refreshToken
// → 한 유저가 여러 기기에서 로그인해도 토큰이 각각 저장됨 (멀티 기기 지원)
// TTL: expiresAt (7일 후 자동 삭제)
// =========================
async function createRefreshTokensTable() {
  await client.send(new CreateTableCommand({
    TableName: "smartstudy-RefreshTokens",
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
    TableName: "smartstudy-RefreshTokens",
    TimeToLiveSpecification: { Enabled: true, AttributeName: "expiresAt" },
  }));

  console.log("✅ RefreshTokens 테이블 생성 + TTL 설정 완료");
}


// =========================
// 6. Users 테이블에 email-index GSI 추가
// CreateTable 시 email 컬럼이 없어서 별도로 추가해야 함
// Python: dynamodb.update_table(...) + while 루프로 ACTIVE 대기
// =========================
async function addEmailGSI() {
  await client.send(new UpdateTableCommand({
    TableName: "smartstudy-Users",
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

  // GSI 생성 완료까지 폴링 (Python: while True: time.sleep(2))
  while (true) {
    const desc   = await client.send(new DescribeTableCommand({ TableName: "smartstudy-Users" }));
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
