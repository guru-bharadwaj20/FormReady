import { expect, test } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const photo = fileURLToPath(new URL('../fixtures/portrait-large.jpg', import.meta.url));

test.describe('fix flow', () => {
  test('oversized photo is inspected, fixed and downloadable', async ({ page }) => {
    await page.goto('/#/fix');
    await page.getByTestId('portal-search').fill('cuet');
    await page.getByTestId('portal-nta/cuet-ug-2026').click();
    await page.getByTestId('asset-photo').click();
    await page.getByTestId('file-input').setInputFiles(photo);

    const before = page.getByTestId('before-verdict');
    await expect(before).toHaveAttribute('data-compliant', 'false', { timeout: 30_000 });

    await page.getByTestId('fix').click();
    const after = page.getByTestId('after-verdict');
    await expect(after).toHaveAttribute('data-compliant', 'true', { timeout: 60_000 });
    await expect(page.getByTestId('filename')).toContainText(/\.jpg$/);

    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('download').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.jpg$/);
  });

  test('search with no hits offers a request link', async ({ page }) => {
    await page.goto('/#/fix');
    await page.getByTestId('portal-search').fill('zzzz-no-such-portal');
    await expect(page.getByRole('link', { name: /request/i })).toBeVisible();
  });
});
