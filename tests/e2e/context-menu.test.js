/**
 * Context Menu + Reorder Playground E2E Tests
 *
 * Covers the generic cl-context-menu (open/close/overflow-flip/select) and the
 * combined reorderable playground (windowed list + multiselect + checkboxes +
 * group reorder + context menu, with correct memoEach keying).
 */

const TestHelper = require('./test-helper');

async function runTests() {
    const test = new TestHelper();
    await test.setup();

    console.log('Testing Context Menu + Reorder Playground...\n');

    // Re-selecting the same component in the showcase does NOT reset its state
    // (same selectedComponent reference => no re-instantiation). To get a fresh
    // Reorder Playground (selection mode off, full 300-item list), switch to a
    // sibling first so the demo element is torn down and recreated.
    async function freshReorder() {
        await test.selectComponent('Context Menu');
        await test.selectComponent('Reorder Playground');
        await test.page.waitForSelector('example-reorder-list .rl-row', { timeout: 3000 });
    }

    // ===================== cl-context-menu =====================

    await test.test('ContextMenu example renders', async () => {
        await test.selectComponent('Context Menu');
        await test.assertExists('example-context-menu');
        await test.assertExists('cl-context-menu');
        await test.assertExists('.ctx-target');
    });

    await test.test('ContextMenu is hidden until opened', async () => {
        await test.selectComponent('Context Menu');
        const open = await test.page.evaluate(() =>
            !!document.querySelector('cl-context-menu .cl-context-menu'));
        await test.assert(!open, 'Menu should not be present before opening');
    });

    await test.test('ContextMenu opens on right-click at the pointer', async () => {
        await test.selectComponent('Context Menu');
        const pt = await test.page.evaluate(() => {
            const r = document.querySelector('.ctx-target').getBoundingClientRect();
            return { x: Math.round(r.left + 30), y: Math.round(r.top + 30) };
        });
        await test.page.mouse.click(pt.x, pt.y, { button: 'right' });
        await test.page.waitForTimeout(150);
        const info = await test.page.evaluate(() => {
            const m = document.querySelector('cl-context-menu .cl-context-menu');
            if (!m) return null;
            const r = m.getBoundingClientRect();
            return { vis: getComputedStyle(m).visibility, left: Math.round(r.left), top: Math.round(r.top) };
        });
        await test.assert(info && info.vis === 'visible', 'Menu should be visible after right-click');
        await test.assert(info.left >= 0 && info.top >= 0, 'Menu should be positioned in the viewport');
    });

    await test.test('ContextMenu closes on Escape', async () => {
        await test.selectComponent('Context Menu');
        await test.page.evaluate(() => document.querySelector('cl-context-menu').open(100, 100, {}));
        await test.page.waitForTimeout(120);
        await test.assert(await test.page.evaluate(() => !!document.querySelector('cl-context-menu .cl-context-menu')),
            'Menu should be open');
        await test.page.keyboard.press('Escape');
        await test.page.waitForTimeout(120);
        await test.assert(!(await test.page.evaluate(() => !!document.querySelector('cl-context-menu .cl-context-menu'))),
            'Menu should close on Escape');
    });

    await test.test('ContextMenu closes on outside click', async () => {
        await test.selectComponent('Context Menu');
        await test.page.evaluate(() => document.querySelector('cl-context-menu').open(120, 120, {}));
        await test.page.waitForTimeout(120);
        await test.page.mouse.click(400, 400);
        await test.page.waitForTimeout(120);
        await test.assert(!(await test.page.evaluate(() => !!document.querySelector('cl-context-menu .cl-context-menu'))),
            'Menu should close when clicking outside');
    });

    await test.test('ContextMenu emits select with item + context, then closes', async () => {
        await test.selectComponent('Context Menu');
        await test.page.evaluate(() => {
            window.__cmPick = null;
            const m = document.querySelector('cl-context-menu');
            m.addEventListener('select', (e) => { window.__cmPick = { label: e.detail.item.label, ctx: e.detail.context }; });
            m.open(150, 150, { source: 'unit-test' });
        });
        await test.page.waitForTimeout(150);
        // Click the first non-separator, non-disabled item
        await test.page.evaluate(() => {
            const items = document.querySelectorAll('cl-context-menu .cl-context-menu-item:not(:disabled)');
            items[0].click();
        });
        await test.page.waitForTimeout(120);
        const pick = await test.page.evaluate(() => window.__cmPick);
        await test.assert(pick && pick.label, 'select event should carry the chosen item');
        await test.assert(pick.ctx && pick.ctx.source === 'unit-test', 'select event should echo the open() context');
        await test.assert(!(await test.page.evaluate(() => !!document.querySelector('cl-context-menu .cl-context-menu'))),
            'Menu should close after selecting an item');
    });

    await test.test('ContextMenu flips/clamps to stay inside viewport (bottom-right corner)', async () => {
        await test.selectComponent('Context Menu');
        const res = await test.page.evaluate(() => {
            const pad = 8;
            const vw = window.innerWidth, vh = window.innerHeight;
            document.querySelector('cl-context-menu').open(vw - 3, vh - 3, {});
            return new Promise((resolve) => {
                requestAnimationFrame(() => requestAnimationFrame(() => {
                    const m = document.querySelector('cl-context-menu .cl-context-menu');
                    const r = m.getBoundingClientRect();
                    resolve({
                        inside: r.left >= pad && r.top >= pad && r.right <= vw - pad && r.bottom <= vh - pad,
                        rect: { l: Math.round(r.left), t: Math.round(r.top), r: Math.round(r.right), b: Math.round(r.bottom) }
                    });
                }));
            });
        });
        await test.assert(res.inside, `Menu should stay inside the viewport when opened at the corner, got ${JSON.stringify(res.rect)}`);
        await test.page.keyboard.press('Escape');
    });

    await test.test('ContextMenu becomes scrollable when taller than the viewport', async () => {
        await test.selectComponent('Context Menu');
        await test.page.setViewport({ width: 600, height: 220 });
        const res = await test.page.evaluate(() => {
            const m = document.querySelector('cl-context-menu');
            m.items = Array.from({ length: 40 }, (_, i) => ({ label: 'Row ' + i }));
            m.open(300, 200, {});
            return new Promise((resolve) => {
                requestAnimationFrame(() => requestAnimationFrame(() => {
                    const el = document.querySelector('cl-context-menu .cl-context-menu');
                    const r = el.getBoundingClientRect();
                    resolve({ inside: r.top >= 8 && r.bottom <= 220 - 8, hasMaxHeight: !!el.style.maxHeight });
                }));
            });
        });
        await test.assert(res.inside, 'Tall menu should stay within the viewport height');
        await test.assert(res.hasMaxHeight, 'Tall menu should get a max-height (internal scroll)');
        await test.page.keyboard.press('Escape');
        await test.page.setViewport({ width: 1400, height: 900 });
    });

    // ===================== Reorder Playground =====================

    await test.test('ReorderPlayground renders a windowed list', async () => {
        await freshReorder();
        const rows = await test.page.$$eval('example-reorder-list .rl-row', e => e.length);
        await test.assert(rows > 0 && rows < 100, `Windowed list should render a bounded row set, got ${rows}`);
    });

    await test.test('ReorderPlayground shows drag handles (touch reorder affordance)', async () => {
        await freshReorder();
        await test.assertExists('example-reorder-list .rl-handle');
    });

    await test.test('ReorderPlayground selection mode reveals checkboxes', async () => {
        await freshReorder();
        // no checkboxes before selection mode
        const before = await test.page.$$eval('example-reorder-list .rl-check', e => e.length);
        await test.assert(before === 0, 'Checkboxes should be hidden outside selection mode');
        await test.page.evaluate(() => {
            const btns = document.querySelectorAll('example-reorder-playground cl-button button');
            for (const b of btns) if (/selection mode/i.test(b.textContent)) { b.click(); return; }
        });
        await test.page.waitForTimeout(250);
        const after = await test.page.$$eval('example-reorder-list .rl-check', e => e.length);
        await test.assert(after > 0, 'Checkboxes should appear in selection mode');
    });

    await test.test('ReorderPlayground selection toggle preserves untouched row DOM nodes (memoEach)', async () => {
        await freshReorder();
        // enter selection mode
        await test.page.evaluate(() => {
            const btns = document.querySelectorAll('example-reorder-playground cl-button button');
            for (const b of btns) if (/selection mode/i.test(b.textContent)) { b.click(); return; }
        });
        await test.page.waitForTimeout(250);
        // tag an untouched row, then toggle a different row's checkbox
        await test.page.evaluate(() => {
            const rows = document.querySelectorAll('example-reorder-list .rl-row');
            rows[4].__memoTag = 'KEEP';
        });
        await test.page.evaluate(() => {
            document.querySelectorAll('example-reorder-list .rl-row')[1].querySelector('.rl-check').click();
        });
        await test.page.waitForTimeout(250);
        const res = await test.page.evaluate(() => {
            const rows = document.querySelectorAll('example-reorder-list .rl-row');
            return { untouchedPreserved: rows[4].__memoTag === 'KEEP', toggledSelected: rows[1].classList.contains('selected') };
        });
        await test.assert(res.toggledSelected, 'Toggled row should become selected');
        await test.assert(res.untouchedPreserved, 'Untouched row DOM node must be preserved (composite memoEach key)');
    });

    await test.test('ReorderPlayground applies a group reorder from the list event', async () => {
        await freshReorder();
        const before = await test.page.$$eval('example-reorder-list .rl-title', ts => ts.slice(0, 4).map(t => t.textContent));
        await test.page.evaluate(() => {
            const inner = document.querySelector('example-reorder-list');
            // move rows [0,1] into gap 5 (group move)
            inner.dispatchEvent(new CustomEvent('reorder', { bubbles: true, composed: true, detail: { fromIndices: [0, 1], gap: 5 } }));
        });
        await test.page.waitForTimeout(250);
        const after = await test.page.$$eval('example-reorder-list .rl-title', ts => ts.slice(0, 6).map(t => t.textContent));
        // The two originally-leading rows should have moved down out of the first two slots.
        await test.assert(after[0] !== before[0], 'First row should change after a group reorder');
        await test.assert(after.includes(before[0]) && after.includes(before[1]),
            'Moved rows should still be present, further down the list');
    });

    await test.test('ReorderPlayground checkbox TAP toggles exactly once (touch + synthesized click)', async () => {
        await freshReorder();
        const res = await test.page.evaluate(async () => {
            const pg = document.querySelector('example-reorder-playground');
            if (!pg.state.selectionMode) pg.toggleMode();
            await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
            const cb = document.querySelector('example-reorder-list .rl-check');
            const box = cb.getBoundingClientRect();
            const x = box.x + box.width / 2, y = box.y + box.height / 2;
            const fire = (type) => {
                const touch = new Touch({ identifier: 1, target: cb, clientX: x, clientY: y });
                return cb.dispatchEvent(new TouchEvent(type, {
                    touches: type === 'touchend' ? [] : [touch],
                    changedTouches: [touch],
                    bubbles: true, cancelable: true,
                }));
            };
            const before = pg.state.selectedIds.length;
            // A real tap = touch sequence THEN the browser-synthesized click.
            // The bug: the row's touchEnd fired onTap (toggle) AND the click
            // hit the checkbox handler (toggle again) - net zero, dead
            // checkbox on touch devices. Excluded controls must arm nothing.
            fire('touchstart');
            const endNotPrevented = fire('touchend');
            cb.click();
            await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
            const after = pg.state.selectedIds.length;
            pg.clearSelection();
            if (pg.state.selectionMode) pg.toggleMode();
            return { before, after, endNotPrevented };
        });
        await test.assert(res.endNotPrevented, 'checkbox touchend must not be default-prevented');
        await test.assert(res.after === res.before + 1,
            `a checkbox tap must toggle exactly once (before=${res.before}, after=${res.after})`);
    });

    await test.test('ReorderPlayground row context menu removes rows', async () => {
        await freshReorder();
        const beforeFirst = await test.page.$eval('example-reorder-list .rl-title', t => t.textContent);
        const pt = await test.page.evaluate(() => {
            const r = document.querySelectorAll('example-reorder-list .rl-row')[0].getBoundingClientRect();
            return { x: Math.round(r.left + 60), y: Math.round(r.top + 10) };
        });
        await test.page.mouse.click(pt.x, pt.y, { button: 'right' });
        await test.page.waitForTimeout(150);
        await test.assert(await test.page.evaluate(() => !!document.querySelector('cl-context-menu .cl-context-menu')),
            'Row right-click should open the context menu');
        await test.page.evaluate(() => {
            const items = document.querySelectorAll('cl-context-menu .cl-context-menu-item');
            for (const it of items) if (/remove/i.test(it.textContent)) { it.click(); return; }
        });
        await test.page.waitForTimeout(250);
        const afterFirst = await test.page.$eval('example-reorder-list .rl-title', t => t.textContent);
        await test.assert(afterFirst !== beforeFirst, `Removing the first row should change the leading title (was "${beforeFirst}")`);
    });

    await test.teardown();
}

runTests().catch(console.error);
