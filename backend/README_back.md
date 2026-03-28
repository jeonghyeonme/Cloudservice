## 🛠️ 로컬 개발 환경 세팅 (AWS 인프라)

우리 프로젝트는 AWS 클라우드 비용 방어와 빠른 로컬 테스트를 위해 **Docker + LocalStack** 조합을 사용합니다.
단 한 줄의 명령어로 S3, DynamoDB, Cognito 로컬 환경이 구축됩니다

### 1. 사전 준비사항
* [Docker Desktop](https://www.docker.com/products/docker-desktop/) 설치 및 실행 확인

### 2. 인프라 실행 방법
`backend` 폴더 위치에서 아래 명령어를 실행하세요.
```bash
docker-compose up -d