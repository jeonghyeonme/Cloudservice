import React, { useState } from 'react';
import './CreateRoomModal.css';

const CreateRoomModal = ({ onClose }) => {
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState('Public');
  const [maxParticipants, setMaxParticipants] = useState(12);
  const [coverImage, setCoverImage] = useState(null);

  const handleSubmit = async (e) => {
    const now = new Date();
    e.preventDefault();

    // 서버가 기대하는 이름표(title)로 데이터를 포장합니다.
    const newRoomData = {
      title: groupName,           // 딱 이것만!
      description: description,
      status: 'ACTIVE',
    };

    console.log("🚀 [STEP 1] 서버로 보낼 데이터(Payload):", newRoomData);

  try {
    const response = await fetch('http://localhost:4000/dev/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newRoomData),
    });

    // [LOG 2] HTTP 상태 코드 확인 (200, 201 등)
    console.log("📡 [STEP 2] 서버 응답 상태(Status):", response.status);

    if (response.ok) {
      const result = await response.json();
      
      // [LOG 3] 서버가 실제로 DB에 저장하고 돌려준 데이터 확인
      console.log("✅ [STEP 3] 서버가 저장한 최종 데이터(Result):", result);
      
      alert(`${groupName} 랩이 성공적으로 구축되었습니다!`);
      onClose();
      window.location.reload(); 
    } else {
      const errorData = await response.json();
      console.error("❌ [ERROR] 서버 응답 에러:", errorData);
      throw new Error('방 생성에 실패했습니다.');
    }
  } catch (error) {
    console.error("🚨 [CRITICAL] 통신 에러 발생:", error);
    alert("서버 통신 중 오류가 발생했습니다.");
  }
};

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        {/* 우측 상단 X 닫기 버튼 */}
        <button className="close-button" onClick={onClose}>✕</button>

        <div className="modal-header">
          <h2>Create Your Study Lab</h2>
          <p>Architect a focused space for collaborative deep work.</p>
          <hr/>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>GROUP NAME</label>
            <input 
              type="text" 
              placeholder="e.g. Quantum Computing Deep Dive"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>DESCRIPTION</label>
            <textarea 
              placeholder="Define the objectives and focus areas of this lab..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>PRIVACY LEVEL</label>
              <div className="toggle-group">
                {/* 선택된 값에 따라 'active' 클래스를 붙여 */}
                <button 
                  type="button" 
                  className={privacy === 'Public' ? 'active' : ''}
                  onClick={() => setPrivacy('Public')}
                >
                  Public
                </button>
                <button 
                  type="button" 
                  className={privacy === 'Private' ? 'active' : ''}
                  onClick={() => setPrivacy('Private')}
                >
                  Private
                </button>
              </div>
            </div>
            
            <div className="form-group">
              <label>MAX PARTICIPANTS</label>
              <select 
                value={maxParticipants} 
                onChange={(e) => setMaxParticipants(e.target.value)}
              >
                <option value={5}>5 Participants</option>
                <option value={12}>12 Participants</option>
                <option value={20}>20 Participants</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>UPLOAD COVER IMAGE</label>
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
                    <p>Drag & drop or click to browse</p>
                  </>
                )}
              </label>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose}>Cancel</button>
            <button type="submit">CREATE GROUP</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateRoomModal;