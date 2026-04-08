import React from 'react';
import { useNavigate } from 'react-router-dom';
import './NotFound.css';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="not-found-container">
      <div className="not-found-content">
        <h1 className="error-code">404</h1>
        <h2 className="error-message">길을 잃으셨나요?</h2>
        <p className="error-description">
          요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다.
        </p>
        <button className="go-home-btn" onClick={() => navigate('/')}>
          홈으로 돌아가기
        </button>
      </div>
    </div>
  );
};

export default NotFound;