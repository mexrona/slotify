# =============================================
# Slotify — бэкенд на FastAPI
# Данные хранятся в памяти (без базы данных)
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
# In-memory хранилище
# =============================================

# Счётчики ID
_next_id = {"service": 11, "master": 5, "booking": 3, "user": 2}

def next_id(entity: str) -> int:
    current = _next_id[entity]
    _next_id[entity] += 1
    return current

# --- Услуги ---
services_db: dict[int, dict] = {
    1:  {"id": 1,  "name": "Женская стрижка",       "category": "Стрижки",          "duration": 60,  "price": 2500, "description": "Стрижка любой сложности с мытьём и укладкой",       "image": "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&h=300&fit=crop"},
    2:  {"id": 2,  "name": "Мужская стрижка",       "category": "Стрижки",          "duration": 40,  "price": 1500, "description": "Классическая или модельная стрижка",                "image": "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=400&h=300&fit=crop"},
    3:  {"id": 3,  "name": "Окрашивание",           "category": "Стрижки",          "duration": 120, "price": 5000, "description": "Однотонное окрашивание профессиональной краской",    "image": "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&h=300&fit=crop"},
    4:  {"id": 4,  "name": "Маникюр классический",  "category": "Маникюр",          "duration": 60,  "price": 1800, "description": "Классический маникюр с покрытием гель-лаком",       "image": "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&h=300&fit=crop"},
    5:  {"id": 5,  "name": "Маникюр с дизайном",    "category": "Маникюр",          "duration": 90,  "price": 2800, "description": "Маникюр с художественным дизайном ногтей",         "image": "https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=400&h=300&fit=crop"},
    6:  {"id": 6,  "name": "Педикюр",               "category": "Маникюр",          "duration": 75,  "price": 2200, "description": "Аппаратный педикюр с покрытием",                    "image": "https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=400&h=300&fit=crop"},
    7:  {"id": 7,  "name": "Чистка лица",           "category": "Косметология",     "duration": 90,  "price": 3500, "description": "Ультразвуковая чистка лица",                       "image": "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=400&h=300&fit=crop"},
    8:  {"id": 8,  "name": "Пилинг",                "category": "Косметология",     "duration": 60,  "price": 3000, "description": "Химический пилинг для обновления кожи",            "image": "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=400&h=300&fit=crop"},
    9:  {"id": 9,  "name": "Наращивание ресниц",    "category": "Ресницы и брови",  "duration": 120, "price": 4000, "description": "Поресничное наращивание, эффект 2D",               "image": "https://images.unsplash.com/photo-1633465631144-aa321b66d44a?w=400&h=300&fit=crop"},
    10: {"id": 10, "name": "Коррекция бровей",      "category": "Ресницы и брови",  "duration": 30,  "price": 1000, "description": "Коррекция формы и окрашивание бровей",             "image": "https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?w=400&h=300&fit=crop"},
}

# --- Мастера ---
masters_db: dict[int, dict] = {
    1: {"id": 1, "name": "Анна Иванова",    "photo": "https://i.pravatar.cc/150?img=1",  "specialization": "Стилист-колорист",    "rating": 4.9, "experience": "8 лет опыта", "portfolio": ["https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=300&h=300&fit=crop", "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=300&h=300&fit=crop", "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=300&h=300&fit=crop"]},
    2: {"id": 2, "name": "Мария Петрова",   "photo": "https://i.pravatar.cc/150?img=5",  "specialization": "Мастер маникюра",     "rating": 4.8, "experience": "5 лет опыта", "portfolio": ["https://images.unsplash.com/photo-1604654894610-df63bc536371?w=300&h=300&fit=crop", "https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=300&h=300&fit=crop", "https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=300&h=300&fit=crop"]},
    3: {"id": 3, "name": "Елена Сидорова",  "photo": "https://i.pravatar.cc/150?img=9",  "specialization": "Косметолог",          "rating": 4.7, "experience": "6 лет опыта", "portfolio": ["https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=300&h=300&fit=crop", "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=300&h=300&fit=crop", "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=300&h=300&fit=crop"]},
    4: {"id": 4, "name": "Ольга Козлова",   "photo": "https://i.pravatar.cc/150?img=16", "specialization": "Бровист-лешмейкер",   "rating": 4.9, "experience": "4 года опыта", "portfolio": ["https://images.unsplash.com/photo-1633465631144-aa321b66d44a?w=300&h=300&fit=crop", "https://images.unsplash.com/photo-1652201767864-49472c48b145?w=300&h=300&fit=crop", "https://images.unsplash.com/photo-1553103326-609d1bd0ca03?w=300&h=300&fit=crop"]},
}

# --- Записи ---
bookings_db: dict[int, dict] = {
    1: {"id": 1, "service_id": 1, "master_id": 1, "date": "2026-03-12", "time": "14:00", "client_name": "Клиент",  "client_phone": "+7 999 123-45-67", "status": "upcoming", "user_id": 1},
    2: {"id": 2, "service_id": 4, "master_id": 2, "date": "2026-02-20", "time": "11:00", "client_name": "Клиент",  "client_phone": "+7 999 123-45-67", "status": "past",     "user_id": 1},
}

