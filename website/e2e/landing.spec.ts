import { test, expect } from "@playwright/test";

test.describe("Landing page", () => {
  test("loads and shows the core pitch", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Say your skill/i })).toBeVisible();
    await expect(page.getByRole("link", { name: "Log in" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Try the app" })).toBeVisible();
    // The public "Admin dashboard" link was deliberately removed.
    await expect(page.getByRole("link", { name: "Admin dashboard" })).toHaveCount(0);
  });

  test("skill mapper widget returns a real match from the live backend", async ({ page }) => {
    await page.goto("/#skill-mapper");
    const input = page.getByPlaceholder("Describe a skill…");
    await input.fill("main mitti ke bartan banata hoon");
    await page.getByRole("button", { name: /Map to NSQF/i }).click();
    // The backend can cold-start (Render free tier) — allow it real time.
    await expect(page.getByText(/Potter|Kumhar|pottery/i)).toBeVisible({ timeout: 45_000 });
  });

  test("PM-AJAY programme list loads real data", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/PM-AJAY/i).first()).toBeVisible({ timeout: 45_000 });
  });

  test("legal pages exist and link from the footer", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Privacy Policy" }).click();
    await expect(page.getByRole("heading", { name: "Privacy Policy" })).toBeVisible();
    await page.goBack();
    await page.getByRole("link", { name: "Terms of Service" }).click();
    await expect(page.getByRole("heading", { name: "Terms of Service" })).toBeVisible();
  });
});
