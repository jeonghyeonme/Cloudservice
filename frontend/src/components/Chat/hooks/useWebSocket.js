import { useEffect, useRef, useCallback, useState } from "react";
import { API_WS_URL } from "../../../constants/endpoint";
 
/**
 * @title WebSocket 연결 훅
 * @param {string} serverId - 입장할 서버 ID
 * @param {string} userId - 현재 유저 ID
 * @param {function} onMessage - 메시지 수신 시 콜백 ({ action, data })
 */
function useWebSocket({ serverId, userId, onMessage }) {
  const wsRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
 
  // 메시지 전송 함수
  const sendMessage = useCallback((action, payload) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action, ...payload }));
    } else {
      console.warn("WebSocket이 연결되지 않았습니다.");
    }
  }, []);
 
  useEffect(() => {
    if (!serverId || !userId) return;
 
    const ws = new WebSocket(API_WS_URL);
    wsRef.current = ws;
 
    ws.onopen = () => {
      console.log("✅ WebSocket 연결됨");
      setIsConnected(true);
 
      // 서버 입장 알림
      ws.send(JSON.stringify({
        action: "joinServer",
        serverId,
        userId,
      }));
    };
 
    ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        onMessage?.(parsed);
      } catch (err) {
        console.error("WebSocket 메시지 파싱 실패:", err);
      }
    };
 
    ws.onclose = () => {
      console.log("🔌 WebSocket 연결 해제됨");
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
  }, [serverId, userId, onMessage]); // onMessage는 의도적으로 제외 (매 렌더마다 재연결 방지)
 
  return { sendMessage, isConnected };
}
 
export default useWebSocket;