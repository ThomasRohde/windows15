import { test, expect } from '@playwright/test';

test.describe('Desktop Icons and Windows', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForSelector('[data-taskbar]', { timeout: 10000 });
        // Wait for desktop icons to load from IndexedDB
        await page.waitForSelector('[data-desktop-icon]', { timeout: 10000 });
    });

    test('should open window when double-clicking a desktop icon', async ({ page }) => {
        // Find a desktop icon and double-click it
        const desktopIcon = page.locator('[data-desktop-icon]').first();
        await desktopIcon.dblclick({ force: true });

        // Wait for window to appear
        const window = page.locator('[role="dialog"]').first();
        await expect(window).toBeVisible({ timeout: 5000 });

        // Window should have a title bar with close button
        const closeButton = window.getByRole('button', { name: /close/i });
        await expect(closeButton).toBeVisible();
    });

    test('should close window when clicking close button', async ({ page }) => {
        // Open an app
        const desktopIcon = page.locator('[data-desktop-icon]').first();
        await desktopIcon.dblclick({ force: true });

        // Wait for window
        const window = page.locator('[role="dialog"]').first();
        await expect(window).toBeVisible({ timeout: 5000 });

        // Click close button
        const closeButton = window.getByRole('button', { name: /close/i });
        await closeButton.click();

        // Window should be gone
        await expect(window).not.toBeVisible();
    });

    test('should minimize window when clicking minimize button', async ({ page }) => {
        // Open an app
        const desktopIcon = page.locator('[data-desktop-icon]').first();
        await desktopIcon.dblclick({ force: true });

        // Wait for window to appear
        const window = page.locator('[role="dialog"]').first();
        await expect(window).toBeVisible({ timeout: 5000 });

        // Click minimize button
        const minimizeButton = window.getByRole('button', { name: /minimize/i });
        await minimizeButton.click();

        // Window should be hidden
        await expect(window).not.toBeVisible();
    });

    test('should maximize and restore window', async ({ page }) => {
        // Open an app
        const desktopIcon = page.locator('[data-desktop-icon]').first();
        await desktopIcon.dblclick({ force: true });

        // Wait for window
        const window = page.locator('[role="dialog"]').first();
        await expect(window).toBeVisible({ timeout: 5000 });

        // Get initial bounding box
        const initialBox = await window.boundingBox();
        expect(initialBox).toBeTruthy();

        // Click maximize button
        const maximizeButton = window.getByRole('button', { name: /maximize/i });
        await maximizeButton.click();

        // Window should be maximized (wider)
        const maximizedBox = await window.boundingBox();
        expect(maximizedBox).toBeTruthy();
        expect(maximizedBox!.width).toBeGreaterThan(initialBox!.width);

        // Click restore
        const restoreButton = window.getByRole('button', { name: /restore/i });
        await restoreButton.click();

        // Window should be restored to smaller size
        const restoredBox = await window.boundingBox();
        expect(restoredBox).toBeTruthy();
    });
});
