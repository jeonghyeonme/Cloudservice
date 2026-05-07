import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useParams } from "react-router-dom";
import { uploadFile } from "../../lib/resources";

const IMAGE_MESSAGE_TYPES = new Set(["IMAGE", "image"]);
const FILE_MESSAGE_TYPES = new Set(["FILE", "file"]);
const LINK_MESSAGE_TYPES = new Set(["LINK", "link"]);
const AI_SUMMARY_MESSAGE_TYPES = new Set(["ai-summary", "AI_SUMMARY"]);

// Helper for deduplication
const isSameMessage = (left, right) => {
  if (!left || !right) return false;
  if (left.messageId && right.messageId && left.messageId === right.messageId) return true;

  const leftFileSignature = [
    left.channelId,
    left.senderId,
    left.messageType || left.type,
    left.fileId,
    left.imageUrl || left.fileUrl,
  ].join("|");
  const rightFileSignature = [
    right.channelId,
    right.senderId,
    right.messageType || right.type,
    right.fileId,
    right.imageUrl || right.fileUrl,
  ].join("|");

  if (left.fileId && right.fileId && leftFileSignature === rightFileSignature) {
    return true;
  }

  const leftUrl = left.imageUrl || left.fileUrl || "";
  const rightUrl = right.imageUrl || right.fileUrl || "";
  const leftType = left.messageType || left.type;
  const rightType = right.messageType || right.type;

  if (
    leftUrl &&
    rightUrl &&
    leftUrl === rightUrl &&
    left.channelId === right.channelId &&
    left.senderId === right.senderId &&
    leftType === rightType &&
    (leftType === "IMAGE" || leftType === "FILE")
  ) {
    return true;
  }

  const leftContent = left.content || left.text || "";
  const rightContent = right.content || right.text || "";

  if (
    leftType === "TEXT" &&
    rightType === "TEXT" &&
    left.channelId === right.channelId &&
    left.senderId === right.senderId &&
    leftContent &&
    leftContent === rightContent
  ) {
    const leftCreatedAt = left.createdAt ? new Date(left.createdAt).getTime() : 0;
    const rightCreatedAt = right.createdAt ? new Date(right.createdAt).getTime() : 0;
    if (leftCreatedAt && rightCreatedAt && Math.abs(leftCreatedAt - rightCreatedAt) < 3000) {
      return true;
    }
  }

  return false;
};

const getExternalFileItems = (event) => {
  const items = Array.from(event.dataTransfer?.items || []);
  return items.filter((item) => item.kind === "file");
};

const getDroppedFile = (event) => {
  const files = Array.from(event.dataTransfer?.files || []);
  return files[0] || null;
};

