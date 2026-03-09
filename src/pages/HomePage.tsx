// =============================================
// Главная страница — точка входа
// Баннер + категории + галерея работ мастеров
// =============================================

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { type Service, type Master } from "../data/mock";
import { PageWrapper } from "../components/Layout";

export default function HomePage() {
  const [services, setServices] = useState<Service[]>([]);
  const [masters, setMasters] = useState<Master[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadData = () => {
    setLoading(true);
    setError(false);

    Promise.all([
      fetch("/api/services").then((r) => { if (!r.ok) throw new Error(); return r.json(); }),
      fetch("/api/masters").then((r) => { if (!r.ok) throw new Error(); return r.json(); }),
    ])
      .then(([servicesData, mastersData]) => {
        setServices(servicesData);
        setMasters(mastersData);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  };

  useEffect(() => { loadData(); }, []);

  const categories = Array.from(new Set(services.map((s) => s.category)));

  // Тематические фото для категорий (Unsplash)
  const categoryIcons: Record<string, string> = {
    "Стрижки": "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&h=250&fit=crop",
    "Маникюр": "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&h=250&fit=crop",
    "Косметология": "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=400&h=250&fit=crop",
    "Ресницы и брови": "https://images.unsplash.com/photo-1633465631144-aa321b66d44a?w=400&h=250&fit=crop",
  };

  // Загрузка
  if (loading) {
    return (
      <PageWrapper>
        <div className="text-center py-20">
          <div className="w-10 h-10 border-4 border-rose-200 border-t-rose-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Загружаем...</p>
        </div>
      </PageWrapper>
    );
  }

  // Ошибка
  if (error) {
    return (
      <PageWrapper>
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-gray-600 text-lg mb-2">Не удалось загрузить данные</p>
          <button onClick={loadData} className="bg-rose-500 text-white px-6 py-2.5 rounded-xl font-semibold hover:shadow-lg hover:shadow-rose-200 transition-all">
            Повторить
          </button>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      {/* Hero-баннер */}
      <section className="relative overflow-hidden rounded-3xl mb-10">
        <div className="absolute inset-0 bg-rose-500" />
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=1200&h=500&fit=crop')] bg-cover bg-center mix-blend-overlay opacity-30" />
        <div className="relative px-8 py-16 sm:py-20 text-center text-white">
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-3 tracking-tight">
            Добро пожаловать в Slotify
          </h1>
          <p className="text-rose-100 text-lg mb-8 max-w-lg mx-auto">
            Запишитесь на любую процедуру онлайн — быстро и без звонков
          </p>
          <Link
            to="/services"
            className="inline-block bg-white text-rose-600 font-bold px-8 py-3.5 rounded-2xl shadow-lg shadow-rose-900/20 hover:shadow-xl hover:scale-105 transition-all duration-200"
          >
            Записаться
          </Link>
        </div>
      </section>

      {/* Категории услуг — карточки с фото */}
      <h2 className="text-2xl font-bold text-gray-800 mb-5">Наши услуги</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12">
        {categories.map((cat) => (
          <Link
            key={cat}
            to={`/services?category=${encodeURIComponent(cat)}`}
            className="group relative overflow-hidden rounded-2xl aspect-[4/3] shadow-md hover:shadow-xl transition-all duration-300"
          >
            <img
              src={categoryIcons[cat]}
              alt={cat}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <p className="font-semibold text-white text-sm">{cat}</p>
              <p className="text-xs text-white/70">
                {services.filter((s) => s.category === cat).length} услуг
              </p>
            </div>
          </Link>
        ))}
      </div>

      {/* Наши мастера */}
      <h2 className="text-2xl font-bold text-gray-800 mb-5">Наши мастера</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-12">
        {masters.map((master) => (
          <div
            key={master.id}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow duration-300"
          >
            <div className="flex items-center gap-4 p-5">
              <img
                src={master.photo}
                alt={master.name}
                className="w-16 h-16 rounded-2xl object-cover ring-2 ring-rose-100"
              />
              <div>
                <p className="font-bold text-gray-800">{master.name}</p>
                <p className="text-sm text-gray-500">{master.specialization}</p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-yellow-400 text-sm">{"★".repeat(Math.floor(master.rating))}</span>
                  <span className="text-sm font-medium text-gray-600">{master.rating}</span>
                  <span className="text-xs text-gray-400 ml-2">{master.experience}</span>
                </div>
              </div>
            </div>
            {/* Мини-галерея работ */}
            <div className="grid grid-cols-3 gap-0.5 px-1 pb-1">
              {master.portfolio.map((img, i) => (
                <img
                  key={i}
                  src={img}
                  alt={`Работа ${master.name} ${i + 1}`}
                  className="w-full aspect-square object-cover rounded-lg"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}
