# 🚀 Cloudservice 프로젝트 전수 조사 로드맵 (Final)

본 문서는 프로젝트의 모든 소스 코드를 파일 단위로 분석하여 기록하며, 시스템의 전체 구조와 세부 로직을 한눈에 파악하기 위해 작성되었습니다.

---

## 📁 전체 디렉토리 구조
```text
C:\Users\parad\Cloudservice\
├── .github/                # GitHub 워크플로우 및 이슈/PR 템플릿
├── backend/                # 백엔드 서버 (AWS Lambda, Serverless)
│   ├── infra/              # 로컬 인프라 설정 (Docker, DynamoDB Seed)
│   └── src/                # 백엔드 핵심 소스 코드
│       ├── ai/             # AWS AI 서비스 연동 모듈
│       ├── auth/           # 사용자 인증 및 토큰 관리
│       ├── chat/           # WebSocket 통신 및 메시지 이력
│       ├── resources/      # S3 파일 및 외부 링크 관리
│       ├── rooms/          # 서버/방 관리 로직 (Legacy)
│       ├── servers/        # 서버/채널/멤버십 관리 로직 (Latest)
│       └── utils/          # 공통 유틸리티 및 응답 설정
├── frontend/               # 프론트엔드 (React)
│   └── src/                # 프론트엔드 핵심 소스 코드
│       ├── assets/         # 정적 자산 (이미지, 로고)
│       ├── components/     # UI 컴포넌트 (기능별 분리)
│       │   ├── Auth/       # 로그인, 회원가입 UI
│       │   ├── Chat/       # 채팅 레이아웃, 윈도우, 리소스 허브
│       │   ├── common/     # 모달, 버튼 등 공통 컴포넌트
│       │   ├── layout/     # 서버 사이드바, 컨텍스트 메뉴
│       │   ├── NotFound/   # 404 페이지
│       │   ├── Onboarding/ # 랜딩 페이지
│       │   └── Servers/    # 서버 탐색, 생성 모달
│       ├── constants/      # 공통 상수 (경로, 엔드포인트)
│       ├── contexts/       # 전역 상태 관리 (Context API)
│       ├── data/           # 개발용 목 데이터 (mockData.js)
│       ├── lib/            # API 통신(request.js) 및 서비스 라이브러리
│       ├── pages/          # 앱 진입점(App.js) 및 라우팅 구성
│       └── styles/         # 전역 스타일(index.css) 및 테마(theme.css)
└── ROADMAP.md              # 본 관리 문서
```

---

## 🔍 백엔드 소스 상세 분석 (`backend/src/`)

### 1. 루트 공통 모듈 (Core Modules)
| 파일명 | 상세 역할 및 핵심 로직 |
| :--- | :--- |
| **`config.js`** | `process.env` 통합 관리. 로컬(LocalStack)과 운영(AWS) 환경 분기 조건(`IS_OFFLINE`) 포함. |
| **`dynamodbClient.js`** | `DynamoDBDocumentClient` 생성. 마샬링 자동화 및 환경별 엔드포인트 설정. |
| **`utils.js`** | `bcrypt` 기반 비밀번호 암호화, `jwt` 토큰 발급/검증, 리프레시 토큰 DB 저장 로직 총괄. |

### 2. AI 분석 모듈 (`ai/`)
| 파일명 | 상세 역할 및 핵심 로직 |
| :--- | :--- |
| **`aiRouter.js`** | **S3 리소스 분석**: PDF/문서(Textract + Bedrock Claude 3 요약), 이미지(Rekognition 라벨링 + Translate 번역). |

### 3. 인증 관리 모듈 (`auth/`)
| 파일명 | 상세 역할 및 핵심 로직 |
| :--- | :--- |
| **`tokenRefresh.js`** | 리프레시 토큰 유효성 및 DB 폐기 여부 검사 후 새로운 Access Token 발급. |
| **`userLogin.js`** | 이메일 GSI 조회 및 비밀번호 대조를 통한 JWT 발급. 로그인 시 유저 프로필 정보 동시 반환. |
| **`userLogout.js`** | 전달받은 리프레시 토큰의 DB 상태를 `isRevoked = true`로 변경하여 세션 만료 처리. |
| **`userRegister.js`** | 신규 유저 생성. 이메일 중복 체크(`email-index`), 비밀번호 해싱 및 초기 토큰 세트 발급. |

