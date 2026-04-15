#!/bin/bash
# ============================================================
# Smart Study Messenger — REST API Gateway 설정 스크립트
# 사용법: cd backend && bash setup-api.sh
# ============================================================

set -e

REGION="us-east-1"
ACCOUNT_ID="269578498605"
STAGE="dev"
API_ID=$(aws apigateway get-rest-apis \
  --region "$REGION" \
  --query "items[?name=='smartstudy-dev-rest'].id" \
  --output text)
ROOT_ID=$(aws apigateway get-resources \
  --rest-api-id "$API_ID" \
  --region "$REGION" \
  --query "items[?path=='/'].id" \
  --output text)
PREFIX="smartstudy"

echo ""
echo "🔗 REST API Gateway 엔드포인트 설정 중..."
echo "   API ID: $API_ID"
echo "────────────────────────────────────────"

# ── 리소스 생성 함수 ──────────────────────────────────────
create_resource() {
  local PARENT="$1"
  local PART="$2"

  # 이미 존재하는지 확인
  local EXISTING
  EXISTING=$(aws apigateway get-resources --rest-api-id "$API_ID" --region "$REGION" \
    | jq -r ".items[] | select(.pathPart==\"$PART\" and .parentId==\"$PARENT\") | .id")

  if [ -n "$EXISTING" ]; then
    echo "$EXISTING"
  else
    aws apigateway create-resource \
      --rest-api-id "$API_ID" \
      --parent-id "$PARENT" \
      --path-part "$PART" \
      --region "$REGION" \
      | jq -r '.id'
  fi
}

