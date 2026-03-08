// =============================================
// Каталог услуг — выбор конкретной процедуры
// Фильтрация по категории + поиск + фото услуг
// =============================================

import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { services, type Service } from "../data/mock";
import { PageWrapper, BackButton } from "../components/Layout";

export default function ServicesPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [activeCategory, setActiveCategory] = useState(
    searchParams.get("category") || "Все"
  );
  const [search, setSearch] = useState("");

  // Имитация загрузки данных
  const [data, setData] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadData = () => {
    setLoading(true);
    setError(false);
    setTimeout(() => {
      try {
        setData(services);
        setLoading(false);
      } catch {
        setError(true);
        setLoading(false);
      }
    }, 800);
  };

  useEffect(() => { loadData(); }, []);

  const categories = ["Все"].concat(Array.from(new Set(data.map((s) => s.category))));

  const filtered = data.filter((s) => {
    const matchCategory = activeCategory === "Все" || s.category === activeCategory;
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase());
    return matchCategory && matchSearch;
  });

  const selectService = (serviceId: number) => {
    navigate(`/booking/master?service=${serviceId}`);
  };

  return (
    <PageWrapper>
      <BackButton onClick={() => navigate(-1)} />

      <h1 className="text-2xl font-bold text-gray-800 mb-5">Выберите услугу</h1>

      {/* Поиск */}
      <div className="relative mb-5">
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Поиск услуги..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-gray-200 rounded-xl pl-11 pr-4 py-3 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent transition-shadow"
        />
      </div>

      {/* Фильтр по категории */}
      <div className="flex flex-wrap gap-2 mb-6">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
              activeCategory === cat
                ? "bg-rose-500 text-white shadow-md shadow-rose-200"
                : "bg-white border border-gray-200 text-gray-600 hover:border-rose-300 hover:text-rose-600"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Загрузка */}
      {loading && (
        <div className="text-center py-16">
          <div className="w-10 h-10 border-4 border-rose-200 border-t-rose-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Загружаем услуги...</p>
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
          <p className="text-gray-600 text-lg mb-2">Не удалось загрузить услуги</p>
          <p className="text-sm text-gray-400 mb-4">Проверьте соединение и попробуйте снова</p>
          <button
            onClick={loadData}
            className="bg-rose-500 text-white px-6 py-2.5 rounded-xl font-semibold hover:shadow-lg hover:shadow-rose-200 transition-all"
          >
            Повторить
          </button>
        </div>
      )}

      {/* Список услуг — карточки с фото */}
      {!loading && !error && <div className="space-y-4">
        {filtered.map((service) => (
          <div
            key={service.id}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col sm:flex-row"
          >
            {/* Фото услуги */}
            <img
              src={service.image}
              alt={service.name}
              className="w-full sm:w-40 h-32 sm:h-auto object-cover"
            />
            {/* Информация */}
            <div className="flex-1 p-4 flex items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-gray-800 mb-1">{service.name}</h3>
                <p className="text-sm text-gray-500 mb-2">{service.description}</p>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {service.duration} мин
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xl font-medium text-rose-600 mb-2">
                  {service.price.toLocaleString()} ₽
                </p>
                <button
                  onClick={() => selectService(service.id)}
                  className="bg-rose-500 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-rose-200 hover:scale-105 transition-all duration-200"
                >
                  Выбрать
                </button>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-400 text-lg">Ничего не найдено</p>
            <p className="text-sm text-gray-300 mt-1">Попробуйте изменить запрос</p>
          </div>
        )}
      </div>}
    </PageWrapper>
  );
}
