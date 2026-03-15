// =============================================
// Админ-панель — управление услугами и мастерами
// Доступна только для пользователей с ролью admin
// =============================================

import { useState, useEffect } from "react";
import { useAuth } from "../auth/AuthContext";
import { PageWrapper } from "../components/Layout";
import { type Service, type Master } from "../data/mock";

// Хелпер для запросов с токеном
function authHeaders(token: string | null) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

// =============================================
// Форма услуги
// =============================================

const emptyService = {
  name: "",
  category: "",
  duration: 60,
  price: 1000,
  description: "",
  image: "",
};

function ServiceForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: typeof emptyService;
  onSave: (data: typeof emptyService) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Введите название";
    if (!form.category.trim()) e.category = "Введите категорию";
    if (form.duration < 1 || form.duration > 480) e.duration = "От 1 до 480 минут";
    if (form.price < 1 || form.price > 100000) e.price = "От 1 до 100 000";
    if (!form.description.trim()) e.description = "Введите описание";
    if (!form.image.trim()) e.image = "Введите URL изображения";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) onSave(form);
  };

  const fieldClass = (name: string) =>
    `w-full border rounded-xl px-4 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-rose-400 ${
      errors[name] ? "border-red-400" : "border-gray-200"
    }`;

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Название</label>
        <input className={fieldClass("name")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Категория</label>
        <input className={fieldClass("category")} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
        {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category}</p>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Длительность (мин)</label>
          <input type="number" className={fieldClass("duration")} value={form.duration} onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })} />
          {errors.duration && <p className="text-red-500 text-xs mt-1">{errors.duration}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Цена (руб)</label>
          <input type="number" className={fieldClass("price")} value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
          {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price}</p>}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Описание</label>
        <textarea className={fieldClass("description")} rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">URL изображения</label>
        <input className={fieldClass("image")} value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} />
        {errors.image && <p className="text-red-500 text-xs mt-1">{errors.image}</p>}
      </div>
      <div className="flex gap-3 pt-2">
        <button onClick={handleSubmit} className="bg-rose-500 text-white px-6 py-2.5 rounded-xl font-semibold hover:shadow-lg hover:shadow-rose-200 transition-all">
          Сохранить
        </button>
        <button onClick={onCancel} className="border border-gray-200 text-gray-600 px-6 py-2.5 rounded-xl font-medium hover:bg-gray-50 transition-all">
          Отмена
        </button>
      </div>
    </div>
  );
}

// =============================================
// Форма мастера
// =============================================

const emptyMaster = {
  name: "",
  photo: "",
  specialization: "",
  rating: 5.0,
  experience: "",
  portfolio: [] as string[],
};

function MasterForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: typeof emptyMaster;
  onSave: (data: typeof emptyMaster) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (form.name.trim().length < 2) e.name = "Минимум 2 символа";
    if (!form.photo.trim()) e.photo = "Введите URL фото";
    if (!form.specialization.trim()) e.specialization = "Введите специализацию";
    if (form.rating < 0 || form.rating > 5) e.rating = "От 0 до 5";
    if (!form.experience.trim()) e.experience = "Введите опыт";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) onSave(form);
  };

  const fieldClass = (name: string) =>
    `w-full border rounded-xl px-4 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-rose-400 ${
      errors[name] ? "border-red-400" : "border-gray-200"
    }`;

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Имя</label>
        <input className={fieldClass("name")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">URL фото</label>
        <input className={fieldClass("photo")} value={form.photo} onChange={(e) => setForm({ ...form, photo: e.target.value })} />
        {errors.photo && <p className="text-red-500 text-xs mt-1">{errors.photo}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Специализация</label>
        <input className={fieldClass("specialization")} value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} />
        {errors.specialization && <p className="text-red-500 text-xs mt-1">{errors.specialization}</p>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Рейтинг</label>
          <input type="number" step="0.1" className={fieldClass("rating")} value={form.rating} onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })} />
          {errors.rating && <p className="text-red-500 text-xs mt-1">{errors.rating}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Опыт</label>
          <input className={fieldClass("experience")} value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value })} />
          {errors.experience && <p className="text-red-500 text-xs mt-1">{errors.experience}</p>}
        </div>
      </div>
      {/* Портфолио (примеры работ) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Примеры работ (URL фото, по одному на строку)
        </label>
        <textarea
          className={fieldClass("portfolio")}
          rows={4}
          placeholder={"https://example.com/work1.jpg\nhttps://example.com/work2.jpg"}
          value={form.portfolio.join("\n")}
          onChange={(e) =>
            setForm({
              ...form,
              portfolio: e.target.value
                .split("\n")
                .map((s) => s.trim())
                .filter((s) => s.length > 0),
            })
          }
        />
        <p className="text-xs text-gray-400 mt-1">Максимум 20 фото</p>
        {errors.portfolio && <p className="text-red-500 text-xs mt-1">{errors.portfolio}</p>}
      </div>
      <div className="flex gap-3 pt-2">
        <button onClick={handleSubmit} className="bg-rose-500 text-white px-6 py-2.5 rounded-xl font-semibold hover:shadow-lg hover:shadow-rose-200 transition-all">
          Сохранить
        </button>
        <button onClick={onCancel} className="border border-gray-200 text-gray-600 px-6 py-2.5 rounded-xl font-medium hover:bg-gray-50 transition-all">
          Отмена
        </button>
      </div>
    </div>
  );
}

// =============================================
// Главная страница админ-панели
// =============================================

type Tab = "services" | "masters";

export default function AdminPage() {
  const { token } = useAuth();
  const [tab, setTab] = useState<Tab>("services");

  // --- Услуги ---
  const [services, setServices] = useState<Service[]>([]);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [addingService, setAddingService] = useState(false);

  // --- Мастера ---
  const [masters, setMasters] = useState<Master[]>([]);
  const [editingMaster, setEditingMaster] = useState<Master | null>(null);
  const [addingMaster, setAddingMaster] = useState(false);

  const [error, setError] = useState("");

  // Загрузка данных
  const loadServices = () => {
    fetch("/api/services")
      .then((r) => r.json())
      .then(setServices)
      .catch(() => setError("Не удалось загрузить услуги"));
  };

  const loadMasters = () => {
    fetch("/api/masters")
      .then((r) => r.json())
      .then(setMasters)
      .catch(() => setError("Не удалось загрузить мастеров"));
  };

  useEffect(() => {
    loadServices();
    loadMasters();
  }, []);

  // --- CRUD услуг ---
  const saveService = async (data: typeof emptyService) => {
    setError("");
    const url = editingService ? `/api/services/${editingService.id}` : "/api/services";
    const method = editingService ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: authHeaders(token),
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json();
      const msg = Array.isArray(err.detail)
        ? err.detail.map((e: { msg: string }) => e.msg).join(", ")
        : err.detail || "Ошибка сохранения";
      setError(msg);
      return;
    }

    setEditingService(null);
    setAddingService(false);
    loadServices();
  };

  const deleteService = async (id: number) => {
    if (!window.confirm("Удалить услугу?")) return;
    const res = await fetch(`/api/services/${id}`, {
      method: "DELETE",
      headers: authHeaders(token),
    });
    if (!res.ok) {
      setError("Не удалось удалить услугу");
      return;
    }
    loadServices();
  };

  // --- CRUD мастеров ---
  const saveMaster = async (data: typeof emptyMaster) => {
    setError("");
    const url = editingMaster ? `/api/masters/${editingMaster.id}` : "/api/masters";
    const method = editingMaster ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: authHeaders(token),
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json();
      const msg = Array.isArray(err.detail)
        ? err.detail.map((e: { msg: string }) => e.msg).join(", ")
        : err.detail || "Ошибка сохранения";
      setError(msg);
      return;
    }

    setEditingMaster(null);
    setAddingMaster(false);
    loadMasters();
  };

  const deleteMaster = async (id: number) => {
    if (!window.confirm("Удалить мастера?")) return;
    const res = await fetch(`/api/masters/${id}`, {
      method: "DELETE",
      headers: authHeaders(token),
    });
    if (!res.ok) {
      setError("Не удалось удалить мастера");
      return;
    }
    loadMasters();
  };

  const tabClass = (t: Tab) =>
    `px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
      tab === t
        ? "bg-rose-500 text-white shadow-md shadow-rose-200"
        : "bg-white border border-gray-200 text-gray-600 hover:border-rose-300"
    }`;

  return (
    <PageWrapper>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Админ-панель</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-6">
          {error}
        </div>
      )}

      {/* Вкладки */}
      <div className="flex gap-3 mb-6">
        <button className={tabClass("services")} onClick={() => setTab("services")}>
          Услуги ({services.length})
        </button>
        <button className={tabClass("masters")} onClick={() => setTab("masters")}>
          Мастера ({masters.length})
        </button>
      </div>

      {/* ========== Вкладка: Услуги ========== */}
      {tab === "services" && (
        <div>
          {/* Форма добавления/редактирования */}
          {(addingService || editingService) && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">
                {editingService ? "Редактировать услугу" : "Новая услуга"}
              </h2>
              <ServiceForm
                initial={
                  editingService
                    ? {
                        name: editingService.name,
                        category: editingService.category,
                        duration: editingService.duration,
                        price: editingService.price,
                        description: editingService.description,
                        image: editingService.image,
                      }
                    : emptyService
                }
                onSave={saveService}
                onCancel={() => { setAddingService(false); setEditingService(null); }}
              />
            </div>
          )}

          {/* Кнопка добавить */}
          {!addingService && !editingService && (
            <button
              onClick={() => setAddingService(true)}
              className="mb-6 bg-rose-500 text-white px-6 py-2.5 rounded-xl font-semibold hover:shadow-lg hover:shadow-rose-200 transition-all"
            >
              + Добавить услугу
            </button>
          )}

          {/* Список услуг */}
          <div className="space-y-3">
            {services.map((s) => (
              <div key={s.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <img src={s.image} alt={s.name} className="w-14 h-14 rounded-lg object-cover" />
                  <div>
                    <p className="font-semibold text-gray-800">{s.name}</p>
                    <p className="text-sm text-gray-400">{s.category} &middot; {s.duration} мин &middot; {s.price} &#8381;</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setEditingService(s); setAddingService(false); }}
                    className="text-sm text-rose-500 hover:text-rose-700 font-medium"
                  >
                    Изменить
                  </button>
                  <button
                    onClick={() => deleteService(s.id)}
                    className="text-sm text-gray-400 hover:text-red-500 font-medium"
                  >
                    Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========== Вкладка: Мастера ========== */}
      {tab === "masters" && (
        <div>
          {/* Форма добавления/редактирования */}
          {(addingMaster || editingMaster) && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">
                {editingMaster ? "Редактировать мастера" : "Новый мастер"}
              </h2>
              <MasterForm
                initial={
                  editingMaster
                    ? {
                        name: editingMaster.name,
                        photo: editingMaster.photo,
                        specialization: editingMaster.specialization,
                        rating: editingMaster.rating,
                        experience: editingMaster.experience,
                        portfolio: editingMaster.portfolio || [],
                      }
                    : emptyMaster
                }
                onSave={saveMaster}
                onCancel={() => { setAddingMaster(false); setEditingMaster(null); }}
              />
            </div>
          )}

          {/* Кнопка добавить */}
          {!addingMaster && !editingMaster && (
            <button
              onClick={() => setAddingMaster(true)}
              className="mb-6 bg-rose-500 text-white px-6 py-2.5 rounded-xl font-semibold hover:shadow-lg hover:shadow-rose-200 transition-all"
            >
              + Добавить мастера
            </button>
          )}

          {/* Список мастеров */}
          <div className="space-y-3">
            {masters.map((m) => (
              <div key={m.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <img src={m.photo} alt={m.name} className="w-14 h-14 rounded-full object-cover" />
                  <div>
                    <p className="font-semibold text-gray-800">{m.name}</p>
                    <p className="text-sm text-gray-400">{m.specialization} &middot; {m.experience}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setEditingMaster(m); setAddingMaster(false); }}
                    className="text-sm text-rose-500 hover:text-rose-700 font-medium"
                  >
                    Изменить
                  </button>
                  <button
                    onClick={() => deleteMaster(m.id)}
                    className="text-sm text-gray-400 hover:text-red-500 font-medium"
                  >
                    Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