### 4. 채팅 및 실시간 통신 모듈 (`chat/`)
| 파일명 | 상세 역할 및 핵심 로직 |
| :--- | :--- |
| **`chatHandler.js`** | **WebSocket 총괄**: `$connect/$disconnect` 관리 및 메시지/리소스 업데이트 실시간 브로드캐스트 로직 완비. |
| **`getMessages.js`** | **이력 조회**: 특정 서버의 대화 이력을 DynamoDB에서 쿼리. `keyword` 파라미터를 통한 필터링 지원. |

### 5. 서버 및 채널 관리 모듈 (`servers/`)
| 파일명 | 상세 역할 및 핵심 로직 |
| :--- | :--- |
| **`addChannel.js`** | 특정 서버 내부에 신규 채널 정보를 리스트 형태로 추가. |
| **`createServer.js`** | 신규 스터디 서버 생성. 초기 생성 시 '일반' 채널 자동 생성 및 호스트 권한 설정. |
| **`deleteChannel.js`** | 채널 삭제. 단, `isDefault` 속성이 있는 기본 채널은 삭제 방지. |
| **`deleteServer.js`** | 서버 정보 및 관련 채널/데이터를 DB에서 영구 삭제. |
| **`getMyServers.js`** | 로그인한 유저가 참여 중인 모든 서버 목록을 `BatchGet`으로 일괄 조회. |
| **`getServerDetail.js`** | 특정 서버의 상세 정보, 참여자 수, 채널 리스트 등을 단일 조회. |
| **`getServers.js`** | 탐색 페이지용 전체 공개 서버 목록 제공. GSI를 통한 페이징 지원. |
| **`joinServer.js`** | 서버 참여. 비공개 서버일 경우 비밀번호 확인 후 `server_members`에 기록. |
| **`leaveServer.js`** | 참여 중인 서버에서 퇴장 처리. 멤버십 데이터 삭제 및 서버 정원 수 업데이트. |

### 6. 리소스 허브 모듈 (`resources/`)
| 파일명 | 상세 역할 및 핵심 로직 |
| :--- | :--- |
| **`getUploadUrl.js`** | S3에 안전하게 파일을 업로드하기 위한 Pre-signed URL 생성 및 반환. |
| **`saveFileMetadata.js`** | S3 업로드가 완료된 파일의 메타데이터를 해당 서버 정보에 기록. |
| **`saveLink.js`** | 외부 학습 자료 URL 링크를 서버 리소스 목록에 저장. |

---

## 🔍 프론트엔드 소스 상세 분석 (`frontend/src/`)

### 1. 기초 설정 및 상수 (`src/`, `constants/`)
| 파일명 | 상세 역할 및 핵심 로직 |
| :--- | :--- |
| **`index.js`** | 앱의 진입점. `BrowserRouter`로 감싸 라우팅 환경을 구축하고 `App.js`를 렌더링. |
| **`constants/path.js`** | 앱 내 모든 이동 경로(`PATHS`) 관리 및 서버 상세 경로 생성 유틸 제공. |
| **`constants/endpoint.js`** | API 및 WebSocket(`API_WS_URL`) 통신 주소 정의. 환경별 URL 자동 설정. |

### 2. API 통신 및 서비스 라이브러리 (`lib/`)
| 파일명 | 상세 역할 및 핵심 로직 |
| :--- | :--- |
| **`request.js`** | `fetch` 래퍼. `localStorage` 토큰 자동 주입 및 백엔드 에러 메시지(`detail/message`) 통합 처리. |
| **`auth.js`** | 회원가입, 로그인, 로그아웃, 토큰 갱신 API 호출 함수 모음. |
| **`servers.js`** | 서버 목록/상세 조회, 생성, 채널 추가, 서버 나가기/삭제 등 서버 중심 서비스 함수. |
| **`resources.js`** | **S3 업로드 파이프라인**: Pre-signed URL 획득 → S3 PUT → 메타데이터 저장(`saveFileMetadata`) 연쇄 로직 구현. |

### 3. 전역 상태 관리 (`contexts/`)
| 파일명 | 상세 역할 및 핵심 로직 |
| :--- | :--- |
| **`AuthContext.js`** | 로그인 상태, 유저 정보, 토큰 세트를 앱 전체에 공유하고 세션 유지(Local Storage) 관리. |
| **`ServerContext.js`** | 참여 서버 목록 및 활성 서버 ID 관리. `serverId/roomId` 명칭 마이그레이션 호환 로직 포함. |

