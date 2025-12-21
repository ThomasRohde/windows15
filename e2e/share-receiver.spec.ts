import { test, expect } from '@playwright/test';

/**
 * E2E tests for iOS Share Sheet deep link integration (F262)
 *
 * Tests the complete flow of receiving a share link from iOS Shortcut,
 * processing it, and displaying the item in the Handoff app.
 *
 * NOTE: These tests require a running dev server (npm run dev).
 * They test the full integration including ShareReceiver component,
 * useHandoff hook, database persistence, and UI updates.
 */
test.describe('Share Receiver - iOS Deep Link Integration', () => {
    test.beforeEach(async ({ page }) => {
        // Clear localStorage to reset nonce buffer before each test
        await page.goto('/');
        await page.evaluate(() => {
            localStorage.removeItem('windows15_share_nonces');
            localStorage.removeItem('windows15_device_id');
        });
        // Wait for initial load
        await page.waitForSelector('[data-taskbar]', { timeout: 15000 });
    });

    test('should process URL share link and add item to Handoff inbox', async ({ page }) => {
        // Navigate with share link parameters
        await page.goto(
            '/?handoff=1&nonce=test123456789&kind=url&target=https://example.com&text=Check%20this%20out&targetCategory=any&open=handoff'
        );

        // Wait for app to load
        await page.waitForSelector('[data-taskbar]', { timeout: 10000 });

        // Wait a moment for ShareReceiver to process
        await page.waitForTimeout(1000);

        // Check URL has been cleaned
        const url = page.url();
        expect(url).not.toContain('handoff=');
        expect(url).not.toContain('nonce=');

        // Check that Handoff app window is open (because open=handoff was set)
        const handoffWindow = page.locator('[data-app-id="handoff"]');
        await expect(handoffWindow).toBeVisible({ timeout: 5000 });

        // Check that the item appears in the Handoff app
        // The item should be visible in the inbox
        const handoffContent = handoffWindow.locator('[role="main"]');
        await expect(handoffContent).toContainText('example.com', { timeout: 5000 });
    });

    test('should process text share link and add item to Handoff inbox', async ({ page }) => {
        // Navigate with text share link
        await page.goto('/?handoff=1&nonce=test234567890&kind=text&text=Hello%20from%20iOS&open=handoff');

        // Wait for app to load
        await page.waitForSelector('[data-taskbar]', { timeout: 10000 });

        // Wait a moment for processing
        await page.waitForTimeout(1000);

        // Check URL has been cleaned
        const url = page.url();
        expect(url).not.toContain('handoff=');

        // Check that Handoff app window is open
        const handoffWindow = page.locator('[data-app-id="handoff"]');
        await expect(handoffWindow).toBeVisible({ timeout: 5000 });

        // Check that the text appears
        const handoffContent = handoffWindow.locator('[role="main"]');
        await expect(handoffContent).toContainText('Hello from iOS', { timeout: 5000 });
    });

    test('should show success notification after processing share link', async ({ page }) => {
        // Navigate with share link
        await page.goto('/?handoff=1&nonce=test345678901&kind=url&target=https://github.com&source=ChatGPT%20iOS');

        // Wait for app to load
        await page.waitForSelector('[data-taskbar]', { timeout: 10000 });

        // Check for success notification
        // The notification should mention the source
        await expect(page.locator('[role="status"]')).toContainText('Sent to Handoff', { timeout: 5000 });
    });

    test('should not create duplicate on page refresh', async ({ page }) => {
        // First visit
        await page.goto('/?handoff=1&nonce=duplicate123&kind=text&text=First');

        // Wait for app to load and process
        await page.waitForSelector('[data-taskbar]', { timeout: 10000 });
        await page.waitForTimeout(1000);

        // Open Handoff to count items
        await page.click('[data-app-id="handoff"][data-desktop-icon]');
        await page.waitForTimeout(500);

        const handoffWindow = page.locator('[data-app-id="handoff"]').first();
        await expect(handoffWindow).toBeVisible();

        // Note the initial content (we just need to check it was processed)
        const _initialContent = await handoffWindow.locator('[role="main"]').textContent();

        // Reload with SAME nonce
        await page.goto('/?handoff=1&nonce=duplicate123&kind=text&text=Second');
        await page.waitForSelector('[data-taskbar]', { timeout: 10000 });
        await page.waitForTimeout(1000);

        // Open Handoff again
        const taskbarHandoffIcon = page.locator('[data-app-id="handoff"]').first();
        if (!(await taskbarHandoffIcon.isVisible())) {
            await page.click('[data-app-id="handoff"][data-desktop-icon]');
        }

        const handoffWindow2 = page.locator('[data-app-id="handoff"]').first();
        await expect(handoffWindow2).toBeVisible();

        // Check that we only have "First" not "Second"
        const finalContent = await handoffWindow2.locator('[role="main"]').textContent();
        expect(finalContent).toContain('First');
        expect(finalContent).not.toContain('Second');
    });

    test('should infer kind=url when only target is provided', async ({ page }) => {
        // Navigate with only target (no explicit kind)
        await page.goto('/?handoff=1&nonce=infer123&target=https://nodejs.org&open=handoff');

        await page.waitForSelector('[data-taskbar]', { timeout: 10000 });
        await page.waitForTimeout(1000);

        // Check Handoff has the URL
        const handoffWindow = page.locator('[data-app-id="handoff"]');
        await expect(handoffWindow).toBeVisible();
        await expect(handoffWindow).toContainText('nodejs.org', { timeout: 5000 });
    });

    test('should handle targetCategory parameter', async ({ page }) => {
        // Share with work category
        await page.goto(
            '/?handoff=1&nonce=work123&kind=url&target=https://work.example.com&targetCategory=work&open=handoff'
        );

        await page.waitForSelector('[data-taskbar]', { timeout: 10000 });
        await page.waitForTimeout(1000);

        // Handoff should show the item
        const handoffWindow = page.locator('[data-app-id="handoff"]');
        await expect(handoffWindow).toBeVisible();
        await expect(handoffWindow).toContainText('work.example.com', { timeout: 5000 });
    });

    test('should handle optional title parameter', async ({ page }) => {
        // Share with title
        await page.goto(
            '/?handoff=1&nonce=title123&kind=url&target=https://example.com&title=Example%20Website&open=handoff'
        );

        await page.waitForSelector('[data-taskbar]', { timeout: 10000 });
        await page.waitForTimeout(1000);

        // Check that title or URL appears
        const handoffWindow = page.locator('[data-app-id="handoff"]');
        await expect(handoffWindow).toBeVisible();

        // Either the title or the domain should be visible
        const content = await handoffWindow.locator('[role="main"]').textContent();
        expect(content).toMatch(/Example Website|example\.com/);
    });

    test('should not process when handoff parameter is missing', async ({ page }) => {
        // Navigate WITHOUT handoff parameter
        await page.goto('/?nonce=missing123&kind=text&text=test');

        await page.waitForSelector('[data-taskbar]', { timeout: 10000 });
        await page.waitForTimeout(500);

        // Handoff app should NOT auto-open
        const handoffWindow = page.locator('[data-app-id="handoff"]').first();
        // Check if it exists and is visible - should not be auto-opened
        const isVisible = await handoffWindow.isVisible().catch(() => false);
        expect(isVisible).toBe(false);
    });

    test('should reject invalid nonce (too short)', async ({ page }) => {
        // Navigate with invalid nonce
        await page.goto('/?handoff=1&nonce=short&kind=text&text=test');

        await page.waitForSelector('[data-taskbar]', { timeout: 10000 });
        await page.waitForTimeout(1000);

        // Handoff should NOT auto-open
        const handoffWindow = page.locator('[data-app-id="handoff"]').first();
        const isVisible = await handoffWindow.isVisible().catch(() => false);
        expect(isVisible).toBe(false);
    });

    test('should reject invalid URL format', async ({ page }) => {
        // Navigate with invalid URL
        await page.goto('/?handoff=1&nonce=invalid123456&kind=url&target=not-a-url');

        await page.waitForSelector('[data-taskbar]', { timeout: 10000 });
        await page.waitForTimeout(1000);

        // Handoff should NOT auto-open
        const handoffWindow = page.locator('[data-app-id="handoff"]').first();
        const isVisible = await handoffWindow.isVisible().catch(() => false);
        expect(isVisible).toBe(false);
    });

    test('should clean URL parameters after processing', async ({ page }) => {
        await page.goto('/?handoff=1&nonce=cleanup123&kind=text&text=test&foo=bar&open=handoff');

        await page.waitForSelector('[data-taskbar]', { timeout: 10000 });
        await page.waitForTimeout(1000);

        // Check that handoff params are removed but other params remain
        const url = page.url();
        expect(url).not.toContain('handoff=');
        expect(url).not.toContain('nonce=');
        expect(url).not.toContain('kind=');
        expect(url).not.toContain('text=');
        expect(url).not.toContain('open=');
        // Non-share param should remain
        expect(url).toContain('foo=bar');
    });
});
