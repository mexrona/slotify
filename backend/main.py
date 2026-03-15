# =============================================
# Slotify — бэкенд на FastAPI
# Данные хранятся в SQLite (файл slotify.db)
# =============================================

import hashlib
import os
import re
import time
import uuid
from collections import defaultdict
from datetime import date, datetime

from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, field_validator

from database import get_db, init_db
from sms import send_booking_confirmation, send_booking_cancelled, check_balance

load_dotenv()

app = FastAPI(title="Slotify API", version="1.0.0")


# --- Middleware: /api/* → /* (фронтенд обращается к /api/services, бэкенд слушает /services) ---
from starlette.middleware.base import BaseHTTPMiddleware

class StripApiPrefixMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        if request.url.path.startswith("/api/"):
            # Убираем /api из пути
            request.scope["path"] = request.url.path[4:]  # "/api/services" → "/services"
        return await call_next(request)

app.add_middleware(StripApiPrefixMiddleware)


# --- CORS (разрешаем фронтенду обращаться к API) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        os.getenv("FRONTEND_URL", "http://localhost:3000"),
        "http://localhost:8001",
        "http://127.0.0.1:8001",
    ],
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Content-Type", "Authorization"],
)


# --- Rate limiter (ограничение частоты запросов) ---
# Хранит список таймстемпов запросов для каждого IP
_rate_limit_store: dict[str, list[float]] = defaultdict(list)

RATE_LIMIT_MAX = 10        # максимум запросов
RATE_LIMIT_WINDOW = 15 * 60  # за 15 минут (в секундах)


def check_rate_limit(request: Request):
    """Проверяет, не превышен ли лимит запросов для IP."""
    ip = request.client.host if request.client else "unknown"
    now = time.time()
    window_start = now - RATE_LIMIT_WINDOW

    # Убираем старые записи
    timestamps = _rate_limit_store[ip]
    _rate_limit_store[ip] = [t for t in timestamps if t > window_start]

    if len(_rate_limit_store[ip]) >= RATE_LIMIT_MAX:
        raise HTTPException(
            status_code=429,
            detail="Слишком много попыток. Подождите 15 минут и попробуйте снова.",
        )

    _rate_limit_store[ip].append(now)


@app.post("/auth/reset-rate-limit")
def reset_rate_limit():
    """Сброс rate limiter (только для тестов)."""
    _rate_limit_store.clear()
    return {"ok": True}


# --- Тестовая страница ---
@app.get("/test", response_class=HTMLResponse)
def test_page():
    """Тестовая панель для проверки API."""
    html_path = Path(__file__).parent / "test.html"
    return html_path.read_text(encoding="utf-8")


# =============================================
# Создание таблиц и админа при старте
# =============================================

init_db()

SECRET_KEY = os.getenv("SECRET_KEY", "slotify-dev-secret")


def hash_password(password: str) -> str:
    """Хеширует пароль с солью через SHA-256."""
    salted = SECRET_KEY + password
    return hashlib.sha256(salted.encode()).hexdigest()


def create_admin():
    """Создаёт администратора, если его ещё нет."""
    admin_email = os.getenv("ADMIN_EMAIL", "admin@slotify.ru")
    admin_password = os.getenv("ADMIN_PASSWORD", "admin123")
    admin_name = os.getenv("ADMIN_NAME", "Админ")
    admin_phone = os.getenv("ADMIN_PHONE", "+70000000000")

    conn = get_db()
    existing = conn.execute("SELECT id FROM users WHERE role = 'admin'").fetchone()
    if not existing:
        conn.execute(
            "INSERT OR IGNORE INTO users (email, password_hash, name, phone, role) VALUES (?, ?, ?, ?, 'admin')",
            (admin_email, hash_password(admin_password), admin_name, admin_phone),
        )
        conn.commit()
    conn.close()


# =============================================
# Pydantic-модели (схемы данных)
# =============================================

# ---------- Общие валидаторы ----------

VALID_TIMES = set()
for _h in range(9, 20):
    VALID_TIMES.add(f"{_h}:00")
    if _h < 19:
        VALID_TIMES.add(f"{_h}:30")


