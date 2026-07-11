/**
 * Button Components E2E Tests
 */

const TestHelper = require('./test-helper');

async function runTests() {
    const test = new TestHelper();
    await test.setup();

    console.log('Testing Button Components...\n');

    // Button Tests
    await test.test('Button component renders', async () => {
        await test.selectComponent('Button');
        await test.assertExists('example-button');
        await test.assertExists('cl-button');
    });

    await test.test('Button has multiple severity variants', async () => {
        await test.selectComponent('Button');
        const buttons = await test.page.$$('cl-button');
        await test.assertGreaterThan(buttons.length, 5, 'Should have multiple button variants');
    });

    await test.test('Button severity classes are applied', async () => {
        await test.selectComponent('Button');

        const hasSeverity = await test.page.evaluate(() => {
            const buttons = document.querySelectorAll('cl-button button');
            return Array.from(buttons).some(btn =>
                btn.classList.contains('primary') ||
                btn.classList.contains('secondary') ||
                btn.classList.contains('success') ||
                btn.classList.contains('danger')
            );
        });

        await test.assert(hasSeverity, 'Buttons should have severity classes');
    });

    await test.test('Button can be disabled', async () => {
        await test.selectComponent('Button');

        const disabledExists = await test.page.evaluate(() => {
            const buttons = document.querySelectorAll('cl-button button');
            return Array.from(buttons).some(btn => btn.disabled);
        });

        await test.assert(disabledExists, 'Should have disabled button example');
    });

    await test.test('Button can show loading state', async () => {
        await test.selectComponent('Button');

        // Find and click the loading button
        const loadingButton = await test.page.evaluateHandle(() => {
            const buttons = Array.from(document.querySelectorAll('cl-button'));
            return buttons.find(b => {
                const text = b.querySelector('button')?.textContent || '';
                return text.includes('Loading');
            });
        });

        if (loadingButton) {
            const button = await loadingButton.asElement();
            if (button) {
                await button.click();
                await test.page.waitForTimeout(200);

                // Should show spinner
                const hasSpinner = await test.page.$('.spinner');
                await test.assert(hasSpinner !== null, 'Should show spinner when loading');
            }
        }
    });

    // SplitButton Tests
    await test.test('SplitButton component renders', async () => {
        await test.selectComponent('SplitButton');
        await test.assertExists('example-split-button');
        await test.assertExists('cl-split-button');
    });

    await test.test('SplitButton has main and dropdown buttons', async () => {
        await test.selectComponent('SplitButton');
        await test.assertExists('.main-button');
        await test.assertExists('.dropdown-button');
    });

    await test.test('SplitButton dropdown opens on click', async () => {
        await test.selectComponent('SplitButton');
        await test.assertNotExists('.dropdown-menu');

        await test.page.click('.dropdown-button');
        await test.page.waitForTimeout(200);

        await test.assertExists('.dropdown-menu');
    });

    await test.test('SplitButton menu has items', async () => {
        await test.selectComponent('SplitButton');
        await test.page.waitForTimeout(1000);

        // Ensure menu is closed first
        const menuOpen = await test.page.$('.dropdown-menu');
        const button = await test.page.$('.dropdown-button');

        if (menuOpen && button) {
            // Close it first
            await button.click();
            await test.page.waitForTimeout(300);
        }

        // Now open it
        if (button) {
            await button.click();
            await test.page.waitForTimeout(1000);

            const items = await test.page.$$('.menu-item');
            await test.assertGreaterThan(items.length, 0, 'Should have menu items');
        } else {
            throw new Error('Dropdown button not found');
        }
    });

    // Menu Tests
    await test.test('Menu component renders', async () => {
        await test.selectComponent('Menu');
        await test.assertExists('example-menu');
        await test.assertExists('cl-menu');
    });

    await test.test('Menu has items', async () => {
        await test.selectComponent('Menu');
        const items = await test.page.$$('.menu-item');
        await test.assertGreaterThan(items.length, 0, 'Should have menu items');
    });

    await test.test('Menu items can have submenus', async () => {
        await test.selectComponent('Menu');
        await test.assertExists('.submenu-icon');
    });

    await test.test('Menu submenu expands on click', async () => {
        await test.selectComponent('Menu');

        const itemWithSubmenu = await test.page.$('.menu-item.has-submenu');
        if (itemWithSubmenu) {
            await itemWithSubmenu.click();
            await test.page.waitForTimeout(200);

            const submenu = await test.page.$('.submenu');
            await test.assert(submenu !== null, 'Submenu should expand');
        }
    });

    // Breadcrumb Tests
    await test.test('Breadcrumb component renders', async () => {
        await test.selectComponent('Breadcrumb');
        await test.assertExists('example-breadcrumb');
        await test.assertExists('cl-breadcrumb');
    });

    await test.test('Breadcrumb has items', async () => {
        await test.selectComponent('Breadcrumb');
        const items = await test.page.$$('.breadcrumb-item');
        await test.assertGreaterThan(items.length, 0, 'Should have breadcrumb items');
    });

    await test.test('Breadcrumb has separators', async () => {
        await test.selectComponent('Breadcrumb');
        await test.assertExists('.separator');
    });

    await test.test('Breadcrumb can have home icon', async () => {
        await test.selectComponent('Breadcrumb');
        const homeIcon = await test.page.$('.item-icon');
        await test.assert(homeIcon !== null, 'Should have home icon');
    });

    await test.test('Breadcrumb last item is active', async () => {
        await test.selectComponent('Breadcrumb');
        await test.assertExists('.breadcrumb-item.active');
    });

    await test.teardown();
}

runTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
