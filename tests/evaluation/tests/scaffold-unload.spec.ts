import { test, expect } from '@playwright/test';

/**
 * Tests relevant to "unload bundles" scaffold modification.
 * Tag: @unload-bundles — run with --grep "@unload-bundles"
 *
 * Runs the REAL app in a real browser. Uses window.__scaffold__.coordinator
 * (exposed in dev only) to assert loaded bundles and to call unloadBundle.
 * These tests FAIL until unloadBundle is implemented in the coordinator and loaders.
 */
test.describe('@unload-bundles', () => {
  test('running game: after unloadBundle(name), bundle is no longer in getLoadedBundles()', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    await expect
      .poll(
        async () => {
          return await page.evaluate(() => (window as unknown as { __scaffold__?: { coordinator: { getLoadedBundles: () => string[] } } }).__scaffold__?.coordinator != null);
        },
        { timeout: 15000 }
      )
      .toBe(true);

    const getLoadedBundles = () =>
      page.evaluate(() => (window as unknown as { __scaffold__: { coordinator: { getLoadedBundles: () => string[] } } }).__scaffold__.coordinator.getLoadedBundles());

    const loadedBefore = await getLoadedBundles();
    expect(loadedBefore.length).toBeGreaterThan(0);
    const bundleToUnload = loadedBefore[0];

    await page.evaluate(
      (name) => (window as unknown as { __scaffold__: { coordinator: { unloadBundle: (n: string) => Promise<void> } } }).__scaffold__.coordinator.unloadBundle(name),
      bundleToUnload
    );

    const loadedAfter = await getLoadedBundles();
    expect(loadedAfter).not.toContain(bundleToUnload);
  });

  test('load app then reload without crash', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await expect(page.locator('#app')).toBeVisible({ timeout: 5000 });
  });

  test('navigate to start and wait — no crash', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(5000);
    const app = page.locator('#app');
    await expect(app).toBeVisible();
  });

  test('load → reload cycle 3 times without crash', async ({ page }) => {
    for (let i = 0; i < 3; i++) {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1500);
      await page.reload();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);
    }
    await expect(page.locator('#app')).toBeVisible({ timeout: 5000 });
  });

  /**
   * Memory behavior (no unload): play through all 12 levels then measure heap.
   * Assets are never unloaded, so we expect memory to grow as the game loads each level.
   * Uses performance.memory.usedJSHeapSize (Chromium-only).
   * SimpleGame1: Start → Play → Game (Flip x12) → Results.
   */
  test('memory behavior: heap after playing all 12 levels (no unload, baseline)', async ({ page }) => {
    test.setTimeout(120_000); // 2 min for load + 12 levels

    const getHeapMb = () =>
      page.evaluate(() => {
        const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
        return mem ? mem.usedJSHeapSize / (1024 * 1024) : 0;
      });

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Start screen: click Play
    await page.getByRole('button', { name: 'Play' }).click();
    await page.waitForTimeout(3000); // load atlas, core, audio and goto game

    // Game screen: Pixi canvas is viewport-sized; Tweakpane uses 64x64 canvases. Find by size.
    let pixiCanvasIndex = -1;
    await expect
      .poll(
        async () => {
          pixiCanvasIndex = await page.evaluate(() => {
            const canvases = document.querySelectorAll('#app canvas');
            for (let i = 0; i < canvases.length; i++) {
              if ((canvases[i] as HTMLCanvasElement).width > 200) return i;
            }
            return -1;
          });
          return pixiCanvasIndex;
        },
        { timeout: 20000, intervals: [500, 1000, 1000] }
      )
      .toBeGreaterThanOrEqual(0);
    const canvas = page.locator('#app canvas').nth(pixiCanvasIndex);
    await expect(canvas).toBeVisible();
    await page.waitForTimeout(1000);

    const heapAtGameStart = await getHeapMb();
    if (heapAtGameStart === 0) {
      test.skip(true, 'performance.memory not available (non-Chromium or disabled)');
      return;
    }

    // Flip button is at center, 80px from bottom in gameController
    const flipButtonYOffsetFromBottom = 80;
    for (let level = 0; level < 12; level++) {
      const box = await canvas.boundingBox();
      if (!box) throw new Error('Canvas not visible');
      await canvas.click({
        position: {
          x: box.width / 2,
          y: box.height - flipButtonYOffsetFromBottom,
        },
      });
      await page.waitForTimeout(400); // let state/UI update between levels
    }

    // Results screen
    await expect(
      page.getByText(/You finished all 12 levels!|Chapter Complete!/)
    ).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000);

    const heapAfterAllLevels = await getHeapMb();
    const growthMb = heapAfterAllLevels - heapAtGameStart;
    const growthPercent = heapAtGameStart > 0 ? (growthMb / heapAtGameStart) * 100 : 0;

    // Without unload we expect memory to grow. Only fail on catastrophic growth.
    const maxGrowthMb = 200;
    expect(
      growthMb,
      `Heap after 12 levels: ${heapAfterAllLevels.toFixed(1)} MB (at game start: ${heapAtGameStart.toFixed(1)} MB, +${growthMb.toFixed(1)} MB / +${growthPercent.toFixed(0)}%)`
    ).toBeLessThan(maxGrowthMb);
  });
});