def validate_phone(v: str) -> str:
    """Проверяет телефон: 11–15 цифр."""
    digits = re.sub(r"\D", "", v)
    if len(digits) < 11:
        raise ValueError("Телефон должен содержать минимум 11 цифр")
    if len(digits) > 15:
        raise ValueError("Телефон слишком длинный")
    return v


def validate_name(v: str, min_len: int = 2, max_len: int = 50) -> str:
    """Проверяет имя: min–max символов после trim."""
    stripped = v.strip()
    if len(stripped) < min_len:
        raise ValueError(f"Минимум {min_len} символа")
    if len(stripped) > max_len:
        raise ValueError(f"Максимум {max_len} символов")
    return stripped


def validate_not_empty(v: str, max_len: int = 500) -> str:
    """Проверяет что строка непустая и не слишком длинная."""
    stripped = v.strip()
    if len(stripped) < 1:
        raise ValueError("Поле не может быть пустым")
    if len(stripped) > max_len:
        raise ValueError(f"Максимум {max_len} символов")
    return stripped


# ---------- Услуга ----------
class ServiceCreate(BaseModel):
    name: str
    category: str
    duration: int
    price: int
    description: str
    image: str

    @field_validator("name", "category", "description", "image")
    @classmethod
    def not_empty(cls, v: str) -> str:
        return validate_not_empty(v)

    @field_validator("duration")
    @classmethod
    def duration_range(cls, v: int) -> int:
        if v <= 0 or v > 480:
            raise ValueError("Длительность должна быть от 1 до 480 минут")
        return v

    @field_validator("price")
    @classmethod
    def price_range(cls, v: int) -> int:
        if v <= 0 or v > 100000:
            raise ValueError("Цена должна быть от 1 до 100000")
        return v

class ServiceOut(ServiceCreate):
    id: int


# ---------- Мастер ----------
class MasterCreate(BaseModel):
    name: str
    photo: str
    specialization: str
    rating: float
    experience: str
    portfolio: list[str] = []

    @field_validator("name")
    @classmethod
    def name_check(cls, v: str) -> str:
        return validate_name(v)

    @field_validator("photo", "specialization", "experience")
    @classmethod
    def not_empty(cls, v: str) -> str:
        return validate_not_empty(v)

    @field_validator("rating")
    @classmethod
    def rating_range(cls, v: float) -> float:
        if not 0.0 <= v <= 5.0:
            raise ValueError("Рейтинг должен быть от 0 до 5")
        return v

    @field_validator("portfolio")
    @classmethod
    def portfolio_check(cls, v: list[str]) -> list[str]:
        if len(v) > 20:
            raise ValueError("Максимум 20 фото в портфолио")
        for url in v:
            if not url.strip():
                raise ValueError("URL фото не может быть пустым")
        return v

class MasterOut(MasterCreate):
    id: int


# ---------- Запись ----------
class BookingCreate(BaseModel):
    service_id: int
    master_id: int  # 0 = «любой свободный мастер»
    date: str       # "YYYY-MM-DD"
    time: str       # "HH:MM"
    client_name: str
    client_phone: str

    @field_validator("client_name")
    @classmethod
    def name_check(cls, v: str) -> str:
        return validate_name(v)

    @field_validator("client_phone")
    @classmethod
    def phone_check(cls, v: str) -> str:
        return validate_phone(v)

    @field_validator("date")
    @classmethod
    def date_format(cls, v: str) -> str:
        try:
            date.fromisoformat(v)
        except ValueError:
            raise ValueError("Дата должна быть в формате YYYY-MM-DD")
        return v

    @field_validator("time")
    @classmethod
    def time_format(cls, v: str) -> str:
        # Проверяем формат HH:MM
        match = re.match(r"^(\d{1,2}):(\d{2})$", v)
        if not match:
            raise ValueError("Время должно быть в формате HH:MM")
        hours, minutes = int(match.group(1)), int(match.group(2))
        if hours < 0 or hours > 23 or minutes < 0 or minutes > 59:
            raise ValueError("Некорректное время")
        if v not in VALID_TIMES:
            raise ValueError("Время должно быть в диапазоне 9:00–19:30 с шагом 30 минут")
        return v

class BookingOut(BaseModel):
    id: int
    service_id: int
    master_id: int
    date: str
    time: str
    client_name: str
    client_phone: str
    status: str
    service: ServiceOut
    master: MasterOut | None


