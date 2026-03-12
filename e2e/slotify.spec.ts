import { test, expect } from "@playwright/test";
import { login, uniqueEmail } from "./helpers";

// =============================================
// 1. Регистрация и вход
// =============================================
test("Пользователь регистрируется и попадает на главную", async ({ page }) => {
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
