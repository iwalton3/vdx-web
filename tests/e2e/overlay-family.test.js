/**
 * Overlay Family Anchoring E2E Tests
 *
 * Every popover-style cl-* component migrated to createAnchoredOverlay must
 * promote its panel to the browser top layer (position:fixed + :popover-open)
 * so it escapes an ancestor overflow:auto clip container.
 */

const TestHelper = require('./test-helper');

const FIXTURE = (process.env.E2E_ORIGIN || 'http://localhost:9000')
    + '/tests/e2e/fixtures/overlays-clip.html';

// Read the panel's promotion state and whether it escaped its clip container.
async function panelState(test, hostSel, panelSel) {
    return test.page.evaluate((hostSel, panelSel) => {
        const panel = document.querySelector(panelSel);
        if (!panel) return { present: false };
        const clip = document.querySelector(hostSel).closest('.clip');
        const p = panel.getBoundingClientRect();
        const c = clip.getBoundingClientRect();
        return {
            present: true,
            popoverOpen: panel.matches(':popover-open'),
            position: getComputedStyle(panel).position,
            // Not confined to the clip box - extends past its bottom (opened
            // down) or its top (flipped up near the viewport edge).
            escapesClip: p.bottom > c.bottom + 4 || p.top < c.top - 4
        };
    }, hostSel, panelSel);
}

async function runTests() {
    const test = new TestHelper();
    await test.setup();

    console.log('Testing Overlay Family Anchoring...\n');

    await test.page.goto(FIXTURE, { waitUntil: 'networkidle2' });
    await test.page.waitForSelector('.ms .multiselect-trigger', { timeout: 5000 });

    await test.test('cl-multiselect panel is top-layer promoted and escapes clip', async () => {
        await test.page.click('.ms .multiselect-trigger');
        await test.page.waitForSelector('.ms .multiselect-panel', { timeout: 2000 });
        const s = await panelState(test, '.ms', '.ms .multiselect-panel');
        await test.assert(s.popoverOpen, 'multiselect panel should be an open popover');
        await test.assertEqual(s.position, 'fixed', 'multiselect panel should be fixed');
        await test.assert(s.escapesClip, 'multiselect panel should extend past the clip container');
        await test.page.keyboard.press('Escape');
    });

    await test.test('cl-autocomplete panel is top-layer promoted and escapes clip', async () => {
        await test.page.focus('.ac input');
        await test.page.type('.ac input', 'a');
        await test.page.waitForSelector('.ac .suggestions-panel', { timeout: 2000 });
        const s = await panelState(test, '.ac', '.ac .suggestions-panel');
        await test.assert(s.popoverOpen, 'autocomplete panel should be an open popover');
        await test.assertEqual(s.position, 'fixed', 'autocomplete panel should be fixed');
        await test.assert(s.escapesClip, 'autocomplete panel should extend past the clip container');
        await test.page.keyboard.press('Escape');
    });

    await test.test('cl-calendar picker is top-layer promoted and escapes clip', async () => {
        await test.page.click('.cal .calendar-toggle');
        await test.page.waitForSelector('.cal .calendar-picker', { timeout: 2000 });
        const s = await panelState(test, '.cal', '.cal .calendar-picker');
        await test.assert(s.popoverOpen, 'calendar picker should be an open popover');
        await test.assertEqual(s.position, 'fixed', 'calendar picker should be fixed');
        await test.assert(s.escapesClip, 'calendar picker should extend past the clip container');
        await test.page.keyboard.press('Escape');
    });

    await test.test('cl-popover panel is top-layer promoted and escapes clip', async () => {
        await test.page.click('.pop .popover-trigger');
        await test.page.waitForSelector('.pop .popover-panel', { timeout: 2000 });
        const s = await panelState(test, '.pop', '.pop .popover-panel');
        await test.assert(s.popoverOpen, 'popover panel should be an open popover');
        await test.assertEqual(s.position, 'fixed', 'popover panel should be fixed');
        await test.assert(s.escapesClip, 'popover panel should extend past the clip container');
        await test.page.keyboard.press('Escape');
    });

    await test.test('cl-action-menu dropdown is top-layer promoted and escapes clip', async () => {
        await test.page.click('.am .trigger-btn');
        await test.page.waitForSelector('.am .menu-dropdown', { timeout: 2000 });
        const s = await panelState(test, '.am', '.am .menu-dropdown');
        await test.assert(s.popoverOpen, 'action-menu dropdown should be an open popover');
        await test.assertEqual(s.position, 'fixed', 'action-menu dropdown should be fixed');
        await test.assert(s.escapesClip, 'action-menu dropdown should extend past the clip container');
        await test.page.keyboard.press('Escape');
    });

    await test.test('cl-tooltip is top-layer promoted (opens above, escapes clip context)', async () => {
        await test.page.hover('.tip .tooltip-target');
        await test.page.waitForSelector('.tip .tooltip-content', { timeout: 2000 });
        const s = await test.page.evaluate(() => {
            const panel = document.querySelector('.tip .tooltip-content');
            return {
                popoverOpen: panel.matches(':popover-open'),
                position: getComputedStyle(panel).position
            };
        });
        await test.assert(s.popoverOpen, 'tooltip should be an open popover');
        await test.assertEqual(s.position, 'fixed', 'tooltip should be fixed');
    });

    await test.teardown();
}

runTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
