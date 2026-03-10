// =============================================
// Контекст авторизации — хранит токен и данные пользователя
// Оборачивает всё приложение, даёт доступ к user/token из любого компонента
// =============================================

import { createContext, useContext, useState, useEffect } from "react";

interface User {
  id: number;
  email: string;
  name: string;
  phone: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  register: (email: string, password: string, name: string, phone: string) => Promise<string | null>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("slotify_token")
  );
  const [loading, setLoading] = useState(true);

  // При загрузке — проверяем токен через /auth/me
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => {
        setUser(data);
        setLoading(false);
      })
      .catch(() => {
        // Токен невалиден — очищаем
        localStorage.removeItem("slotify_token");
        setToken(null);
        setUser(null);
        setLoading(false);
      });
  }, [token]);

  const login = async (email: string, password: string): Promise<string | null> => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const err = await res.json();
      return err.detail || "Ошибка входа";
    }

    const data = await res.json();
    localStorage.setItem("slotify_token", data.token);
    setToken(data.token);
    setUser(data);
    return null; // null = успех
  };

  const register = async (
    email: string,
    password: string,
    name: string,
    phone: string
  ): Promise<string | null> => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name, phone }),
    });

    if (!res.ok) {
      const err = await res.json();
      // Pydantic возвращает массив ошибок в detail
      if (Array.isArray(err.detail)) {
        return err.detail.map((e: { msg: string }) => e.msg).join(", ");
      }
      return err.detail || "Ошибка регистрации";
    }

    const data = await res.json();
    localStorage.setItem("slotify_token", data.token);
    setToken(data.token);
    setUser(data);
    return null;
  };

  const logout = () => {
    localStorage.removeItem("slotify_token");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
