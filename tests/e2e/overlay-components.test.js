/**
 * Overlay Components E2E Tests
 */

const TestHelper = require('./test-helper');

async function runTests() {
    const test = new TestHelper();
    await test.setup();

    console.log('Testing Overlay Components...\n');

    // Dialog Tests
    await test.test('Dialog component renders', async () => {
        await test.selectComponent('Dialog');
        await test.assertExists('example-dialog');
        await test.assertExists('cl-dialog');
    });

    await test.test('Dialog has trigger button', async () => {
        await test.selectComponent('Dialog');
        await test.assertExists('cl-button');
    });

    await test.test('Dialog opens on button click', async () => {
        await test.selectComponent('Dialog');
        await test.assertNotExists('.cl-dialog-mask');

        await test.page.click('cl-button');
        await test.page.waitForTimeout(300);

        await test.assertExists('.cl-dialog-mask');
    });

    // Sidebar Tests
    await test.test('Sidebar component renders', async () => {
        await test.selectComponent('Sidebar');
        await test.assertExists('example-sidebar');
        await test.assertExists('cl-sidebar');
    });

    await test.test('Sidebar has position buttons', async () => {
        await test.selectComponent('Sidebar');
        const buttons = await test.page.$$('cl-button');
        await test.assertGreaterThan(buttons.length, 0, 'Should have trigger buttons');
    });

    await test.test('Sidebar opens on button click', async () => {
        await test.selectComponent('Sidebar');
        await test.assertNotExists('.cl-sidebar-mask');

        const button = await test.page.$('cl-button');
        await button.click();
        await test.page.waitForTimeout(300);

        await test.assertExists('.cl-sidebar-mask');
    });

    // Toast Tests
    await test.test('Toast component renders', async () => {
        await test.selectComponent('Toast');
        await test.assertExists('example-toast');
        await test.assertExists('cl-toast');
    });

    await test.test('Toast has trigger buttons', async () => {
        await test.selectComponent('Toast');
        const buttons = await test.page.$$('cl-button');
        await test.assertGreaterThan(buttons.length, 3, 'Should have multiple severity buttons');
    });

    await test.test('Toast shows notification on click', async () => {
        await test.selectComponent('Toast');

        const button = await test.page.$('cl-button');
        await button.click();
        await test.page.waitForTimeout(300);

        await test.assertExists('.toast-message');
    });

    await test.test('Toast has severity styling', async () => {
        await test.selectComponent('Toast');

        const button = await test.page.$('cl-button');
        await button.click();
        await test.page.waitForTimeout(300);

        const hasSeverity = await test.page.evaluate(() => {
            const toast = document.querySelector('.toast-message');
            return toast && (
                toast.classList.contains('success') ||
                toast.classList.contains('info') ||
                toast.classList.contains('warn') ||
                toast.classList.contains('error')
            );
        });

        await test.assert(hasSeverity, 'Toast should have severity class');
    });

    // Tooltip Tests
    await test.test('Tooltip component renders', async () => {
        await test.selectComponent('Tooltip');
        await test.assertExists('example-tooltip');
        await test.assertExists('cl-tooltip');
    });

    await test.test('Tooltip wraps content', async () => {
        await test.selectComponent('Tooltip');
        const tooltips = await test.page.$$('cl-tooltip');
        await test.assertGreaterThan(tooltips.length, 0, 'Should have tooltip wrappers');
    });

    await test.test('Tooltip shows on hover', async () => {
        await test.selectComponent('Tooltip');
        await test.page.waitForSelector('cl-tooltip', { timeout: 2000 });

        // Trigger hover using evaluate to be safe
        await test.page.evaluate(() => {
            const target = document.querySelector('.tooltip-target');
            if (target) {
                const event = new MouseEvent('mouseenter', { bubbles: true });
                target.dispatchEvent(event);
            }
        });
        await test.page.waitForTimeout(300);

        const content = await test.page.$('.tooltip-content');
        await test.assert(content !== null, 'Tooltip content should appear on hover');
    });

    await test.teardown();
}

runTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
