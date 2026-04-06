const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");

// LocalStack 설정 (us-east-1)
const client = new DynamoDBClient({
  region: "us-east-1",
  endpoint: "http://localhost:4566",
  credentials: { accessKeyId: "test", secretAccessKey: "test" },
});

const docClient = DynamoDBDocumentClient.from(client);

// 1. 샘플 유저 데이터
const seedUsers = [
  {
    userId: "user-1",
    email: "test1@example.com",
    password: "hashedpassword1",
    nickname: "User One",
    createdAt: new Date().toISOString(),
  },
  {
    userId: "user-2",
    email: "test2@example.com",
    password: "hashedpassword2",
    nickname: "User Two",
    createdAt: new Date().toISOString(),
  },
];

// 2. 샘플 채팅방 데이터
const seedRooms = [
  {
    roomId: "room-1",
    title: "General Chat",
    description: "Welcome to the general chat room!",
    creatorId: "user-1",
    status: "ACTIVE",
    createdAt: new Date().toISOString(),
    expiresAt: Math.floor(Date.now() / 1000) + 86400, // 24시간 후 만료
  },
  {
    roomId: "room-2",
    title: "Tech Talk",
    description: "Discuss the latest tech news here.",
    creatorId: "user-2",
    status: "ACTIVE",
    createdAt: new Date().toISOString(),
    expiresAt: Math.floor(Date.now() / 1000) + 86400,
  },
];

// 3. 샘플 메시지 데이터
const seedMessages = [
  {
    roomId: "room-1",
    messageId: `msg-${Date.now()}-1`,
    senderId: "user-1",
    content: "Hello everyone!",
    createdAt: new Date().toISOString(),
  },
  {
    roomId: "room-1",
    messageId: `msg-${Date.now()}-2`,
    senderId: "user-2",
    content: "Hi User One!",
    createdAt: new Date().toISOString(),
  },
];

/**
 * 특정 테이블에 데이터를 삽입하는 함수
 */
async function seedTable(tableName, data) {
  for (const item of data) {
    try {
      await docClient.send(
        new PutCommand({
          TableName: tableName,
          Item: item,
        })
      );
      const id = item.userId || item.roomId || item.messageId;
      console.log(`✅ Seeded item into ${tableName}: ${id}`);
    } catch (error) {
      console.error(`❌ Error seeding into ${tableName}:`, error.message);
    }
  }
}

/**
 * 전체 시드 데이터 실행
 */
async function run() {
  console.log("🚀 시드 데이터 삽입을 시작합니다...");
  
  try {
    await seedTable("Users", seedUsers);
    await seedTable("Rooms", seedRooms);
    await seedTable("Messages", seedMessages);
    console.log("\n🎉 시드 데이터 삽입이 모두 완료되었습니다!");
  } catch (err) {
    console.error("\n❌ 시드 데이터 실행 중 오류 발생:", err.message);
  }
}

run();
