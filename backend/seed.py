# =============================================
# Тестовые данные для Slotify
# Запуск: python seed.py
# Пересоздаёт таблицы и заполняет их данными
# =============================================

import hashlib
import os

from dotenv import load_dotenv

from database import get_db, init_db

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "slotify-dev-secret")


def hash_password(password: str) -> str:
    """Хеширует пароль с солью через SHA-256."""
    salted = SECRET_KEY + password
    return hashlib.sha256(salted.encode()).hexdigest()


def seed():
    """Заполняет базу тестовыми данными."""
    init_db()
    conn = get_db()
    cur = conn.cursor()

    # Очищаем все таблицы и сбрасываем счётчики ID
    cur.executescript("""
        DELETE FROM bookings;
        DELETE FROM master_portfolio;
        DELETE FROM masters;
        DELETE FROM services;
        DELETE FROM users;
        DELETE FROM sqlite_sequence;
    """)

    # --- Пользователи ---
    admin_email = os.getenv("ADMIN_EMAIL", "admin@slotify.ru")
    admin_password = os.getenv("ADMIN_PASSWORD", "admin123")
    admin_name = os.getenv("ADMIN_NAME", "Админ")
    admin_phone = os.getenv("ADMIN_PHONE", "+70000000000")

    cur.execute(
        "INSERT INTO users (email, password_hash, name, phone, role) VALUES (?, ?, ?, ?, ?)",
        (admin_email, hash_password(admin_password), admin_name, admin_phone, "admin"),
    )
    cur.execute(
        "INSERT INTO users (email, password_hash, name, phone, role) VALUES (?, ?, ?, ?, ?)",
        ("client@test.ru", hash_password("client123"), "Клиент", "+79991234567", "client"),
    )
    cur.execute(
        "INSERT INTO users (email, password_hash, name, phone, role) VALUES (?, ?, ?, ?, ?)",
        ("test@example.com", hash_password("password123"), "Тест", "+79990000000", "client"),
    )

    # --- Услуги ---
    services = [
        ("Женская стрижка",      "Стрижки",         60,  2500, "Стрижка любой сложности с мытьём и укладкой",    "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&h=300&fit=crop"),
        ("Мужская стрижка",      "Стрижки",         40,  1500, "Классическая или модельная стрижка",             "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=400&h=300&fit=crop"),
        ("Окрашивание",          "Стрижки",         120, 5000, "Однотонное окрашивание профессиональной краской", "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&h=300&fit=crop"),
        ("Маникюр классический", "Маникюр",         60,  1800, "Классический маникюр с покрытием гель-лаком",    "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&h=300&fit=crop"),
        ("Маникюр с дизайном",   "Маникюр",         90,  2800, "Маникюр с художественным дизайном ногтей",      "https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=400&h=300&fit=crop"),
        ("Педикюр",              "Маникюр",         75,  2200, "Аппаратный педикюр с покрытием",                 "https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=400&h=300&fit=crop"),
        ("Чистка лица",          "Косметология",    90,  3500, "Ультразвуковая чистка лица",                    "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=400&h=300&fit=crop"),
        ("Пилинг",               "Косметология",    60,  3000, "Химический пилинг для обновления кожи",         "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=400&h=300&fit=crop"),
        ("Наращивание ресниц",   "Ресницы и брови", 120, 4000, "Поресничное наращивание, эффект 2D",            "https://images.unsplash.com/photo-1633465631144-aa321b66d44a?w=400&h=300&fit=crop"),
        ("Коррекция бровей",     "Ресницы и брови", 30,  1000, "Коррекция формы и окрашивание бровей",          "https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?w=400&h=300&fit=crop"),
    ]
    cur.executemany(
        "INSERT INTO services (name, category, duration, price, description, image) VALUES (?, ?, ?, ?, ?, ?)",
        services,
    )

    # --- Мастера ---
    masters = [
        (None, "Анна Иванова",   "https://i.pravatar.cc/150?img=1",  "Стилист-колорист",  4.9, "8 лет опыта"),
        (None, "Мария Петрова",  "https://i.pravatar.cc/150?img=5",  "Мастер маникюра",   4.8, "5 лет опыта"),
        (None, "Елена Сидорова", "https://i.pravatar.cc/150?img=9",  "Косметолог",        4.7, "6 лет опыта"),
        (None, "Ольга Козлова",  "https://i.pravatar.cc/150?img=16", "Бровист-лешмейкер", 4.9, "4 года опыта"),
    ]
    cur.executemany(
        "INSERT INTO masters (user_id, name, photo, specialization, rating, experience) VALUES (?, ?, ?, ?, ?, ?)",
        masters,
    )

    # --- Портфолио мастеров ---
    portfolio = [
        # Анна Иванова (master_id=1)
        (1, "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=300&h=300&fit=crop", 0),
        (1, "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=300&h=300&fit=crop",    1),
        (1, "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=300&h=300&fit=crop", 2),
        # Мария Петрова (master_id=2)
        (2, "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=300&h=300&fit=crop", 0),
        (2, "https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=300&h=300&fit=crop", 1),
        (2, "https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=300&h=300&fit=crop", 2),
        # Елена Сидорова (master_id=3)
        (3, "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=300&h=300&fit=crop", 0),
        (3, "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=300&h=300&fit=crop", 1),
        (3, "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=300&h=300&fit=crop", 2),
        # Ольга Козлова (master_id=4)
        (4, "https://images.unsplash.com/photo-1633465631144-aa321b66d44a?w=300&h=300&fit=crop", 0),
        (4, "https://images.unsplash.com/photo-1652201767864-49472c48b145?w=300&h=300&fit=crop", 1),
        (4, "https://images.unsplash.com/photo-1553103326-609d1bd0ca03?w=300&h=300&fit=crop",    2),
    ]
    cur.executemany(
        "INSERT INTO master_portfolio (master_id, image_url, position) VALUES (?, ?, ?)",
        portfolio,
    )

    conn.commit()
    conn.close()
    print("База данных заполнена тестовыми данными!")
    print("Тестовые аккаунты:")
    print(f"  Админ:  {admin_email} / {admin_password}")
    print(f"  Клиент: client@test.ru / client123")
    print(f"  Тест:   test@example.com / password123")


if __name__ == "__main__":
    seed()
