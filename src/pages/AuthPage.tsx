// =============================================
// Страница входа и регистрации
// Переключение между формами, валидация полей
// =============================================

import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { PageWrapper } from "../components/Layout";

export default function AuthPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");

  // Поля формы
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  // Ошибки валидации (подсветка)
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};

    // Email
    if (!email.trim()) {
      errs.email = "Введите email";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = "Некорректный email";
    }

    // Пароль
    if (!password) {
      errs.password = "Введите пароль";
    } else if (password.length < 6) {
      errs.password = "Минимум 6 символов";
    }

    // Только для регистрации
    if (mode === "register") {
      if (name.trim().length < 2) {
        errs.name = "Минимум 2 символа";
      }
      const digits = phone.replace(/\D/g, "");
      if (digits.length < 11) {
        errs.phone = "Введите номер в формате +7 (XXX) XXX-XX-XX";
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setServerError("");

    let error: string | null;
    if (mode === "login") {
      error = await login(email.trim(), password);
    } else {
      error = await register(email.trim(), password, name.trim(), phone);
    }

    if (error) {
      setServerError(error);
      setSubmitting(false);
    }
    // Если нет ошибки — AuthContext обновит user, App перерисуется
  };

  const switchMode = () => {
    setMode(mode === "login" ? "register" : "login");
    setErrors({});
    setServerError("");
  };

  const clearError = (field: string) => {
    setErrors((prev) => {
      const copy = { ...prev };
      delete copy[field];
      return copy;
    });
  };

  const inputClass = (field: string) =>
    `w-full border rounded-xl px-4 py-3 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent transition-shadow ${
      errors[field] ? "border-red-400" : "border-gray-200"
    }`;

  return (
    <PageWrapper>
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-2 text-center">
          {mode === "login" ? "Вход в Slotify" : "Регистрация"}
        </h1>
        <p className="text-gray-500 text-center mb-8">
          {mode === "login"
            ? "Войдите, чтобы записаться на услугу"
            : "Создайте аккаунт для записи на услуги"}
        </p>

        {/* Ошибка сервера */}
        {serverError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
            <p className="text-red-600 text-sm">{serverError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); clearError("email"); }}
              placeholder="your@email.com"
              className={inputClass("email")}
            />
            {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email}</p>}
          </div>

          {/* Пароль */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); clearError("password"); }}
              placeholder="Минимум 6 символов"
              className={inputClass("password")}
            />
            {errors.password && <p className="text-sm text-red-500 mt-1">{errors.password}</p>}
          </div>

          {/* Поля регистрации */}
          {mode === "register" && (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Ваше имя</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => { setName(e.target.value); clearError("name"); }}
                  placeholder="Введите имя"
                  className={inputClass("name")}
                />
                {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Телефон</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); clearError("phone"); }}
                  placeholder="+7 (___) ___-__-__"
                  className={inputClass("phone")}
                />
                {errors.phone && <p className="text-sm text-red-500 mt-1">{errors.phone}</p>}
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-rose-500 text-white py-3.5 rounded-2xl font-bold shadow-lg shadow-rose-200 hover:shadow-xl hover:scale-[1.01] disabled:bg-gray-300 disabled:shadow-none transition-all duration-200"
          >
            {submitting
              ? "Загрузка..."
              : mode === "login"
                ? "Войти"
                : "Зарегистрироваться"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          {mode === "login" ? "Нет аккаунта? " : "Уже есть аккаунт? "}
          <button onClick={switchMode} className="text-rose-500 font-semibold hover:underline">
            {mode === "login" ? "Зарегистрироваться" : "Войти"}
          </button>
        </p>
      </div>
    </PageWrapper>
  );
}
