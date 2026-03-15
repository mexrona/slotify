import { test, expect } from "@playwright/test";
import { login, uniqueEmail, resetRateLimit, futureDate } from "./helpers";

// =============================================
// 1. Регистрация и вход
// =============================================
test("Пользователь регистрируется и попадает на главную", async ({ page }) => {
  await resetRateLimit(page);
  const email = uniqueEmail();

  await page.goto("/login");

  // Переключаемся на регистрацию
  await page.getByRole("button", { name: "Зарегистрироваться" }).click();

  // Заполняем форму
  await page.getByPlaceholder("your@email.com").fill(email);
  await page.getByPlaceholder("Минимум 6 символов").fill("password123");
  await page.getByPlaceholder("Введите имя").fill("Тест Юзер");
  await page.getByPlaceholder("+7 (___) ___-__-__").fill("+71234567890");

  // Отправляем
  await page.getByRole("button", { name: "Зарегистрироваться" }).click();

  // Ожидаем переход на главную
  await page.waitForURL("/", { timeout: 10000 });
  await expect(page.getByText("Выйти")).toBeVisible();
});

test("Пользователь входит по email и паролю", async ({ page }) => {
  await login(page, "test@example.com", "password123");

  // На главной видим кнопку выхода
  await expect(page.getByText("Выйти")).toBeVisible();
});

// =============================================
// 2. Создание записи
// =============================================
test("Пользователь создаёт запись и видит её в списке", async ({ page }) => {
  await login(page, "test@example.com", "password123");

  // Переходим к услугам и выбираем первую
  await page.goto("/services");
  await page.getByRole("button", { name: "Выбрать" }).first().click();

  // Выбираем «Любой свободный мастер»
  await page.getByText("Любой свободный мастер").click();

  // Ждём загрузки слотов и выбираем первый доступный
  await page.waitForSelector("button:not([disabled])", {
    timeout: 10000,
  });
  // Находим кнопку-слот (формат HH:MM) среди доступных
  const slot = page.locator("button:not([disabled])").filter({ hasText: /^\d{1,2}:\d{2}$/ }).first();
  await slot.click();

  // Нажимаем «Продолжить»
  await page.getByRole("button", { name: "Продолжить" }).click();

  // На странице подтверждения нажимаем «Подтвердить запись»
  await page.getByRole("button", { name: "Подтвердить запись" }).click();

  // Ждём страницу успеха
  await page.waitForURL("**/booking/success", { timeout: 10000 });

  // Переходим в «Мои записи» и проверяем, что запись есть
  await page.goto("/my-bookings");
  await page.waitForSelector(".bg-white.rounded-2xl", { timeout: 10000 });
  const bookings = page.locator(".bg-white.rounded-2xl.shadow-sm.border");
  await expect(bookings.first()).toBeVisible();
});

// =============================================
// 3. Валидация формы регистрации
// =============================================
test("Пользователь не может зарегистрироваться с невалидными данными", async ({ page }) => {
  await resetRateLimit(page);
  await page.goto("/login");
  await page.getByRole("button", { name: "Зарегистрироваться" }).click();

  // Отправляем пустую форму
  await page.getByRole("button", { name: "Зарегистрироваться" }).click();

  // Видим ошибки валидации
  await expect(page.getByText("Введите email")).toBeVisible();
  await expect(page.getByText("Введите пароль")).toBeVisible();
  await expect(page.getByText("Минимум 2 символа")).toBeVisible();

  // Вводим короткий пароль
  await page.getByPlaceholder("Минимум 6 символов").fill("123");
  await page.getByRole("button", { name: "Зарегистрироваться" }).click();
  await expect(page.getByText("Минимум 6 символов")).toBeVisible();

  // Вводим некорректный email (с @ чтобы пройти нативную валидацию браузера)
  await page.getByPlaceholder("your@email.com").fill("not-an@email");
  await page.getByRole("button", { name: "Зарегистрироваться" }).click();
  await expect(page.getByText("Некорректный email")).toBeVisible();

  // Убеждаемся, что мы остались на странице логина
  expect(page.url()).toContain("/login");
});

// =============================================
// 4. Защита без авторизации
// =============================================
test("Неавторизованный пользователь перенаправляется на страницу входа", async ({ page }) => {
  // Очищаем токен
  await page.goto("/login");
  await page.evaluate(() => localStorage.removeItem("slotify_token"));

  // Пытаемся зайти на защищённые страницы
  const protectedPages = ["/", "/services", "/my-bookings", "/booking/master"];

  for (const url of protectedPages) {
    await page.goto(url);
    await page.waitForURL("**/login", { timeout: 10000 });
    expect(page.url()).toContain("/login");
  }
});

// =============================================
// 5. Отмена записи
// =============================================
test("Пользователь отменяет запись и она исчезает из списка", async ({ page }) => {
  await login(page, "test@example.com", "password123");

  // Сначала создаём запись
  await page.goto("/services");
  await page.getByRole("button", { name: "Выбрать" }).first().click();
  await page.getByText("Любой свободный мастер").click();

  // Ждём слоты и выбираем
  const slot = page.locator("button:not([disabled])").filter({ hasText: /^\d{1,2}:\d{2}$/ }).first();
  await slot.waitFor({ timeout: 10000 });
  await slot.click();
  await page.getByRole("button", { name: "Продолжить" }).click();
  await page.getByRole("button", { name: "Подтвердить запись" }).click();
  await page.waitForURL("**/booking/success", { timeout: 10000 });

  // Переходим в «Мои записи»
  await page.goto("/my-bookings");
  await page.waitForSelector("button:has-text('Отменить')", { timeout: 10000 });

  // Считаем записи до отмены
  const countBefore = await page.locator("button:has-text('Отменить')").count();

  // Нажимаем «Отменить» на первой записи
  await page.locator("button:has-text('Отменить')").first().click();

  // Подтверждаем в модалке
  await page.getByRole("button", { name: "Да, отменить" }).click();

  // Ждём обновления списка
  await page.waitForTimeout(1000);

  // Проверяем, что записей стало меньше
  const countAfter = await page.locator("button:has-text('Отменить')").count();
  expect(countAfter).toBeLessThan(countBefore);
});

