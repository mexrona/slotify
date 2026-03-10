# =============================================
# Подключение к SQLite и создание таблиц
# =============================================

import os
import sqlite3
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

# Путь к файлу базы данных (всегда рядом с database.py, независимо от CWD)
_backend_dir = Path(__file__).parent
_db_name = os.getenv("DB_PATH", "slotify.db")
DB_PATH = str(_backend_dir / _db_name)


def get_db() -> sqlite3.Connection:
    """Создаёт подключение к SQLite.
    row_factory = sqlite3.Row — чтобы обращаться к полям по имени (row["name"]).
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")  # включаем проверку внешних ключей
    return conn


def init_db():
    """Создаёт таблицы, если их ещё нет."""
    conn = get_db()
    conn.executescript("""
        -- Пользователи (клиенты, мастера, админы)
        CREATE TABLE IF NOT EXISTS users (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            email         TEXT    NOT NULL UNIQUE,
            password_hash TEXT    NOT NULL,
            name          TEXT    NOT NULL CHECK(length(name) >= 2),
            phone         TEXT    NOT NULL,
            role          TEXT    NOT NULL DEFAULT 'client'
                                  CHECK(role IN ('client', 'master', 'admin')),
            token         TEXT,
            created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
        );

        -- Услуги салона
        CREATE TABLE IF NOT EXISTS services (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT    NOT NULL,
            category    TEXT    NOT NULL,
            duration    INTEGER NOT NULL CHECK(duration > 0),
            price       INTEGER NOT NULL CHECK(price > 0),
            description TEXT    NOT NULL,
            image       TEXT    NOT NULL
        );

        -- Мастера
        CREATE TABLE IF NOT EXISTS masters (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id        INTEGER UNIQUE REFERENCES users(id) ON DELETE SET NULL,
            name           TEXT    NOT NULL CHECK(length(name) >= 2),
            photo          TEXT    NOT NULL,
            specialization TEXT    NOT NULL,
            rating         REAL    NOT NULL DEFAULT 0.0
                                   CHECK(rating >= 0.0 AND rating <= 5.0),
            experience     TEXT    NOT NULL
        );

        -- Портфолио мастера (фото работ)
        CREATE TABLE IF NOT EXISTS master_portfolio (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            master_id INTEGER NOT NULL REFERENCES masters(id) ON DELETE CASCADE,
            image_url TEXT    NOT NULL,
            position  INTEGER NOT NULL DEFAULT 0
        );

        -- Записи клиентов
        CREATE TABLE IF NOT EXISTS bookings (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            service_id   INTEGER NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
            master_id    INTEGER REFERENCES masters(id) ON DELETE SET NULL,
            user_id      INTEGER REFERENCES users(id) ON DELETE SET NULL,
            date         TEXT    NOT NULL,
            time         TEXT    NOT NULL,
            client_name  TEXT    NOT NULL CHECK(length(client_name) >= 2),
            client_phone TEXT    NOT NULL,
            status       TEXT    NOT NULL DEFAULT 'upcoming'
                                 CHECK(status IN ('upcoming', 'past', 'cancelled')),
            created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
        );

        -- Уникальность: один мастер — одно время — одна дата (для активных записей)
        CREATE UNIQUE INDEX IF NOT EXISTS idx_booking_slot
            ON bookings(master_id, date, time)
            WHERE status != 'cancelled' AND master_id IS NOT NULL;
    """)
    conn.commit()
    conn.close()
