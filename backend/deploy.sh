#!/bin/bash
# ============================================================
# Smart Study Messenger — AWS CLI 배포 스크립트
# Serverless Framework 대신 AWS CLI로 Lambda 배포
# 사용법: cd backend && bash deploy.sh
# ============================================================

set -e

# ── 설정 ──────────────────────────────────────────────────
REGION="us-east-1"
ROLE_ARN="arn:aws:iam::269578498605:role/SafeRole-inhatc-team3"
RUNTIME="nodejs18.x"
PREFIX="smartstudy"
STAGE="dev"
TIMEOUT=30
MEMORY=256
S3_BUCKET="inhatc-team3-2-deployments"
S3_KEY="lambda-deploy.zip"

# 환경변수 (SSM에서 가져오기)
JWT_SECRET=$(aws ssm get-parameter --name /smartstudy/dev/jwt-secret-key --with-decryption --query "Parameter.Value" --output text --region $REGION 2>/dev/null || echo "PLACEHOLDER")
SALT=$(aws ssm get-parameter --name /smartstudy/dev/salt --with-decryption --query "Parameter.Value" --output text --region $REGION 2>/dev/null || echo "PLACEHOLDER")

ENV_VARS="{
  \"Variables\": {
    \"REGION\": \"$REGION\",
    \"JWT_SECRET_KEY\": \"$JWT_SECRET\",
    \"SALT\": \"$SALT\",
    \"HASHING_ALGORITHM\": \"HS256\",
    \"USERS_TABLE\": \"${PREFIX}-Users\",
    \"ROOMS_TABLE\": \"${PREFIX}-Rooms\",
    \"CONNECTIONS_TABLE\": \"${PREFIX}-Connections\",
    \"MESSAGES_TABLE\": \"${PREFIX}-Messages\",
    \"REFRESH_TOKENS_TABLE\": \"${PREFIX}-RefreshTokens\",
    \"RESOURCES_BUCKET\": \"inhatc-team3-2-resources\"
  }
}"

# Lambda 함수 정의: 이름|핸들러
FUNCTIONS=(
  "${PREFIX}-${STAGE}-createRoom|src/rooms/createRoom.handler"
  "${PREFIX}-${STAGE}-getRooms|src/rooms/getRooms.handler"
  "${PREFIX}-${STAGE}-userRegister|src/auth/userRegister.handler"
  "${PREFIX}-${STAGE}-userLogin|src/auth/userLogin.handler"
  "${PREFIX}-${STAGE}-userLogout|src/auth/userLogout.handler"
  "${PREFIX}-${STAGE}-tokenRefresh|src/auth/tokenRefresh.handler"
  "${PREFIX}-${STAGE}-chatHandler|src/chat/chatHandler.handler"
  "${PREFIX}-${STAGE}-addChannel|src/rooms/addChannel.handler"
  "${PREFIX}-${STAGE}-deleteChannel|src/rooms/deleteChannel.handler"
  "${PREFIX}-${STAGE}-getUploadUrl|src/resources/getUploadUrl.handler"
  "${PREFIX}-${STAGE}-saveFileMetadata|src/resources/saveFileMetadata.handler"
  "${PREFIX}-${STAGE}-aiRouter|src/ai/aiRouter.handler"
  "${PREFIX}-${STAGE}-saveLink|src/resources/saveLink.handler"
)

# ── 1단계: 코드 패키징 + S3 업로드 ────────────────────────
echo ""
echo "📦 1단계: Lambda 배포 패키지 생성 및 S3 업로드..."
echo "────────────────────────────────────────"

rm -f /tmp/lambda-deploy.zip

zip -r /tmp/lambda-deploy.zip \
  src/ \
  node_modules/ \
  package.json \
  -x "*.git*" \
  -x "infra/*" \
  -x "deploy.sh" \
  -x ".env" \
  -x "serverless.yml" \
  -q

ZIP_SIZE=$(du -h /tmp/lambda-deploy.zip | cut -f1)
echo "  패키지: ${ZIP_SIZE}"

aws s3 cp /tmp/lambda-deploy.zip "s3://${S3_BUCKET}/${S3_KEY}" --region "$REGION" --quiet
echo "✅ S3 업로드 완료 (s3://${S3_BUCKET}/${S3_KEY})"

# ── 2단계: Lambda 함수 생성/업데이트 ──────────────────────
echo ""
echo "🚀 2단계: Lambda 함수 배포 중..."
echo "────────────────────────────────────────"

for FUNC_DEF in "${FUNCTIONS[@]}"; do
  FUNC_NAME="${FUNC_DEF%%|*}"
  HANDLER="${FUNC_DEF##*|}"

  if aws lambda get-function --function-name "$FUNC_NAME" --region "$REGION" &>/dev/null; then
    echo "  🔄 업데이트: $FUNC_NAME"
    aws lambda update-function-code \
      --function-name "$FUNC_NAME" \
      --s3-bucket "$S3_BUCKET" \
      --s3-key "$S3_KEY" \
      --region "$REGION" \
      --no-cli-pager > /dev/null

    aws lambda wait function-updated --function-name "$FUNC_NAME" --region "$REGION" 2>/dev/null || sleep 5

    aws lambda update-function-configuration \
      --function-name "$FUNC_NAME" \
      --handler "$HANDLER" \
      --runtime "$RUNTIME" \
      --role "$ROLE_ARN" \
      --timeout "$TIMEOUT" \
      --memory-size "$MEMORY" \
      --environment "$ENV_VARS" \
      --region "$REGION" \
      --no-cli-pager > /dev/null
  else
    echo "  🆕 생성:   $FUNC_NAME"
    aws lambda create-function \
      --function-name "$FUNC_NAME" \
      --runtime "$RUNTIME" \
      --handler "$HANDLER" \
      --role "$ROLE_ARN" \
      --code "S3Bucket=${S3_BUCKET},S3Key=${S3_KEY}" \
      --timeout "$TIMEOUT" \
      --memory-size "$MEMORY" \
      --environment "$ENV_VARS" \
      --region "$REGION" \
      --no-cli-pager > /dev/null

    aws lambda wait function-active --function-name "$FUNC_NAME" --region "$REGION" 2>/dev/null || sleep 5
  fi
done

echo ""
echo "✅ Lambda 함수 ${#FUNCTIONS[@]}개 배포 완료!"

# ── 3단계: 배포 결과 확인 ─────────────────────────────────
echo ""
echo "📋 3단계: 배포 결과 확인"
echo "────────────────────────────────────────"

for FUNC_DEF in "${FUNCTIONS[@]}"; do
  FUNC_NAME="${FUNC_DEF%%|*}"
  STATE=$(aws lambda get-function --function-name "$FUNC_NAME" --region "$REGION" --query "Configuration.State" --output text 2>/dev/null || echo "ERROR")
  echo "  ✅ $FUNC_NAME → $STATE"
done

rm -f /tmp/lambda-deploy.zip

echo ""
echo "════════════════════════════════════════"
echo "🎉 배포 완료!"
echo ""
echo "⚠️  API Gateway 연동은 AWS 콘솔에서 수동 설정 필요:"
echo "   1. API Gateway → REST API 생성"
echo "   2. 각 Lambda 함수를 엔드포인트에 연결"
echo "   3. WebSocket API 생성 후 chatHandler 연결"
echo "   4. API 배포 (Deploy to stage: dev)"
echo "════════════════════════════════════════"
