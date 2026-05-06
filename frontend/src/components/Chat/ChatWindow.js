import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuth } from "../../contexts/AuthContext";
import { useParams } from 'react-router-dom';

/**
 * @param {string} activeChannel - 현재 활성 채널 ID
 * @param {Array} channels - 채널 목록
 * @param {function} sendWsMessage - ChatLayout에서 전달받은 WebSocket 전송 함수
 * @param {boolean} isConnected - WebSocket 연결 상태
 * @param {object} chatMessageHandlerRef - ChatLayout에서 메시지 핸들러 등록용 ref
 */
const ChatWindow = ({ activeChannel, channels, sendWsMessage, isConnected, chatMessageHandlerRef }) => {
  const { user } = useAuth();
  const { serverId } = useParams();
  const CURRENT_USER = user?.nickname || "";

  const [inputText, setInputText] = useState("");
  const [channelMessages, setChannelMessages] = useState({});
  const messagesEndRef = useRef(null);

  const activeChannelRef = useRef(activeChannel);
  useEffect(() => {
    activeChannelRef.current = activeChannel;
  }, [activeChannel]);

  const currentChannel = channels?.find(
    (ch) => (ch.chId || ch.id) === activeChannel
  );

  // 채널 초기 메시지 로드
  useEffect(() => {
    if (!activeChannel || !channels) return;
    setChannelMessages((prev) => {
      const updated = { ...prev };
      channels.forEach((ch) => {
        const cid = ch.chId || ch.id;
        if (!updated[cid] && ch.messages?.length > 0) {
          updated[cid] = ch.messages;
        }
      });
      return updated;
    });
  }, [channels, activeChannel]);

  // ✅ 메시지 수신 핸들러 - ChatLayout의 ref에 등록
  const handleWsMessage = useCallback((parsed) => {
    const { action, data } = parsed;
    const cid = activeChannelRef.current;

    if (action === "receiveMessage" && data) {
      setChannelMessages((prev) => ({
        ...prev,
        [cid]: [...(prev[cid] || []), data],
      }));
    }

    if (action === "messageUpdated" && data) {
      setChannelMessages((prev) => ({
        ...prev,
        [cid]: (prev[cid] || []).map((msg) =>
          msg.messageId === data.messageId ? { ...msg, ...data } : msg
        ),
      }));
    }

    if (action === "messageDeleted" && data) {
      setChannelMessages((prev) => ({
        ...prev,
        [cid]: (prev[cid] || []).map((msg) =>
          msg.messageId === data.messageId ? { ...msg, ...data } : msg
        ),
      }));
    }
  }, []);

  // ✅ ChatLayout의 ref에 핸들러 등록
  useEffect(() => {
    if (chatMessageHandlerRef) {
      chatMessageHandlerRef.current = handleWsMessage;
    }
  }, [chatMessageHandlerRef, handleWsMessage]);

  const currentMessages = useMemo(() => {
    return [...(channelMessages[activeChannel] || [])]
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }, [channelMessages, activeChannel]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentMessages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
  }, [activeChannel]);

  const handleSend = () => {
    const trimmed = inputText.trim();
    if (!trimmed || !isConnected) return;

    sendWsMessage?.("sendMessage", {
      serverId,
      senderId: user?.userId,
      senderNickname: user?.nickname,
      messageType: "TEXT",
      content: trimmed,
    });

    setInputText("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <main className="chat-main">
      <header className="chat-header">
        <h3>
          <span className="hash">#</span>{" "}
          {currentChannel ? (currentChannel.name || currentChannel.label) : "채널 선택 중..."}
        </h3>
        <p className="topic">{currentChannel?.topic}</p>
        <span style={{
          marginLeft: "auto",
          fontSize: "11px",
          color: isConnected ? "#00ff66" : "#71717a",
          display: "flex",
          alignItems: "center",
          gap: "4px",
        }}>
          <span style={{ fontSize: "8px" }}>●</span>
          {isConnected ? "연결됨" : "연결 중..."}
        </span>
      </header>

      <div className="chat-messages">
        {currentMessages.length === 0 ? (
          <div className="no-messages" style={{ color: "#52525b", padding: "20px", textAlign: "center", fontSize: "14px" }}>
            채널에 메시지가 없습니다. 대화를 시작해보세요!
          </div>
        ) : (
          currentMessages.map((msg, idx) => {
            const key = msg.messageId || idx;

            if (msg.isDeleted) {
              return (
                <div key={key} className="message-dummy">
                  <div className="avatar" style={{ opacity: 0.4 }}>?</div>
                  <div className="message-content">
                    <p style={{ color: "#52525b", fontStyle: "italic" }}>삭제된 메시지입니다.</p>
                  </div>
                </div>
              );
            }

            // ✅ AI 요약 타입 (기존 상세 렌더링 유지)
            if (msg.type === "ai-summary" || msg.messageType === "ai-summary" || msg.messageType === "AI_SUMMARY") {
              let aiResult = {};
              try {
                aiResult = typeof msg.content === "string" ? JSON.parse(msg.content) : msg.content || {};
              } catch { aiResult = {}; }

              const isDocument = aiResult.type === "document";
              const isImage = aiResult.type === "image";

              return (
                <div key={key} className="ai-summary-box">
                  <div className="ai-summary-header">
                    <span className="ai-icon">🤖</span>
                    <span className="ai-label">SAGE AI</span>
                    <span className="ai-tag">{isDocument ? "문서 요약" : isImage ? "이미지 분석" : "AI 분석"}</span>
                    {aiResult.fileName && (
                      <span className="ai-filename" style={{ marginLeft: "8px", fontSize: "12px", color: "#a1a1aa", fontStyle: "italic" }}>
                        📎 {aiResult.fileName}
                      </span>
                    )}
                  </div>
                  <div className="ai-summary-content">
                    {isDocument && aiResult.summary && (
                      <>
                        <h4 className="ai-summary-title">📄 문서 요약</h4>
                        <div style={{ fontSize: "13px", color: "#d4d4d8", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                          {aiResult.summary}
                        </div>
                      </>
                    )}
                    {isImage && (
                      <>
                        <h4 className="ai-summary-title">🖼️ 이미지 분석</h4>
                        {aiResult.labelsKo?.length > 0 && (
                          <div style={{ marginBottom: "8px" }}>
                            <span style={{ fontSize: "12px", color: "#a1a1aa" }}>감지된 태그: </span>
                            {aiResult.labelsKo.map((tag, i) => (
                              <span key={i} style={{
                                display: "inline-block", background: "rgba(0,255,102,0.1)",
                                color: "#00ff66", padding: "2px 8px", borderRadius: "10px",
                                fontSize: "11px", margin: "2px 4px 2px 0"
                              }}>{tag}</span>
                            ))}
                          </div>
                        )}
                        {aiResult.detectedTexts?.length > 0 && (
                          <div>
                            <span style={{ fontSize: "12px", color: "#a1a1aa" }}>감지된 텍스트: </span>
                            <span style={{ fontSize: "13px", color: "#d4d4d8" }}>{aiResult.detectedTexts.join(", ")}</span>
                          </div>
                        )}
                      </>
                    )}
                    {!isDocument && !isImage && (
                      <div style={{ fontSize: "13px", color: "#d4d4d8" }}>{msg.content}</div>
                    )}
                  </div>
                </div>
              );
            }

            const authorName = msg.senderNickname || msg.author || "알 수 없음";
            const isMine = (msg.senderId === user?.userId) || (authorName === CURRENT_USER);
            const avatarChar = authorName.charAt(0).toUpperCase();
            const content = msg.content || msg.text || "";

            return (
              <div key={key} className={`message-dummy ${isMine ? "message-mine" : ""}`}>
                {!isMine && <div className="avatar">{avatarChar}</div>}
                <div className={`message-content ${isMine ? "mine-content" : ""}`}>
                  <span className={`author ${isMine ? "mine-author" : ""}`}>{authorName}</span>
                  {content && (
                    <p>
                      {content}
                      {msg.isEdited && <span style={{ fontSize: "10px", color: "#71717a", marginLeft: "6px" }}>(수정됨)</span>}
                    </p>
                  )}
                  {(msg.type === "file" || msg.messageType === "FILE") && (
                    <div className="file-attachment">
                      <span className="file-icon">📄</span>
                      <div className="file-info">
                        <span className="file-name">{msg.fileName}</span>
                        <span className="file-meta">{msg.fileMeta}</span>
                      </div>
                    </div>
                  )}
                  {(msg.type === "link" || msg.messageType === "LINK") && (
                    <div className="file-attachment link-attachment">
                      <span className="file-icon">🔗</span>
                      <div className="file-info">
                        <span className="file-name">{msg.linkName}</span>
                        <span className="file-meta">{msg.linkUrl}</span>
                      </div>
                    </div>
                  )}
                </div>
                {isMine && <div className="avatar">{avatarChar}</div>}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-area">
        <input
          type="text"
          placeholder={
            isConnected
              ? `#${currentChannel?.name || currentChannel?.label || "채널"}에 메시지 보내기`
              : "연결 중..."
          }
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={!isConnected}
        />
      </div>
    </main>
  );
};

export default ChatWindow;