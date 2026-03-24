import { Page } from "@playwright/test";

// Сброс rate limiter перед тестом
export async function resetRateLimit(page: Page) {
  await page.request.post("/api/auth/reset-rate-limit");
}

async function ensureUserExists(
  page: Page,
  email: string,
  password: string,
  name = "E2E User",
  phone = "+79990000000"
) {
  const registerRes = await page.request.post("/api/auth/register", {
    data: { email, password, name, phone },
  });

  // 201 = user created, 400 = already exists
  if (registerRes.status() !== 201 && registerRes.status() !== 400) {
    throw new Error(`Не удалось подготовить пользователя ${email}: ${registerRes.status()}`);
  }
}

// Вход в аккаунт через форму
export async function login(page: Page, email: string, password: string) {
  await resetRateLimit(page);
  await ensureUserExists(page, email, password);
  await page.goto("/login");
  await page.getByPlaceholder("your@email.com").fill(email);
  await page.getByPlaceholder("Минимум 6 символов").fill(password);
  await page.getByRole("button", { name: "Войти" }).click();
  // Ждём переход на главную
  await page.waitForURL("/", { timeout: 10000 });
}

export async function loginAdmin(
  page: Page,
  email = process.env.E2E_ADMIN_EMAIL ?? "testadmin@example.com",
  password = process.env.E2E_ADMIN_PASSWORD ?? "admin123"
) {
  await resetRateLimit(page);
  await page.goto("/login");
  await page.getByPlaceholder("your@email.com").fill(email);
  await page.getByPlaceholder("Минимум 6 символов").fill(password);
  await page.getByRole("button", { name: "Войти" }).click();
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
