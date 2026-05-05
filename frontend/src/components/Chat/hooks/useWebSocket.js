import { useEffect, useRef, useCallback, useState } from "react";
import { API_WS_URL } from "../../../constants/endpoint";

/**
 * @title WebSocket 연결 훅 (재연결 로직 포함)
 * @param {string} serverId - 입장할 서버 ID
 * @param {string} userId - 현재 유저 ID
 * @param {function} onMessage - 메시지 수신 시 콜백 ({ action, data })
 */
function useWebSocket({ serverId, userId, onMessage }) {
  const wsRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const onMessageRef = useRef(onMessage);

  // ── 재연결 관련 ref ──────────────────────────────
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef(null);
  const isManualCloseRef = useRef(false); // cleanup으로 인한 의도적 종료 여부
  const isConnectingRef = useRef(false);  // 중복 연결 시도 방지

  const MAX_RECONNECT_ATTEMPTS = 10;
  const BASE_DELAY_MS = 1000;
  const MAX_DELAY_MS = 30000;

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
    if (!serverId || !userId) return;

    // 연결 함수 (재귀적으로 재연결 가능)
    const connect = () => {
      // 이미 연결 중이거나 열려있으면 스킵
      if (isConnectingRef.current) return;
      if (wsRef.current?.readyState === WebSocket.OPEN) return;
      if (wsRef.current?.readyState === WebSocket.CONNECTING) return;

      isConnectingRef.current = true;
      isManualCloseRef.current = false;

      const ws = new WebSocket(API_WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("✅ WebSocket 연결됨");
        isConnectingRef.current = false;
        reconnectAttemptsRef.current = 0; // 성공하면 카운터 리셋
        setIsConnected(true);

        ws.send(JSON.stringify({
          action: "joinServer",
          serverId,
          userId,
        }));
      };

      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          onMessageRef.current?.(parsed);
        } catch (err) {
          console.error("WebSocket 메시지 파싱 실패:", err);
        }
      };

      ws.onclose = (event) => {
        isConnectingRef.current = false;
        setIsConnected(false);

        // 의도적 종료(언마운트, 채널 전환)면 재연결 안 함
        if (isManualCloseRef.current) {
          console.log("WebSocket 정상 종료");
          return;
        }

        // 비정상 종료 → 재연결 시도
        const attempts = reconnectAttemptsRef.current;
        if (attempts >= MAX_RECONNECT_ATTEMPTS) {
          console.error(`❌ 재연결 ${MAX_RECONNECT_ATTEMPTS}회 실패. 중단.`);
          return;
        }

        // exponential backoff: 1s → 2s → 4s → 8s → ... → 최대 30s
        const delay = Math.min(BASE_DELAY_MS * Math.pow(2, attempts), MAX_DELAY_MS);
        reconnectAttemptsRef.current = attempts + 1;

        console.log(`🔄 ${delay}ms 후 재연결 시도 (${attempts + 1}/${MAX_RECONNECT_ATTEMPTS}) — code:${event.code}`);

        reconnectTimerRef.current = setTimeout(() => {
          connect();
        }, delay);
      };

      ws.onerror = (err) => {
        console.error("WebSocket 오류:", err);
        // onerror 후 onclose가 자동 호출되므로 재연결 로직은 onclose에 일임
      };
    };

    // 페이지 visibility 변경 처리 (탭 복귀 시 연결 점검)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const ws = wsRef.current;
        if (!ws || ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
          console.log("👁️ 탭 복귀 → 재연결 시도");
          reconnectAttemptsRef.current = 0; // 사용자 액션이므로 카운터 리셋
          connect();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // 초기 연결
    connect();

    // cleanup: 의도적 종료
    return () => {
      isManualCloseRef.current = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);

      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }

      if (wsRef.current) {
        wsRef.current.close(1000, "component unmount");
        wsRef.current = null;
      }

      reconnectAttemptsRef.current = 0;
      isConnectingRef.current = false;
    };
  }, [serverId, userId]);

  return { sendMessage, isConnected };
}

export default useWebSocket;