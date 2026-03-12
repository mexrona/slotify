import { Page } from "@playwright/test";

// Сброс rate limiter перед тестом
export async function resetRateLimit(page: Page) {
  await page.request.post("/api/auth/reset-rate-limit");
}

// Вход в аккаунт через форму
export async function login(page: Page, email: string, password: string) {
  await resetRateLimit(page);
  await page.goto("/login");
  await page.getByPlaceholder("your@email.com").fill(email);
  await page.getByPlaceholder("Минимум 6 символов").fill(password);
  await page.getByRole("button", { name: "Войти" }).click();
  // Ждём переход на главную
  await page.waitForURL("/", { timeout: 10000 });
}

// Генерация уникального email для регистрации
export function uniqueEmail() {
  return `test_${Date.now()}@example.com`;
}

// Дата через 7 дней в формате YYYY-MM-DD
export function futureDate() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().split("T")[0];
}
