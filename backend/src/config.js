// backend/src/config.js
// Python의 config.py + python-dotenv 역할
// process.env는 serverless.yml의 environment 블록에서 주입됨

const config = {
  // DynamoDB 관련
  DB_ENDPOINT: process.env.DB_ENDPOINT || "http://localhost:4566",
  REGION:      process.env.REGION      || "ap-northeast-1",

  // 암호화 관련
  SALT:               process.env.SALT               || "",
  JWT_SECRET_KEY:     process.env.JWT_SECRET_KEY     || "",
  HASHING_ALGORITHM:  process.env.HASHING_ALGORITHM  || "HS256",

  // S3 관련
  S3_BUCKET:   process.env.S3_BUCKET || "",
  get S3_BASE_URL() {
    return `https://${this.S3_BUCKET}.s3.amazonaws.com/`;
  },

  // 로컬/운영 분기 플래그 (serverless-offline 실행 시 자동으로 true)
  IS_OFFLINE: !!process.env.IS_OFFLINE,
};

module.exports = config;
