# =============================================
# Slotify — бэкенд на FastAPI
# Данные хранятся в SQLite (файл slotify.db)
# =============================================

import os
import re
import uuid
from datetime import date

from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, field_validator

from database import get_db, init_db

load_dotenv()

app = FastAPI(title="Slotify API", version="1.0.0")

# --- CORS (разрешаем фронтенду обращаться к API) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        os.getenv("FRONTEND_URL", "http://localhost:3000"),
        "http://localhost:8001",
        "http://127.0.0.1:8001",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)


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

def create_admin():
    """Создаёт администратора, если его ещё нет."""
    admin_phone = normalize_phone(os.getenv("ADMIN_PHONE", "+70000000000"))
    admin_name = os.getenv("ADMIN_NAME", "Админ")

    conn = get_db()
    existing = conn.execute("SELECT id FROM users WHERE role = 'admin'").fetchone()
    if not existing:
        conn.execute(
            "INSERT OR IGNORE INTO users (phone, name, role) VALUES (?, ?, 'admin')",
            (admin_phone, admin_name),
        )
        conn.commit()
    conn.close()


# =============================================
# Pydantic-модели (схемы данных)
# =============================================

# ---------- Услуга ----------
class ServiceCreate(BaseModel):
    name: str
    category: str
    duration: int
    price: int
    description: str
    image: str

    @field_validator("duration", "price")
    @classmethod
    def must_be_positive(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("Должно быть больше 0")
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
    def name_min_length(cls, v: str) -> str:
        if len(v.strip()) < 2:
            raise ValueError("Имя должно содержать минимум 2 символа")
        return v.strip()

    @field_validator("rating")
    @classmethod
    def rating_range(cls, v: float) -> float:
        if not 0.0 <= v <= 5.0:
            raise ValueError("Рейтинг должен быть от 0 до 5")
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
    def name_min_length(cls, v: str) -> str:
        if len(v.strip()) < 2:
            raise ValueError("Имя должно содержать минимум 2 символа")
        return v.strip()

    @field_validator("client_phone")
    @classmethod
    def phone_valid(cls, v: str) -> str:
        digits = re.sub(r"\D", "", v)
        if len(digits) < 11:
            raise ValueError("Телефон должен содержать минимум 11 цифр")
        return v

    @field_validator("date")
    @classmethod
    def date_format(cls, v: str) -> str:
        try:
            date.fromisoformat(v)
        except ValueError:
            raise ValueError("Дата должна быть в формате YYYY-MM-DD")
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
    phone: str
    name: str

    @field_validator("phone")
    @classmethod
    def phone_valid(cls, v: str) -> str:
        digits = re.sub(r"\D", "", v)
        if len(digits) < 11:
            raise ValueError("Телефон должен содержать минимум 11 цифр")
        return v

    @field_validator("name")
    @classmethod
    def name_min_length(cls, v: str) -> str:
        if len(v.strip()) < 2:
            raise ValueError("Имя должно содержать минимум 2 символа")
        return v.strip()

class UserLogin(BaseModel):
    phone: str

class UserOut(BaseModel):
    id: int
    phone: str
    name: str
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
        "SELECT u.* FROM users u JOIN tokens t ON u.id = t.user_id WHERE t.token = ?",
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


# =============================================
# Роуты: Авторизация
# =============================================

@app.post("/auth/register", response_model=UserOut, status_code=201)
def register(data: UserRegister):
    """Регистрация нового пользователя (роль — client)."""
    phone = normalize_phone(data.phone)
    conn = get_db()

    existing = conn.execute("SELECT id FROM users WHERE phone = ?", (phone,)).fetchone()
    if existing:
        conn.close()
        raise HTTPException(status_code=400, detail="Пользователь с таким телефоном уже существует")

    cur = conn.execute(
        "INSERT INTO users (phone, name, role) VALUES (?, ?, 'client')",
        (phone, data.name),
    )
    user_id = cur.lastrowid

    token = uuid.uuid4().hex
    conn.execute("INSERT INTO tokens (token, user_id) VALUES (?, ?)", (token, user_id))
    conn.commit()

    user = row_to_dict(conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone())
    conn.close()
    return {**user, "token": token}


@app.post("/auth/login", response_model=UserOut)
def login(data: UserLogin):
    """Вход по номеру телефона. Возвращает токен."""
    phone = normalize_phone(data.phone)
    conn = get_db()

    user = conn.execute("SELECT * FROM users WHERE phone = ?", (phone,)).fetchone()
    if not user:
        conn.close()
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    token = uuid.uuid4().hex
    conn.execute("INSERT INTO tokens (token, user_id) VALUES (?, ?)", (token, user["id"]))
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
    date: str = Query(..., description="Дата в формате YYYY-MM-DD"),
):
    """Доступные слоты для мастера на дату.
    Генерирует слоты 9:00–19:00 с шагом 30 минут.
    Помечает занятые (уже есть запись) как available=false.
    """
    conn = get_db()
    rows = conn.execute(
        "SELECT time FROM bookings WHERE master_id = ? AND date = ? AND status != 'cancelled'",
        (master_id, date),
    ).fetchall()
    conn.close()
    busy_times = {r["time"] for r in rows}

    slots: list[dict] = []
    for hour in range(9, 20):
        time_str = f"{hour}:00"
        slots.append({"time": time_str, "available": time_str not in busy_times})
        if hour < 19:
            time_str_half = f"{hour}:30"
            slots.append({"time": time_str_half, "available": time_str_half not in busy_times})

    return slots


