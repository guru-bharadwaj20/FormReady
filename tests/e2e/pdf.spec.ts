import { expect, test } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const pdf = fileURLToPath(new URL('../fixtures/two-pages.pdf', import.meta.url));

test.describe('pdf tools', () => {
  test('compress produces a result within the limit', async ({ page }) => {
    await page.goto('/#/pdf');
    await page.getByTestId('pdf-tab-compress').click();
    await page.getByTestId('file-input').setInputFiles(pdf);
    await page.getByTestId('pdf-run').click();
    await expect(page.getByTestId('pdf-result')).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId('pdf-result')).toContainText('500kb.pdf');
  });

  test('split yields one part per page', async ({ page }) => {
    await page.goto('/#/pdf');
    await page.getByTestId('pdf-tab-split').click();
    await page.getByTestId('file-input').setInputFiles(pdf);
    await page.getByTestId('pdf-run').click();
    await expect(page.locator('.parts li')).toHaveCount(2, { timeout: 60_000 });
  });
});
