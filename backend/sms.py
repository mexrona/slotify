# =============================================
# Модуль отправки SMS через SMS.ru
# Не блокирует основное действие при ошибках
# =============================================

import json
import logging
import os
import urllib.request
import urllib.parse
import urllib.error

# Настраиваем логгер
logger = logging.getLogger("sms")
logger.setLevel(logging.DEBUG)

# Если ещё нет обработчика — добавляем вывод в консоль
if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("[SMS] %(asctime)s %(levelname)s: %(message)s"))
    logger.addHandler(handler)

# Базовый URL API SMS.ru
SMS_RU_URL = "https://sms.ru/sms/send"
SMS_RU_BALANCE_URL = "https://sms.ru/my/balance"


def get_api_key() -> str:
    """Возвращает API-ключ SMS.ru из переменных окружения."""
    return os.getenv("SMS_RU_API_KEY", "")


def check_balance() -> None:
    """Проверяет баланс SMS.ru и логирует результат.
    Вызывается при старте сервера.
    """
    api_key = get_api_key()
    if not api_key:
        logger.warning("SMS_RU_API_KEY не задан — SMS отправляться не будут")
        return

    params = urllib.parse.urlencode({"api_id": api_key, "json": 1})
    url = f"{SMS_RU_BALANCE_URL}?{params}"

    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=10) as response:
            body = response.read().decode("utf-8")
            data = json.loads(body)
            logger.info("Ответ SMS.ru (баланс): %s", body[:300])

            if data.get("status") == "OK":
                balance = data.get("balance", "?")
                logger.info("Баланс SMS.ru: %s руб.", balance)
            else:
                logger.error("Не удалось получить баланс: %s", data.get("status_text", "Неизвестная ошибка"))
    except Exception as e:
        logger.error("Ошибка при проверке баланса SMS.ru: %s", e)


def send_sms(phone: str, message: str) -> bool:
    """Отправляет SMS через SMS.ru.

    Возвращает True при успехе, False при ошибке.
    Никогда не выбрасывает исключение — все ошибки логируются.
    """
    api_key = get_api_key()

    if not api_key:
        logger.warning("SMS_RU_API_KEY не задан — SMS не отправлена")
        return False

    params = urllib.parse.urlencode({
        "api_id": api_key,
        "to": phone,
        "msg": message,
        "json": 1,
    })

    url = f"{SMS_RU_URL}?{params}"

    logger.info("Отправка SMS на %s: %s", phone, message[:80])

    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=10) as response:
            body = response.read().decode("utf-8")
            data = json.loads(body)
            logger.info("Ответ SMS.ru: %s", body[:300])

            if data.get("status") == "OK":
                logger.info("SMS успешно отправлена на %s", phone)
                return True
            else:
                logger.error("SMS.ru вернул ошибку: %s", data.get("status_text", "Неизвестная ошибка"))
                return False

    except urllib.error.URLError as e:
        logger.error("Ошибка сети при отправке SMS: %s", e)
        return False
    except json.JSONDecodeError as e:
        logger.error("Невалидный JSON от SMS.ru: %s", e)
        return False
    except Exception as e:
        logger.error("Непредвиденная ошибка при отправке SMS: %s", e)
        return False


# =============================================
# Шаблоны сообщений (до 70 символов кириллицей)
# =============================================

def send_booking_confirmation(phone: str, service_name: str, date: str, time: str, master_name: str | None) -> bool:
    """SMS-подтверждение записи."""
    master = master_name or "любой"
    message = f"Slotify: {service_name}, {date} {time}, м. {master}"
    return send_sms(phone, message)


def send_booking_cancelled(phone: str, service_name: str, date: str, time: str) -> bool:
    """SMS об отмене записи."""
    message = f"Slotify: отмена {service_name}, {date} {time}"
    return send_sms(phone, message)


def send_booking_reminder(phone: str, service_name: str, date: str, time: str, master_name: str | None) -> bool:
    """SMS-напоминание о записи за день."""
    master = master_name or "любой"
    message = f"Slotify: напоминаем, {date} {time}, {service_name}, м. {master}"
    return send_sms(phone, message)
