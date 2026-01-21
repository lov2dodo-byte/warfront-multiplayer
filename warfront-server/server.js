const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// 정적 파일 제공
app.use(express.static('public'));

// 메인 페이지
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ==================== 게임 상태 관리 ====================

// 대기 중인 플레이어
let waitingPlayer = null;

// 활성 게임 방들
const rooms = new Map();

// 방 코드로 대기 중인 방들
const privateRooms = new Map();

// 플레이어 정보
const players = new Map();

// ==================== Socket.io 이벤트 ====================

io.on('connection', (socket) => {
  console.log(`✅ 플레이어 접속: ${socket.id}`);
  
  // 플레이어 정보 저장
  players.set(socket.id, {
    id: socket.id,
    name: `플레이어_${socket.id.slice(0, 4)}`,
    roomId: null,
    isReady: false
  });
  
  // 현재 접속자 수 브로드캐스트
  io.emit('online_count', players.size);
  
  // ------------------ 닉네임 설정 ------------------
  socket.on('set_name', (name) => {
    const player = players.get(socket.id);
    if (player) {
      player.name = name.slice(0, 10) || player.name;
      console.log(`📝 닉네임 설정: ${player.name}`);
    }
  });
  
  // ------------------ 빠른 매칭 ------------------
  socket.on('quick_match', () => {
    const player = players.get(socket.id);
    if (!player) return;
    
    console.log(`🔍 빠른 매칭 요청: ${player.name}`);
    
    if (waitingPlayer && waitingPlayer.id !== socket.id) {
      // 대기 중인 플레이어가 있으면 매칭!
      const roomId = `room_${Date.now()}`;
      
      // 방 생성
      rooms.set(roomId, {
        id: roomId,
        player1: waitingPlayer.id,
        player2: socket.id,
        gameState: null,
        currentTurn: 'player1',
        turnNumber: 1
      });
      
      // 두 플레이어를 방에 입장
      const waitingSocket = io.sockets.sockets.get(waitingPlayer.id);
      if (waitingSocket) {
        waitingSocket.join(roomId);
        players.get(waitingPlayer.id).roomId = roomId;
      }
      socket.join(roomId);
      player.roomId = roomId;
      
      // 매칭 완료 알림
      const player1Name = players.get(waitingPlayer.id)?.name || '상대방';
      const player2Name = player.name;
      
      io.to(roomId).emit('match_found', {
        roomId: roomId,
        player1: { id: waitingPlayer.id, name: player1Name },
        player2: { id: socket.id, name: player2Name }
      });
      
      console.log(`🎮 매칭 성공! ${player1Name} vs ${player2Name} (${roomId})`);
      
      waitingPlayer = null;
    } else {
      // 대기열에 추가
      waitingPlayer = { id: socket.id };
      socket.emit('waiting_match');
      console.log(`⏳ 대기열 추가: ${player.name}`);
    }
  });
  
  // ------------------ 매칭 취소 ------------------
  socket.on('cancel_match', () => {
    if (waitingPlayer && waitingPlayer.id === socket.id) {
      waitingPlayer = null;
      console.log(`❌ 매칭 취소: ${socket.id}`);
    }
  });
  
  // ------------------ 비공개 방 생성 ------------------
  socket.on('create_room', () => {
    const player = players.get(socket.id);
    if (!player) return;
    
    // 4자리 방 코드 생성
    const roomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    
    privateRooms.set(roomCode, {
      code: roomCode,
      hostId: socket.id,
      hostName: player.name,
      createdAt: Date.now()
    });
    
    socket.emit('room_created', { roomCode });
    console.log(`🏠 방 생성: ${roomCode} (호스트: ${player.name})`);
  });
  
  // ------------------ 비공개 방 참가 ------------------
  socket.on('join_room', (roomCode) => {
    const player = players.get(socket.id);
    if (!player) return;
    
    const code = roomCode.toUpperCase();
    const privateRoom = privateRooms.get(code);
    
    if (!privateRoom) {
      socket.emit('join_error', '존재하지 않는 방 코드입니다.');
      return;
    }
    
    if (privateRoom.hostId === socket.id) {
      socket.emit('join_error', '자신이 만든 방에는 참가할 수 없습니다.');
      return;
    }
    
    // 방 생성
    const roomId = `room_${code}_${Date.now()}`;
    
    rooms.set(roomId, {
      id: roomId,
      player1: privateRoom.hostId,
      player2: socket.id,
      gameState: null,
      currentTurn: 'player1',
      turnNumber: 1
    });
    
    // 두 플레이어를 방에 입장
    const hostSocket = io.sockets.sockets.get(privateRoom.hostId);
    if (hostSocket) {
      hostSocket.join(roomId);
      players.get(privateRoom.hostId).roomId = roomId;
    }
    socket.join(roomId);
    player.roomId = roomId;
    
    // 비공개 방 삭제
    privateRooms.delete(code);
    
    // 매칭 완료 알림
    io.to(roomId).emit('match_found', {
      roomId: roomId,
      player1: { id: privateRoom.hostId, name: privateRoom.hostName },
      player2: { id: socket.id, name: player.name }
    });
    
    console.log(`🎮 비공개 방 매칭! ${privateRoom.hostName} vs ${player.name}`);
  });
  
  // ------------------ 게임 준비 완료 ------------------
  socket.on('player_ready', (data) => {
    const player = players.get(socket.id);
    if (!player || !player.roomId) return;
    
    const room = rooms.get(player.roomId);
    if (!room) return;
    
    player.isReady = true;
    
    // 상대방에게 알림
    socket.to(player.roomId).emit('opponent_ready');
    
    // 둘 다 준비되었으면 게임 시작
    const player1 = players.get(room.player1);
    const player2 = players.get(room.player2);
    
    if (player1?.isReady && player2?.isReady) {
      io.to(player.roomId).emit('game_start', {
        firstTurn: 'player1',
        player1Id: room.player1,
        player2Id: room.player2
      });
      console.log(`🎮 게임 시작! (${player.roomId})`);
    }
  });
  
  // ------------------ 게임 액션 (턴 동기화) ------------------
  socket.on('game_action', (action) => {
    const player = players.get(socket.id);
    if (!player || !player.roomId) return;
    
    // 상대방에게 액션 전달
    socket.to(player.roomId).emit('opponent_action', action);
  });
  
  // ------------------ 턴 종료 ------------------
  socket.on('end_turn', (gameState) => {
    const player = players.get(socket.id);
    if (!player || !player.roomId) return;
    
    const room = rooms.get(player.roomId);
    if (!room) return;
    
    // 턴 전환
    room.currentTurn = room.currentTurn === 'player1' ? 'player2' : 'player1';
    if (room.currentTurn === 'player1') {
      room.turnNumber++;
    }
    
    // 게임 상태 저장
    room.gameState = gameState;
    
    // 상대방에게 턴 시작 알림
    socket.to(player.roomId).emit('your_turn', {
      gameState: gameState,
      turnNumber: room.turnNumber
    });
    
    console.log(`🔄 턴 종료 (${player.roomId}) - Turn ${room.turnNumber}`);
  });
  
  // ------------------ 채팅 ------------------
  socket.on('chat_message', (message) => {
    const player = players.get(socket.id);
    if (!player || !player.roomId) return;
    
    io.to(player.roomId).emit('chat_message', {
      sender: player.name,
      message: message.slice(0, 100)
    });
  });
  
  // ------------------ 게임 종료 (승리/패배) ------------------
  socket.on('game_over', (result) => {
    const player = players.get(socket.id);
    if (!player || !player.roomId) return;
    
    io.to(player.roomId).emit('game_result', {
      winnerId: result.winnerId,
      reason: result.reason
    });
    
    // 방 정리
    const room = rooms.get(player.roomId);
    if (room) {
      const player1 = players.get(room.player1);
      const player2 = players.get(room.player2);
      if (player1) {
        player1.roomId = null;
        player1.isReady = false;
      }
      if (player2) {
        player2.roomId = null;
        player2.isReady = false;
      }
      rooms.delete(player.roomId);
    }
    
    console.log(`🏆 게임 종료 (${player.roomId})`);
  });
  
  // ------------------ 항복 ------------------
  socket.on('surrender', () => {
    const player = players.get(socket.id);
    if (!player || !player.roomId) return;
    
    socket.to(player.roomId).emit('opponent_surrendered', {
      surrenderedPlayer: player.name
    });
    
    // 방 정리
    const room = rooms.get(player.roomId);
    if (room) {
      rooms.delete(player.roomId);
    }
    
    console.log(`🏳️ ${player.name} 항복`);
  });
  
  // ------------------ 연결 해제 ------------------
  socket.on('disconnect', () => {
    const player = players.get(socket.id);
    
    // 대기열에서 제거
    if (waitingPlayer && waitingPlayer.id === socket.id) {
      waitingPlayer = null;
    }
    
    // 방에 있었으면 상대방에게 알림
    if (player && player.roomId) {
      socket.to(player.roomId).emit('opponent_disconnected');
      rooms.delete(player.roomId);
    }
    
    // 비공개 방 정리
    for (const [code, room] of privateRooms) {
      if (room.hostId === socket.id) {
        privateRooms.delete(code);
      }
    }
    
    players.delete(socket.id);
    
    // 접속자 수 업데이트
    io.emit('online_count', players.size);
    
    console.log(`❌ 플레이어 퇴장: ${socket.id}`);
  });
});

// ==================== 서버 시작 ====================

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`
  ╔════════════════════════════════════════╗
  ║  🎮 WARFRONT 멀티플레이어 서버 시작!    ║
  ║                                        ║
  ║  포트: ${PORT}                            ║
  ║  http://localhost:${PORT}                 ║
  ╚════════════════════════════════════════╝
  `);
});
