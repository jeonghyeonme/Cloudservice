import React, { useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { uploadFile, saveLink, deleteFile, deleteLink } from '../../lib/resources';

import './ResourceHub.css';

const getFileIcon = (fileName) => {
  if (!fileName) return '📁';
  const extension = fileName.split('.').pop().toLowerCase();
  if (['docx', 'hwp', 'doc'].includes(extension)) return '📝';
  if (extension === 'pdf') return '📄';
  if (['csv', 'xlsx', 'xls'].includes(extension)) return '📊';
  return '📁';
};

const ResourceHub = ({ serverResources, setCurrentServer }) => {
  const [activeHubTab, setActiveHubTab] = useState('Files');
  const { serverId } = useParams();
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const files = serverResources?.files || [];
  const links = serverResources?.links || [];

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('10MB 이하의 파일만 업로드 가능합니다.');
      return;
    }
    setUploading(true);
    try {
      const savedFile = await uploadFile(serverId, file);
      if (setCurrentServer && savedFile) {
        setCurrentServer(prev => ({
          ...prev,
          files: [...(prev?.files || []), savedFile],
        }));
      }
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
      const result = await saveLink(serverId, url);
      if (setCurrentServer && result?.link) {
        setCurrentServer(prev => ({
          ...prev,
          links: [...(prev?.links || []), result.link],
        }));
      }
    } catch (error) {
      console.error('링크 저장 실패:', error);
      alert(error.message || '링크 저장 실패');
    }
  };

  // 파일 삭제 핸들러
  const handleDeleteFile = async (e, fileId) => {
    e.preventDefault(); // 삭제 버튼 클릭 시 링크 이동 방지
    e.stopPropagation(); 
    
    if (!window.confirm('파일을 삭제하시겠습니까?')) return;
    
    try {
      await deleteFile(serverId, fileId);
      if (setCurrentServer) {
        // 즉시 화면에서 제거
        setCurrentServer(prev => ({
          ...prev,
          files: (prev?.files || []).filter(f => f.fileId !== fileId),
        }));
      }
    } catch (error) {
      console.error('파일 삭제 실패:', error);
      alert(error.message || '파일 삭제 실패');
    }
  };

  // 링크 삭제 핸들러
  const handleDeleteLink = async (e, linkId) => {
    e.preventDefault();
    e.stopPropagation();

    if (!window.confirm('링크를 삭제하시겠습니까?')) return;

    try {
      await deleteLink(serverId, linkId);
      if (setCurrentServer) {
        // 즉시 화면에서 제거
        setCurrentServer(prev => ({
          ...prev,
          links: (prev?.links || []).filter(l => l.linkId !== linkId),
        }));
      }
    } catch (error) {
      console.error('링크 삭제 실패:', error);
      alert(error.message || '링크 삭제 실패');
    }
  };

  const renderFileItem = (file, i) => {
    const displayName = file.fileName || file.name;
    const fileExt = displayName ? displayName.split('.').pop().toLowerCase() : '';
    const fileTypeClass = ['pdf', 'docx', 'csv'].includes(fileExt) ? fileExt : 'default';
    const displayMeta = file.fileType || file.meta || fileExt.toUpperCase();

    return (
      // 호버 클래스(resource-item-hover) 및 position relative
      <a key={file.fileId || i} href={file.fileUrl || '#'} target="_blank" rel="noopener noreferrer" className="hub-file-item resource-item-hover" style={{ textDecoration: 'none', color: 'inherit', position: 'relative' }}>
        <div className={'hub-file-icon ' + fileTypeClass}>{getFileIcon(displayName)}</div>
        <div className="hub-file-info">
          <span className="hub-file-name">{displayName}</span>
          <span className="hub-file-meta">{displayMeta}</span>
        </div>
        <button className="delete-btn" onClick={(e) => handleDeleteFile(e, file.fileId)}>
          ×
        </button>
      </a>
    );
  };

  const renderLinkItem = (link, i) => {
    return (
      <a key={link.linkId || i} href={link.url} target="_blank" rel="noopener noreferrer" className="hub-file-item resource-item-hover" style={{ textDecoration: 'none', color: 'inherit', position: 'relative' }}>
        <div className="hub-file-icon" style={{ backgroundColor: '#1a2a3a' }}>
          {link.image
            ? <img src={link.image} alt="" style={{ width: '100%', height: '100%', borderRadius: '6px', objectFit: 'cover' }} />
            : '🔗'
          }
        </div>
        <div className="hub-file-info">
          <span className="hub-file-name">{link.title}</span>
          <span className="hub-file-meta">{link.siteName || link.url}</span>
        </div>
        <button className="delete-btn" onClick={(e) => handleDeleteLink(e, link.linkId)}>
          ×
        </button>
      </a>
    );
  };

  return (
    <aside className="sidebar-right">
      <div className="resource-hub">
        <div className="hub-header">
          <h3 className="hub-title">리소스 허브</h3>
          <div className="hub-tabs">
            {[{ en: 'Files', ko: '파일' }, { en: 'Links', ko: '링크' }].map(function(tab) {
              return (
                <button
                  key={tab.en}
                  className={'hub-tab' + (activeHubTab === tab.en ? ' active' : '')}
                  onClick={function() { setActiveHubTab(tab.en); }}
                >
                  {tab.ko}
                </button>
              );
            })}
          </div>
        </div>

        {activeHubTab === 'Files' && (
          <div className="hub-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <p className="hub-section-label">최근 파일</p>
              <button
                onClick={function() { fileInputRef.current && fileInputRef.current.click(); }}
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
              {files.length > 0
                ? files.map(renderFileItem)
                : <div className="empty-msg">공유된 파일이 없습니다.</div>
              }
            </div>
          </div>
        )}

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
              {links.length > 0
                ? links.map(renderLinkItem)
                : <div className="empty-msg">공유된 링크가 없습니다.</div>
              }
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default ResourceHub;