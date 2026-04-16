import React, { useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { uploadFile, saveLink } from '../../lib/resources';

const getFileIcon = (fileName) => {
  if (!fileName) return '📁';
  
  const extension = fileName.split('.').pop().toLowerCase();

  if (['docx', 'hwp', 'doc'].includes(extension)) return '📝';
  if (extension === 'pdf') return '📄';
  if (['csv', 'xlsx', 'xls'].includes(extension)) return '📊';
  
  return '📁';
};

const ResourceHub = ({ roomResources }) => {
  const [activeHubTab, setActiveHubTab] = useState('Files');
  const { roomId } = useParams();
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  // 데이터가 없을 경우를 대비한 기본값 설정
  const files = roomResources?.files || [];
  const links = roomResources?.links || [];

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('10MB 이하의 파일만 업로드 가능합니다.');
      return;
    }

    setUploading(true);
    try {
      await uploadFile(roomId, file);
      alert(`${file.name} 업로드 완료!`);
      window.location.reload(); // 임시, 나중에 state 갱신으로 교체
    } catch (error) {
      console.error('업로드 실패:', error);
      alert(error.message || '업로드 실패');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleLinkAdd = async () => {
    const url = prompt('공유할 URL을 입력하세요:');
    if (!url) return;

    try {
      await saveLink(roomId, url);
      alert('링크가 저장되었습니다!');
      window.location.reload();
    } catch (error) {
      console.error('링크 저장 실패:', error);
      alert(error.message || '링크 저장 실패');
    }
  };

  return (
    <aside className="sidebar-right">
      <div className="resource-hub">
        {/* 탭 헤더 */}
        <div className="hub-header">
          <h3 className="hub-title">리소스 허브</h3>
          <div className="hub-tabs">
            {[{ en: 'Files', ko: '파일' }, { en: 'Links', ko: '링크' }].map(tab => (
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <p className="hub-section-label">최근 파일</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                style={{
                  background: '#00ff66',
                  color: '#000',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  opacity: uploading ? 0.6 : 1,
                }}
              >
                {uploading ? '업로드 중...' : '+ 업로드'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
              />
            </div>
            <div className="hub-file-list">
              {files.length > 0 ? files.map((file, i) => {
                const displayName = file.fileName || file.name;
                const fileExt = displayName?.split('.').pop()?.toLowerCase();
                const fileTypeClass = ['pdf', 'docx', 'csv'].includes(fileExt) ? fileExt : 'default';
                const displayMeta = file.fileType || file.meta || fileExt?.toUpperCase();

                return (
                  <a
                    key={file.fileId || i}
                    href={file.fileUrl || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hub-file-item"
                    style={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    <div className={`hub-file-icon ${fileTypeClass}`}>{getFileIcon(displayName)}</div>
                    <div className="hub-file-info">
                      <span className="hub-file-name">{displayName}</span>
                      <span className="hub-file-meta">{displayMeta}</span>
                    </div>
                  </a>
                );
              }) : <div className="empty-msg">공유된 파일이 없습니다.</div>}
            </div>
          </div>
        )}

        {/* ── Links 탭 ── */}
        {activeHubTab === 'Links' && (
          <div className="hub-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <p className="hub-section-label">공유된 링크</p>
              <button
                onClick={handleLinkAdd}
                style={{
                  background: '#00ff66',
                  color: '#000',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                + 링크 추가
              </button>
            </div>
            <div className="hub-file-list">
              {links.length > 0 ? links.map((link, i) => (
                <a
                  key={link.linkId || i}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hub-file-item"
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <div className="hub-file-icon" style={{ backgroundColor: '#1a2a3a' }}>
                    {link.image ? (
                      <img
                        src={link.image}
                        alt=""
                        style={{ width: '100%', height: '100%', borderRadius: '6px', objectFit: 'cover' }}
                      />
                    ) : '🔗'}
                  </div>
                  <div className="hub-file-info">
                    <span className="hub-file-name">{link.title}</span>
                    <span className="hub-file-meta">{link.siteName || link.url}</span>
                  </div>
                </a>
              )) : <div className="empty-msg">공유된 링크가 없습니다.</div>}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default ResourceHub;