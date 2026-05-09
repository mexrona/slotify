import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { type Master } from "../data/mock";
import { fetchJsonWithFallback } from "../data/api";
import { BackButton, PageWrapper } from "../components/Layout";

export default function MasterProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [master, setMaster] = useState<Master | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const loadMaster = useCallback(() => {
    setLoading(true);
    setError(false);

    fetchJsonWithFallback<Master[]>("/api/masters")
      .then((masters: Master[]) => {
        const found = masters.find((m) => String(m.id) === String(id));
        setMaster(found ?? null);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    loadMaster();
  }, [loadMaster]);

  if (loading) {
    return (
      <PageWrapper>
        <div className="text-center py-20">
          <div className="w-10 h-10 border-4 border-rose-200 border-t-rose-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Загружаем мастера...</p>
        </div>
      </PageWrapper>
    );
  }

  if (error || !master) {
    return (
      <PageWrapper>
        <BackButton onClick={() => navigate(-1)} />
        <div className="text-center py-20">
          <p className="text-gray-600 text-lg mb-4">Мастер не найден</p>
          <button
            onClick={loadMaster}
            className="bg-rose-500 text-white px-6 py-2.5 rounded-xl font-semibold hover:shadow-lg hover:shadow-rose-200 transition-all"
          >
            Повторить
          </button>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <BackButton onClick={() => navigate(-1)} />
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 sm:p-8 flex flex-col sm:flex-row gap-6">
          <img
            src={master.photo}
            alt={master.name}
            className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl object-cover ring-2 ring-rose-100"
          />
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">{master.name}</h1>
            <p className="text-gray-500 mb-3">{master.specialization}</p>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-yellow-400">{"★".repeat(Math.floor(master.rating))}</span>
              <span className="font-medium text-gray-700">{master.rating}</span>
              <span className="text-gray-400">| {master.experience}</span>
            </div>
          </div>
        </div>

        <div className="px-6 sm:px-8 pb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Портфолио</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {master.portfolio.map((img, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setSelectedImage(img)}
                className="rounded-xl overflow-hidden focus:outline-none focus:ring-2 focus:ring-rose-400"
                aria-label={`Открыть фото ${i + 1}`}
              >
                <img
                  src={img}
                  alt={`Работа ${master.name} ${i + 1}`}
                  className="w-full aspect-square object-cover rounded-xl hover:opacity-90 transition-opacity"
                />
              </button>
            ))}
          </div>
        </div>
      </div>

      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedImage(null)}
        >
          <button
            type="button"
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 text-white text-2xl leading-none"
            aria-label="Закрыть фото"
          >
            ×
          </button>
          <img
            src={selectedImage}
            alt="Увеличенное фото"
            className="max-w-full max-h-[90vh] rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </PageWrapper>
  );
}