### 4. 주요 레이아웃 및 공통 컴포넌트 (`components/layout/`, `common/`)
| 파일명 | 상세 역할 및 핵심 로직 |
| :--- | :--- |
| **`layout/SharedLayout.js`** | 상단 네비바를 포함한 공통 뼈대. 페이지 위치에 따라 로그인/회원가입 버튼 노출 제어. |
| **`layout/ServerSidebar.js`** | 좌측 서버 아이콘 목록. 서버 이동, 우클릭 메뉴 트리거, 하단 프로필 팝업 관리. |
| **`layout/ServerContextMenu.js`** | 서버 우클릭 메뉴. 호스트 여부에 따라 '서버 설정/삭제' 또는 '서버 나가기' 기능 제공. |
| **`common/FormModal.js`** | 모든 입력 타입(텍스트, 파일, 토글 등)을 지원하는 범용 폼 모달. 동적 필드 노출(`showIf`) 지원. |

### 5. 핵심 기능 페이지 컴포넌트 (`components/Chat/`, `Servers/`)
| 파일명 | 상세 역할 및 핵심 로직 |
| :--- | :--- |
| **`Chat/ChatLayout.js`** | 채팅 메인 컨테이너. 데이터 로드 및 컴포넌트 데이터 배분. |
| **`Chat/SidebarLeft.js`** | 서버 내부 사이드바. 채널 리스트 및 참여자를 온라인/오프라인으로 자동 분류하여 표시. |
| **`Chat/ChatWindow.js`** | **메시징 엔진**: 타입별 렌더링, **실시간 수신 핸들러**(수정/삭제 포함), 새 메시지 **자동 스크롤** 로직 내장. |
| **`Chat/ResourceHub.js`** | **리소스 컨트롤러**: 파일/링크 S3 업로드 및 삭제 UI, `setCurrentServer`를 통한 **로컬 상태 즉시 동기화**. |
| **`Chat/hooks/useWebSocket.js`** | **연결 라이프사이클**: `new WebSocket()` 관리, `joinServer` 자동 발신, 전송 인터페이스 제공. |
| **`Servers/ExploreServers.js`** | 서버 탐색 페이지. 공개 서버 검색 및 카드 기반 상세 정보/입장 프로세스 구현. |
| **`Servers/CreateServerModal.js`** | 서버 생성 전용 모달. 규칙 입력 텍스트를 줄바꿈 기준으로 파싱하여 아이콘 자동 부여. |

### 6. 인증 및 온보딩 (`components/Auth/`, `Onboarding/`, `pages/`)
| 파일명 | 상세 역할 및 핵심 로직 |
| :--- | :--- |
| **`Auth/Login/Register.js`** | 로그인 및 회원가입 페이지. 폼 입력값 검증 및 인증 성공 후 페이지 이동 로직. |
| **`Onboarding/Onboarding.js`** | 서비스 소개 랜딩 페이지. 인터랙티브 슬라이더를 통한 주요 기능(AI, 협업) 홍보. |
| **`pages/App.js`** | **중앙 라우터 및 가드**: `ProtectedRoute`를 통한 미인증 접근 차단 및 전체 Context 제공자 설정. |

### 7. 스타일 및 목 데이터 (`styles/`, `data/`)
| 파일명 | 상세 역할 및 핵심 로직 |
| :--- | :--- |
| **`styles/theme.css`** | 다크모드 기반의 전역 테마 정의. 색상, 간격, 둥글기 등 디자인 시스템 CSS 변수 관리. |
| **`data/mockData.js`** | 개발 및 테스트용 정적 데이터. 서버, 채널, 다양한 타입의 메시지 샘플 포함. |

---

## 📅 향후 작업 가이드라인 (Developer Action Items)
> 실사용 가능한 수준의 실시간 채팅과 자료 공유 환경 구축을 포함한 전체 개발 로드맵입니다.

### 1. 핵심 기능 확장 (Core Features)
- **초대 시스템 고도화 (Invite System)**:
    - **BackEnd:** `smartstudy-Invites` 전용 테이블 구축(PK: `inviteId`, GSI: `inviteCode-index`) 및 TTL 속성 정의. 8자리 난수 기반 초대 코드 생성 엔진 및 유효성 검증 API 구현.
    - **FrontEnd:** 서버 설정 내 초대 코드 생성/관리 UI 및 탐색 페이지 "즉시 입장" 시 초대 코드를 통한 가입 프로세스 연동.
