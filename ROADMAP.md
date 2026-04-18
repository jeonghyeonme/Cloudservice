# 🚀 프로젝트 현황 및 개발 로드맵 (2026-04-11)

본 문서는 현재까지 완료된 프론트엔드-백엔드 연동 현황을 분석하고, 향후 개발팀이 우선적으로 진행해야 할 기술적 과업과 UX 고도화 방향을 정의합니다.

---

## 1. 현재 기술적 현황 (Current Status)

### 1.1 데이터 및 백엔드 (Backend)
- **방(Room) 데이터 규격 통일**: `title`, `channels`, `files`, `links`를 포함한 확장형 스키마로 정립 완료.
- **조회 최적화**: `getRooms` API에 GSI(`status-createdAt-index`)를 적용하여 대량 데이터에서도 최신순 정렬 및 고속 조회가 가능함.
- **방 상세 및 이력 조회**: 특정 방의 모든 정보(`getRoomDetail`)와 채팅 히스토리(`getMessages`)를 가져오는 REST API 구축 완료.
- **인증(Auth)**: JWT 기반 Access/Refresh 토큰 시스템이 구현되어 있으며, 모든 테이블에 TTL(자동 삭제) 정책이 반영됨.

### 1.2 프론트엔드 (Frontend)
- **인증 자동화**: `request.js` 공통 모듈에서 `localStorage`의 토큰을 감지하여 `Authorization` 헤더를 자동으로 주입함. 별도의 토큰 관리 로직 없이 API 호출 가능.
- **데이터 바인딩 완료**: 채팅방 입장 시 상세 정보와 이전 메시지 내역을 병렬로 로드하여 실시간 채팅을 위한 초기 데이터 셋을 구성함.
- **UI 구조**: `ChatLayout` - `Sidebar` - `ChatWindow` 간의 데이터 흐름이 DB 구조와 일치하도록 매핑됨.

---

### 1.3 인프라 및 클라우드 대응 (Cloud & Infrastructure)
- **환경 변수 기반 설정 통합**: `config.js`를 통해 모든 보안 키와 인프라 주소를 `process.env`로 관리하며, 로컬/운영 환경에 따른 유연한 설정을 보장함.
- **DB 연결 최적화**: `dynamodbClient.js`에서 `IS_OFFLINE` 상태를 감지하여 LocalStack과 실제 AWS DynamoDB 엔드포인트를 자동으로 전환함.
- **API 엔드포인트 정규화**: `constants/endpoint.js`의 경로 생성 로직을 최적화하여 AWS API Gateway의 스테이지명(`/dev`) 중복 문제를 원천 해결함.
- **WebSocket 연동 체계**: `REACT_APP_WS_HOST` 환경 변수를 통한 `wss://` 프로토콜 대응 로직을 `endpoint.js`에 선제적으로 반영 완료.
- **SPA 라우팅 최적화**: S3 [오류 문서] 설정을 `index.html`로 지정하여 React Router 사용 시 발생하는 새로고침 404 에러를 인프라 레벨에서 해결함.

---

## 2. 향후 작업 지시 사항 (Action Items)

### [우선순위: 상] 실시간 기능 완성 (Real-time Phase)
1.  **WebSocket 연결 체계 구축 (Frontend Task)**: 
    - 서비스 전역 또는 `ChatLayout.js`에서 백엔드 WebSocket 엔드포인트에 연결할 것.
    - 연결 시점에 `joinRoom` 액션을 전송하여 특정 방의 실시간 메시지를 구독해야 함.
