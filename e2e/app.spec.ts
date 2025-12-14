import { test, expect } from '@playwright/test';

test.describe('Windows15 Application', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the app
        await page.goto('/');

        // Wait for the app to be fully loaded (taskbar should be visible)
        await page.waitForSelector('[data-taskbar]', { timeout: 10000 });
    });

    test('should load the desktop with taskbar', async ({ page }) => {
        // Check that the taskbar is present
        const taskbar = page.locator('[data-taskbar]');
        await expect(taskbar).toBeVisible();

        // Check that the start button exists (grid_view icon)
        const startButton = page.locator('[data-taskbar] button').first();
        await expect(startButton).toBeVisible();
    });

    test('should display desktop icons', async ({ page }) => {
        // Wait for desktop icons to load (they load async from IndexedDB)
        await page.waitForSelector('[data-desktop-icon]', { timeout: 10000 });

        // Check that at least one desktop icon exists
        const desktopIcons = page.locator('[data-desktop-icon]');
        await expect(desktopIcons.first()).toBeVisible();
    });

    test('should show time in taskbar', async ({ page }) => {
        // The clock should be showing the current time
        const taskbar = page.locator('[data-taskbar]');
        await expect(taskbar).toContainText(/\d{1,2}:\d{2}/);
    });
});
