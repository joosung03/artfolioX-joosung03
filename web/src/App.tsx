import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import WorksPage from "./pages/WorksPage";
import { RequireAuth } from "./auth/RequireAuth";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 비로그인 전용 페이지 */}
        <Route path="/login" element={<LoginPage />} />

        {/* 로그인 필요 페이지들 */}
        <Route
          path="/"
          element={
            <RequireAuth>
              <DashboardPage />
            </RequireAuth>
          }
        />

        <Route
          path="/works"
          element={
            <RequireAuth>
              <WorksPage />
            </RequireAuth>
          }
        />

        {/* 나머지 모든 경로는 루트로 리다이렉트 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;