# --- Пользователи и токены ---
users_db: dict[int, dict] = {
    1: {"id": 1, "phone": "+79991234567", "name": "Клиент", "role": "client", "master_id": None},
}
tokens_db: dict[str, int] = {}  # token -> user_id


# =============================================
# Вспомогательные функции
# =============================================

def normalize_phone(phone: str) -> str:
    """Оставляет только цифры, добавляет + в начало."""
    digits = re.sub(r"\D", "", phone)
    return f"+{digits}"


def get_current_user(authorization: str | None) -> dict | None:
    """Достаёт пользователя по токену из заголовка Authorization."""
    if not authorization:
        return None
    parts = authorization.split(" ")
    if len(parts) != 2 or parts[0] != "Bearer":
        return None
    token = parts[1]
    user_id = tokens_db.get(token)
    if user_id is None:
        return None
    return users_db.get(user_id)


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


def make_booking_out(booking: dict) -> dict:
    """Собирает полный ответ записи с вложенными service и master."""
    service = services_db.get(booking["service_id"])
    master = masters_db.get(booking["master_id"])
    return {
        **booking,
        "service": service,
        "master": master,
    }


# =============================================
# Создание администратора при старте
# =============================================

def create_admin():
    admin_phone = normalize_phone(os.getenv("ADMIN_PHONE", "+70000000000"))
    admin_name = os.getenv("ADMIN_NAME", "Админ")

    # Проверяем, есть ли уже админ
    for user in users_db.values():
        if user["role"] == "admin":
            return

    admin_id = next_id("user")
    users_db[admin_id] = {
        "id": admin_id,
        "phone": admin_phone,
        "name": admin_name,
        "role": "admin",
        "master_id": None,
    }

create_admin()


# =============================================
# Роуты: Авторизация
# =============================================

@app.post("/auth/register", response_model=UserOut, status_code=201)
def register(data: UserRegister):
    """Регистрация нового пользователя (роль — client)."""
    phone = normalize_phone(data.phone)

    # Проверяем уникальность телефона
    for user in users_db.values():
        if user["phone"] == phone:
            raise HTTPException(status_code=400, detail="Пользователь с таким телефоном уже существует")

    user_id = next_id("user")
    token = uuid.uuid4().hex
    user = {
        "id": user_id,
        "phone": phone,
        "name": data.name,
        "role": "client",
        "master_id": None,
    }
    users_db[user_id] = user
    tokens_db[token] = user_id

    return {**user, "token": token}


@app.post("/auth/login", response_model=UserOut)
def login(data: UserLogin):
    """Вход по номеру телефона. Возвращает токен."""
    phone = normalize_phone(data.phone)

    for user in users_db.values():
        if user["phone"] == phone:
            token = uuid.uuid4().hex
            tokens_db[token] = user["id"]
            return {**user, "token": token}

    raise HTTPException(status_code=404, detail="Пользователь не найден")


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
    return list(services_db.values())


@app.get("/services/{service_id}", response_model=ServiceOut)
def get_service(service_id: int):
    """Одна услуга по ID."""
    service = services_db.get(service_id)
    if not service:
        raise HTTPException(status_code=404, detail="Услуга не найдена")
    return service


@app.post("/services", response_model=ServiceOut, status_code=201)
def create_service(data: ServiceCreate, authorization: str | None = Header(default=None)):
    """Создать услугу (только admin)."""
    user = require_auth(authorization)
    require_role(user, ["admin"])

    service_id = next_id("service")
    service = {"id": service_id, **data.model_dump()}
    services_db[service_id] = service
    return service


@app.put("/services/{service_id}", response_model=ServiceOut)
def update_service(service_id: int, data: ServiceCreate, authorization: str | None = Header(default=None)):
    """Обновить услугу (только admin)."""
    user = require_auth(authorization)
    require_role(user, ["admin"])

    if service_id not in services_db:
        raise HTTPException(status_code=404, detail="Услуга не найдена")

    services_db[service_id] = {"id": service_id, **data.model_dump()}
    return services_db[service_id]


@app.delete("/services/{service_id}", status_code=204)
def delete_service(service_id: int, authorization: str | None = Header(default=None)):
    """Удалить услугу (только admin)."""
    user = require_auth(authorization)
    require_role(user, ["admin"])

    if service_id not in services_db:
        raise HTTPException(status_code=404, detail="Услуга не найдена")

    del services_db[service_id]


# =============================================
# Роуты: Мастера
# =============================================

@app.get("/masters", response_model=list[MasterOut])
def get_masters():
    """Список всех мастеров."""
    return list(masters_db.values())


@app.get("/masters/{master_id}", response_model=MasterOut)
def get_master(master_id: int):
    """Один мастер по ID."""
    master = masters_db.get(master_id)
    if not master:
        raise HTTPException(status_code=404, detail="Мастер не найден")
    return master


