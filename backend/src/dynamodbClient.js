const { DynamoDBClient }         = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient } = require("@aws-sdk/lib-dynamodb");
const config                     = require("./config");

// 로컬(LocalStack)이면 endpoint 명시, 운영이면 기본 AWS 연결
const rawClient = config.IS_OFFLINE
  ? new DynamoDBClient({
      region:      config.REGION,
      endpoint:    config.DB_ENDPOINT,
      credentials: { accessKeyId: "test", secretAccessKey: "test" },
    })
  : new DynamoDBClient({ region: config.REGION });

// DocumentClient = Python boto3.resource() 와 동일
// 타입 변환(S, N, BOOL 등)을 자동으로 처리해줌
const dynamoDb = DynamoDBDocumentClient.from(rawClient);

module.exports = dynamoDb;
