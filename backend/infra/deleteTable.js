const { DynamoDBClient, DeleteTableCommand } = require("@aws-sdk/client-dynamodb");

// LocalStack 설정 (us-east-1)
const client = new DynamoDBClient({
  region: "us-east-1",
  endpoint: "http://localhost:4566",
  credentials: { accessKeyId: "test", secretAccessKey: "test" },
});

/**
 * 특정 테이블을 삭제하는 함수
 */
async function deleteTable(tableName) {
  try {
    await client.send(new DeleteTableCommand({ TableName: tableName }));
    console.log(`✅ ${tableName} 테이블 삭제 완료`);
  } catch (error) {
    if (error.name === "ResourceNotFoundException") {
      console.log(`⚠️  ${tableName} 테이블이 존재하지 않아 스킵합니다.`);
    } else {
      console.error(`❌ ${tableName} 삭제 중 에러 발생:`, error.message);
    }
  }
}

/**
 * 전체 테이블 삭제 실행
 */
async function run() {
  console.log("🚀 테이블 삭제를 시작합니다...");
  
  const tables = [
    "smartstudy-Users", 
    "smartstudy-Rooms", 
    "smartstudy-Connections", 
    "smartstudy-Messages", 
    "smartstudy-RefreshTokens"
  ];
  
  for (const table of tables) {
    await deleteTable(table);
  }
  
  console.log("\n🎉 모든 테이블 삭제 요청이 완료되었습니다!");
}

run();
