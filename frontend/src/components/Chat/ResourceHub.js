import React, { useState } from 'react';

const getFileIcon = (fileName) => {
  if (!fileName) return '📁'; // 파일명이 없을 때 기본 아이콘
  
  const extension = fileName.split('.').pop().toLowerCase(); // 확장자 추출

  if (['docx', 'hwp', 'doc'].includes(extension)) return '📝';
  if (extension === 'pdf') return '📄';
  if (['csv', 'xlsx', 'xls'].includes(extension)) return '📊';
  
  return '📁'; // 그 외 기타 파일들
};

const ResourceHub = ({ roomResources }) => {
  const [activeHubTab, setActiveHubTab] = useState('Files');

  // 데이터가 없을 경우를 대비한 기본값 설정
  const files = roomResources?.files || [];
  const links = roomResources?.links || [];
  const pins = roomResources?.pins || [];
  const meetings = roomResources?.meetings || [];

  return (
    <aside className="sidebar-right">
      <div className="resource-hub">
        {/* 탭 헤더 */}
        <div className="hub-header">
          <h3 className="hub-title">RESOURCE HUB</h3>
          <div className="hub-tabs">
            {['Files', 'Links', 'Pins', 'Meeting'].map(tab => (
              <button
                key={tab}
                className={"hub-tab" + (activeHubTab === tab ? " active" : "")}
                onClick={() => setActiveHubTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* ── Files 탭 ── */}
        {activeHubTab === 'Files' && (
          <div className="hub-section">
            <p className="hub-section-label">RECENT FILES</p>
            <div className="hub-file-list">
              {files.length > 0 ? files.map((file, i) => (
                <div key={i} className="hub-file-item">
                  <div className={`hub-file-icon ${file.type || 'default'}`}>{getFileIcon(file.name)}</div>
                  <div className="hub-file-info">
                    <span className="hub-file-name">{file.name}</span>
                    <span className="hub-file-meta">{file.meta}</span>
                  </div>
                </div>
              )) : <div className="empth-mag">공유된 파일이 없습니다.</div> }
            </div>
          </div>
        )}
                {/* <div className="hub-file-icon docx">📝</div>
                <div className="hub-file-info">
                  <span className="hub-file-name">Final_Exam_Prep_v2.docx</span>
                  <span className="hub-file-meta">Uploaded by Aiden</span>
                </div>
              </div>
              <div className="hub-file-item">
                <div className="hub-file-icon pdf">📄</div>
                <div className="hub-file-info">
                  <span className="hub-file-name">Spherical_Coordinates_Diagra...</span>
                  <span className="hub-file-meta">Uploaded 5h ago by Sarah M.</span>
                </div>
              </div>
              <div className="hub-file-item">
                <div className="hub-file-icon pdf">📄</div>
                <div className="hub-file-info">
                  <span className="hub-file-name">Stokes_Theorem_Notes.pdf</span>
                  <span className="hub-file-meta">Uploaded 12:45 AM</span>
                </div>
              </div>
              <div className="hub-file-item">
                <div className="hub-file-icon csv">📊</div>
                <div className="hub-file-info">
                  <span className="hub-file-name">Grade_Distribution_Calc3.csv</span>
                  <span className="hub-file-meta">Uploaded yesterday</span>
                </div>
              </div>
            </div>
          </div> */}

        {/* ── Links 탭 ── */}
        {activeHubTab === 'Links' && (
          <div className="hub-section">
            <p className="hub-section-label">SHARED LINKS</p>
            <div className="hub-file-list">
              {links.length > 0 ? links.map((links, i) => (
                <div key={i} className="hub-file-item">
                  <div className="hub-file-icon" style={{backgroundColor:'#1a2a3a'}}>🔗</div>
                  <div className="hub-file-info">
                    <span className="hub-file-name">{links.title}</span>
                    <span className="hub-file-meta">{links.url}</span>
                  </div>
                </div>
              )) : <div className="empty-mag">공유된 링크가 없습니다.</div> }
              </div>
            </div>
        )}

        {/* ── Pins 탭 ── */}
        {activeHubTab === 'Pins' && (
          <div className="hub-section">
            <p className="hub-section-label">PINNED MESSAGES</p>
            <div className="hub-file-list">
              {pins.length > 0 ? pins.map((pin, i) => (
                <div key={i} className="hub-pin-item">
                  <div className="hub-pin-author">
                    <div className="avatar" style={{width:20,minWidth:20,height:20,minHeight:20,fontSize:9}}>{pin.author[0]}</div>
                    <span>{pin.author}</span>
                    <span className="hub-pin-time">{pin.time}</span>
                  </div>
                  <p className="hub-pin-text">{pin.text}</p>
                </div>
              )) : <div className="empty-mag">고정된 메시지가 없습니다.</div> }
            </div>
          </div>
        )}
                  {/* <div className="avatar" style={{width:20,minWidth:20,height:20,minHeight:20,fontSize:9,backgroundColor:'#14532d',color:'#00ff66'}}>AI</div>
                  <span style={{color:'#00ff66'}}>SAGE AI</span>
                  <span className="hub-pin-time">Sun 9:00 AM</span>
                </div>
                <p className="hub-pin-text">Weekly summary posted in shared-resources. Key topics: sorting algorithms, graph traversal, dynamic programming.</p> */}

        {/* ── Meeting 탭 ── */}
        {activeHubTab === 'Meeting' && (
          <div className="hub-section">
            <p className="hub-section-label">UPCOMING MEETINGS</p>
            {meetings.length > 0 ? meetings.map((meet, i) => (
              <div key={i} className="hub-meeting" style={{background:'linear-gradient(135deg,#1a1a2e,#16213e)', borderColor:'rgba(100,100,255,0.2)', marginTop: 10}}>
                <div className="hub-meeting-label" style={{color:'#818cf8'}}>📅 SCHEDULED</div>
                <p className="hub-meeting-title">{meet.title}</p>
                <p className="hub-meeting-sub" style={{color:'#a5b4fc'}}>{meet.time}</p>
                <button className="hub-meeting-btn" style={{backgroundColor:'#818cf8', color:'#fff'}}>RSVP</button>
              </div>
            )) : <div className="empty-mag">예정된 미팅이 없습니다.</div> }
          </div>
        )}




            {/* <div className="hub-meeting">
              <div className="hub-meeting-label"><span className="meeting-dot">●</span> LIVE NOW</div>
              <p className="hub-meeting-title">Weekly Review Session</p>
              <p className="hub-meeting-sub">Started 5 minutes ago · 6 students joined</p>
              <button className="hub-meeting-btn">Join Lounge</button>
            </div>*/}
      </div>
    </aside>
  );
};

export default ResourceHub;