2.  **메시지 전송 UI-WebSocket 연동 (`ChatWindow.js`)**: 
    - **UI 로직 보완**: 현재 `input` 태그는 제어되지 않는 상태임. `useState`로 입력값을 관리하고, `onKeyDown` (Enter 키) 이벤트 핸들러를 추가할 것.
    - **전송 데이터 명세**: `sendMessage` 액션 호출 시 다음 JSON 구조를 전송할 것:
      ```json
      {
        "action": "sendMessage",
        "roomId": "현재_방_ID",
        "senderId": "내_유저_ID",
        "senderNickname": "내_닉네임",
        "messageType": "text",
        "content": "전송할_메시지_내용"
      }
      ```
    - **실시간 수신**: 서버에서 브로드캐스트되는 `receiveMessage` 액션을 감지하여 현재 활성화된 채널의 `messages` 배열에 즉시 추가(Push)하여 UI를 갱신할 것.
3.  **참여자 목록 및 상태 실시간 동기화 (`SidebarLeft.js`)**: 
    - **데이터 연동**: 왼쪽 사이드바 하단의 하드코딩된 멤버 목록을 제거하고, 현재 서버(방)에 참여 중인 실제 사용자 리스트(`members`)를 서버로부터 받아와 동적으로 렌더링할 것.
    - **온라인/오프라인 상태 관리**: 
        - WebSocket의 `$connect` 및 `$disconnect` 이벤트를 활용하여 사용자의 접속 상태를 실시간으로 감지할 것.
        - 온라인 사용자는 '온라인' 카테고리에 녹색 점(`status-dot`)과 함께 표시하고, 접속하지 않은 인원은 '오프라인' 카테고리로 자동 분류되도록 동기화 로직을 구현할 것.
    - **실시간 UI 갱신**: 다른 사용자가 접속하거나 나갈 때마다 브로드캐스트되는 상태 변경 이벤트를 수신하여, 별도의 새로고침 없이도 참여자 목록 UI가 즉시 업데이트되도록 처리할 것.

### [우선순위: 중] 콘텐츠 확장 (Resource Phase)
1.  **채널 관리(CRUD)**: 
    - 방 내부에 채널을 추가/삭제하는 기능을 구현할 것. (Rooms 테이블의 `channels` 리스트 필드 업데이트 로직 필요)
2.  **S3 파일 업로드**: 
    - `ResourceHub` 컴포넌트에서 실제 파일을 업로드할 수 있도록 S3 Pre-signed URL 로직을 백엔드에 추가하고 프론트엔드와 연동할 것.
3.  **URL 메타데이터 스크랩**: 
    - 사용자가 링크 공유 시 서버에서 해당 사이트의 OpenGraph 정보를 가져와 `links` 배열에 예쁘게 저장하는 람다 함수 추가 필요.

### [우선순위: 하] AI 지능화 (Intelligence Phase)
1.  **학습 요약(SAGE AI)**: 
    - `Messages` 이력을 바탕으로 AI가 요약을 생성하여 채팅창 상단 또는 특정 채널에 `type: 'ai-summary'` 메시지로 적재하는 로직 구현.

### [우선순위: 공통] UI/UX 고도화 및 구조 최적화 (Polishing Phase)
1.  **용어 표준화 (Server & Channel)**:
    - 메인 화면의 '방(Room)'을 **'서버(Server)'**로, 서버 내의 방을 **'채널(Channel)'**로 용어를 통일.
    - 프론트엔드 UI 및 백엔드 API/파일명에서 `room` 키워드를 `server`로 점진적으로 교체하여 개발 편의성 증대.
2.  **서버/채널 생성 기능 보완**:
    - **채널 설명(Description)**: 채널 생성 시 간단한 설명을 입력받을 수 있도록 UI 및 API 명세에 필드 추가.
    - **서버 비밀번호**: 서버 생성 시 비밀번호를 설정할 수 있도록 **DB 스키마(Rooms 테이블)에 `password` 필드 추가** 및 관련 백엔드 로직 구현.
