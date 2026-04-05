const { DynamoDBClient }         = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient } = require("@aws-sdk/lib-dynamodb");
const config                     = require("./config");

// 로컬: LocalStack endpoint 명시 / 운영: 기본 AWS 연결
const rawClient = config.IS_OFFLINE
  ? new DynamoDBClient({
      region:      config.REGION,
      endpoint:    config.DB_ENDPOINT,
      credentials: { accessKeyId: "test", secretAccessKey: "test" },
    })
  : new DynamoDBClient({ region: config.REGION });

// DynamoDBDocumentClient = Python boto3.resource() 와 동일
// 타입 변환(S, N, BOOL 등)을 자동 처리해줘서
// put 시 { userId: { S: "abc" } } 대신 { userId: "abc" } 형태로 사용 가능
const dynamoDb = DynamoDBDocumentClient.from(rawClient);

module.exports = dynamoDb;
