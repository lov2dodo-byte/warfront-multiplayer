# 🎮 WARFRONT - 멀티플레이어 서버

턴제 전략 게임 WARFRONT의 멀티플레이어 서버입니다.

---

## 📋 배포 방법 (Render.com)

### 1단계: GitHub 저장소 생성

1. [GitHub](https://github.com) 에 로그인 (없으면 가입)
2. 우측 상단 `+` 버튼 → `New repository` 클릭
3. Repository name: `warfront-multiplayer` 입력
4. `Create repository` 클릭

### 2단계: 파일 업로드

1. 생성된 저장소 페이지에서 `uploading an existing file` 클릭
2. 아래 파일들을 드래그하여 업로드:
   - `server.js`
   - `package.json`
   - `public/index.html` (public 폴더 째로 업로드)
3. `Commit changes` 클릭

### 3단계: Render.com 배포

1. [Render.com](https://render.com) 접속
2. `Get Started for Free` 클릭
3. **GitHub 계정으로 가입** (권장) 또는 이메일 가입
4. 대시보드에서 `New +` → `Web Service` 클릭
5. `Connect a repository` 에서 GitHub 연결
6. `warfront-multiplayer` 저장소 선택
7. 설정:
   - **Name**: `warfront` (원하는 이름)
   - **Region**: `Singapore` (한국에서 가까움)
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free` 선택
8. `Create Web Service` 클릭
9. 배포 완료까지 1-2분 대기

### 4단계: 게임 접속

배포 완료 후 제공되는 URL로 접속:
```
https://warfront.onrender.com
```
(실제 URL은 설정한 이름에 따라 다름)

---

## 🎮 게임 방법

### 빠른 매칭
1. 로비에서 `PVP 매칭` 클릭
2. `⚡ 빠른 매칭` 클릭
3. 상대방 대기
4. 매칭되면 `✅ 준비 완료` 클릭
5. 게임 시작!

### 친구와 대전
1. 한 명이 `🔑 방 만들기` 클릭
2. 표시된 4자리 코드를 친구에게 공유
3. 친구가 코드 입력 후 `🚪 방 참가` 클릭
4. 둘 다 `✅ 준비 완료` 클릭
5. 게임 시작!

---

## 📁 파일 구조

```
warfront-server/
├── server.js          # Node.js 서버
├── package.json       # 의존성
├── README.md          # 이 파일
└── public/
    └── index.html     # 게임 클라이언트
```

---

## ⚠️ 주의사항

- **무료 플랜 제한**: 15분간 접속이 없으면 서버가 슬립 모드로 전환됩니다. 
  다시 접속하면 30초 정도 후에 깨어납니다.
- **월 750시간 무료**: 한 달에 약 31일이므로 24시간 운영 가능합니다.

---

## 🔧 로컬 테스트

```bash
# 의존성 설치
npm install

# 서버 실행
npm start

# 브라우저에서 접속
# http://localhost:3000
```

---

## 📞 문제 해결

### Q: 서버가 시작되지 않아요
A: Node.js 18 이상이 필요합니다. `node -v`로 버전 확인하세요.

### Q: 매칭이 안 돼요
A: 다른 브라우저/탭으로 접속해서 테스트해보세요.

### Q: 게임 중 연결이 끊겼어요
A: 상대방에게 자동으로 알림이 갑니다. 다시 매칭하면 됩니다.

---

즐거운 게임 되세요! 🎮⚔️
