import { test, expect } from '@playwright/test';

/**
 * Scaffold smoke tests: app loads, screens visible, no crash.
 * Tag: @smoke — run with --grep "@smoke"
 */
test.describe('@smoke', () => {
  test('app loads and root is visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#app')).toBeVisible({ timeout: 15_000 });
  });

  test('loading completes and main content appears', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#app')).toBeVisible({ timeout: 15_000 });
    await page.waitForLoadState('networkidle').catch(() => {});
    // Start screen: DOM with h1 + Play button (no canvas). Game screen: Pixi canvas.
    await expect(
      page
        .locator('#app canvas:not([class*="tp-"])')
        .or(page.locator('#app h1'))
        .first(),
    ).toBeVisible({ timeout: 15_000 });
  });

  test('no unhandled console errors during load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!text.includes('ResizeObserver') && !text.includes('favicon')) {
          errors.push(text);
        }
      }
    });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(4000);
    expect(errors).toEqual([]);
  });
});