@app.post("/masters", response_model=MasterOut, status_code=201)
def create_master(data: MasterCreate, authorization: str | None = Header(default=None)):
    """Создать мастера (только admin)."""
    user = require_auth(authorization)
    require_role(user, ["admin"])

    master_id = next_id("master")
    master = {"id": master_id, **data.model_dump()}
    masters_db[master_id] = master
    return master


@app.put("/masters/{master_id}", response_model=MasterOut)
def update_master(master_id: int, data: MasterCreate, authorization: str | None = Header(default=None)):
    """Обновить мастера (только admin)."""
    user = require_auth(authorization)
    require_role(user, ["admin"])

    if master_id not in masters_db:
        raise HTTPException(status_code=404, detail="Мастер не найден")

    masters_db[master_id] = {"id": master_id, **data.model_dump()}
    return masters_db[master_id]


@app.delete("/masters/{master_id}", status_code=204)
def delete_master(master_id: int, authorization: str | None = Header(default=None)):
    """Удалить мастера (только admin)."""
    user = require_auth(authorization)
    require_role(user, ["admin"])

    if master_id not in masters_db:
        raise HTTPException(status_code=404, detail="Мастер не найден")

    del masters_db[master_id]


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
    # Собираем занятые времена у этого мастера в этот день
    busy_times: set[str] = set()
    for booking in bookings_db.values():
        if booking["master_id"] == master_id and booking["date"] == date and booking["status"] != "cancelled":
            busy_times.add(booking["time"])

    # Генерируем сетку слотов
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

    # Проверяем, что услуга существует
    if data.service_id not in services_db:
        raise HTTPException(status_code=400, detail="Услуга не найдена")

    # Проверяем, что мастер существует (0 = «любой»)
    if data.master_id != 0 and data.master_id not in masters_db:
        raise HTTPException(status_code=400, detail="Мастер не найден")

    # Проверяем, что дата не в прошлом
    try:
        booking_date = date.fromisoformat(data.date)
        if booking_date < date.today():
            raise HTTPException(status_code=400, detail="Нельзя записаться на прошедшую дату")
    except ValueError:
        raise HTTPException(status_code=400, detail="Неверный формат даты")

    # Проверяем, что слот свободен (если мастер выбран)
    if data.master_id != 0:
        for booking in bookings_db.values():
            if (booking["master_id"] == data.master_id
                    and booking["date"] == data.date
                    and booking["time"] == data.time
                    and booking["status"] != "cancelled"):
                raise HTTPException(status_code=400, detail="Это время уже занято у данного мастера")

    booking_id = next_id("booking")
    booking = {
        "id": booking_id,
        **data.model_dump(),
        "client_phone": normalize_phone(data.client_phone),
        "status": "upcoming",
        "user_id": user["id"] if user else None,
    }
    bookings_db[booking_id] = booking

    return make_booking_out(booking)


@app.get("/bookings", response_model=list[BookingOut])
def get_all_bookings(authorization: str | None = Header(default=None)):
    """Все записи (только admin)."""
    user = require_auth(authorization)
    require_role(user, ["admin"])

    return [make_booking_out(b) for b in bookings_db.values()]


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

    result = []
    for booking in bookings_db.values():
        # С авторизацией — по user_id или master_id
        if user:
            if user["role"] == "client" and booking.get("user_id") == user["id"]:
                result.append(make_booking_out(booking))
            elif user["role"] == "master" and user.get("master_id") and booking["master_id"] == user["master_id"]:
                result.append(make_booking_out(booking))
            elif user["role"] == "admin":
                result.append(make_booking_out(booking))
        # Без авторизации — по номеру телефона
        elif phone:
            if booking.get("client_phone") == normalize_phone(phone):
                result.append(make_booking_out(booking))

    return result


@app.get("/bookings/{booking_id}", response_model=BookingOut)
def get_booking(booking_id: int, authorization: str | None = Header(default=None)):
    """Одна запись по ID (владелец, мастер записи или admin)."""
    user = require_auth(authorization)

    booking = bookings_db.get(booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Запись не найдена")

    # Проверяем доступ
    is_owner = booking.get("user_id") == user["id"]
    is_master = user["role"] == "master" and user.get("master_id") == booking["master_id"]
    is_admin = user["role"] == "admin"

    if not (is_owner or is_master or is_admin):
        raise HTTPException(status_code=403, detail="Нет доступа к этой записи")

    return make_booking_out(booking)


@app.patch("/bookings/{booking_id}/cancel", response_model=BookingOut)
def cancel_booking(booking_id: int, authorization: str | None = Header(default=None)):
    """Отменить запись. Без авторизации — доступно всем (по ID записи)."""
    booking = bookings_db.get(booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Запись не найдена")

    # Если есть авторизация — проверяем владельца
    user = get_current_user(authorization)
    if user and user["role"] != "admin":
        if booking.get("user_id") and booking["user_id"] != user["id"]:
            raise HTTPException(status_code=403, detail="Вы можете отменять только свои записи")

    if booking["status"] == "cancelled":
        raise HTTPException(status_code=400, detail="Запись уже отменена")

    booking["status"] = "cancelled"
    return make_booking_out(booking)