const isImageUpload = (file) => Boolean(file?.type?.startsWith("image/"));

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
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [pendingImage, setPendingImage] = useState(null);
  const dragDepthRef = useRef(0);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const activeChannelRef = useRef(activeChannel);
  useEffect(() => {
    activeChannelRef.current = activeChannel;
  }, [activeChannel]);

  const currentChannel = useMemo(
    () => channels?.find((ch) => (ch.chId || ch.id) === activeChannel),
    [channels, activeChannel],
  );

  // 채널 초기 메시지 로드
  useEffect(() => {
    if (!activeChannel || !channels) return;

    setChannelMessages((prev) => {
      const updated = { ...prev };
      channels.forEach((ch) => {
        const channelId = ch.chId || ch.id;
        if (!updated[channelId] && ch.messages?.length > 0) {
          updated[channelId] = ch.messages;
        }
      });
      return updated;
    });
  }, [channels, activeChannel]);

  useEffect(() => {
    return () => {
      if (pendingImage?.previewUrl) {
        URL.revokeObjectURL(pendingImage.previewUrl);
      }
    };
  }, [pendingImage]);

  const appendMessageToChannel = useCallback((channelId, message) => {
    if (!channelId || !message) return;

    setChannelMessages((prev) => {
      const existingMessages = prev[channelId] || [];
      const existingIndex = existingMessages.findIndex((item) => isSameMessage(item, message));

      if (existingIndex >= 0) {
        const nextMessages = [...existingMessages];
        nextMessages[existingIndex] = {
          ...nextMessages[existingIndex],
          ...message,
          isOptimistic: false,
        };

        return {
          ...prev,
          [channelId]: nextMessages,
        };
      }

      return {
        ...prev,
        [channelId]: [...existingMessages, message],
      };
    });
  }, []);

  const createOptimisticUploadMessage = useCallback((savedFile) => {
    const imageType = savedFile.fileType?.startsWith("image/");

    return {
      messageId: `temp-upload-${savedFile.fileId || Date.now()}`,
      serverId,
      channelId: activeChannel,
      senderId: user?.userId,
      senderNickname: user?.nickname,
      messageType: imageType ? "IMAGE" : "FILE",
      content: imageType ? "" : savedFile.fileName,
      imageUrl: imageType ? savedFile.fileUrl : "",
      fileUrl: savedFile.fileUrl,
      fileName: savedFile.fileName,
      fileType: savedFile.fileType,
      fileId: savedFile.fileId,
      s3ObjectKey: savedFile.s3ObjectKey,
      createdAt: new Date().toISOString(),
      isOptimistic: true,
    };
  }, [activeChannel, serverId, user?.nickname, user?.userId]);

  // ✅ 메시지 수신 핸들러 - ChatLayout의 ref에 등록
  const handleWsMessage = useCallback((parsed) => {
    const { action, data } = parsed;
    const channelId = data?.channelId || activeChannelRef.current;

    if (action === "receiveMessage" && data) {
      appendMessageToChannel(channelId, data);
      return;
    }

    if (action === "messageUpdated" && data) {
      setChannelMessages((prev) => ({
        ...prev,
        [channelId]: (prev[channelId] || []).map((msg) =>
          msg.messageId === data.messageId ? { ...msg, ...data } : msg,
        ),
      }));
      return;
    }

    if (action === "messageDeleted" && data) {
      setChannelMessages((prev) => ({
        ...prev,
        [channelId]: (prev[channelId] || []).map((msg) =>
          msg.messageId === data.messageId ? { ...msg, ...data } : msg,
        ),
      }));
    }
  }, [appendMessageToChannel]);

  // ✅ ChatLayout의 ref에 핸들러 등록
  useEffect(() => {
    if (chatMessageHandlerRef) {
      chatMessageHandlerRef.current = handleWsMessage;
    }
  }, [chatMessageHandlerRef, handleWsMessage]);

  const currentMessages = useMemo(
    () =>
      [...(channelMessages[activeChannel] || [])].sort(
        (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
      ),
    [channelMessages, activeChannel],
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentMessages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
  }, [activeChannel]);

  const broadcastUploadedFile = useCallback((savedFile, content = "") => {
    if (!savedFile || !activeChannel || !isConnected) return;

    const imageType = savedFile.fileType?.startsWith("image/");
    sendWsMessage?.("sendMessage", {
      serverId,
      channelId: activeChannel,
      senderId: user?.userId,
      senderNickname: user?.nickname,
      messageType: imageType ? "IMAGE" : "FILE",
      content: content || (imageType ? "" : savedFile.fileName),
      imageUrl: imageType ? savedFile.fileUrl : undefined,
      fileUrl: savedFile.fileUrl,
      fileName: savedFile.fileName,
      fileType: savedFile.fileType,
      fileId: savedFile.fileId,
      s3ObjectKey: savedFile.s3ObjectKey,
    });
  }, [activeChannel, isConnected, sendWsMessage, serverId, user?.nickname, user?.userId]);

  const handleUpload = useCallback(async (file) => {
    if (!file) return;
    if (!serverId || !activeChannel) {
      alert("업로드할 채널을 먼저 선택해주세요.");
      return;
    }
    if (!isConnected) {
      alert("웹소켓 연결 후 다시 시도해주세요.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert("10MB 이하의 파일만 업로드 가능합니다.");
      return;
    }

    if (isImageUpload(file)) {
      setPendingImage((prev) => {
        if (prev?.previewUrl) {
          URL.revokeObjectURL(prev.previewUrl);
        }

        return {
          file,
          previewUrl: URL.createObjectURL(file),
        };
      });
      return;
    }

    setIsUploading(true);
    try {
      const savedFile = await uploadFile(serverId, file);
      appendMessageToChannel(activeChannel, createOptimisticUploadMessage(savedFile));
      broadcastUploadedFile(savedFile);
    } catch (error) {
      console.error("채팅 파일 업로드 실패:", error);
      alert(error.message || "파일 업로드에 실패했습니다.");
    } finally {
      setIsUploading(false);
    }
  }, [activeChannel, appendMessageToChannel, broadcastUploadedFile, createOptimisticUploadMessage, isConnected, serverId]);

  const clearPendingImage = useCallback(() => {
    setPendingImage((prev) => {
      if (prev?.previewUrl) {
        URL.revokeObjectURL(prev.previewUrl);
      }
      return null;
    });
  }, []);

  const handleSend = useCallback(async () => {
    const trimmed = inputText.trim();

    if ((!trimmed && !pendingImage) || !isConnected || !activeChannel) return;

    if (pendingImage?.file) {
      setIsUploading(true);
      try {
        const savedFile = await uploadFile(serverId, pendingImage.file);
        const optimisticMessage = createOptimisticUploadMessage(savedFile);
        optimisticMessage.content = trimmed;
        appendMessageToChannel(activeChannel, optimisticMessage);

        broadcastUploadedFile(savedFile, trimmed);

        setInputText("");
        clearPendingImage();
      } catch (error) {
        console.error("이미지 전송 실패:", error);
        alert(error.message || "이미지 전송에 실패했습니다.");
      } finally {
        setIsUploading(false);
      }

      return;
    }

    sendWsMessage?.("sendMessage", {
      serverId,
      channelId: activeChannel,
      senderId: user?.userId,
      senderNickname: user?.nickname,
      messageType: "TEXT",
      content: trimmed,
    });

    setInputText("");
  }, [activeChannel, appendMessageToChannel, clearPendingImage, createOptimisticUploadMessage, broadcastUploadedFile, inputText, isConnected, pendingImage, sendWsMessage, serverId, user?.nickname, user?.userId]);

  const handleKeyDown = (event) => {
    if (event.nativeEvent?.isComposing || isComposing || event.keyCode === 229) {
      return;
    }

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  const handleFileInputChange = async (event) => {
    const file = event.target.files?.[0];
    await handleUpload(file);
    event.target.value = "";
  };

  const handleOpenFilePicker = () => {
    if (isUploading) return;
    fileInputRef.current?.click();
  };

  const handleDragEnter = (event) => {
    if (!getExternalFileItems(event).length) return;
    event.preventDefault();
    dragDepthRef.current += 1;
    setIsDragOver(true);
  };

  const handleDragOver = (event) => {
    if (!getExternalFileItems(event).length) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setIsDragOver(true);
  };

  const handleDragLeave = (event) => {
    if (!getExternalFileItems(event).length) return;
    event.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      setIsDragOver(false);
    }
  };

  const handleDrop = async (event) => {
    const file = getDroppedFile(event);
    if (!file) return;

    event.preventDefault();
    dragDepthRef.current = 0;
    setIsDragOver(false);
    await handleUpload(file);
  };

  const renderMessageBody = (msg) => {
    const messageType = msg.messageType || msg.type;
    const content = msg.content || msg.text || "";

    if (IMAGE_MESSAGE_TYPES.has(messageType) && msg.imageUrl) {
      return (
        <div className="message-media-group">
          <a
            href={msg.imageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="chat-image-link"
          >
            <img
              src={msg.imageUrl}
              alt={msg.fileName || "uploaded"}
              className="chat-image"
            />
          </a>
          {content && (
            <p>
              {content}
              {msg.isEdited && (
                <span className="message-edited">(수정됨)</span>
              )}
            </p>
          )}
        </div>
      );
    }

    return (
      <>
        {content && (
          <p>
            {content}
            {msg.isEdited && (
              <span className="message-edited">(수정됨)</span>
            )}
          </p>
        )}

        {FILE_MESSAGE_TYPES.has(messageType) && (
          <a
            href={msg.fileUrl || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="file-attachment"
          >
            <span className="file-icon">📄</span>
            <div className="file-info">
              <span className="file-name">{msg.fileName || content}</span>
              <span className="file-meta">{msg.fileType || "첨부 파일"}</span>
            </div>
          </a>
        )}

        {LINK_MESSAGE_TYPES.has(messageType) && (
          <div className="file-attachment link-attachment">
            <span className="file-icon">🔗</span>
            <div className="file-info">
              <span className="file-name">{msg.linkName}</span>
              <span className="file-meta">{msg.linkUrl}</span>
            </div>
          </div>
        )}
      </>
    );
  };

  const hasRenderableContent = (msg) => {
    const messageType = msg.messageType || msg.type;
    const content = msg.content || msg.text || "";

    if (AI_SUMMARY_MESSAGE_TYPES.has(msg.type) || AI_SUMMARY_MESSAGE_TYPES.has(msg.messageType)) {
      return true;
    }
    if (IMAGE_MESSAGE_TYPES.has(messageType)) {
      return Boolean(msg.imageUrl || content);
    }
    if (FILE_MESSAGE_TYPES.has(messageType)) {
      return Boolean(msg.fileUrl || msg.fileName || content);
    }
    if (LINK_MESSAGE_TYPES.has(messageType)) {
      return Boolean(msg.linkUrl || msg.linkName);
    }

    return Boolean(content);
  };

  return (
    <main
      className={`chat-main ${isDragOver ? "drag-active" : ""}`}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <header className="chat-header">
        <h3>
          <span className="hash">#</span>{" "}
          {currentChannel ? currentChannel.name || currentChannel.label : "채널 선택 중..."}
        </h3>
        <p className="topic">{currentChannel?.topic}</p>
        <span
          style={{
            marginLeft: "auto",
            fontSize: "11px",
            color: isConnected ? "#00ff66" : "#71717a",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <span style={{ fontSize: "8px" }}>●</span>
          {isConnected ? "연결됨" : "연결 중..."}
        </span>
      </header>

      <div className="chat-messages">
        {currentMessages.length === 0 ? (
          <div
            className="no-messages"
            style={{
              color: "#52525b",
              padding: "20px",
              textAlign: "center",
              fontSize: "14px",
            }}
          >
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

            // AI 요약 타입 렌더링
            if (AI_SUMMARY_MESSAGE_TYPES.has(msg.type) || AI_SUMMARY_MESSAGE_TYPES.has(msg.messageType)) {
              let aiResult = {};
              try {
                aiResult =
                  typeof msg.content === "string"
                    ? JSON.parse(msg.content)
                    : msg.content || {};
              } catch {
                aiResult = {};
              }

              const isDocument = aiResult.type === "document";
              const isImage = aiResult.type === "image";

              return (
                <div key={key} className="ai-summary-box">
                  <div className="ai-summary-header">
                    <span className="ai-icon">🤖</span>
                    <span className="ai-label">SAGE AI</span>
                    <span className="ai-tag">
                      {isDocument ? "문서 요약" : isImage ? "이미지 분석" : "AI 분석"}
                    </span>
                    {aiResult.fileName && (
                      <span
                        className="ai-filename"
                        style={{
                          marginLeft: "8px",
                          fontSize: "12px",
                          color: "#a1a1aa",
                          fontStyle: "italic",
                        }}
                      >
                        📎 {aiResult.fileName}
                      </span>
                    )}
                  </div>
                  <div className="ai-summary-content">
                    {isDocument && aiResult.summary && (
                      <>
                        <h4 className="ai-summary-title">📄 문서 요약</h4>
                        <div
                          style={{
                            fontSize: "13px",
                            color: "#d4d4d8",
                            lineHeight: 1.6,
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {aiResult.summary}
                        </div>
                      </>
                    )}
                    {isImage && (
                      <>
                        <h4 className="ai-summary-title">🖼️ 이미지 분석</h4>
                        {aiResult.labelsKo?.length > 0 && (
                          <div style={{ marginBottom: "8px" }}>
                            <span style={{ fontSize: "12px", color: "#a1a1aa" }}>
                              감지된 태그:
                            </span>{" "}
                            {aiResult.labelsKo.map((tag, i) => (
                              <span
                                key={i}
                                style={{
                                  display: "inline-block",
                                  background: "rgba(0,255,102,0.1)",
                                  color: "#00ff66",
                                  padding: "2px 8px",
                                  borderRadius: "10px",
                                  fontSize: "11px",
                                  margin: "2px 4px 2px 0",
                                }}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        {aiResult.detectedTexts?.length > 0 && (
                          <div>
                            <span style={{ fontSize: "12px", color: "#a1a1aa" }}>
                              감지된 텍스트:
                            </span>{" "}
                            <span style={{ fontSize: "13px", color: "#d4d4d8" }}>
                              {aiResult.detectedTexts.join(", ")}
                            </span>
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
            const isMine =
              msg.senderId === user?.userId || authorName === CURRENT_USER;
            const avatarChar = authorName.charAt(0).toUpperCase();

            if (!hasRenderableContent(msg)) {
              return null;
            }

            return (
              <div key={key} className={`message-dummy ${isMine ? "message-mine" : ""}`}>
                {!isMine && <div className="avatar">{avatarChar}</div>}
                <div className={`message-content ${isMine ? "mine-content" : ""}`}>
                  <span className={`author ${isMine ? "mine-author" : ""}`}>{authorName}</span>
                  {renderMessageBody(msg)}
                </div>
                {isMine && <div className="avatar">{avatarChar}</div>}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {isDragOver && (
        <div className="chat-upload-overlay">
            <div className="chat-upload-overlay-card">
            <div className="chat-upload-overlay-badge">UPLOAD</div>
            <strong>파일을 놓아 첨부 준비</strong>
            <span>이미지는 입력창에 미리보기로 올라가고, 전송 시 실제 업로드됩니다.</span>
          </div>
        </div>
      )}

      <div className="chat-input-area">
        {pendingImage && (
          <div className="chat-pending-image">
            <img
              src={pendingImage.previewUrl}
              alt={pendingImage.file?.name || "pending upload"}
              className="chat-pending-image-preview"
            />
            <div className="chat-pending-image-meta">
              <strong>{pendingImage.file?.name}</strong>
              <span>Enter 또는 전송 버튼으로 업로드 및 전송</span>
            </div>
            <button
              type="button"
              className="chat-pending-image-remove"
              onClick={clearPendingImage}
              aria-label="이미지 첨부 취소"
            >
              ×
            </button>
          </div>
        )}
        <div className="chat-input-shell">
          <button
            type="button"
            className="chat-input-icon-button"
            onClick={handleOpenFilePicker}
            disabled={!isConnected || isUploading}
            aria-label="파일 추가"
          >
            +
          </button>
          <input
            ref={fileInputRef}
            type="file"
            style={{ display: "none" }}
            onChange={handleFileInputChange}
          />
          <input
            type="text"
            placeholder={
              isConnected
                ? `#${currentChannel?.name || currentChannel?.label || "채널"}에 메시지 보내기`
                : "연결 중..."
            }
            value={inputText}
            onChange={(event) => setInputText(event.target.value)}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
            onKeyDown={handleKeyDown}
            disabled={!isConnected || isUploading}
          />
          <button
            type="button"
            className="chat-send-button"
            onClick={() => {
              void handleSend();
            }}
            disabled={!isConnected || isUploading || (!inputText.trim() && !pendingImage)}
            aria-label="메시지 전송"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M3 11.5 20.5 3l-4.4 18-4.8-6-5.9-3.5 8-3.4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </main>
  );
};

export default ChatWindow;
