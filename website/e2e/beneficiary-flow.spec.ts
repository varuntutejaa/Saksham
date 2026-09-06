import { test, expect } from "@playwright/test";

test.describe("Beneficiary guest flow", () => {
  test("welcome -> language -> guest reaches the app home", async ({ page }) => {
    await page.goto("/welcome");
    await page.getByRole("link", { name: /Get Started/i }).click();
    await expect(page).toHaveURL(/\/language/);

    await page.getByText("English", { exact: true }).first().click();
    await expect(page).toHaveURL(/\/auth/);

    await page.getByRole("link", { name: /Continue without an account/i }).click();
    await expect(page).toHaveURL(/\/app$/);
    await expect(page.getByText(/Tell us your skill/i)).toBeVisible();
  });

  test("/app redirects to /welcome when no language is set", async ({ page, context }) => {
    await context.clearCookies();
    await page.addInitScript(() => localStorage.clear());
    await page.goto("/app");
    await expect(page).toHaveURL(/\/welcome/);
  });

  test("the AI understanding pipeline returns a real NSQF match end-to-end", async ({ page }) => {
    // This exercises the real Gemini-backed pipeline (app/api/understand),
    // not a mock — it also mirrors one session to the real backend, same
    // as a genuine user interaction would. Needs a language set first, or
    // /app/speak correctly redirects to /welcome (this is not a mock of
    // the app's own storage format — it's the same key SiteStoreProvider
    // reads on mount).
    await page.addInitScript(() => {
      localStorage.setItem("saksham.web.profile.v1", JSON.stringify({ language: "en" }));
    });
    await page.goto("/app/speak");
    await page.getByRole("button", { name: /Type instead|लिखकर बताएं/i }).click();
    const textarea = page.locator("textarea");
    await textarea.fill("I make clay pots and terracotta items");
    await page.getByRole("button", { name: /Send|भेजें/i }).click();
    await expect(page.getByText(/Potter|Kumhar|pottery/i)).toBeVisible({ timeout: 45_000 });
  });
});
