// =============================================
// Экран успешной записи
// =============================================

import { Link } from "react-router-dom";
import { PageWrapper } from "../components/Layout";

export default function SuccessPage() {
  return (
    <PageWrapper>
      <div className="text-center py-16">
        {/* Анимированная иконка успеха */}
        <div className="relative w-24 h-24 mx-auto mb-8">
          <div className="absolute inset-0 bg-green-200 rounded-full animate-ping opacity-20" />
          <div className="relative w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-green-200">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        <h1 className="text-3xl font-extrabold text-gray-800 mb-2">Вы записаны!</h1>
        <p className="text-gray-500 text-lg mb-10 max-w-md mx-auto">
          Мы отправим вам напоминание перед визитом. Ждём вас!
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/my-bookings"
            className="bg-rose-500 text-white px-8 py-3.5 rounded-2xl font-semibold shadow-lg shadow-rose-200 hover:shadow-xl hover:scale-105 transition-all duration-200"
          >
            Мои записи
          </Link>
          <Link
            to="/"
            className="bg-white border border-gray-200 text-gray-700 px-8 py-3.5 rounded-2xl font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
          >
            На главную
          </Link>
        </div>
      </div>
    </PageWrapper>
  );
}
