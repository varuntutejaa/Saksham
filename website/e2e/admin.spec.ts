import { test, expect } from "@playwright/test";

test.describe("Admin dashboard", () => {
  test("wrong credentials show an error, not a crash", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByPlaceholder("Phone").fill("0000000000");
    await page.getByPlaceholder("Password").fill("wrongpassword");
    await page.getByRole("button", { name: /Sign in/i }).click();
    await expect(page.getByText(/Invalid credentials|waking up/i)).toBeVisible({ timeout: 45_000 });
  });

  test("real admin login loads the overview with live stats", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByPlaceholder("Phone").fill("9999900000");
    await page.getByPlaceholder("Password").fill("admin123");
    await page.getByRole("button", { name: /Sign in/i }).click();
    await expect(page).toHaveURL(/\/admin$/, { timeout: 45_000 });
    await expect(page.getByText(/Voice sessions/i)).toBeVisible();
    await expect(page.getByText(/Recommendation funnel/i)).toBeVisible();
  });

  test("visiting /admin without a session redirects to login", async ({ page, context }) => {
    await context.clearCookies();
    await page.addInitScript(() => localStorage.clear());
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login/);
  });
});
