import React, { useState } from 'react';
import { createRoom } from '../../lib/rooms';
import './CreateRoomModal.css';

const CreateRoomModal = ({ onClose }) => {
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState('Public');
  const [maxParticipants, setMaxParticipants] = useState(12);
  const [coverImage, setCoverImage] = useState(null);

  const handleSubmit = async (e) => {
    // const now = new Date();
    e.preventDefault();

    // 서버가 기대하는 이름표(title)로 데이터를 포장합니다.
    const newRoomData = {
      roomName: groupName,        // title -> roomName
      description: description,
      maxCapacity: Number(maxParticipants), // 정원 정보도 백엔드 필드명에 맞춤
      status: 'ACTIVE',
    };

    console.log("🚀 [STEP 1] 서버로 보낼 데이터(Payload):", newRoomData);

  try {
    const result = await createRoom(newRoomData);

    // [LOG 2] 서버가 실제로 DB에 저장하고 돌려준 데이터 확인
    console.log("✅ [STEP 2] 서버가 저장한 최종 데이터(Result):", result);

    alert(`${groupName} 랩이 성공적으로 구축되었습니다!`);
    onClose();
    window.location.reload(); 
  } catch (error) {
    console.error("🚨 [CRITICAL] 통신 에러 발생:", error);
    alert(error.message || "서버 통신 중 오류가 발생했습니다.");
  }
};

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        {/* 우측 상단 X 닫기 버튼 */}
        <button className="close-button" onClick={onClose}>✕</button>

        <div className="modal-header">
          <h2>새로운 스터디룸 만들기</h2>
          <p>함께 집중하고 성장할 수 있는 몰입 공간을 설계하세요.</p>
          <hr/>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>스터디룸 이름</label>
            <input 
              type="text" 
              placeholder="예: 양자 컴퓨팅 심화 학습"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>상세 설명</label>
            <textarea 
              placeholder="이 스터디룸의 목표와 주요 학습 분야를 정의하세요..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>공개 설정</label>
              <div className="toggle-group">
                {/* 선택된 값에 따라 'active' 클래스를 붙여 */}
                <button 
                  type="button" 
                  className={privacy === 'Public' ? 'active' : ''}
                  onClick={() => setPrivacy('Public')}
                >
                  공개
                </button>
                <button 
                  type="button" 
                  className={privacy === 'Private' ? 'active' : ''}
                  onClick={() => setPrivacy('Private')}
                >
                  비공개
                </button>
              </div>
            </div>
            
            <div className="form-group">
              <label>최대 정원</label>
              <select 
                value={maxParticipants} 
                onChange={(e) => setMaxParticipants(e.target.value)}
              >
                <option value={5}>5명</option>
                <option value={12}>12명</option>
                <option value={20}>20명</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>커버 이미지 업로드</label>
            <div className="upload-box">
              {/* 진짜 input은 CSS로 숨기고 id를 부여 */}
              <input 
                type="file" 
                id="fileUpload"
                onChange={(e) => setCoverImage(e.target.files[0])}
              />
              {/* label의 htmlFor 속성을 input의 id와 연결하면, label을 클릭해도 파일 창이 뜸 */}
              <label htmlFor="fileUpload">
                {coverImage ? (
                  <span className="file-name">{coverImage.name}</span>
                ) : (
                  <>
                    <span className="upload-icon">⊕</span>
                    <p>파일을 드래그하거나 클릭하여 브라우징하세요</p>
                  </>
                )}
              </label>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose}>취소</button>
            <button type="submit">스터디룸 생성</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateRoomModal;
