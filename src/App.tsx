// =============================================
// Slotify — главный файл приложения
// Маршрутизация между страницами
// Защита роутов: без входа — только страница авторизации
// =============================================

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import AuthPage from "./pages/AuthPage";
import HomePage from "./pages/HomePage";
import ServicesPage from "./pages/ServicesPage";
import { MasterPage, DateTimePage, ConfirmPage } from "./pages/BookingFlow";
import SuccessPage from "./pages/SuccessPage";
import MyBookingsPage from "./pages/MyBookingsPage";

// Защищённый роут: если не авторизован — редирект на /login
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-rose-200 border-t-rose-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Публичный роут: если уже авторизован — редирект на главную
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-rose-200 border-t-rose-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Публичный — только для неавторизованных */}
      <Route path="/login" element={<PublicRoute><AuthPage /></PublicRoute>} />

      {/* Защищённые — только для авторизованных */}
      <Route path="/" element={<PrivateRoute><HomePage /></PrivateRoute>} />
      <Route path="/services" element={<PrivateRoute><ServicesPage /></PrivateRoute>} />
      <Route path="/booking/master" element={<PrivateRoute><MasterPage /></PrivateRoute>} />
      <Route path="/booking/datetime" element={<PrivateRoute><DateTimePage /></PrivateRoute>} />
      <Route path="/booking/confirm" element={<PrivateRoute><ConfirmPage /></PrivateRoute>} />
      <Route path="/booking/success" element={<PrivateRoute><SuccessPage /></PrivateRoute>} />
      <Route path="/my-bookings" element={<PrivateRoute><MyBookingsPage /></PrivateRoute>} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
