import React from 'react';

const ChatWindow = ({ activeChannel, channels }) => {
  const currentChannel = channels?.find(c => c.id === activeChannel);
  const messages = currentChannel?.messages || [];

  // 현재 사용자 이름 (나중에 Auth 정보에서 가져오겠지만, 지금은 상수로!)
  const CURRENT_USER = '';

  return (
    <main className="chat-main">
      <header className="chat-header">
        <h3> <span className="hash">#</span> {currentChannel ? (currentChannel.name || currentChannel.label) : "채널 선택 중..."}</h3>
        <p className="topic">{currentChannel?.topic }</p>
      </header>
      
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="no-messages">채널에 메시지가 없습니다. 대화를 시작해보세요!</div>
        ) : (
          messages.map((msg) => {
            // ── AI 요약 타입 ──
            if (msg.type === 'ai-summary') {
              return (
                <div key={msg.id} className="ai-summary-box">
                  <div className="ai-summary-header">
                    <span className="ai-icon">🤖</span>
                    <span className="ai-label">SAGE AI</span>
                    <span className="ai-tag">{msg.title}</span>
                  </div>
                  <div className="ai-summary-content">
                    <ul className="ai-summary-list">
                      {(msg.points || []).map((pt, i) => (
                        <li key={i}>{pt}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            }

            // ── 일반 메시지/파일/링크 타입 ──
            // 내 메시지 여부를 'StudyMaster_24' 대신 동적인 변수로 체크합니다.
            const isMine = msg.author === CURRENT_USER;
            return (
              <div key={msg.id} className={`message-dummy ${isMine ? 'message-mine' : ''}`}>
                <div className="avatar">{msg.avatar || msg.author[0]}</div>
                <div className="message-content">
                  <span className="author">{msg.author}</span>
                  {msg.text && <p>{msg.text}</p>}
                  
                  {/* 파일 첨부인 경우 */}
                  {msg.type === 'file' && (
                    <div className="file-attachment">
                      <span className="file-icon">📄</span>
                      <div className="file-info">
                        <span className="file-name">{msg.fileName}</span>
                        <span className="file-meta">{msg.fileMeta}</span>
                      </div>
                    </div>
                  )}

                  {/* 링크인 경우 */}
                  {msg.type === 'link' && (
                    <div className="file-attachment link-attachment">
                      <span className="file-icon">🔗</span>
                      <div className="file-info">
                        <span className="file-name">{msg.linkName}</span>
                        <span className="file-meta">{msg.linkUrl}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="chat-input-area">
        <input type="text" placeholder={`#${currentChannel?.name || currentChannel?.label || '채널'}에 메시지 보내기`}/>
      </div>
    </main>
  );
};

export default ChatWindow;