# =============================================
# Роуты: Записи
# =============================================

@app.post("/bookings", response_model=BookingOut, status_code=201)
def create_booking(data: BookingCreate, authorization: str | None = Header(default=None)):
    """Создать запись. Авторизация не обязательна (гостевая запись)."""
    user = get_current_user(authorization)
    conn = get_db()

    # Проверяем, что услуга существует
    if not get_service_dict(conn, data.service_id):
        conn.close()
        raise HTTPException(status_code=400, detail="Услуга не найдена")

    # Проверяем, что мастер существует (0 = «любой»)
    if data.master_id != 0 and not get_master_dict(conn, data.master_id):
        conn.close()
        raise HTTPException(status_code=400, detail="Мастер не найден")

    # Проверяем, что дата не в прошлом
    try:
        booking_date = date.fromisoformat(data.date)
        if booking_date < date.today():
            conn.close()
            raise HTTPException(status_code=400, detail="Нельзя записаться на прошедшую дату")
    except ValueError:
        conn.close()
        raise HTTPException(status_code=400, detail="Неверный формат даты")

    # Проверяем, что слот свободен (если мастер выбран)
    if data.master_id != 0:
        conflict = conn.execute(
            "SELECT id FROM bookings WHERE master_id = ? AND date = ? AND time = ? AND status != 'cancelled'",
            (data.master_id, data.date, data.time),
        ).fetchone()
        if conflict:
            conn.close()
            raise HTTPException(status_code=400, detail="Это время уже занято у данного мастера")

    phone = normalize_phone(data.client_phone)
    master_id_val = data.master_id if data.master_id != 0 else None
    user_id_val = user["id"] if user else None

    cur = conn.execute(
        "INSERT INTO bookings (service_id, master_id, user_id, date, time, client_name, client_phone, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'upcoming')",
        (data.service_id, master_id_val, user_id_val, data.date, data.time, data.client_name, phone),
    )
    conn.commit()

    booking = row_to_dict(conn.execute("SELECT * FROM bookings WHERE id = ?", (cur.lastrowid,)).fetchone())
    # Для ответа: master_id=NULL нужно вернуть как 0 (фронтенд ожидает число)
    booking["master_id"] = booking["master_id"] or 0
    result = make_booking_out(conn, booking)
    conn.close()
    return result


@app.get("/bookings", response_model=list[BookingOut])
def get_all_bookings(authorization: str | None = Header(default=None)):
    """Все записи (только admin)."""
    user = require_auth(authorization)
    require_role(user, ["admin"])

    conn = get_db()
    rows = conn.execute("SELECT * FROM bookings").fetchall()
    result = []
    for row in rows:
        b = dict(row)
        b["master_id"] = b["master_id"] or 0
        result.append(make_booking_out(conn, b))
    conn.close()
    return result


@app.get("/bookings/my", response_model=list[BookingOut])
def get_my_bookings(
    phone: str = Query("", description="Телефон клиента для поиска записей"),
    authorization: str | None = Header(default=None),
):
    """Мои записи.
    Без авторизации — поиск по номеру телефона.
    С авторизацией — по user_id / master_id.
    """
    user = get_current_user(authorization)
    conn = get_db()

    if user:
        if user["role"] == "admin":
            rows = conn.execute("SELECT * FROM bookings").fetchall()
        elif user["role"] == "master":
            # Ищем master_id по user_id
            master = conn.execute("SELECT id FROM masters WHERE user_id = ?", (user["id"],)).fetchone()
            if master:
                rows = conn.execute("SELECT * FROM bookings WHERE master_id = ?", (master["id"],)).fetchall()
            else:
                rows = []
        else:
            rows = conn.execute("SELECT * FROM bookings WHERE user_id = ?", (user["id"],)).fetchall()
    elif phone:
        normalized = normalize_phone(phone)
        rows = conn.execute("SELECT * FROM bookings WHERE client_phone = ?", (normalized,)).fetchall()
    else:
        rows = []

    result = []
    for row in rows:
        b = dict(row)
        b["master_id"] = b["master_id"] or 0
        result.append(make_booking_out(conn, b))
    conn.close()
    return result


@app.get("/bookings/{booking_id}", response_model=BookingOut)
def get_booking(booking_id: int, authorization: str | None = Header(default=None)):
    """Одна запись по ID (владелец, мастер записи или admin)."""
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
    """Отменить запись. Без авторизации — доступно всем (по ID записи)."""
    conn = get_db()

    row = conn.execute("SELECT * FROM bookings WHERE id = ?", (booking_id,)).fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Запись не найдена")

    booking = dict(row)

    # Если есть авторизация — проверяем владельца
    user = get_current_user(authorization)
    if user and user["role"] != "admin":
        if booking.get("user_id") and booking["user_id"] != user["id"]:
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
    return result
