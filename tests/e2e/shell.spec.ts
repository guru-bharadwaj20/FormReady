import { expect, test } from '@playwright/test';

test.describe('app shell', () => {
  test('navigates between routes and switches language', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/FormReady/);
    await page
      .getByRole('link', { name: /spec registry/i })
      .first()
      .click();
    await expect(page).toHaveURL(/#\/specs/);
    await expect(page.locator('details').first()).toBeVisible();

    await page.getByRole('combobox', { name: /language|भाषा/i }).selectOption('hi');
    await expect(page.locator('html')).toHaveAttribute('lang', 'hi');
    await expect(page.locator('h1')).not.toHaveText('');
  });

  test('has no console errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/#/about');
    await expect(page.locator('h1')).toContainText(/FormReady/);
    expect(errors).toEqual([]);
  });
});
