import React, { createContext, useContext, useState, useEffect } from 'react';

// 전역에서 사용할 Auth Context 생성
const AuthContext = createContext();

/**
 * 전역 인증 상태 제공자 컴포넌트
 * App 전체를 감싸서 로그인 정보를 공유합니다.
 */
export const AuthProvider = ({ children }) => {
  // 초기 상태: 로컬 스토리지에 로그인 정보가 있으면 가져옵니다 (테스트용)
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('isLoggedIn') === 'true';
  });

  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  // 로그인 처리 함수
  const login = (userData = { name: 'StudyMaster_24', id: 'sm24' }) => {
    setIsLoggedIn(true);
    setUser(userData);
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('user', JSON.stringify(userData));
  };

  // 로그아웃 처리 함수
  const logout = () => {
    setIsLoggedIn(false);
    setUser(null);
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// 다른 컴포넌트에서 쉽게 사용할 수 있도록 커스텀 훅 제공
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