// =============================================
// 6. Нельзя записаться на занятое время
// =============================================
test("Занятое время отображается как недоступное", async ({ page }) => {
  await login(page, "test@example.com", "password123");

  await page.goto("/services");
  await page.getByRole("button", { name: "Выбрать" }).first().click();
  await page.getByText("Любой свободный мастер").click();

  // Ждём загрузки слотов
  await page.waitForSelector("button.line-through, button:not([disabled])", {
    timeout: 10000,
  });

  // Проверяем, что занятые слоты недоступны для нажатия
  const disabledSlots = page.locator("button[disabled].line-through");
  const count = await disabledSlots.count();

  if (count > 0) {
    // Занятый слот имеет disabled и line-through
    const firstDisabled = disabledSlots.first();
    await expect(firstDisabled).toBeDisabled();
    await expect(firstDisabled).toHaveClass(/line-through/);
  }

  // Кнопка «Продолжить» недоступна, пока не выбрано время
  await expect(page.getByRole("button", { name: "Продолжить" })).toBeDisabled();
});

// =============================================
// 7. Выход из аккаунта
// =============================================
test("Пользователь выходит и возвращается на страницу входа", async ({ page }) => {
  await login(page, "test@example.com", "password123");

  // Нажимаем «Выйти»
  await page.getByText("Выйти").click();

  // Ожидаем переход на логин
  await page.waitForURL("**/login", { timeout: 10000 });

  // Проверяем, что токен удалён
  const token = await page.evaluate(() => localStorage.getItem("slotify_token"));
  expect(token).toBeNull();

  // Обновляем страницу — остаёмся на логине
  await page.reload();
  await page.waitForURL("**/login", { timeout: 10000 });
  expect(page.url()).toContain("/login");
});

// =============================================
// 8. Админ-панель: доступ
// =============================================
test("Обычный пользователь не видит ссылку на админку и не может открыть /admin", async ({ page }) => {
  await login(page, "test@example.com", "password123");

  // Ссылки «Админ-панель» нет в шапке
  await expect(page.getByText("Админ-панель")).not.toBeVisible();

  // Прямой переход на /admin редиректит на главную
  await page.goto("/admin");
  await page.waitForURL("/", { timeout: 10000 });
  expect(page.url()).not.toContain("/admin");
});

// =============================================
// 9. Админ-панель: добавление услуги
// =============================================
test("Админ добавляет услугу через админ-панель", async ({ page }) => {
  await login(page, "testadmin@example.com", "admin123");

  // Видим ссылку «Админ-панель»
  await expect(page.getByText("Админ-панель")).toBeVisible();
  await page.getByText("Админ-панель").click();
  await page.waitForURL("**/admin", { timeout: 10000 });

  // Нажимаем «+ Добавить услугу»
  await page.getByRole("button", { name: "+ Добавить услугу" }).click();

  // Заполняем форму
  const testName = `Тест-услуга-${Date.now()}`;
  await page.locator("label:has-text('Название') + input").fill(testName);
  await page.locator("label:has-text('Категория') + input").fill("Тестовая");
  await page.locator("label:has-text('Длительность') + input").fill("30");
  await page.locator("label:has-text('Цена') + input").fill("1500");
  await page.locator("label:has-text('Описание') + textarea").fill("Описание тестовой услуги");
  await page.locator("label:has-text('URL изображения') + input").fill("https://via.placeholder.com/400x300");

  // Сохраняем
  await page.getByRole("button", { name: "Сохранить" }).click();

  // Услуга появилась в списке
  await expect(page.getByText(testName)).toBeVisible({ timeout: 5000 });
});

// =============================================
// 10. Админ-панель: добавление мастера
// =============================================
test("Админ добавляет мастера через админ-панель", async ({ page }) => {
  await login(page, "testadmin@example.com", "admin123");

  await page.goto("/admin");

  // Переключаемся на вкладку «Мастера»
  await page.getByRole("button", { name: /Мастера/ }).click();

  // Нажимаем «+ Добавить мастера»
  await page.getByRole("button", { name: "+ Добавить мастера" }).click();

  // Заполняем форму
  const testName = `Мастер-${Date.now()}`;
  await page.locator("label:has-text('Имя') + input").fill(testName);
  await page.locator("label:has-text('URL фото') + input").fill("https://via.placeholder.com/150");
  await page.locator("label:has-text('Специализация') + input").fill("Тестовая специализация");
  await page.locator("label:has-text('Рейтинг') + input").fill("4.5");
  await page.locator("label:has-text('Опыт') + input").fill("3 года");
  await page.locator("label:has-text('Примеры работ') + textarea").fill("https://via.placeholder.com/300\nhttps://via.placeholder.com/301");

  // Сохраняем
  await page.getByRole("button", { name: "Сохранить" }).click();

  // Мастер появился в списке
  await expect(page.getByText(testName)).toBeVisible({ timeout: 5000 });
});