- **유저 프로필 및 정보 관리 (User Profile)**:
    - **BackEnd:** 
        - `smartstudy-Users` 테이블 내 `profileImageUrl`, `bio`(상태 메시지) 필드 추가 및 데이터 스키마 확장.
        - **프로필 이미지 업로드:** S3 전용 경로(`profiles/{userId}/`) 할당 및 Pre-signed URL 발급 API 구현.
        - **프로필 통합 수정 API:** `PATCH /users/me` 엔드포인트를 통해 닉네임/이미지/상태메시지 부분 업데이트 지원.
    - **FrontEnd:**
        - **프로필 관리 모달:** 이미지 드래그 앤 드롭 업로드, 닉네임 중복 체크 UI, 상태 메시지 입력 기능 구현.
        - **전역 상태 동기화:** `AuthContext`의 유저 정보를 즉시 갱신하여 사이드바, 메시지 리스트, 참여자 목록의 아바타/닉네임을 일괄 업데이트.
        - **이미지 최적화:** S3에 업로드된 이미지를 리사이징하여 아바타 크기에 최적화된 썸네일 노출.
- **서버 관리자 도구 (Moderation)**:
    - **BackEnd:** 
        - **권한 제어(RBAC):** `ServerMembers` 테이블 기반 Role 시스템(HOST, MODERATOR, MEMBER) 고도화.
        - **관리 API:** 특정 멤버 강퇴(Kick), 영구 차단(Ban), 방장 권한 위임(Ownership Transfer) 트랜잭션 API 구현.
        - **서버 설정 강화:** 초대 코드 초기화, 서버 비공개 전환 및 비밀번호 즉시 변경 로직.
    - **FrontEnd:**
        - **멤버 관리 대시보드:** 호스트 전용 멤버 목록 관리 UI 구축 (권한 변경, 강퇴 버튼 등).
        - **컨텍스트 메뉴 확장:** 멤버 아이콘/닉네임 우클릭 시 권한에 따른 관리 메뉴(강퇴, 권한 부여 등) 동적 노출.
        - **호스트 가드(Guard):** 관리자 전용 기능 접근 시 클라이언트/서버 이중 권한 검증 로직 적용.
- **모바일 대응 반응형 레이아웃 (Responsive Design)**:
    - **적응형 UI 레이아웃:** 768px(태블릿) 및 480px(모바일) 기준 미디어 쿼리 적용. 데스크톱의 3단 분할 레이아웃을 모바일 환경에 맞게 싱글/듀얼 스택으로 가변 처리.
    - **모바일 드로어(Drawer) 시스템:** 화면 좌측 상단 햄버거 메뉴를 통한 서버/채널 리스트 슬라이드 애니메이션 구현.
    - **상태 관리:** 드로어 열림/닫힘 상태를 전역 또는 상위 컨텍스트에서 관리하여 페이지 이동 시 자동 닫힘 처리.
    - **터치 최적화:** 모바일 전용 하단 탭 바(채팅/리소스/멤버) 및 터치 영역(Hit Area) 확장을 통한 조작성 개선.

### 2. 리소스-채팅 연동 및 동기화
- **[Frontend] 자동 알림 메시지 생성**: 리소스 허브에서 파일/링크 추가 시 `sendMessage` 액션을 자동 호출하여 메시지 기록.
- **[Frontend] 메시지-리소스 통합 레이아웃**: 이미지 메시지 전송 시 텍스트 캡션을 포함할 수 있도록 데이터 구조 및 UI 렌더링 정교화. [검토 필요]

### 3. 검색 및 필터링 기능 완성
- **[Frontend] 메시지 통합 검색 UI**: 채팅창 상단 헤더에 검색창 배치 및 백엔드 `getMessages` 검색 API 연동.
- **[Frontend] 상태별 UI 피드백**: 서버/채널 목록 로딩 시 **Skeleton UI** 적용 및 검색 결과 부재 시 **Empty States** 구현.

### 4. 사용자 편의성 및 운영 고도화
- **[Frontend] 전역 Toast 알림 시스템**: `alert()`를 대체할 커스텀 Toast 시스템 구축 (우측 하단 스택형, 성공/에러/정보 타입별 스타일링).
- **[Frontend] 전송 상태 및 에러 핸들링**: 메시지 전송 중 흐릿한 표시(Optimistic UI) 및 전송 실패 시 '재전송' 버튼 노출.
- **[Frontend] 업로드 정책 제어**: 파일 확장자 화이트리스트 검사 및 용량 초과 시 즉각적인 UI 피드백 제공.

### 5. 코드 구조화 및 인프라
- **[Frontend] `lib/ai.js` 모듈화**: 여러 컴포넌트에 산재된 AI 분석 API 호출 로직을 전용 라이브러리로 통합 관리.
- **[DevOps] 배포 최적화**: CloudFront 배포 설정 및 CI/CD 파이프라인 내 캐시 무효화(Invalidation) 자동화 스크립트 보완.

---
*마지막 업데이트: 2026-05-10*