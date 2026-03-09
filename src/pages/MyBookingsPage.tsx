// =============================================
// Мои записи — список бронирований пользователя
// Табы: Предстоящие / Прошедшие
// =============================================

import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { type Service, type Master } from "../data/mock";
import { PageWrapper, BackButton } from "../components/Layout";

// Тип записи, как приходит с API
interface BookingItem {
  id: number;
  service: Service;
  master: Master | null;
  date: string;
  time: string;
  status: string;
}

export default function MyBookingsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [cancelId, setCancelId] = useState<number | null>(null);

  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadBookings = () => {
    setLoading(true);
    setError(false);

    // Ищем записи по телефону, сохранённому при бронировании
    const phone = localStorage.getItem("slotify_phone") || "";
    fetch(`/api/bookings/my?phone=${encodeURIComponent(phone)}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => {
        setBookings(data);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  };

  useEffect(() => { loadBookings(); }, []);

  const filtered = bookings.filter((b) =>
    tab === "upcoming" ? b.status === "upcoming" : b.status === "past"
  );

  // Отменяет запись через API
  const confirmCancel = () => {
    if (!cancelId) return;

    fetch(`/api/bookings/${cancelId}/cancel`, { method: "PATCH" })
      .then((r) => {
        if (!r.ok) throw new Error();
        // Убираем из списка или обновляем статус
        setBookings((prev) => prev.filter((b) => b.id !== cancelId));
        setCancelId(null);
      })
      .catch(() => {
        setCancelId(null);
      });
  };

  return (
    <PageWrapper>
      <BackButton onClick={() => navigate(-1)} />
      <h1 className="text-2xl font-bold text-gray-800 mb-5">Мои записи</h1>

      {/* Табы */}
      <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-2xl w-fit">
        <button
          onClick={() => setTab("upcoming")}
          className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
            tab === "upcoming"
              ? "bg-white text-gray-800 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Предстоящие
        </button>
        <button
          onClick={() => setTab("past")}
          className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
            tab === "past"
              ? "bg-white text-gray-800 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Прошедшие
        </button>
      </div>

      {/* Загрузка */}
      {loading && (
        <div className="text-center py-16">
          <div className="w-10 h-10 border-4 border-rose-200 border-t-rose-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Загружаем записи...</p>
        </div>
      )}

      {/* Ошибка */}
      {!loading && error && (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-gray-600 text-lg mb-2">Не удалось загрузить записи</p>
          <button onClick={loadBookings} className="bg-rose-500 text-white px-6 py-2.5 rounded-xl font-semibold hover:shadow-lg hover:shadow-rose-200 transition-all">
            Повторить
          </button>
        </div>
      )}

      {/* Список */}
      {!loading && !error && filtered.length > 0 && (
        <div className="space-y-4">
          {filtered.map((booking) => (
            <div
              key={booking.id}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-300"
            >
              <div className="p-5">
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-3">
                    {booking.master && (
                      <img
                        src={booking.master.photo}
                        alt={booking.master.name}
                        className="w-12 h-12 rounded-xl object-cover ring-2 ring-gray-100"
                      />
                    )}
                    <div>
                      <h3 className="font-bold text-gray-800">
                        {booking.service.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {booking.master?.name || "Любой мастер"}
                      </p>
                    </div>
                  </div>
                  <p className="text-lg font-medium text-rose-600">
                    {booking.service.price.toLocaleString()} ₽
                  </p>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {booking.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {booking.time}
                    </span>
                  </div>
                  {tab === "upcoming" && (
                    <button
                      onClick={() => setCancelId(booking.id)}
                      className="text-sm text-red-400 hover:text-red-600 font-medium transition-colors"
                    >
                      Отменить
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Пустой список */}
      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-gray-400 text-lg mb-2">
            {tab === "upcoming"
              ? "У вас нет предстоящих записей"
              : "У вас пока нет прошедших записей"}
          </p>
          {tab === "upcoming" && (
            <Link
              to="/services"
              className="inline-block mt-4 bg-rose-500 text-white px-6 py-3 rounded-2xl font-semibold shadow-lg shadow-rose-200 hover:shadow-xl hover:scale-105 transition-all duration-200"
            >
              Записаться
            </Link>
          )}
        </div>
      )}

      {/* Модалка отмены */}
      {cancelId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl p-7 max-w-sm mx-4 shadow-2xl">
            <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2 text-center">
              Отменить запись?
            </h2>
            <p className="text-sm text-gray-500 mb-6 text-center">
              Вы уверены, что хотите отменить эту запись? Это действие нельзя будет отменить.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setCancelId(null)}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
              >
                Нет, оставить
              </button>
              <button
                onClick={confirmCancel}
                className="flex-1 bg-red-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-red-200 transition-all"
              >
                Да, отменить
              </button>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
