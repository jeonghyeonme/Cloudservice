#!/bin/bash
# ========================================================
# Smart Study Messenger — Lambda 배포 스크립트
# AWS CLI 직접 호출 방식 (Serverless Framework/CloudFormation 미사용)
# ========================================================

set -e

PREFIX="smartstudy"
STAGE="dev"
REGION="us-east-1"
ROLE_ARN="arn:aws:iam::269578498605:role/SafeRole-inhatc-team3"
S3_BUCKET="inhatc-team3-2-deployments"
S3_KEY="lambda-deploy.zip"
RUNTIME="nodejs18.x"
TIMEOUT=30
MEMORY=512

# ── 공통 환경 변수 ─────────────────────────────────────
ENV_VARS="{
  \"Variables\": {
    \"REGION\":               \"${REGION}\",
    \"USERS_TABLE\":          \"${PREFIX}-Users\",
    \"SERVERS_TABLE\":        \"${PREFIX}-Servers\",
    \"CONNECTIONS_TABLE\":    \"${PREFIX}-Connections\",
    \"MESSAGES_TABLE\":       \"${PREFIX}-Messages\",
    \"REFRESH_TOKENS_TABLE\": \"${PREFIX}-RefreshTokens\",
    \"SERVER_MEMBERS_TABLE\": \"${PREFIX}-ServerMembers\",
    \"RESOURCES_BUCKET\":     \"inhatc-team3-2-resources\",
    \"S3_BUCKET\":            \"inhatc-team3-2-resources\",
    \"JWT_SECRET_KEY\":       \"PLACEHOLDER\",
    \"SALT\":                 \"PLACEHOLDER\"
  }
}"

# ── Lambda 함수 목록 (이름|핸들러) ─────────────────────
FUNCTIONS=(
  "${PREFIX}-${STAGE}-createServer|src/servers/createServer.handler"
  "${PREFIX}-${STAGE}-getServers|src/servers/getServers.handler"
  "${PREFIX}-${STAGE}-getServerDetail|src/servers/getServerDetail.handler"
  "${PREFIX}-${STAGE}-userRegister|src/auth/userRegister.handler"
  "${PREFIX}-${STAGE}-userLogin|src/auth/userLogin.handler"
  "${PREFIX}-${STAGE}-userLogout|src/auth/userLogout.handler"
  "${PREFIX}-${STAGE}-tokenRefresh|src/auth/tokenRefresh.handler"
  "${PREFIX}-${STAGE}-getMessages|src/chat/getMessages.handler"
  "${PREFIX}-${STAGE}-chatHandler|src/chat/chatHandler.handler"
  "${PREFIX}-${STAGE}-addChannel|src/servers/addChannel.handler"
  "${PREFIX}-${STAGE}-deleteChannel|src/servers/deleteChannel.handler"
  "${PREFIX}-${STAGE}-getUploadUrl|src/resources/getUploadUrl.handler"
  "${PREFIX}-${STAGE}-saveFileMetadata|src/resources/saveFileMetadata.handler"
  "${PREFIX}-${STAGE}-aiRouter|src/ai/aiRouter.handler"
  "${PREFIX}-${STAGE}-saveLink|src/resources/saveLink.handler"
  "${PREFIX}-${STAGE}-deleteServer|src/servers/deleteServer.handler"
  "${PREFIX}-${STAGE}-joinServer|src/servers/joinServer.handler"
  "${PREFIX}-${STAGE}-getMyServers|src/servers/getMyServers.handler"
  "${PREFIX}-${STAGE}-deleteFile|src/resources/deleteFile.handler"
  "${PREFIX}-${STAGE}-deleteLink|src/resources/deleteLink.handler"
  "${PREFIX}-${STAGE}-updateServer|src/servers/updateServer.handler"
  "${PREFIX}-${STAGE}-leaveServer|src/servers/leaveServer.handler"
  "${PREFIX}-${STAGE}-updateChannel|src/servers/updateChannel.handler"
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

for entry in "${FUNCTIONS[@]}"; do
  FUNC_NAME="${entry%%|*}"
  HANDLER="${entry##*|}"

  EXISTING=$(aws lambda get-function --function-name "$FUNC_NAME" --region "$REGION" --no-cli-pager 2>&1 || true)

  if echo "$EXISTING" | grep -q "ResourceNotFoundException"; then
    echo "  🆕 생성: $FUNC_NAME"
    aws lambda create-function \
      --function-name "$FUNC_NAME" \
      --runtime "$RUNTIME" \
      --role "$ROLE_ARN" \
      --handler "$HANDLER" \
      --code "S3Bucket=${S3_BUCKET},S3Key=${S3_KEY}" \
      --timeout "$TIMEOUT" \
      --memory-size "$MEMORY" \
      --environment "$ENV_VARS" \
      --architectures arm64 \
      --region "$REGION" \
      --no-cli-pager > /dev/null
  else
    echo "  🔄 업데이트: $FUNC_NAME"
    aws lambda update-function-code \
      --function-name "$FUNC_NAME" \
      --s3-bucket "$S3_BUCKET" \
      --s3-key "$S3_KEY" \
      --region "$REGION" \
      --no-cli-pager > /dev/null

    sleep 1

    aws lambda update-function-configuration \
      --function-name "$FUNC_NAME" \
      --handler "$HANDLER" \
      --environment "$ENV_VARS" \
      --timeout "$TIMEOUT" \
      --memory-size "$MEMORY" \
      --region "$REGION" \
      --no-cli-pager > /dev/null 2>&1 || true
  fi
done

echo "✅ Lambda 함수 ${#FUNCTIONS[@]}개 배포 완료!"

# ── 3단계: 배포 확인 ─────────────────────────────────────
echo ""
echo "📋 3단계: 배포 결과 확인"
echo "────────────────────────────────────────"

for entry in "${FUNCTIONS[@]}"; do
  FUNC_NAME="${entry%%|*}"
  STATE=$(aws lambda get-function --function-name "$FUNC_NAME" --region "$REGION" --no-cli-pager 2>/dev/null \
    | jq -r '.Configuration.State' 2>/dev/null || echo "NOT_FOUND")
  echo "  ✅ ${FUNC_NAME} → ${STATE}"
done

echo ""
echo "════════════════════════════════════════"
echo "🎉 배포 완료!"
echo "⚠️  API Gateway 연동은 setup-api.sh 실행 필요"
echo "════════════════════════════════════════"
