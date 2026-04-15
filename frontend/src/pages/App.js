import React from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import "./App.css";

// Context
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { RoomProvider, useRooms } from "../contexts/RoomContext";

// Components
import Onboarding from "../components/Onboarding/Onboarding";
import Login from "../components/Auth/Login";
import Register from "../components/Auth/Register";
import ChatLayout from "../components/Chat/ChatLayout";
import ExploreRooms from "../components/Rooms/ExploreRooms";
import NotFound from "../components/NotFound/NotFound";
import SharedLayout from "../components/layout/SharedLayout";
import { PATHS } from "../constants/path";

/**
 * 로그인 여부에 따라 라우팅을 보호하는 컴포넌트
 */
const ProtectedRoute = ({ children }) => {
  const { isLoggedIn } = useAuth();
  if (!isLoggedIn) {
    return <Navigate to={PATHS.login} replace />;
  }
  return children;
};

function AppRoutes() {
  const navigate = useNavigate();
  const { isLoggedIn, refreshToken, logout } = useAuth();
  const { clearJoinedRooms } = useRooms();

  const handleLogout = async () => {
    try {
      if (refreshToken) {
        const { logout: logoutApi } = await import("../lib/auth");
        await logoutApi(refreshToken);
      }
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      clearJoinedRooms();
      logout();
      navigate(PATHS.onboarding, { replace: true });
    }
  };

  return (
    <SharedLayout isLoggedIn={isLoggedIn} onLogout={handleLogout}>
      <Routes>
        {/* 기존 라우팅 로직 유지 (이미 로그인한 사용자가 로그인/회원가입 페이지 접근 방지) */}
        <Route path={PATHS.home} element={isLoggedIn ? <Navigate to={PATHS.explore} replace /> : <Navigate to={PATHS.onboarding} replace />} />
        <Route path={PATHS.onboarding} element={isLoggedIn ? <Navigate to={PATHS.explore} replace /> : <Onboarding />} />
        <Route
          path={PATHS.login}
          element={isLoggedIn ? <Navigate to={PATHS.explore} replace /> : <Login />}
        />
        <Route
          path={PATHS.register}
          element={isLoggedIn ? <Navigate to={PATHS.explore} replace /> : <Register />}
        />
        <Route path={PATHS.room} element={<ProtectedRoute><ChatLayout /></ProtectedRoute>} />
        <Route path={PATHS.explore} element={<ProtectedRoute><ExploreRooms /></ProtectedRoute>} />
        {/* 404 Not Found 페이지 처리 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </SharedLayout>
  );
}

function App() {
  return (
    <AuthProvider>
      <RoomProvider>
        <AppRoutes />
      </RoomProvider>
    </AuthProvider>
  );
}

export default App;
