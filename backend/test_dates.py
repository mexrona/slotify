# =============================================
# Тесты валидации дат и слотов
# Запуск: pytest backend/test_dates.py -v
# =============================================

import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from main import app, MSK

client = TestClient(app)


# --- Хелперы ---

def register_and_get_token(prefix="test"):
    """Регистрирует пользователя с уникальным email и возвращает токен."""
    email = f"{prefix}_{uuid.uuid4().hex[:8]}@test.com"
    resp = client.post("/auth/register", json={
        "email": email,
        "password": "123456",
        "name": "Тест",
        "phone": "+7 (999) 000-00-00",
    })
    return resp.json().get("token")


def tomorrow():
    return (datetime.now(MSK) + timedelta(days=1)).strftime("%Y-%m-%d")


def yesterday():
    return (datetime.now(MSK) - timedelta(days=1)).strftime("%Y-%m-%d")


def today():
    return datetime.now(MSK).strftime("%Y-%m-%d")


# --- Тесты эндпоинта /slots ---

class TestSlots:

    def test_past_date_all_unavailable(self):
        """Для прошедшей даты все слоты должны быть недоступны."""
        resp = client.get(f"/slots?master_id=0&date={yesterday()}")
        assert resp.status_code == 200
        slots = resp.json()
        assert len(slots) > 0
        for slot in slots:
            assert slot["available"] is False

    def test_future_date_has_available_slots(self):
        """Для будущей даты должны быть доступные слоты."""
        resp = client.get(f"/slots?master_id=0&date={tomorrow()}")
        assert resp.status_code == 200
        slots = resp.json()
        available = [s for s in slots if s["available"]]
        assert len(available) > 0

    def test_invalid_date_format(self):
        """Неверный формат даты — ошибка 400."""
        resp = client.get("/slots?master_id=0&date=32-13-2026")
        assert resp.status_code == 400

    def test_negative_master_id(self):
        """Отрицательный master_id — ошибка 400."""
        resp = client.get(f"/slots?master_id=-1&date={tomorrow()}")
        assert resp.status_code == 400

    def test_today_past_slots_unavailable(self):
        """Для сегодняшней даты прошедшие слоты недоступны."""
        # Эмулируем 15:00 МСК — слоты до 15:00 должны быть недоступны
        fake_now = datetime.now(MSK).replace(hour=15, minute=0, second=0)

        with patch("main.datetime") as mock_dt:
            mock_dt.now.return_value = fake_now
            mock_dt.side_effect = lambda *a, **kw: datetime(*a, **kw)

            resp = client.get(f"/slots?master_id=0&date={today()}")
            assert resp.status_code == 200
            slots = resp.json()

            for slot in slots:
                hour = int(slot["time"].split(":")[0])
                minute = int(slot["time"].split(":")[1])
                if hour < 15:
                    assert slot["available"] is False, f"Слот {slot['time']} должен быть недоступен"

    def test_slots_count(self):
        """Слоты генерируются с 9:00 до 19:30, шаг 30 мин — 21 слот."""
        resp = client.get(f"/slots?master_id=0&date={tomorrow()}")
        assert resp.status_code == 200
        slots = resp.json()
        # 9:00, 9:30, 10:00, ..., 18:30, 19:00 = 21 слот
        assert len(slots) == 21


# --- Тесты эндпоинта /bookings (валидация дат) ---

class TestBookingDates:

    def test_booking_past_date_rejected(self):
        """Запись на прошедшую дату — ошибка 400."""
        token = register_and_get_token("past")
        resp = client.post("/bookings", json={
            "service_id": 1,
            "master_id": 0,
            "date": yesterday(),
            "time": "12:00",
            "client_name": "Тест",
            "client_phone": "+7 (999) 000-00-00",
        }, headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 400
        assert "прошедшую" in resp.json()["detail"].lower() or "прошл" in resp.json()["detail"].lower()

    def test_booking_future_date_ok(self):
        """Запись на будущую дату — успех."""
        token = register_and_get_token("future")
        resp = client.post("/bookings", json={
            "service_id": 1,
            "master_id": 0,
            "date": tomorrow(),
            "time": "12:00",
            "client_name": "Тест",
            "client_phone": "+7 (999) 000-00-00",
        }, headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 201

    def test_booking_without_auth_rejected(self):
        """Запись без авторизации — ошибка 401."""
        resp = client.post("/bookings", json={
            "service_id": 1,
            "master_id": 0,
            "date": tomorrow(),
            "time": "12:00",
            "client_name": "Тест",
            "client_phone": "+7 (999) 000-00-00",
        })
        assert resp.status_code == 401

    def test_duplicate_booking_same_time_rejected(self):
        """Две записи одного пользователя на одно время — ошибка 400."""
        token = register_and_get_token("dup")
        booking = {
            "master_id": 0,
            "date": tomorrow(),
            "time": "14:00",
            "client_name": "Тест",
            "client_phone": "+7 (999) 000-00-00",
        }
        headers = {"Authorization": f"Bearer {token}"}

        # Первая запись — ок
        resp1 = client.post("/bookings", json={**booking, "service_id": 1}, headers=headers)
        assert resp1.status_code == 201

        # Вторая запись на то же время, другая услуга — ошибка
        resp2 = client.post("/bookings", json={**booking, "service_id": 2}, headers=headers)
        assert resp2.status_code == 400
        assert "уже есть запись" in resp2.json()["detail"].lower()

    def test_same_master_same_time_rejected(self):
        """Два клиента к одному мастеру на одно время — ошибка 400."""
        token1 = register_and_get_token("client1")
        token2 = register_and_get_token("client2")
        # Уникальная дата для каждого запуска, чтобы не конфликтовать с прошлыми данными
        unique_day = (datetime.now(MSK) + timedelta(days=60)).strftime("%Y-%m-%d")
        booking = {
            "service_id": 1,
            "master_id": 1,
            "date": unique_day,
            "time": "9:00",
            "client_name": "Тест",
            "client_phone": "+7 (999) 000-00-00",
        }

        # Первый клиент — ок
        resp1 = client.post("/bookings", json=booking, headers={"Authorization": f"Bearer {token1}"})
        assert resp1.status_code == 201

        # Второй клиент, тот же мастер и время — ошибка
        resp2 = client.post("/bookings", json=booking, headers={"Authorization": f"Bearer {token2}"})
        assert resp2.status_code == 400
        assert "занято" in resp2.json()["detail"].lower()

    def test_different_time_same_date_ok(self):
        """Два разных времени в один день — можно."""
        token = register_and_get_token("twotime")
        headers = {"Authorization": f"Bearer {token}"}
        base = {
            "service_id": 1,
            "master_id": 0,
            "date": tomorrow(),
            "client_name": "Тест",
            "client_phone": "+7 (999) 000-00-00",
        }

        resp1 = client.post("/bookings", json={**base, "time": "10:00"}, headers=headers)
        assert resp1.status_code == 201

        resp2 = client.post("/bookings", json={**base, "time": "16:00"}, headers=headers)
        assert resp2.status_code == 201
