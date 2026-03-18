// =============================================
// Общий layout: Header + контент + Footer
// Используется на всех страницах
// =============================================

import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

// --- Header: логотип и навигация ---
export function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="bg-rose-500 text-white shadow-lg">
      <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-9 h-9 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
            <span className="text-lg font-black">S</span>
          </div>
          <span className="text-2xl font-extrabold tracking-tight">Slotify</span>
        </Link>
        {user ? (
          <div className="flex items-center gap-3">
            {user.role === "admin" && (
              <Link
                to="/admin"
                className="bg-white/15 backdrop-blur-sm border border-white/25 text-white px-5 py-2 rounded-xl font-medium hover:bg-white/25 transition-all duration-200"
              >
                Админ-панель
              </Link>
            )}
            <Link
              to="/my-bookings"
              className="bg-white/15 backdrop-blur-sm border border-white/25 text-white px-5 py-2 rounded-xl font-medium hover:bg-white/25 transition-all duration-200"
            >
              Мои записи
            </Link>
            <span className="text-sm text-rose-100 hidden sm:inline">{user.name}</span>
            <button
              onClick={logout}
              className="text-sm text-white/70 hover:text-white transition-colors"
            >
              Выйти
            </button>
          </div>
        ) : (
          <Link
            to="/login"
            className="bg-white/15 backdrop-blur-sm border border-white/25 text-white px-5 py-2 rounded-xl font-medium hover:bg-white/25 transition-all duration-200"
          >
            Зарегистрироваться
          </Link>
        )}
      </div>
    </header>
  );
}

// --- Footer: контакты салона ---
export function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 mt-auto">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-center sm:text-left">
            <p className="font-semibold text-white text-lg mb-1">Slotify</p>
            <p className="text-sm">ул. Примерная, 42 | Москва</p>
          </div>
          <div className="text-center sm:text-right">
            <p className="text-sm font-medium text-gray-300">+7 (999) 123-45-67</p>
            <p className="text-sm">Пн — Вс: 9:00 — 20:00</p>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-6 pt-4 text-center text-xs text-gray-500">
          &copy; 2026 Slotify. Все права защищены.
        </div>
      </div>
    </footer>
  );
}

// --- Индикатор шагов бронирования ---
const steps = ["Мастер", "Дата и время", "Подтверждение"];

export function BookingSteps({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-1 mb-8">
      {steps.map((step, i) => (
        <div key={step} className="flex items-center gap-1">
          <div className="flex items-center gap-2">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                i < current
                  ? "bg-green-500 text-white shadow-md shadow-green-200"
                  : i === current
                    ? "bg-rose-500 text-white shadow-md shadow-rose-200"
                    : "bg-gray-100 text-gray-400"
              }`}
            >
              {i < current ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                i + 1
              )}
            </div>
            <span
              className={`text-sm hidden sm:inline transition-colors ${
                i <= current ? "text-gray-800 font-semibold" : "text-gray-400"
              }`}
            >
              {step}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`w-10 h-0.5 mx-2 rounded transition-colors ${
                i < current ? "bg-green-400" : "bg-gray-200"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// --- Кнопка «Назад» ---
export function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-gray-400 hover:text-rose-600 mb-5 transition-colors duration-200 group"
    >
      <svg className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
      <span className="text-sm font-medium">Назад</span>
    </button>
  );
}

// --- Обёртка страницы ---
export function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-gray-100">
      <Header />
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-8">
        {children}
      </main>
      <Footer />
    </div>
  );
}
