const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({
  region: "us-east-1",
  endpoint: "http://localhost:4566",
  credentials: { accessKeyId: "test", secretAccessKey: "test" },
});
const docClient = DynamoDBDocumentClient.from(client);

// 1. 다수의 샘플 유저 (커뮤니티 활성화 느낌)
const seedUsers = [
  { 
    userId: "user_test_1", 
    email: "tester@example.com", 
    password: "hashed_password_here", 
    nickname: "열공마스터", 
    avatar: "열",
    createdAt: new Date().toISOString() 
  },
  { 
    userId: "user_1", 
    email: "user1@example.com", 
    password: "hashed_password_here", 
    nickname: "알고리즘깎는노인", 
    avatar: "A",
    createdAt: new Date().toISOString() 
  },
  { 
    userId: "user_2", 
    email: "user2@example.com", 
    password: "hashed_password_here", 
    nickname: "리액트장인", 
    avatar: "R",
    createdAt: new Date().toISOString() 
  },
  { 
    userId: "user_3", 
    email: "user3@example.com", 
    password: "hashed_password_here", 
    nickname: "파이썬초보", 
    avatar: "P",
    createdAt: new Date().toISOString() 
  },
  { 
    userId: "user_4", 
    email: "user4@example.com", 
    password: "hashed_password_here", 
    nickname: "인프라요정", 
    avatar: "I",
    createdAt: new Date().toISOString() 
  },
  { 
    userId: "user_5", 
    email: "user5@example.com", 
    password: "hashed_password_here", 
    nickname: "취준생_A", 
    avatar: "T",
    createdAt: new Date().toISOString() 
  },
];

// 2. 다양한 테마의 스터디룸
const seedServers = [
  {
    serverId: "room_algo",
    title: "🚀 알고리즘 코딩테스트 정복",
    description: "매일 밤 10시, 기출 문제 풀이 및 코드 리뷰",
    status: "ACTIVE",
    isPrivate: false,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(), // 2일 전 생성
    expiresAt: Math.floor(Date.now() / 1000) + 86400 * 7, // 7일 유지
    channels: [
      { id: "ch-1", name: "공지사항", label: "📢 공지사항", topic: "필독 사항 및 스케줄" },
      { id: "ch-2", name: "자유게시판", label: "💬 자유게시판", topic: "아무 말 대잔치" },
      { id: "ch-3", name: "자료실", label: "📁 자료실", topic: "공유할 PDF/이미지" }
    ],
    files: [
      { name: "삼성_기출_모음.zip", meta: "15MB | ZIP", uploadedBy: "알고리즘깎는노인" },
      { name: "DP_최적화_노트.pdf", meta: "2.1MB | PDF", uploadedBy: "취준생_A" }
    ],
    links: [
      { title: "백준 랭킹 확인", url: "https://acmicpc.net" },
      { title: "코딩테스트 연습", url: "https://programmers.co.kr" }
    ]
  },
  {
    serverId: "room_fe",
    title: "🎨 프론트엔드 실무 아키텍처",
    description: "Next.js와 TypeScript를 활용한 프로젝트 협업",
    status: "ACTIVE",
    isPrivate: true,
    roomPassword: "1234",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    expiresAt: Math.floor(Date.now() / 1000) + 86400 * 30,
    channels: [
      { id: "ch-fe-1", name: "기술공유", label: "💻 기술공유", topic: "새로운 기술 트렌드" },
      { id: "ch-fe-2", name: "QnA", label: "❓ QnA", topic: "삽질 공유 및 질문" }
    ],
    files: [
      { name: "컴포넌트_설계_가이드.pdf", meta: "4.5MB | PDF" }
    ],
    links: [
      { title: "React 공식 문서", url: "https://react.dev" }
    ]
  }
];

