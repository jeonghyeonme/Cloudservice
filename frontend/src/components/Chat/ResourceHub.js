import React, { useState } from 'react';

const getFileIcon = (fileName) => {
  if (!fileName) return '📁'; // 파일명이 없을 때 기본 아이콘
  
  const extension = fileName.split('.').pop().toLowerCase(); // 확장자 추출

  if (['docx', 'hwp', 'doc'].includes(extension)) return '📝';
  if (extension === 'pdf') return '📄';
  if (['csv', 'xlsx', 'xls'].includes(extension)) return '📊';
  
  return '📁'; // 그 외 기타 파일들
};

const ResourceHub = ({ serverResources }) => {
  const [activeHubTab, setActiveHubTab] = useState('Files');

  // 데이터가 없을 경우를 대비한 기본값 설정
  const files = serverResources?.files || [];
  const links = serverResources?.links || [];

  return (
    <aside className="sidebar-right">
      <div className="resource-hub">
        {/* 탭 헤더 */}
        <div className="hub-header">
          <h3 className="hub-title">리소스 허브</h3>
          <div className="hub-tabs">
            {[ {en: 'Files', ko: '파일'}, {en: 'Links', ko: '링크'} ].map(tab => (
              <button
                key={tab.en}
                className={"hub-tab" + (activeHubTab === tab.en ? " active" : "")}
                onClick={() => setActiveHubTab(tab.en)}
              >
                {tab.ko}
              </button>
            ))}
          </div>
        </div>

        {/* ── Files 탭 ── */}
        {activeHubTab === 'Files' && (
          <div className="hub-section">
            <p className="hub-section-label">최근 파일</p>
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

        {/* ── Links 탭 ── */}
        {activeHubTab === 'Links' && (
          <div className="hub-section">
            <p className="hub-section-label">공유된 링크</p>
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
      </div>
    </aside>
  );
};

export default ResourceHub;
