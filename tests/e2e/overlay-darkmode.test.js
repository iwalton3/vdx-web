/**
 * Overlay Dark-Mode E2E Tests
 *
 * Regression: promoting a panel to the top layer via the Popover API makes the
 * UA stylesheet apply `[popover] { color: CanvasText }`, which overrides the
 * inherited theme color and renders black text in dark mode. Each panel sets
 * `color: inherit` to restore the theme; assert the resolved text color is
 * light (not CanvasText black) under `body.dark`.
 */

const TestHelper = require('./test-helper');

const FIXTURE = (process.env.E2E_ORIGIN || 'http://localhost:9000')
    + '/tests/e2e/fixtures/overlays-clip.html';

// Parse "rgb(r, g, b)" and return the red channel (theme dark text #ccc = 204,
// CanvasText black = 0), a reliable light/dark discriminator here.
function redOf(color) {
    const m = String(color).match(/\d+/g);
    return m ? Number(m[0]) : null;
}

async function assertLightText(test, name, panelSel) {
    const color = await test.page.evaluate((panelSel) => {
        const panel = document.querySelector(panelSel);
        return panel ? getComputedStyle(panel).color : null;
    }, panelSel);
    const r = redOf(color);
    await test.assert(r !== null && r > 150,
        `${name} panel text should be light in dark mode, got ${color}`);
}

async function runTests() {
    const test = new TestHelper();
    await test.setup();

    console.log('Testing Overlay Dark-Mode Text...\n');

    await test.page.goto(FIXTURE, { waitUntil: 'networkidle2' });
    // Load the theme variables and turn on dark mode (body.dark, per startThemeSync).
    await test.page.evaluate(() => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = '/styles/theme.css';
        document.head.appendChild(link);
        document.body.classList.add('dark');
    });
    await test.page.waitForTimeout(300);

    await test.test('cl-multiselect panel text is light in dark mode', async () => {
        await test.page.click('.ms .multiselect-trigger');
        await test.page.waitForSelector('.ms .multiselect-panel', { timeout: 2000 });
        await assertLightText(test, 'multiselect', '.ms .multiselect-panel');
        await test.page.keyboard.press('Escape');
    });

    await test.test('cl-autocomplete panel text is light in dark mode', async () => {
        await test.page.focus('.ac input');
        await test.page.type('.ac input', 'a');
        await test.page.waitForSelector('.ac .suggestions-panel', { timeout: 2000 });
        await assertLightText(test, 'autocomplete', '.ac .suggestions-panel');
        await test.page.keyboard.press('Escape');
    });

    await test.test('cl-calendar picker text is light in dark mode', async () => {
        await test.page.click('.cal .calendar-toggle');
        await test.page.waitForSelector('.cal .calendar-picker', { timeout: 2000 });
        await assertLightText(test, 'calendar', '.cal .calendar-picker');
        await test.page.keyboard.press('Escape');
    });

    await test.test('cl-popover panel text is light in dark mode', async () => {
        await test.page.click('.pop .popover-trigger');
        await test.page.waitForSelector('.pop .popover-panel', { timeout: 2000 });
        await assertLightText(test, 'popover', '.pop .popover-panel');
        await test.page.keyboard.press('Escape');
    });

    await test.test('cl-action-menu dropdown text is light in dark mode', async () => {
        await test.page.click('.am .trigger-btn');
        await test.page.waitForSelector('.am .menu-dropdown', { timeout: 2000 });
        await assertLightText(test, 'action-menu', '.am .menu-dropdown');
        await test.page.keyboard.press('Escape');
    });

    await test.teardown();
}

runTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
