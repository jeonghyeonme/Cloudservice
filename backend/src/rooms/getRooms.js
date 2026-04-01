const AWS = require('aws-sdk');

// 로컬 오프라인(LocalStack) 환경과 실제 AWS 환경 자동 분기처리
const dynamoDb = process.env.IS_OFFLINE
  ? new AWS.DynamoDB.DocumentClient({
      region: 'localhost',
      endpoint: 'http://localhost:4566',
      accessKeyId: 'test',
      secretAccessKey: 'test',
    })
  : new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  try {
    const params = {
      TableName: process.env.ROOMS_TABLE,
    };

    // DB에서 모든 방 데이터 가져오기 (Scan)
    const result = await dynamoDb.scan(params).promise();

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*', // 프론트엔드 CORS 허용
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify(result.Items), // 가져온 데이터를 JSON 형태로 변환해서 응답
    };
  } catch (error) {
    console.error('DynamoDB Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: '방 목록을 불러오는 중 오류가 발생했습니다.' }),
    };
  }
};