# ---------- Пользователь и авторизация ----------
class UserRegister(BaseModel):
    email: str
    password: str
    name: str
    phone: str

    @field_validator("email")
    @classmethod
    def email_check(cls, v: str) -> str:
        v = v.strip().lower()
        if not re.match(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$", v):
            raise ValueError("Некорректный email")
        if len(v) > 100:
            raise ValueError("Email слишком длинный")
        return v

    @field_validator("password")
    @classmethod
    def password_check(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Пароль должен содержать минимум 6 символов")
        if len(v) > 100:
            raise ValueError("Пароль слишком длинный")
        return v

    @field_validator("name")
    @classmethod
    def name_check(cls, v: str) -> str:
        return validate_name(v)

    @field_validator("phone")
    @classmethod
    def phone_check(cls, v: str) -> str:
        return validate_phone(v)

class UserLogin(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def email_check(cls, v: str) -> str:
        v = v.strip().lower()
        if not v:
            raise ValueError("Введите email")
        return v

    @field_validator("password")
    @classmethod
    def password_check(cls, v: str) -> str:
        if not v:
            raise ValueError("Введите пароль")
        return v

class UserOut(BaseModel):
    id: int
    email: str
    name: str
    phone: str
    role: str
    token: str | None = None

class TimeSlotOut(BaseModel):
    time: str
    available: bool


# =============================================
# Вспомогательные функции
# =============================================

def normalize_phone(phone: str) -> str:
    """Оставляет только цифры, добавляет + в начало."""
    digits = re.sub(r"\D", "", phone)
    return f"+{digits}"


def row_to_dict(row) -> dict | None:
    """Превращает sqlite3.Row в обычный dict."""
    if row is None:
        return None
    return dict(row)


def get_service_dict(conn, service_id: int) -> dict | None:
    """Достаёт услугу из БД по ID."""
    row = conn.execute("SELECT * FROM services WHERE id = ?", (service_id,)).fetchone()
    return row_to_dict(row)


def get_master_dict(conn, master_id: int) -> dict | None:
    """Достаёт мастера из БД по ID, добавляет portfolio."""
    row = conn.execute("SELECT * FROM masters WHERE id = ?", (master_id,)).fetchone()
    if not row:
        return None
    master = dict(row)
    # Добавляем портфолио (список URL фото)
    photos = conn.execute(
        "SELECT image_url FROM master_portfolio WHERE master_id = ? ORDER BY position",
        (master_id,),
    ).fetchall()
    master["portfolio"] = [p["image_url"] for p in photos]
    return master


def get_current_user(authorization: str | None) -> dict | None:
    """Достаёт пользователя по токену из заголовка Authorization."""
    if not authorization:
        return None
    parts = authorization.split(" ")
    if len(parts) != 2 or parts[0] != "Bearer":
        return None
    token = parts[1]

    conn = get_db()
    row = conn.execute(
        "SELECT * FROM users WHERE token = ?",
        (token,),
    ).fetchone()
    conn.close()
    return row_to_dict(row)


def require_auth(authorization: str | None) -> dict:
    """Требует авторизацию, иначе кидает 401."""
    user = get_current_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Необходима авторизация")
    return user


def require_role(user: dict, roles: list[str]) -> None:
    """Проверяет, что роль пользователя входит в список допустимых."""
    if user["role"] not in roles:
        raise HTTPException(status_code=403, detail="Недостаточно прав")


def make_booking_out(conn, booking: dict) -> dict:
    """Собирает полный ответ записи с вложенными service и master."""
    service = get_service_dict(conn, booking["service_id"])
    master = get_master_dict(conn, booking["master_id"]) if booking["master_id"] else None
    return {
        **booking,
        "service": service,
        "master": master,
    }


# Создаём админа при запуске
create_admin()

# Проверяем баланс SMS.ru при запуске
check_balance()


# =============================================
# Роуты: Авторизация
# =============================================

@app.post("/auth/register", response_model=UserOut, status_code=201)
def register(data: UserRegister, request: Request):
    """Регистрация нового пользователя (роль — client)."""
    check_rate_limit(request)
    conn = get_db()

    existing = conn.execute("SELECT id FROM users WHERE email = ?", (data.email,)).fetchone()
    if existing:
        conn.close()
        raise HTTPException(status_code=400, detail="Пользователь с таким email уже существует")

    phone = normalize_phone(data.phone)
    password_hash = hash_password(data.password)

    cur = conn.execute(
        "INSERT INTO users (email, password_hash, name, phone, role) VALUES (?, ?, ?, ?, 'client')",
        (data.email, password_hash, data.name, phone),
    )
    user_id = cur.lastrowid

    token = uuid.uuid4().hex
    conn.execute("UPDATE users SET token = ? WHERE id = ?", (token, user_id))
    conn.commit()

    user = row_to_dict(conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone())
    conn.close()
    return {**user, "token": token}


@app.post("/auth/login", response_model=UserOut)
def login(data: UserLogin, request: Request):
    """Вход по email + паролю. Возвращает токен."""
    check_rate_limit(request)
    conn = get_db()

    user = conn.execute("SELECT * FROM users WHERE email = ?", (data.email,)).fetchone()
    if not user:
        conn.close()
        raise HTTPException(status_code=401, detail="Неверный email или пароль")

    if dict(user)["password_hash"] != hash_password(data.password):
        conn.close()
        raise HTTPException(status_code=401, detail="Неверный email или пароль")

    token = uuid.uuid4().hex
    conn.execute("UPDATE users SET token = ? WHERE id = ?", (token, user["id"]))
    conn.commit()
    result = {**dict(user), "token": token}
    conn.close()
    return result


@app.get("/auth/me", response_model=UserOut)
def me(authorization: str | None = Header(default=None)):
    """Текущий пользователь по токену."""
    user = require_auth(authorization)
    return user


# =============================================
# Роуты: Услуги
# =============================================

@app.get("/services", response_model=list[ServiceOut])
def get_services():
    """Список всех услуг."""
    conn = get_db()
    rows = conn.execute("SELECT * FROM services").fetchall()
    conn.close()
    return [dict(r) for r in rows]


@app.get("/services/{service_id}", response_model=ServiceOut)
def get_service(service_id: int):
    """Одна услуга по ID."""
    conn = get_db()
    service = get_service_dict(conn, service_id)
    conn.close()
    if not service:
        raise HTTPException(status_code=404, detail="Услуга не найдена")
    return service


@app.post("/services", response_model=ServiceOut, status_code=201)
def create_service(data: ServiceCreate, authorization: str | None = Header(default=None)):
    """Создать услугу (только admin)."""
    user = require_auth(authorization)
    require_role(user, ["admin"])

    conn = get_db()
    cur = conn.execute(
        "INSERT INTO services (name, category, duration, price, description, image) VALUES (?, ?, ?, ?, ?, ?)",
        (data.name, data.category, data.duration, data.price, data.description, data.image),
    )
    conn.commit()
    service = get_service_dict(conn, cur.lastrowid)
    conn.close()
    return service


@app.put("/services/{service_id}", response_model=ServiceOut)
def update_service(service_id: int, data: ServiceCreate, authorization: str | None = Header(default=None)):
    """Обновить услугу (только admin)."""
    user = require_auth(authorization)
    require_role(user, ["admin"])

    conn = get_db()
    existing = get_service_dict(conn, service_id)
    if not existing:
        conn.close()
        raise HTTPException(status_code=404, detail="Услуга не найдена")

    conn.execute(
        "UPDATE services SET name=?, category=?, duration=?, price=?, description=?, image=? WHERE id=?",
        (data.name, data.category, data.duration, data.price, data.description, data.image, service_id),
    )
    conn.commit()
    service = get_service_dict(conn, service_id)
    conn.close()
    return service


@app.delete("/services/{service_id}", status_code=204)
def delete_service(service_id: int, authorization: str | None = Header(default=None)):
    """Удалить услугу (только admin)."""
    user = require_auth(authorization)
    require_role(user, ["admin"])

    conn = get_db()
    existing = get_service_dict(conn, service_id)
    if not existing:
        conn.close()
        raise HTTPException(status_code=404, detail="Услуга не найдена")

    conn.execute("DELETE FROM services WHERE id = ?", (service_id,))
    conn.commit()
    conn.close()


# =============================================
# Роуты: Мастера
# =============================================

@app.get("/masters", response_model=list[MasterOut])
def get_masters():
    """Список всех мастеров."""
    conn = get_db()
    rows = conn.execute("SELECT * FROM masters").fetchall()
    result = []
    for row in rows:
        master = dict(row)
        photos = conn.execute(
            "SELECT image_url FROM master_portfolio WHERE master_id = ? ORDER BY position",
            (master["id"],),
        ).fetchall()
        master["portfolio"] = [p["image_url"] for p in photos]
        result.append(master)
    conn.close()
    return result


@app.get("/masters/{master_id}", response_model=MasterOut)
def get_master(master_id: int):
    """Один мастер по ID."""
    conn = get_db()
    master = get_master_dict(conn, master_id)
    conn.close()
    if not master:
        raise HTTPException(status_code=404, detail="Мастер не найден")
    return master


@app.post("/masters", response_model=MasterOut, status_code=201)
def create_master(data: MasterCreate, authorization: str | None = Header(default=None)):
    """Создать мастера (только admin)."""
    user = require_auth(authorization)
    require_role(user, ["admin"])

    conn = get_db()
    cur = conn.execute(
        "INSERT INTO masters (user_id, name, photo, specialization, rating, experience) VALUES (NULL, ?, ?, ?, ?, ?)",
        (data.name, data.photo, data.specialization, data.rating, data.experience),
    )
    master_id = cur.lastrowid

    # Сохраняем портфолио
    for i, url in enumerate(data.portfolio):
        conn.execute(
            "INSERT INTO master_portfolio (master_id, image_url, position) VALUES (?, ?, ?)",
            (master_id, url, i),
        )

    conn.commit()
    master = get_master_dict(conn, master_id)
    conn.close()
    return master


@app.put("/masters/{master_id}", response_model=MasterOut)
def update_master(master_id: int, data: MasterCreate, authorization: str | None = Header(default=None)):
    """Обновить мастера (только admin)."""
    user = require_auth(authorization)
    require_role(user, ["admin"])

    conn = get_db()
    existing = get_master_dict(conn, master_id)
    if not existing:
        conn.close()
        raise HTTPException(status_code=404, detail="Мастер не найден")

    conn.execute(
        "UPDATE masters SET name=?, photo=?, specialization=?, rating=?, experience=? WHERE id=?",
        (data.name, data.photo, data.specialization, data.rating, data.experience, master_id),
    )

    # Пересоздаём портфолио
    conn.execute("DELETE FROM master_portfolio WHERE master_id = ?", (master_id,))
    for i, url in enumerate(data.portfolio):
        conn.execute(
            "INSERT INTO master_portfolio (master_id, image_url, position) VALUES (?, ?, ?)",
            (master_id, url, i),
        )

    conn.commit()
    master = get_master_dict(conn, master_id)
    conn.close()
    return master


@app.delete("/masters/{master_id}", status_code=204)
def delete_master(master_id: int, authorization: str | None = Header(default=None)):
    """Удалить мастера (только admin)."""
    user = require_auth(authorization)
    require_role(user, ["admin"])

    conn = get_db()
    existing = get_master_dict(conn, master_id)
    if not existing:
        conn.close()
        raise HTTPException(status_code=404, detail="Мастер не найден")

    conn.execute("DELETE FROM masters WHERE id = ?", (master_id,))
    conn.commit()
    conn.close()


# =============================================
# Роуты: Слоты времени
# =============================================

@app.get("/slots", response_model=list[TimeSlotOut])
def get_slots(
    master_id: int = Query(..., description="ID мастера"),
    date_param: str = Query(..., alias="date", description="Дата в формате YYYY-MM-DD"),
    authorization: str | None = Header(default=None),
):
    """Доступные слоты для мастера на дату.
    Требует авторизацию.
    Генерирует слоты 9:00–19:00 с шагом 30 минут.
    """
    require_auth(authorization)

    # Валидация даты
    try:
        date.fromisoformat(date_param)
    except ValueError:
        raise HTTPException(status_code=400, detail="Дата должна быть в формате YYYY-MM-DD")

    if master_id < 0:
        raise HTTPException(status_code=400, detail="ID мастера не может быть отрицательным")

    conn = get_db()
    # master_id=0 означает «любой мастер» — показываем все слоты
    if master_id == 0:
        rows = conn.execute(
            "SELECT time FROM bookings WHERE date = ? AND status != 'cancelled'",
            (date_param,),
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT time FROM bookings WHERE master_id = ? AND date = ? AND status != 'cancelled'",
            (master_id, date_param),
        ).fetchall()
    conn.close()
    busy_times = {r["time"] for r in rows}

    # Если дата сегодня — прошедшие слоты недоступны
    is_today = date.fromisoformat(date_param) == date.today()
    now = datetime.now()

    slots: list[dict] = []
    for hour in range(9, 20):
        time_str = f"{hour}:00"
        past = is_today and (hour < now.hour or (hour == now.hour and 0 <= now.minute))
        slots.append({"time": time_str, "available": not past and time_str not in busy_times})
        if hour < 19:
            time_str_half = f"{hour}:30"
            past_half = is_today and (hour < now.hour or (hour == now.hour and 30 <= now.minute))
            slots.append({"time": time_str_half, "available": not past_half and time_str_half not in busy_times})

    return slots


# =============================================
# Роуты: Записи
# =============================================

@app.post("/bookings", response_model=BookingOut, status_code=201)
def create_booking(data: BookingCreate, authorization: str | None = Header(default=None)):
    """Создать запись. Требует авторизацию."""
    user = require_auth(authorization)
    conn = get_db()

    # Проверяем, что услуга существует
    if not get_service_dict(conn, data.service_id):
        conn.close()
        raise HTTPException(status_code=400, detail="Услуга не найдена")

    # Проверяем, что мастер существует (0 = «любой»)
    if data.master_id != 0 and not get_master_dict(conn, data.master_id):
        conn.close()
        raise HTTPException(status_code=400, detail="Мастер не найден")

    # Проверяем, что дата и время не в прошлом
    try:
        booking_date = date.fromisoformat(data.date)
        if booking_date < date.today():
            conn.close()
            raise HTTPException(status_code=400, detail="Нельзя записаться на прошедшую дату")
        if booking_date == date.today():
            now = datetime.now()
            hours, minutes = map(int, data.time.split(":"))
            if hours < now.hour or (hours == now.hour and minutes <= now.minute):
                conn.close()
                raise HTTPException(status_code=400, detail="Это время уже прошло")
    except ValueError:
        conn.close()
        raise HTTPException(status_code=400, detail="Неверный формат даты")

    # Проверяем, что слот свободен у мастера (если выбран)
    if data.master_id != 0:
        conflict = conn.execute(
            "SELECT id FROM bookings WHERE master_id = ? AND date = ? AND time = ? AND status != 'cancelled'",
            (data.master_id, data.date, data.time),
        ).fetchone()
        if conflict:
            conn.close()
            raise HTTPException(status_code=400, detail="Это время уже занято у данного мастера")

    # Проверяем, что у пользователя нет записи на это же время
    user_conflict = conn.execute(
        "SELECT id FROM bookings WHERE user_id = ? AND date = ? AND time = ? AND status != 'cancelled'",
        (user["id"], data.date, data.time),
    ).fetchone()
    if user_conflict:
        conn.close()
        raise HTTPException(status_code=400, detail="У вас уже есть запись на это время")

    phone = normalize_phone(data.client_phone)
    master_id_val = data.master_id if data.master_id != 0 else None

    cur = conn.execute(
        "INSERT INTO bookings (service_id, master_id, user_id, date, time, client_name, client_phone, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'upcoming')",
        (data.service_id, master_id_val, user["id"], data.date, data.time, data.client_name, phone),
    )
    conn.commit()

    booking = row_to_dict(conn.execute("SELECT * FROM bookings WHERE id = ?", (cur.lastrowid,)).fetchone())
    booking["master_id"] = booking["master_id"] or 0
    result = make_booking_out(conn, booking)
    conn.close()

    # SMS-подтверждение (не блокирует ответ при ошибке)
    service_dict = result.get("service")
    master_dict = result.get("master")
    send_booking_confirmation(
        phone=phone,
        service_name=service_dict["name"] if service_dict else "Услуга",
        date=data.date,
        time=data.time,
        master_name=master_dict["name"] if master_dict else None,
    )

    return result


@app.get("/bookings", response_model=list[BookingOut])
def get_all_bookings(authorization: str | None = Header(default=None)):
    """Все записи (только admin)."""
    user = require_auth(authorization)
    require_role(user, ["admin"])

    conn = get_db()
    rows = conn.execute("SELECT * FROM bookings ORDER BY date, time").fetchall()
    result = []
    for row in rows:
        b = dict(row)
        b["master_id"] = b["master_id"] or 0
        result.append(make_booking_out(conn, b))
    conn.close()
    return result


@app.get("/bookings/my", response_model=list[BookingOut])
def get_my_bookings(
    authorization: str | None = Header(default=None),
):
    """Мои записи. Требует авторизацию.
    client — видит свои записи (по user_id).
    master — видит записи к себе.
    admin — видит все.
    """
    user = require_auth(authorization)
    conn = get_db()

    if user["role"] == "admin":
        rows = conn.execute("SELECT * FROM bookings ORDER BY date, time").fetchall()
    elif user["role"] == "master":
        master = conn.execute("SELECT id FROM masters WHERE user_id = ?", (user["id"],)).fetchone()
        if master:
            rows = conn.execute("SELECT * FROM bookings WHERE master_id = ? ORDER BY date, time", (master["id"],)).fetchall()
        else:
            rows = []
    else:
        rows = conn.execute("SELECT * FROM bookings WHERE user_id = ? ORDER BY date, time", (user["id"],)).fetchall()

    result = []
    for row in rows:
        b = dict(row)
        b["master_id"] = b["master_id"] or 0
        result.append(make_booking_out(conn, b))
    conn.close()
    return result


@app.get("/bookings/{booking_id}", response_model=BookingOut)
def get_booking(booking_id: int, authorization: str | None = Header(default=None)):
    """Одна запись по ID (только владелец или admin)."""
    user = require_auth(authorization)
    conn = get_db()

    row = conn.execute("SELECT * FROM bookings WHERE id = ?", (booking_id,)).fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Запись не найдена")

    booking = dict(row)

    is_owner = booking.get("user_id") == user["id"]
    is_admin = user["role"] == "admin"

    if not (is_owner or is_admin):
        conn.close()
        raise HTTPException(status_code=403, detail="Нет доступа к этой записи")

    booking["master_id"] = booking["master_id"] or 0
    result = make_booking_out(conn, booking)
    conn.close()
    return result


@app.patch("/bookings/{booking_id}/cancel", response_model=BookingOut)
def cancel_booking(booking_id: int, authorization: str | None = Header(default=None)):
    """Отменить запись. Требует авторизацию. Только владелец или admin."""
    user = require_auth(authorization)
    conn = get_db()

    row = conn.execute("SELECT * FROM bookings WHERE id = ?", (booking_id,)).fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Запись не найдена")

    booking = dict(row)

    # Проверяем что это владелец или админ
    is_owner = booking.get("user_id") == user["id"]
    is_admin = user["role"] == "admin"

    if not (is_owner or is_admin):
        conn.close()
        raise HTTPException(status_code=403, detail="Вы можете отменять только свои записи")

    if booking["status"] == "cancelled":
        conn.close()
        raise HTTPException(status_code=400, detail="Запись уже отменена")

    conn.execute("UPDATE bookings SET status = 'cancelled' WHERE id = ?", (booking_id,))
    conn.commit()

    booking["status"] = "cancelled"
    booking["master_id"] = booking["master_id"] or 0
    result = make_booking_out(conn, booking)
    conn.close()

    # SMS об отмене (не блокирует ответ при ошибке)
    service_dict = result.get("service")
    send_booking_cancelled(
        phone=booking["client_phone"],
        service_name=service_dict["name"] if service_dict else "Услуга",
        date=booking["date"],
        time=booking["time"],
    )

    return result


# =============================================
# Раздача React build (для продакшена)
# Если папка build существует — отдаём статику и SPA fallback
# =============================================

BUILD_DIR = Path(__file__).parent.parent / "build"

if BUILD_DIR.exists():
    # Статические файлы (JS, CSS, изображения)
    app.mount("/static", StaticFiles(directory=BUILD_DIR / "static"), name="static")

    # SPA fallback — все остальные пути отдают index.html
    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        # Если запрашивается конкретный файл из build — отдаём его
        file_path = BUILD_DIR / full_path
        if full_path and file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        # Иначе — index.html (React Router разберётся)
        return FileResponse(BUILD_DIR / "index.html")
