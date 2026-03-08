// =============================================
// Поток бронирования: 3 шага в одном файле
// 1) Выбор мастера  2) Дата и время  3) Подтверждение
// =============================================

import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { services, masters, generateTimeSlots, type TimeSlot } from "../data/mock";
import { PageWrapper, BookingSteps, BackButton } from "../components/Layout";

// ==================== ШАГ 1: Выбор мастера ====================
export function MasterPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const serviceId = Number(searchParams.get("service"));
  const service = services.find((s) => s.id === serviceId);

  const selectMaster = (masterId: number) => {
    navigate(`/booking/datetime?service=${serviceId}&master=${masterId}`);
  };

  return (
    <PageWrapper>
      <BackButton onClick={() => navigate(-1)} />
      <BookingSteps current={0} />

      {/* Сводка выбранной услуги */}
      {service && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 mb-6 flex items-center gap-3">
          <img src={service.image} alt={service.name} className="w-12 h-12 rounded-xl object-cover" />
          <div>
            <span className="font-semibold text-gray-800">{service.name}</span>
            <p className="text-sm text-gray-500">{service.duration} мин &middot; {service.price.toLocaleString()} ₽</p>
          </div>
        </div>
      )}

      <h1 className="text-2xl font-bold text-gray-800 mb-5">Выберите мастера</h1>

      <div className="space-y-4">
        {/* Опция «Любой мастер» */}
        <button
          onClick={() => selectMaster(0)}
          className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-5 text-left hover:shadow-lg hover:border-rose-200 transition-all duration-300 group"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 flex items-center justify-center">
              <svg className="w-7 h-7 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-gray-800 group-hover:text-rose-600 transition-colors">Любой свободный мастер</p>
              <p className="text-sm text-gray-500">Мы подберём для вас лучшего мастера</p>
            </div>
          </div>
        </button>

        {/* Карточки мастеров с портфолио */}
        {masters.map((master) => (
          <button
            key={master.id}
            onClick={() => selectMaster(master.id)}
            className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden text-left hover:shadow-lg hover:border-rose-200 transition-all duration-300 group"
          >
            <div className="p-5 flex items-center gap-4">
              <img
                src={master.photo}
                alt={master.name}
                className="w-16 h-16 rounded-2xl object-cover ring-2 ring-rose-100 group-hover:ring-rose-300 transition-all"
              />
              <div className="flex-1">
                <p className="font-bold text-gray-800 group-hover:text-rose-600 transition-colors">{master.name}</p>
                <p className="text-sm text-gray-500">{master.specialization}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-yellow-400 text-sm">{"★".repeat(Math.floor(master.rating))}</span>
                  <span className="text-sm font-medium text-gray-600">{master.rating}</span>
                  <span className="text-xs text-gray-400">&middot; {master.experience}</span>
                </div>
              </div>
            </div>
            {/* Мини-портфолио */}
            <div className="grid grid-cols-3 gap-0.5 px-1 pb-1">
              {master.portfolio.map((img, i) => (
                <img
                  key={i}
                  src={img}
                  alt={`Работа ${i + 1}`}
                  className="w-full aspect-square object-cover rounded-lg"
                />
              ))}
            </div>
          </button>
        ))}
      </div>
    </PageWrapper>
  );
}

