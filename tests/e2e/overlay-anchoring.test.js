/**
 * Overlay Anchoring E2E Tests
 *
 * Regression coverage for createAnchoredOverlay (lib/overlay.js): a cl-dropdown
 * opened inside an overflow:auto container must NOT be clipped by that container
 * (it is promoted to the browser top layer), and must flip upward when there is
 * no room below.
 */

const TestHelper = require('./test-helper');

const ORIGIN = process.env.E2E_ORIGIN || 'http://localhost:9000';
const FIXTURE = ORIGIN + '/tests/e2e/fixtures/dropdown-overflow.html';
const DIALOG_FIXTURE = ORIGIN + '/tests/e2e/fixtures/dropdown-in-dialog.html';

// Mirrors cl-dialog's FOCUSABLE_SELECTOR (ui/overlay/dialog.js).
const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

async function runTests() {
    const test = new TestHelper();
    await test.setup();

    console.log('Testing Overlay Anchoring...\n');

    // Load the dedicated fixture (setup() lands on the showcase page).
    await test.page.goto(FIXTURE, { waitUntil: 'networkidle2' });
    await test.page.waitForSelector('.clipped-dd .dropdown-trigger', { timeout: 5000 });

    await test.test('Panel escapes an overflow:auto container (not clipped)', async () => {
        // Open the dropdown whose trigger sits near the clip container's bottom.
        await test.page.click('.clipped-dd .dropdown-trigger');
        await test.page.waitForSelector('.clipped-dd .dropdown-panel', { timeout: 2000 });

        const geo = await test.page.evaluate(() => {
            const panel = document.querySelector('.clipped-dd .dropdown-panel');
            const clip = document.getElementById('clip');
            const p = panel.getBoundingClientRect();
            const c = clip.getBoundingClientRect();
            return {
                panelBottom: p.bottom,
                panelHeight: p.height,
                clipBottom: c.bottom,
                popoverOpen: panel.matches(':popover-open'),
                position: getComputedStyle(panel).position
            };
        });

        // The panel extends past the container's bottom edge - proof it is not
        // clipped by the container's overflow.
        await test.assertGreaterThan(geo.panelBottom, geo.clipBottom + 20,
            `Panel bottom (${geo.panelBottom}) should extend past clip bottom (${geo.clipBottom})`);
        await test.assertGreaterThan(geo.panelHeight, 60,
            `Panel should render at full height, got ${geo.panelHeight}px`);
        await test.assertEqual(geo.position, 'fixed',
            `Panel should be positioned fixed, got ${geo.position}`);
        // Top-layer promotion (Popover API) - Chromium in the harness supports it.
        await test.assert(geo.popoverOpen, 'Panel should be an open popover (top layer)');
    });

    await test.test('Bottom options are hit-testable (rendered, not clipped away)', async () => {
        // The last option row must be the top-most element at its own center -
        // i.e. actually painted and interactive below the container edge.
        const hit = await test.page.evaluate(() => {
            const options = document.querySelectorAll('.clipped-dd .option');
            const last = options[options.length - 1];
            const r = last.getBoundingClientRect();
            const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
            return {
                count: options.length,
                lastBelowClip: r.top > document.getElementById('clip').getBoundingClientRect().bottom,
                hitInsidePanel: !!(el && el.closest('.clipped-dd .dropdown-panel'))
            };
        });

        await test.assertGreaterThan(hit.count, 0, 'Should render options');
        await test.assert(hit.lastBelowClip, 'Last option should sit below the clip container edge');
        await test.assert(hit.hitInsidePanel, 'Last option should be hit-testable (top of stack)');
    });

    await test.test('Escape closes the panel and removes it from the top layer', async () => {
        await test.page.keyboard.press('Escape');
        await test.page.waitForTimeout(150);
        const stillOpen = await test.page.$('.clipped-dd .dropdown-panel');
        await test.assert(!stillOpen, 'Panel should be gone after Escape');
    });

    await test.test('Flips upward when there is no room below the anchor', async () => {
        await test.page.click('.flip-dd .dropdown-trigger');
        await test.page.waitForSelector('.flip-dd .dropdown-panel', { timeout: 2000 });

        const geo = await test.page.evaluate(() => {
            const panel = document.querySelector('.flip-dd .dropdown-panel');
            const trigger = document.querySelector('.flip-dd .dropdown-trigger');
            const p = panel.getBoundingClientRect();
            const t = trigger.getBoundingClientRect();
            return {
                panelTop: p.top,
                panelBottom: p.bottom,
                triggerTop: t.top,
                triggerBottom: t.bottom,
                viewportH: window.innerHeight
            };
        });

        // Opened above: the panel's bottom is at/above the trigger's top, and it
        // stays within the viewport (was not pushed off the bottom edge).
        await test.assert(geo.panelBottom <= geo.triggerTop + 1,
            `Panel bottom (${geo.panelBottom}) should be above trigger top (${geo.triggerTop})`);
        await test.assert(geo.panelTop >= 0,
            `Flipped panel top (${geo.panelTop}) should be on-screen`);
    });

    // --- Inside a cl-dialog: focus trap must still reach the panel --------
    await test.page.goto(DIALOG_FIXTURE, { waitUntil: 'networkidle2' });
    await test.page.waitForSelector('.dialog-dd .dropdown-trigger', { timeout: 5000 });

    await test.test('Dropdown panel is top-layer promoted inside a dialog', async () => {
        await test.page.click('.dialog-dd .dropdown-trigger');
        await test.page.waitForSelector('.dialog-dd .dropdown-panel', { timeout: 2000 });
        const info = await test.page.evaluate(() => {
            const panel = document.querySelector('.dialog-dd .dropdown-panel');
            return {
                popoverOpen: panel.matches(':popover-open'),
                position: getComputedStyle(panel).position
            };
        });
        await test.assert(info.popoverOpen, 'Panel should be an open popover in the dialog');
        await test.assertEqual(info.position, 'fixed', 'Panel should be fixed-positioned');
    });

    await test.test('Focus trap still enumerates the panel filter input (node stays a dialog descendant)', async () => {
        const reachable = await test.page.evaluate((FOCUSABLE) => {
            const dialog = document.querySelector('.cl-dialog');
            const filter = document.querySelector('.dialog-dd .filter-input');
            const focusables = Array.from(dialog.querySelectorAll(FOCUSABLE));
            return {
                filterExists: !!filter,
                dialogContainsFilter: !!(filter && dialog.contains(filter)),
                filterInFocusSet: focusables.includes(filter)
            };
        }, FOCUSABLE);
        await test.assert(reachable.filterExists, 'Filter input should render');
        await test.assert(reachable.dialogContainsFilter,
            'Top-layer panel must remain a DOM descendant of the dialog');
        await test.assert(reachable.filterInFocusSet,
            "Dialog's focus trap must include the panel filter input");
    });

    await test.test('Panel filter input is focusable inside the dialog', async () => {
        await test.page.focus('.dialog-dd .filter-input');
        const focused = await test.page.evaluate(() =>
            !!document.activeElement && document.activeElement.classList.contains('filter-input'));
        await test.assert(focused, 'Filter input should receive focus');
    });

    await test.test('Escape closes the dropdown but leaves the dialog open', async () => {
        await test.page.keyboard.press('Escape');
        await test.page.waitForTimeout(150);
        const state = await test.page.evaluate(() => ({
            panel: !!document.querySelector('.dialog-dd .dropdown-panel'),
            dialog: !!document.querySelector('.cl-dialog')
        }));
        await test.assert(!state.panel, 'Dropdown panel should close on Escape');
        await test.assert(state.dialog, 'Dialog should stay open (Escape did not propagate)');
    });

    await test.teardown();
}

runTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