// 3. 방별 풍성한 채팅 내역 (AI 요약 포함)
const now = Date.now();
const seedMessages = [
  // 알고리즘 방 메시지들
  { serverId: "room_algo", messageId: `msg-${now - 10000}`, author: "알고리즘깎는노인", type: "text", text: "여러분 오늘 문제는 DFS/BFS 기초입니다.", createdAt: new Date(now - 10000).toISOString() },
  { serverId: "room_algo", messageId: `msg-${now - 9000}`, author: "파이썬초보", type: "text", text: "저는 아직 재귀가 어려워요 ㅠㅠ", createdAt: new Date(now - 9000).toISOString() },
  { serverId: "room_algo", messageId: `msg-${now - 8000}`, author: "알고리즘깎는노인", type: "file", fileName: "DFS_기초_정리.pdf", fileMeta: "800KB | PDF", createdAt: new Date(now - 8000).toISOString() },
  { serverId: "room_algo", messageId: `msg-${now - 7000}`, author: "인프라요정", type: "text", text: "이 파일 참고해보세요! 그림으로 잘 설명되어 있습니다.", createdAt: new Date(now - 7000).toISOString() },
  { serverId: "room_algo", messageId: `msg-${now - 6000}`, author: "SAGE AI", avatar: "🤖", type: "ai-summary", title: "학습 세션 요약", points: ["DFS는 재귀 또는 스택 사용", "BFS는 큐를 사용한 최단 거리 탐색에 유리", "방문 체크(visited) 배열은 필수"], createdAt: new Date(now - 6000).toISOString() },
  { serverId: "room_algo", messageId: `msg-${now - 5000}`, author: "취준생_A", type: "link", linkName: "BFS 추천 문제", linkUrl: "https://www.acmicpc.net/problem/2178", createdAt: new Date(now - 5000).toISOString() },
  
  // 프론트엔드 방 메시지들
  { serverId: "room_fe", messageId: `msg-${now - 20000}`, author: "리액트장인", type: "text", text: "Next.js 14 서버 컴포넌트 써보신 분?", createdAt: new Date(now - 20000).toISOString() },
  { serverId: "room_fe", messageId: `msg-${now - 18000}`, author: "인프라요정", type: "text", text: "성능은 확실히 좋은데 배포 설정이 좀 까다롭네요.", createdAt: new Date(now - 18000).toISOString() },
  { serverId: "room_fe", messageId: `msg-${now - 15000}`, author: "리액트장인", type: "file", fileName: "서버컴포넌트_비교.png", fileMeta: "1.2MB | Image", createdAt: new Date(now - 15000).toISOString() },
  { serverId: "room_fe", messageId: `msg-${now - 10000}`, author: "SAGE AI", avatar: "🤖", type: "ai-summary", title: "기술 토론 요약", points: ["App Router의 장점 논의", "서버 컴포넌트와 클라이언트 컴포넌트 분리 기준", "로딩/에러 바운더리 활용 팁"], createdAt: new Date(now - 10000).toISOString() }
];

async function seedTable(tableName, data) {
  for (const item of data) {
    try {
      await docClient.send(new PutCommand({ TableName: tableName, Item: item }));
      console.log(`✅ Seeded ${tableName}: ${item.userId || item.roomId || item.messageId}`);
    } catch (error) {
      console.error(`❌ Error ${tableName}:`, error.message);
    }
  }
}

// async function run() {
//   console.log("🚀 풍성한 커뮤니티 시드 데이터 삽입 시작...");
//   await seedTable("Users", seedUsers);
//   await seedTable("Rooms", seedRooms);
//   await seedTable("Messages", seedMessages);
//   console.log("\n🎉 시드 데이터 삽입 완료!");
// }

async function run() {
  console.log("🚀 풍성한 커뮤니티 시드 데이터 삽입 시작...");
  
  // 테이블명(smartstudy-*)과 정확히 일치시키기.
  await seedTable("smartstudy-Users", seedUsers);
  await seedTable("smartstudy-Servers", seedServers);
  await seedTable("smartstudy-Messages", seedMessages);
  
  console.log("\n🎉 시드 데이터 삽입 완료!");
}

run();
