import { test, expect } from '@playwright/test';

test.describe('Window Dimension Persistence (F144)', () => {
    test('window dimensions persist after resize', async ({ page }) => {
        await page.goto('http://localhost:5000');
        await page.waitForLoadState('domcontentloaded', { timeout: 30000 });

        // Open Calculator app
        await page.waitForSelector('[data-testid="start-menu-button"]', {
            timeout: 30000,
            state: 'visible',
        });
        await page.click('[data-testid="start-menu-button"]');
        await page.waitForSelector('[data-start-menu]', { state: 'visible', timeout: 10000 });
        await page.click('[data-testid="app-calculator"]');

        // Wait for window to appear
        await page.waitForSelector('[data-app-id="calculator"]', { timeout: 10000 });

        // Get initial size
        const windowElement = page.locator('[data-app-id="calculator"]').first();
        const initialBox = await windowElement.boundingBox();
        expect(initialBox).toBeTruthy();

        // Resize window by dragging bottom-right corner
        const resizeHandle = windowElement.locator('.cursor-se-resize').first();
        await resizeHandle.hover();
        await page.mouse.down();
        await page.mouse.move(initialBox!.x + initialBox!.width + 150, initialBox!.y + initialBox!.height + 100, {
            steps: 10,
        });
        await page.mouse.up();
        await page.waitForTimeout(100); // Wait for persistence

        // Get resized dimensions
        const resizedBox = await windowElement.boundingBox();
        expect(resizedBox!.width).toBeGreaterThan(initialBox!.width);
        expect(resizedBox!.height).toBeGreaterThan(initialBox!.height);

        // Close the window
        await page.click('[data-app-id="calculator"] button[aria-label="Close window"]');
        await page.waitForTimeout(200); // Wait for close animation

        // Reopen the same app
        await page.waitForSelector('[data-testid="start-menu-button"]', {
            timeout: 30000,
            state: 'visible',
        });
        await page.click('[data-testid="start-menu-button"]');
        await page.waitForSelector('[data-start-menu]', { state: 'visible', timeout: 10000 });
        await page.click('[data-testid="app-calculator"]');
        await page.waitForSelector('[data-app-id="calculator"]', { timeout: 10000 });

        // Verify dimensions were restored
        const restoredBox = await windowElement.boundingBox();
        expect(restoredBox!.width).toBeCloseTo(resizedBox!.width, 5);
        expect(restoredBox!.height).toBeCloseTo(resizedBox!.height, 5);
    });

    test('different apps maintain separate dimensions', async ({ page }) => {
        await page.goto('http://localhost:5000');
        await page.waitForLoadState('domcontentloaded', { timeout: 30000 });

        // Open and resize Calculator
        await page.waitForSelector('[data-testid="start-menu-button"]', {
            timeout: 30000,
            state: 'visible',
        });
        await page.click('[data-testid="start-menu-button"]');
        await page.waitForSelector('[data-start-menu]', { state: 'visible', timeout: 10000 });
        await page.click('[data-testid="app-calculator"]');
        await page.waitForSelector('[data-app-id="calculator"]', { timeout: 10000 });

        const calcWindow = page.locator('[data-app-id="calculator"]').first();
        const calcInitialBox = await calcWindow.boundingBox();
        const calcHandle = calcWindow.locator('.cursor-se-resize').first();
        await calcHandle.hover();
        await page.mouse.down();
        await page.mouse.move(
            calcInitialBox!.x + calcInitialBox!.width + 100,
            calcInitialBox!.y + calcInitialBox!.height + 50,
            { steps: 5 }
        );
        await page.mouse.up();
        await page.waitForTimeout(100);

        const calcResizedBox = await calcWindow.boundingBox();
        await page.click('[data-app-id="calculator"] button[aria-label="Close window"]');
        await page.waitForTimeout(200);

        // Open and resize Notepad
        await page.waitForSelector('[data-testid="start-menu-button"]', {
            timeout: 30000,
            state: 'visible',
        });
        await page.click('[data-testid="start-menu-button"]');
        await page.waitForSelector('[data-start-menu]', { state: 'visible', timeout: 10000 });
        await page.click('[data-testid="app-notepad"]');
        await page.waitForSelector('[data-app-id="notepad"]', { timeout: 10000 });

        const notepadWindow = page.locator('[data-app-id="notepad"]').first();
        const notepadInitialBox = await notepadWindow.boundingBox();
        const notepadHandle = notepadWindow.locator('.cursor-se-resize').first();
        await notepadHandle.hover();
        await page.mouse.down();
        await page.mouse.move(
            notepadInitialBox!.x + notepadInitialBox!.width + 200,
            notepadInitialBox!.y + notepadInitialBox!.height + 150,
            { steps: 5 }
        );
        await page.mouse.up();
        await page.waitForTimeout(100);

        const notepadResizedBox = await notepadWindow.boundingBox();
        await page.click('[data-app-id="notepad"] button[aria-label="Close window"]');
        await page.waitForTimeout(200);

        // Verify both apps restored their own dimensions
        await page.waitForSelector('[data-testid="start-menu-button"]', {
            timeout: 30000,
            state: 'visible',
        });
        await page.click('[data-testid="start-menu-button"]');
        await page.waitForSelector('[data-start-menu]', { state: 'visible', timeout: 10000 });
        await page.click('[data-testid="app-calculator"]');
        await page.waitForSelector('[data-app-id="calculator"]', { timeout: 10000 });
        const calcRestored = await page.locator('[data-app-id="calculator"]').first().boundingBox();
        expect(calcRestored!.width).toBeCloseTo(calcResizedBox!.width, 5);

        await page.waitForSelector('[data-testid="start-menu-button"]', {
            timeout: 30000,
            state: 'visible',
        });
        await page.click('[data-testid="start-menu-button"]');
        await page.waitForSelector('[data-start-menu]', { state: 'visible', timeout: 10000 });
        await page.click('[data-testid="app-notepad"]');
        await page.waitForSelector('[data-app-id="notepad"]', { timeout: 10000 });
        const notepadRestored = await page.locator('[data-app-id="notepad"]').first().boundingBox();
        expect(notepadRestored!.width).toBeCloseTo(notepadResizedBox!.width, 5);
    });

    test('position also persists after drag', async ({ page }) => {
        await page.goto('http://localhost:5000');
        await page.waitForLoadState('domcontentloaded', { timeout: 30000 });

        // Open Calculator
        await page.waitForSelector('[data-testid="start-menu-button"]', {
            timeout: 30000,
            state: 'visible',
        });
        await page.click('[data-testid="start-menu-button"]');
        await page.waitForSelector('[data-start-menu]', { state: 'visible', timeout: 10000 });
        await page.click('[data-testid="app-calculator"]');
        await page.waitForSelector('[data-app-id="calculator"]', { timeout: 10000 });

        const windowElement = page.locator('[data-app-id="calculator"]').first();
        const initialBox = await windowElement.boundingBox();

        // Drag window to new position using Playwright's drag API
        const titleBar = windowElement.locator('.cursor-move').first();
        await titleBar.dragTo(page.locator('body'), {
            targetPosition: { x: initialBox!.x + 300, y: initialBox!.y + 200 },
        });
        await page.waitForTimeout(100);

        const movedBox = await windowElement.boundingBox();
        // Verify window moved
        expect(Math.abs(movedBox!.x - initialBox!.x)).toBeGreaterThan(50);
        expect(Math.abs(movedBox!.y - initialBox!.y)).toBeGreaterThan(50);

        // Close and reopen
        await page.click('[data-app-id="calculator"] button[aria-label="Close window"]');
        await page.waitForTimeout(200);

        await page.waitForSelector('[data-testid="start-menu-button"]', {
            timeout: 30000,
            state: 'visible',
        });
        await page.click('[data-testid="start-menu-button"]');
        await page.waitForSelector('[data-start-menu]', { state: 'visible', timeout: 10000 });
        await page.click('[data-testid="app-calculator"]');
        await page.waitForSelector('[data-app-id="calculator"]', { timeout: 10000 });

        const restoredBox = await windowElement.boundingBox();
        expect(restoredBox!.x).toBeCloseTo(movedBox!.x, 5);
        expect(restoredBox!.y).toBeCloseTo(movedBox!.y, 5);
    });
});
