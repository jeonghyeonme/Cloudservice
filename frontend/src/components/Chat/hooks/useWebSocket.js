import { useEffect, useRef, useCallback, useState } from "react";
import { API_WS_URL } from "../../../constants/endpoint";
 
/**
 * @title WebSocket 연결 훅
 * @param {string} serverId - 입장할 서버 ID
 * @param {string} userId - 현재 유저 ID
 * @param {string} accessToken - 인증 토큰
 * @param {function} onMessage - 메시지 수신 시 콜백 ({ action, data })
 */
function useWebSocket({ serverId, userId, accessToken, onMessage }) {
  const wsRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const onMessageRef = useRef(onMessage);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);
 
  // 메시지 전송 함수
  const sendMessage = useCallback((action, payload) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action, ...payload }));
    } else {
      console.warn("WebSocket이 연결되지 않았습니다.");
    }
  }, []);
 
  useEffect(() => {
    if (!serverId || !userId || !accessToken) return;
 
    // URL 끝에 슬래시가 있으면 제거하고 토큰 추가 (AWS 연결 오류 방지)
    const baseUrl = API_WS_URL.endsWith('/') ? API_WS_URL.slice(0, -1) : API_WS_URL;
    const wsUrl = `${baseUrl}?token=${accessToken}`;
    
    console.log("🔌 WebSocket 연결 시도 (토큰 포함):", wsUrl.split('?')[0]);

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
 
    ws.onopen = () => {
      console.log("✅ WebSocket 연결됨");
      setIsConnected(true);
 
      // 서버 입장 알림 (이게 성공해야 브로드캐스트 대상에 포함됨)
      const joinPayload = {
        action: "joinServer",
        serverId,
        userId,
      };
      console.log("📤 서버 입장 요청 전송:", joinPayload);
      ws.send(JSON.stringify(joinPayload));
    };
 
    ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        onMessageRef.current?.(parsed);
      } catch (err) {
        console.error("WebSocket 메시지 파싱 실패:", err);
      }
    };
 
    ws.onclose = () => {
      console.log("WebSocket 연결 해제됨");
      setIsConnected(false);
    };
 
    ws.onerror = (err) => {
      console.error("WebSocket 오류:", err);
      setIsConnected(false);
    };
 
    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [serverId, userId]); // onMessage는 의도적으로 제외 (매 렌더마다 재연결 방지)
 
  return { sendMessage, isConnected };
}
 
export default useWebSocket;