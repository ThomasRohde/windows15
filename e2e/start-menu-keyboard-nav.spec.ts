import { test, expect } from '@playwright/test';

test.describe('Start Menu Keyboard Navigation', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:5000');
        await page.waitForLoadState('domcontentloaded', { timeout: 30000 });
        // Wait for the app to load
        await page.waitForSelector('[data-testid="start-menu-button"]', { timeout: 30000, state: 'visible' });
    });

    test('should navigate search results with arrow keys', async ({ page }) => {
        // Open Start Menu
        await page.click('[data-testid="start-menu-button"]');
        await page.waitForSelector('[data-start-menu]', { state: 'visible', timeout: 10000 });

        // Type a search query that will return multiple results
        const searchInput = page.locator('[aria-label="Search apps"]');
        await searchInput.fill('a');
        await page.waitForTimeout(300); // Wait for search results to update

        // Check that we have search results
        const searchResults = page.locator('[aria-label="Search results"] button[role="menuitem"]');
        const resultCount = await searchResults.count();
        expect(resultCount).toBeGreaterThan(1);

        // First result should have focus indicator
        const firstResult = searchResults.nth(0);
        await expect(firstResult).toHaveClass(/ring-2/);

        // Press ArrowDown
        await searchInput.press('ArrowDown');
        await page.waitForTimeout(100);

        // Second result should now have focus indicator
        const secondResult = searchResults.nth(1);
        await expect(secondResult).toHaveClass(/ring-2/);
        await expect(firstResult).not.toHaveClass(/ring-2/);

        // Press ArrowUp to go back
        await searchInput.press('ArrowUp');
        await page.waitForTimeout(100);

        // First result should have focus indicator again
        await expect(firstResult).toHaveClass(/ring-2/);
        await expect(secondResult).not.toHaveClass(/ring-2/);
    });

    test('should wrap navigation from last to first result', async ({ page }) => {
        // Open Start Menu
        await page.click('[data-testid="start-menu-button"]');
        await page.waitForSelector('[data-start-menu]', { state: 'visible', timeout: 10000 });

        // Type a search query
        const searchInput = page.locator('[aria-label="Search apps"]');
        await searchInput.fill('a');
        await page.waitForTimeout(300);

        // Get result count
        const searchResults = page.locator('[aria-label="Search results"] button[role="menuitem"]');
        const resultCount = await searchResults.count();
        expect(resultCount).toBeGreaterThan(1);

        // Navigate to last result by pressing ArrowDown resultCount-1 times
        for (let i = 0; i < resultCount - 1; i++) {
            await searchInput.press('ArrowDown');
            await page.waitForTimeout(50);
        }

        // Last result should have focus
        const lastResult = searchResults.nth(resultCount - 1);
        await expect(lastResult).toHaveClass(/ring-2/);

        // Press ArrowDown once more to wrap to first
        await searchInput.press('ArrowDown');
        await page.waitForTimeout(100);

        // First result should have focus again
        const firstResult = searchResults.nth(0);
        await expect(firstResult).toHaveClass(/ring-2/);
    });

    test('should wrap navigation from first to last result with ArrowUp', async ({ page }) => {
        // Open Start Menu
        await page.click('[data-testid="start-menu-button"]');
        await page.waitForSelector('[data-start-menu]', { state: 'visible', timeout: 10000 });

        // Type a search query
        const searchInput = page.locator('[aria-label="Search apps"]');
        await searchInput.fill('a');
        await page.waitForTimeout(300);

        // Get result count
        const searchResults = page.locator('[aria-label="Search results"] button[role="menuitem"]');
        const resultCount = await searchResults.count();
        expect(resultCount).toBeGreaterThan(1);

        // First result should already have focus
        const firstResult = searchResults.nth(0);
        await expect(firstResult).toHaveClass(/ring-2/);

        // Press ArrowUp to wrap to last result
        await searchInput.press('ArrowUp');
        await page.waitForTimeout(100);

        // Last result should have focus
        const lastResult = searchResults.nth(resultCount - 1);
        await expect(lastResult).toHaveClass(/ring-2/);
    });

    test('should open selected result with Enter key', async ({ page }) => {
        // Open Start Menu
        await page.click('[data-testid="start-menu-button"]');
        await page.waitForSelector('[data-start-menu]', { state: 'visible', timeout: 10000 });

        // Type a search query for Calculator
        const searchInput = page.locator('[aria-label="Search apps"]');
        await searchInput.fill('calc');
        await page.waitForTimeout(300);

        // First result should be Calculator
        const firstResult = page.locator('[aria-label="Search results"] button[role="menuitem"]').first();
        await expect(firstResult).toContainText('Calculator');

        // Press Enter to open
        await searchInput.press('Enter');
        await page.waitForTimeout(500);

        // Calculator window should be open
        const calculatorWindow = page.locator('[data-app-id="calculator"]');
        await expect(calculatorWindow).toBeVisible();

        // Start menu should be closed
        await expect(page.locator('[data-start-menu]')).not.toBeVisible();
    });

    test('should reset selection when search query changes', async ({ page }) => {
        // Open Start Menu
        await page.click('[data-testid="start-menu-button"]');
        await page.waitForSelector('[data-start-menu]', { state: 'visible', timeout: 10000 });

        // Type initial search
        const searchInput = page.locator('[aria-label="Search apps"]');
        await searchInput.fill('a');
        await page.waitForTimeout(300);

        // Navigate to second result
        await searchInput.press('ArrowDown');
        await page.waitForTimeout(100);

        const searchResults = page.locator('[aria-label="Search results"] button[role="menuitem"]');
        const secondResult = searchResults.nth(1);
        await expect(secondResult).toHaveClass(/ring-2/);

        // Change search query
        await searchInput.fill('b');
        await page.waitForTimeout(300);

        // Selection should reset to first result
        const newSearchResults = page.locator('[aria-label="Search results"] button[role="menuitem"]');
        const newFirstResult = newSearchResults.nth(0);
        await expect(newFirstResult).toHaveClass(/ring-2/);
    });

    test('should not navigate when there are no search results', async ({ page }) => {
        // Open Start Menu
        await page.click('[data-testid="start-menu-button"]');
        await page.waitForSelector('[data-start-menu]', { state: 'visible', timeout: 10000 });

        // Type a search query that returns no results
        const searchInput = page.locator('[aria-label="Search apps"]');
        await searchInput.fill('xyznonexistentapp123');
        await page.waitForTimeout(300);

        // No search results should be visible
        const searchResults = page.locator('[aria-label="Search results"] button[role="menuitem"]');
        await expect(searchResults).toHaveCount(0);

        // Pressing arrow keys should not cause errors
        await searchInput.press('ArrowDown');
        await searchInput.press('ArrowUp');
        await searchInput.press('Enter');

        // Should still be in search view with no results message
        await expect(page.locator('text="No apps found matching"')).toBeVisible();
    });
});