// ==================== ШАГ 2: Дата и время ====================
export function DateTimePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const serviceId = searchParams.get("service");
  const masterId = searchParams.get("master");

  const dates = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });

  const [selectedDate, setSelectedDate] = useState<string>(
    dates[0].toISOString().split("T")[0]
  );
  const [slots] = useState<TimeSlot[]>(generateTimeSlots());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const formatDate = (d: Date) => {
    const days = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
    const months = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
    return { day: d.getDate(), weekday: days[d.getDay()], month: months[d.getMonth()] };
  };

  const confirmTime = () => {
    if (!selectedTime) return;
    navigate(
      `/booking/confirm?service=${serviceId}&master=${masterId}&date=${selectedDate}&time=${encodeURIComponent(selectedTime)}`
    );
  };

  return (
    <PageWrapper>
      <BackButton onClick={() => navigate(-1)} />
      <BookingSteps current={1} />

      <h1 className="text-2xl font-bold text-gray-800 mb-5">Выберите дату и время</h1>

      {/* Календарь */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-6 scrollbar-hide">
        {dates.map((d) => {
          const iso = d.toISOString().split("T")[0];
          const { day, weekday, month } = formatDate(d);
          const isSelected = iso === selectedDate;
          const isToday = d.toDateString() === new Date().toDateString();
          return (
            <button
              key={iso}
              onClick={() => setSelectedDate(iso)}
              className={`flex flex-col items-center px-3 py-3 rounded-2xl min-w-[64px] transition-all duration-200 ${
                isSelected
                  ? "bg-rose-500 text-white shadow-lg shadow-rose-200 scale-105"
                  : "bg-white border border-gray-200 hover:border-rose-300 text-gray-700"
              }`}
            >
              <span className={`text-xs font-medium ${isSelected ? "text-rose-100" : "text-gray-400"}`}>
                {isToday ? "Сегодня" : weekday}
              </span>
              <span className="text-lg font-bold">{day}</span>
              <span className={`text-xs ${isSelected ? "text-rose-200" : "text-gray-400"}`}>{month}</span>
            </button>
          );
        })}
      </div>

      {/* Сетка слотов */}
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Доступное время</h3>
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-8">
        {slots.map((slot) => (
          <button
            key={slot.time}
            disabled={!slot.available}
            onClick={() => setSelectedTime(slot.time)}
            className={`py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
              !slot.available
                ? "bg-gray-50 text-gray-300 cursor-not-allowed line-through"
                : selectedTime === slot.time
                  ? "bg-rose-500 text-white shadow-md shadow-rose-200"
                  : "bg-white border border-gray-200 hover:border-rose-300 hover:text-rose-600 text-gray-700"
            }`}
          >
            {slot.time}
          </button>
        ))}
      </div>

      <button
        onClick={confirmTime}
        disabled={!selectedTime}
        className="w-full bg-rose-500 text-white py-3.5 rounded-2xl font-bold shadow-lg shadow-rose-200 hover:shadow-xl hover:scale-[1.01] disabled:bg-gray-300 disabled:shadow-none disabled:cursor-not-allowed transition-all duration-200"
      >
        Продолжить
      </button>
    </PageWrapper>
  );
}

// ==================== ШАГ 3: Подтверждение ====================
export function ConfirmPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const service = services.find((s) => s.id === Number(searchParams.get("service")));
  const master = masters.find((m) => m.id === Number(searchParams.get("master")));
  const date = searchParams.get("date") || "";
  const time = searchParams.get("time") || "";

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate("/booking/success");
  };

  return (
    <PageWrapper>
      <BackButton onClick={() => navigate(-1)} />
      <BookingSteps current={2} />

      <h1 className="text-2xl font-bold text-gray-800 mb-5">Подтверждение записи</h1>

      {/* Сводка */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        {/* Мастер */}
        {master && (
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
            <img src={master.photo} alt={master.name} className="w-12 h-12 rounded-xl object-cover" />
            <div>
              <p className="font-semibold text-gray-800">{master.name}</p>
              <p className="text-sm text-gray-500">{master.specialization}</p>
            </div>
          </div>
        )}
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-500">Услуга</span>
            <span className="font-medium text-gray-800">{service?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Мастер</span>
            <span className="font-medium text-gray-800">{master?.name || "Любой свободный"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Дата</span>
            <span className="font-medium text-gray-800">{date}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Время</span>
            <span className="font-medium text-gray-800">{time}</span>
          </div>
          <hr className="border-gray-100" />
          <div className="flex justify-between text-lg font-medium">
            <span className="text-gray-800">Итого</span>
            <span className="text-rose-600">{service?.price.toLocaleString()} ₽</span>
          </div>
        </div>
      </div>

      {/* Форма */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Ваше имя</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Введите имя"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent transition-shadow"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Телефон</label>
          <input
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+7 (___) ___-__-__"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent transition-shadow"
          />
        </div>
        <button
          type="submit"
          className="w-full bg-rose-500 text-white py-3.5 rounded-2xl font-bold shadow-lg shadow-rose-200 hover:shadow-xl hover:scale-[1.01] transition-all duration-200"
        >
          Подтвердить запись
        </button>
      </form>
    </PageWrapper>
  );
}