3.  **전역 Toast 알림 시스템 구축 (Custom UI)**:
    - **UI 정의**: 브라우저 기본 알림이 아닌, 앱 내부에 직접 구현한 **우측 하단 고정형 플로팅 팝업**을 도입함.
    - **설계 방식**: `ToastContext`와 `useToast` 커스텀 훅을 기반으로 설계하여, 컴포넌트 어디서든 `showToast("메시지", "success")` 형식으로 호출 가능하게 함.
    - **기능 명세**:
        - **위치**: 화면 우측 하단(`bottom: 20px`, `right: 20px`)에 스택 형태로 쌓임.(개수는 3개로 제한.) <-- 이거 위치 애매하면 중앙 상단 에 띄워도 댑니다.
        - **인터랙션**: 부드러운 Fade-in/Slide-up 애니메이션 적용 및 일정 시간(예: 3초) 후 자동 소멸.
        - **타입 분류**: 성공(Success/Green), 경고(Warning/Yellow), 에러(Error/Red) 등 시각적 구분 제공.
    - **활용 사례**: 로그인 성공, 방 생성 완료, 파일 업로드 결과, 백엔드 통신 에러 피드백 등.
2.  **Explore 페이지 인터랙션 개선**:
    - **Room Detail Modal 도입**: 현재 카드에서 즉시 입장하는 방식을 변경하여, **[카드 클릭 -> 상세 정보 모달 오픈 -> 모달 내 입장 버튼 클릭]** 패턴으로 고도화할 것.
    - **모달 구성**: 방의 상세 설명, 현재 참여자 리스트, 리소스(파일/링크) 요약 정보 등을 시각적으로 풍부하게 제공.
    - **Room Card**: 호버 시 시각적 피드백(그림자, 스케일 업)을 강화하고, 카드 전체를 클릭 가능 영역으로 설정.
    - **Skeleton UI**: 데이터 로딩 중 실제 카드와 유사한 형태의 스켈레톤을 표시하여 시각적 안정성 확보.
3.  **채팅 편의 기능**:
    - **Auto-scroll**: 새 메시지 수신 시 또는 방 입장 시 최신 메시지 위치(최하단)로 자동 스크롤.
    - **Empty States**: 방 목록이 없거나 검색 결과가 없을 때의 친절한 안내 UI 추가.

---

## 3. 기술적 변경 예상도 (Technical Change Forecast)

향후 기능 확장에 따라 다음과 같은 API 엔드포인트 및 DB 구조의 변화가 예상됩니다. 설계 시 참고하시기 바랍니다.

### 3.1 API 요청 추가 예상
| 기능 | Method | Endpoint | 설명 |
| :--- | :--- | :--- | :--- |
| **채널 관리** | `POST` | `/rooms/{roomId}/channels` | 새로운 채널 추가 |
| **채널 관리** | `DELETE` | `/rooms/{roomId}/channels/{chId}` | 특정 채널 삭제 |
| **리소스 공유** | `GET` | `/resources/upload-url` | S3 업로드용 Pre-signed URL 발급 |
| **리소스 공유** | `POST` | `/rooms/{roomId}/links` | 외부 학습 링크 메타데이터 저장 |
| **AI 서비스** | `POST` | `/rooms/{roomId}/summary` | 특정 기간 대화 요약 생성 요청 |

### 3.2 DB 스키마 진화 (Expected Schema Evolution)
- **Rooms 테이블**: 
    - `members`: 참여 중인 사용자 ID 및 권한(Host/Member) 리스트 추가.
    - `settings`: 방별 알림 설정이나 테마 정보를 담는 Map 객체 추가.
- **Messages 테이블**: 
    - `mentions`: `@닉네임` 기능을 위한 사용자 ID 배열 추가.
    - `reactions`: 메시지별 이모지 반응을 저장하는 Map 객체 추가.
- **Users 테이블**: 
    - `bookmarks`: 즐겨찾기한 스터디룸 ID 리스트 추가.
    - `stats`: 총 학습 시간, 참여 횟수 등 통계 데이터 필드 추가.

---

## 4. 개발 시 유의사항
- **에러 핸들링**: `request.js`의 공통 에러 처리 로직을 활용하여 서버 오프라인이나 토큰 만료 시 사용자에게 명확한 피드백을 줄 것.

---
*마지막 업데이트: 2026-04-18*