# ── 엔드포인트 설정 함수 ──────────────────────────────────
setup_endpoint() {
  local RESOURCE_ID="$1"
  local METHOD="$2"
  local FUNC_NAME="$3"
  local PATH_PART="$4"
  local FUNC_ARN="arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:${FUNC_NAME}"

  # 
  aws apigateway put-method \
    --rest-api-id "$API_ID" \
    --resource-id "$RESOURCE_ID" \
    --http-method "$METHOD" \
    --authorization-type "NONE" \
    --region "$REGION" > /dev/null 2>&1 || true

  # Lambda 통합
  aws apigateway put-integration \
    --rest-api-id "$API_ID" \
    --resource-id "$RESOURCE_ID" \
    --http-method "$METHOD" \
    --type AWS_PROXY \
    --integration-http-method POST \
    --uri "arn:aws:apigateway:${REGION}:lambda:path/2015-03-31/functions/${FUNC_ARN}/invocations" \
    --region "$REGION" > /dev/null 2>&1

  # Lambda 호출 권한
  aws lambda add-permission \
    --function-name "$FUNC_NAME" \
    --statement-id "apigw-${METHOD}-$(date +%s)" \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:${REGION}:${ACCOUNT_ID}:${API_ID}/*/${METHOD}/${PATH_PART}" \
    --region "$REGION" > /dev/null 2>&1 || true

  echo "  ✅ $METHOD /$PATH_PART → $FUNC_NAME"
}

# ── CORS OPTIONS 설정 함수 ────────────────────────────────
setup_cors() {
  local RESOURCE_ID="$1"

  aws apigateway put-method \
    --rest-api-id "$API_ID" \
    --resource-id "$RESOURCE_ID" \
    --http-method OPTIONS \
    --authorization-type "NONE" \
    --region "$REGION" > /dev/null 2>&1 || true

  aws apigateway put-integration \
    --rest-api-id "$API_ID" \
    --resource-id "$RESOURCE_ID" \
    --http-method OPTIONS \
    --type MOCK \
    --request-templates '{"application/json":"{\"statusCode\":200}"}' \
    --region "$REGION" > /dev/null 2>&1 || true

  aws apigateway put-method-response \
    --rest-api-id "$API_ID" \
    --resource-id "$RESOURCE_ID" \
    --http-method OPTIONS \
    --status-code 200 \
    --response-parameters '{"method.response.header.Access-Control-Allow-Headers":false,"method.response.header.Access-Control-Allow-Methods":false,"method.response.header.Access-Control-Allow-Origin":false}' \
    --region "$REGION" > /dev/null 2>&1 || true

  aws apigateway put-integration-response \
    --rest-api-id "$API_ID" \
    --resource-id "$RESOURCE_ID" \
    --http-method OPTIONS \
    --status-code 200 \
    --response-parameters "{\"method.response.header.Access-Control-Allow-Headers\":\"'Content-Type,Authorization'\",\"method.response.header.Access-Control-Allow-Methods\":\"'GET,POST,PUT,DELETE,OPTIONS'\",\"method.response.header.Access-Control-Allow-Origin\":\"'*'\"}" \
    --region "$REGION" > /dev/null 2>&1 || true
}

# ── 리소스 생성 ───────────────────────────────────────────
echo ""
echo "📁 리소스 생성..."

ROOMS_ID=$(create_resource "$ROOT_ID" "rooms")
echo "  /rooms → $ROOMS_ID"

REGISTER_ID=$(create_resource "$ROOT_ID" "userRegister")
echo "  /userRegister → $REGISTER_ID"

LOGIN_ID=$(create_resource "$ROOT_ID" "userLogin")
echo "  /userLogin → $LOGIN_ID"

LOGOUT_ID=$(create_resource "$ROOT_ID" "userLogout")
echo "  /userLogout → $LOGOUT_ID"

TOKEN_ID=$(create_resource "$ROOT_ID" "token")
echo "  /token → $TOKEN_ID"

REFRESH_ID=$(create_resource "$TOKEN_ID" "refresh")
echo "  /token/refresh → $REFRESH_ID"

ROOM_ID_PARAM_ID=$(create_resource "$ROOMS_ID" "{roomId}")
echo "  /rooms/{roomId} → $ROOM_ID_PARAM_ID"

CHANNELS_ID=$(create_resource "$ROOM_ID_PARAM_ID" "channels")
echo "  /rooms/{roomId}/channels → $CHANNELS_ID"

CH_ID_PARAM_ID=$(create_resource "$CHANNELS_ID" "{chId}")
echo "  /rooms/{roomId}/channels/{chId} → $CH_ID_PARAM_ID"

RESOURCES_ROOT_ID=$(create_resource "$ROOT_ID" "resources")
echo "  /resources → $RESOURCES_ROOT_ID"

UPLOAD_URL_ID=$(create_resource "$RESOURCES_ROOT_ID" "upload-url")
echo "  /resources/upload-url → $UPLOAD_URL_ID"

MESSAGES_ID=$(create_resource "$ROOM_ID_PARAM_ID" "messages")
echo "  /rooms/{roomId}/messages → $MESSAGES_ID"

FILES_ID=$(create_resource "$ROOM_ID_PARAM_ID" "files")
echo "  /rooms/{roomId}/files → $FILES_ID"

LINKS_ID=$(create_resource "$ROOM_ID_PARAM_ID" "links")
echo "  /rooms/{roomId}/links → $LINKS_ID"

AI_ROOT_ID=$(create_resource "$ROOT_ID" "ai")
echo "  /ai → $AI_ROOT_ID"

ANALYZE_ID=$(create_resource "$AI_ROOT_ID" "analyze")
echo "  /ai/analyze → $ANALYZE_ID"

# ── 메서드 + Lambda 연결 ──────────────────────────────────
echo ""
echo "🔗 Lambda 연결..."

setup_endpoint "$ROOMS_ID"    "POST"   "${PREFIX}-${STAGE}-createRoom"    "rooms"
setup_endpoint "$ROOMS_ID"    "GET"    "${PREFIX}-${STAGE}-getRooms"      "rooms"
setup_endpoint "$REGISTER_ID" "POST"   "${PREFIX}-${STAGE}-userRegister"  "userRegister"
setup_endpoint "$LOGIN_ID"    "POST"   "${PREFIX}-${STAGE}-userLogin"     "userLogin"
setup_endpoint "$LOGOUT_ID"   "DELETE" "${PREFIX}-${STAGE}-userLogout"    "userLogout"
setup_endpoint "$REFRESH_ID"  "POST"   "${PREFIX}-${STAGE}-tokenRefresh"  "token/refresh"
setup_endpoint "$CHANNELS_ID"  "POST"   "${PREFIX}-${STAGE}-addChannel"    "rooms/{roomId}/channels"
setup_endpoint "$CH_ID_PARAM_ID" "DELETE" "${PREFIX}-${STAGE}-deleteChannel" "rooms/{roomId}/channels/{chId}"
setup_endpoint "$UPLOAD_URL_ID" "GET"    "${PREFIX}-${STAGE}-getUploadUrl"  "resources/upload-url"
setup_endpoint "$ROOM_ID_PARAM_ID" "GET"  "${PREFIX}-${STAGE}-getRoomDetail"    "rooms/{roomId}"
setup_endpoint "$MESSAGES_ID"      "GET"  "${PREFIX}-${STAGE}-getMessages"      "rooms/{roomId}/messages"
setup_endpoint "$FILES_ID"         "POST" "${PREFIX}-${STAGE}-saveFileMetadata" "rooms/{roomId}/files"
setup_endpoint "$LINKS_ID"         "POST" "${PREFIX}-${STAGE}-saveLink"         "rooms/{roomId}/links"
setup_endpoint "$ROOM_ID_PARAM_ID" "DELETE" "${PREFIX}-${STAGE}-deleteRoom" "rooms/{roomId}"
setup_endpoint "$ANALYZE_ID"       "POST" "${PREFIX}-${STAGE}-aiRouter"         "ai/analyze"

# ── CORS 설정 ─────────────────────────────────────────────
echo ""
echo "🌐 CORS 설정..."

setup_cors "$ROOMS_ID"
setup_cors "$REGISTER_ID"
setup_cors "$LOGIN_ID"
setup_cors "$LOGOUT_ID"
setup_cors "$REFRESH_ID"
setup_cors "$CHANNELS_ID"
setup_cors "$CH_ID_PARAM_ID"
setup_cors "$UPLOAD_URL_ID"
setup_cors "$ROOM_ID_PARAM_ID"
setup_cors "$MESSAGES_ID"
setup_cors "$FILES_ID"
setup_cors "$LINKS_ID"
setup_cors "$ANALYZE_ID"

echo "  ✅ CORS OPTIONS 설정 완료"

# ── API 배포 ──────────────────────────────────────────────
echo ""
echo "🚀 API 배포 (stage: $STAGE)..."

aws apigateway create-deployment \
  --rest-api-id "$API_ID" \
  --stage-name "$STAGE" \
  --region "$REGION" > /dev/null

REST_URL="https://${API_ID}.execute-api.${REGION}.amazonaws.com/${STAGE}"

echo ""
echo "════════════════════════════════════════"
echo "🎉 REST API 배포 완료!"
echo ""
echo "📌 Base URL: $REST_URL"
echo ""
echo "   POST   $REST_URL/rooms          → createRoom"
echo "   GET    $REST_URL/rooms          → getRooms"
echo "   POST   $REST_URL/userRegister   → userRegister"
echo "   POST   $REST_URL/userLogin      → userLogin"
echo "   DELETE $REST_URL/userLogout     → userLogout"
echo "   POST   $REST_URL/token/refresh  → tokenRefresh"
echo ""
echo "════════════════════════════════════════"