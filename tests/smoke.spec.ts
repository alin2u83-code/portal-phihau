import { test, expect } from '@playwright/test';

const TEST_EMAIL = process.env.TEST_EMAIL!;
const TEST_PASSWORD = process.env.TEST_PASSWORD!;

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('input[name="email"]');
  });

  test('afișează formularul de login', async ({ page }) => {
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="parola"]')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Intră în cont' })).toBeVisible();
  });

  test('validare câmpuri goale', async ({ page }) => {
    // Disable HTML5 required validation so React handler runs
    await page.evaluate(() => {
      (document.querySelector('form') as HTMLFormElement).noValidate = true;
    });
    await page.getByRole('button', { name: 'Intră în cont' }).click();
    await expect(page.getByText('Email-ul sau username-ul este obligatoriu.')).toBeVisible();
  });

  test('validare parolă lipsă', async ({ page }) => {
    await page.locator('input[name="email"]').fill('test@example.com');
    await page.evaluate(() => {
      (document.querySelector('form') as HTMLFormElement).noValidate = true;
    });
    await page.getByRole('button', { name: 'Intră în cont' }).click();
    await expect(page.getByText('Parola este obligatorie.')).toBeVisible();
  });

  test('link "Ai uitat parola?" funcționează', async ({ page }) => {
    await page.getByRole('button', { name: /uitat parola/i }).click();
    await expect(page.locator('input[placeholder*="email"]').first()).toBeVisible();
  });

  test('login cu credentiale valide', async ({ page }) => {
    await page.locator('input[name="email"]').fill(TEST_EMAIL);
    await page.locator('input[name="parola"]').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Intră în cont' }).click();
    // After login: expect dashboard or role selector to appear
    await expect(page.locator('body')).not.toContainText('Intră în cont', { timeout: 15_000 });
  });
});
